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
const BASE={font:'system-ui',bold:true,italic:false,caps:false,size:.06,maxWords:3,color:'#ffffff',hl:'none',hlColor:'#ffe14d',stroke:'#000000',strokeW:0,box:'#000000',boxOpacity:0,shadow:'soft',anim:'none',emph:false,emoji:'off',y:70};
const PRESETS={
  pop:{label:'Word pop',maxWords:2,size:.075,caps:true,hl:'color',hlColor:'#ffe14d',strokeW:.16,anim:'pop',emph:true,y:62},
  karaoke:{label:'Karaoke',maxWords:5,size:.05,hl:'color',hlColor:'#22d3ee',strokeW:.14,y:72},
  classic:{label:'Classic',maxWords:7,size:.036,bold:false,boxOpacity:.6,shadow:'none',anim:'fade',y:84},
  boxed:{label:'Bold box',maxWords:3,size:.06,caps:true,color:'#111111',hl:'box',hlColor:'#ffffff',box:'#ffd84d',boxOpacity:1,shadow:'none',anim:'pop',y:65},
  bounce:{label:'Bounce',maxWords:1,size:.1,caps:true,strokeW:.18,anim:'bounce',y:55},
  reveal:{label:'Type on',maxWords:4,size:.055,hl:'reveal',strokeW:.14,y:70},
  neon:{label:'Neon',maxWords:3,size:.065,caps:true,hl:'color',hlColor:'#ff4fd8',shadow:'glow',anim:'fade',y:60},
  highlight:{label:'Highlight',maxWords:4,size:.055,hl:'box',hlColor:'#7c3aed',strokeW:.1,y:70}};
// Your own styles live in tapshop-caption-styles as [{id, name, style}] and use preset keys 'my:<id>'.
const mine=()=>{try{let a=JSON.parse(localStorage.getItem('tapshop-caption-styles')||'[]');return Array.isArray(a)?a.filter(x=>x&&x.id&&x.style):[]}catch{return []}};
const saveMine=a=>{try{localStorage.setItem('tapshop-caption-styles',JSON.stringify(a.slice(0,12)))}catch{toast('Couldn’t save that style on this device.')}};
const myPresets=()=>mine().map(m=>['my:'+m.id,{label:m.name}]);
const allPresets=()=>[...Object.entries(PRESETS),...myPresets()];
const presetStyle=k=>{if(String(k).startsWith('my:')){let m=mine().find(x=>'my:'+x.id===k);return {...BASE,...(m?.style||{}),preset:m?k:'custom'}}let p={...BASE,...PRESETS[k]};delete p.label;p.preset=k;return p};
const hasPreset=k=>!!(PRESETS[k]||mine().some(x=>'my:'+x.id===k));
// Auto emoji: a word that matches one of these gets its emoji, shown above the caption or after the word.
const EMOJI=[[/^(love|loved|loving|heart|adore)/,'❤️'],[/^(obsess|gorgeous|beautiful|pretty|stunning)/,'😍'],[/^(money|cash|cheap|price|dollar|pay|paid|save|saving|budget)/,'💰'],[/^(fire|hot|lit|spicy)/,'🔥'],[/^(wow|amazing|insane|crazy|unbelievable|mind)/,'🤯'],[/^(laugh|funny|lol|hilarious|joke)/,'😂'],
  [/^(eat|food|delicious|tasty|yum|recipe|cook)/,'😋'],[/^(sleep|tired|bed|night)/,'😴'],[/^(skin|glow|shine|sparkle|magic|clean)/,'✨'],[/^(sale|deal|discount|off$|code)/,'🏷️'],[/^(buy|bought|shop|shopping|order|cart)/,'🛍️'],[/^(time|minute|hour|fast|quick|today)/,'⏰'],
  [/^(phone|app|online|link)/,'📱'],[/^(music|song|sing|dance)/,'🎵'],[/^(idea|tip|hack|trick|learn)/,'💡'],[/^(happy|smile|glad|fun)/,'😊'],[/^(sad|cry|sorry|miss)/,'😢'],[/^(think|wonder|maybe|question|why|how)/,'🤔'],
  [/^(look|see|watch|eyes|check)/,'👀'],[/^(yes|works|worked|right|correct|true)/,'✅'],[/^(no|never|wrong|fake|bad|worst|stop)/,'❌'],[/^(best|win|winner|top|number)/,'🏆'],[/^(new|launch|drop|introduc)/,'🆕'],[/^(gift|present|birthday|giveaway)/,'🎁'],
  [/^(coffee|morning|breakfast)/,'☕'],[/^(sun|summer|beach|vacation|holiday)/,'☀️'],[/^(home|house|room)/,'🏠'],[/^(work|job|business|office)/,'💼'],[/^(travel|trip|flight|fly)/,'✈️'],[/^(gym|workout|strong|muscle|fit)/,'💪'],
  [/^(party|celebrat|congrat)/,'🎉'],[/^(perfect|exactly|ok|okay)/,'👌'],[/^(hair)/,'💇'],[/^(makeup|lipstick|lip)/,'💄'],[/^(water|drink|hydrat)/,'💧'],[/^(secret|quiet)/,'🤫'],[/^(wait|soon|later)/,'⏳'],[/^(hello|hi|hey)$/,'👋'],[/^(thank|grateful|please)/,'🙏'],
  [/^(dog|puppy)/,'🐶'],[/^(cat|kitten)/,'🐱'],[/^(baby|kid|kids)/,'👶'],[/^(car|drive)/,'🚗'],[/^(free)$/,'🆓'],[/^(rich|million)/,'🤑']];
