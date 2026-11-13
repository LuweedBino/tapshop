// B-roll builder: drop in clips, pick a story template (Hook → Problem → Solution → Call to action, …),
// and the builder looks at and listens to each clip in the browser (CLIP for pictures and Whisper for
// speech, both via transformers.js from jsDelivr in a Web Worker; models download once from Hugging Face
// and the browser caches them), puts every clip in the part of the story it fits best, lets the creator
// fix the order, then builds the video: clips cut to the beat, words on screen for each part, and a beat
// made right here in the browser (WebAudio, so it's free to use) on its own audio track.
(()=>{
const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
const $$=id=>document.getElementById(id);
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- what the picture AI looks for ----------
// [key, prompt for the AI, short name shown to the creator]
const LOOKS=[
  ['talk','a person talking to the camera','🗣 Talking to camera'],
  ['product','a close-up photo of a product','📦 Product close-up'],
  ['unbox','hands opening a package or box','🎁 Unboxing'],
  ['messy','a messy, dirty or cluttered place','😩 Messy / before'],
  ['clean','a clean, tidy and finished result','✨ Clean / after'],
  ['using','a person using a product with their hands','🙌 Using it'],
  ['happy','a smiling, happy person','😊 Happy'],
  ['upset','a frustrated or tired person','😣 Frustrated'],
  ['screen','a phone screen or a website','📱 Phone / screen'],
  ['food','food or a drink','🍽 Food / drink'],
  ['beauty','makeup, skincare or hair','💄 Beauty'],
  ['outside','an outdoor scene or a place','🌳 Outdoors'],
];

// ---------- story templates ----------
// look: what the part's pictures usually show (weights); say: words people usually say in that part.
const S=(id,label,text,look,say,o={})=>({id,label,text,look,say,...o});
const HOOK=S('hook','Hook','Wait… you NEED this 👀',{talk:1,product:.6,happy:.3},/\b(wait|stop|you need|obsessed|game ?changer|i found|nobody|pov|okay so|you guys|listen|this is|watch)\b/i,{y:22,box:'#ff3ea5',anim:'pop',textMax:3.5,beats:4});
const CTA=S('cta','Call to action','Link in bio 👇',{talk:.8,screen:.7,product:.5,happy:.3},/\b(link|bio|grab|get yours|get it|shop|buy|code|discount|check it out|click|order|follow|comment|tap)\b/i,{y:78,box:'#ffd84d',color:'#111111',anim:'bounce',beats:6});
const TEMPLATES=[
  {id:'pas',name:'Hook → Problem → Solution',tag:'The classic UGC ad',mood:'bright',parts:[HOOK,
    S('problem','Problem','The problem? 😩',{upset:1,messy:1,talk:.3},/\b(tired of|hate|struggl|problem|annoying|never works|always|messy|hard to|sick of|used to|ugh|frustrat|can'?t)\b/i,{y:20,box:'#111111',anim:'left',beats:6}),
    S('solution','Solution','Then I found this ✨',{using:1,product:.7,clean:.5,happy:.4},/\b(so i|tried|found|works|changed|now i|fixed|solves|love how|use it|just|this one|it's so)\b/i,{y:20,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'beforeafter',name:'Before → After',tag:'Show the glow-up',mood:'upbeat',parts:[HOOK,
    S('before','Before','BEFORE',{messy:1,upset:.7},/\b(before|used to|was|look at this|look how)\b/i,{y:12,box:'#111111',anim:'left',beats:8}),
    S('after','After','AFTER ✨',{clean:1,happy:.6,product:.3},/\b(after|now|look at|wow|so much better|finally)\b/i,{y:12,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'reasons',name:'3 reasons I love it',tag:'Quick reasons people save',mood:'upbeat',parts:[S('hook','Hook','3 reasons I love this 💕',HOOK.look,HOOK.say,{...HOOK,text:'3 reasons I love this 💕'}),
    S('r1','Reason 1','Reason #1 💡',{using:1,product:.8,happy:.3},/\b(first|one|number one|reason one|1)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    S('r2','Reason 2','Reason #2 🙌',{using:.9,product:.8,clean:.3},/\b(second|two|also|plus|another|2)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    S('r3','Reason 3','Reason #3 😍',{happy:1,using:.6,clean:.5},/\b(third|three|finally|best part|last|3)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    CTA]},
  {id:'unboxing',name:'Unboxing',tag:'First look at something new',mood:'bright',parts:[S('hook','Hook','It’s finally here! 📦',HOOK.look,HOOK.say,{...HOOK,text:'It’s finally here! 📦'}),
    S('open','Unboxing','Let’s open it 🎁',{unbox:1.2,product:.4,using:.3},/\b(open|unbox|box|package|arrived|came|inside)\b/i,{y:18,box:'#111111',anim:'down',beats:8}),
    S('look','First look','First look 👀',{product:1.1,clean:.4},/\b(look|comes with|inside|feel|quality|size|color|colour)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'pop',beats:6}),
    S('fav','Favourite part','My favourite part 😍',{using:1,happy:.8},/\b(favou?rite|love|best|obsessed|amazing|so good)\b/i,{y:18,box:'#ff3ea5',anim:'pop',beats:6}),
    CTA]},
];

// ---------- free beats, made in the browser ----------
const MOODS={
  bright:{name:'Bright pop',bpm:104,chords:[[60,'maj'],[67,'maj'],[69,'min'],[65,'maj']],kick:[0,8,10],snare:[4,12],hats:2,arp:2,pad:1300},
  upbeat:{name:'Upbeat dance',bpm:122,chords:[[62,'min'],[58,'maj'],[65,'maj'],[60,'maj']],kick:[0,4,8,12],snare:[4,12],hats:2,open:[2,6,10,14],arp:1,pad:1600},
  chill:{name:'Chill lo-fi',bpm:86,chords:[[57,'min7'],[53,'maj7'],[60,'maj7'],[55,'maj']],kick:[0,7,10],snare:[8],hats:2,swing:.12,arp:4,pad:850},
};
const TONES={maj:[0,4,7],min:[0,3,7],min7:[0,3,7,10],maj7:[0,4,7,11]};
const hz=m=>440*Math.pow(2,(m-69)/12);
async function makeBeat(seconds,moodKey){
  const M=MOODS[moodKey]||MOODS.bright,SR=44100,len=Math.max(1,seconds),oc=new OfflineAudioContext(2,Math.ceil((len+.05)*SR),SR);
  const step=60/M.bpm/4,master=oc.createGain(),comp=oc.createDynamicsCompressor();master.connect(comp);comp.connect(oc.destination);
  const vol=.55;master.gain.setValueAtTime(0,0);master.gain.linearRampToValueAtTime(vol,.3);master.gain.setValueAtTime(vol,Math.max(.31,len-1.8));master.gain.linearRampToValueAtTime(0,len);
  const noise=oc.createBuffer(1,SR,SR),nd=noise.getChannelData(0);for(let i=0;i<SR;i++)nd[i]=Math.random()*2-1;
  const out=(node,pan=0)=>{if(pan&&oc.createStereoPanner){let p=oc.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(master)}else node.connect(master)};
  const env=(g,t,peak,att,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+att+dec)};
  const kick=t=>{let o=oc.createOscillator(),g=oc.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);env(g,t,.9,.003,.35);o.connect(g);out(g);o.start(t);o.stop(t+.4)};
  const snare=t=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=1300;env(g,t,.32,.002,.18);s.connect(f);f.connect(g);out(g);s.start(t,Math.random()*.5);s.stop(t+.22);
    let o=oc.createOscillator(),g2=oc.createGain();o.type='triangle';o.frequency.value=190;env(g2,t,.18,.002,.09);o.connect(g2);out(g2);o.start(t);o.stop(t+.12)};
  const hat=(t,open)=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=7500;env(g,t,open?.09:.07,.001,open?.22:.045);s.connect(f);f.connect(g);out(g,.25);s.start(t,Math.random()*.5);s.stop(t+(open?.26:.06))};
  const bass=(t,m,d)=>{let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain();o.type='sawtooth';o.frequency.value=hz(m);f.type='lowpass';f.frequency.value=380;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.28,t+.01);g.gain.setValueAtTime(.28,t+d*.7);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(f);f.connect(g);out(g);o.start(t);o.stop(t+d+.02)};
  const pad=(t,notes,d)=>{let f=oc.createBiquadFilter(),g=oc.createGain();f.type='lowpass';f.frequency.value=M.pad;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.35);g.gain.setValueAtTime(.045,t+d-.3);g.gain.exponentialRampToValueAtTime(0.0001,t+d);f.connect(g);out(g);
    for(let m of notes)for(let det of [-7,7]){let o=oc.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+d+.05)}};
  const pluck=(t,m,pan)=>{let o=oc.createOscillator(),g=oc.createGain();o.type='triangle';o.frequency.value=hz(m);env(g,t,.075,.004,.26);o.connect(g);out(g,pan);o.start(t);o.stop(t+.32)};
  for(let bar=0;bar*16*step<len;bar++){let t0=bar*16*step,[root,q]=M.chords[bar%M.chords.length],tones=TONES[q].map(x=>root+x);
    pad(t0,tones,16*step);
    for(let s=0;s<16;s++){let t=t0+s*step+(M.swing&&s%2?M.swing*step*2:0);if(t>=len)break;
      if(M.kick.includes(s))kick(t);if(M.snare.includes(s))snare(t);
      if(s%M.hats===0)hat(t,false);if(M.open?.includes(s))hat(t,true);
      if(s%4===0||(s%4===3&&M.bpm>100))bass(t,root-24+(s===14?7:0),step*(s%4===0?2.6:.9));
      if(s%M.arp===0&&bar>0){let k=(s/M.arp)%(tones.length+1);pluck(t,tones[k%tones.length]+12+(k>=tones.length?12:0),k%2?-.3:.3)}}}
  const buf=await oc.startRendering();return new File([wav(buf)],`TapShop beat · ${M.name} ${M.bpm} BPM.wav`,{type:'audio/wav'})}
function wav(buf){const ch=buf.numberOfChannels,n=buf.length,out=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)out.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');out.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,ch,true);out.setUint32(24,buf.sampleRate,true);out.setUint32(28,buf.sampleRate*ch*2,true);out.setUint16(32,ch*2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*ch*2,true);
  const data=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){let v=Math.max(-1,Math.min(1,data[c][i]));out.setInt16(o,v<0?v*0x8000:v*0x7fff,true);o+=2}
  return out.buffer}

// ---------- the AI that looks and listens (in a worker, so the page stays smooth) ----------
const WORKER=`let see=null,hear=null;
self.onmessage=async e=>{const m=e.data;try{
  const T=await import('${LIB}');T.env.allowLocalModels=false;
  const prog=p=>{if(p.status==='progress'&&p.total)self.postMessage({type:'dl',file:p.file,loaded:p.loaded,total:p.total})};
  if(m.task==='see'){
    if(!see)see=await T.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8',progress_callback:prog});
    const out=[];for(const img of m.images)out.push(await see(img,m.labels));self.postMessage({type:'done',id:m.id,result:out});
  }else{
    if(!hear){let err;for(const model of ['onnx-community/whisper-tiny_timestamped','Xenova/whisper-tiny']){try{hear=await T.pipeline('automatic-speech-recognition',model,{dtype:'q8',progress_callback:prog});break}catch(x){err=x}}if(!hear)throw err}
    const r=await hear(m.audio,{return_timestamps:true});self.postMessage({type:'done',id:m.id,result:{text:r.text||'',chunks:(r.chunks||[]).map(c=>({text:c.text,ts:c.timestamp}))}});
  }}catch(x){self.postMessage({type:'error',id:m.id,message:String(x&&x.message||x)})}};`;
let worker=null,askN=0;
function ask(msg,onDl,transfer){return new Promise((res,rej)=>{if(!worker)worker=new Worker(URL.createObjectURL(new Blob([WORKER],{type:'text/javascript'})),{type:'module'});
  const id=++askN;worker.onmessage=e=>{let m=e.data;if(m.type==='dl')onDl?.(m);else if(m.id!==id)return;else if(m.type==='done')res(m.result);else rej(Error(m.message))};
  worker.onerror=e=>rej(Error(e.message||'The clip reader could not start.'));worker.postMessage({...msg,id},transfer||[])})}
function stopWorker(){worker?.terminate();worker=null}

// Three small pictures from inside the clip (a separate <video>, so the editor's own players aren't moved).
async function frames(src){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=src.asset.url;
  await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(Error('Can’t read '+src.asset.name))});
  const out=[],len=src.out-src.in;for(const f of [.2,.5,.8]){await new Promise(r=>{let t=setTimeout(r,3000);v.onseeked=()=>{clearTimeout(t);r()};v.currentTime=src.in+len*f});
    let s=Math.min(1,320/Math.max(v.videoWidth||320,v.videoHeight||320)),c=document.createElement('canvas');c.width=Math.max(1,Math.round((v.videoWidth||320)*s));c.height=Math.max(1,Math.round((v.videoHeight||180)*s));
    c.getContext('2d').drawImage(v,0,0,c.width,c.height);out.push(c.toDataURL('image/jpeg',.82))}
  v.removeAttribute('src');v.load();return out}
