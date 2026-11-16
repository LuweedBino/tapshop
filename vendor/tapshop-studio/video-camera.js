// "Use camera" on the Video Editor start screen. Phones and tablets ask photo or video, then open
// the device's own camera app (best quality, real MP4s) through a capture file input. Computers
// have no such app (browsers ignore capture there), so they get a small webcam screen instead.
window.VideoCamera=(()=>{
// Colours on the webcam screen's buttons are inline: the TapShop theme leaves buttons with an
// inline background alone, and this screen stays dark whatever the page theme is.
const GHOST='background:#fff2;color:#fff;border:0';
const css=`.vc-menu{width:min(340px,92vw);border:1px solid var(--ts-border-strong,#d4d4d4);border-radius:16px;padding:18px;background:var(--ts-surface,#fff);color:var(--ts-text,#171717);font:15px system-ui,sans-serif}
.vc-menu::backdrop{background:#0008}.vc-menu h2{margin:0 0 12px;font-size:18px}.vc-menu button{display:block;width:100%;margin-top:8px;padding:13px;border:1px solid var(--ts-border-strong,#d4d4d4);border-radius:12px;background:transparent;color:inherit;font:600 15px system-ui,sans-serif;cursor:pointer}
.vc-menu button.vc-cancel{border:0;font-weight:500;color:var(--ts-muted,#737373)}
.vc-cam{width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0}.vc-wrap{position:fixed;inset:0;display:flex;flex-direction:column;background:#000;color:#fff;font:15px system-ui,sans-serif}
.vc-stage{position:relative;flex:1;min-height:0}.vc-stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.vc-stage video.vc-mirror{transform:scaleX(-1)}
.vc-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;line-height:1.5}.vc-status[hidden]{display:none}
.vc-rec{position:absolute;top:14px;left:50%;transform:translateX(-50%);padding:5px 12px;border-radius:999px;background:#d92d20;font:600 14px system-ui,sans-serif;font-variant-numeric:tabular-nums}.vc-rec[hidden]{display:none}
.vc-bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:#111}
.vc-side{display:flex;gap:8px}.vc-side.vc-end{justify-content:flex-end}.vc-bar button{font:600 14px system-ui,sans-serif;border-radius:10px;padding:10px 14px;cursor:pointer}.vc-bar button[hidden]{display:none}.vc-bar button:disabled{opacity:.4;cursor:default}
.vc-modes[hidden]{display:none}.vc-modes{display:flex;justify-content:center;gap:4px;grid-column:1/-1}
.vc-line{position:absolute;left:0;right:0;bottom:0;padding:14px 18px 16px;background:linear-gradient(transparent,#000d 30%);font:600 clamp(17px,2.6vw,26px)/1.35 system-ui,sans-serif;text-align:center;text-shadow:0 1px 3px #000}.vc-line small{display:block;font-size:13px;font-weight:500;opacity:.8;margin-bottom:4px}
.vc-rec.vc-ok{background:#16a34a}
/* Countdown towards the suggested length: a big ring of seconds left, then a flashing green "Stop" light. */
.vc-rec.vc-side-pill{left:14px;transform:none}
.vc-count{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:clamp(96px,22vw,140px);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:conic-gradient(#fbbf24 calc(var(--p,0)*1turn),#ffffff33 0);box-shadow:0 4px 18px #0009;pointer-events:none}.vc-count[hidden]{display:none}
.vc-count::before{content:'';position:absolute;inset:9px;border-radius:50%;background:#000c}
.vc-count b,.vc-count small{position:relative;font-family:system-ui,sans-serif;font-variant-numeric:tabular-nums;text-shadow:0 1px 3px #000}.vc-count b{font-size:clamp(40px,10vw,64px);font-weight:800;line-height:1}.vc-count small{font-size:10px;font-weight:700;opacity:.9;margin-top:2px;letter-spacing:.2px;text-align:center;line-height:1.1;max-width:70%}
.vc-count.vc-go{background:#22c55e;box-shadow:0 0 40px #22c55e,0 0 90px #22c55e88;animation:vc-flash .5s ease-in-out 4 alternate}.vc-count.vc-go::before{background:#16a34a}
@keyframes vc-flash{from{transform:translateX(-50%) scale(1);filter:brightness(1)}to{transform:translateX(-50%) scale(1.12);filter:brightness(1.35)}}
.vc-bar .vc-shoot.vc-go{background:#22c55e!important;border-color:#bbf7d0!important;box-shadow:0 0 0 4px #22c55e66,0 0 24px #22c55e;animation:vc-glow 1s ease-in-out infinite alternate}@keyframes vc-glow{to{box-shadow:0 0 0 9px #22c55e33,0 0 36px #22c55e}}
@media (prefers-reduced-motion:reduce){.vc-count.vc-go,.vc-bar .vc-shoot.vc-go{animation:none}}
.vc-bar .vc-shoot{width:64px;height:64px;padding:0;border-radius:50%}.vc-bar .vc-shoot.vc-on{border-radius:14px;width:52px;height:52px;margin:6px}`;
const FORMATS=['video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'];
let styled=false,inputs=null;
function dress(){if(styled)return;styled=true;let s=document.createElement('style');s.textContent=css;document.head.appendChild(s)}
const stamp=()=>new Date().toISOString().slice(0,19).replace(/[-:]/g,'').replace('T','-');
const clock=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

// Kept in the page, not the menu: phones can take a while to come back from the camera app.
function nativeInputs(add){
  if(!inputs){inputs={};for(const [k,accept] of [['photo','image/*'],['video','video/*']]){let i=document.createElement('input');i.type='file';i.accept=accept;i.setAttribute('capture','environment');i.hidden=true;i.onchange=()=>{inputs.add(i.files);i.value=''};document.body.appendChild(i);inputs[k]=i}}
  inputs.add=add;return inputs;
}
function menu(add){
  let ins=nativeInputs(add),d=document.createElement('dialog');d.className='vc-menu';d.setAttribute('aria-label','Use camera');
  d.innerHTML=`<h2>Use camera</h2><button type="button" data-k="photo">📸 Take a photo</button><button type="button" data-k="video">🎥 Record a video</button><button type="button" class="vc-cancel">Cancel</button>`;
  d.onclick=e=>{let b=e.target.closest('button');if(!b&&e.target!==d)return;d.close();d.remove();if(b?.dataset.k)ins[b.dataset.k].click()};
  document.body.appendChild(d);d.showModal();
}

// prompt {line, label, secs}: shows what to say or film over the picture, and the timer counts towards secs
// (it turns green once the shot is long enough). facing: 'user' | 'environment' picks the starting camera.
function webcam(add,only,prompt,facing){
  let d=document.createElement('dialog');d.className='vc-cam';d.setAttribute('aria-label','Camera');
  d.innerHTML=`<div class="vc-wrap"><div class="vc-stage"><video muted playsinline autoplay></video><div class="vc-status" role="status">Starting your camera…</div><div class="vc-rec" hidden></div><div class="vc-count" hidden aria-live="polite"><b></b><small></small></div>${prompt?`<div class="vc-line"><small></small><span></span></div>`:''}</div>
<div class="vc-bar"><div class="vc-modes"><button type="button" data-mode="video" style="${GHOST}">Video</button><button type="button" data-mode="photo" style="${GHOST}">Photo</button></div>
<div class="vc-side"><button type="button" class="vc-done" style="${GHOST}">Done</button></div><button type="button" class="vc-shoot" style="background:#fff;border:4px solid #fff" aria-label="Start recording" disabled></button><div class="vc-side vc-end"><button type="button" class="vc-flip" style="${GHOST}" hidden>⟲ Flip</button></div></div></div>`;
  document.body.appendChild(d);d.showModal();
  const q=s=>d.querySelector(s);if(only)q('.vc-modes').hidden=true;if(prompt){q('.vc-line small').textContent=(prompt.label||'')+(prompt.secs?` · about ${prompt.secs} s`:'');q('.vc-line span').textContent=prompt.line||''}const v=q('video'),status=q('.vc-status'),rec=q('.vc-rec'),shoot=q('.vc-shoot'),flip=q('.vc-flip'),done=q('.vc-done');
  let stream=null,mode='video',recorder=null,tick=null,finished=null,count=0,cams=[],cam=0,closed=false;
  const say=t=>{status.textContent=t;status.hidden=!t};
  const saved=()=>{count++;done.textContent=`Done (${count} added)`};
  const stop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;v.srcObject=null};
  const paint=()=>{let photo=mode==='photo',on=!!recorder;shoot.style.background=photo?'#fff':'#d92d20';shoot.classList.toggle('vc-on',on);shoot.setAttribute('aria-label',photo?'Take photo':on?'Stop recording':'Start recording');shoot.disabled=!stream;flip.disabled=on;for(const b of d.querySelectorAll('[data-mode]')){let now=b.dataset.mode===mode;b.setAttribute('aria-pressed',String(now));b.style.background=now?'#fff':'transparent';b.style.color=now?'#111':'#fffa';b.disabled=on}};
  async function connect(){
    let video={width:{ideal:1920},height:{ideal:1080}};if(cams[cam])video.deviceId={exact:cams[cam].deviceId};else if(facing)video.facingMode={ideal:facing};
    stop();paint();say('Starting your camera…');
    try{
      let s;try{s=await navigator.mediaDevices.getUserMedia({video,audio:true})}catch(e){if(e.name==='OverconstrainedError'||e.name==='AbortError')throw e;s=await navigator.mediaDevices.getUserMedia({video})}
      if(closed){s.getTracks().forEach(t=>t.stop());return}
      stream=s;v.srcObject=s;await v.play().catch(()=>{});
      v.classList.toggle('vc-mirror',s.getVideoTracks()[0]?.getSettings().facingMode!=='environment');
      if(!cams.length){cams=(await navigator.mediaDevices.enumerateDevices()).filter(c=>c.kind==='videoinput');const id=s.getVideoTracks()[0]?.getSettings().deviceId,k=cams.findIndex(c=>c.deviceId===id);if(k>=0)cam=k}flip.hidden=cams.length<2;
      say('');
    }catch(e){
      say(e.name==='NotAllowedError'?'Your camera is blocked. Allow it for this site in your browser’s settings, then try again.':e.name==='NotFoundError'||e.name==='OverconstrainedError'?'No camera was found on this computer.':e.name==='NotReadableError'?'Another app is using your camera. Close it, then try again.':'Your camera could not be started.');
    }
    paint();
  }
  function photo(){
    let c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;if(!c.width)return;
    c.getContext('2d').drawImage(v,0,0);
    c.toBlob(b=>{if(!b)return;add([new File([b],`camera-photo-${stamp()}.jpg`,{type:'image/jpeg'})]);saved()},'image/jpeg',.92);
  }
  function record(){
    let type=FORMATS.find(f=>MediaRecorder.isTypeSupported(f)),chunks=[],start=Date.now(),r;
    try{r=new MediaRecorder(stream,type?{mimeType:type}:undefined)}catch{say('Recording isn’t supported in this browser.');return}
    r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    finished=new Promise(res=>{r.onstop=()=>{let t=(r.mimeType||type||'video/webm').split(';')[0],ext=t==='video/mp4'?'mp4':'webm';if(chunks.length){add([new File(chunks,`camera-video-${stamp()}.${ext}`,{type:t})]);saved()}res()}});
    const goal=prompt?.secs||0,count=q('.vc-count');let went=false;
    const show=()=>{const t=(Date.now()-start)/1000,s=Math.floor(t),ok=goal&&t>=goal;rec.classList.toggle('vc-ok',!!ok);rec.textContent=(ok?'✓ ':'● ')+clock(s);
      if(!goal)return;count.style.setProperty('--p',Math.min(1,t/goal).toFixed(3));
      if(ok){if(!went){went=true;count.classList.add('vc-go');shoot.classList.add('vc-go');shoot.setAttribute('aria-label','Stop recording: you have enough');navigator.vibrate?.([120,80,120])}count.querySelector('b').textContent='✓';count.querySelector('small').textContent='TAP STOP'}
      else{count.querySelector('b').textContent=Math.ceil(goal-t);count.querySelector('small').textContent=Math.ceil(goal-t)===1?'SECOND LEFT':'SECONDS LEFT'}};
    rec.classList.toggle('vc-side-pill',!!goal);count.hidden=!goal;count.classList.remove('vc-go');
    r.start(1000);recorder=r;rec.hidden=false;show();tick=setInterval(show,100);paint();
  }
  async function endRecording(){if(!recorder)return;recorder.stop();recorder=null;clearInterval(tick);rec.hidden=true;q('.vc-count').hidden=true;q('.vc-count').classList.remove('vc-go');shoot.classList.remove('vc-go');await finished;paint()}
  // Leaving mid-recording keeps the clip rather than losing it.
  async function close(){if(closed)return;closed=true;await endRecording();stop();d.close();d.remove()}
  shoot.onclick=()=>{if(!stream)return;if(mode==='photo')photo();else if(recorder)endRecording();else record()};
  for(const b of d.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;paint()};
  flip.onclick=()=>{cam=(cam+1)%cams.length;connect()};
  done.onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close()});
  connect();
}

// only:'video' is for places that take video alone: no photo choice on either kind of device.
// inApp: use the in-page camera even on phones (so prompt can show over the picture), not the camera app.
function open(add,toast,{only,prompt,inApp,facing}={}){
  dress();
  if(!inApp&&matchMedia('(pointer:coarse)').matches){if(only)nativeInputs(add)[only].click();else menu(add);return}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('This browser can’t use your camera here.');return}
  webcam(add,only,prompt,facing);
}
return {open};
})();
