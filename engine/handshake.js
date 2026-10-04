(() => {
  const root = document.querySelector('#handshakeSpace');
  if (!root) return;
  const key = 'geehub-handshake';
  const agents = ['Luke','Tyler','Andrew','Joseph','Chase'];
  let state = null;
  try { state = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  if (!state) state = {status:'REQUESTED',agent:'',territory:'',intent:''};
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  function render(){
    root.innerHTML = '<div class="handshake-head"><div><div class="eyebrow">INITIATION / HANDSHAKE</div><h2>ACKNOWLEDGE YOUR ARRIVAL.</h2><p>The handshake identifies the entrant, names the territory, states the intent, and records continuity.</p></div><strong class="handshake-status">'+esc(state.status)+'</strong></div>'
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN
NaN