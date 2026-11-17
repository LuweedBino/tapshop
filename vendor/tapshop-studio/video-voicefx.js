// Voice studio: clean up and style a recorded voiceover, all on this device.
// window.veVoiceStudio(file, settings?) opens a dialog and resolves to {file, settings} once the creator taps
// "Use this sound", or null. It always works from the file it's given (pass the original take, not an edited
// one, so edits never stack). The result keeps the exact length of the original, so scene marks stay right.
// Steps: decode to 48 kHz mono → remove background noise (veDenoise, video-cleansound.js) → a voice effect
// (EQ, compression, room, echo…) rendered in an OfflineAudioContext → loudness evened out → mono WAV.
(()=>{
const SR=48000;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- effects ----------
// eq: [type, Hz, dB, Q]. comp: [threshold, ratio, attack, release]. Spaces (room, hall, echo) are sent on top
// of the dry voice; the rest replace it, blended with the dry voice by Amount.
const FX=[
  ['none','🎤','Natural','Just your voice'],
  ['podcast','🎙️','Podcast','Full, close and even'],
  ['crisp','✨','Crisp & clear','Bright and easy to follow'],
  ['warm','☕','Warm','Soft, rich and cosy'],
  ['radio','📻','Radio host','Punchy FM announcer'],
  ['phone','☎️','Phone call','Thin, like on a call'],
  ['megaphone','📢','Megaphone','Loud and crunchy'],
  ['room','🏠','Room','A little natural space'],
  ['reverb','🌌','Reverb','Big, dreamy and smooth'],
  ['hall','⛪','Concert hall','Huge space, long tail'],
  ['echo','🔁','Echo','Repeats that fade away'],
  ['stadium','🏟️','Stadium','Announcer in an arena'],
  ['robot','🤖','Robot','Metallic, sci-fi voice'],
  ['underwater','🌊','Underwater','Muffled and wobbly'],
  ['whisper','🌙','ASMR','Close, airy and soft'],
];
const SETUP={
  none:{},
  podcast:{eq:[['highpass',80,0,.7],['lowshelf',140,3],['peaking',320,-3,1],['peaking',3200,3,1],['highshelf',10000,2]],comp:[-26,4,.004,.15]},
  crisp:{eq:[['highpass',110,0,.7],['peaking',260,-3,1],['peaking',4200,5,.9],['highshelf',9000,5]],comp:[-22,3,.004,.12]},
  warm:{eq:[['highpass',60,0,.7],['lowshelf',180,4],['peaking',2600,-1.5,1],['highshelf',7000,-4]],comp:[-24,3,.01,.2]},
  radio:{eq:[['highpass',120,0,.7],['lowshelf',160,5],['peaking',1800,4,.8],['highshelf',8000,3]],comp:[-30,8,.002,.1],drive:1.5},
  phone:{eq:[['highpass',450,0,1],['lowpass',3000,0,1],['peaking',1500,6,1]],comp:[-28,6,.003,.1],drive:3},
  megaphone:{eq:[['highpass',650,0,1.2],['lowpass',4200,0,1],['peaking',2000,8,1.2]],comp:[-24,10,.002,.08],drive:5},
  room:{eq:[['highpass',80,0,.7]],space:{secs:.55,decay:3,wet:.32,pre:.008,tone:6500}},
  reverb:{eq:[['highpass',90,0,.7],['highshelf',9000,2]],space:{secs:2.2,decay:2.4,wet:.42,pre:.025,tone:7000}},
  hall:{eq:[['highpass',90,0,.7]],space:{secs:3.6,decay:2,wet:.5,pre:.045,tone:5000}},
  echo:{eq:[['highpass',90,0,.7]],echo:{time:.32,fb:.42,wet:.45,tone:3500}},
  stadium:{eq:[['highpass',140,0,.7],['peaking',2200,4,1]],comp:[-28,6,.003,.12],echo:{time:.18,fb:.3,wet:.3,tone:3000},space:{secs:2.8,decay:2.2,wet:.4,pre:.06,tone:4500}},
  robot:{eq:[['highpass',150,0,.7],['peaking',1200,5,1.5]],ring:55,comp:[-24,6,.002,.1]},
  underwater:{eq:[['lowpass',650,0,1.2],['lowshelf',200,4]],wobble:[.9,.004],space:{secs:1.4,decay:3,wet:.3,pre:.02,tone:900}},
  whisper:{eq:[['highpass',160,0,.7],['peaking',350,-4,1],['highshelf',7000,6]],comp:[-34,6,.002,.1]},
};
const SPACE_FX=new Set(['room','reverb','hall','echo','stadium']);

// A made-up room echo: stereo-free decaying noise that gets duller as it fades.
function impulse(ctx,{secs,decay,pre}){const n=Math.round(SR*secs),buf=ctx.createBuffer(1,n,SR),d=buf.getChannelData(0),p=Math.round(SR*pre);let lp=0;
  for(let i=p;i<n;i++){const t=(i-p)/(n-p),k=.15+.8*t;lp=lp*k+(Math.random()*2-1)*(1-k);d[i]=lp*Math.pow(1-t,decay)*2}return buf}
function curve(amt){const n=2048,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(x*amt)/Math.tanh(amt)}return c}

async function render(x,id,amount){const fx=SETUP[id]||{},a=Math.max(0,Math.min(1,amount));
  if(id==='none'||!a)return x.slice();
  const ctx=new OfflineAudioContext(1,x.length,SR),buf=ctx.createBuffer(1,x.length,SR);buf.copyToChannel(x,0);
  const src=ctx.createBufferSource();src.buffer=buf;const out=ctx.createGain();out.connect(ctx.destination);
  let node=src;const link=n=>{node.connect(n);node=n};
  for(const [type,f,g,q] of fx.eq||[]){const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(g!=null)b.gain.value=g;if(q!=null)b.Q.value=q;link(b)}
  if(fx.drive){const w=ctx.createWaveShaper();w.curve=curve(fx.drive);w.oversample='4x';link(w)}
  if(fx.ring){const g=ctx.createGain();g.gain.value=0;const o=ctx.createOscillator();o.frequency.value=fx.ring;o.connect(g.gain);o.start();link(g)}
  if(fx.wobble){const d=ctx.createDelay(.05);d.delayTime.value=.01;const o=ctx.createOscillator(),og=ctx.createGain();o.frequency.value=fx.wobble[0];og.gain.value=fx.wobble[1];o.connect(og).connect(d.delayTime);o.start();link(d)}
  if(fx.comp){const c=ctx.createDynamicsCompressor();[c.threshold.value,c.ratio.value,c.attack.value,c.release.value]=fx.comp;c.knee.value=8;link(c)}
  const space=SPACE_FX.has(id);
  // The styled voice, plus (for spaces) echoes and room sound sent from it.
  const main=ctx.createGain();main.gain.value=space?1:a;node.connect(main).connect(out);
  if(!space){const dry=ctx.createGain();dry.gain.value=1-a;src.connect(dry).connect(out)}
  if(fx.echo){const e=fx.echo,d=ctx.createDelay(2),fb=ctx.createGain(),lp=ctx.createBiquadFilter(),wet=ctx.createGain();
    d.delayTime.value=e.time;fb.gain.value=e.fb;lp.type='lowpass';lp.frequency.value=e.tone;wet.gain.value=e.wet*a*1.6;
    node.connect(d);d.connect(lp).connect(fb).connect(d);lp.connect(wet).connect(out)}
  if(fx.space){const s=fx.space,cv=ctx.createConvolver(),lp=ctx.createBiquadFilter(),wet=ctx.createGain();cv.normalize=true;cv.buffer=impulse(ctx,s);
    lp.type='lowpass';lp.frequency.value=s.tone;wet.gain.value=s.wet*a*1.6;node.connect(cv).connect(lp).connect(wet).connect(out)}
  src.start();return (await ctx.startRendering()).getChannelData(0)}

// Even loudness: aim for a clear speaking level, never past -1 dB peaks, with a soft fade at both ends.
function finish(y){let pk=0,ss=0,n=0;for(let i=0;i<y.length;i++){const v=Math.abs(y[i]);if(v>pk)pk=v;if(v>.003){ss+=v*v;n++}}
  const rms=n?Math.sqrt(ss/n):0,g=Math.min(rms?.12/rms:1,pk?.89/pk:1,8),f=Math.min(y.length>>1,Math.round(SR*.02));
  for(let i=0;i<y.length;i++){let v=y[i]*g;v=v>.89?.89+Math.tanh((v-.89)*4)/40:v<-.89?-.89+Math.tanh((v+.89)*4)/40:v;y[i]=v}
  for(let i=0;i<f;i++){y[i]*=i/f;y[y.length-1-i]*=i/f}return y}

function wav(x){const n=x.length,v=new DataView(new ArrayBuffer(44+n*2)),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  s(0,'RIFF');v.setUint32(4,36+n*2,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*2,true);
  for(let i=0,o=44;i<n;i++,o+=2){const c=Math.max(-1,Math.min(1,x[i]));v.setInt16(o,c<0?c*32768:c*32767,true)}return new Blob([v.buffer],{type:'audio/wav'})}

async function decode(file){const ctx=new OfflineAudioContext(1,1,SR),b=await ctx.decodeAudioData(await file.arrayBuffer());
  if(b.numberOfChannels===1)return b.getChannelData(0).slice();const x=new Float32Array(b.length);
  for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<x.length;i++)x[i]+=d[i]/b.numberOfChannels}return x}

