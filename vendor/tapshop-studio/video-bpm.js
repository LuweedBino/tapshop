// Tempo (BPM) and first-beat detection for uploaded songs, all on the device. Uploaded music then gets beat markers and
// beat snapping like the generated tracks (timeline-strips.js reads t.bpm and t.beatOffset).
//
// veDetectBeat(audioBuffer) → { bpm, offset, confidence, fadeIn: 0.5, fadeOut: 1.5 } or null when there's no steady beat
// (talking, ambient sound). offset = seconds into the file of the first beat.
//   1. Energy in 50 ms windows (every 10 ms), on a mono mix, low end and full band, as log energy.
//   2. Onset strength = how much the energy jumps up; onsets = peaks above a moving threshold, at least 0.1 s apart.
//   3. Inter-onset intervals between each onset and the next few, folded into 70–180 BPM, voted into a smoothed histogram;
//      its top tempos and their usual mix-ups (×2, ×½, ×3/2, ×2/3, ×4/3, ×3/4) are checked against how the onset strength
//      repeats at 1, 2 and 4 beats (autocorrelation), fine-tuned to 0.1 BPM; the best wins.
//   4. The first beat = the phase where a comb of beats at that tempo lines up with the most onset strength. No steady beat
//      (the comb lines up too weakly for how few of its beats land on a hit) → null.
(()=>{
const HOP=.01,WIN=.05,MIN=70,MAX=180;
function envelope(buf,limit){const SR=buf.sampleRate,n=Math.min(buf.length,Math.floor(limit*SR)),chs=[...Array(buf.numberOfChannels)].map((_,c)=>buf.getChannelData(c)),hop=Math.round(SR*HOP),win=Math.round(SR*WIN),frames=Math.max(0,Math.floor((n-win)/hop));
  // One-pole low-pass (~150 Hz) keeps the kick drum's share separate from the whole band.
  const a=Math.exp(-2*Math.PI*150/SR),low=new Float32Array(n),mono=new Float32Array(n);let y=0;
  for(let i=0;i<n;i++){let v=0;for(const d of chs)v+=d[i];v/=chs.length;mono[i]=v;y=(1-a)*v+a*y;low[i]=y}
  const sq=(arr)=>{const c=new Float64Array(n+1);for(let i=0;i<n;i++)c[i+1]=c[i]+arr[i]*arr[i];return c},cm=sq(mono),cl=sq(low);
  const eAll=new Float32Array(frames),eLow=new Float32Array(frames);
  for(let f=0;f<frames;f++){const s=f*hop,e=s+win;eAll[f]=Math.log1p(1e3*(cm[e]-cm[s])/win);eLow[f]=Math.log1p(1e3*(cl[e]-cl[s])/win)}
  const flux=new Float32Array(frames),lowF=new Float32Array(frames);for(let f=1;f<frames;f++){lowF[f]=Math.max(0,eLow[f]-eLow[f-1]);flux[f]=Math.max(0,eAll[f]-eAll[f-1])+1.5*lowF[f]}
  flux.low=lowF;return flux}
function onsets(flux){const out=[],W=50;let sum=0,sum2=0;const q=[];
  for(let f=0;f<flux.length;f++){q.push(flux[f]);sum+=flux[f];sum2+=flux[f]*flux[f];if(q.length>W){const o=q.shift();sum-=o;sum2-=o*o}
    const m=sum/q.length,sd=Math.sqrt(Math.max(0,sum2/q.length-m*m)),c=f-1;
    if(c>0&&flux[c]>flux[c-1]&&flux[c]>=flux[c+1]&&flux[c]>m+.6*sd&&flux[c]>.02){if(out.length&&c-out.at(-1).f<10){if(flux[c]>out.at(-1).s)out[out.length-1]={f:c,s:flux[c]}}else out.push({f:c,s:flux[c]})}}
  return out}
const fold=bpm=>{while(bpm<MIN)bpm*=2;while(bpm>MAX)bpm/=2;return bpm};
function tempoFromIOIs(ons){const hist=new Float32Array((MAX-MIN)*4+1);// 0.25 BPM bins
  for(let i=0;i<ons.length;i++)for(let j=i+1;j<Math.min(ons.length,i+8);j++){const dt=(ons[j].f-ons[i].f)*HOP;if(dt<.25||dt>2.5)continue;
    const w=Math.sqrt(ons[i].s*ons[j].s)/(j-i);for(const mul of [1,2,.5]){const b=fold(60/dt*mul);if(mul!==1&&Math.abs(b-fold(60/dt))>.5)continue;const k=Math.round((b-MIN)*4);
      for(let d=-6;d<=6;d++){const x=k+d;if(x>=0&&x<hist.length)hist[x]+=w*Math.exp(-d*d/8)}break}}
  return hist}
// How strongly the onset strength repeats every `period` frames (fractional), on the strength minus its average.
function acf(z,period){let s=0,n=0;for(let f=0;f+period+1<z.length;f++){const g=f+period,i=Math.floor(g),fr=g-i;s+=z[f]*(z[i]*(1-fr)+z[i+1]*fr);n++}return n?s/n:0}
// A real beat repeats at one beat, two beats and a whole bar (4 beats); a wrong guess like 3/4 of the tempo doesn't line up with the bar.
const tempoScore=(z,bpm)=>{const P=60/bpm/HOP;return acf(z,P)+.8*acf(z,2*P)+.9*acf(z,4*P)+.3*acf(z,P/2)};
// Best phase (frames) for beats every `period` frames: the comb that lands on the most onset strength; also how well it fits.
function phase(flux,period){let best=0,bestS=-1;for(let p=0;p<period;p+=.25){let s=0,n=0;for(let g=p;g<flux.length-1;g+=period){const i=Math.round(g);s+=Math.max(flux[i-1]||0,flux[i],flux[i+1]||0);n++}s/=n||1;if(s>bestS){bestS=s;best=p}}
  let mean=0;for(const v of flux)mean+=v;mean/=flux.length||1;
  // Coverage: how many of the comb's beats actually land on a hit. Music keeps its beat going; talking and pauses don't.
  let hit=0,n=0;for(let g=best;g<flux.length-1;g+=period){const i=Math.round(g);if(Math.max(flux[i-1]||0,flux[i],flux[i+1]||0)>mean*1.5)hit++;n++}
  return {p:best,score:bestS/(mean||1e-9),cover:n?hit/n:0}}
window.veDetectBeat=function(buf,maxSeconds=90){if(!buf||buf.duration<4)return null;const flux=envelope(buf,maxSeconds),ons=onsets(flux);if(ons.length<8)return null;
  let mean=0;for(const v of flux)mean+=v;mean/=flux.length;const z=Float32Array.from(flux,v=>v-mean);
  const hist=tempoFromIOIs(ons);let peaks=[];for(let k=1;k<hist.length-1;k++)if(hist[k]>hist[k-1]&&hist[k]>=hist[k+1])peaks.push(MIN+k/4);
  peaks.sort((a,b)=>hist[(b-MIN)*4]-hist[(a-MIN)*4]);peaks=peaks.slice(0,6);if(!peaks.length)return null;
  // Try each IOI tempo and its usual mix-ups (×2, ×½, ×3/2, ×2/3, ×4/3, ×3/4), fine-tuned to 0.1 BPM, with a gentle pull toward 90–140.
  const tried=new Set();let best=null;
  for(const b of peaks)for(const r of [1,2,.5,1.5,2/3,4/3,.75]){const c=b*r;if(c<MIN||c>MAX)continue;const key=Math.round(c);if(tried.has(key))continue;tried.add(key);
    for(let d=-1.5;d<=1.5;d+=.1){const bpm=c+d;if(bpm<MIN||bpm>MAX)continue;const s=tempoScore(z,bpm)*(1+.12*Math.exp(-((Math.log2(bpm/115))**2)/.18));if(!best||s>best.s)best={bpm,s}}}
  if(!best||best.s<=0)return null;
  const period=60/best.bpm/HOP,ph=phase(flux,period);
  // A steady beat lines up clearly better than chance, all the way through.
  // Busy beats hit nearly every comb tooth; sparse hip-hop or swung grooves hit fewer but line up very strongly.
  // Talking, pauses and ambient pads fail both (measured: a voiceover ≈ 4.7 / 33 %, sparse beats ≥ 5 / 42 % or ≥ 7 / 35 %).
  const steady=(ph.score>=1.7&&ph.cover>=.55)||(ph.score>=4.5&&ph.cover>=.42)||(ph.score>=6.5&&ph.cover>=.33);if(!steady)return null;
  // The comb can also lock onto the off-beats (hats, swung 8ths, syncopated kicks). Songs nearly always start on a beat, so of
  // the quarter-beat shifts that fit almost as well (85 %+), take the one nearest the first strong hit in the file.
  const comb=(arr,p0)=>{let s=0,n=0;for(let g=p0;g<arr.length-1;g+=period){const i=Math.round(g);s+=Math.max(arr[i-1]||0,arr[i],arr[i+1]||0);n++}return s/(n||1)};
  const strong=[...ons].map(o=>o.s).sort((a,b)=>a-b)[Math.floor(ons.length*.9)]*.5,first=ons.find(o=>o.s>=strong),q0=first?first.f%period:ph.p;
  const dist=(a,b)=>{const d=Math.abs(a-b)%period;return Math.min(d,period-d)};
  let p=ph.p;{const full0=comb(flux,ph.p);for(const k of [1,2,3]){const q=(ph.p+k*period/4)%period;if(comb(flux,q)>=.85*full0&&dist(q,q0)<dist(p,q0))p=q}}
  const bpm=Math.round(best.bpm*10)/10,beat=60/bpm;let offset=(p*HOP+WIN-.036)%beat;if(offset<0)offset+=beat;
  return {bpm,offset:Math.round(offset*1000)/1000,confidence:Math.round(ph.score*100)/100,fadeIn:.5,fadeOut:1.5}};
// Stamp an uploaded audio track with its tempo once it's been listened to: t.bpm, t.beatOffset (the first beat, seconds into
// the file; t.offset already means where the track sits on the timeline), t.beatFound, and the 0.5 s fade-in (only if the
// fade-in is still the default). Leaves the track alone if it was replaced meanwhile or already has a tempo.
window.veAutoBeat=async function(t){const file=t.file;if(!file||t.bpm)return null;const r=await veDetectFileBeat(file);
  if(!r||t.file!==file||t.bpm||!extraTracks.includes(t))return null;
  Object.assign(t,{bpm:r.bpm,beatOffset:r.offset,beatFound:true});if(t.fadeIn===.3)t.fadeIn=r.fadeIn;if(t.fadeOut==null)t.fadeOut=r.fadeOut;
  renderTracks();if(typeof toast==='function')toast(`🥁 Found the beat: ${r.bpm} BPM. Strips now snap to it.`);return r};
// Decode an uploaded file (mono, 22 kHz is plenty) and detect its beat. null when it has no steady beat or can't be read.
window.veDetectFileBeat=async function(file){try{const buf=await new OfflineAudioContext(1,1,22050).decodeAudioData(await file.arrayBuffer());return veDetectBeat(buf)}catch{return null}};
})();
