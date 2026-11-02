// Auto captions for the Video Editor. Speech recognition runs in the viewer's browser (Whisper via
// transformers.js, loaded from jsDelivr into a Web Worker; models come from Hugging Face and are cached
// by the browser after the first run), so no audio leaves the device and nothing is billed.
// Captions are one graphic track of type 'captions': words [{w, s, e}] in seconds from the track's
// offset, plus a style object. This file draws them (preview and export both go through draw()) and
// replaces the track's strip options with the caption editor.
(()=>{
const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
// Word-timestamp ("_timestamped") models first; plain Whisper as a fallback gives sentence timing,
// which is spread over the words by length.
const MODELS={fast:['onnx-community/whisper-tiny_timestamped','Xenova/whisper-tiny'],better:['onnx-community/whisper-base_timestamped','Xenova/whisper-base']};
const LANGS=[['english','English'],['','Detect automatically'],['spanish','Spanish'],['french','French'],['portuguese','Portuguese'],['german','German'],['italian','Italian'],['tagalog','Tagalog'],['hindi','Hindi'],['japanese','Japanese'],['korean','Korean'],['chinese','Chinese'],['arabic','Arabic']];
const BASE={font:'system-ui',bold:true,italic:false,caps:false,size:.06,maxWords:3,color:'#ffffff',hl:'none',hlColor:'#ffe14d',stroke:'#000000',strokeW:0,box:'#000000',boxOpacity:0,shadow:'soft',anim:'none',emph:false,y:70};
const PRESETS={
  pop:{label:'Word pop',maxWords:2,size:.075,caps:true,hl:'color',hlColor:'#ffe14d',strokeW:.16,anim:'pop',emph:true,y:62},
  karaoke:{label:'Karaoke',maxWords:5,size:.05,hl:'color',hlColor:'#22d3ee',strokeW:.14,y:72},
  classic:{label:'Classic',maxWords:7,size:.036,bold:false,boxOpacity:.6,shadow:'none',anim:'fade',y:84},
  boxed:{label:'Bold box',maxWords:3,size:.06,caps:true,color:'#111111',hl:'box',hlColor:'#ffffff',box:'#ffd84d',boxOpacity:1,shadow:'none',anim:'pop',y:65},
  bounce:{label:'Bounce',maxWords:1,size:.1,caps:true,strokeW:.18,anim:'bounce',y:55},
  reveal:{label:'Type on',maxWords:4,size:.055,hl:'reveal',strokeW:.14,y:70},
  neon:{label:'Neon',maxWords:3,size:.065,caps:true,hl:'color',hlColor:'#ff4fd8',shadow:'glow',anim:'fade',y:60},
  highlight:{label:'Highlight',maxWords:4,size:.055,hl:'box',hlColor:'#7c3aed',strokeW:.1,y:70}};
const presetStyle=k=>{let p={...BASE,...PRESETS[k]};delete p.label;p.preset=k;return p};
const style=t=>({...BASE,...(t.style||{})});
const fontCss=(st,px)=>`${st.italic?'italic ':''}${st.bold?800:500} ${px}px ${/^(system-ui|sans-serif|serif|monospace)$/.test(st.font)?st.font:`"${st.font}"`}`;
const isCap=t=>t?.type==='captions'&&Array.isArray(t.words);
const FONTS=[...(typeof TEXT_FONTS!=='undefined'?TEXT_FONTS:[{label:'System Sans',family:'system-ui'}]),...(typeof VE_BASIC_FONTS!=='undefined'?VE_BASIC_FONTS.map(f=>({label:f,family:f})):[])];

// ---------- grouping and drawing ----------
function groups(t){let st=style(t),ws=t.words.filter(w=>w.w&&String(w.w).trim()),out=[],cur=[],max=Math.max(1,Math.min(10,Math.round(st.maxWords)||1));
  for(let i=0;i<ws.length;i++){let w=ws[i],nx=ws[i+1];cur.push(w);if(cur.length>=max||!nx||(max>2&&/[.!?,;:]$/.test(w.w))||nx.s-w.e>.7){out.push(cur);cur=[]}}
  return out.map((g,i)=>{let nx=out[i+1],s=g[0].s,end=nx?Math.min(nx[0].s,g.at(-1).e+1):g.at(-1).e+.6;return {words:g,s,e:Math.max(end,s+.25)}})}
const backOut=p=>1+2.70158*Math.pow(p-1,3)+1.70158*Math.pow(p-1,2);
const bounceOut=p=>p<1/2.75?7.5625*p*p:p<2/2.75?7.5625*(p-=1.5/2.75)*p+.75:p<2.5/2.75?7.5625*(p-=2.25/2.75)*p+.9375:7.5625*(p-=2.625/2.75)*p+.984375;
function rr(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h)}
function drawOn(g,t,L,W,H){let st=style(t),grp=groups(t).find(x=>L>=x.s&&L<x.e);if(!grp)return;
  let px=Math.max(4,st.size*H),txt=w=>st.caps?String(w.w).toUpperCase():String(w.w);g.save();g.font=fontCss(st,px);g.textBaseline='middle';g.textAlign='left';
  let space=g.measureText(' ').width,maxW=W*.86,lines=[[]],lw=[0];
  for(let w of grp.words){let ww=g.measureText(txt(w)).width,cur=lines.at(-1);if(cur.length&&lw.at(-1)+space+ww>maxW){lines.push([]);lw.push(0)}let ln=lines.at(-1);lw[lw.length-1]+=(ln.length?space:0)+ww;ln.push({w,ww})}
  let widest=Math.max(...lw),k=widest>maxW?maxW/widest:1,lh=px*1.22,blockH=lines.length*lh;
  let p=Math.min(1,Math.max(0,(L-grp.s)/.22)),sc=1,dy=0,al=1;
  if(st.anim==='pop')sc=.6+.4*backOut(p);else if(st.anim==='bounce')dy=-(1-bounceOut(Math.min(1,(L-grp.s)/.45)))*px*1.2;else if(st.anim==='fade')al=p;else if(st.anim==='slide'){dy=(1-p)*(1-p)*px*.7;al=p}
  g.globalAlpha*=al;g.translate(W/2,H*st.y/100+dy);g.scale(sc*k,sc*k);
  if(st.boxOpacity>0){g.save();g.globalAlpha*=st.boxOpacity;g.fillStyle=st.box;let bw=widest+px*.7,bh=blockH+px*.35;rr(g,-bw/2,-bh/2,bw,bh,px*.22);g.fill();g.restore()}
  let cur=null;for(let w of grp.words)if(w.s<=L)cur=w;
  lines.forEach((ln,li)=>{let x=-lw[li]/2,y=-blockH/2+lh*(li+.5);for(let {w,ww} of ln){let isCur=w===cur;
    if(st.hl==='reveal'&&w.s>L){x+=ww+space;continue}
    g.save();if(isCur&&st.emph){g.translate(x+ww/2,y);g.scale(1.12,1.12);g.translate(-(x+ww/2),-y)}
    if(isCur&&st.hl==='box'){g.fillStyle=st.hlColor;rr(g,x-px*.14,y-lh/2+px*.06,ww+px*.28,lh-px*.12,px*.18);g.fill()}
    if(st.shadow==='soft'){g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=px*.18;g.shadowOffsetY=px*.05}else if(st.shadow==='glow'){g.shadowColor=st.hlColor;g.shadowBlur=px*.5}
    if(st.strokeW>0){g.lineJoin='round';g.miterLimit=2;g.lineWidth=st.strokeW*px;g.strokeStyle=st.stroke;g.strokeText(txt(w),x,y);if(st.shadow!=='glow')g.shadowColor='transparent'}
    g.fillStyle=isCur&&st.hl==='color'?st.hlColor:(isCur&&st.hl==='box'&&st.color===st.hlColor?st.box:st.color);g.fillText(txt(w),x,y);g.restore();x+=ww+space}});
  g.restore()}
const drawNoCaptions=draw;draw=function(){drawNoCaptions();let W=canvas.width,H=canvas.height;for(let t of graphicTracks){if(!isCap(t)||t.hidden)continue;let L=playhead-t.offset;if(L<0||L>=t.length)continue;drawOn(ctx,t,L,W,H)}};
const exportNoCaptions=exportVideo;exportVideo=async function(...a){try{await Promise.all(graphicTracks.filter(isCap).map(t=>document.fonts.load(fontCss(style(t),64))))}catch{}return exportNoCaptions.apply(this,a)};

// Sample words for the style previews.
const SAMPLE={type:'captions',offset:0,length:9,words:[['This',0,.3],['is',.3,.5],['so',.5,.75],['good',.75,1.2]].map(([w,s,e])=>({w,s,e}))};
function previewCanvas(key,st){let c=document.createElement('canvas');c.width=240;c.height=135;let g=c.getContext('2d');g.fillStyle='#2a2a33';g.fillRect(0,0,240,135);
  drawOn(g,{...SAMPLE,style:{...(st||presetStyle(key)),y:52,size:Math.min(.2,(st||presetStyle(key)).size*2.4)}},1.15,240,135);return c.toDataURL()}

// ---------- editing ----------
let live=false;
const capTrack=id=>graphicTracks.find(t=>t.id===id&&isCap(t));
window.capSet=function(id,key,value,isLive){let t=capTrack(id);if(!t||exporting)return;if(!live)snapshot();live=!!isLive;t.style={...style(t),[key]:value};if(key!=='preset')t.style.preset='custom';
  if(key==='font')document.fonts?.load(fontCss(t.style,48)).then(draw,()=>{});draw();if(!isLive)renderGraphicTracks()};
window.capPreset=function(id,key){let t=capTrack(id);if(!t||!PRESETS[key])return;snapshot();live=false;t.style={...presetStyle(key),font:style(t).font};draw();renderGraphicTracks()};
window.capWord=function(id,i,value){let t=capTrack(id);if(!t)return;snapshot();value=String(value).trim();if(value)t.words[i].w=value;else t.words.splice(i,1);draw();renderGraphicTracks()};
window.capShift=function(id,d){let t=capTrack(id);if(!t)return;snapshot();t.words=t.words.map(w=>({...w,s:Math.max(0,Math.round((w.s+d)*100)/100),e:Math.max(.05,Math.round((w.e+d)*100)/100)}));draw();toast('Captions moved '+(d>0?'later':'earlier'))};
window.capSeek=function(id,i){let t=capTrack(id),w=t?.words[i];if(w&&!playing)seekTimeline(t.offset+w.s+.01)};

const range=(id,key,v,min,max,step,label,fmt)=>`<label>${label} <small class="cap-val">${fmt?fmt(v):v}</small><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" oninput="this.previousElementSibling.textContent=${fmt?`(${fmt.toString()})(+this.value)`:'this.value'};capSet('${id}','${key}',+this.value,true)" onchange="capSet('${id}','${key}',+this.value)"></label>`;
const color=(id,key,v,label)=>`<label>${label}<input type="color" value="${v}" oninput="capSet('${id}','${key}',this.value,true)" onchange="capSet('${id}','${key}',this.value)"></label>`;
const select=(id,key,v,label,opts,num)=>`<label>${label}<select onchange="capSet('${id}','${key}',${num?'+':''}this.value)">${opts.map(([k,l])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
const toggle=(id,key,v,label)=>`<label>${label}<button type="button" class="graphic-toggle" aria-pressed="${!!v}" onclick="capSet('${id}','${key}',${!v})">${v?'On':'Off'}</button></label>`;
function panel(t){let st=style(t),id=t.id;
  return `<div class="cap-panel"><div class="cap-head"><b>Captions</b><span class="sub">${t.words.length} words · tap a style, then fine-tune</span><button type="button" onclick="editGraphic('${id}','hidden',${!t.hidden})">${t.hidden?'Show':'Hide'}</button><button type="button" onclick="openCaptions()">Redo captions</button><button type="button" onclick="removeGraphic('${id}')">Delete captions</button></div>
  <div class="cap-presets">${Object.entries(PRESETS).map(([k,p])=>`<button type="button" class="cap-preset ${st.preset===k?'on':''}" onclick="capPreset('${id}','${k}')"><img alt="" src="${previewCanvas(k)}"><span>${p.label}</span></button>`).join('')}</div>
  <div class="extra-track-fields cap-fields">
  ${select(id,'font',st.font,'Font',FONTS.map(f=>[f.family,f.label]))}
  ${range(id,'size',st.size,.025,.14,.005,'Size',v=>Math.round(v*1000)/10+'%')}
  ${range(id,'maxWords',st.maxWords,1,8,1,'Words at a time')}
  ${range(id,'y',st.y,5,95,1,'Position',v=>v+'%')}
  ${color(id,'color',st.color,'Text colour')}
  ${select(id,'hl',st.hl,'Spoken word',[['none','No highlight'],['color','Colour the word'],['box','Box behind the word'],['reveal','Appear as spoken']])}
  ${color(id,'hlColor',st.hlColor,'Highlight colour')}
  ${select(id,'anim',st.anim,'Animation',[['none','None'],['pop','Pop'],['bounce','Bounce'],['fade','Fade'],['slide','Slide up']])}
  ${range(id,'strokeW',st.strokeW,0,.3,.01,'Outline',v=>v?Math.round(v*100)+'%':'Off')}
  ${color(id,'stroke',st.stroke,'Outline colour')}
  ${range(id,'boxOpacity',st.boxOpacity,0,1,.05,'Background box',v=>v?Math.round(v*100)+'%':'Off')}
  ${color(id,'box',st.box,'Box colour')}
  ${select(id,'shadow',st.shadow,'Shadow',[['none','None'],['soft','Soft'],['glow','Glow (highlight colour)']])}
  ${toggle(id,'caps',st.caps,'ALL CAPS')}${toggle(id,'bold',st.bold,'Bold')}${toggle(id,'italic',st.italic,'Italic')}${toggle(id,'emph',st.emph,'Grow spoken word')}
  </div>
  <div class="cap-sync"><span class="sub">Timing</span><button type="button" onclick="capShift('${id}',-.1)">◀ 0.1s earlier</button><button type="button" onclick="capShift('${id}',.1)">0.1s later ▶</button></div>
  <p class="sub cap-wordhelp">Fix words below. Tap a word to jump to it; clear a word to remove it.</p>
  <div class="cap-words">${t.words.map((w,i)=>`<input type="text" value="${esc(w.w)}" size="${Math.max(2,String(w.w).length)}" title="${(t.offset+w.s).toFixed(1)}s" aria-label="Word ${i+1}" onfocus="capSeek('${id}',${i})" onchange="capWord('${id}',${i},this.value)">`).join('')}</div></div>`}
const renderNoCaptions=renderGraphicTracks;renderGraphicTracks=function(){renderNoCaptions();for(let t of graphicTracks){if(!isCap(t))continue;let box=document.querySelector(`#graphicTracks .strip-row[data-trackid="${t.id}"] .strip-options`);if(box)box.innerHTML=panel(t)}};

// Splitting a caption strip: the copy starts later, so pull its word times back by the same amount.
const splitNoCaptions=splitStripAt;splitStripAt=async function(kind,id,at){let g=kind==='graphic'&&capTrack(id),old=g&&g.offset,r=await splitNoCaptions(kind,id,at);
  if(g){let c=graphicTracks[graphicTracks.indexOf(g)+1];if(isCap(c)&&c!==g){let d=c.offset-old;c.words=c.words.map(w=>({...w,s:w.s-d,e:w.e-d}));renderGraphicTracks();draw()}}return r};

// ---------- speech recognition ----------
const WORKER=`let tr=null,key='';
const load=async(T,model,device)=>T.pipeline('automatic-speech-recognition',model,{device,dtype:device==='webgpu'?{encoder_model:'fp32',decoder_model_merged:'q4'}:'q8',
  progress_callback:p=>{if(p.status==='progress'&&p.total)self.postMessage({type:'dl',file:p.file,loaded:p.loaded,total:p.total})}});
self.onmessage=async e=>{let m=e.data;try{
  const T=await import('${LIB}');T.env.allowLocalModels=false;
  if(!tr||key!==m.key){tr=null;let err;for(let model of m.models){for(let device of (m.gpu?['webgpu','wasm']:['wasm'])){try{tr=await load(T,model,device);key=m.key;self.postMessage({type:'ready',model,device});break}catch(x){err=x}}if(tr)break}if(!tr)throw err}
  const opts={task:'transcribe'};if(m.language)opts.language=m.language;
  let out,mode='word';try{out=await tr(m.audio,{...opts,return_timestamps:'word'})}catch(x){mode='segment';out=await tr(m.audio,{...opts,return_timestamps:true})}
  self.postMessage({type:'done',mode,chunks:(out.chunks||[]).map(c=>({text:c.text,ts:c.timestamp})),text:out.text||''});
}catch(x){self.postMessage({type:'error',message:String(x&&x.message||x)})}};`;
let worker=null;
function ask(msg,onProgress){return new Promise((res,rej)=>{if(!worker){let url=URL.createObjectURL(new Blob([WORKER],{type:'text/javascript'}));worker=new Worker(url,{type:'module'})}
  worker.onmessage=e=>{let m=e.data;if(m.type==='dl'||m.type==='ready')onProgress(m);else if(m.type==='done')res(m);else if(m.type==='error')rej(Error(m.message))};
  worker.onerror=e=>rej(Error(e.message||'The speech engine could not start.'));worker.postMessage(msg,[msg.audio.buffer])})}

// Decode a clip's sound straight to 16 kHz (decodeAudioData resamples to the context's rate), mono, trimmed to the clip.
const decoded=new Map();
async function clipAudio(c){let a=asset(c);if(!a?.file)throw Error('Can’t find the file for '+(a?.name||'a clip'));
  if(!decoded.has(a.id)){let buf;try{buf=await new OfflineAudioContext(1,1,16000).decodeAudioData(await a.file.arrayBuffer())}catch{throw Error((a.name||'A clip')+' has no sound we can read.')}
    // Some browsers hand back the file's own sample rate; resample so 16000 samples really is one second.
    if(buf.sampleRate!==16000){let oc=new OfflineAudioContext(buf.numberOfChannels,Math.ceil(buf.duration*16000),16000),src=oc.createBufferSource();src.buffer=buf;src.connect(oc.destination);src.start();buf=await oc.startRendering()}
    let n=buf.length,mono=new Float32Array(n);for(let ch=0;ch<buf.numberOfChannels;ch++){let d=buf.getChannelData(ch);for(let i=0;i<n;i++)mono[i]+=d[i]/buf.numberOfChannels}decoded.set(a.id,mono)}
  let all=decoded.get(a.id);return all.slice(Math.floor(c.in*16000),Math.ceil(c.out*16000))}
// The speech library's own splitting of audio over 30 s gets word times wrong (they drift later and
// later; transformers.js issue 1358), so send pieces of at most 28 s, cut at the quietest 0.1 s
// between 18 and 28 s so a word is rarely split, and add each piece's start time ourselves.
function pieces(audio){const SR=16000,MAX=28*SR,MIN=18*SR,F=SR/10,out=[];let pos=0;
  while(audio.length-pos>MAX){let best=pos+MAX,low=Infinity;for(let f=pos+MIN;f+F<=pos+MAX;f+=F/2){let e=0;for(let i=f;i<f+F;i+=4)e+=audio[i]*audio[i];if(e<low){low=e;best=f+F/2}}
    best=Math.round(best);out.push({at:pos/SR,audio:audio.slice(pos,best)});pos=best}
  out.push({at:pos/SR,audio:audio.slice(pos)});return out}
// Turn engine output into words with times inside a clip of length dur.
function toWords(r,dur){let words=[];
  if(r.mode==='word')for(let c of r.chunks){let w=String(c.text).trim();if(!w)continue;let [s,e]=c.ts||[];s=Number.isFinite(s)?s:null;e=Number.isFinite(e)?e:null;words.push({w,s,e})}
  let good=words.length&&words.filter(w=>w.s!=null).length>=words.length*.8&&new Set(words.map(w=>w.s)).size>=Math.max(1,words.length/3)&&Math.max(...words.map(w=>w.s??0))<=dur+1;
  if(good){words.forEach((w,i)=>{if(w.s==null)w.s=i?words[i-1].e??words[i-1].s:0;if(w.e==null||w.e<=w.s)w.e=Math.min(dur,(words[i+1]?.s??w.s+.4))});return words}
  // Sentence timing only (or broken word timing): spread each sentence's words across it by length.
  let segs=r.mode==='segment'&&r.chunks.length?r.chunks:[{text:r.text||words.map(w=>w.w).join(' '),ts:[0,dur]}],out=[];
  for(let sg of segs){let ws=String(sg.text).trim().split(/\s+/).filter(Boolean);if(!ws.length)continue;let [s,e]=sg.ts||[0,dur];s=Number.isFinite(s)?s:0;e=Number.isFinite(e)&&e>s?e:Math.min(dur,s+ws.length*.35);
    let total=ws.reduce((n,w)=>n+w.length+1,0),at=s;for(let w of ws){let len=(e-s)*(w.length+1)/total;out.push({w,s:at,e:at+len});at+=len}}
  return out}

// ---------- dialog ----------
let chosen='pop';
function dialog(){let d=document.getElementById('capDialog');if(d)return d;d=document.createElement('dialog');d.id='capDialog';d.className='closable';
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>✨ Auto captions</h2><p class="sub">We listen to your video and write the words, timed to when they’re said. It all happens on this device — nothing is uploaded.</p>
  <div class="cap-step"><b>Caption style</b><div class="cap-presets" id="capStyles"></div></div>
  <div class="row"><label>Language<select id="capLang">${LANGS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>Speed<select id="capModel"><option value="better">Better accuracy</option><option value="fast">Faster</option></select></label></div>
  <p class="sub" id="capNote">The first time, your browser downloads the speech engine (a one-time download). After that it’s saved. Phones are slower than computers.</p>
  <div id="capWork" hidden><progress id="capProg" max="1" style="width:100%"></progress><p class="sub" id="capStatus" aria-live="polite"></p></div>
  <p id="capErr" role="alert" style="color:#ef6f7f;min-height:18px;margin:6px 0"></p>
  <div class="row"><button type="button" id="capCancel">Cancel</button><button type="button" class="primary" id="capGo">Create captions</button></div>`;
  document.body.appendChild(d);
  d.querySelector('.dialog-x').onclick=()=>cancel(true);d.querySelector('#capCancel').onclick=()=>cancel(true);
  d.addEventListener('cancel',e=>{e.preventDefault();cancel(true)});
  d.querySelector('#capStyles').innerHTML=Object.entries(PRESETS).map(([k,p])=>`<button type="button" class="cap-preset" data-k="${k}"><img alt="" src="${previewCanvas(k)}"><span>${p.label}</span></button>`).join('');
  d.querySelector('#capStyles').onclick=e=>{let b=e.target.closest('.cap-preset');if(!b)return;chosen=b.dataset.k;syncStyles()};
  d.querySelector('#capGo').onclick=run;
  try{let s=JSON.parse(localStorage.getItem('tapshop-captions')||'{}');if(PRESETS[s.style])chosen=s.style;if(s.lang!=null)d.querySelector('#capLang').value=s.lang;if(MODELS[s.model])d.querySelector('#capModel').value=s.model}catch{}
  return d}
function syncStyles(){document.querySelectorAll('#capStyles .cap-preset').forEach(b=>b.classList.toggle('on',b.dataset.k===chosen))}
let busy=false,cancelled=false;
function cancel(close){if(busy){cancelled=true;worker?.terminate();worker=null;busy=false;toast('Captions cancelled.')}if(close)document.getElementById('capDialog')?.close();setBusy(false)}
function setBusy(on){let d=document.getElementById('capDialog');if(!d)return;d.querySelector('#capWork').hidden=!on;d.querySelector('#capGo').disabled=on;d.querySelector('#capNote').hidden=on;d.querySelectorAll('select,.cap-preset').forEach(x=>x.disabled=on)}
window.openCaptions=function(){if(exporting)return;pause();if(!clips.length){toast('Add a video first, then make captions.');return}let d=dialog();syncStyles();d.querySelector('#capErr').textContent='';setBusy(false);
  let old=graphicTracks.find(isCap);d.querySelector('#capGo').textContent=old?'Replace captions':'Create captions';d.showModal()};

async function run(){let d=dialog(),status=d.querySelector('#capStatus'),prog=d.querySelector('#capProg'),err=d.querySelector('#capErr');err.textContent='';
  let lang=d.querySelector('#capLang').value,q=d.querySelector('#capModel').value;try{localStorage.setItem('tapshop-captions',JSON.stringify({style:chosen,lang,model:q}))}catch{}
  busy=true;cancelled=false;setBusy(true);let files={},say=(s,v)=>{status.textContent=s;if(v==null)prog.removeAttribute('value');else prog.value=v};
  say('Starting the speech engine…');let all=[],list=clips.map((c,i)=>({c,i,start:startOf(i)}));
  try{for(let k=0;k<list.length;k++){let {c,i,start}=list[k];if(cancelled)return;
      say(`Getting the sound from clip ${k+1} of ${list.length}…`);let audio;try{audio=await clipAudio(c)}catch(x){toast(x.message);continue}
      if(audio.length<1600)continue;let parts=pieces(audio);
      for(let pi=0;pi<parts.length;pi++){let part=parts[pi],dur=part.audio.length/16000,where=`clip ${k+1} of ${list.length}`+(parts.length>1?`, part ${pi+1} of ${parts.length}`:'');if(dur<.1)continue;
      let r=await ask({key:q,models:MODELS[q],gpu:'gpu' in navigator,language:lang,audio:part.audio},m=>{if(m.type==='dl'){files[m.file]=[m.loaded,m.total];let l=0,t=0;for(let [a,b] of Object.values(files)){l+=a;t+=b}say(`Downloading the speech engine (first time only)… ${Math.round(l/t*100)}%`,l/t)}else say(`Listening to ${where}… (this can take a minute)`)});
      if(cancelled)return;say(`Listening to ${where}… (this can take a minute)`);
      for(let w of toWords(r,dur)){let s=start+(part.at+Math.min(w.s,dur))/c.speed,e=start+(part.at+Math.min(w.e,dur))/c.speed;if(s<start+duration(c)-.02)all.push({w:w.w,s:Math.round(s*100)/100,e:Math.round(Math.min(e,start+duration(c))*100)/100})}}}
    if(cancelled)return;
    if(!all.length){err.textContent='We couldn’t hear any words. Check the video has speech and the right language is picked.';return}
    all.sort((a,b)=>a.s-b.s);snapshot();let old=graphicTracks.find(isCap),keepStyle=old&&old.style?.preset===chosen?old.style:null;graphicTracks=graphicTracks.filter(t=>!isCap(t));
    let t={id:uid(),type:'captions',name:'Captions',offset:0,length:Math.max(total(),all.at(-1).e+.6),hidden:false,words:all,style:keepStyle||presetStyle(chosen)};
    graphicTracks.push(t);expandedStrip=t.id;renderGraphicTracks();draw();d.close();toast(`Captions added — ${all.length} words. Tap the Captions strip to style or fix them.`);
    requestAnimationFrame(()=>document.querySelector(`#graphicTracks .strip-row[data-trackid="${t.id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}))}
  catch(x){if(!cancelled){err.textContent='Captions didn’t work: '+(x.message||x)+'. Check your internet connection for the first download, then try again.';worker?.terminate();worker=null}}
  finally{busy=false;setBusy(false)}}

// ---------- styles and toolbar ----------
let css=document.createElement('style');css.textContent=`.duration-strip[data-kind="captions"]{background:linear-gradient(#c2557a,#8a3354);border-color:#f19bbb}
.cap-panel{display:flex;flex-direction:column;gap:10px;padding:4px 0 8px;width:100%}
.cap-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.cap-head .sub{flex:1;min-width:140px}
.cap-presets{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px}
.cap-preset{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px!important;border-radius:12px;width:112px}
.cap-preset img{width:100px;height:56px;border-radius:8px;display:block}.cap-preset span{font-size:12px}
.cap-preset.on{outline:2px solid var(--ts-primary,#171717);outline-offset:1px}
.cap-fields{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px 12px}
.cap-fields label{display:flex;flex-direction:column;gap:4px;font-size:12px}.cap-val{opacity:.7;font-size:11px}
.cap-panel .cap-fields label{width:auto!important;max-width:none!important;flex:none!important}.cap-panel .cap-fields select,.cap-panel .cap-fields input[type=range]{width:100%!important;min-width:0;max-width:none!important}.cap-fields .graphic-toggle{align-self:flex-start;min-width:64px}
.cap-sync{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cap-words{display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow:auto;padding:2px}
.cap-words input{width:auto!important;min-width:0;padding:5px 7px!important;font-size:13px;border-radius:8px!important}
#capDialog{width:min(560px,94vw)}#capDialog .row{display:flex;gap:10px;flex-wrap:wrap}#capDialog .row label{flex:1;min-width:150px;display:flex;flex-direction:column;gap:4px}
#capDialog .row:last-child{justify-content:flex-end;margin-top:6px}#capDialog .cap-step{margin:12px 0}`;document.head.appendChild(css);
let btn=document.createElement('button');btn.type='button';btn.textContent='✨ Captions';btn.title='Auto captions';btn.onclick=()=>openCaptions();
let smart=[...document.querySelectorAll('.timebar button')].find(b=>/Smart tools/.test(b.textContent));(smart||document.querySelector('.timebar button'))?.after(btn);
})();
