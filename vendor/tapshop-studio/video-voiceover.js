// Voiceover recorder with a teleprompter (🎙️ Voiceover on the timeline bar).
// Opens empty from the bar, or with a script from Build My Video (or a dashboard message)
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
.vo-stage{position:relative;display:flex;flex-direction:column;min-height:0}
/* Big countdown over the script (3, 2, 1 in an amber ring, then a green GO light), and a red REC timer you can see. */
.vo-big{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000a;border-radius:12px;pointer-events:none;z-index:2}.vo-big[hidden]{display:none}
.vo-dot{width:min(42vw,190px);aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 clamp(64px,15vw,120px)/1 system-ui,sans-serif;color:#fff;border:10px solid #fbbf24;background:#0008;box-shadow:0 0 30px #fbbf2466;animation:vo-tick 1s ease-out}
.vo-dot.go{border-color:#22c55e;background:#22c55e;box-shadow:0 0 60px #22c55e,0 0 120px #22c55e88;font-size:clamp(48px,11vw,88px);animation:vo-go .7s ease-out}
@keyframes vo-tick{0%{transform:scale(1.25);opacity:.3}25%{transform:scale(1);opacity:1}}@keyframes vo-go{0%{transform:scale(.6)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
.vo-recpill{position:absolute;bottom:10px;right:12px;z-index:2;padding:7px 14px;border-radius:999px;background:#dc2626;color:#fff;font:700 16px system-ui,sans-serif;font-variant-numeric:tabular-nums;box-shadow:0 2px 10px #0007;pointer-events:none}.vo-recpill[hidden]{display:none}
.vo-recpill::before{content:'';display:inline-block;width:10px;height:10px;margin-right:7px;border-radius:50%;background:#fff;animation:vo-blink 1s steps(2) infinite;vertical-align:1px}@keyframes vo-blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.vo-dot,.vo-dot.go,.vo-recpill::before{animation:none}}
.vo-prompter{height:min(46vh,380px);min-height:120px;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;padding:10px;border-radius:12px;background:#0b0b10;color:#fff;line-height:1.3}
.vo-line{padding:8px 12px;border-radius:10px;opacity:.45;transition:opacity .2s,background .2s;cursor:pointer}
.vo-line small{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.75;margin-bottom:2px}
/* − 6s + on every line: how long the line gets. Hidden while recording (but still taking its space, so nothing jumps), so taps on the script only pause. */
.vo-len{display:inline-flex;align-items:center;gap:4px;letter-spacing:0;text-transform:none}.vo-len b{min-width:38px;text-align:center;font-size:13px}.vo-len button{width:28px;height:28px;padding:0!important;border-radius:50%!important;font:700 16px system-ui!important;line-height:1!important}
.vo-going .vo-len,.vo-paused .vo-len{visibility:hidden}
/* Tap to pause: a big notice over the script until the next tap. */
#voPause{position:absolute;inset:0;display:grid;place-items:center;background:#000a;z-index:5;text-align:center;font:800 26px/1.3 system-ui,sans-serif;color:#fff;cursor:pointer;border-radius:inherit}#voPause[hidden]{display:none}#voPause small{display:block;font:600 14px system-ui,sans-serif;opacity:.85;margin-top:6px}
.vo-line p{margin:0;font-weight:600}
/* A small "how this works" card over the script when the recorder opens. */
@property --vo-a{syntax:'<angle>';inherits:false;initial-value:0deg}
#voTip{--vo-bg:#1f1b24;position:absolute;left:14px;right:14px;bottom:10px;z-index:4;padding:12px 14px;border-radius:14px;border:3px solid transparent;
  background:linear-gradient(var(--vo-bg),var(--vo-bg)) padding-box,conic-gradient(from var(--vo-a),#ec489955,#ec4899 18%,#fff 25%,#ec4899 32%,#ec489955 50%,#ec489955) border-box;
  animation:vo-spin 2.6s linear infinite;color:#fff;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px #0009}#voTip[hidden]{display:none}
@keyframes vo-spin{to{--vo-a:360deg}}@media (prefers-reduced-motion:reduce){#voTip{animation:none}}
#voTip b{display:block;font-size:15px;margin-bottom:6px}#voTip ul{margin:0;padding-left:18px}#voTip li{margin:3px 0}
#voTip .vo-tipbar{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}#voTip .vo-tipbar button{padding:7px 14px;border-radius:999px;font:700 13px system-ui,sans-serif;cursor:pointer;border:1px solid #ffffff55;background:transparent;color:#fff}
#voTip .vo-tipbar .vo-ok{background:#ec4899!important;border-color:#ec4899!important;color:#fff!important}
html.ts:not(.ts-dark) #voTip{--vo-bg:#fff;color:#1f1b24}html.ts:not(.ts-dark) #voTip .vo-tipbar button{color:#1f1b24;border-color:#0003}html.ts:not(.ts-dark) #voTip .vo-tipbar .vo-ok{color:#fff}
.vo-line.on{opacity:1;background:#ff5b8322;box-shadow:inset 3px 0 0 #ff5b83}
.vo-line.done{opacity:.3}
/* Countdown under the highlighted line: seconds left for that line, in a ring that fills green clockwise. */
/* Words light up like a progress bar: read ones turn green, the one to say now sits in a plain green box, the rest wait dimmed. */
.vo-w{transition:opacity .25s,box-shadow .25s}.vo-going .vo-line.on .vo-w{opacity:.55}
/* Calm progress: words you've read go back to full white, the word to say now gets a thin green underline. No colour fills, so it stays easy to read. */
.vo-going .vo-line.on .vo-w.lit,.vo-going .vo-line.on .vo-w.now{opacity:1}
.vo-going .vo-line.on .vo-w.now{box-shadow:inset 0 -3px 0 #22c55e}
.vo-cd{display:flex;align-items:center;gap:8px;margin-top:10px}.vo-cd b{padding:4px 12px;border-radius:999px;background:#22c55e22;border:1px solid #22c55e88;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}.vo-cd span{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;font-weight:600;opacity:.8}.vo-cd.end b{background:#22c55e;color:#fff}
@media (prefers-reduced-motion:reduce){.vo-w{transition:none}}
/* Light theme: the script box follows it (dark stays the default, also outside the dashboard). */
html.ts:not(.ts-dark) .vo-prompter{background:#f7f4fb;color:#1d1a26;border:1px solid #e3ddec}
html.ts:not(.ts-dark) .vo-line.on{background:#ff5b831f}
.vo-write{color:#fff!important}html.ts:not(.ts-dark) .vo-write{color:#be185d!important}
.vo-empty{font-size:15px!important;opacity:.75;margin:0}.vo-write{margin-top:12px;padding:10px 16px;border-radius:12px;border:2px solid #ec4899!important;background:#ec489926!important;color:inherit;font:700 15px system-ui,sans-serif;cursor:pointer}
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
.vo-set[open]{max-height:50vh;max-height:50dvh;overflow:auto;overscroll-behavior:contain}
/* ✨ AI script help: the writer fills the empty teleprompter; the 💬 chat sits under Edit script. */
.vo-aiw{font-size:15px;line-height:1.35}.vo-aiw .vo-empty{margin-bottom:10px}
.vo-lab{display:block;margin:10px 0 5px;font-size:13px;font-weight:700;opacity:.85}
.vo-aiw textarea,#voAsk{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:10px;border:1px solid #8a7aa877;background:transparent;color:inherit;font:15px system-ui,sans-serif}
.vo-chips{display:flex;flex-wrap:wrap;gap:6px}.vo-chips button{padding:6px 11px!important;border-radius:999px!important;font:600 13px system-ui,sans-serif!important;border:1px solid #8a7aa877!important;background:transparent!important;color:inherit!important;cursor:pointer}
.vo-chips button.on{background:#ec4899!important;border-color:#ec4899!important;color:#fff!important}
.vo-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}.vo-row input{flex:1 1 160px}
.vo-gen{padding:10px 16px!important;border-radius:12px!important;border:0!important;background:#ec4899!important;color:#fff!important;font:700 15px system-ui,sans-serif!important;cursor:pointer}.vo-gen:disabled{opacity:.5}
#voChatWrap{margin-top:8px}#voChatWrap summary{font-weight:700}
.vo-log{display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:160px;overflow:auto}
.vo-log p{margin:0;padding:7px 11px;border-radius:12px;font-size:13px;max-width:88%}.vo-log .me{align-self:flex-end;background:#ec489933}.vo-log .ai{align-self:flex-start;background:#8a7aa82e}
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
  .vo-stage{flex:1 1 auto}
  .vo-prompter{flex:1 1 auto;height:auto;min-height:0}
}
/* On-screen keyboard open while typing in the script box or the AI chat: the dialog shrinks to the space above
   the keyboard and the teleprompter steps aside, so the box, its button and Record stay in view. */
#voDialog.vo-kb .vo-stage{display:none}
#voDialog.vo-kb .vo-set[open]{max-height:none;flex:1 1 auto;min-height:0}`;
document.head.appendChild(css);

const dlg=document.createElement('dialog');dlg.id='voDialog';dlg.className='closable';dlg.setAttribute('aria-labelledby','voTitle');
// One screen on phones: the script scrolls, everything else stays put, and the buttons sit at the bottom.
dlg.innerHTML=`<div class="vo-head"><h2 id="voTitle">🎙️ Voiceover</h2><button type="button" class="vo-x" aria-label="Close" title="Close">×</button></div>
<div class="vo-stage"><div id="voPrompter" class="vo-prompter" aria-live="polite"></div><div id="voBig" class="vo-big" hidden aria-hidden="true"><div class="vo-dot"></div></div><div id="voRecPill" class="vo-recpill" hidden></div><div id="voTip" hidden role="note"></div><div id="voPause" hidden role="button" aria-label="Paused. Tap to keep recording."><div>⏸ Paused<small>Tap anywhere to keep recording</small></div></div></div>
<details id="voSet" class="vo-set"><summary>⚙️ Prompter settings <span id="voSetSum"></span><small class="vo-set-tip">👆 Too fast? Too small? Tap here to adjust, or edit your script.</small></summary>
<div class="vo-grid"><label>Text size<input id="voSize" type="range" min="18" max="48" value="28"></label>
<label id="voSpeedWrap">Speed: <b id="voSpeedV">1.0×</b><input id="voSpeed" type="range" min="0.5" max="2" step="0.1" value="1"></label></div>
<label class="vo-check"><input type="checkbox" id="voManual"> Only move when I tap Next scene</label>
<details id="voEditWrap"><summary>✏️ Edit script</summary><textarea id="voEdit" rows="5" placeholder="Type what you'll say, one line per scene"></textarea><button type="button" id="voApply">Use these lines</button></details>
<details id="voChatWrap" hidden><summary>💬 Ask AI to change it</summary><div id="voChatLog" class="vo-log"></div><div class="vo-chips" id="voAsks"></div>
<div class="vo-row"><input id="voAsk" type="text" maxlength="300" placeholder="e.g. make it funnier, or shorten the hook"><button type="button" class="vo-gen" style="background:#ec4899" id="voSend">Send</button><button type="button" id="voUndo" hidden>↩ Undo</button></div></details></details>
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
  if(!S.scenes.length)prompter.innerHTML=aiOK()?aiForm():'<p class="vo-empty">No script yet. Type what you want to say below, one line per scene, then tap Use these lines.</p><button type="button" class="vo-write" style="background:#ec489926">✏️ Write my script</button>';
  else prompter.innerHTML=S.scenes.map((s,i)=>`<div class="vo-line${i===S.idx?' on':''}${i<S.idx?' done':''}" data-i="${i}"><small><span>${esc(s.sectionType||'Scene '+(i+1))}</span><span class="vo-len"><button type="button" data-len="-0.5" data-i="${i}" aria-label="Shorter">−</button><b>${Math.round(plan(s)*10)/10}s</b><button type="button" data-len="0.5" data-i="${i}" aria-label="Longer">+</button></span></small><p>${i===S.idx?words(s.voiceoverLine):esc(s.voiceoverLine)}</p>${i===S.idx?CD:''}</div>`).join('');
  prompter.style.fontSize=q('voSize').value+'px';q('voChatWrap').hidden=!aiOK()||!S.scenes.length;
  q('voTextWrap').hidden=!!S.onTake||!S.scenes.some(s=>s.onScreenText);
  const on=prompter.querySelector('.vo-line.on');
  countdown();
  if(on)prompter.scrollTo({top:Math.max(0,on.offsetTop-prompter.clientHeight/2+on.offsetHeight/2),behavior:'smooth'});
}
function setScenes(scenes){S.scenes=scenes;S.idx=0;S.marks=[];q('voEdit').value=scenes.map(s=>s.voiceoverLine).join('\n');paint()}

function clearTake(){if(S.url)URL.revokeObjectURL(S.url);S.url='';S.take=null;audio.removeAttribute('src');q('voTake').hidden=true;useBtn.hidden=retakeBtn.hidden=true;useBtn.disabled=false;recBtn.hidden=false}
function stopStream(){S.stream?.getTracks().forEach(t=>t.stop());S.stream=null}
function idle(){clearInterval(S.timer);q('voRecPill').hidden=true;q('voBig').hidden=true;recBtn.disabled=false;recBtn.textContent='● Record';recBtn.classList.remove('vo-live');nextBtn.hidden=true;prompter.classList.remove('vo-going','vo-paused');const pb=q('voPause');if(pb)pb.hidden=true;S.pausedAt=0;S.cdHold=false}

// The countdown's waits stop while it's on hold (a tap on the script), and the number starts over on the next tap.
async function cdWait(ms,again){let left=ms,held=false;while(left>0){if(!S.stream||S.discard)return;await wait(50);
    if(S.cdHold){held=true;continue}if(held){held=false;left=ms;again?.();continue}left-=50}}
async function start(){
  if(typeof exporting!=='undefined'&&exporting)return;
  if(S.rec||S.starting)return;S.starting=true;try{await begin()}finally{S.starting=false}}
async function begin(){
  q('voTip').hidden=true;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status("This browser can't record sound. Try Chrome or Safari.");return}
  try{pause()}catch{}
  clearTake();S.discard=false;recBtn.disabled=true;
  try{S.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch{recBtn.disabled=false;status('Allow the microphone to record. Look for the 🔒 or microphone icon next to the web address.');return}
  S.idx=0;S.marks=[];if(small())q('voSet').open=false;paint();
  const big=q('voBig'),dot=big.querySelector('.vo-dot'),show=(t,go)=>{big.hidden=false;dot.className='vo-dot'+(go?' go':'');dot.textContent=t;void dot.offsetWidth};
  S.cdHold=false;
  for(let n=3;n>0;n--){status('Starting in '+n+'…');show(n);await cdWait(1000,()=>{status('Starting in '+n+'…');show(n)});if(!S.stream||S.discard){big.hidden=true;S.cdHold=false;q('voPause').hidden=true;idle();return}}
  // Recording starts 0.5 s after GO lights up; GO fades away a moment later.
  show('GO',true);status('Get ready…');await cdWait(500,()=>show('GO',true));if(!S.stream||S.discard){big.hidden=true;S.cdHold=false;q('voPause').hidden=true;idle();return}
  setTimeout(()=>{if(dot.textContent==='GO')big.hidden=true},400);
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  S.chunks=[];
  try{S.rec=new MediaRecorder(S.stream,type?{mimeType:type}:undefined)}catch{stopStream();idle();status("Couldn't start recording on this device.");return}
  S.rec.ondataavailable=e=>{if(e.data.size)S.chunks.push(e.data)};
  const me=S.rec,done=()=>{if(S.rec===me)finish()};me.onstop=done;me.onerror=done;
  // If the microphone goes away mid-take (another app, unplugged), end the take instead of counting forever.
  S.stream.getAudioTracks().forEach(t=>t.addEventListener('ended',()=>{if(S.rec)stop()}));
  S.rec.start(250);S.t0=performance.now();S.marks=[0];
  // A short buzz so you know it's really recording now (phones that allow it; iPhones don't).
  try{navigator.vibrate?.(200)}catch{}
  recBtn.disabled=false;recBtn.textContent='■ Stop';recBtn.classList.add('vo-live');nextBtn.hidden=S.scenes.length<2;
  const pill=q('voRecPill');pill.hidden=false;pill.textContent='REC 0:00';
  clearInterval(S.timer);S.timer=setInterval(()=>{if(!S.rec||S.rec.state==='inactive'){clearInterval(S.timer);return}if(S.rec.state==='paused')return;const t=now();status('● Recording '+fmt(t));pill.textContent='REC '+fmt(t);countdown();
    if(!manual()&&S.idx<S.scenes.length-1&&t-S.marks[S.idx]>=plan(S.scenes[S.idx])/speed())advance()},150);
}
const now=()=>(performance.now()-S.t0)/1000;
const CD=`<div class="vo-cd" aria-live="off"><b></b><span></span></div>`;
// Each word gets a share of the line's time by its length (plus a little for the gap), so long words take longer.
function words(line){const ws=String(line).split(/\s+/).filter(Boolean),wt=ws.map(w=>w.replace(/[^\p{L}\p{N}]/gu,'').length+1.5),sum=wt.reduce((a,b)=>a+b,0)||1;let at=0;
  return ws.map((w,k)=>{const a=at/sum;at+=wt[k];return `<span class="vo-w" data-a="${a.toFixed(4)}" data-b="${(at/sum).toFixed(4)}">${esc(w)}</span>`}).join(' ')}
// Seconds left for the highlighted line; the ring fills as they run out.
function countdown(){const el=prompter.querySelector('.vo-line.on .vo-cd'),s=S.scenes[S.idx];if(!el||!s)return;
  const total=plan(s)/speed(),gone=S.rec?Math.max(0,now()-(S.marks[S.idx]??now())):0,left=Math.max(0,total-gone),p=Math.min(1,gone/total),end=S.rec&&left<=0;
  prompter.classList.toggle('vo-going',!!S.rec);
  for(const w of prompter.querySelectorAll('.vo-line.on .vo-w')){const a=+w.dataset.a,b=+w.dataset.b,now=S.rec&&p>=a&&p<b;w.classList.toggle('lit',!!S.rec&&p>=b);w.classList.toggle('now',now)}
  el.querySelector('b').textContent=end?'✓ Done':S.rec?Math.ceil(left)+'s left':Math.round(total*10)/10+'s';el.classList.toggle('end',end);
  el.querySelector('span').textContent=!S.rec?'for this line':end?(S.idx<S.scenes.length-1?(manual()?'Tap Next scene':'Next line…'):'Last line, tap Stop when done'):'Follow the green underline.'}
function advance(to){if(!S.rec||S.rec.state==='paused'||S.idx>=S.scenes.length-1)return;const i=to??S.idx+1;if(i<=S.idx)return;S.idx=i;S.marks[i]=now();paint()}
function stop(){clearInterval(S.timer);const rec=S.rec;
  if(!rec){stopStream();idle();return}
  q('voRecPill').hidden=true;recBtn.disabled=true;recBtn.textContent='Stopping…';recBtn.classList.remove('vo-live');status(S.discard?'':'Stopping…');
  try{if(rec.state!=='inactive')rec.stop();else finish()}catch{finish()}
  // Some browsers never say the recording ended: carry on with what was recorded.
  setTimeout(()=>{if(S.rec===rec)finish()},2000)}

async function finish(){
  const rec=S.rec;if(!rec)return;S.rec=null;stopStream();idle();
  if(S.discard){status('');return}
  status('Getting your take ready…');
  try{
    const blob=new Blob(S.chunks,{type:rec?.mimeType||'audio/webm'});
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=await ctx.decodeAudioData(await blob.arrayBuffer());ctx.close?.();
    if(buf.duration<.3)throw Error('too short');
    S.takeDur=buf.duration;
    S.take=new File([wav(buf)],'TapShopUGC voiceover.wav',{type:'audio/wav'});
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
// Retake goes back to the start without recording, so lengths can be changed first.
retakeBtn.onclick=()=>{clearTake();S.idx=0;S.marks=[];paint();prompter.scrollTop=0;showTip();status('Back to the start. Change any lengths you like, then tap ● Record.')};
useBtn.onclick=use;
q('voSize').oninput=()=>{prefs();paint()};
q('voSpeed').oninput=prefs;
q('voManual').onchange=prefs;
prefs();
q('voApply').onclick=()=>{if(S.rec)return;const lines=q('voEdit').value.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,40);
  setScenes(lines.map((l,i)=>({...(S.scenes[i]||{sectionType:'Scene '+(i+1),durationSeconds:0,onScreenText:''}),voiceoverLine:l})));q('voEditWrap').open=false};
prompter.onclick=e=>{const lb=e.target.closest('[data-len]');if(lb){if(S.rec)return;const i=+lb.dataset.i,s=S.scenes[i];if(!s)return;
    s.durationSeconds=Math.min(60,Math.max(1,Math.round((plan(s)+(+lb.dataset.len))*2)/2));S.onLen?.(i,s.durationSeconds);paint();return}
  if(S.rec&&S.rec.state!=='inactive'){togglePause();return}
  if(S.starting){togglePause();return}
  const el=e.target.closest('.vo-line');if(!el)return;S.idx=+el.dataset.i;paint()};
q('voPause').onclick=()=>togglePause();
const PAUSE_HTML='<div>⏸ Paused<small>Tap anywhere to keep recording</small></div>';
// Tap the script while recording to pause; tap again to carry on. Paused time is left out of the clock, so the
// line timings and scene marks still match the recording.
function togglePause(){const r=S.rec,box=q('voPause'),pill=q('voRecPill');
  // During the 3-2-1 countdown a tap holds it instead of jumping lines.
  if(!r&&S.starting){S.cdHold=!S.cdHold;box.innerHTML=S.cdHold?'<div>⏸ Countdown paused<small>Tap anywhere to carry on</small></div>':PAUSE_HTML;box.hidden=!S.cdHold;if(S.cdHold)q('voBig').hidden=true;
    status(S.cdHold?'⏸ Countdown paused. Tap the script to carry on.':'Starting…');return}
  if(!r)return;box.innerHTML=PAUSE_HTML;
  if(r.state==='recording'){try{r.pause()}catch{return}S.pausedAt=performance.now();box.hidden=false;prompter.classList.add('vo-paused');pill.textContent='⏸ PAUSED';status('⏸ Paused. Tap the script to keep recording.')}
  else if(r.state==='paused'){S.t0+=performance.now()-S.pausedAt;S.pausedAt=0;try{r.resume()}catch{}box.hidden=true;prompter.classList.remove('vo-paused')}}
dlg.addEventListener('keydown',e=>{if(S.rec&&(e.key==='ArrowRight'||e.key==='ArrowDown')){e.preventDefault();advance()}});
dlg.querySelector('.vo-x').onclick=()=>dlg.close();
dlg.addEventListener('close',()=>{if(S.rec||S.stream){S.discard=true;stop()}clearTake();status('')});

// opts.onTake({file, marks, dur}): use the take elsewhere; the button then reads "Use this take".
// No script yet: open the settings and the script box so there's somewhere to type straight away.
function openEditor(focus){q('voSet').open=true;q('voEditWrap').open=true;if(!focus)return;const t=q('voEdit');t.scrollIntoView({block:'center',behavior:'smooth'});t.focus({preventScroll:true})}
q('voPrompter').addEventListener('click',e=>{if(e.target.closest('.vo-write'))openEditor(true)});
// ✨ AI script help (inside TapShopUGC, where /api/edit-script lives): write a script from a topic, a style and a
// length (mode "write"), then change it by chatting (mode "edit"). The style chosen is kept for the changes.
const STYLES=[['friendly','😊 Friendly','friendly and warm, like talking to a friend'],['funny','😂 Funny','funny and playful, with light jokes'],['hype','⚡ Hype','high energy, excited and punchy'],['calm','😌 Calm','calm, soft and slow'],['pro','💼 Professional','clear, confident and professional'],['story','📖 Storytime','storytime: a personal little story'],['heart','💗 Heartfelt','heartfelt and emotional'],['bold','🔥 Bold','bold, direct and a little edgy']];
const ASKS=['Make it shorter','Make it funnier','Punchier hook','Simpler words','Stronger ending','More friendly'];
const AI={topic:'',style:'friendly',len:30,busy:false,log:[],prev:null};
try{const p=JSON.parse(localStorage.getItem('tapshop-vo-ai')||'{}');if(p.style)AI.style=p.style;if(p.len)AI.len=p.len}catch{}
const aiOK=()=>typeof inTapShop==='function'?inTapShop():window.parent!==window;
const styleOf=()=>STYLES.find(x=>x[0]===AI.style)||STYLES[0];
function aiForm(){return `<div class="vo-aiw"><p class="vo-empty">No script yet. ✨ Let AI write one for you, or type your own.</p>
<label class="vo-lab" for="voTopic">What's your video about?</label><textarea id="voTopic" rows="2" maxlength="500" placeholder="e.g. my new blender bottle, no more lumpy shakes, link in bio">${esc(AI.topic)}</textarea>
<span class="vo-lab">Style</span><div class="vo-chips">${STYLES.map(([k,l])=>`<button type="button" style="background:transparent" data-style="${k}" class="${AI.style===k?'on':''}" aria-pressed="${AI.style===k}">${l}</button>`).join('')}</div>
<span class="vo-lab">Length</span><div class="vo-chips">${[15,30,60].map(n=>`<button type="button" style="background:transparent" data-len="${n}" class="${AI.len===n?'on':''}" aria-pressed="${AI.len===n}">${n} seconds</button>`).join('')}</div>
<div class="vo-row"><button type="button" class="vo-gen" style="background:#ec4899" data-ai="write" ${AI.busy?'disabled':''}>✨ Write my script</button><button type="button" class="vo-write" style="background:#ec489926">✏️ I'll type my own</button></div></div>`}
function chatPaint(){q('voChatLog').innerHTML=AI.log.map(m=>`<p class="${m.me?'me':'ai'}">${esc(m.text)}</p>`).join('');q('voChatLog').scrollTop=1e9;
  q('voAsks').innerHTML=ASKS.map(a=>`<button type="button" style="background:transparent" data-ask="${esc(a)}" ${AI.busy?'disabled':''}>${a}</button>`).join('')+STYLES.filter(x=>x[0]!==AI.style).slice(0,3).map(([k,l])=>`<button type="button" style="background:transparent" data-ask="Change the style: ${STYLES.find(x=>x[0]===k)[2]}" data-to="${k}" ${AI.busy?'disabled':''}>→ ${l}</button>`).join('');
  q('voSend').disabled=AI.busy;q('voUndo').hidden=!AI.prev||AI.busy}
async function readNd(res){const rd=res.body.getReader(),dec=new TextDecoder();let buf='',out=null;
  for(;;){const {value,done}=await rd.read();buf+=dec.decode(value||new Uint8Array(),{stream:!done});let nl;
    while((nl=buf.indexOf('\n'))>=0){const line=buf.slice(0,nl).trim();buf=buf.slice(nl+1);if(!line)continue;try{const ev=JSON.parse(line);if(ev.type==='result')out=ev}catch{}}
    if(done)return out}}
async function askAI(mode,request,to){if(AI.busy||S.rec)return;if(!request){status(mode==='write'?'Tell the AI what your video is about first.':'Type what you’d like to change first.');return}
  AI.busy=true;if(mode==='edit'){AI.log.push({me:1,text:request});chatPaint()}paint();const t0=Date.now(),tick=()=>status(`✨ ${mode==='write'?'Writing your script':'Changing your script'}… ${Math.round((Date.now()-t0)/1000)} s`);
  const timer=setInterval(tick,1000),ctl=new AbortController(),limit=setTimeout(()=>ctl.abort(),150000);tick();
  try{const st=styleOf(),body={mode,request,style:st[2],seconds:AI.len};
    if(mode==='edit')body.scenes=S.scenes.map(x=>({sectionType:x.sectionType,durationSeconds:x.durationSeconds||3,visualDirection:'',voiceoverLine:x.voiceoverLine,onScreenText:x.onScreenText||''}));
    const res=await fetch('/api/edit-script',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify(body)});
    const data=(res.headers.get('content-type')||'').includes('ndjson')&&res.body?await readNd(res):await res.json().catch(()=>null);
    if(!data){status('The connection dropped before the AI finished. Please try again.');return}
    if(!data.ok){status(data.error||'The AI couldn’t do that. Please try again.');if(mode==='edit')AI.log.push({text:'😕 '+(data.error||'Something went wrong. Try again.')});return}
    const old=S.scenes;AI.prev=old.length?old.map(x=>({...x})):null;if(to)AI.style=to;
    // Lines the creator typed keep their own labels ("Scene 2"); the AI's sections are named by type.
    setScenes(data.script.scenes.map((x,i)=>({sectionType:mode==='edit'&&old[i]&&/^Scene \d+$/.test(old[i].sectionType||'')?old[i].sectionType:x.sectionType,durationSeconds:x.durationSeconds,voiceoverLine:x.voiceoverLine,onScreenText:x.onScreenText})));
    const said=data.summary||'Done.';AI.log.push({text:'✨ '+said});
    if(mode==='write'){q('voEditWrap').open=false;q('voSet').open=true;q('voChatWrap').open=true}
    status(mode==='write'?'✨ Script ready. Change any line in ✏️ Edit script, or ask the AI below. Then tap ● Record.':'✨ '+said);
    try{localStorage.setItem('tapshop-vo-ai',JSON.stringify({style:AI.style,len:AI.len}))}catch{}}
  catch(e){status(e?.name==='AbortError'?'The AI took too long. Please try again.':'Network error. Check your connection and try again.')}
  finally{clearInterval(timer);clearTimeout(limit);AI.busy=false;paint();chatPaint()}}
prompter.addEventListener('input',e=>{if(e.target.id==='voTopic')AI.topic=e.target.value});
prompter.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.style){AI.style=b.dataset.style;paint()}else if(b.dataset.len){AI.len=+b.dataset.len;paint()}else if(b.dataset.ai==='write')askAI('write',AI.topic.trim())});
q('voAsks').addEventListener('click',e=>{const b=e.target.closest('button[data-ask]');if(b)askAI('edit',b.dataset.ask,b.dataset.to)});
q('voSend').onclick=()=>{const v=q('voAsk').value.trim();q('voAsk').value='';askAI('edit',v)};
q('voAsk').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();q('voSend').click()}});
q('voUndo').onclick=()=>{if(!AI.prev||AI.busy)return;setScenes(AI.prev);AI.prev=null;AI.log.push({text:'↩ Put the last version back.'});chatPaint();status('↩ Back to the last version.')};
chatPaint();
// Phones: the on-screen keyboard only shrinks the visual viewport, so a full-screen dialog stays tall and the
// keyboard covers its lower part. Inside the dashboard the editor is an iframe whose own viewport never changes,
// so the keyboard is read from the dashboard page's visual viewport (same origin) and mapped into the iframe.
// The dialog is fitted to the part of the screen above the keyboard and the focused box is kept in view.
const vv=window.visualViewport;
function room(){
  try{const pw=window.parent,pv=pw!==window&&pw.visualViewport,fe=window.frameElement;
    if(pv&&fe){const r=fe.getBoundingClientRect(),top=Math.max(0,pv.offsetTop-r.top),bot=Math.min(innerHeight,pv.offsetTop+pv.height-r.top);
      return {kb:pw.innerHeight-pv.height>100,top,h:Math.max(160,bot-top)}}}catch{}
  return vv?{kb:innerHeight-vv.height>100,top:vv.offsetTop,h:vv.height}:{kb:false}}
function fitKb(){const a=document.activeElement,typing=a&&dlg.contains(a)&&/^(TEXTAREA|INPUT)$/.test(a.tagName)&&a.type!=='range'&&a.type!=='checkbox';
  const v=room(),kb=!!(dlg.open&&typing&&v.kb);
  dlg.classList.toggle('vo-kb',kb&&q('voSet').contains(a));
  // !important so no other stylesheet's dialog sizes win while the keyboard is up.
  const set=(k,val)=>val?dlg.style.setProperty(k,val,'important'):dlg.style.removeProperty(k);
  set('top',kb?v.top+'px':'');set('bottom',kb?'auto':'');set('margin',kb?'0':'');set('height',kb?v.h+'px':'');set('max-height',kb?v.h+'px':'');
  if(kb)setTimeout(()=>a.scrollIntoView({block:'center'}),60)}
for(const w of [vv,(()=>{try{return window.parent!==window&&window.parent.visualViewport}catch{return null}})()])if(w){w.addEventListener('resize',fitKb);w.addEventListener('scroll',fitKb)}
dlg.addEventListener('focusin',()=>{fitKb();setTimeout(fitKb,400);setTimeout(fitKb,900)});dlg.addEventListener('focusout',()=>setTimeout(fitKb,100));dlg.addEventListener('close',()=>{dlg.classList.remove('vo-kb');for(const k of ['top','bottom','margin','height','max-height'])dlg.style.removeProperty(k)});
// Quick tips each time the recorder opens with a script, until "Don't show again".
const TIP_OFF='tapshop-vo-tip-off';
function showTip(){const t=q('voTip');let off=false;try{off=localStorage.getItem(TIP_OFF)==='1'}catch{}
  if(off||!S.scenes.length||S.rec){t.hidden=true;return}
  t.innerHTML=`<b>👋 Quick tips</b><ul><li>Use <b style="display:inline;font-size:inherit;margin:0">− +</b> on each scene to change how long it lasts.${S.onLen?' It updates your whole video too.':''}</li><li>Tap the script once to pause. Tap again to keep recording.</li><li>Finished a line early? That's fine. Just wait for the next line to light up.</li><li>Record and retake as many times as you like. Take it easy, relax and enjoy it 😊</li></ul><div class="vo-tipbar"><button type="button" class="vo-never">Don't show again</button><button type="button" class="vo-ok">Got it</button></div>`;
  t.hidden=false;place()}
// Sit the card across the line between the first two scenes, so it overlaps both and is easy to spot.
function place(){const t=q('voTip'),st=t.parentElement,l=prompter.querySelector('.vo-line');if(t.hidden||!l||!st)return;
  const sr=st.getBoundingClientRect(),lr=l.getBoundingClientRect(),h=t.offsetHeight,room=sr.height-h-10;
  t.style.bottom='auto';t.style.top=Math.max(10,Math.min(room,lr.bottom-sr.top-28))+'px'}
addEventListener('resize',place);
q('voTip').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();if(b.classList.contains('vo-never'))try{localStorage.setItem(TIP_OFF,'1')}catch{}q('voTip').hidden=true});
window.veVoiceover=function(script,opts={}){
  if(typeof exporting!=='undefined'&&exporting)return;
  S.onTake=typeof opts.onTake==='function'?opts.onTake:null;S.onLen=typeof opts.onLength==='function'?opts.onLength:null;useBtn.textContent=S.onTake?'✓ Use this take':'✓ Add to timeline';
  if(script)setScenes(script.scenes);else paint();
  if(!dlg.open)dlg.showModal();showTip();
  status(S.scenes.length?'Tap ● Record when you\'re ready. You get a 3-second countdown.':'');if(!S.scenes.length&&!aiOK())openEditor();
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
