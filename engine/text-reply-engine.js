(() => {
  const SOURCES = [
    './docs/FICTION_MEMORY.md',
    './docs/WORKSPACE_ACCESS.md',
    './README.md',
    './CANON.md',
    './CURRENT_STATE_2026-09.md',
    './BUILD_NARRATIVE.md',
    './lore/DEEP_LORE.md'
  ];

  const $ = s => document.querySelector(s);
  const clean = s => s.replace(/\r/g,'').replace(/^#+\s*/gm,'').replace(/\*\*/g,'').trim();
  const sentences = text => clean(text).split(/(?<=[.!?])\s+/).filter(x => x.length > 45);
  const replyFor = (text, source) => {
    const t = text.toLowerCase();
    if (t.includes('remember') || t.includes('archive') || t.includes('memory'))
      return 'The archive answers by remembering: this text is not only stored; it becomes material for the next encounter.';
    if (t.includes('transform') || t.includes('change') || t.includes('growth'))
      return 'The Hub returns the transformation to the world as a new baseline. What changed is retained, and continuity is carried forward.';
    if (t.includes('interface') || t.includes('hub') || t.includes('terminal'))
      return 'The interface answers as a place: enter the record, encounter what remains, and let the next artifact emerge from it.';
    if (t.includes('world') || t.includes('place') || t.includes('terrain'))
      return 'The world answers by giving the text somewhere to exist. A passage becomes a location, and the location can be encountered again.';
    if (t.includes('fiction') || t.includes('lore') || t.includes('myth'))
      return 'The fiction answers through accumulation. This passage becomes lore because something later can find it, alter its associations, and return changed.';
    return 'The Hub has found this passage. Its first reply is to keep it present and ask what new material can grow from the encounter.';
  };

  async function testCorpus() {
    const status = $('#textReplyStatus'), excerpt = $('#textReplyExcerpt'), reply = $('#textReplyBody'), source = $('#textReplySource');
    if (!status || !excerpt || !reply || !source) return;
    status.textContent = 'READING CORPUS…';
    const docs = [];
    for (const path of SOURCES) {
      try {
        const r = await fetch(path);
        if (!r.ok) continue;
        const text = await r.text();
        const ss = sentences(text);
        if (ss.length) docs.push({path, text, ss});
      } catch {}
    }
    if (!docs.length) {
      status.textContent = 'NO CORPUS RETURN';
      excerpt.textContent = 'The existing texts could not be reached from this build.';
      reply.textContent = 'The Hub has nothing to answer yet.';
      return;
    }
    const run = Number(localStorage.getItem('geehub-text-reply-run') || 0) + 1;
    localStorage.setItem('geehub-text-reply-run', run);
    const all = docs.flatMap(d => d.ss.map(s => ({...d, sentence:s})));
    const item = all[(run - 1) % all.length];
    status.textContent = 'CORPUS RETURN // ' + String(run).padStart(3,'0');
    excerpt.textContent = '“' + item.sentence.slice(0, 420) + (item.sentence.length > 420 ? '…' : '') + '”';
    source.textContent = item.path;
    reply.textContent = replyFor(item.sentence, item.path);
    if (window.GEEHUB_ARTIFACTS) {
      window.GEEHUB_ARTIFACTS.emit({
        type:'text-reply',
        title:'Corpus Reply // ' + item.path.split('/').pop(),
        body: reply.textContent,
        source:item.path,
        lineage:'existing text → encounter → reply',
        canon:false,
        dreamable:true,
        quietness:0.2
      });
    }
    if (typeof renderArtifacts === 'function') renderArtifacts();
    if (typeof dreamFromArtifacts === 'function') dreamFromArtifacts();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const section = $('#textReplyLab');
    if (!section) return;
    $('#textReplyRun')?.addEventListener('click', testCorpus);
  });
})();