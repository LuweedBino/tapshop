// Sound effects: 12 short one-shot sounds made on the device (no audio files), for cuts, text pop-ups and ads.
// Each effect is a function (ctx, out, t) that builds its sound on any audio context (live or offline), starting at time t,
// and returns how long it lasts. Everything goes through a limiter (veLimiter in video.js) so nothing clips.
// TapSFX.play(key) plays one now, TapSFX.file(key) makes a WAV, TapSFX.add(key) puts it on the timeline at the playhead.
(()=>{
const bufs=new WeakMap();
// White and pink noise (pink = softer, fuller hiss, Paul Kellet's filter), 1 s each, made once per context.
const noise=(ctx,pink)=>{let m=bufs.get(ctx);if(!m)bufs.set(ctx,m={});const k=pink?'p':'w';if(m[k])return m[k];
  const SR=ctx.sampleRate,b=ctx.createBuffer(1,SR,SR),d=b.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<SR;i++){const w=Math.random()*2-1;if(!pink){d[i]=w;continue}
    b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
  return m[k]=b};
const env=(g,t,peak,att,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+att+dec)};
const pan=(ctx,v,to)=>{if(!ctx.createStereoPanner)return to;const p=ctx.createStereoPanner();p.pan.value=v;p.connect(to);return p};
const src=(ctx,t,d,pink)=>{const s=ctx.createBufferSource();s.buffer=noise(ctx,pink);s.loop=true;s.start(t,Math.random()*.5);s.stop(t+d+.02);return s};
const osc=(ctx,type,f,t,d)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+d+.02);return o};
const drive=(ctx,k,to)=>{const w=ctx.createWaveShaper(),c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}w.curve=c;w.connect(to);return w};
// A bell-ish tone: sine partials [ratio, level, decay].
const bell=(ctx,out,t,f,amp,parts)=>{for(const [r,v,dc] of parts){const o=osc(ctx,'sine',f*r,t,dc+.01),g=ctx.createGain();env(g,t,v*amp,.002,dc);o.connect(g);g.connect(out)}};