const emojiFor=w=>{let k=String(w.w).toLowerCase().replace(/[^a-z$']/g,'').replace(/'s$/,'');if(k.length<2)return null;for(let [re,e] of EMOJI)if(re.test(k))return e;return null};
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
  let px=Math.max(4,st.size*H),txt0=w=>st.caps?String(w.w).toUpperCase():String(w.w),txt=w=>{let e=st.emoji==='after'&&emojiFor(w);return e?txt0(w)+' '+e:txt0(w)};g.save();g.font=fontCss(st,px);g.textBaseline='middle';g.textAlign='left';
  let space=g.measureText(' ').width*(st.emph?1.6:1),maxW=W*.86,lines=[[]],lw=[0];
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
  if(st.emoji==='above'){let hit=null;for(let w of grp.words)if(w.s<=L&&emojiFor(w))hit=w;if(hit){let q=Math.min(1,Math.max(0,(L-hit.s)/.25)),es=px*1.25*(.4+.6*backOut(q));g.save();g.shadowColor='transparent';g.font=`${es}px system-ui`;g.textAlign='center';g.fillText(emojiFor(hit),0,-blockH/2-px*.8);g.restore()}}
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
window.capPreset=function(id,key){let t=capTrack(id);if(!t||!hasPreset(key))return;snapshot();live=false;t.style=String(key).startsWith('my:')?presetStyle(key):{...presetStyle(key),font:style(t).font};document.fonts?.load(fontCss(t.style,48)).then(draw,()=>{});draw();renderGraphicTracks()};
window.capSaveStyle=function(id){let t=capTrack(id);if(!t)return;let list=mine(),name=prompt('Name this caption style',`My style ${list.length+1}`);if(name==null)return;name=String(name).trim().slice(0,24)||`My style ${list.length+1}`;
  if(list.length>=12){toast('You can keep up to 12 styles. Delete one first.');return}let sid=uid(),st={...style(t)};delete st.preset;list.push({id:sid,name,style:st});saveMine(list);t.style={...style(t),preset:'my:'+sid};renderGraphicTracks();toast('Saved “'+name+'”. It’s in your styles now.')};
window.capDeleteStyle=function(key,ev){ev?.stopPropagation();let list=mine(),m=list.find(x=>'my:'+x.id===key);if(!m||!confirm('Delete your style “'+m.name+'”?'))return;saveMine(list.filter(x=>x!==m));for(let t of graphicTracks)if(isCap(t)&&t.style?.preset===key)t.style={...t.style,preset:'custom'};renderGraphicTracks();if(document.getElementById('capStyles'))fillStyles()};
window.capWord=function(id,i,value){let t=capTrack(id);if(!t)return;snapshot();value=String(value).trim();if(value)t.words[i].w=value;else t.words.splice(i,1);draw();renderGraphicTracks()};
window.capShift=function(id,d){let t=capTrack(id);if(!t)return;snapshot();t.words=t.words.map(w=>({...w,s:Math.max(0,Math.round((w.s+d)*100)/100),e:Math.max(.05,Math.round((w.e+d)*100)/100)}));draw();toast('Captions moved '+(d>0?'later':'earlier'))};
window.capSeek=function(id,i){let t=capTrack(id),w=t?.words[i];if(w&&!playing)seekTimeline(t.offset+w.s+.01)};

const range=(id,key,v,min,max,step,label,fmt)=>`<label>${label} <small class="cap-val">${fmt?fmt(v):v}</small><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" oninput="this.previousElementSibling.textContent=${fmt?`(${fmt.toString()})(+this.value)`:'this.value'};capSet('${id}','${key}',+this.value,true)" onchange="capSet('${id}','${key}',+this.value)"></label>`;
const color=(id,key,v,label)=>`<label>${label}<input type="color" value="${v}" oninput="capSet('${id}','${key}',this.value,true)" onchange="capSet('${id}','${key}',this.value)"></label>`;
const select=(id,key,v,label,opts,num)=>`<label>${label}<select onchange="capSet('${id}','${key}',${num?'+':''}this.value)">${opts.map(([k,l])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
const toggle=(id,key,v,label)=>`<label>${label}<button type="button" class="graphic-toggle" aria-pressed="${!!v}" onclick="capSet('${id}','${key}',${!v})">${v?'On':'Off'}</button></label>`;
function panel(t){let st=style(t),id=t.id;
  return `<div class="cap-panel"><div class="cap-head"><b>Captions</b><span class="sub">${t.words.length} words · tap a style, then fine-tune</span><button type="button" onclick="editGraphic('${id}','hidden',${!t.hidden})">${t.hidden?'Show':'Hide'}</button><button type="button" onclick="capSaveStyle('${id}')">★ Save my style</button><button type="button" class="cap-redo" onclick="capRedo('${id}')">🔄 Redo captions</button><button type="button" onclick="removeGraphic('${id}')">Delete captions</button></div>
  <p class="cap-group">Styles</p><div class="cap-presets">${(list=>list.map(([k,p])=>`<span class="cap-pwrap"><button type="button" class="cap-preset ${st.preset===k?'on':''}" onclick="capPreset('${id}','${k}')"><img alt="" src="${previewCanvas(k)}"><span>${esc(p.label)}</span></button>${k.startsWith('my:')?`<button type="button" class="cap-pdel" aria-label="Delete ${esc(p.label)}" title="Delete this style" onclick="capDeleteStyle('${k}',event)">×</button>`:''}</span>`).join(''))(Object.entries(PRESETS))}</div>
  ${myPresets().length?`<p class="cap-group">★ My saved styles</p><div class="cap-presets">${(list=>list.map(([k,p])=>`<span class="cap-pwrap"><button type="button" class="cap-preset ${st.preset===k?'on':''}" onclick="capPreset('${id}','${k}')"><img alt="" src="${previewCanvas(k)}"><span>${esc(p.label)}</span></button>${k.startsWith('my:')?`<button type="button" class="cap-pdel" aria-label="Delete ${esc(p.label)}" title="Delete this style" onclick="capDeleteStyle('${k}',event)">×</button>`:''}</span>`).join(''))(myPresets())}</div>`:`<p class="sub cap-mytip">Tip: style your captions the way you like, then tap ★ Save my style to keep it here.</p>`}
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
  ${select(id,'emoji',st.emoji,'Auto emoji',[['off','Off'],['above','Above the words'],['after','After the word']])}
  ${select(id,'shadow',st.shadow,'Shadow',[['none','None'],['soft','Soft'],['glow','Glow (highlight colour)']])}
  ${toggle(id,'caps',st.caps,'ALL CAPS')}${toggle(id,'bold',st.bold,'Bold')}${toggle(id,'italic',st.italic,'Italic')}${toggle(id,'emph',st.emph,'Grow spoken word')}
  </div>
  <div class="cap-sync"><span class="sub">Timing</span><button type="button" onclick="capShift('${id}',-.1)">◀ 0.1s earlier</button><button type="button" onclick="capShift('${id}',.1)">0.1s later ▶</button><button type="button" class="cap-redo" onclick="capRedo('${id}')">🔄 Redo captions</button></div>
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
  out.est=true;return out}