// ---------- dialog ----------
const css=document.createElement('style');
css.textContent=`#vfxDialog{width:min(620px,94vw);padding:14px 16px}
#vfxDialog[open]{display:flex;flex-direction:column;gap:10px;max-height:min(92vh,92dvh);overflow:hidden}
.vfx-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.vfx-head h2{margin:0;font-size:20px}
.vfx-x{width:40px;height:40px;padding:0;border-radius:50%;font-size:22px;line-height:1;flex:none}
.vfx-body{overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:12px;min-height:0}
.vfx-sec{border:1px solid #ff5b8355;border-radius:14px;padding:12px}.vfx-sec h3{margin:0 0 4px;font-size:15px}.vfx-sec p{margin:0 0 8px;font-size:13px;opacity:.75}
.vfx-pills{display:flex;gap:6px;flex-wrap:wrap}.vfx-pills button{border-radius:999px;padding:7px 14px}
.vfx-pills button.on,.vfx-card.on{border-color:#ff3ea5!important;box-shadow:0 0 0 2px #ff3ea5 inset;background:#ff3ea522!important}
.vfx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.vfx-card{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px 12px!important;border-radius:12px;min-height:74px}
.vfx-card b{font-size:14px}.vfx-card small{font-size:12px;opacity:.7;font-weight:400}.vfx-card span{font-size:22px;line-height:1}
.vfx-amt{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px}.vfx-amt input{flex:1}
.vfx-play{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vfx-play button{padding:12px!important;font-weight:700}
.vfx-play button.on{background:#22c55e!important;border-color:#22c55e!important;color:#fff!important}
.vfx-status{min-height:1.3em;font-size:13px;margin:0}.vfx-bar{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.vfx-bar .primary{background:#ff3ea5!important;border-color:#ff3ea5!important;color:#fff!important;font-weight:700}
@media (max-width:700px),(pointer:coarse){#vfxDialog[open]{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;inset:0;border-radius:0;border:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}.vfx-body{flex:1 1 auto}}`;
document.head.appendChild(css);
const dlg=document.createElement('dialog');dlg.id='vfxDialog';dlg.className='closable';dlg.setAttribute('aria-labelledby','vfxTitle');
dlg.innerHTML=`<div class="vfx-head"><h2 id="vfxTitle">🎚️ Edit my voice</h2><button type="button" class="vfx-x" aria-label="Close">×</button></div>
<div class="vfx-body">
<div class="vfx-sec"><h3>🔇 Remove background noise</h3><p>Takes out fans, AC, hum and hiss so only your voice is left.</p><div class="vfx-pills" id="vfxNoise">
<button type="button" data-n="off">Off</button><button type="button" data-n="light">Light</button><button type="button" data-n="strong">Strong</button></div></div>
<div class="vfx-sec"><h3>🎛️ Voice effect</h3><p>Pick a sound for your voice. Tap ▶ Edited to hear it.</p><div class="vfx-grid" id="vfxFx">${FX.map(([k,e,n,d])=>`<button type="button" class="vfx-card" data-fx="${k}"><span>${e}</span><b>${esc(n)}</b><small>${esc(d)}</small></button>`).join('')}</div>
<label class="vfx-amt" id="vfxAmtWrap">Amount<input type="range" id="vfxAmt" min="10" max="100" step="5" value="100"><b id="vfxAmtV">100%</b></label></div>
</div>
<div class="vfx-play"><button type="button" id="vfxOrig">▶ Original</button><button type="button" id="vfxEdit">▶ Edited</button></div>
<p class="vfx-status" id="vfxStatus" aria-live="polite"></p>
<div class="vfx-bar"><button type="button" id="vfxReset">↺ Back to original</button><button type="button" id="vfxCancel">Cancel</button><button type="button" class="primary" id="vfxUse">✓ Use this sound</button></div>`;
document.body.appendChild(dlg);
const q=id=>dlg.querySelector('#'+id),status=t=>q('vfxStatus').textContent=t;
const audio=new Audio();let playing='';
const S={file:null,x:null,set:{noise:'light',fx:'podcast',amount:1},cache:new Map(),job:0,done:null,origUrl:'',editUrl:'',editKey:''};
const key=()=>JSON.stringify(S.set);

