(() => {
  const stage = document.getElementById('sculptPreview')?.querySelector('.sculpt-preview-stage');
  const mannequin = document.getElementById('sculptMannequin');
  const part = document.getElementById('previewPart');
  const scale = document.getElementById('previewScale');
  const plus = document.getElementById('previewPlus');
  const next = document.getElementById('previewNext');
  if (!stage || !mannequin || !part || !scale || !plus || !next) return;

  const sequence = ['shoulder-left','chest','arm-left','arm-right','tank','boot-left'];
  let cursor = 0;
  let selected = null;
  const sizes = {};

  const select = id => {
    selected = id;
    stage.className = 'sculpt-preview-stage part-' + id;
    stage.querySelectorAll('.component-tray button').forEach(b => b.classList.toggle('selected', b.dataset.part === id));
    part.textContent = (id || 'NO PART') .replaceAll('-', ' ').toUpperCase();
    scale.textContent = Math.round((sizes[id] || 1) * 100) + '%';
    mannequin.classList.remove('sculpt-pulse');
    void mannequin.offsetWidth;
    mannequin.classList.add('sculpt-pulse');
  };

  const grow = () => {
    if (!selected) return;
    sizes[selected] = Math.min(1.7, (sizes[selected] || 1) + .08);
    scale.textContent = Math.round(sizes[selected] * 100) + '%';
    mannequin.classList.remove('sculpt-pulse');
    void mannequin.offsetWidth;
    mannequin.classList.add('sculpt-pulse');
  };

  stage.querySelectorAll('.component-tray button').forEach(b => b.addEventListener('click', () => select(b.dataset.part)));
  plus.addEventListener('click', grow);
  next.addEventListener('click', () => {
    select(sequence[cursor % sequence.length]);
    cursor += 1;
  });

  select('chest');
})();