// The clip's sound at 16 kHz mono, at most the first 28 seconds.
async function sound(src){let buf;try{buf=await new OfflineAudioContext(1,1,16000).decodeAudioData(await src.asset.file.arrayBuffer())}catch{return null}
  if(buf.sampleRate!==16000){let oc=new OfflineAudioContext(1,Math.ceil(buf.duration*16000),16000),s=oc.createBufferSource();s.buffer=buf;s.connect(oc.destination);s.start();buf=await oc.startRendering()}
  let a=Math.floor(src.in*16000),b=Math.min(buf.length,Math.ceil(Math.min(src.out,src.in+28)*16000)),mono=new Float32Array(Math.max(0,b-a));
  for(let ch=0;ch<buf.numberOfChannels;ch++){let d=buf.getChannelData(ch);for(let i=0;i<mono.length;i++)mono[i]+=d[a+i]/buf.numberOfChannels}
  let e=0;for(let i=0;i<mono.length;i+=8)e+=mono[i]*mono[i];return e/(mono.length/8||1)>1e-5?mono:null}

// ---------- matching clips to parts ----------
function scores(clip,tp){const n=tp.parts.length;return tp.parts.map((p,j)=>{let wsum=0,v=0;for(const [k,w] of Object.entries(p.look)){let i=LOOKS.findIndex(x=>x[0]===k);if(i<0)continue;v+=w*(clip.seen?.[i]||0);wsum+=w}
  let s=wsum?v/wsum*LOOKS.length/3:0;if(clip.words&&p.say.test(clip.words))s+=.35;if(clip.talking&&(p.id==='hook'||p.id==='cta'))s+=.12;
  // A small nudge towards the order the clips were added, so close calls keep the creator's order.
  s-=.12*Math.abs((clip.n/Math.max(1,clip.of-1))-(j/Math.max(1,n-1)));return s})}
