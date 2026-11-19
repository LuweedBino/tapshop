// ✨ Fix it for me: runs the Smart editing assistant's tools on the whole video in one tap.
// Timeline changes share one Undo; cleaned sound is undone with "Use original sound".
(()=>{
const KEY='tapshop-smartfix',STEPS=[
  ['quiet','✂️ Cut out pauses and quiet parts'],
  ['clean','🔇 Clean up background noise'],
  ['vertical','📱 Make it vertical for TikTok, Reels and Shorts'],
  ['zoom','🎬 Add slow, smooth zooms']];
let prefs={quiet:true,clean:true,vertical:true,zoom:true};
try{Object.assign(prefs,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}};
const loud=new Map();

// Loudness every 0.1 s of a file, decoded small; null when it has no readable sound.
async function levels(a){if(loud.has(a.id))return loud.get(a.id);let out=null;
  try{if(a.file&&a.file.size<=150*1024*1024){const ctx=new OfflineAudioContext(1,1,16000),buf=await ctx.decodeAudioData(await a.file.arrayBuffer()),d=buf.getChannelData(0),step=1600,r=[];
    for(let i=0;i<d.length;i+=step){let s=0,n=0;for(let j=i;j<Math.min(d.length,i+step);j+=2){s+=d[j]*d[j];n++}r.push(Math.sqrt(s/Math.max(n,1)))}out=r}}catch{}
  loud.set(a.id,out);return out}

// Quiet stretches (source seconds) of one clip, padded so words aren't clipped.
function quietParts(c,r){const from=Math.floor(c.in*10),to=Math.min(r.length,Math.ceil(c.out*10)),part=r.slice(from,to);if(part.length<10)return [];
  const sorted=[...part].sort((x,y)=>x-y),p=q=>sorted[Math.floor(q*(sorted.length-1))],limit=Math.max(p(.15)*2.5,p(.95)*.18,.008);
  if(p(.95)<.01)return [];// no real sound at all: leave the clip alone
  const out=[];let s=null;for(let i=0;i<=part.length;i++){const quiet=i<part.length&&part[i]<limit,t=c.in+i/10;
    if(quiet&&s===null)s=t;else if(!quiet&&s!==null){const a=s===c.in?s:s+.15,b=i===part.length?c.out:Math.min(c.out,t)-.15;if(b-a>=.45)out.push([a,b]);s=null}}
  return out}

async function cutQuiet(note){let cut=0,n=0;const all=clips.length;
  for(let i=clips.length-1;i>=0;i--){const c=clips[i],a=asset(c);if(!a||c.locked||c.muted||c.volume===0)continue;note(`Listening to clip ${all-i} of ${all}…`);
    const r=await levels(a);if(!r)continue;const q=quietParts(c,r);if(!q.length)continue;
    const keep=[];let cur=c.in;for(const [a,b] of q){if(a-cur>.1)keep.push([cur,a]);cur=b}if(c.out-cur>.1)keep.push([cur,c.out]);if(!keep.length)continue;
    const start=startOf(i),sp=c.speed||1;
    clips.splice(i,1,...keep.map(([a,b],k)=>{const s={...c,id:uid(),in:a,out:b,_jump:keep.length>1};if(k)delete s.offset;return s}));
    for(const [a,b] of [...q].reverse()){const A=start+(a-c.in)/sp,d=(b-a)/sp;if(typeof rippleGap==='function')rippleGap(A,d);cut+=d;n++}}
  return {cut,n}}

function addZooms(){let n=0,slow=0,jump=0;for(const c of clips){if(c.motion||c.locked){delete c._jump;continue}
  if(c._jump){c.motion=jump++%2?'closeSoft':'';if(c.motion)n++}else{c.motion=slow++%2?'slowOut':'slowIn';n++}delete c._jump}return n}

async function run(btn,out){if(exporting||analysisBusy)return;if(!clips.length){out.textContent='Add a video first.';return}
  if(!STEPS.some(([k])=>prefs[k])){out.textContent='Tick at least one thing to fix.';return}
  pause();analysisBusy=true;btn.disabled=true;const done=[],note=t=>out.textContent=t;
  try{snapshot();
    if(prefs.quiet){const {cut,n}=await cutQuiet(note);done.push(n?`Cut ${n} pause${n>1?'s':''} (${cut.toFixed(1)}s shorter)`:'No long pauses found')}
    if(prefs.vertical){if($('aspect').value!=='9:16'){$('aspect').value='9:16';setAspect();for(const c of clips)c.fit='cover';done.push('Made it vertical (9:16). To change it back, use the shape menu above the preview')}else done.push('Already vertical')}
    if(prefs.zoom){const n=addZooms();done.push(n?`Added smooth zooms to ${n} clip${n>1?'s':''}`:'Clips already had movement')}else for(const c of clips)delete c._jump;
    render();try{inspector()}catch{}seekTimeline(0);draw();
    if(prefs.clean&&typeof veCleanSound==='function'){const used=assets.filter(a=>clips.some(c=>c.assetId===a.id));let ok=0;
      for(let i=0;i<used.length;i++)ok+=await veCleanSound(used[i],p=>note(`Cleaning sound ${i+1} of ${used.length}… ${p}%`))?1:0;
      done.push(ok?`Cleaned the sound on ${ok} video${ok>1?'s':''}`:'Couldn’t read the sound to clean it')}
    out.innerHTML='<b>Done! ✨</b><br>'+done.map(t=>'• '+t).join('<br>')+'<br><small>Press ▶ to watch. ↶ Undo puts the timeline back; “Use original sound” brings back the old sound.</small>';
    toast('✨ Fixed! Press ▶ to watch it.')}
  catch(e){console.error(e);out.textContent='Something went wrong. Tap ↶ Undo to go back.'}
  finally{for(const c of clips)delete c._jump;analysisBusy=false;btn.disabled=false}}

const dlg=document.getElementById('smartDialog');if(!dlg)return;
const card=document.createElement('div');card.className='toolcard smartfix';
card.innerHTML='<b>✨ Fix it for me</b><p class="sub">Fixes your whole video in one tap. Untick anything you don’t want.</p>'+
  STEPS.map(([k,l])=>`<label class="sf-row"><input type="checkbox" data-k="${k}"${prefs[k]?' checked':''}> ${l}</label>`).join('')+
  '<button type="button" class="primary sf-go">✨ Fix it for me</button><div class="result" aria-live="polite"></div>';
const sub=dlg.querySelector('p.sub');(sub||dlg.firstChild).after(card);
if(sub)sub.textContent='Fix everything at once, or use one tool at a time below. You can always Undo.';
const st=document.createElement('style');st.textContent='#smartDialog .smartfix{border:2px solid #ff5b83}#smartDialog .sf-row{display:flex;gap:8px;align-items:center;margin:6px 0;font-size:13px;font-weight:500}#smartDialog .sf-row input{width:auto;margin:0}#smartDialog .sf-go{width:100%;margin-top:10px;background:#ff5b83!important;color:#fff!important;border-color:#ff5b83!important;font-weight:700}';
document.head.appendChild(st);
card.querySelectorAll('input[data-k]').forEach(i=>i.onchange=()=>{prefs[i.dataset.k]=i.checked;save()});
const out=card.querySelector('.result');card.querySelector('.sf-go').onclick=e=>run(e.target,out);
window.veFixItForMe=()=>{dlg.open||dlg.showModal();run(card.querySelector('.sf-go'),out)};
})();