// ---------- dialog ----------
let chosen='pop';
function dialog(){let d=document.getElementById('capDialog');if(d)return d;d=document.createElement('dialog');d.id='capDialog';d.className='closable';
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>✨ Auto captions</h2><p class="sub">We listen to your video and write the words, timed to when they’re said. It all happens on this device — nothing is uploaded.</p>
  <div class="cap-step" id="capStyleBox"><b>Caption style</b><div class="cap-presets" id="capStyles"></div><div id="capMyWrap" hidden><b>★ My saved styles</b><div class="cap-presets" id="capMyStyles"></div></div></div>
  <div class="row"><label>Language<select id="capLang">${LANGS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>
  <label>Speed<select id="capModel"><option value="better">Better accuracy</option><option value="fast">Faster</option></select></label></div>
  <p class="sub" id="capNote">The first time, your browser downloads the speech engine (a one-time download). After that it’s saved. Phones are slower than computers.</p>
  <div id="capWork" hidden><progress id="capProg" max="1" style="width:100%"></progress><p class="sub" id="capStatus" aria-live="polite"></p></div>
  <p id="capErr" role="alert" style="color:#ef6f7f;min-height:18px;margin:6px 0"></p>
  <div class="row"><button type="button" id="capCancel">Cancel</button><button type="button" class="primary" id="capGo">Create captions</button></div>`;
  document.body.appendChild(d);
  d.querySelector('.dialog-x').onclick=()=>cancel(true);d.querySelector('#capCancel').onclick=()=>cancel(true);
  d.addEventListener('cancel',e=>{e.preventDefault();cancel(true)});

  d.querySelector('#capStyleBox').onclick=e=>{let b=e.target.closest('.cap-preset');if(!b)return;chosen=b.dataset.k;syncStyles()};
  d.querySelector('#capGo').onclick=run;
  try{let s=JSON.parse(localStorage.getItem('tapshop-captions')||'{}');if(hasPreset(s.style))chosen=s.style;if(s.lang!=null)d.querySelector('#capLang').value=s.lang;if(MODELS[s.model])d.querySelector('#capModel').value=s.model}catch{}
  return d}
function fillStyles(){let box=document.getElementById('capStyles');if(!box)return;if(!hasPreset(chosen))chosen='pop';let chips=list=>list.map(([k,p])=>`<button type="button" class="cap-preset" data-k="${esc(k)}"><img alt="" src="${previewCanvas(k)}"><span>${esc(p.label)}</span></button>`).join('');
  box.innerHTML=chips(Object.entries(PRESETS));let my=myPresets();document.getElementById('capMyStyles').innerHTML=chips(my);document.getElementById('capMyWrap').hidden=!my.length;syncStyles()}
function syncStyles(){document.querySelectorAll('#capStyleBox .cap-preset').forEach(b=>b.classList.toggle('on',b.dataset.k===chosen))}
let busy=false,cancelled=false;
function cancel(close){if(busy){cancelled=true;worker?.terminate();worker=null;busy=false;toast('Captions cancelled.')}if(close)document.getElementById('capDialog')?.close();setBusy(false)}
function setBusy(on){let d=document.getElementById('capDialog');if(!d)return;d.querySelector('#capWork').hidden=!on;d.querySelector('#capGo').disabled=on;d.querySelector('#capNote').hidden=on;d.querySelectorAll('select,.cap-preset').forEach(x=>x.disabled=on)}
window.openCaptions=function(){if(exporting)return;pause();if(!clips.length){toast('Add a video first, then make captions.');return}let d=dialog();fillStyles();d.querySelector('#capErr').textContent='';setBusy(false);
  let old=graphicTracks.find(isCap);d.querySelector('#capGo').textContent=old?'Replace captions':'Create captions';d.showModal()};

// Listens to every clip on the main timeline and returns its words placed on the timeline (null if cancelled).
async function listenAll(lang,q,say){let files={},all=[],list=clips.map((c,i)=>({c,i,start:startOf(i)}));
  say('Starting the speech engine…');
  for(let k=0;k<list.length;k++){let {c,i,start}=list[k];if(cancelled)return;
      say(`Getting the sound from clip ${k+1} of ${list.length}…`);let audio;try{audio=await clipAudio(c)}catch(x){toast(x.message);continue}
      if(audio.length<1600)continue;let parts=pieces(audio);
      for(let pi=0;pi<parts.length;pi++){let part=parts[pi],dur=part.audio.length/16000,where=`clip ${k+1} of ${list.length}`+(parts.length>1?`, part ${pi+1} of ${parts.length}`:'');if(dur<.1)continue;
      let r=await ask({key:q,models:MODELS[q],gpu:'gpu' in navigator,language:lang,audio:part.audio},m=>{if(m.type==='dl'){files[m.file]=[m.loaded,m.total];let l=0,t=0;for(let [a,b] of Object.values(files)){l+=a;t+=b}say(`Downloading the speech engine (first time only)… ${Math.round(l/t*100)}%`,l/t)}else say(`Listening to ${where}… (this can take a minute)`)});
      if(cancelled)return;say(`Listening to ${where}… (this can take a minute)`);
      for(let w of toWords(r,dur)){let s=start+(part.at+Math.min(w.s,dur))/c.speed,e=start+(part.at+Math.min(w.e,dur))/c.speed;if(s<start+duration(c)-.02)all.push({w:w.w,s:Math.round(s*100)/100,e:Math.round(Math.min(e,start+duration(c))*100)/100})}}}
  return cancelled?null:all.sort((a,b)=>a.s-b.s)}
// Puts the words on the timeline as the one Captions track, replacing an old one (its style is kept when the preset matches).
function placeCaptions(all,preset){snapshot();let old=graphicTracks.find(isCap),keepStyle=old&&old.style?.preset===preset?old.style:null;graphicTracks=graphicTracks.filter(t=>!isCap(t));
  let t={id:uid(),type:'captions',name:'Captions',offset:0,length:Math.max(total(),all.at(-1).e+.6),hidden:false,words:all,style:keepStyle||presetStyle(preset)};
  graphicTracks.push(t);renderGraphicTracks();draw();return t}
async function run(){let d=dialog(),status=d.querySelector('#capStatus'),prog=d.querySelector('#capProg'),err=d.querySelector('#capErr');err.textContent='';
  let lang=d.querySelector('#capLang').value,q=d.querySelector('#capModel').value;try{localStorage.setItem('tapshop-captions',JSON.stringify({style:chosen,lang,model:q}))}catch{}
  busy=true;cancelled=false;setBusy(true);let say=(s,v)=>{status.textContent=s;if(v==null)prog.removeAttribute('value');else prog.value=v};
  try{let all=await listenAll(lang,q,say);
    if(!all)return;
    if(!all.length){err.textContent='We couldn’t hear any words. Check the video has speech and the right language is picked.';return}
    let t=placeCaptions(all,chosen);expandedStrip=t.id;renderGraphicTracks();d.close();toast(`Captions added — ${all.length} words. Tap the Captions strip to style or fix them.`);
    requestAnimationFrame(()=>document.querySelector(`#graphicTracks .strip-row[data-trackid="${t.id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}))}
  catch(x){if(!cancelled){err.textContent='Captions didn’t work: '+(x.message||x)+'. Check your internet connection for the first download, then try again.';worker?.terminate();worker=null}}
  finally{busy=false;setBusy(false)}}

// Captions without the dialog, for makers like the B-roll builder: uses the last settings from the Captions
// dialog (or Pop, English, Fast). say(text) reports progress. Resolves to the number of words added (0 = none heard).
const lastSettings=()=>{let s={};try{s=JSON.parse(localStorage.getItem('tapshop-captions')||'{}')}catch{}
  return {preset:hasPreset(s.style)?s.style:'pop',lang:s.lang!=null?s.lang:'english',q:MODELS[s.model]?s.model:'fast'}};
window.veAutoCaptions=async function(say=()=>{}){if(busy||exporting||!clips.length)return 0;
  let {preset,lang,q}=lastSettings();
  busy=true;cancelled=false;try{let all=await listenAll(lang,q,t=>say(t));if(!all||!all.length)return 0;placeCaptions(all,preset);return all.length}
  catch(x){worker?.terminate();worker=null;throw x}finally{busy=false}};

// Words in one stretch of a video file ({assetId, in, out}, seconds), with times in the file's own seconds.
// [] when it has no sound; the array's .est is true when only sentence timing was available. Throws if the engine can't run.
window.veClipWords=async function(c,say=()=>{}){if(busy)throw Error('Captions are busy.');let {lang,q}=lastSettings(),files={};
  busy=true;cancelled=false;try{let audio;try{audio=await clipAudio({speed:1,...c})}catch{return []}if(audio.length<1600)return [];
    let out=[];out.est=false;
    for(let part of pieces(audio)){let dur=part.audio.length/16000;if(dur<.1)continue;
      let r=await ask({key:q,models:MODELS[q],gpu:'gpu' in navigator,language:lang,audio:part.audio},m=>{if(m.type==='dl'){files[m.file]=[m.loaded,m.total];let l=0,t=0;for(let [a,b] of Object.values(files)){l+=a;t+=b}say(`Downloading the speech engine (first time only)… ${Math.round(l/t*100)}%`)}});
      let ws=toWords(r,dur);if(ws.est)out.est=true;for(let w of ws)out.push({w:w.w,s:c.in+part.at+Math.min(w.s,dur),e:c.in+part.at+Math.min(w.e,dur)})}
    return out}
  catch(x){worker?.terminate();worker=null;throw x}finally{busy=false}};
// ---------- cloud AI (Groq, through api/words.js) ----------
// For the B-roll builder: the talking clips' sound is joined into one 16 kHz WAV (with a second of silence
// between clips, at most ~2 minutes per request), Groq writes down every word with its time, then Groq's text
// AI marks fumbles and retakes (w.drop). One build counts as one use of the person's daily limit.
// Resolves to {words: [[{w,s,e,drop?}] per clip, file seconds], left}. Throws (err.code: off, limit, auth, net…)
// so the caller can fall back to veClipWords.
const ISO={english:'en',spanish:'es',french:'fr',portuguese:'pt',german:'de',italian:'it',tagalog:'tl',hindi:'hi',japanese:'ja',korean:'ko',chinese:'zh',arabic:'ar'};
function wav(f){const n=f.length,b=new ArrayBuffer(44+n*2),v=new DataView(b),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  s(0,'RIFF');v.setUint32(4,36+n*2,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){let x=Math.max(-1,Math.min(1,f[i]));v.setInt16(44+i*2,x<0?x*32768:x*32767,true)}return new Blob([b],{type:'audio/wav'})}
const cloudErr=(m,code)=>Object.assign(Error(m),{code});
async function cloudPost(body,type,build,lang){let h={'content-type':type,'x-build':build,'x-lang':lang||''};
  if(window.TapAuth?.on){let s=null;try{s=await TapAuth.session()}catch{}if(!s)throw cloudErr('Not signed in.','auth');h.authorization='Bearer '+s.access_token}
  let r;try{r=await fetch((window.TAPSHOP_AI||{}).endpoint||'/api/words',{method:'POST',headers:h,body})}catch{throw cloudErr('Couldn’t reach the cloud AI.','net')}
  let j={};try{j=await r.json()}catch{}if(!r.ok)throw cloudErr(j.error||'Cloud AI error '+r.status,j.code||'http');return j}
window.veCloudOn=()=>!!(window.TAPSHOP_AI||{}).cloud&&/^https?:/.test(location.protocol);
window.veCloudWords=async function(list,say=()=>{}){if(!veCloudOn())throw cloudErr('Cloud AI is off.','off');
  const SR=16000,GAP=SR,MAX=120*SR,build=(crypto.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2)),lang=ISO[lastSettings().lang]||'';
  const batches=[];let cur=null;
  for(let k=0;k<list.length;k++){say(`Getting the sound from clip ${k+1} of ${list.length}…`);let a=null;try{a=await clipAudio({speed:1,...list[k]})}catch{}if(!a||a.length<1600)continue;
    for(let from=0;from<a.length;from+=MAX){let piece=a.subarray(from,Math.min(a.length,from+MAX));if(piece.length<1600)continue;
      if(!cur||cur.len+GAP+piece.length>MAX){cur={len:0,items:[]};batches.push(cur)}if(cur.items.length)cur.len+=GAP;cur.items.push({k,from:from/SR,at:cur.len,a:piece});cur.len+=piece.length}}
  const words=list.map(()=>[]);let left=null;
  for(let i=0;i<batches.length;i++){const B=batches[i],f=new Float32Array(B.len);for(const it of B.items)f.set(it.a,it.at);
    say(batches.length>1?`Cloud AI is listening (part ${i+1} of ${batches.length})…`:'Cloud AI is listening…');
    const j=await cloudPost(wav(f),'audio/wav',build,lang);if(j.left!=null)left=j.left;
    for(const w of j.words||[]){const mid=(w.s+w.e)/2*SR,it=B.items.find(x=>mid>=x.at-SR/4&&mid<=x.at+x.a.length+SR/4);if(!it)continue;
      const c=list[it.k],off=c.in+it.from-it.at/SR;words[it.k].push({w:w.w,s:Math.max(c.in,w.s+off),e:Math.min(c.out,w.e+off)})}}
  words.forEach(ws=>{ws.est=false;ws.sort((a,b)=>a.s-b.s)});
  // Mistakes: one list of every word (a clip break is marked with "|" so takes in different clips aren't mixed up).
  const flat=[];words.forEach(ws=>{if(flat.length&&ws.length)flat.push(null);ws.forEach(w=>flat.push(w))});
  if(flat.filter(Boolean).length>=6){say('Cloud AI is looking for mistakes…');try{const j=await cloudPost(JSON.stringify({words:flat.map(w=>w?w.w:'|')}),'application/json',build,lang);for(const i of j.drop||[])if(flat[i])flat[i].drop=true}catch(e){console.warn('Mistake finder skipped:',e)}}
  return {words,left}};