function arrange(list,tp){const n=tp.parts.length,parts=tp.parts.map(()=>[]),sc=list.map(c=>scores(c,tp)),used=new Set(),filled=new Set();
  const pairs=[];sc.forEach((row,i)=>row.forEach((s,j)=>pairs.push([s,i,j])));pairs.sort((a,b)=>b[0]-a[0]);
  for(const [,i,j] of pairs){if(used.has(i)||filled.has(j))continue;parts[j].push(list[i]);used.add(i);filled.add(j);if(filled.size===n||used.size===list.length)break}
  list.forEach((c,i)=>{if(used.has(i))return;let j=sc[i].indexOf(Math.max(...sc[i]));parts[j].push(c)});
  parts.forEach(p=>p.sort((a,b)=>a.n-b.n));return parts}

// ---------- the dialog ----------
const dlg=document.createElement('dialog');dlg.id='brDialog';dlg.className='closable';document.body.appendChild(dlg);
const st=document.createElement('style');st.textContent=`
#brDialog{width:min(720px,calc(100vw - 20px));max-height:calc(100dvh - 20px)}
#brDialog h3{margin:16px 0 6px;font-size:14px}
.br-tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.br-tpl{text-align:left;padding:10px 12px!important;border-radius:12px!important;white-space:normal;line-height:1.3}
.br-tpl b{display:block;font-size:13px}.br-tpl small{display:block;font-size:11px;opacity:.7;margin-top:3px}.br-tpl .br-flow{display:block;font-size:10px;opacity:.6;margin-top:5px}
.br-tpl.on{outline:2px solid #ff3ea5;outline-offset:1px}
.br-add{display:flex;flex-wrap:wrap;gap:6px}
.br-clips{display:flex;gap:8px;overflow-x:auto;padding:8px 0 4px;min-height:24px}
.br-clip{position:relative;flex:none;width:112px;font-size:10px;line-height:1.25}
.br-clip img{display:block;width:112px;height:63px;object-fit:cover;border-radius:8px;background:#0003}
.br-clip .x{position:absolute;top:3px;right:3px;width:22px;height:22px;padding:0!important;border-radius:50%!important;font-size:13px;line-height:1;display:grid;place-items:center}
.br-clip .nm{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;font-weight:600}
.br-clip .tag{display:block;opacity:.75;margin-top:2px}.br-clip .said{display:block;font-style:italic;opacity:.65;margin-top:2px;max-height:2.6em;overflow:hidden}
.br-clip select{width:100%;margin-top:4px;font-size:11px;padding:3px 4px}
.br-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.br-row label{display:flex;flex-direction:column;gap:4px;font-size:12px}
.br-sec{border:1px solid var(--ts-border,#8883);border-radius:12px;padding:10px;margin:8px 0}
.br-sec-h{display:flex;align-items:center;gap:8px}.br-sec-h b{font-size:13px;white-space:nowrap}.br-sec-h input{flex:1;min-width:0;font-size:13px;padding:6px 8px}
.br-sec .br-empty{font-size:11px;opacity:.6;padding:6px 0}
#brWork progress{width:100%}`;document.head.appendChild(st);