const FX={
  // 1. Pink noise through a band-pass that sweeps up fast, moving left to right, fading out smoothly.
  swoosh(ctx,out,t){const s=src(ctx,t,.5,true),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=pan(ctx,-.6,out);f.type='bandpass';f.Q.value=1.2;
    f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(7000,t+.42);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.14);g.gain.exponentialRampToValueAtTime(0.0001,t+.5);
    if(p.pan){p.pan.setValueAtTime(-.6,t);p.pan.linearRampToValueAtTime(.6,t+.45)}s.connect(f);f.connect(g);g.connect(p);return .5},
  // 2. Sine bending up from 200 to 600 Hz in 80 ms, dry.
  pop(ctx,out,t){const o=osc(ctx,'sine',200,t,.15),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(600,t+.08);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.75,t+.006);g.gain.setValueAtTime(.75,t+.05);g.gain.exponentialRampToValueAtTime(0.0001,t+.15);o.connect(g);g.connect(out);return .15},
  // 3. A metal "ka" then two bright FM bells, shimmering as they ring out.
  cash(ctx,out,t){const k=src(ctx,t,.04),kf=ctx.createBiquadFilter(),kg=ctx.createGain();kf.type='highpass';kf.frequency.value=3500;env(kg,t,.35,.001,.035);k.connect(kf);kf.connect(kg);kg.connect(out);
    const sh=ctx.createGain(),lfo=osc(ctx,'sine',11,t,.8),ld=ctx.createGain();sh.gain.value=.85;ld.gain.value=.15;lfo.connect(ld);ld.connect(sh.gain);sh.connect(out);
    [[2093,.05,-.3],[2637,.13,.3]].forEach(([f,dt,pn])=>{const u=t+dt,c=osc(ctx,'sine',f,u,.65),m=osc(ctx,'sine',f*1.41,u,.65),mg=ctx.createGain(),g=ctx.createGain();
      mg.gain.setValueAtTime(f*2.2,u);mg.gain.exponentialRampToValueAtTime(f*.15,u+.4);m.connect(mg);mg.connect(c.frequency);env(g,u,.32,.002,.62);c.connect(g);g.connect(pan(ctx,pn,sh));
      bell(ctx,pan(ctx,pn,sh),u,f,1,[[2.76,.06,.25],[5.4,.03,.12]])});return .8},
  // 4. Two very short bursts of crisp high-passed noise, 60 ms apart.
  shutter(ctx,out,t){[[0,5200,.8,.018],[.06,3600,.6,.03]].forEach(([dt,hp,v,d])=>{const u=t+dt,s=src(ctx,u,d+.01),f=ctx.createBiquadFilter(),b=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=hp;b.type='peaking';b.frequency.value=hp*1.3;b.gain.value=6;
    env(g,u,v,.0008,d);s.connect(f);f.connect(b);b.connect(g);g.connect(out)});return .2},
  // 5. A quick rising run of high bells with a ping-pong stereo echo.
  sparkle(ctx,out,t){const wet=ctx.createGain(),dl=ctx.createDelay(1),dr=ctx.createDelay(1),fb=ctx.createGain(),pl=pan(ctx,-.8,out),pr=pan(ctx,.8,out),fade=ctx.createGain();
    dl.delayTime.value=.09;dr.delayTime.value=.14;fb.gain.value=.38;wet.gain.value=.5;fade.gain.setValueAtTime(1,t);fade.gain.setValueAtTime(1,t+.75);fade.gain.linearRampToValueAtTime(0,t+1);
    wet.connect(dl);dl.connect(dr);dr.connect(fb);fb.connect(dl);dl.connect(fade);dr.connect(fade);fade.connect(pl);fade.connect(pr);
    [1047,1319,1568,1760,2093,2637,3136,3520].forEach((f,i)=>{const u=t+i*.045,g=ctx.createGain();g.gain.value=1;g.connect(out);g.connect(wet);bell(ctx,g,u,f,.55+i*.04,[[1,.22,.32],[2.76,.07,.14]])});return 1},
  // 6. A heavy sine diving from 120 to 35 Hz, lightly driven so phones can still hear it.
  drop(ctx,out,t){const o=osc(ctx,'sine',120,t,.9),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,2.2,lv);lv.gain.value=.85;lv.connect(out);o.frequency.exponentialRampToValueAtTime(35,t+.55);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.95,t+.008);g.gain.setValueAtTime(.95,t+.3);g.gain.exponentialRampToValueAtTime(0.0001,t+.9);o.connect(g);g.connect(w);
    const c=osc(ctx,'triangle',900,t,.03),cg=ctx.createGain();c.frequency.exponentialRampToValueAtTime(120,t+.025);env(cg,t,.35,.001,.025);c.connect(cg);cg.connect(out);return .9},
  // 7. A tiny dry wooden knock.
  click(ctx,out,t){const s=src(ctx,t,.03),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1700;f.Q.value=9;env(g,t,1.6,.0006,.025);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',1050,t,.05),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(820,t+.03);env(og,t,.35,.0008,.04);o.connect(og);og.connect(out);return .05},
  // 8. Two low buzzes, each two saws a little out of tune with each other.
  buzz(ctx,out,t){[0,.19].forEach(dt=>{const u=t+dt,f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.value=1400;f.Q.value=2;g.gain.setValueAtTime(0.0001,u);g.gain.exponentialRampToValueAtTime(.32,u+.008);g.gain.setValueAtTime(.32,u+.12);g.gain.exponentialRampToValueAtTime(0.0001,u+.15);
    f.connect(g);g.connect(out);for(const fr of [98,104])osc(ctx,'sawtooth',fr,u,.16).connect(f)});return .35},
  // 9. Two warm notes a major third apart, half marimba, half bell.
  ding(ctx,out,t){[[1047,0,-.15],[1319,.09,.15]].forEach(([f,dt,p])=>bell(ctx,pan(ctx,p,out),t+dt,f,1,[[1,.32,.5],[4,.06,.05],[2.76,.07,.28],[5.4,.02,.1]]));return .6},
  // 10. A synth tone and noise sweeping up faster and louder, then cut right at the end.
  riser(ctx,out,t){const d=1.2,o=osc(ctx,'sawtooth',180,t,d),o2=osc(ctx,'sawtooth',181.5,t,d),f=ctx.createBiquadFilter(),g=ctx.createGain(),n=src(ctx,t,d),nf=ctx.createBiquadFilter(),ng=ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(1500,t+d);o2.frequency.exponentialRampToValueAtTime(1512,t+d);f.type='lowpass';f.Q.value=4;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(7000,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+d-.02);g.gain.linearRampToValueAtTime(0,t+d);o.connect(f);o2.connect(f);f.connect(g);g.connect(out);
    nf.type='bandpass';nf.Q.value=1.4;nf.frequency.setValueAtTime(500,t);nf.frequency.exponentialRampToValueAtTime(9000,t+d);ng.gain.setValueAtTime(0.0001,t);ng.gain.exponentialRampToValueAtTime(.55,t+d-.02);ng.gain.linearRampToValueAtTime(0,t+d);n.connect(nf);nf.connect(ng);ng.connect(out);return d},
  // 11. A gritty record scratch: a quick push forward, then a long pull down.
  scratch(ctx,out,t){const o=osc(ctx,'sawtooth',300,t,.3),n=src(ctx,t,.3),nf=ctx.createBiquadFilter(),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,4,lv);lv.gain.value=.45;lv.connect(out);
    o.frequency.exponentialRampToValueAtTime(1300,t+.06);o.frequency.exponentialRampToValueAtTime(90,t+.28);nf.type='bandpass';nf.Q.value=3;nf.frequency.setValueAtTime(900,t);nf.frequency.exponentialRampToValueAtTime(3500,t+.06);nf.frequency.exponentialRampToValueAtTime(300,t+.28);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.8,t+.01);g.gain.setValueAtTime(.8,t+.2);g.gain.exponentialRampToValueAtTime(0.0001,t+.3);o.connect(g);n.connect(nf);nf.connect(g);g.connect(w);return .3},
  // 12. A short noise swoosh that lands on a tight thud.
  whoosh(ctx,out,t){const s=src(ctx,t,.22,true),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.Q.value=1;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(4500,t+.18);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.7,t+.17);g.gain.exponentialRampToValueAtTime(0.0001,t+.22);s.connect(f);f.connect(g);g.connect(out);
    const u=t+.17,o=osc(ctx,'sine',170,u,.23),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(55,u+.12);env(og,u,.9,.003,.2);o.connect(og);og.connect(out);
    const k=src(ctx,u,.03),kf=ctx.createBiquadFilter(),kg=ctx.createGain();kf.type='lowpass';kf.frequency.value=2500;env(kg,u,.35,.001,.025);k.connect(kf);kf.connect(kg);kg.connect(out);return .4}};

