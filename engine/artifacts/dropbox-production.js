(() => {
  "use strict";
  const DB_NAME = "geehub-dropbox-production";
  const DB_VERSION = 1;
  const STATUS = document.getElementById("dropboxProductionStatus");
  const COUNT = document.getElementById("dropboxProductionCount");
  const CONNECT = document.getElementById("dropboxProductionConnect");
  const SYNC = document.getElementById("dropboxProductionSync");
  const EXPORT = document.getElementById("dropboxProductionExport");
  let rootHandle = null;
  let busy = false;

  const say = (message) => { if (STATUS) STATUS.textContent = message; };
  const setCount = async () => {
    const pending = await all("pending");
    if (COUNT) COUNT.textContent = pending.length + " WAITING";
  };
  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles");
      if (!db.objectStoreNames.contains("pending")) db.createObjectStore("pending", {keyPath:"id"});
      if (!db.objectStoreNames.contains("done")) db.createObjectStore("done", {keyPath:"id"});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function store(name, mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const request = action(tx.objectStore(name));
      tx.oncomplete = () => { db.close(); resolve(request?.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    });
  }
  const put = (name, value, key) => store(name, "readwrite", s => s.put(value, key));
  const get = (name, key) => store(name, "readonly", s => s.get(key));
  const all = (name) => store(name, "readonly", s => s.getAll());
  const remove = (name, key) => store(name, "readwrite", s => s.delete(key));

  function safe(value) {
    return String(value || "untitled").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "untitled";
  }
  function category(kind) {
    const k = String(kind || "").toLowerCase();
    if (/video|movie|mp4|webm|mov/.test(k)) return "Video";
    if (/audio|sound|music|wav|mp3/.test(k)) return "Audio";
    if (/image|photo|render|frame|texture/.test(k)) return "Images";
    if (/scene|model|mesh|3d|asset/.test(k)) return "3D";
    if (/book|chapter|novel|passage|writing|text/.test(k)) return "Writing";
    return "Other";
  }
  function extension(mime, name) {
    if (name && /\.[a-z0-9]{2,6}$/i.test(name)) return name.split(".").pop().toLowerCase();
    const map = {"video/mp4":"mp4","video/webm":"webm","video/quicktime":"mov","audio/wav":"wav","audio/mpeg":"mp3","image/png":"png","image/jpeg":"jpg","image/webp":"webp","model/gltf-binary":"glb","model/gltf+json":"gltf","application/pdf":"pdf"};
    return map[mime] || "bin";
  }
  async function directory(parent, path) {
    let current = parent;
    for (const part of path.split("/").filter(Boolean)) current = await current.getDirectoryHandle(part, {create:true});
    return current;
  }
  async function writeFile(dir, name, data, mime) {
    const handle = await dir.getFileHandle(name, {create:true});
    const writable = await handle.createWritable();
    await writable.write(data instanceof Blob ? data : new Blob([data], {type:mime || "text/plain;charset=utf-8"}));
    await writable.close();
  }
  async function permission(handle, request) {
    const opts = {mode:"readwrite"};
    let state = await handle.queryPermission(opts);
    if (state !== "granted" && request) state = await handle.requestPermission(opts);
    return state === "granted";
  }
  async function recoverHandle() {
    if (rootHandle) return rootHandle;
    rootHandle = await get("handles", "root");
    return rootHandle || null;
  }

  async function writeRecord(record) {
    if (!rootHandle || !(await permission(rootHandle, false))) throw new Error("Dropbox folder permission is not available.");
    const now = new Date(record.created_at || Date.now());
    const year = String(now.getUTCFullYear());
    const id = safe(record.id);
    const title = safe(record.title);
    const kind = safe(record.kind || record.type || "artifact");
    const folder = await directory(rootHandle, "Creations/" + category(kind) + "/" + year + "/" + title + "__" + id);
    let payloadPath = null;
    let payloadName = record.filename || "";
    let payload = record.blob || null;
    if (!payload && record.content != null) {
      payloadName = payloadName || (title + ".md");
      payload = new Blob([String(record.content)], {type:"text/markdown;charset=utf-8"});
    }
    if (payload) {
      const ext = extension(payload.type || record.mime_type || "", payloadName);
      if (!/\.[a-z0-9]{2,6}$/i.test(payloadName)) payloadName = title + "." + ext;
      await writeFile(folder, payloadName, payload, payload.type);
      payloadPath = "Creations/" + category(kind) + "/" + year + "/" + title + "__" + id + "/" + payloadName;
    }
    const manifest = {
      schema:"geehub.artifact/1",
      id:record.id, created_at:record.created_at || new Date().toISOString(),
      title:record.title || title, kind:record.kind || kind,
      source:record.source || "GEEHUB", canon:record.canon || "unclassified",
      lineage:record.lineage || null, simulation_state:record.simulation_state || null,
      history_refs:record.history_refs || [], dreamable:record.dreamable !== false,
      quietness:record.quietness || "high", mime_type:record.mime_type || payload?.type || null,
      payload_path:payloadPath, stored_at:new Date().toISOString(),
      storage:"Dropbox desktop-synced GEEHUB folder"
    };
    const manifests = await directory(rootHandle, "artifacts/manifests");
    await writeFile(manifests, id + ".json", JSON.stringify(manifest, null, 2), "application/json");
    if (record.simulation_state) {
      const states = await directory(rootHandle, "state/simulations");
      await writeFile(states, id + ".json", JSON.stringify(record.simulation_state, null, 2), "application/json");
    }
    return manifest;
  }

  async function enqueue(record) {
    const existing = await get("done", record.id);
    if (existing) return existing;
    await put("pending", record);
    await setCount();
    if (rootHandle) flush();
    return record;
  }

  async function flush() {
    if (busy) return;
    busy = true;
    try {
      await recoverHandle();
      if (!rootHandle || !(await permission(rootHandle, false))) {
        say("CONNECT THE DROPBOX FOLDER TO RESUME");
        return;
      }
      const queue = await all("pending");
      let completed = 0;
      for (const record of queue) {
        const manifest = await writeRecord(record);
        await put("done", {id:record.id, stored_at:manifest.stored_at, payload_path:manifest.payload_path});
        await remove("pending", record.id);
        completed++;
      }
      await setCount();
      say(completed ? "STORED " + completed + " PRODUCT(S) IN DROPBOX" : "DROPBOX / UP TO DATE");
      window.dispatchEvent(new CustomEvent("geehub:dropbox-synced", {detail:{count:completed}}));
    } catch (error) {
      say("OUTBOX RETAINED / " + (error?.message || "SYNC FAILED"));
    } finally {
      busy = false;
    }
  }

  async function connect() {
    if (!("showDirectoryPicker" in window)) {
      say("FOLDER SYNC NEEDS DESKTOP CHROME OR EDGE. USE EXPORT AS FALLBACK.");
      return;
    }
    try {
      const selected = await window.showDirectoryPicker({mode:"readwrite"});
      rootHandle = selected.name.toLowerCase() === "geehub"
        ? selected
        : await selected.getDirectoryHandle("GEEHUB", {create:true});
      if (!(await permission(rootHandle, true))) throw new Error("Write permission was not granted.");
      await put("handles", rootHandle, "root");
      say("CONNECTED / " + rootHandle.name);
      await syncLocalArchive();
      await flush();
    } catch (error) {
      if (error?.name !== "AbortError") say(error?.message || "CONNECTION FAILED");
    }
  }

  async function syncLocalArchive() {
    const archive = window.GEEHUB_ARTIFACTS?.read?.() || [];
    let added = 0;
    for (const item of archive) {
      const id = item.id || ("archive-" + safe(item.title) + "-" + safe(item.created_at));
      if (await get("done", id)) continue;
      await put("pending", {
        id, created_at:item.created_at || new Date().toISOString(),
        title:item.title || "Recovered artifact", kind:item.kind || item.type || "memory",
        source:item.source || "GEEHUB local artifact archive",
        content:item.content ?? item.body ?? "", lineage:item.lineage || null,
        canon:item.canon || "unclassified", dreamable:item.dreamable !== false,
        quietness:item.quietness || "high"
      });
      added++;
    }
    await setCount();
    if (added) say("RECOVERED " + added + " LOCAL ARTIFACT(S) / SYNCING");
  }

  function publish(input) {
    const record = {
      id:input.id || ("product-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)),
      created_at:input.created_at || new Date().toISOString(),
      title:input.title || "Untitled product", kind:input.kind || "artifact",
      source:input.source || "GEEHUB production engine",
      content:input.content ?? null, blob:input.blob || input.file || null,
      filename:input.filename || input.blob?.name || input.file?.name || "",
      mime_type:input.mime_type || input.blob?.type || input.file?.type || null,
      lineage:input.lineage || null, simulation_state:input.simulation_state || null,
      history_refs:input.history_refs || [], canon:input.canon || "unclassified",
      dreamable:input.dreamable !== false, quietness:input.quietness || "high"
    };
    return enqueue(record);
  }

  window.GEEHUB_PRODUCTION = {
    publish,
    connect,
    sync:flush,
    get status(){return {connected:!!rootHandle, pending:0};}
  };

  if (window.GEEHUB_ARTIFACTS?.emit && !window.GEEHUB_ARTIFACTS.__dropboxWrapped) {
    const original = window.GEEHUB_ARTIFACTS.emit.bind(window.GEEHUB_ARTIFACTS);
    window.GEEHUB_ARTIFACTS.emit = (data) => {
      const artifact = original(data);
      publish(artifact).catch(error => say(error?.message || "OUTBOX ERROR"));
      return artifact;
    };
    window.GEEHUB_ARTIFACTS.__dropboxWrapped = true;
  }
  window.addEventListener("geehub:artifact", event => {
    if (event.detail) publish(event.detail).catch(error => say(error?.message || "OUTBOX ERROR"));
  });
  CONNECT?.addEventListener("click", connect);
  SYNC?.addEventListener("click", flush);
  EXPORT?.addEventListener("click", async () => {
    const queue = await all("pending");
    const exportable = queue.map(({blob, ...meta}) => ({...meta, payload_omitted:!!blob}));
    const blob = new Blob([JSON.stringify({schema:"geehub.outbox/1", exported_at:new Date().toISOString(), products:exportable}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="geehub-production-outbox.json"; a.click();
    URL.revokeObjectURL(url);
    say("OUTBOX MANIFEST EXPORTED");
  });
  recoverHandle().then(async handle => {
    if (handle && await permission(handle, false)) {
      say("DROPBOX FOLDER / READY");
      await setCount();
      flush();
    } else {
      say("PRODUCTS WAIT FOR THE DROPBOX FOLDER");
      await setCount();
    }
  }).catch(() => say("PRODUCTS WAIT FOR THE DROPBOX FOLDER"));
})();