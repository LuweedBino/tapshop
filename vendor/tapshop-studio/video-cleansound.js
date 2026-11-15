// Clean sound: takes steady background noise (fans, AC, hum, hiss) out of a video's sound and mutes the
// click or tap when the phone starts and stops recording. All in the browser, no uploads.
// window.veCleanSound(asset, say) makes a cleaned copy of the asset's sound (a.cleanFile, a 48 kHz WAV) and
// plays it in place of the original: in the preview through a hidden <audio> that follows the video element
// (into the same a.gain, so clip volume and the real-time export hear it), and in the frame-by-frame export
// through mixSound (video-export.js), so preview and export match. Clips of a cleaned video get c.clean = true,
// which auto-save keeps, so a reopened video is cleaned again (veRecleanSound). veOriginalSound(asset) undoes it.
(()=>{
const SR=48000,N=2048,H=512,BINS=N/2+1;

// ---------- FFT (radix-2, in place) ----------
const rev=new Uint16Array(N),cosT=new Float64Array(N/2),sinT=new Float64Array(N/2);
for(let i=0,b=Math.log2(N);i<N;i++){let r=0;for(let k=0;k<b;k++)r|=((i>>k)&1)<<(b-1-k);rev[i]=r}
for(let i=0;i<N/2;i++){cosT[i]=Math.cos(2*Math.PI*i/N);sinT[i]=-Math.sin(2*Math.PI*i/N)}
function fft(re,im,inv){for(let i=0;i<N;i++){let j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let size=2;size<=N;size*=2){let half=size/2,step=N/size;for(let s=0;s<N;s+=size)for(let k=0;k<half;k++){let c=cosT[k*step],sn=inv?-sinT[k*step]:sinT[k*step],a=s+k,b=a+half,
    tr=re[b]*c-im[b]*sn,ti=re[b]*sn+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
  if(inv)for(let i=0;i<N;i++){re[i]/=N;im[i]/=N}}
// sqrt-Hann on both sides = Hann overall, which adds up to 2 at a quarter-window hop.
const WIN=new Float64Array(N);for(let i=0;i<N;i++)WIN[i]=Math.sqrt(.5-.5*Math.cos(2*Math.PI*i/N));

// ---------- noise removal (spectral subtraction with a learned noise print) ----------
// The noise print is, for each frequency, a quiet moment's level (the 15th percentile over time), which is what a
// fan or AC sounds like on its own. Each moment then keeps only what rises above it, never dropping below
// FLOOR (so voices stay natural, no "underwater" sound), smoothed over time and frequency. Rumble under 70 Hz goes.
const FLOOR=.12,OVER=2.2;
async function denoise(x,say){const len=x.length,frames=Math.ceil((len+N)/H),re=new Float64Array(N),im=new Float64Array(N);
  const frameAt=f=>{const at=f*H-N;for(let i=0;i<N;i++){const k=at+i;re[i]=k>=0&&k<len?x[k]*WIN[i]:0;im[i]=0}fft(re,im,false)};
  // Pass 1: noise print from up to 1500 evenly spread moments.
  const every=Math.max(1,Math.floor(frames/1500)),picks=[];for(let f=0;f<frames;f+=every)picks.push(f);
  const mags=picks.map(f=>{frameAt(f);const m=new Float32Array(BINS);for(let k=0;k<BINS;k++)m[k]=Math.hypot(re[k],im[k]);return m});
  const noise=new Float32Array(BINS),col=new Float32Array(mags.length);
  for(let k=0;k<BINS;k++){for(let i=0;i<mags.length;i++)col[i]=mags[i][k];col.sort();noise[k]=col[Math.floor(col.length*.15)]}
  // Pass 2: apply the mask and put the sound back together.
  const out=new Float32Array(len),prev=new Float32Array(BINS).fill(1),g=new Float32Array(BINS),lowCut=Math.round(70*N/SR),ramp=Math.round(110*N/SR);
  for(let f=0;f<frames;f++){if(f%400===0){say?.(Math.round(f/frames*100));await new Promise(r=>setTimeout(r))}
    frameAt(f);
    for(let k=0;k<BINS;k++){const m=Math.hypot(re[k],im[k])+1e-12;let v=Math.max(FLOOR,1-OVER*noise[k]/m);if(k<lowCut)v=0;else if(k<ramp)v*=(k-lowCut)/(ramp-lowCut);
      v=v>prev[k]?v:prev[k]*.55+v*.45;g[k]=v}
    for(let k=0;k<BINS;k++){const s=(g[Math.max(0,k-1)]+2*g[k]+g[Math.min(BINS-1,k+1)])/4;prev[k]=g[k];re[k]*=s;im[k]*=s;if(k&&k<N/2){re[N-k]=re[k];im[N-k]=-im[k]}}
    fft(re,im,true);const at=f*H-N;for(let i=0;i<N;i++){const k=at+i;if(k>=0&&k<len)out[k]+=re[i]*WIN[i]/2}}
  return out}

// ---------- record start/stop clicks ----------
// In the first and last 0.8 s, a 5 ms burst far louder than the 100 ms around it is a tap or click: it's
// muted with soft edges. The very start and end also fade in and out (80 ms) so cuts never pop.
// Found on the original sound (noise removal smears a click), then applied to the cleaned one.
function clickMask(chs){const len=chs[0].length,W=Math.round(SR*.005),E=Math.round(SR*.8),fade=Math.round(SR*.08),mute=new Float32Array(len).fill(1);
  const rms=(a,b)=>{let s=0,n=0;for(let i=Math.max(0,a);i<Math.min(len,b);i++)for(const c of chs){s+=c[i]*c[i];n++}return n?Math.sqrt(s/n):0};
  for(const [a,b] of [[0,Math.min(len,E)],[Math.max(0,len-E),len]])for(let i=a;i+W<=b;i+=W){const r=rms(i,i+W),around=(rms(i-SR*.1,i)+rms(i+W,i+W+SR*.1))/2;
    if(r>.02&&r>6*around+1e-4){const s=Math.max(0,i-Math.round(SR*.03)),e=Math.min(len,i+Math.round(SR*.12)),soft=Math.round(SR*.015);
      for(let k=Math.max(0,s-soft);k<Math.min(len,e+soft);k++){const v=k<s?(s-k)/soft:k>=e?(k-e)/soft:0;mute[k]=Math.min(mute[k],v)}i=e}}
  for(let i=0;i<Math.min(fade,len);i++){mute[i]*=i/fade;mute[len-1-i]*=i/fade}
  return mute}

function wav(chs){const n=chs[0].length,C=chs.length,b=new ArrayBuffer(44+n*C*2),v=new DataView(b),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  s(0,'RIFF');v.setUint32(4,36+n*C*2,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,C,true);v.setUint32(24,SR,true);v.setUint32(28,SR*C*2,true);v.setUint16(32,C*2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*C*2,true);
  let o=44;for(let i=0;i<n;i++)for(let c=0;c<C;c++){const x=Math.max(-1,Math.min(1,chs[c][i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2}return b}

// ---------- playing the clean sound in the preview ----------
function hook(a){if(a._cleanHooked)return;a._cleanHooked=true;const v=a.video;
  const el=()=>a.cleanEl,live=()=>el()&&!v.muted&&typeof playing!=='undefined'&&playing;
  v.addEventListener('play',()=>{if(!live())return;el().currentTime=v.currentTime;el().playbackRate=v.playbackRate;el().play().catch(()=>{})});
  v.addEventListener('pause',()=>el()?.pause());
  v.addEventListener('seeked',()=>{if(el())el().currentTime=v.currentTime});
  v.addEventListener('ratechange',()=>{if(el())el().playbackRate=v.playbackRate});
  v.addEventListener('timeupdate',()=>{if(live()&&Math.abs(el().currentTime-v.currentTime)>.12)el().currentTime=v.currentTime})}
// Point the asset's sound at the clean copy (or back at the video) once the audio graph exists.
// The video's own sound must stay plugged into the speakers (here at zero volume): the browser times the
// picture by its sound, and a video whose sound goes nowhere stutters, which made the preview flash.
function route(a){if(typeof audioCtx==='undefined'||!audioCtx||!a.gain||!a.node)return;
  if(a.cleanEl&&!a.cleanNode){a.cleanNode=audioCtx.createMediaElementSource(a.cleanEl);a.cleanNode.connect(a.gain)}
  if(!a.silent){a.silent=audioCtx.createGain();a.silent.gain.value=0;a.silent.connect(veSpk||audioCtx.destination)}
  try{a.node.disconnect()}catch{}a.node.connect(a.cleanEl?a.silent:a.gain)}
const prevEnsure=ensureAudio;ensureAudio=async function(){await prevEnsure();for(const a of assets)if(a.cleanEl)route(a)};

const busy=new Map();
window.veCleanSound=function(a,say=()=>{}){if(!a?.file)return Promise.resolve(false);if(a.cleanFile)return Promise.resolve(true);if(busy.has(a.id))return busy.get(a.id);
  const job=(async()=>{let buf;try{buf=await new OfflineAudioContext(1,1,SR).decodeAudioData(await a.file.arrayBuffer())}catch{return false}
    if(buf.sampleRate!==SR){const oc=new OfflineAudioContext(buf.numberOfChannels,Math.ceil(buf.duration*SR),SR),src=oc.createBufferSource();src.buffer=buf;src.connect(oc.destination);src.start();buf=await oc.startRendering()}
    const raw=[];for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)raw.push(buf.getChannelData(c));
    const mute=clickMask(raw),chs=[];for(const x of raw){const y=await denoise(x,p=>say(p));for(let i=0;i<y.length;i++)y[i]*=mute[i];chs.push(y)}
    a.cleanFile=new File([wav(chs)],(a.name||'clip')+' (clean).wav',{type:'audio/wav'});
    const el=new Audio();el.preload='auto';el.src=URL.createObjectURL(a.cleanFile);a.cleanEl=el;hook(a);route(a);
    for(const c of clips)if(c.assetId===a.id)c.clean=true;return true})().finally(()=>busy.delete(a.id));
  busy.set(a.id,job);return job};
window.veOriginalSound=function(a){if(!a?.cleanFile)return;a.cleanEl?.pause();try{a.cleanNode?.disconnect()}catch{}
  if(a.cleanEl)URL.revokeObjectURL(a.cleanEl.src);a.cleanEl=null;a.cleanNode=null;a.cleanFile=null;route(a);for(const c of clips)if(c.assetId===a.id)delete c.clean};
// After a saved video reopens: clean its videos' sound again in the background.
window.veRecleanSound=async function(){const list=assets.filter(a=>!a.cleanFile&&clips.some(c=>c.assetId===a.id&&c.clean));if(!list.length)return;
  for(const a of list)await veCleanSound(a)};

// ---------- Smart tools card ----------
{const box=document.querySelector('#smartDialog .notice');if(box){const card=document.createElement('div');card.className='toolcard';
  card.innerHTML='<b>🔇 Clean up sound</b><p class="sub">Takes out steady background noise (fans, AC, hum) and the click when you start or stop recording, on every clip. Runs on this device.</p><div class="row"><button type="button" id="cleanGo">Clean up sound</button><button type="button" id="cleanUndo">Use original sound</button></div><div id="cleanResult" class="result" aria-live="polite"></div>';
  box.before(card);const out=card.querySelector('#cleanResult');
  card.querySelector('#cleanGo').onclick=async e=>{if(exporting)return;const used=assets.filter(a=>clips.some(c=>c.assetId===a.id));if(!used.length){out.textContent='Add a video first.';return}
    pause();e.target.disabled=true;let ok=0;try{for(let i=0;i<used.length;i++){ok+=await veCleanSound(used[i],p=>out.textContent=`Cleaning video ${i+1} of ${used.length}… ${p}%`)?1:0}
      out.textContent=ok?`Done! ${ok} video${ok>1?'s':''} cleaned. Press ▶ to hear it.`:'We couldn’t read the sound in these clips.'}finally{e.target.disabled=false}};
  card.querySelector('#cleanUndo').onclick=()=>{let n=0;for(const a of assets)if(a.cleanFile){veOriginalSound(a);n++}out.textContent=n?'Back to the original sound.':'The sound wasn’t cleaned.'}}}
})();
