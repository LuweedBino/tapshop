// Frame-by-frame export. The older export records the screen while the video plays, so a clip the
// device can't decode in real time freezes in the finished file, and hiding the page stops it. This
// one reads each file's frames itself, draws them one at a time at their exact moment and mixes the
// sound separately, so picture and sound can't drift, however heavy the source. exportVideo falls
// back to the older one when this returns false (no WebCodecs, or a file it can't decode or encode).
(()=>{
const FPS=30,RATE=48000;

function loadLibrary(){return window.Mediabunny?Promise.resolve():new Promise((res,rej)=>{let s=document.createElement('script');s.src='mediabunny.js';s.onload=res;s.onerror=rej;document.head.append(s)})}

// One opened file per source, so a clip cut into pieces reads the same Input.
function opener(){
  let open=new Map();
  let get=file=>{if(!open.has(file))open.set(file,(async()=>{let input=new Mediabunny.Input({source:new Mediabunny.BlobSource(file),formats:Mediabunny.ALL_FORMATS});return {input,video:await input.getPrimaryVideoTrack(),audio:await input.getPrimaryAudioTrack()}})());return open.get(file)};
  get.closeAll=async()=>{for(let p of open.values()){try{(await p).input.dispose()}catch{}}};
  return get;
}

// A run is a stretch of output frames showing one source without a jump in its time.
function planRuns(frames){
  let runs=[],main=null,layers=new Map();
  for(let i=0;i<frames;i++){
    let t=i/FPS,p=at(t);
    if(!p)main=null;
    else{if(main?.key!==p.i){main={key:p.i,v:asset(p.c).video,file:asset(p.c).file,from:i,times:[]};runs.push(main)}main.times.push(p.source)}
    for(let tr of extraTracks){
      if(tr.type!=='video'||tr.hidden||!tr.media||!tr.file)continue;
      let local=(t-tr.offset)*tr.speed,on=local>=0&&local<tr.end-tr.start,run=layers.get(tr);
      if(!on){layers.delete(tr);continue}
      if(!run){run={key:tr.id,v:tr.media,file:tr.file,from:i,times:[]};layers.set(tr,run);runs.push(run)}
      run.times.push(tr.start+local);
    }
  }
  return runs;
}

// Changes speed without changing pitch: overlapping windows read at one pace and written at another.
function stretch(ch,speed){
  let size=2048,hopOut=size/2,hopIn=hopOut*speed,n=Math.floor(ch.length/speed),out=new Float32Array(n+size),sum=new Float32Array(n+size);
  for(let a=0,b=0;a+size<ch.length&&b<n;a+=hopIn,b+=hopOut){let s=Math.round(a);for(let k=0;k<size;k++){let w=.5-.5*Math.cos(2*Math.PI*k/size);out[b+k]+=ch[s+k]*w;sum[b+k]+=w}}
  for(let k=0;k<n;k++)if(sum[k]>.01)out[k]/=sum[k];
  return out.subarray(0,n);
}

async function addSound(off,opened,file,from,to,speed,gain,when){
  let track=(await opened(file)).audio;
  if(!track||gain<=0||to<=from)return false;
  if(!(await track.canDecode()))throw Error('Audio can’t be decoded here.');
  let rate=track.sampleRate,count=Math.min(2,track.numberOfChannels),len=Math.ceil((to-from)*rate),data=Array.from({length:count},()=>new Float32Array(len));
  for await(let {buffer,timestamp} of new Mediabunny.AudioBufferSink(track).buffers(from,to)){
    let at0=Math.round((timestamp-from)*rate),skip=Math.max(0,-at0),n=Math.min(buffer.length-skip,len-Math.max(0,at0));
    if(n<=0)continue;
    for(let c=0;c<count;c++)data[c].set(buffer.getChannelData(Math.min(c,buffer.numberOfChannels-1)).subarray(skip,skip+n),Math.max(0,at0));
  }
  if(speed!==1)data=data.map(ch=>stretch(ch,speed));
  if(!data[0].length)return false;
  let buf=off.createBuffer(count,data[0].length,rate);data.forEach((ch,c)=>buf.copyToChannel(ch,c));
  let src=off.createBufferSource(),amp=off.createGain();src.buffer=buf;amp.gain.value=gain;src.connect(amp);amp.connect(off.destination);src.start(when);
  return true;
}

async function mixSound(opened,seconds){
  let off=new OfflineAudioContext(2,Math.ceil(seconds*RATE),RATE),any=false,start=0;
  for(let c of clips){any=await addSound(off,opened,asset(c).file,c.in,c.out,c.speed,c.volume??1,start)||any;start+=duration(c)}
  for(let t of extraTracks){if(t.file&&!t.muted)any=await addSound(off,opened,t.file,t.start,t.end,t.speed,t.volume,t.offset)||any}
  if(musicFile)any=await addSound(off,opened,musicFile,0,Math.min(seconds,music.duration||seconds),1,music.volume,0)||any;
  return any?off.startRendering():null;
}

// One second of the mix, fed in step with the frames so the two stay side by side in the file.
function secondOf(mix,sec){
  let from=sec*RATE,len=Math.min(RATE,mix.length-from);
  if(len<=0)return null;
  let b=new AudioBuffer({length:len,numberOfChannels:2,sampleRate:RATE});
  for(let c=0;c<2;c++)b.copyToChannel(mix.getChannelData(c).subarray(from,from+len),c);
  return b;
}

async function wakeLock(){try{return await navigator.wakeLock?.request('screen')}catch{return null}}

window.veFastExport=async function(){
  if(!window.VideoEncoder||!window.AudioDecoder||!window.VideoDecoder||!total())return false;
  let opened=null,output=null,lock=null,runs=[],closeFrame=r=>{r.v._frame?.close();r.v._frame=null};
  pause();cancelled=false;exporting=true;exportUI(true);
  let say=s=>$('exportStatus').textContent=s,done=()=>{veRendering=false;exporting=false;exportUI(false);setAspect();$('progress').value=0};
  try{
    say('Getting your video ready…');
    await loadLibrary();
    let h=+$('resolution').value,[aw,ah]=$('aspect').value.split(':').map(Number),w=Math.round(h*aw/ah);
    w-=w%2;h-=h%2; // video formats need even sizes
    let bitrate=h>=1080?8000000:5000000,seconds=total(),frames=Math.ceil(seconds*FPS);
    let codec=await Mediabunny.getFirstEncodableVideoCodec(['avc','vp9','vp8'],{width:w,height:h,bitrate});
    if(!codec)throw Error('This device can’t encode video here.');
    let mp4=codec==='avc',kind=mp4?'video/mp4':'video/webm';
    opened=opener();
    runs=planRuns(frames);
    for(let r of runs){let track=(await opened(r.file)).video;if(!track||!(await track.canDecode()))throw Error('A clip can’t be decoded here.');r.sink=new Mediabunny.VideoSampleSink(track)}

    say('Mixing the sound…');
    let mix=await mixSound(opened,seconds),audioCodec=null;
    if(mix){audioCodec=await Mediabunny.getFirstEncodableAudioCodec(mp4?['aac','opus']:['opus'],{numberOfChannels:2,sampleRate:RATE,bitrate:192000});if(!audioCodec)throw Error('This device can’t encode the sound here.')}

    let target=new Mediabunny.BufferTarget();
    // fastStart puts the file's index first, so it can start playing before it has fully downloaded.
    output=new Mediabunny.Output({format:mp4?new Mediabunny.Mp4OutputFormat({fastStart:'in-memory'}):new Mediabunny.WebMOutputFormat(),target});
    canvas.width=w;canvas.height=h;veRendering=true;
    let videoOut=new Mediabunny.CanvasSource(canvas,{codec,bitrate,keyFrameInterval:2}),audioOut=mix&&new Mediabunny.AudioBufferSource({codec:audioCodec,bitrate:192000});
    output.addVideoTrack(videoOut,{frameRate:FPS});
    if(audioOut)output.addAudioTrack(audioOut);
    await output.start();
    lock=await wakeLock();

    for(let i=0;i<frames;i++){
      if(cancelled)throw Error('cancelled');
      if(audioOut&&i%FPS===0){let b=secondOf(mix,i/FPS);if(b)await audioOut.add(b)}
      for(let r of runs){
        if(i===r.from)r.it=r.sink.samplesAtTimestamps(r.times)[Symbol.asyncIterator]();
        if(i<r.from||i>=r.from+r.times.length)continue;
        let {value}=await r.it.next();
        if(value){closeFrame(r);r.v._frame=value}
        if(i===r.from+r.times.length-1){await r.it.return();r.it=null;closeFrame(r)}
      }
      playhead=i/FPS;draw();
      await videoOut.add(i/FPS,1/FPS);
      if(i%15===0){$('progress').value=i/frames;say('Making your video… '+Math.floor(i/frames*100)+'%. Keep this page open.')}
    }
    if(audioOut)for(let s=Math.ceil(frames/FPS);;s++){let b=secondOf(mix,s);if(!b)break;await audioOut.add(b)}
    say('Finishing up…');
    await output.finalize();output=null;
    done();
    download(new Blob([target.buffer],{type:kind}),($('projectName').value||'TapShop video')+(mp4?'.mp4':'.webm'));
    say('Export complete. Your download is ready.');
    return true;
  }catch(e){
    let stopped=cancelled;
    try{await output?.cancel()}catch{}
    done();
    if(stopped){say('Export cancelled.');return true}
    console.warn('Frame-by-frame export unavailable, using the real-time one:',e);
    return false;
  }finally{
    for(let r of runs){try{await r.it?.return()}catch{}closeFrame(r)}
    try{await opened?.closeAll()}catch{}
    try{await lock?.release()}catch{}
  }
};
})();
