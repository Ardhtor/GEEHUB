(() => {
  const root = document.querySelector('#fusionSpace');
  if (!root) return;

  const GEEHUB = {
    owner: 'Ardhtor',
    repo: 'GEEHUB',
    branch: 'main',
    cacheKey: 'geehub-corpus-scry-v1',
    maxFiles: 5000,
    maxBytes: 25000000
  };

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fileKind = path => {
    const p = path.toLowerCase();
    if (/\\.(png|jpg|jpeg|webp|gif|svg)$/.test(p)) return 'IMAGE';
    if (/\\.(mp4|mov|webm|avi)$/.test(p)) return 'VIDEO';
    if (/\\.(mp3|wav|ogg|m4a)$/.test(p)) return 'SOUND';
    if (/\\.(json|yaml|yml|toml)$/.test(p)) return 'DATA';
    if (/\\.(js|ts|py|html|css|sh)$/.test(p)) return 'CODE';
    if (/\\.(md|txt)$/.test(p)) return 'TEXT';
    return 'THING';
  };
  const words = text => (String(text).match(/[A-Za-z][A-Za-z0-9_'’-]{2,}/g) || []).map(x => x.toLowerCase());
  const title = path => path.split('/').pop().replace(/\\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\\b\\w/g,c=>c.toUpperCase());

  async function tree() {
    const u = `https://api.github.com/repos/${GEEHUB.owner}/${GEEHUB.repo}/git/trees/${GEEHUB.branch}?recursive=1`;
    const r = await fetch(u); if (!r.ok) throw new Error('tree '+r.status);
    const j = await r.json();
    return (j.tree || []).filter(x => x.type === 'blob').slice(0,GEEHUB.maxFiles);
  }

  async function readFile(path) {
    const u = `https://raw.githubusercontent.com/${GEEHUB.owner}/${GEEHUB.repo}/${GEEHUB.branch}/${path}`;
    const r = await fetch(u); if (!r.ok) return '';
    const t = await r.text();
    return t.length > 120000 ? t.slice(0,120000) : t;
  }

  function summarize(path, text) {
    const ws = words(text);
    const counts = {};
    ws.forEach(w => counts[w]=(counts[w]||0)+1);
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,14).map(x=>x[0]);
    const named = [...new Set((text.match(/\\b[A-Z][A-Za-z0-9_'-]{2,}\\b/g)||[]))].slice(0,30);
    const headings = (text.match(/^#{1,4}\\s+.+$/gm)||[]).slice(0,12).map(x=>x.replace(/^#+\\s+/,''));
    return {kind:fileKind(path),title:title(path),words:ws.length,top,named,headings};
  }

  async function processCorpus() {
    root.innerHTML = `<div class="corpus-scry"><div class="eyebrow">CORPUS / SCRY</div><h2>READING THE WORLD</h2><p id="corpusStatus">Opening the repository...</p><div class="corpus-meter"><i id="corpusMeter"></i></div><div id="corpusStats"></div></div>`;
    const status=root.querySelector('#corpusStatus'), meter=root.querySelector('#corpusMeter'), stats=root.querySelector('#corpusStats');
    const files=await tree();
    let done=0,totalWords=0;
    const records=[], vocabulary={}, names={}, byKind={};
    for (const f of files) {
      const text=await readFile(f.path);
      const s=summarize(f.path,text);
      done++; totalWords+=s.words;
      s.top.forEach(w=>vocabulary[w]=(vocabulary[w]||0)+1);
      s.named.forEach(n=>names[n]=(names[n]||0)+1);
      byKind[s.kind]=(byKind[s.kind]||0)+1;
      records.push({path:f.path,sha:f.sha,size:f.size,...s});
      if(done%8===0 || done===files.length) {
        const pct=Math.round(done/files.length*100);
        meter.style.width=pct+'%';
        status.textContent=`Scrying ${done}/${files.length} files · ${totalWords.toLocaleString()} words`;
      }
    }
    const graph={
      generated:new Date().toISOString(),
      source:`https://github.com/${GEEHUB.owner}/${GEEHUB.repo}`,
      files:records,
      vocabulary:Object.entries(vocabulary).sort((a,b)=>b[1]-a[1]).slice(0,250),
      names:Object.entries(names).sort((a,b)=>b[1]-a[1]).slice(0,250),
      kinds:byKind
    };
    localStorage.setItem(GEEHUB.cacheKey,JSON.stringify(graph));
    stats.innerHTML=`<div class="corpus-stat"><b>${records.length}</b><span>FILES READ</span></div><div class="corpus-stat"><b>${totalWords.toLocaleString()}</b><span>WORDS PASSED THROUGH</span></div><div class="corpus-stat"><b>${Object.keys(names).length}</b><span>NAMED SIGNALS</span></div><div class="corpus-stat"><b>${Object.keys(vocabulary).length}</b><span>VOCABULARY</span></div>`;
    status.textContent='CORPUS HELD · CHARACTER LANDMARKS CAN NOW SEARCH IT';
    return graph;
  }

  window.GEEHUB_CORPUS_SCRY = {process:processCorpus};
  processCorpus().catch(e=>{
    root.innerHTML=`<div class="corpus-scry"><div class="eyebrow">CORPUS / SCRY</div><h2>THE CORPUS IS CLOSED</h2><p>${esc(e.message)} · The field remains available; run the scry again when repository access is available.</p></div>`;
  });
})();