let tp=TEMPLATES[0],mood=tp.mood,shape='9:16',items=[],parts=null,texts={},busy=false,stopped=false;
const shapes=()=>[...($$('aspect')?.options||[])].map(o=>[o.value,o.textContent]);
// From the start screen the chosen platform has already set the shape; otherwise UGC defaults to vertical.
function open(fromStart){if(exporting)return;stopped=false;parts=null;let a=$$('aspect')?.value;shape=(fromStart===true||clips.length)&&['9:16','1:1','4:5','16:9'].includes(a)?a:'9:16';if(!items.length&&clips.length)useTimeline(true);step1();dlg.showModal()}
function close(){stopped=true;if(busy)stopWorker();busy=false;dlg.close()}
dlg.addEventListener('cancel',e=>{e.preventDefault();close()});

function step1(){const flow=t=>t.parts.map(p=>p.label).join(' → ');
  dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎞️ B-roll builder</h2>
  <p class="sub">Add your clips and pick a story. We watch and listen to each clip, put it in the right part of the story, add words on screen and a free beat, and cut it all to the music.</p>
  <h3>1. Pick a story</h3><div class="br-tpls">${TEMPLATES.map(t=>`<button type="button" class="br-tpl${t===tp?' on':''}" data-t="${t.id}"><b>${enc(t.name)}</b><small>${enc(t.tag)}</small><span class="br-flow">${enc(flow(t))}</span></button>`).join('')}</div>
  <h3>2. Add your clips <small class="sub">(${items.length})</small></h3>
  <div class="br-add"><button type="button" class="primary" id="brChoose">📹 Choose clips</button>${typeof VaultPicker!=='undefined'&&VaultPicker.inTapShop?'<button type="button" id="brVault">⛁ From Media Vault</button>':''}${clips.length?`<button type="button" id="brTimeline">🎬 Use my timeline clips (${clips.length})</button>`:''}<input type="file" id="brFiles" accept="video/*" multiple hidden></div>
  <div class="br-clips">${items.length?items.map((c,i)=>`<div class="br-clip"><img alt="" src="${c.asset.thumb}"><button type="button" class="x" data-x="${i}" aria-label="Remove ${enc(c.asset.name)}">×</button><span class="nm">${enc(c.asset.name)}</span><span class="tag">${(c.out-c.in).toFixed(1)}s</span></div>`).join(''):'<p class="sub" style="margin:0">No clips yet. Add 3 or more for the best result.</p>'}</div>
  <h3>3. Look and sound</h3><div class="br-row"><label>Video shape<select id="brShape">${shapes().map(([v,l])=>`<option value="${enc(v)}"${v===shape?' selected':''}>${enc(l)}</option>`).join('')}</select></label>
  <label>Music<select id="brMood">${Object.entries(MOODS).map(([k,m])=>`<option value="${k}"${k===mood?' selected':''}>🎵 ${enc(m.name)} · ${m.bpm} BPM</option>`).join('')}<option value=""${mood?'':' selected'}>No music</option></select></label></div>
  <p class="sub">The first time, your browser downloads the clip reader (a one-time download, about 130 MB). After that it’s saved. Phones are slower than computers.</p>
  <div class="row"><button type="button" id="brCancel">Cancel</button><button type="button" id="brSkip"${items.length?'':' disabled'}>Keep my order</button><button type="button" class="primary" id="brGo"${items.length?'':' disabled'}>✨ Sort my clips</button></div>`;
  dlg.querySelector('.dialog-x').onclick=dlg.querySelector('#brCancel').onclick=close;
  dlg.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tp=TEMPLATES.find(t=>t.id===b.dataset.t);mood=tp.mood;step1()});
  dlg.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.x,1);step1()});
  const fi=dlg.querySelector('#brFiles');dlg.querySelector('#brChoose').onclick=()=>fi.click();fi.onchange=()=>{addFiles([...fi.files]);fi.value=''};
  dlg.querySelector('#brVault')?.addEventListener('click',()=>VaultPicker.open({title:'Pick a clip',kinds:['video'],onPick:async it=>{try{toast('Loading '+it.name+'…');await addFiles([await VaultPicker.file(it)])}catch(e){toast(e.message)}if(!dlg.open)dlg.showModal()}}));
  dlg.querySelector('#brTimeline')?.addEventListener('click',()=>{useTimeline();step1()});
  dlg.querySelector('#brShape').onchange=e=>shape=e.target.value;dlg.querySelector('#brMood').onchange=e=>mood=e.target.value;
  dlg.querySelector('#brGo').onclick=analyse;dlg.querySelector('#brSkip').onclick=()=>{number();parts=arrange(items,tp);step3('Kept your order. Move any clip with the menu under it.')}}
async function addFiles(files){let got=0;for(const f of files){if(!/^video\//.test(f.type)&&!/\.(mp4|mov|webm|m4v)$/i.test(f.name))continue;try{toast('Loading '+f.name+'…');let a=await loadAsset(f);items.push({asset:a,in:0,out:a.duration});got++}catch(e){toast(e.message)}}if(got&&dlg.open)step1()}
function useTimeline(quiet){let seen=new Set(items.map(c=>c.key));for(const c of clips){let a=asset(c);if(!a)continue;let key=c.id;if(seen.has(key))continue;items.push({asset:a,in:c.in,out:c.out,key})}if(!quiet)toast('Your timeline clips are in.')}
const number=()=>items.forEach((c,i)=>{c.n=i;c.of=items.length});

async function analyse(){number();busy=true;stopped=false;
  dlg.innerHTML=`<h2>✨ Sorting your clips…</h2><p class="sub">We’re watching and listening to each clip. Nothing is uploaded; it all happens on this device.</p>
  <div id="brWork"><progress id="brProg" max="1" value="0"></progress><p class="sub" id="brStatus" aria-live="polite">Getting ready…</p></div>
  <div class="row"><button type="button" id="brStop">Cancel</button><button type="button" id="brKeep">Skip, keep my order</button></div>`;
  const status=s=>{let el=$$('brStatus');if(el)el.textContent=s},prog=v=>{let el=$$('brProg');if(el)el.value=v};
  const dl=m=>status(`Downloading the clip reader (one time only)… ${Math.round(m.loaded/1e6)} of ${Math.round(m.total/1e6)} MB`);
  dlg.querySelector('#brStop').onclick=()=>{stopped=true;stopWorker();busy=false;step1()};
  dlg.querySelector('#brKeep').onclick=()=>{stopped=true;stopWorker();busy=false;parts=arrange(items,tp);step3('Kept your order. Move any clip with the menu under it.')};
  let failed=null;const labels=LOOKS.map(x=>x[1]);
  try{for(let i=0;i<items.length;i++){if(stopped)return;let c=items[i];
      status(`Watching clip ${i+1} of ${items.length}: ${c.asset.name}`);prog(i/items.length);
      let res=await ask({task:'see',images:await frames(c),labels},dl);if(stopped)return;
      c.seen=LOOKS.map(([,p])=>res.reduce((n,r)=>n+(r.find(x=>x.label===p)?.score||0),0)/res.length);
      status(`Listening to clip ${i+1} of ${items.length}…`);prog((i+.5)/items.length);
      let audio=await sound(c);if(stopped)return;
      if(audio){let r=await ask({task:'hear',audio},dl,[audio.buffer]);if(stopped)return;let text=String(r.text||'').trim(),ts=r.chunks.map(x=>x.ts).filter(t=>t&&Number.isFinite(t[0]));
        c.words=text;c.talking=text.split(/\s+/).filter(w=>/[a-z]/i.test(w)).length>=4;if(ts.length){c.speech=[ts[0][0],Math.max(...ts.map(t=>Number.isFinite(t[1])?t[1]:t[0]+1))]}}
      prog((i+1)/items.length)}}
  catch(x){failed=x}
  busy=false;if(stopped)return;
  parts=arrange(items,tp);
  step3(failed?'We couldn’t run the clip reader ('+(failed.message||failed)+'). Check your internet connection for the first download. Your clips are in your order; move any clip with the menu under it.':'Here’s where we think each clip fits. Not right? Move a clip with the menu under it.')}

function step3(note){const opts=j=>tp.parts.map((p,k)=>`<option value="${k}"${k===j?' selected':''}>Move to: ${enc(p.label)}</option>`).join('');
  const tag=c=>{if(!c.seen)return '';let i=c.seen.indexOf(Math.max(...c.seen));return enc(LOOKS[i][2])+(c.talking&&LOOKS[i][0]!=='talk'?' · 🗣':'')};
  dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎞️ ${enc(tp.name)}</h2><p class="sub">${enc(note)}</p>
  ${tp.parts.map((p,j)=>`<div class="br-sec"><div class="br-sec-h"><b>${j+1}. ${enc(p.label)}</b><input type="text" data-tx="${p.id}" value="${enc(texts[tp.id+p.id]??p.text)}" aria-label="Words on screen for ${enc(p.label)}" placeholder="Words on screen (leave empty for none)"></div>
    <div class="br-clips">${parts[j].length?parts[j].map(c=>`<div class="br-clip"><img alt="" src="${c.asset.thumb}"><span class="nm">${enc(c.asset.name)}</span><span class="tag">${tag(c)}</span>${c.words?`<span class="said">“${enc(c.words.slice(0,70))}${c.words.length>70?'…':''}”</span>`:''}<select data-mv="${c.n}" aria-label="Move ${enc(c.asset.name)}">${opts(j)}</select></div>`).join(''):'<p class="br-empty">No clip here. This part will be skipped.</p>'}</div></div>`).join('')}
  <div class="row"><button type="button" id="brBack">← Back</button><button type="button" class="primary" id="brBuild">🎬 Build my video</button></div>`;
  dlg.querySelector('.dialog-x').onclick=close;dlg.querySelector('#brBack').onclick=step1;
  dlg.querySelectorAll('[data-tx]').forEach(el=>el.oninput=()=>texts[tp.id+el.dataset.tx]=el.value);
  dlg.querySelectorAll('[data-mv]').forEach(sel=>sel.onchange=()=>{let c=items.find(x=>x.n===+sel.dataset.mv);parts.forEach(p=>{let k=p.indexOf(c);if(k>=0)p.splice(k,1)});parts[+sel.value].push(c);parts[+sel.value].sort((a,b)=>a.n-b.n);step3(note)});
  dlg.querySelector('#brBuild').onclick=build}