function paint(){dlg.querySelectorAll('#vfxNoise button').forEach(b=>b.classList.toggle('on',b.dataset.n===S.set.noise));
  dlg.querySelectorAll('#vfxFx button').forEach(b=>{const on=b.dataset.fx===S.set.fx;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  q('vfxAmtWrap').hidden=S.set.fx==='none';q('vfxAmt').value=Math.round(S.set.amount*100);q('vfxAmtV').textContent=Math.round(S.set.amount*100)+'%';
  q('vfxOrig').classList.toggle('on',playing==='orig');q('vfxEdit').classList.toggle('on',playing==='edit');
  q('vfxOrig').textContent=playing==='orig'?'■ Stop':'▶ Original';q('vfxEdit').textContent=playing==='edit'?'■ Stop':'▶ Edited'}
function stop(){audio.pause();playing='';paint()}
audio.onended=stop;

// Cleaned audio is cached per strength, since it's the slow part; effects render in a second or two.
async function cleaned(){const n=S.set.noise;if(n==='off')return S.x;if(S.cache.has(n))return S.cache.get(n);
  if(!window.veDenoise)return S.x;const y=await veDenoise(S.x,p=>status(`🔇 Removing background noise… ${p}%`),n==='strong');S.cache.set(n,y);return y}
async function build(){const k=key();if(S.editKey===k&&S.editUrl)return true;const job=++S.job;
  try{q('vfxUse').disabled=true;status('Getting it ready…');const c=await cleaned();if(job!==S.job)return false;
    status('🎛️ Adding the effect…');const y=finish(await render(c,S.set.fx,S.set.amount));if(job!==S.job)return false;
    if(S.editUrl)URL.revokeObjectURL(S.editUrl);S.editBlob=wav(y);S.editUrl=URL.createObjectURL(S.editBlob);S.editKey=k;status('Ready. Tap ▶ Edited to hear it.');return true}
  catch(e){console.error(e);status("Couldn't edit this recording on this device.");return false}finally{if(job===S.job)q('vfxUse').disabled=false}}
async function play(which){if(playing===which){stop();return}stop();
  if(which==='edit'&&!(await build()))return;audio.src=which==='orig'?S.origUrl:S.editUrl;audio.currentTime=0;
  try{await audio.play();playing=which;paint()}catch{status('Tap again to play.')}}

dlg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.n){S.set.noise=b.dataset.n;stop();paint();build()}
  else if(b.dataset.fx){S.set.fx=b.dataset.fx;if(!SPACE_FX.has(b.dataset.fx)&&S.set.amount<.3)S.set.amount=1;stop();paint();build()}});