const LIST=[['swoosh','💨','Swoosh','B-roll cuts and swipes'],['pop','🫧','Bubble pop','captions and stickers popping in'],['cash','💰','Cha-ching','price drops and deals'],
  ['shutter','📸','Camera shutter','product snapshots'],['sparkle','✨','Magic sparkle','glow-ups and “after” reveals'],['drop','💥','Bass drop','big hook moments'],
  ['click','👆','Button tap','“Link in bio” and “Shop now” taps'],['buzz','❌','Error buzz','“Don’t buy this…” moments'],['ding','✅','Success ding','pro tips and fixed problems'],
  ['riser','📈','Riser','building up right into a cut'],['scratch','💿','Record scratch','“Wait a minute…” freeze frames'],['whoosh','👊','Whoosh hit','fast, snappy TikTok cuts']];

const wav=buf=>{const ch=buf.numberOfChannels,n=buf.length,v=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
  const d=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(o,x<0?x*0x8000:x*0x7fff,true);o+=2}return v.buffer};

// Level for each effect, so they all land about as loud as each other (the limiter catches anything over).
const LEVEL={swoosh:5.5,pop:1.2,cash:2.1,shutter:1,sparkle:2,drop:1,click:13,buzz:1.2,ding:2,riser:1.15,scratch:1.6,whoosh:.95};
const leveled=(ctx,out,key)=>{const g=ctx.createGain();g.gain.value=LEVEL[key]||1;g.connect(out);return g};
let live=null,liveOut=null;
window.TapSFX={list:LIST,fx:FX,
  // Play one now: on the editor's own sound (through its limiter) when it's running, else on a small context of our own.
  play(key){const f=FX[key];if(!f)return;let ctx,out;
    if(typeof audioCtx!=='undefined'&&audioCtx&&veSpk){ctx=audioCtx;out=veSpk}else{live=live||new (window.AudioContext||window.webkitAudioContext)();liveOut=liveOut||veLimiter(live,live.destination);ctx=live;out=liveOut}
    ctx.resume?.();return f(ctx,leveled(ctx,out,key),ctx.currentTime+.02)},
  async render(key){const f=FX[key],SR=44100,oc=new OfflineAudioContext(2,Math.ceil(1.6*SR),SR),d=f(oc,leveled(oc,veLimiter(oc,oc.destination),key),0);const b=await oc.startRendering(),n=Math.ceil(Math.max(d+.03,.15)*SR),o=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:SR});
    for(let c=0;c<2;c++)o.copyToChannel(b.getChannelData(c).subarray(0,n),c);return o},
  async file(key){const it=LIST.find(x=>x[0]===key);return new File([wav(await this.render(key))],`TapShop sound · ${it?it[2]:key}.wav`,{type:'audio/wav'})},
  // Put one on the timeline (at the playhead unless o.at), on a "Sound effects" row (all effects share it when they don't overlap). Undo-able.
  // o.forId ties it to a strip: it then starts when that strip starts (plus o.rel seconds) and goes away with it.
  async add(key,o={}){if(exporting)return;const it=LIST.find(x=>x[0]===key);if(!it)return;const at=+(o.at??playhead).toFixed(2);if(!o.noSnap)snapshot();addTrack('audio');const t=extraTracks.at(-1);
    Object.assign(t,{name:it[1]+' '+it[2],lane:'sfx',offset:at},o.forId?{sfxFor:o.forId,sfxKey:key,sfxAt:+(o.rel||0).toFixed(2)}:{});targetTrack=t.id;await loadTrackMedia(await this.file(key));
    if(!t.media){if(o.noSnap)deleteTrack(t.id);else undo();return false}t.offset=at;renderTracks();await seekTimeline(playhead);window.recordRecent?.('sfx-'+key);if(!o.quiet)toast(`${it[2]} added at ${at.toFixed(1)} s. Drag it to move it.`);return true}};

