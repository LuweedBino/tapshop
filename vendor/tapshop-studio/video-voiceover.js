// Voiceover recorder with a teleprompter (🎙️ Voiceover on the timeline bar).
// Opens empty from the bar, or with a script from the dashboard's AI Script Writer
// (tapshop:voiceover-script). Records the microphone, turns the take into a WAV (browser
// recordings often don't state their length, which loadTrackMedia refuses) and adds it as an
// audio track that never ducks: it is the voice the music ducks under. Each scene's on-screen
// text can go on the timeline at the moment that scene was actually read (S.marks).
(()=>{
const S={scenes:[],idx:0,marks:[],rec:null,stream:null,chunks:[],t0:0,timer:0,take:null,takeDur:0,url:'',discard:false};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
// Planned seconds for a scene: the script's own, else about 2.5 words a second.
const plan=s=>s.durationSeconds>0?s.durationSeconds:Math.max(2,s.voiceoverLine.split(/\s+/).length/2.5);

const css=document.createElement('style');
css.textContent=`#voDialog{width:min(640px,94vw);padding:14px 16px}
#voDialog[open]{display:flex;flex-direction:column;gap:8px;overflow:hidden;max-height:min(92vh,92dvh)}
.vo-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.vo-head h2{margin:0;font-size:20px}
.vo-x{flex:none;width:40px;height:40px;padding:0;border-radius:50%;font-size:22px;line-height:1}
.vo-head,.vo-set,#voTake,.vo-status,.vo-bar{flex:none}
.vo-prompter{height:min(46vh,380px);min-height:120px;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;padding:10px;border-radius:12px;background:#0b0b10;color:#fff;line-height:1.3}
.vo-line{padding:8px 12px;border-radius:10px;opacity:.45;transition:opacity .2s,background .2s;cursor:pointer}
.vo-line small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin-bottom:2px}
.vo-line p{margin:0;font-weight:600}
.vo-line.on{opacity:1;background:#ff5b8322;box-shadow:inset 3px 0 0 #ff5b83}
.vo-line.done{opacity:.3}
.vo-empty{font-size:15px!important;opacity:.75;margin:0}
.vo-set summary{cursor:pointer;font-size:14px;font-weight:600}
.vo-set summary span{font-weight:400;opacity:.7}
.vo-set-tip{display:block;margin:2px 0 0 18px;font-size:12px;font-weight:600;color:#ec4899}.vo-set[open] .vo-set-tip{display:none}
.vo-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin:8px 0 4px}
.vo-grid label{display:flex;flex-direction:column;gap:2px;font-size:13px}
.vo-grid input{width:100%}
.vo-check{display:flex!important;align-items:center;gap:8px;font-size:14px;margin:6px 0}
.vo-check input{width:20px;height:20px;flex:none}
#voSpeedWrap.off{opacity:.4}
#voEditWrap{margin-top:6px}
#voEdit{width:100%;margin:6px 0}
#voAudio{width:100%;height:40px}
.vo-status{margin:0;font-size:13px;min-height:1.2em;opacity:.8}
.vo-bar{display:flex;gap:8px}
.vo-bar button{flex:1 1 0;min-width:0;min-height:48px;font-size:16px;font-weight:700}
.vo-bar button[hidden]{display:none}
#voRec.vo-live{background:#e5484d;border-color:#e5484d;color:#fff;animation:voPulse 1.2s infinite}
@keyframes voPulse{50%{box-shadow:0 0 0 6px #e5484d33}}
@media (prefers-reduced-motion:reduce){#voRec.vo-live{animation:none}}
@media (max-width:700px),(pointer:coarse){
  #voDialog[open]{width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:100dvh;margin:0;inset:0;border-radius:0;border:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
  .vo-prompter{flex:1 1 auto;height:auto}
}`;
document.head.appendChild(css);

const dlg=document.createElement('dialog');dlg.id='voDialog';dlg.className='closable';dlg.setAttribute('aria-labelledby','voTitle');
// One screen on phones: the script scrolls, everything else stays put, and the buttons sit at the bottom.
dlg.innerHTML=`<div class="vo-head"><h2 id="voTitle">🎙️ Voiceover</h2><button type="button" class="vo-x" aria-label="Close" title="Close">×</button></div>
<div id="voPrompter" class="vo-prompter" aria-live="polite"></div>
<details id="voSet" class="vo-set"><summary>⚙️ Prompter settings <span id="voSetSum"></span><small class="vo-set-tip">👆 Tap here to change the speed and text size, move lines only when you tap Next scene, or edit the script.</small></summary>
<div class="vo-grid"><label>Text size<input id="voSize" type="range" min="18" max="48" value="28"></label>
<label id="voSpeedWrap">Speed: <b id="voSpeedV">1.0×</b><input id="voSpeed" type="range" min="0.5" max="2" step="0.1" value="1"></label></div>
<label class="vo-check"><input type="checkbox" id="voManual"> Only move when I tap Next scene</label>
<details id="voEditWrap"><summary>✏️ Edit script</summary><textarea id="voEdit" rows="5" placeholder="Type what you'll say, one line per scene"></textarea><button type="button" id="voApply">Use these lines</button></details></details>
<div id="voTake" hidden><audio id="voAudio" controls></audio>
<label class="vo-check" id="voTextWrap"><input type="checkbox" id="voText" checked> Put each scene's on-screen text on the timeline</label></div>
<p id="voStatus" class="vo-status" role="status"></p>
<div class="vo-bar"><button type="button" id="voNext" hidden>Next scene ▸</button><button type="button" class="primary" id="voRec">● Record</button><button type="button" id="voRetake" hidden>↺ Retake</button><button type="button" class="primary" id="voUse" hidden>✓ Add to timeline</button></div>`;
document.body.appendChild(dlg);
const q=id=>dlg.querySelector('#'+id);
const prompter=q('voPrompter'),recBtn=q('voRec'),nextBtn=q('voNext'),retakeBtn=q('voRetake'),useBtn=q('voUse'),audio=q('voAudio');
const status=s=>q('voStatus').textContent=s;
const speed=()=>+q('voSpeed').value||1;
const manual=()=>q('voManual').checked;
const PREFS='tapshop-vo-prefs';
try{const p=JSON.parse(localStorage.getItem(PREFS)||'{}');if(p.size)q('voSize').value=p.size;if(p.speed)q('voSpeed').value=p.speed;q('voManual').checked=!!p.manual}catch{}
function prefs(){q('voSpeedV').textContent=speed().toFixed(1)+'×';q('voSpeedWrap').classList.toggle('off',manual());q('voSpeed').disabled=manual();
  q('voSetSum').textContent='· '+(manual()?'tap Next to move':speed().toFixed(1)+'× speed');
  try{localStorage.setItem(PREFS,JSON.stringify({size:q('voSize').value,speed:q('voSpeed').value,manual:manual()}))}catch{}}
const small=()=>window.matchMedia('(max-width:700px),(pointer:coarse)').matches;
if(!small())q('voSet').open=true;

function paint(){
  if(!S.scenes.length)prompter.innerHTML='<p class="vo-empty">No script yet. Open ✏️ Edit script and type what you want to say, one line per scene, or make one with ✨ AI Script Writer above the Studio.</p>';
  else prompter.innerHTML=S.scenes.map((s,i)=>`<div class="vo-line${i===S.idx?' on':''}${i<S.idx?' done':''}" data-i="${i}"><small>${esc(s.sectionType||'Scene '+(i+1))}${s.durationSeconds?' · '+s.durationSeconds+'s':''}</small><p>${esc(s.voiceoverLine)}</p></div>`).join('');
  prompter.style.fontSize=q('voSize').value+'px';
  q('voTextWrap').hidden=!!S.onTake||!S.scenes.some(s=>s.onScreenText);
  const on=prompter.querySelector('.vo-line.on');
  if(on)prompter.scrollTo({top:Math.max(0,on.offsetTop-prompter.clientHeight/2+on.offsetHeight/2),behavior:'smooth'});
}
function setScenes(scenes){S.scenes=scenes;S.idx=0;S.marks=[];q('voEdit').value=scenes.map(s=>s.voiceoverLine).join('\n');paint()}

function clearTake(){if(S.url)URL.revokeObjectURL(S.url);S.url='';S.take=null;audio.removeAttribute('src');q('voTake').hidden=true;useBtn.hidden=retakeBtn.hidden=true;useBtn.disabled=false;recBtn.hidden=false}
function stopStream(){S.stream?.getTracks().forEach(t=>t.stop());S.stream=null}
function idle(){clearInterval(S.timer);recBtn.disabled=false;recBtn.textContent='● Record';recBtn.classList.remove('vo-live');nextBtn.hidden=true}

async function start(){
  if(typeof exporting!=='undefined'&&exporting)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status("This browser can't record sound. Try Chrome or Safari.");return}
  try{pause()}catch{}
  clearTake();S.discard=false;recBtn.disabled=true;
  try{S.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch{recBtn.disabled=false;status('Allow the microphone to record. Look for the 🔒 or microphone icon next to the web address.');return}
  S.idx=0;S.marks=[];if(small())q('voSet').open=false;paint();
  for(let n=3;n>0;n--){status('Starting in '+n+'…');await wait(1000);if(!S.stream||S.discard){idle();return}}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  S.chunks=[];
  try{S.rec=new MediaRecorder(S.stream,type?{mimeType:type}:undefined)}catch{stopStream();idle();status("Couldn't start recording on this device.");return}
  S.rec.ondataavailable=e=>{if(e.data.size)S.chunks.push(e.data)};
  S.rec.onstop=finish;
  S.rec.start(250);S.t0=performance.now();S.marks=[0];
  recBtn.disabled=false;recBtn.textContent='■ Stop';recBtn.classList.add('vo-live');nextBtn.hidden=S.scenes.length<2;
  S.timer=setInterval(()=>{const t=now();status('● Recording '+fmt(t));
    if(!manual()&&S.idx<S.scenes.length-1&&t-S.marks[S.idx]>=plan(S.scenes[S.idx])/speed())advance()},150);
}
const now=()=>(performance.now()-S.t0)/1000;
function advance(to){if(!S.rec||S.idx>=S.scenes.length-1)return;const i=to??S.idx+1;if(i<=S.idx)return;S.idx=i;S.marks[i]=now();paint()}
function stop(){clearInterval(S.timer);if(S.rec&&S.rec.state!=='inactive')S.rec.stop();stopStream()}

async function finish(){
  const rec=S.rec;S.rec=null;idle();
  if(S.discard)return;
  status('Getting your take ready…');
  try{
    const blob=new Blob(S.chunks,{type:rec?.mimeType||'audio/webm'});
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=await ctx.decodeAudioData(await blob.arrayBuffer());ctx.close?.();
    if(buf.duration<.3)throw Error('too short');
    S.takeDur=buf.duration;
    S.take=new File([wav(buf)],'TapShop voiceover.wav',{type:'audio/wav'});
    S.url=URL.createObjectURL(S.take);audio.src=S.url;
    q('voTake').hidden=false;recBtn.hidden=true;useBtn.hidden=retakeBtn.hidden=false;
    status(`Take ready (${S.takeDur<60?S.takeDur.toFixed(1)+' s':fmt(S.takeDur)}). Listen back, then add it or retake it.`);
  }catch{status("That take didn't catch any sound. Check your microphone and try again.")}
}

// Mono 16-bit WAV of a decoded take.
function wav(b){const n=b.length,ch=b.numberOfChannels,sr=b.sampleRate,v=new DataView(new ArrayBuffer(44+n*2));
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  const d=[];for(let c=0;c<ch;c++)d.push(b.getChannelData(c));
  for(let i=0;i<n;i++){let x=0;for(const c of d)x+=c[i];x=Math.max(-1,Math.min(1,x/ch));v.setInt16(44+i*2,x<0?x*0x8000:x*0x7fff,true)}
  return v.buffer}

async function use(){
  // Opened by another maker (Build My Video With AI): hand the take and the scene marks back instead of adding it here.
  if(S.onTake&&S.take){const cb=S.onTake;cb({file:S.take,marks:S.marks.slice(),dur:S.takeDur});S.take=null;dlg.close();return}
  if(!S.take||(typeof exporting!=='undefined'&&exporting))return;
  useBtn.disabled=true;status('Adding to your timeline…');
  const at=+playhead.toFixed(2);snapshot();
  addTrack('audio');const t=extraTracks.at(-1);
  // Set before loading, so loadTrackMedia keeps them: no fades, and no ducking under its own voice.
  Object.assign(t,{name:'🎙️ Voiceover',duck:false,fadeIn:0,fadeOut:0,voiceover:true,offset:at});targetTrack=t.id;
  // A voice has no steady beat; skip the tempo finder so it can't mistake one and drop the track from speech detection.
  const beat=window.veAutoBeat;window.veAutoBeat=null;
  try{await loadTrackMedia(S.take)}finally{window.veAutoBeat=beat}
  if(!t.media){try{undo()}catch{}useBtn.disabled=false;status("Couldn't add the take. Try again.");return}
  t.offset=at;
  let added=0;
  if(q('voText').checked&&!q('voTextWrap').hidden){
    const cv=document.getElementById('canvas'),W=cv.width,H=cv.height;
    S.scenes.forEach((s,i)=>{const text=String(s.onScreenText||'').trim(),st=S.marks[i];if(!text||st==null)return;
      const en=S.marks.slice(i+1).find(x=>x!=null)??S.takeDur;
      createGraphicTrack('text');const g=graphicTracks.at(-1);
      Object.assign(g,{name:(s.sectionType||'Scene')+': '+text.slice(0,18),text,color:'#ffffff',size:Math.round(.045*H*1280/W),x:50,y:20,bold:true,background:false,
        boxColor:'#000000',boxOpacity:.55,boxPad:22,boxRadius:16,offset:Math.round((at+st)*10)/10,length:Math.max(.8,Math.round((en-st)*10)/10)});added++});
    if(added)renderGraphicTracks();
  }
  renderTracks();await seekTimeline(at);
  clearTake();dlg.close();
  toast(`🎙️ Voiceover added${added?` with ${added} on-screen text ${added===1?'line':'lines'}`:''}. Drag it to move it.`);
}

recBtn.onclick=()=>S.rec?stop():start();
nextBtn.onclick=()=>advance();
retakeBtn.onclick=()=>{clearTake();S.idx=0;S.marks=[];paint();start()};
useBtn.onclick=use;
q('voSize').oninput=()=>{prefs();paint()};
q('voSpeed').oninput=prefs;
q('voManual').onchange=prefs;
prefs();
q('voApply').onclick=()=>{if(S.rec)return;const lines=q('voEdit').value.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,40);
  setScenes(lines.map((l,i)=>({...(S.scenes[i]||{sectionType:'Scene '+(i+1),durationSeconds:0,onScreenText:''}),voiceoverLine:l})));q('voEditWrap').open=false};
prompter.onclick=e=>{const el=e.target.closest('.vo-line');if(!el)return;const i=+el.dataset.i;if(S.rec)advance(i);else{S.idx=i;paint()}};
dlg.addEventListener('keydown',e=>{if(S.rec&&(e.key==='ArrowRight'||e.key==='ArrowDown')){e.preventDefault();advance()}});
dlg.querySelector('.vo-x').onclick=()=>dlg.close();
dlg.addEventListener('close',()=>{if(S.rec||S.stream){S.discard=true;stop()}clearTake();status('')});

// opts.onTake({file, marks, dur}): use the take elsewhere; the button then reads "Use this take".
window.veVoiceover=function(script,opts={}){
  if(typeof exporting!=='undefined'&&exporting)return;
  S.onTake=typeof opts.onTake==='function'?opts.onTake:null;useBtn.textContent=S.onTake?'✓ Use this take':'✓ Add to timeline';
  if(script)setScenes(script.scenes);else paint();
  if(!dlg.open)dlg.showModal();
  status(S.scenes.length?'Tap ● Record when you\'re ready. You get a 3-second countdown.':'');
};

// Timeline bar button, next to 🔊 Sound FX (video-toolbar.js sorts it into a section).
const bar=document.querySelector('.timebar');
if(bar){const b=document.createElement('button');b.type='button';b.id='voButton';b.textContent='🎙️ Voiceover';b.title='Record a voiceover with a teleprompter';b.onclick=()=>window.veVoiceover();
  const sfx=document.getElementById('sfxButton');sfx?sfx.after(b):bar.appendChild(b)}

// Dashboard → editor: tapshop:voiceover-script {text, scenes:[{sectionType, durationSeconds, voiceoverLine, onScreenText}]}.
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin)return;const m=e.data;
  if(!m||m.version!==1||m.type!=='tapshop:voiceover-script')return;
  let scenes=(Array.isArray(m.scenes)?m.scenes:[]).slice(0,40).map(s=>({sectionType:String(s?.sectionType||'').slice(0,30),durationSeconds:Math.min(120,Math.max(0,+s?.durationSeconds||0)),
    voiceoverLine:String(s?.voiceoverLine||'').trim().slice(0,600),onScreenText:String(s?.onScreenText||'').trim().slice(0,120)})).filter(s=>s.voiceoverLine);
  if(!scenes.length&&typeof m.text==='string')scenes=m.text.split(/\n\s*\n/).map(l=>l.trim()).filter(Boolean).slice(0,40).map((l,i)=>({sectionType:'Scene '+(i+1),durationSeconds:0,voiceoverLine:l.slice(0,600),onScreenText:''}));
  if(!scenes.length)return;
  // Show the editor behind the recorder, not the start screen.
  const st=document.getElementById('veStart');if(st&&!st.hidden){st.hidden=true;try{render();draw()}catch{}}
  window.veVoiceover({scenes})});
})();
