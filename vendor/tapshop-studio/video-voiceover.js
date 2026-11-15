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
css.textContent=`#voDialog{width:min(640px,94vw)}
.vo-prompter{position:relative;max-height:min(46vh,380px);overflow:auto;padding:12px;border-radius:12px;background:#0b0b10;color:#fff;line-height:1.35;margin:10px 0}
.vo-line{padding:10px 12px;border-radius:10px;opacity:.45;transition:opacity .2s,background .2s;cursor:pointer}
.vo-line small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin-bottom:2px}
.vo-line p{margin:0;font-weight:600}
.vo-line.on{opacity:1;background:#ff5b8322;box-shadow:inset 3px 0 0 #ff5b83}
.vo-line.done{opacity:.3}
.vo-empty{font-size:15px!important;opacity:.75;margin:0}
#voEdit{width:100%;margin:6px 0}
#voDialog .vo-opts{flex-wrap:wrap;gap:6px 14px;align-items:center}
.vo-check{display:flex!important;align-items:center;gap:6px}
#voDialog .vo-btns{flex-wrap:wrap;gap:8px}
#voRec.vo-live{background:#e5484d;border-color:#e5484d;color:#fff;animation:voPulse 1.2s infinite}
@keyframes voPulse{50%{box-shadow:0 0 0 6px #e5484d33}}
@media (prefers-reduced-motion:reduce){#voRec.vo-live{animation:none}}
#voAudio{width:100%}`;
document.head.appendChild(css);

const dlg=document.createElement('dialog');dlg.id='voDialog';dlg.className='closable';dlg.setAttribute('aria-labelledby','voTitle');
dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button>
<h2 id="voTitle">🎙️ Voiceover</h2>
<p class="sub">Read the highlighted line out loud. It moves on by itself, or tap <b>Next scene</b> (→ key on a keyboard).</p>
<div id="voPrompter" class="vo-prompter" aria-live="polite"></div>
<details id="voEditWrap"><summary>✏️ Edit script</summary><textarea id="voEdit" rows="6" placeholder="Type what you'll say, one line per scene"></textarea><button type="button" id="voApply">Use these lines</button></details>
<div class="row vo-opts"><label>Text size <input id="voSize" type="range" min="18" max="44" value="28"></label>
<label class="vo-check"><input type="checkbox" id="voAuto" checked> Move to the next line by itself</label>
<label class="vo-check" id="voTextWrap"><input type="checkbox" id="voText" checked> Put each scene's on-screen text on the timeline</label></div>
<div id="voTake" hidden><audio id="voAudio" controls></audio></div>
<p id="voStatus" class="sub" role="status"></p>
<div class="row vo-btns"><button type="button" id="voNext" hidden>Next scene ▸</button><button type="button" class="primary" id="voRec">● Start recording</button><button type="button" id="voRetake" hidden>↺ Retake</button><button type="button" class="primary" id="voUse" hidden>✓ Add to timeline</button></div>`;
document.body.appendChild(dlg);
const q=id=>dlg.querySelector('#'+id);
const prompter=q('voPrompter'),recBtn=q('voRec'),nextBtn=q('voNext'),retakeBtn=q('voRetake'),useBtn=q('voUse'),audio=q('voAudio');
const status=s=>q('voStatus').textContent=s;

function paint(){
  if(!S.scenes.length)prompter.innerHTML='<p class="vo-empty">No script yet. Open ✏️ Edit script and type what you want to say, one line per scene, or make one with ✨ AI Script Writer above the Studio.</p>';
  else prompter.innerHTML=S.scenes.map((s,i)=>`<div class="vo-line${i===S.idx?' on':''}${i<S.idx?' done':''}" data-i="${i}"><small>${esc(s.sectionType||'Scene '+(i+1))}${s.durationSeconds?' · '+s.durationSeconds+'s':''}</small><p>${esc(s.voiceoverLine)}</p></div>`).join('');
  prompter.style.fontSize=q('voSize').value+'px';
  q('voTextWrap').hidden=!S.scenes.some(s=>s.onScreenText);
  const on=prompter.querySelector('.vo-line.on');
  if(on)prompter.scrollTo({top:Math.max(0,on.offsetTop-prompter.clientHeight/2+on.offsetHeight/2),behavior:'smooth'});
}
function setScenes(scenes){S.scenes=scenes;S.idx=0;S.marks=[];q('voEdit').value=scenes.map(s=>s.voiceoverLine).join('\n');paint()}

function clearTake(){if(S.url)URL.revokeObjectURL(S.url);S.url='';S.take=null;audio.removeAttribute('src');q('voTake').hidden=true;useBtn.hidden=retakeBtn.hidden=true;useBtn.disabled=false;recBtn.hidden=false}
function stopStream(){S.stream?.getTracks().forEach(t=>t.stop());S.stream=null}
function idle(){clearInterval(S.timer);recBtn.disabled=false;recBtn.textContent='● Start recording';recBtn.classList.remove('vo-live');nextBtn.hidden=true}

async function start(){
  if(typeof exporting!=='undefined'&&exporting)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status("This browser can't record sound. Try Chrome or Safari.");return}
  try{pause()}catch{}
  clearTake();S.discard=false;recBtn.disabled=true;
  try{S.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch{recBtn.disabled=false;status('Allow the microphone to record. Look for the 🔒 or microphone icon next to the web address.');return}
  S.idx=0;S.marks=[];paint();
  for(let n=3;n>0;n--){status('Starting in '+n+'…');await wait(1000);if(!S.stream||S.discard){idle();return}}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  S.chunks=[];
  try{S.rec=new MediaRecorder(S.stream,type?{mimeType:type}:undefined)}catch{stopStream();idle();status("Couldn't start recording on this device.");return}
  S.rec.ondataavailable=e=>{if(e.data.size)S.chunks.push(e.data)};
  S.rec.onstop=finish;
  S.rec.start(250);S.t0=performance.now();S.marks=[0];
  recBtn.disabled=false;recBtn.textContent='■ Stop';recBtn.classList.add('vo-live');nextBtn.hidden=S.scenes.length<2;
  S.timer=setInterval(()=>{const t=now();status('● Recording '+fmt(t));
    if(q('voAuto').checked&&S.idx<S.scenes.length-1&&t-S.marks[S.idx]>=plan(S.scenes[S.idx]))advance()},150);
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
    status(`Take ready (${fmt(S.takeDur)}). Listen back, then add it or retake it.`);
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
q('voSize').oninput=paint;
q('voApply').onclick=()=>{if(S.rec)return;const lines=q('voEdit').value.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,40);
  setScenes(lines.map((l,i)=>({...(S.scenes[i]||{sectionType:'Scene '+(i+1),durationSeconds:0,onScreenText:''}),voiceoverLine:l})));q('voEditWrap').open=false};
prompter.onclick=e=>{const el=e.target.closest('.vo-line');if(!el)return;const i=+el.dataset.i;if(S.rec)advance(i);else{S.idx=i;paint()}};
dlg.addEventListener('keydown',e=>{if(S.rec&&(e.key==='ArrowRight'||e.key==='ArrowDown')){e.preventDefault();advance()}});
dlg.querySelector('.dialog-x').onclick=()=>dlg.close();
dlg.addEventListener('close',()=>{if(S.rec||S.stream){S.discard=true;stop()}clearTake();status('')});

window.veVoiceover=function(script){
  if(typeof exporting!=='undefined'&&exporting)return;
  if(script)setScenes(script.scenes);else paint();
  if(!dlg.open)dlg.showModal();
  status(S.scenes.length?'Tap ● Start recording when you\'re ready. You get a 3-second countdown.':'');
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