// ---- A sound effect on a text box or sticker: a "🔊 Sound effect" menu in its editing menu (timeline and preview pop-up).
// The sound is its own audio track (sfxFor = the strip's id, sfxKey = which sound) that always starts with the strip.
const linked=id=>extraTracks.filter(t=>t.sfxFor===id);
const canSfx=t=>t&&(t.type==='text'||t.type==='shape');
window.veSfxPick=async function(id,key){if(exporting)return;const g=graphicTracks.find(x=>x.id===id);if(!g)return;pause();snapshot();
  for(const t of linked(id))deleteTrack(t.id);
  if(key){const ok=await TapSFX.add(key,{at:g.offset,forId:id,noSnap:1,quiet:1});const it=LIST.find(x=>x[0]===key);if(ok!==false)toast(`${it[2]} plays when “${(g.text||g.name||'this').toString().slice(0,24)}” appears.`)}
  else{renderTracks();toast('Sound effect removed.')}
  expandedStrip=id;renderGraphicTracks()};
// Keep each tied sound at its strip's start; drop it when the strip is gone. Runs before every redraw of the strips.
let syncing=false;const syncLinks=()=>{if(syncing)return false;syncing=true;try{let gone=extraTracks.filter(t=>t.sfxFor&&!graphicTracks.some(g=>g.id===t.sfxFor));
  for(const t of extraTracks)if(t.sfxFor){const g=graphicTracks.find(g=>g.id===t.sfxFor);const want=+(g?g.offset+(t.sfxAt||0):0).toFixed(3);if(g&&Math.abs(t.offset-want)>1e-3)t.offset=want}
  if(gone.length){for(const t of gone)deleteTrack(t.id);return true}return false}finally{syncing=false}};
{const base=decorateStrips;decorateStrips=function(){if(syncLinks())return;base()}}
const sfxMenu=g=>{const cur=linked(g.id).find(t=>!t.sfxAt)?.sfxKey||'';return `<div class="sfx-pick"><label>🔊 Sound effect<select onchange="veSfxPick('${g.id}',this.value)"><option value="">None</option>${LIST.map(([k,e,n])=>`<option value="${k}"${k===cur?' selected':''}>${e} ${n}</option>`).join('')}</select></label><button type="button" onclick="const v=this.previousElementSibling.querySelector('select').value;v?TapSFX.play(v):toast('Pick a sound first.')" aria-label="Listen to the sound effect">▶</button><small>Plays when it appears and moves with it.</small></div>`};
{const base=renderGraphicTracks;renderGraphicTracks=function(){base();for(const g of graphicTracks){if(!canSfx(g))continue;const box=document.querySelector(`#graphicTracks .strip-row[data-trackid="${g.id}"] .strip-options`);
  if(!box||box.querySelector('.sfx-pick'))continue;box.insertAdjacentHTML('afterbegin',sfxMenu(g))}}}