// ---------- building the video ----------
// Talking clips keep everything that's said; other clips are cut to whole beats so cuts land on the music.
function cut(c,part,beat){let a=c.in,b=c.out;
  if(c.talking&&c.speech){a=Math.max(c.in,c.in+c.speech[0]-.15);b=Math.min(c.out,c.in+c.speech[1]+.35);if(b-a<.5){a=c.in;b=c.out}return [a,b]}
  if(!beat)return [a,Math.min(b,a+6)];let n=Math.min(part.beats||6,Math.floor((b-a)/beat));if(n<2)return [a,b];let start=Math.min(a+.2,b-n*beat);return [Math.max(a,start),Math.max(a,start)+n*beat]}
const textFrac=(s,W,H)=>{let f=.055,px=f*H,w=s.length*.6*px;return w>W*.84?W*.84/(s.length*.6)/H:f};
async function build(){if(exporting)return;const btn=dlg.querySelector('#brBuild');btn.disabled=true;btn.textContent='Building…';
  try{const used=parts.flat().map(c=>c.asset),M=MOODS[mood],beat=M?60/M.bpm:0;
    if(clips.length||graphicTracks.length||extraTracks.length){if(window.veNewProject)await veNewProject();else{clips=[];graphicTracks=[]}}
    for(const a of used)if(!assets.includes(a))assets.push(a);
    $$('aspect').value=shape;setAspect();const W=canvas.width,H=canvas.height;
    let t=0,talky=false;const spans=[];
    tp.parts.forEach((p,j)=>{if(!parts[j].length)return;let s=t;for(const c of parts[j]){let [a,b]=cut(c,p,beat),cl=makeClip(c.asset);Object.assign(cl,{in:a,out:b,fit:shape==='16:9'?'contain':'cover'});clips.push(cl);t+=b-a;if(c.talking)talky=true}spans.push([p,s,t-s])});
    for(const [p,s,len] of spans){let text=String(texts[tp.id+p.id]??p.text).trim();if(!text)continue;createGraphicTrack('text');let g=graphicTracks.at(-1);
      Object.assign(g,{name:p.label+': '+text.slice(0,18),text,color:p.color||'#ffffff',size:textFrac(text,W,H)*H*1280/W,x:50,y:p.y,bold:true,background:false,animation:p.anim,offset:Math.round(s*10)/10,length:Math.max(.8,Math.round(Math.min(len,p.textMax||len)*10)/10),boxColor:p.box,boxOpacity:1,boxPad:26,boxRadius:18})}
    if(M&&t>0){btn.textContent='Making your music…';let file=await makeBeat(t,mood);addTrack('audio');let tr=extraTracks.at(-1);tr.name='🎵 '+M.name+' beat';targetTrack=tr.id;await loadTrackMedia(file);tr.volume=talky?.22:.7;renderTracks()}
    $$('projectName').value='B-roll · '+tp.name;selected=-1;render();renderTracks();renderGraphicTracks();await seekTimeline(0);
    items=[];parts=null;dlg.close();toast('Your video is ready! Press ▶ to watch it.')}
  catch(e){toast('Couldn’t build the video: '+(e.message||e));btn.disabled=false;btn.textContent='🎬 Build my video'}}

// ---------- ways in ----------
window.openBroll=open;
{let g=[...document.querySelectorAll('.timebar button')].find(b=>/Reviews|Graphics/.test(b.textContent)),b=document.createElement('button');b.type='button';b.textContent='🎞️ B-roll';b.title='Build a video from your clips with a story template and free music';b.onclick=()=>open();if(g)g.after(b);else document.querySelector('.timebar')?.appendChild(b)}
function startButton(){let cats=$$('vsCats');if(!cats||$$('vsBroll'))return;let b=document.createElement('button');b.type='button';b.id='vsBroll';b.className='vs-reviews';
  b.innerHTML='<b>🎞️ Build a video from your clips</b><span>Drop in your b-roll clips, pick a story like Hook → Problem → Solution, and we turn your b-roll into a finished video with words on screen and free music.</span>';
  b.onclick=()=>{let go=$$('vsGo');if(go)go.click();let el=$$('veStart');if(el)el.hidden=true;setTimeout(()=>open(true),60)};($$('vsReviews')||cats).before(b)}
new MutationObserver(startButton).observe(document.body,{childList:true,subtree:true});startButton();
})();
