/* GEEHUB Arboreal Audio — local procedural Web Audio engine */
(()=>{'use strict';
const root=document.getElementById('treeAudio');if(!root||root.dataset.ready)return;root.dataset.ready='1';
const $=id=>root.querySelector('#'+id),pads=[...root.querySelectorAll('[data-tree-sound]')];
let ctx=null,master=null,loopTimer=null,looping=false,bit8=false,voices=new Set(),params={wind:.48,density:.55,wood:.62};
function boot(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.68;master.connect(ctx.destination)}if(ctx.state==='suspended')ctx.resume();return ctx}
function status(s){$('treeAudioStatus').textContent=s}
function register(n){voices.add(n);n.addEventListener?.('ended',()=>voices.delete(n));return n}
function noise(seconds){const c=boot(),b=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*seconds)),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
function shape(source){if(!bit8)return source;const sh=ctx.createWaveShaper(),curve=new Float32Array(512);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.round(x*15)/15}sh.curve=curve;sh.oversample='none';source.connect(sh);return sh}
function envelope(g,t,d,peak){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+d)}
function hiss({duration=1,low=500,high=3000,level=.1,rate=1}={}){const c=boot(),s=register(c.createBufferSource()),f=c.createBiquadFilter(),g=c.createGain();s.buffer=noise(duration+.1);s.playbackRate.value=rate;f.type='bandpass';f.frequency.setValueAtTime(low,c.currentTime);f.frequency.exponentialRampToValueAtTime(Math.max(low+1,high),c.currentTime+duration);f.Q.value=.65;s.connect(f);f.connect(g);const out=shape(g);out.connect(master);envelope(g,c.currentTime,duration,level);s.start();s.stop(c.currentTime+duration+.06);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();if(out!==g)out.disconnect()}}
function tone({freq=90,end=40,duration=1,wave='sine',level=.1}={}){const c=boot(),o=register(c.createOscillator()),g=c.createGain();o.type=wave;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),c.currentTime+duration);o.connect(g);const out=shape(g);out.connect(master);envelope(g,c.currentTime,duration,level);o.start();o.stop(c.currentTime+duration+.05);o.onended=()=>{o.disconnect();g.disconnect();if(out!==g)out.disconnect()}}
const sounds={
canopy(){hiss({duration:3+Math.random()*3,low:220+params.wind*420,high:1800+params.wind*5200,level:.055+params.wind*.14,rate:.6+params.wind*.8})},
rustle(){for(let i=0;i<3+Math.round(params.density*9);i++)setTimeout(()=>hiss({duration:.12+Math.random()*.4,low:1100+Math.random()*2200,high:3500+Math.random()*4200,level:.025+params.density*.065,rate:.7+Math.random()*.8}),Math.random()*480)},
creak(){tone({freq:100+Math.random()*42,end:35,duration:1.5+Math.random()*2,wave:'sawtooth',level:.035+params.wood*.09});hiss({duration:1.1,low:280,high:950,level:.04,rate:.35})},
knock(){tone({freq:95+Math.random()*35,end:32,duration:.22,wave:'triangle',level:.12+params.wood*.16});setTimeout(()=>tone({freq:58,end:28,duration:.3,level:.07}),85)},
groan(){tone({freq:66,end:25,duration:2.8,wave:'triangle',level:.09+params.wood*.12});tone({freq:34,end:20,duration:2.2,level:.04})}
};
function trigger(name){boot();sounds[name]?.();pads.forEach(p=>p.setAttribute('aria-pressed',String(p.dataset.treeSound===name)));status('PLAY / '+name.toUpperCase())}
function forest(){sounds.canopy();setTimeout(sounds.rustle,400+Math.random()*900);if(Math.random()<.62)setTimeout(sounds.creak,1100+Math.random()*1300);if(Math.random()<.2)setTimeout(sounds.knock,1700+Math.random()*1500)}
function start(){boot();if(looping)return;looping=true;$('treeAudioLoop').setAttribute('aria-pressed','true');$('treeAudioLoop').textContent='FOREST LOOP / ON';status('FOREST / RUNNING');forest();loopTimer=setInterval(forest,3100)}
function stop(){looping=false;clearInterval(loopTimer);loopTimer=null;voices.forEach(v=>{try{v.stop()}catch(e){}});voices.clear();pads.forEach(p=>p.setAttribute('aria-pressed','false'));$('treeAudioLoop').setAttribute('aria-pressed','false');$('treeAudioLoop').textContent='START FOREST LOOP';if(master&&ctx){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(.0001,ctx.currentTime,.025);setTimeout(()=>{if(master&&ctx)master.gain.setTargetAtTime(.68,ctx.currentTime,.08)},120)}status('STANDBY')}
pads.forEach(p=>p.addEventListener('click',()=>trigger(p.dataset.treeSound)));
$('treeAudioLoop').addEventListener('click',()=>looping?stop():start());
$('treeAudioStop').addEventListener('click',stop);
$('treeAudio8bit').addEventListener('click',()=>{bit8=!bit8;$('treeAudio8bit').setAttribute('aria-pressed',String(bit8));$('treeAudio8bit').textContent='8-BIT TEXTURE / '+(bit8?'ON':'OFF')});
[['wind','wind'],['density','density'],['wood','wood']].forEach(([id,key])=>$(id).addEventListener('input',e=>{params[key]=Number(e.target.value)/100;$(id+'Value').textContent=e.target.value+'%'}));
/* World events can modulate the forest without coupling audio to any one scene. */
window.addEventListener('geehub:environment',e=>{const d=e.detail||{};if(Number.isFinite(d.wind))params.wind=Math.max(0,Math.min(1,d.wind));if(Number.isFinite(d.foliageDensity))params.density=Math.max(0,Math.min(1,d.foliageDensity));if(Number.isFinite(d.woodResonance))params.wood=Math.max(0,Math.min(1,d.woodResonance));if(d.forestAudio===true&&!looping)start();if(d.forestAudio===false&&looping)stop()});
const run=document.getElementById('runWorld');if(run)run.addEventListener('click',()=>{if(looping)stop();else start()});
window.GEEHUB_TREE_AUDIO={play:trigger,start,stop,setEnvironment(d={}){window.dispatchEvent(new CustomEvent('geehub:environment',{detail:d}))},get state(){return{looping,bit8,params:{...params}}}};
})();