// 🔄 Redo captions: listens to the timeline as it is now (after deleting, moving or trimming clips) and makes
// fresh captions in the same style. Cloud AI first when it's on (one use of the daily limit), else on this device.
const FILL=/^(u+m+|u+h+|uhm+|e+r+m*|a+h+|h+m+|m+h*m+)$/i;
window.capRedo=async function(id){if(busy||exporting||!clips.length)return;pause();const old=graphicTracks.find(t=>t.id===id)||graphicTracks.find(isCap),keep=old?.style;
  const btns=()=>document.querySelectorAll('.cap-redo'),say=s=>btns().forEach(b=>{b.textContent=s;b.disabled=true});busy=true;cancelled=false;let all=null,how='';
  try{let cloudOk=veCloudOn();try{cloudOk=cloudOk&&localStorage.getItem('tapshop-broll-cloud')!=='off'}catch{}
    if(cloudOk){try{busy=false;const r=await veCloudWords(clips.map(c=>({assetId:c.assetId,in:c.in,out:c.out})),say);busy=true;all=[];
        clips.forEach((c,i)=>{const st=startOf(i),sp=c.speed||1;for(const w of r.words[i]||[]){if(FILL.test(String(w.w).replace(/[^a-z]/gi,''))||w.e<=c.in||w.s>=c.out)continue;
          all.push({w:w.w,s:Math.round((st+(Math.max(c.in,w.s)-c.in)/sp)*100)/100,e:Math.round((st+(Math.min(c.out,w.e)-c.in)/sp)*100)/100})}});
        all.sort((a,b)=>a.s-b.s);how=r.left!=null?` Cloud AI videos left today: ${r.left}.`:''}
      catch(e){busy=true;console.warn('Cloud AI skipped:',e);all=null;if(e.code==='limit')how=' '+e.message}}
    if(!all){const {lang,q}=lastSettings();all=await listenAll(lang,q,say);if(all)all=all.filter(w=>!FILL.test(String(w.w).replace(/[^a-z]/gi,'')))}
    if(!all)return;if(!all.length){toast('We couldn’t hear any words in this video.');return}
    const t=placeCaptions(all,keep?.preset||lastSettings().preset);if(keep)t.style={...keep};expandedStrip=t.id;renderGraphicTracks();draw();
    toast(`Fresh captions: ${all.length} words.${how}`)}
  catch(e){worker?.terminate();worker=null;toast('Couldn’t redo the captions: '+(e.message||e))}
  finally{busy=false;btns().forEach(b=>{b.textContent='🔄 Redo captions';b.disabled=false})}};
