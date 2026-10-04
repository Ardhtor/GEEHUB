(() => {
  const host = document.getElementById('zeroReadMode');
  if (!host) return;

  const cards = [
    {id:'worldVisual', icon:'◉', className:'zrm-world'},
    {id:'atlas', icon:'✦', className:'zrm-atlas'},
    {id:'biggener', icon:'↗', className:'zrm-growth'},
    {id:'worshipMe', icon:'⌾', className:'zrm-center'},
    {id:'mindHorizon', icon:'∞', className:'zrm-horizon'},
    {id:'creations', icon:'◆', className:'zrm-create'},
    {id:'artifactRoom', icon:'◇', className:'zrm-artifact'}
  ];
  let index = 0;
  let touchStart = 0;
  let open = false;

  host.innerHTML = `
    <button class="zrm-launch" aria-label="Open visual mode"><span>◉</span></button>
    <div class="zrm-deck" aria-hidden="true">
      <div class="zrm-card"></div>
      <div class="zrm-dots"></div>
      <div class="zrm-actions">
        <button class="zrm-prev" aria-label="Previous">‹</button>
        <button class="zrm-run" aria-label="Run">●</button>
        <button class="zrm-next" aria-label="Next">›</button>
      </div>
      <button class="zrm-close" aria-label="Close">×</button>
    </div>`;

  const deck = host.querySelector('.zrm-deck');
  const card = host.querySelector('.zrm-card');
  const dots = host.querySelector('.zrm-dots');

  function render() {
    const item = cards[index];
    card.className = `zrm-card ${item.className}`;
    card.innerHTML = `<span class="zrm-icon">${item.icon}</span><span class="zrm-surface"></span>`;
    dots.innerHTML = cards.map((_, i) => `<i class="${i === index ? 'active' : ''}"></i>`).join('');
  }

  function show() { open = true; deck.classList.add('open'); deck.setAttribute('aria-hidden','false'); render(); }
  function hide() { open = false; deck.classList.remove('open'); deck.setAttribute('aria-hidden','true'); }
  function next() { index = (index + 1) % cards.length; render(); }
  function prev() { index = (index - 1 + cards.length) % cards.length; render(); }
  function run() {
    const target = document.getElementById(cards[index].id);
    const button = target?.querySelector('.run-button, #biggenerRun, #worshipRun, #horizonRun');
    if (button) button.click();
    else document.getElementById('runWorld')?.click();
    card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
  }

  host.querySelector('.zrm-launch').addEventListener('click', show);
  host.querySelector('.zrm-close').addEventListener('click', hide);
  host.querySelector('.zrm-next').addEventListener('click', next);
  host.querySelector('.zrm-prev').addEventListener('click', prev);
  host.querySelector('.zrm-run').addEventListener('click', run);
  deck.addEventListener('touchstart', e => { touchStart = e.changedTouches[0].clientX; }, {passive:true});
  deck.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(dx) > 45) dx < 0 ? next() : prev();
  }, {passive:true});
  document.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') hide();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') { e.preventDefault(); run(); }
  });
})();