// The 🔊 Sound FX button (after 🎵 Audio on the timeline bar) and its list.
const open=()=>{if(exporting)return;pause();let d=document.getElementById('sfxDialog');
  if(!d){d=document.createElement('dialog');d.id='sfxDialog';d.className='closable';document.body.appendChild(d)}
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🔊 Sound effects</h2><p class="sub">Made on your device, free to use anywhere. Press ▶ to hear one, then <b>Add</b> to drop it at the playhead (${playhead.toFixed(1)} s).</p>
  <div class="sfx-list">${LIST.map(([k,e,n,u])=>`<div class="sfx-row"><button type="button" class="sfx-play" data-p="${k}" aria-label="Listen to ${n}">▶</button><span><b>${e} ${n}</b><small>${u}</small></span><button type="button" class="primary" data-a="${k}">Add</button></div>`).join('')}</div>`;
  d.querySelector('.dialog-x').onclick=()=>d.close();
  d.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{try{TapSFX.play(b.dataset.p)}catch(e){toast('Couldn’t play it here.')}});
  d.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{d.querySelectorAll('button').forEach(x=>x.disabled=true);try{if(await TapSFX.add(b.dataset.a)!==false)d.close()}catch(e){toast('Couldn’t add it: '+(e.message||e))}finally{d.querySelectorAll('button').forEach(x=>x.disabled=false)}});
  d.showModal()};
window.openSoundFX=open;
const bar=document.querySelector('.timebar'),audio=bar&&[...bar.querySelectorAll('button')].find(b=>/Audio/.test(b.textContent));
if(bar){const b=document.createElement('button');b.type='button';b.id='sfxButton';b.textContent='🔊 Sound FX';b.title='Add a sound effect at the playhead';b.onclick=open;audio?audio.after(b):bar.appendChild(b)}
const st=document.createElement('style');st.textContent=`#sfxDialog{width:min(520px,94vw)}.sfx-list{display:flex;flex-direction:column;gap:6px;max-height:min(62vh,560px);overflow:auto;margin:10px 0}
.sfx-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid var(--ts-border,#8884);border-radius:12px}.sfx-row span{flex:1;min-width:0}.sfx-row b,.sfx-row small{display:block}.sfx-row small{opacity:.65;font-size:12px}
.sfx-pick{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 8px;margin:0 0 10px;padding:8px;border:1px dashed #ff3ea566;border-radius:10px}.sfx-pick label{flex:1;min-width:170px}.sfx-pick select{width:100%}.sfx-pick button{width:40px;height:36px;padding:0!important;flex:none}.sfx-pick small{flex-basis:100%;opacity:.65;font-size:11px}
.sfx-play{width:40px;height:40px;padding:0!important;border-radius:50%!important;flex:none}`;document.head.appendChild(st);
})();

// ---- AUDIO_LIBRARY: every free sound in one list with its details, for menus, search and the makers.
// Music is made on the device to any length (durationSeconds is the default length play() uses); sound effects have a fixed length.
// play(seconds) starts it and returns {stop()}. Batch 1 (Lifestyle, Home, Fashion & Beauty) has full hand-written details.
(()=>{
const META={
  desk:['Fashion & Beauty',['soft','airy','aesthetic'],['clean girl routine','desk setup','stationery haul'],['clean girl','aesthetic','desk','rhodes','bells','minimal'],'A♭ Lydian'],
  rainy:['Home',['cozy','calm','dreamy'],['self-care night','rainy day vlog','candle and skincare'],['cozy','rain','self care','felt piano','lofi','night'],'E Aeolian'],
  kitchen:['Home',['playful','bouncy','upbeat'],['kitchen gadget demo','quick recipe','meal prep'],['kitchen','recipe','gadget','kalimba','snaps','food'],'D Mixolydian'],
  tidy:['Home',['satisfying','steady','focused'],['home organization','fridge restock','ASMR containers'],['restock','organize','asmr','marimba','satisfying','tidy'],'F♯ Dorian'],
  pet:['Lifestyle',['cute','whimsical','light'],['pet products','dog or cat moment','pet hauls'],['pet','dog','cat','cute','pizzicato','funny'],'C Ionian'],
  toy:['Lifestyle',['cheerful','innocent','bright'],['parenting hack','kid-friendly toy ad','family moments'],['kids','toy','parenting','glockenspiel','happy','family'],'E Ionian'],
  coffee:['Lifestyle',['smooth','laid-back','warm'],['coffee bar','aesthetic drink pour','café vlog'],['coffee','latte','neo soul','rhodes','chill','drink'],'E♭ Dorian'],
  plant:['Home',['organic','breezy','peaceful'],['plant care','gardening','patio makeover'],['plants','garden','patio','acoustic','harmonics','outdoor'],'A Mixolydian'],
  scrub:['Home',['energetic','bubbly','motivating'],['cleaning hack','deep scrub timelapse','sped-up chores'],['cleaning','scrub','timelapse','plucks','fast','motivation'],'C♯ Aeolian'],
  apartment:['Home',['modern','spacious','calm'],['apartment tour','room tour','minimalist home'],['apartment','room tour','minimal','ambient','architecture','delay'],'B Lydian'],
  sneaker:['Fashion & Beauty',['confident','gritty','cool'],['sneaker drop','streetwear haul','outfit check'],['sneakers','streetwear','hip hop','808','trap hats','drop'],'G♯ Phrygian'],
  thrift:['Fashion & Beauty',['quirky','creative','fun'],['thrift flip','DIY upcycle','sewing project'],['thrift','diy','upcycle','indie pop','bassline','vintage'],'B♭ Ionian'],
  jewelry:['Fashion & Beauty',['luxurious','delicate','glowing'],['jewelry close-up','watch reveal','unboxing a gift'],['jewelry','watch','luxury','chimes','drone','sparkle'],'F♯ Lydian'],
  grwm:['Fashion & Beauty',['glamorous','upbeat','stylish'],['get ready with me','night out','makeup routine'],['grwm','night out','house','makeup','party','dance'],'C Aeolian'],
  silk:['Fashion & Beauty',['silky','lush','elegant'],['haircare','slow-mo hair flip','blowout results'],['hair','haircare','slow motion','strings','lush','beauty'],'D Ionian'],
  dupes:['Fashion & Beauty',['clever','curious','playful'],['dupe vs high-end','side-by-side comparison','price check'],['dupe','comparison','versus','call and response','plucks','fashion'],'G Dorian',2],
  capsule:['Fashion & Beauty',['breezy','optimistic','fresh'],['capsule wardrobe','packing for a trip','outfit planning'],['capsule','packing','travel','acoustic','strum','wardrobe'],'F Lydian',2],
  perfume:['Fashion & Beauty',['dark','seductive','mysterious'],['fragrance review','perfume editorial','scent unboxing'],['perfume','fragrance','editorial','chimes','dark','luxury'],'C♯ Phrygian',2],
  athleisure:['Fashion & Beauty',['confident','modern','driving'],['activewear try-on','athleisure haul','gym outfit'],['activewear','athleisure','gym','synth bass','try on','fitness'],'E Dorian',2],
  shades:['Fashion & Beauty',['sunny','relaxed','retro'],['sunglasses','summer vacation','beach day'],['sunglasses','summer','vacation','retro','coastal','tape'],'A♭ Mixolydian',2],
  rgb:['Tech & Gaming',['futuristic','energetic','neon'],['desk gaming setup','RGB showcase','PC build'],['gaming','rgb','cyberpunk','arpeggio','setup','pc'],'B Aeolian',2],
  saas:['Tech & Gaming',['clean','smart','focused'],['AI tool walkthrough','SaaS app demo','screen recording'],['ai','saas','app','marimba','walkthrough','software'],'A Ionian',2],
  notion:['Productivity',['calm','focused','soft'],['Notion template tour','study with me','planner setup'],['notion','productivity','study','lofi','template','focus'],'D♭ Ionian',2],
  droptest:['Tech & Gaming',['tense','building','punchy'],['phone case drop test','EDC drop','durability test'],['drop test','phone case','edc','impact','build up','tension'],'D Aeolian',2],
  smarthome:['Tech & Gaming',['sleek','futuristic','precise'],['smart home','home automation','gadget tour'],['smart home','automation','sci-fi','glass','robotic','gadget'],'F♯ Aeolian',2],
  wfh:['Productivity',['uplifting','confident','modern'],['work from home gear','remote job setup','desk upgrade'],['wfh','remote work','office','corporate','indie','plucks'],'C Ionian',2],
  filmmaker:['Tech & Gaming',['cinematic','moody','dramatic'],['camera gear','filmmaking b-roll','lens review'],['camera','filmmaking','cinematic','b-roll','swells','moody'],'A Aeolian',2],
  subbox:['Tech & Gaming',['curious','building','upbeat'],['app unboxing','subscription box reveal','first look'],['subscription box','unboxing','reveal','marimba','layers','app'],'E♭ Ionian',2],
  hustle:['Productivity',['smooth','confident','smart'],['side hustle tip','passive income','money advice'],['side hustle','money','passive income','groove','bassline','business'],'B♭ Dorian',2],
  scam:['Tech & Gaming',['urgent','nervous','tense'],['scam warning hook','cybersecurity tip','do not buy'],['scam','warning','security','pulse','ticking','alert'],'F Phrygian',2],
  deinfluence:['Sales & Reviews',['serious','dry','honest'],['brutally honest review','de-influencing','don’t buy this'],['honest','review','de-influencing','bass pluck','dry','real talk'],'G Aeolian',3],
  viral:['Sales & Reviews',['skeptical','quirky','curious'],['viral product reality check','does it work','TikTok made me buy it'],['viral','reality check','skeptical','quirky','pitch bend','test'],'C♯ Dorian',3],
  giftguide:['Sales & Reviews',['festive','sparkling','upbeat'],['holiday gift guide','Black Friday haul','Christmas deals'],['holiday','gift guide','black friday','bells','christmas','sale'],'F Ionian',3],
  smallbiz:['Storytelling',['heartwarming','hopeful','proud'],['small business','packing orders','behind the scenes'],['small business','packing orders','bts','acoustic','hopeful','shop'],'A Ionian',3],
  testimonial:['Sales & Reviews',['sincere','warm','reassuring'],['customer testimonial','5-star review','before you buy'],['testimonial','5 star','review','piano','trust','customer'],'E♭ Ionian',3],
  travel:['Lifestyle',['adventurous','exciting','airy'],['travel essentials','airport hack','carry-on packing'],['travel','airport','essentials','plucks','adventure','trip'],'B Mixolydian',3],
  car:['Tech & Gaming',['powerful','sleek','gritty'],['car detailing','auto accessories','car cleaning'],['car','detailing','auto','808','metallic','garage'],'E♭ harmonic minor',3],
  booktok:['Storytelling',['dreamy','nostalgic','cozy'],['BookTok','Kindle setup','cozy reading'],['booktok','kindle','reading','music box','cozy','books'],'G Lydian',3],
  mistakes:['Storytelling',['authoritative','sharp','brisk'],['myth-busting','3 mistakes you’re making','tips list'],['mistakes','myth','tips','staccato','strings','facts'],'E harmonic minor',3],
  finale:['Sales & Reviews',['uplifting','resolving','confident'],['link in bio call-to-action','video ending','shop now outro'],['link in bio','cta','ending','outro','finale','shop now'],'C Ionian (ends on C)',3]};
const LEN={swoosh:.5,pop:.15,cash:.8,shutter:.2,sparkle:1,drop:.9,click:.05,buzz:.35,ding:.6,riser:1.2,scratch:.3,whoosh:.4};
// Moods and uses for the styles that came before the batches (so search and filters can find them too).
const OLD={bright:[['happy','upbeat','pop'],['product demo','everyday vlog']],upbeat:[['upbeat','energetic','dance'],['hauls','fast edits']],chill:[['chill','calm','lofi'],['vlogs','aesthetic b-roll']],
  trap:[['hype','bold','urban'],['streetwear','hype edits']],rnb:[['smooth','warm','sensual'],['beauty','night routine']],acoustic:[['happy','warm','organic'],['lifestyle','family']],
  tropical:[['sunny','breezy','happy'],['travel','summer']],inspire:[['uplifting','hopeful','motivating'],['brand story','business']],epic:[['epic','dramatic','cinematic'],['big reveals','trailers']],
  dreamy:[['dreamy','soft','calm'],['beauty','slow-mo']],funk:[['funky','groovy','playful'],['fashion','dance']],synthwave:[['retro','neon','driving'],['tech','night drive']],
  boombap:[['nostalgic','laid-back','urban'],['storytelling','vlogs']],afro:[['joyful','groovy','warm'],['fashion','dance']],reggaeton:[['sexy','bouncy','party'],['fashion','summer']],
  dnb:[['fast','energetic','intense'],['sports','action']],futurebass:[['euphoric','bright','energetic'],['unboxing','reveals']],jazz:[['classy','smooth','warm'],['food','café']],
  hype:[['hype','aggressive','powerful'],['sales','sports']],playful:[['playful','silly','fun'],['funny clips','pets']],dark:[['dark','suspense','tense'],['mystery','horror']],
  holiday:[['festive','cheerful','cozy'],['holidays','gifts']],piano:[['emotional','gentle','calm'],['story','heartfelt']],guitar:[['warm','cozy','relaxed'],['outdoors','campfire']],
  bossa:[['smooth','sunny','relaxed'],['café','travel']],gospel:[['uplifting','soulful','warm'],['testimonials','inspiration']],kids:[['cheerful','silly','bright'],['kids','toys']],
  workout:[['energetic','driving','pumped'],['gym','fitness']],hook:[['urgent','punchy','attention-grabbing'],['hook','2-second hook']],unbox:[['cozy','warm','lofi'],['unboxing','morning routine']],
  tech:[['clean','focused','modern'],['tech review','gadgets']],flash:[['urgent','fast','exciting'],['flash sale','limited time']],luxe:[['luxurious','calm','elegant'],['skincare','luxury']],
  reveal:[['dramatic','uplifting','transforming'],['before and after','glow-up']],haul:[['playful','bouncy','upbeat'],['haul','try-on']],story:[['honest','warm','calm'],['storytime','real talk']],
  fitness:[['powerful','motivating','energetic'],['fitness','supplements']],tutorial:[['friendly','light','steady'],['tutorial','how-to']]};
let cur=null;const stop=()=>{try{cur?.pause()}catch{}cur=null};
const music=k=>{const m=veMoods[k],x=META[k],g=(window.veMusicGroups?veMusicGroups():[]).find(([,ks])=>ks.includes(k));
  return {id:k,title:m.name,type:'music',category:x?x[0]:g&&/creators/.test(g[0])?'Creators':'General',moods:x?x[1]:OLD[k]?OLD[k][0]:[],useCases:x?x[2]:[...new Set([...(m.for?m.for.split(/,\s*/):[]),...(OLD[k]?OLD[k][1]:[])])],
    keywords:x?x[3]:m.name.toLowerCase().split(/\W+/).filter(Boolean),bpm:m.bpm,mode:x?x[4]:undefined,batch:x?(x[5]||1):undefined,durationSeconds:30,anyLength:true,voiceoverSafe:!!(m.fx&&m.fx.mid),
    async play(seconds=10){stop();const a=new Audio(URL.createObjectURL(await veMakeBeat(seconds,k)));cur=a;await a.play();return {stop}},
    file(seconds=30){return veMakeBeat(seconds,k)}}};
const fx=([k,e,n,u])=>({id:'sfx-'+k,key:k,title:e+' '+n,type:'sfx',category:'Sound effects',moods:[],useCases:[u],keywords:[k,n.toLowerCase()],bpm:null,durationSeconds:LEN[k],voiceoverSafe:true,
  play(){TapSFX.play(k);return {stop(){}}},file(){return TapSFX.file(k)}});
const build=()=>window.veMoods?[...(window.veMusicGroups?veMusicGroups().flatMap(([,ks])=>ks):Object.keys(veMoods)).filter(k=>veMoods[k]).map(music),...TapSFX.list.map(fx)]:[];
window.AUDIO_LIBRARY=build();
// Search by words (title, moods, use cases, keywords): AUDIO_LIBRARY_SEARCH('cozy coffee').
window.AUDIO_LIBRARY_SEARCH=q=>{const w=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);return AUDIO_LIBRARY.map(t=>[t,w.filter(x=>[t.title,t.category,...t.moods,...t.useCases,...t.keywords].join(' ').toLowerCase().includes(x)).length]).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]).map(([t])=>t)};
})();