// Adds ready-made timeline words as the Captions track, in the last style used. Returns the number of words.
window.vePlaceCaptions=function(words){if(!words?.length)return 0;placeCaptions([...words].sort((a,b)=>a.s-b.s),lastSettings().preset);return words.length};

// ---------- styles and toolbar ----------
let css=document.createElement('style');css.textContent=`.duration-strip[data-kind="captions"]{background:linear-gradient(#c2557a,#8a3354);border-color:#f19bbb}
.cap-panel{display:flex;flex-direction:column;gap:10px;padding:4px 0 8px;width:100%}
.cap-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.cap-head .sub{flex:1;min-width:140px}
.cap-presets{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px}
.cap-preset{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px!important;border-radius:12px;width:112px}
.cap-preset img{width:100px;height:56px;border-radius:8px;display:block}.cap-preset span{font-size:12px}
.cap-pwrap{position:relative;flex:none}.cap-pdel{position:absolute;top:-6px;right:-6px;width:24px;height:24px;padding:0!important;border-radius:50%!important;font-size:14px;line-height:1;display:grid;place-items:center}
.cap-preset.on{outline:2px solid var(--ts-primary,#171717);outline-offset:1px}
.cap-fields{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px 12px}
.cap-fields label{display:flex;flex-direction:column;gap:4px;font-size:12px}.cap-val{opacity:.7;font-size:11px}
.cap-panel .cap-fields label{width:auto!important;max-width:none!important;flex:none!important}.cap-panel .cap-fields select,.cap-panel .cap-fields input[type=range]{width:100%!important;min-width:0;max-width:none!important}.cap-fields .graphic-toggle{align-self:flex-start;min-width:64px}
.cap-sync{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cap-words{display:flex;flex-wrap:wrap;gap:6px;max-height:220px;overflow:auto;padding:2px}
.cap-words input{width:auto!important;min-width:0;padding:5px 7px!important;font-size:13px;border-radius:8px!important}
#capDialog{width:min(560px,94vw)}#capDialog .row{display:flex;gap:10px;flex-wrap:wrap}#capDialog .row label{flex:1;min-width:150px;display:flex;flex-direction:column;gap:4px}
#capDialog .row:last-child{justify-content:flex-end;margin-top:6px}#capDialog .cap-step{margin:12px 0}#capDialog .cap-step>b,#capMyWrap>b{display:block;margin:0 0 6px}#capMyWrap{margin-top:12px}
.cap-group{margin:4px 0 0;font-size:13px;font-weight:700}.cap-mytip{margin:0}`;document.head.appendChild(css);
let btn=document.createElement('button');btn.type='button';btn.textContent='✨ Captions';btn.title='Auto captions';btn.onclick=()=>openCaptions();
let smart=[...document.querySelectorAll('.timebar button')].find(b=>/Smart tools/.test(b.textContent));(smart||document.querySelector('.timebar button'))?.after(btn);
})();

