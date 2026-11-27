/* GEEHUB / IMAGE WORKER
   RUN -> IMAGE JOB -> VISUAL ENGINE -> IMAGE MEMORY.
   Supports both text-to-image and source-conditioned image editing.
*/
(() => {
  const CONFIG = {
    version: 2,
    id: 'geehub-image-worker',
    purpose: 'Create new images or edit a selected source image, then resolve the result into GEEHUB.',
    adapter: 'automatic1111',
    endpoint: 'http://127.0.0.1:7860',
    api: '/sdapi/v1/txt2img',
    editApi: '/sdapi/v1/img2img',
    output: 'data-url',
    defaultEncounter: {
      title: 'CHEST EXPANSION / CAR PORTRAIT',
      tags: ['adult male bodybuilder', 'larger pectorals', 'larger deltoids', 'larger traps', 'photorealistic', 'identity continuity']
    }
  };

  const DEFAULT_EDIT_PROMPT = [
    'Edit the selected photograph of the same adult man.',
    'Preserve his recognizable face, beard, hair, expression, head size, seated pose, hand placement, car seat, dashboard, window view, daylight, camera angle, framing and perspective.',
    'Make his pectoral muscles substantially larger than in the source: much broader, deeper, thicker, rounder and more prominent, with exceptionally full developed bodybuilding pecs.',
    'Increase the deltoids, traps and upper arms enough to support the larger chest while retaining the same person and coherent anatomy.',
    'Keep natural skin pores and fine body hair; use realistic skin texture without a repeating scale, mesh or reptilian pattern.',
    'Photographic fitness portrait, natural light, nonsexual presentation.'
  ].join(' ');

  const DEFAULT_NEGATIVE_PROMPT = [
    'different person', 'face change', 'beard change', 'expression change',
    'pose change', 'hand deformity', 'extra fingers', 'extra limbs',
    'broken anatomy', 'melted contours', 'reptilian skin', 'mesh texture',
    'camera change', 'background change', 'text', 'watermark', 'poster',
    'infographic', 'sexualized framing'
  ].join(', ');

  const host = document.querySelector('#imageWorker');
  const ART = window.GEEHUB_ARTIFACTS;
  if (!host) return;

  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const JOBKEY = 'geehub-image-jobs';
  const QUEUE = './hub/image-jobs.json';
  const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
  const state = {
    running: false,
    last: null,
    sourceDataUrl: '',
    sourceName: '',
    sourceBytes: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    prompt: DEFAULT_EDIT_PROMPT
  };

  function readJobs() {
    try {
      const jobs = JSON.parse(localStorage.getItem(JOBKEY) || '[]');
      return Array.isArray(jobs) ? jobs : [];
    } catch {
      return [];
    }
  }

  function saveJobs(jobs) {
    try {
      localStorage.setItem(JOBKEY, JSON.stringify(jobs.slice(0, 20)));
      return true;
    } catch (error) {
      console.warn('GEEHUB could not persist the full image-job history:', error);
      return false;
    }
  }

  function upsertJob(job) {
    const jobs = readJobs();
    const index = jobs.findIndex(item => item.id === job.id);
    if (index >= 0) jobs[index] = job;
    else jobs.unshift(job);
    saveJobs(jobs);
  }

  function promptFor(title, tags) {
    return [
      'Immersive fictional game-world scene.',
      'Adult male bodybuilder, recognizable and continuous.',
      'The subject remains continuous while scale changes are visible through body and surroundings.',
      'Direct in-world scene, not a poster, not an infographic.',
      String(title || CONFIG.defaultEncounter.title) + '.',
      (tags || CONFIG.defaultEncounter.tags).join(', ') + '.'
    ].join(' ');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('SOURCE_READ_FAILED'));
      reader.onerror = () => reject(new Error('SOURCE_READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  function imageDimensions(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({width:image.naturalWidth, height:image.naturalHeight});
      image.onerror = () => reject(new Error('SOURCE_IMAGE_INVALID'));
      image.src = dataUrl;
    });
  }

  function getEndpoint() {
    try { return localStorage.getItem('geehub-image-endpoint') || CONFIG.endpoint; }
    catch { return CONFIG.endpoint; }
  }

  function setEndpoint(value) {
    try { localStorage.setItem('geehub-image-endpoint', value); }
    catch { /* Endpoint preference is optional; image jobs can still run. */ }
  }

  function rawBase64(dataUrl) {
    const comma = dataUrl.indexOf(',');
    return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  }

  function render() {
    const jobs = readJobs();
    const sourcePanel = state.sourceDataUrl
      ? '<img src="' + esc(state.sourceDataUrl) + '" alt="Selected source image"><div class="image-worker-file">' + esc(state.sourceName) + ' / ' + state.sourceWidth + ' × ' + state.sourceHeight + ' / ' + Math.round(state.sourceBytes / 1024) + ' KB</div><button id="clearImageSource" class="image-worker-clear-source" type="button">REMOVE SOURCE</button>'
      : '<span>SELECT A SOURCE IMAGE TO EDIT</span>';
    const resultPanel = state.last?.html || '<span>NO IMAGE RETURNED YET.</span>';

    host.innerHTML =
      '<div class="image-worker-head"><div><div class="eyebrow">VISUAL SYNTHESIS / IMAGE WORKER</div><h2>CREATE OR EDIT AN IMAGE.</h2><p>Select a source photograph to make an identity-preserving edit, or leave it empty to create a new image.</p></div><div class="image-worker-status">' + (state.running ? 'BUILDING IMAGE' : 'READY / ' + jobs.length + ' JOBS') + '</div></div>' +
      '<div class="image-worker-console">' +
        '<label>JOB NAME<input id="imageEncounter" value="' + esc(state.last?.title || CONFIG.defaultEncounter.title) + '"></label>' +
        '<label>LOCAL IMAGE ENGINE<input id="imageEndpoint" value="' + esc(getEndpoint()) + '"></label>' +
        '<label class="image-worker-wide">SOURCE IMAGE<input id="imageSourceFile" type="file" accept="image/png,image/jpeg,image/webp,image/bmp"></label>' +
        '<label class="image-worker-wide">EDIT INSTRUCTION<textarea id="imagePrompt" rows="4">' + esc(state.prompt) + '</textarea></label>' +
        '<label class="image-worker-strength">EDIT STRENGTH <span id="imageStrengthValue">0.45</span><input id="imageStrength" type="range" min="0.20" max="0.75" step="0.05" value="0.45"></label>' +
        '<button id="buildImage" class="run-button" type="button" ' + (state.running ? 'disabled' : '') + '>' + (state.sourceDataUrl ? 'EDIT SOURCE IMAGE' : 'BUILD NEW IMAGE') + '</button>' +
      '</div>' +
      '<div class="image-worker-media-grid">' +
        '<div class="image-worker-source"><div class="image-worker-panel-label">SOURCE</div>' + sourcePanel + '</div>' +
        '<div id="imageResult" class="image-result"><div class="image-worker-panel-label">RESULT</div>' + resultPanel + '</div>' +
      '</div>';

    const fileInput = host.querySelector('#imageSourceFile');
    fileInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!['image/png','image/jpeg','image/webp','image/bmp'].includes(file.type)) {
        state.last = {title:'SOURCE IMAGE', html:'<span>CHOOSE A PNG, JPEG, WEBP OR BMP IMAGE.</span>'};
        render();
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        state.last = {title:'SOURCE IMAGE', html:'<span>SOURCE IMAGE EXCEEDS 15 MB. Use a smaller copy.</span>'};
        render();
        return;
      }
      try {
        state.sourceDataUrl = await fileToDataUrl(file);
        const dimensions = await imageDimensions(state.sourceDataUrl);
        state.sourceName = file.name;
        state.sourceBytes = file.size;
        state.sourceWidth = dimensions.width;
        state.sourceHeight = dimensions.height;
        state.last = null;
        render();
      } catch (error) {
        state.last = {title:'SOURCE IMAGE', html:'<span>COULD NOT READ SOURCE IMAGE.</span>'};
        render();
      }
    });

    host.querySelector('#clearImageSource')?.addEventListener('click', () => {
      state.sourceDataUrl = '';
      state.sourceName = '';
      state.sourceBytes = 0;
      state.sourceWidth = 0;
      state.sourceHeight = 0;
      render();
    });

    host.querySelector('#imagePrompt').addEventListener('input', event => {
      state.prompt = event.target.value;
    });

    const strength = host.querySelector('#imageStrength');
    strength.addEventListener('input', () => {
      host.querySelector('#imageStrengthValue').textContent = Number(strength.value).toFixed(2);
    });

    host.querySelector('#buildImage').addEventListener('click', () => build());
  }

  async function syncCanonicalQueue() {
    try {
      const response = await fetch(QUEUE + '?ts=' + Date.now(), {cache:'no-store'});
      if (!response.ok) return;
      const data = await response.json();
      const canonical = Array.isArray(data.jobs) ? data.jobs : [];
      const localJobs = readJobs();
      canonical.forEach(job => {
        if (!localJobs.some(item => item.id === job.id)) localJobs.push(job);
      });
      saveJobs(localJobs);
    } catch {
      /* The local worker remains usable when the canonical queue is unavailable. */
    }
  }

  function queueJob(title, prompt, mode, sourceFile, denoisingStrength, endpoint) {
    const job = {
      id: 'image-job-' + Date.now(),
      at: Date.now(),
      type: 'IMAGE',
      mode,
      status: 'QUEUED',
      title,
      prompt,
      sourceFile: sourceFile || null,
      denoisingStrength: mode === 'IMAGE_TO_IMAGE' ? denoisingStrength : null,
      adapter: CONFIG.adapter,
      endpoint
    };
    upsertJob(job);
    window.GEEHUB_INTERACTION?.emit({
      id: job.id,
      at: job.at,
      from: 'geehub',
      to: 'visual-synthesis',
      type: 'OFFER',
      title: (mode === 'IMAGE_TO_IMAGE' ? 'IMAGE EDIT / ' : 'IMAGE JOB / ') + title,
      body: mode === 'IMAGE_TO_IMAGE'
        ? 'The selected source image and edit instruction were sent to the visual-synthesis territory.'
        : 'The program created a concrete image-generation job and sent it to the visual-synthesis territory.',
      source: 'GEEHUB image worker',
      live: true
    });
    return job;
  }

  async function build(detail) {
    if (state.running) return;

    const title = detail?.title || host.querySelector('#imageEncounter')?.value || CONFIG.defaultEncounter.title;
    const endpoint = (host.querySelector('#imageEndpoint')?.value || CONFIG.endpoint).replace(/\/$/, '');
    const prompt = detail?.prompt || host.querySelector('#imagePrompt')?.value || promptFor(title, CONFIG.defaultEncounter.tags);
    const sourceDataUrl = detail?.sourceDataUrl || state.sourceDataUrl;
    const sourceFile = sourceDataUrl ? {
      name: state.sourceName,
      bytes: state.sourceBytes,
      type: sourceDataUrl.slice(5, sourceDataUrl.indexOf(';')),
      width: state.sourceWidth,
      height: state.sourceHeight
    } : null;
    const denoisingStrength = Number(host.querySelector('#imageStrength')?.value || 0.45);
    const mode = sourceDataUrl ? 'IMAGE_TO_IMAGE' : 'TEXT_TO_IMAGE';

    state.running = true;
    setEndpoint(endpoint);
    render();

    const job = queueJob(title, prompt, mode, sourceFile, denoisingStrength, endpoint);
    const result = host.querySelector('#imageResult');
    if (result) result.innerHTML = '<div class="image-worker-panel-label">RESULT</div><span>JOB CREATED / CONTACTING VISUAL ENGINE…</span>';

    try {
      const payload = sourceDataUrl
        ? {
            prompt,
            negative_prompt: DEFAULT_NEGATIVE_PROMPT,
            init_images: [rawBase64(sourceDataUrl)],
            denoising_strength: Math.max(0.20, Math.min(0.75, denoisingStrength)),
            width: Math.max(64, Math.round(state.sourceWidth / 8) * 8),
            height: Math.max(64, Math.round(state.sourceHeight / 8) * 8),
            resize_mode: 0,
            steps: 32,
            cfg_scale: 6.5,
            sampler_name: 'DPM++ 2M Karras',
            batch_size: 1,
            n_iter: 1
          }
        : {
            prompt,
            negative_prompt: DEFAULT_NEGATIVE_PROMPT,
            steps: 28,
            cfg_scale: 7,
            width: 1024,
            height: 1024,
            sampler_name: 'Euler a'
          };

      const response = await fetch(endpoint + (sourceDataUrl ? CONFIG.editApi : CONFIG.api), {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const encoded = Array.isArray(data.images) ? data.images[0] : null;
      if (!encoded) throw new Error('NO IMAGE RETURNED');
      const src = encoded.startsWith('data:') ? encoded : 'data:image/png;base64,' + encoded;

      job.status = 'RETURNED';
      job.returnedAt = Date.now();
      upsertJob(job);
      state.last = {
        title,
        html: '<img class="image-worker-image" src="' + esc(src) + '" alt="' + esc(title) + '"><div class="image-worker-return">RETURNED / ' + esc(title) + '</div><a class="image-worker-download" href="' + esc(src) + '" download="geehub-image-edit.png">SAVE RESULT</a>'
      };
      ART?.emit?.({
        type: 'image',
        title: (mode === 'IMAGE_TO_IMAGE' ? 'IMAGE EDIT / ' : 'IMAGE / ') + title,
        body: 'A concrete visual artifact returned from the visual-synthesis engine.',
        source: 'GEEHUB image worker',
        lineage: {
          job: job.id,
          adapter: CONFIG.adapter,
          engine: endpoint,
          encounter: title,
          mode,
          sourceFile,
          denoisingStrength: mode === 'IMAGE_TO_IMAGE' ? denoisingStrength : null
        },
        prompt,
        canon: 'unclassified',
        dreamable: true,
        quietness: 'high',
        media: src
      });
      window.GEEHUB_INTERACTION?.emit({
        id: 'return-' + job.id,
        at: Date.now(),
        from: 'visual-synthesis',
        to: 'geehub',
        type: 'RETURN',
        title: (mode === 'IMAGE_TO_IMAGE' ? 'IMAGE EDIT RETURN / ' : 'IMAGE RETURN / ') + title,
        body: 'A concrete image returned from the visual-synthesis engine and entered memory.',
        source: 'GEEHUB image worker',
        artifact: job.id,
        live: true
      });
    } catch (error) {
      job.status = 'WAITING_FOR_ENGINE';
      job.error = String(error.message || error);
      upsertJob(job);
      state.last = {
        title,
        html: '<div class="image-worker-offline"><strong>JOB KEPT.</strong><span>' + esc(job.status) + ' // ' + esc(job.error) + '</span><small>For a source edit, the configured Automatic1111-compatible engine must expose /sdapi/v1/img2img. Start the local engine and rerun the job.</small></div>'
      };
    }

    state.running = false;
    render();
  }

  window.GEEHUB_IMAGE_WORKER = {build, queueJob, promptFor, syncCanonicalQueue, config:CONFIG};
  render();
  syncCanonicalQueue().then(render);
})();
