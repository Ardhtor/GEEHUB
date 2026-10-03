(() => {
  const stage = document.getElementById('biggener');
  if (!stage) return;
  const figure = document.getElementById('biggenerFigure');
  const level = document.getElementById('biggenerLevel');
  const size = document.getElementById('biggenerSize');
  const text = document.getElementById('biggenerText');
  const buttons = stage.querySelectorAll('[data-biggener]');
  let growth = 0;
  let baseline = 1;

  const render = (delta = 0) => {
    growth = Math.max(0, growth + delta);
    const scale = 1 + growth * 0.12;
    const reach = 1 + growth * 0.045;
    figure.style.setProperty('--body-scale', scale.toFixed(3));
    figure.style.setProperty('--body-reach', reach.toFixed(3));
    figure.style.setProperty('--body-joint', (1 + growth * 0.065).toFixed(3));
    size.textContent = `${Math.round(scale * baseline * 100)}%`;
    level.textContent = `BASELINE ${String(Math.max(1, Math.floor(growth / 3) + baseline)).padStart(2, '0')}`;
    const lines = [
      'The body is at its remembered baseline.',
      'Mass is accumulating without losing continuity.',
      'The joints are adapting to the new scale.',
      'Reach extends. The silhouette has become architectural.',
      'The old proportions are becoming memory.',
      'A larger baseline is holding.'
    ];
    text.textContent = lines[Math.min(lines.length - 1, Math.floor(growth / 2))];
    stage.classList.remove('biggener-pulse');
    void stage.offsetWidth;
    stage.classList.add('biggener-pulse');
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const action = Number(button.dataset.biggener);
      if (action < 0) growth = Math.max(0, growth - 1);
      else if (action === 5) { baseline += 1; growth = 0; }
      else growth += action;
      render(0);
    });
  });

  document.getElementById('biggenerRun')?.addEventListener('click', () => {
    growth += 1;
    render(0);
  });

  render(0);
})();
