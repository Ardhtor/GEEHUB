(() => {
  const stage = document.getElementById('sculptPreview')?.querySelector('.sculpt-preview-stage');
  const mannequin = document.getElementById('sculptMannequin');
  const part = document.getElementById('previewPart');
  const scale = document.getElementById('previewScale');
  const plus = document.getElementById('previewPlus');
  const deep = document.getElementById('previewDeep');
  const wide = document.getElementById('previewWide');
  const next = document.getElementById('previewNext');
  if (!stage || !mannequin || !part || !scale || !plus || !deep || !wide || !next) return;

  const sequence = ['shoulder-left','chest','arm-left','arm-right','tank','boot-left'];
  let cursor = 0;
  let selected = null;
  const shape = {};

  const paint = () => {
    mannequin.style.setProperty('--sculpt-wide', String(shape[selected]?.wide || 1));
    mannequin.style.setProperty('--sculpt-deep', String(shape[selected]?.deep || 1));
    mannequin.style.setProperty('--sculpt-tall', String(shape[selected]?.tall || 1));
    const s = shape[selected] || {wide:1,deep:1,tall:1};
    scale.textContent = `${Math.round(s.wide*100)}W / ${Math.round(s.deep*100)}D / ${Math.round(s.tall*100)}H`;
    mannequin.classList.remove('sculpt-pulse');
    void mannequin.offsetWidth;
    mannequin.classList.add('sculpt-pulse');
  };

  const select = id => {
    selected = id;
    if (!shape[id]) shape[id] = {wide:1,deep:1,tall:1};
    stage.className = 'sculpt-preview-stage part-' + id;
    stage.querySelectorAll('.component-tray button').forEach(b => b.classList.toggle('selected', b.dataset.part === id));
    part.textContent = (id || 'NO PART').replaceAll('-', ' ').toUpperCase();
    paint();
  };

  const sculpt = (axis, amount) => {
    if (!selected) return;
    const s = shape[selected] || (shape[selected] = {wide:1,deep:1,tall:1});
    s[axis] = Math.max(.75, Math.min(2.25, s[axis] + amount));
    paint();
  };

  stage.querySelectorAll('.component-tray button').forEach(b => b.addEventListener('click', () => select(b.dataset.part)));
  plus.addEventListener('click', () => sculpt('tall', .08));
  deep.addEventListener('click', () => sculpt('deep', .12));
  wide.addEventListener('click', () => sculpt('wide', .12));
  next.addEventListener('click', () => { select(sequence[cursor % sequence.length]); cursor += 1; });

  select('chest');
})();