// ---- Speech windows for auto-ducking: [{start, end}] in timeline seconds where someone is talking.
// From the Captions track's words when there are any; otherwise (and for clips the captions don't cover) from the sound itself:
// loudness (RMS) in 50 ms steps, above a level worked out per file. Words closer than 0.4 s join into one block, then each block
// gets 0.15 s before and 0.35 s after, so music dips once per sentence instead of pumping on every word.
// Speech comes from main clips, video layers, and audio tracks that don't duck themselves (a voiceover you added, say).
(()=>{
const STEP=.05,cache=new Map();let dirty=true,last=[];
// Loudness per 50 ms for one file (decoded at 16 kHz, cached). Returns the numbers, or a promise while it's working, or 'none'.
function loudness(file){if(!file)return 'none';let r=cache.get(file);if(r)return r;
  r=(async()=>{try{const buf=await new OfflineAudioContext(1,1,16000).decodeAudioData(await file.arrayBuffer()),SR=buf.sampleRate,hop=Math.round(SR*STEP),n=Math.floor(buf.length/hop),chs=[...Array(buf.numberOfChannels)].map((_,c)=>buf.getChannelData(c)),out=new Float32Array(n);
      for(let i=0;i<n;i++){let s=0;for(let k=i*hop;k<(i+1)*hop;k++){let v=0;for(const d of chs)v+=d[k];v/=chs.length;s+=v*v}out[i]=Math.sqrt(s/hop)}
      const sorted=Float32Array.from(out).sort(),floor=sorted[Math.floor(n*.15)]||0,loud=sorted[Math.floor(n*.95)]||0;out.thr=Math.max(floor*2.5,loud*.18,.008);cache.set(file,out);dirty=true;return out}
    catch{cache.set(file,'none');dirty=true;return 'none'}})();
  cache.set(file,r);return r}
const speaking=(r,from,to,at,speed,push)=>{for(let f=Math.max(0,Math.floor(from/STEP));f<Math.min(r.length,Math.ceil(to/STEP));f++)if(r[f]>r.thr){const T=at+(f*STEP-from)/speed;push({start:T,end:T+STEP/speed})}};
function join(ws,gap){ws.sort((a,b)=>a.start-b.start);const out=[];for(const w of ws){const p=out.at(-1);if(p&&w.start-p.end<gap)p.end=Math.max(p.end,w.end);else out.push({start:w.start,end:w.end})}return out}
function build(){const raw=[],pending=[],push=w=>raw.push(w);
  const caps=graphicTracks.filter(t=>t.type==='captions'&&Array.isArray(t.words)&&!t.hidden),said=[];
  for(const t of caps)for(const w of t.words)if(w.e>w.s)said.push({start:t.offset+w.s,end:t.offset+w.e});
  raw.push(...said);
  // Main clips the captions don't cover: listen to their sound.
  clips.forEach((c,i)=>{if((c.volume??1)<=0)return;const a=asset(c),S=startOf(i),E=S+duration(c);if(said.some(w=>w.end>S&&w.start<E))return;
    const r=loudness(a?.cleanFile||a?.file);if(r instanceof Promise)pending.push(r);else if(r!=='none')speaking(r,c.in,c.out,S,c.speed||1,push)});
  // Video layers, and audio tracks that aren't music or sound effects (no duck, no beat, not tied to a strip).
  for(const t of extraTracks){if(!t.media||t.muted||t.volume<=0)continue;if(!(t.type==='video'||(t.type==='audio'&&!t.duck&&!t.bpm&&!t.sfxFor&&t.lane!=='sfx')))continue;
    const r=loudness(t.file);if(r instanceof Promise)pending.push(r);else if(r!=='none')speaking(r,t.start,t.end,t.offset,t.speed||1,push)}
  const blocks=join(raw,.4).map(w=>({start:Math.max(0,w.start-.15),end:w.end+.35}));
  return {windows:join(blocks,0),pending}}
window.veSpeechWindows=function(){if(!dirty)return last;const b=build();last=b.windows;if(!b.pending.length)dirty=false;return last};
// For the export: wait until every file has been listened to, then give the final windows.
window.veSpeechReady=async function(){for(let k=0;k<4;k++){const b=build();if(!b.pending.length){last=b.windows;dirty=false;return last}await Promise.all(b.pending)}return veSpeechWindows()};
// Anything on the timeline changing redraws the strips: work the windows out again next time they're needed.
{const base=decorateStrips;decorateStrips=function(){dirty=true;return base.apply(this,arguments)}}
})();
