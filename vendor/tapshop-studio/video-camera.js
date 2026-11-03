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

function webcam(add,only){
  let d=document.createElement('dialog');d.className='vc-cam';d.setAttribute('aria-label','Camera');
  d.innerHTML=`<div class="vc-wrap"><div class="vc-stage"><video muted playsinline autoplay></video><div class="vc-status" role="status">Starting your camera…</div><div class="vc-rec" hidden></div></div>
<div class="vc-bar"><div class="vc-modes"><button type="button" data-mode="video" style="${GHOST}">Video</button><button type="button" data-mode="photo" style="${GHOST}">Photo</button></div>
<div class="vc-side"><button type="button" class="vc-done" style="${GHOST}">Done</button></div><button type="button" class="vc-shoot" style="background:#fff;border:4px solid #fff" aria-label="Start recording" disabled></button><div class="vc-side vc-end"><button type="button" class="vc-flip" style="${GHOST}" hidden>⟲ Flip</button></div></div></div>`;
  document.body.appendChild(d);d.showModal();
  const q=s=>d.querySelector(s);if(only)q('.vc-modes').hidden=true;const v=q('video'),status=q('.vc-status'),rec=q('.vc-rec'),shoot=q('.vc-shoot'),flip=q('.vc-flip'),done=q('.vc-done');
  let stream=null,mode='video',recorder=null,tick=null,finished=null,count=0,cams=[],cam=0,closed=false;
  const say=t=>{status.textContent=t;status.hidden=!t};
  const saved=()=>{count++;done.textContent=`Done (${count} added)`};
  const stop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;v.srcObject=null};
  const paint=()=>{let photo=mode==='photo',on=!!recorder;shoot.style.background=photo?'#fff':'#d92d20';shoot.classList.toggle('vc-on',on);shoot.setAttribute('aria-label',photo?'Take photo':on?'Stop recording':'Start recording');shoot.disabled=!stream;flip.disabled=on;for(const b of d.querySelectorAll('[data-mode]')){let now=b.dataset.mode===mode;b.setAttribute('aria-pressed',String(now));b.style.background=now?'#fff':'transparent';b.style.color=now?'#111':'#fffa';b.disabled=on}};
  async function connect(){
    let video={width:{ideal:1920},height:{ideal:1080}};if(cams[cam])video.deviceId={exact:cams[cam].deviceId};
    stop();paint();say('Starting your camera…');
    try{
      let s;try{s=await navigator.mediaDevices.getUserMedia({video,audio:true})}catch(e){if(e.name==='OverconstrainedError'||e.name==='AbortError')throw e;s=await navigator.mediaDevices.getUserMedia({video})}
      if(closed){s.getTracks().forEach(t=>t.stop());return}
      stream=s;v.srcObject=s;await v.play().catch(()=>{});
      v.classList.toggle('vc-mirror',s.getVideoTracks()[0]?.getSettings().facingMode!=='environment');
      cams=(await navigator.mediaDevices.enumerateDevices()).filter(c=>c.kind==='videoinput');flip.hidden=cams.length<2;
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
    r.start(1000);recorder=r;rec.hidden=false;rec.textContent='● 0:00';tick=setInterval(()=>{rec.textContent='● '+clock(Math.floor((Date.now()-start)/1000))},500);paint();
  }
  async function endRecording(){if(!recorder)return;recorder.stop();recorder=null;clearInterval(tick);rec.hidden=true;await finished;paint()}
  // Leaving mid-recording keeps the clip rather than losing it.
  async function close(){if(closed)return;closed=true;await endRecording();stop();d.close();d.remove()}
  shoot.onclick=()=>{if(!stream)return;if(mode==='photo')photo();else if(recorder)endRecording();else record()};
  for(const b of d.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;paint()};
  flip.onclick=()=>{cam=(cam+1)%cams.length;connect()};
  done.onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close()});
  connect();
}

// only:'video' is for places that take video alone: no photo choice on either kind of device.
function open(add,toast,{only}={}){
  dress();
  if(matchMedia('(pointer:coarse)').matches){if(only)nativeInputs(add)[only].click();else menu(add);return}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('This browser can’t use your camera here.');return}
  webcam(add,only);
}
return {open};
})();