q('vfxAmt').oninput=e=>{S.set.amount=+e.target.value/100;q('vfxAmtV').textContent=e.target.value+'%'};
q('vfxAmt').onchange=()=>{stop();build()};
q('vfxOrig').onclick=()=>play('orig');q('vfxEdit').onclick=()=>play('edit');
q('vfxReset').onclick=()=>{S.set={noise:'off',fx:'none',amount:1};stop();paint();build()};
const close=v=>{stop();const d=S.done;S.done=null;if(dlg.open)dlg.close();d?.(v)};
q('vfxCancel').onclick=()=>close(null);dlg.querySelector('.vfx-x').onclick=()=>close(null);
dlg.addEventListener('close',()=>{stop();if(S.done){const d=S.done;S.done=null;d(null)}});
q('vfxUse').onclick=async()=>{if(!(await build()))return;const plain=S.set.noise==='off'&&S.set.fx==='none';
  close({file:plain?S.file:new File([S.editBlob],(S.file.name||'voiceover').replace(/\.[^.]+$/,'')+' (edited).wav',{type:'audio/wav'}),settings:{...S.set},plain})};

window.veVoiceStudio=async function(file,settings){if(!file)return null;
  if(S.file!==file){S.file=file;S.x=null;S.cache.clear();S.editKey='';if(S.origUrl)URL.revokeObjectURL(S.origUrl);S.origUrl=URL.createObjectURL(file)}
  S.set={noise:'light',fx:'podcast',amount:1,...(settings||{})};paint();status('');
  if(!dlg.open)dlg.showModal();
  if(!S.x){status('Opening your recording…');try{S.x=await decode(file)}catch{status("Couldn't open this recording.");return new Promise(r=>{S.done=r})}}
  build();return new Promise(r=>{S.done=r})};
})();
