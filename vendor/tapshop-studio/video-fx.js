// Mastering presets ("sound styles"): an EQ (BiquadFilter nodes) into a compressor (DynamicsCompressor) into a make-up gain.
// They can go on each audio track or video layer (t.fx), on the main clips' sound together (veAudioFx.main), and on the whole
// video (veAudioFx.master). The same chain is built in the preview (veFxSync, live AudioContext) and in the export
// (veFxChain inside mixSound), so both sound the same. Order: source → its volume / fades / auto-duck → its style →
// whole-video style → safety limiter (veLimiter) → speakers / recorder / file.
// Make-up gain is measured, not guessed: each preset is played pink noise once (offline) and given the gain that brings it
// back to the same loudness as with no style, so switching styles changes the sound, not the volume. veAudioFx.bypass
// (the "Compare" switch) turns every style off at once.
(()=>{
const PRESETS={
  none:{name:'Off',about:'No processing.'},
  podcast:{name:'🎙️ Podcast voice',about:'Clear, close and even: rumble cut, a little less boom, more presence, steady level.',
    eq:[['highpass',90,0,.7],['lowshelf',220,-2.5],['peaking',3000,4,1],['highshelf',9500,2]],comp:{threshold:-26,knee:6,ratio:4,attack:.005,release:.16}},
  lofi:{name:'🌙 Warm lo-fi',about:'Soft and cozy: rolled-off top, warm low end, gentle slow squeeze.',
    eq:[['highpass',60,0,.7],['lowshelf',160,3],['peaking',2500,-2,.9],['highshelf',5000,-6],['lowpass',7500,0,.7]],comp:{threshold:-22,knee:10,ratio:3,attack:.02,release:.3}},
  promo:{name:'⚡ Punchy promo',about:'Loud and tight for ads: firm low end, less mud, bright attack.',
    eq:[['highpass',40,0,.7],['lowshelf',100,3],['peaking',400,-2.5,1],['peaking',4000,3,1],['highshelf',9000,2.5]],comp:{threshold:-20,knee:4,ratio:6,attack:.003,release:.08}},
  crisp:{name:'✨ Crisp clean',about:'Light and natural: rumble and mud out, a touch of air.',
    eq:[['highpass',80,0,.7],['peaking',300,-2,1],['highshelf',7000,3]],comp:{threshold:-20,knee:10,ratio:2.5,attack:.01,release:.2}}};
const IDS=Object.keys(PRESETS);
window.VE_FX_PRESETS=PRESETS;
window.veAudioFx=window.veAudioFx||{main:'none',master:'none',bypass:false};
const use=id=>!veAudioFx.bypass&&PRESETS[id]&&id!=='none'?id:'none';

// Build one preset's nodes from `input` to every node in `dests`. Returns the nodes made (to disconnect later).
function build(ctx,id,input,dests,makeup=true,raw=false){const P=PRESETS[raw?id:use(id)],nodes=[];let last=input;
  if(P.eq){for(const [type,f,g=0,q] of P.eq){const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;b.gain.value=g;if(q!=null)b.Q.value=q;last.connect(b);nodes.push(b);last=b}
    const c=ctx.createDynamicsCompressor(),o=P.comp;c.threshold.value=o.threshold;c.knee.value=o.knee;c.ratio.value=o.ratio;c.attack.value=o.attack;c.release.value=o.release;last.connect(c);nodes.push(c);last=c;
    if(makeup){const m=ctx.createGain();m.gain.value=P.makeup||1;last.connect(m);nodes.push(m);last=m}}
  for(const d of dests)last.connect(d);return nodes}
window.veFxChain=(ctx,id,input,dests)=>build(ctx,id,input,dests);

// Measure each preset's make-up gain: pink noise at a typical music/voice level (RMS 0.15, about −16 dBFS; compressors act
// differently at other levels) through the chain without make-up, against the same noise dry.
const LEVEL=.15;
let ready=null;window.veFxReady=function(){if(ready)return ready;ready=(async()=>{const SR=44100,len=SR*3,noise=new Float32Array(len);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;noise[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
  let s=0;for(let i=0;i<len;i++)s+=noise[i]*noise[i];const k=LEVEL/Math.sqrt(s/len);for(let i=0;i<len;i++)noise[i]*=k;
  const rms=async id=>{const oc=new OfflineAudioContext(1,len,SR),src=oc.createBufferSource(),buf=oc.createBuffer(1,len,SR);buf.copyToChannel(noise,0);src.buffer=buf;build(oc,id,src,[oc.destination],false,true);src.start();
    const d=(await oc.startRendering()).getChannelData(0);let q=0;for(let i=SR;i<len;i++)q+=d[i]*d[i];return Math.sqrt(q/(len-SR))};
  for(const id of IDS){if(id==='none')continue;try{const r=await rms(id);PRESETS[id].makeup=r>0?Math.max(.25,Math.min(4,LEVEL/r)):1}catch{PRESETS[id].makeup=1}}
  live.clear();veFxSync()})();return ready};

// Live preview: re-wire the editor's sound when a style changes. video.js connects main clips to veMainIn, tracks to
// veMasterIn and veMasterIn to the limiters; here those links get the chosen chain in between.
const live=new Map();// node → {key, nodes}
function wire(input,id,dests){if(!input)return;const key=use(id)+':'+(PRESETS[use(id)].makeup||1);const was=live.get(input);if(was&&was.key===key)return;
  try{input.disconnect()}catch{}if(was)for(const n of was.nodes){try{n.disconnect()}catch{}}live.set(input,{key,nodes:build(audioCtx,id,input,dests)})}
window.veFxSync=function(){if(typeof audioCtx==='undefined'||!audioCtx||!window.veMasterIn)return;
  wire(veMasterIn,veAudioFx.master,[veSpk,veRec]);wire(veMainIn,veAudioFx.main,[veMasterIn]);
  for(const t of extraTracks)if(t.gain)wire(t.gain,t.fx||'none',[veMasterIn])};
{const base=ensureAudio;ensureAudio=async function(){const r=await base.apply(this,arguments);veFxSync();return r}}
{const base=decorateStrips;decorateStrips=function(){const r=base.apply(this,arguments);try{veFxSync()}catch{}return r}}
veFxReady();

window.veFxOptions=sel=>IDS.map(id=>`<option value="${id}"${id===(sel||'none')?' selected':''}>${PRESETS[id].name}</option>`).join('');

// The 🎚️ Sound panel: a style for your clips' sound and for the whole video, and a Compare switch to hear them off.
function open(){let d=document.getElementById('fxDialog');if(!d){d=document.createElement('dialog');d.id='fxDialog';d.className='closable';document.body.appendChild(d)}
  const row=(k,label,help)=>`<label class="fx-row"><span><b>${label}</b><small>${help}</small></span><select data-k="${k}">${veFxOptions(veAudioFx[k])}</select></label><p class="fx-about" data-about="${k}">${PRESETS[veAudioFx[k]||'none'].about}</p>`;
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎚️ Sound</h2><p class="sub">Pro sound styles: EQ and gentle leveling, loudness-matched. They play in the preview and go into your saved video. Each music or audio track has its own style in its menu too.</p>
  ${row('main','Your clips','The sound of your video clips, like your voice.')}${row('master','Whole video','Everything together, last, before saving.')}
  <label class="fx-row fx-bypass"><span><b>Compare</b><small>Hear the video with every style off, then turn this back off.</small></span><input type="checkbox" role="switch" data-k="bypass" ${veAudioFx.bypass?'checked':''}></label>
  <div class="row"><button type="button" class="primary" data-close>Done</button></div>`;
  d.querySelector('.dialog-x').onclick=d.querySelector('[data-close]').onclick=()=>d.close();
  d.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{const k=el.dataset.k;veAudioFx[k]=el.type==='checkbox'?el.checked:el.value;const a=d.querySelector(`[data-about="${k}"]`);if(a)a.textContent=PRESETS[veAudioFx[k]].about;veFxSync();renderTracks();
    if(k==='bypass')toast(el.checked?'Comparing: all sound styles are off.':'Sound styles are back on.')});
  d.showModal()}
window.openSoundFx=open;
const bar=document.querySelector('.timebar');if(bar){const b=document.createElement('button');b.type='button';b.id='fxButton';b.textContent='🎚️ Sound';b.title='Sound styles: EQ and leveling for your clips and the whole video';b.onclick=open;bar.appendChild(b)}
const st=document.createElement('style');st.textContent=`#fxDialog{width:min(480px,94vw)}.fx-row{display:flex!important;flex-direction:row!important;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 4px}.fx-row span{flex:1;min-width:0}.fx-row b,.fx-row small{display:block}.fx-row small{opacity:.65;font-size:12px;font-weight:400}.fx-row select{width:auto;max-width:52%}.fx-about{margin:0 0 6px;font-size:12px;opacity:.8;color:#ff3ea5}.fx-bypass input{width:auto;accent-color:#ff3ea5;transform:scale(1.3)}`;document.head.appendChild(st);
})();
