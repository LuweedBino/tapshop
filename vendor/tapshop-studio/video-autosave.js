// Auto-save for the Video Editor. Every few seconds, if anything changed, the project (clips, text and
// caption tracks, layer settings, frame shape, name) and the media files it uses are written to this
// browser's IndexedDB, so they can be reopened from "Recent videos" on the start screen. Nothing is
// uploaded. The database name carries the creator scope the asset route gives localStorage keys
// (studio:<creatorId>:…), so creators sharing a browser don't see each other's videos.
(()=>{
const KEEP=12,EVERY=3000;
function scope(){try{localStorage.setItem('tapshop-scope-probe','1');let k=Object.keys(localStorage).find(k=>/^studio:.+:tapshop-scope-probe$/.test(k));return k?k.slice(7,-':tapshop-scope-probe'.length):'local'}catch{return 'local'}}
let dbp=null;
function db(){return dbp||(dbp=new Promise((res,rej)=>{let r=indexedDB.open('tapshop-video-'+scope(),1);r.onupgradeneeded=()=>{let d=r.result;d.createObjectStore('projects',{keyPath:'id'});d.createObjectStore('media',{keyPath:'key'}).createIndex('project','project')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function store(name,mode='readonly'){return (await db()).transaction(name,mode).objectStore(name)}

let projId=null,lastSig='',saving=false,warned=false;
const plain=t=>{let o={};for(let [k,v] of Object.entries(t))if(!['media','node','gain','url','file'].includes(k)&&(v==null||typeof v!=='object'||Array.isArray(v)))o[k]=v;o.hasFile=!!t.file;return o};
const capture=()=>({clips,selected,graphic:graphicTracks,extra:extraTracks.map(plain),aspect:$('aspect').value,name:$('projectName').value});
const empty=()=>!clips.length&&!graphicTracks.length&&!extraTracks.length;
function thumb(){try{let h=180,w=Math.round(h*canvas.width/canvas.height),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(canvas,0,0,w,h);return c.toDataURL('image/jpeg',.6)}catch{return null}}

async function save(force){if(saving||exporting||empty())return;let state=capture(),sig=JSON.stringify(state);if(!force&&sig===lastSig)return;saving=true;
  try{projId=projId||uid();let id=projId,keys=[],media=await store('media','readwrite');
    let used=new Set(clips.map(c=>c.assetId));
    for(let a of assets)if(used.has(a.id)&&a.file){let key=id+':a:'+a.id;keys.push(key);if(!(await req(media.getKey(key)))){media=await store('media','readwrite');await req(media.put({key,project:id,blob:a.file,name:a.name,type:a.file.type}))}media=await store('media','readwrite')}
    for(let t of extraTracks)if(t.file){let key=id+':x:'+t.id+':'+t.file.size;keys.push(key);if(!(await req(media.getKey(key)))){media=await store('media','readwrite');await req(media.put({key,project:id,blob:t.file,name:t.file.name,type:t.file.type}))}media=await store('media','readwrite')}
    let rec={id,name:state.name||'Untitled video',aspect:state.aspect,updated:Date.now(),thumb:thumb(),state:JSON.parse(sig),keys};
    await req((await store('projects','readwrite')).put(rec));
    // Drop media this project no longer uses, and projects beyond the most recent KEEP.
    let mine=await req((await store('media')).index('project').getAllKeys(IDBKeyRange.only(id)));media=await store('media','readwrite');for(let k of mine)if(!keys.includes(k))media.delete(k);
    let all=(await req((await store('projects')).getAll())).sort((a,b)=>b.updated-a.updated);for(let p of all.slice(KEEP))await remove(p.id);
    lastSig=sig;
  }catch(e){if(!warned){warned=true;toast(/quota/i.test(e?.name+e?.message)?'Your device is out of space, so this video isn’t auto-saving.':'Auto-save isn’t available in this browser.')}}
  finally{saving=false}}
async function remove(id){await req((await store('projects','readwrite')).delete(id));let ks=await req((await store('media')).index('project').getAllKeys(IDBKeyRange.only(id))),m=await store('media','readwrite');for(let k of ks)m.delete(k)}

// Empty the editor for a new video (the current one is already saved).
window.veNewProject=async function(){if(!empty())await save(true);pause();clips=[];selected=-1;graphicTracks=[];
  for(let t of extraTracks){try{t.media?.pause();t.node?.disconnect();t.gain?.disconnect()}catch{}}extraTracks=[];assets.length=0;history.length=0;try{redoStack.length=0;syncUndoButtons()}catch{}
  try{expandedStrip=null;pickedStrip=null}catch{}activeId=null;$('projectName').value='Untitled video';projId=null;lastSig='';playhead=0;render();renderTracks();renderGraphicTracks();await seekTimeline(0)};

async function open(id){let rec=await req((await store('projects')).get(id));if(!rec){toast('That video isn’t on this device any more.');refresh();return}
  await veNewProject();toast('Opening '+rec.name+'…');let files={};
  for(let m of await req((await store('media')).index('project').getAll(IDBKeyRange.only(id))))files[m.key]=new File([m.blob],m.name||'media',{type:m.type||m.blob.type});
  await fill(rec,files);projId=id;lastSig=JSON.stringify(capture());toast('Opened '+rec.name+'.')}
// Puts a saved project on the timeline. rec.id is the prefix of its media keys in files.
async function fill(rec,files){let st=rec.state,id=rec.id;
  $('aspect').value=st.aspect||'16:9';setAspect();$('projectName').value=st.name||rec.name;
  // Re-load each video under its saved id so the saved clips point at it unchanged.
  for(let aid of new Set(st.clips.map(c=>c.assetId))){let f=files[id+':a:'+aid];if(!f)continue;try{let a=await loadAsset(f);a.id=aid}catch(e){toast(e.message)}}
  clips=st.clips.filter(c=>assets.some(a=>a.id===c.assetId));selected=Math.min(st.selected??0,clips.length-1);graphicTracks=st.graphic||[];
  for(let s of st.extra||[]){addTrack(s.type);let t=extraTracks.at(-1),f=s.hasFile&&Object.entries(files).find(([k])=>k.startsWith(id+':x:'+s.id+':'))?.[1];
    if(f){targetTrack=t.id;await loadTrackMedia(f)}let {hasFile,...keep}=s;Object.assign(t,keep)}
  history.length=0;try{redoStack.length=0;syncUndoButtons()}catch{}render();renderTracks();renderGraphicTracks();await seekTimeline(0)}

// ---------- Projects in the Media Vault ----------
// One file holding the project and every clip it uses, so it reopens anywhere: MAGIC, the header's
// length (4 bytes), the header as JSON, then the media files one after another. It keeps the
// .tapshop.json ending because that's how the Vault and pickers recognise a project, and plain
// JSON projects from before this still open through the old restoreProject. origin ties it to its
// Recent videos entry, so reopening the file updates that entry instead of adding a copy.
const MAGIC='TAPSHOP1',enc=new TextEncoder();
function packProject(){if(empty())return null;projId=projId||uid();let state=JSON.parse(JSON.stringify(capture())),id=uid(),list=[],used=new Set(clips.map(c=>c.assetId));
  for(let a of assets)if(used.has(a.id)&&a.file)list.push({key:id+':a:'+a.id,file:a.file});
  for(let t of extraTracks)if(t.file)list.push({key:id+':x:'+t.id+':'+t.file.size,file:t.file});
  let head=enc.encode(JSON.stringify({id,origin:projId,name:state.name||'Untitled video',state,files:list.map(({key,file})=>({key,name:file.name,type:file.type,size:file.size}))})),len=new Uint8Array(4);new DataView(len.buffer).setUint32(0,head.length);
  return new Blob([MAGIC,len,head,...list.map(m=>m.file)],{type:'application/octet-stream'})}
async function unpackProject(file){let at=MAGIC.length+4;if(file.size<at||await file.slice(0,MAGIC.length).text()!==MAGIC)return null;
  let n=new DataView(await file.slice(MAGIC.length,at).arrayBuffer()).getUint32(0),head=JSON.parse(await file.slice(at,at+n).text()),files={};at+=n;
  for(let m of head.files){files[m.key]=new File([file.slice(at,at+m.size)],m.name,{type:m.type});at+=m.size}
  return {rec:head,files}}
window.vePackProject=packProject;
const restorePlain=restoreProject;restoreProject=async function(file){let packed=null;try{if(file)packed=await unpackProject(file)}catch{}if(!packed)return restorePlain(file);if(exporting)return;
  document.getElementById('veStart').hidden=true;await veNewProject();toast('Opening '+packed.rec.name+'…');await fill(packed.rec,packed.files);projId=packed.rec.origin||null;lastSig='';toast('Opened '+packed.rec.name+'.')};

// ---------- Recent videos on the start screen ----------
const ago=t=>{let s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.round(s/60)+' min ago':s<86400?Math.round(s/3600)+' h ago':Math.round(s/86400)+' d ago'};
async function refresh(){let box=document.getElementById('vsRecent');if(!box)return;let list=[];try{list=(await req((await store('projects')).getAll())).sort((a,b)=>b.updated-a.updated)}catch{}
  let sec=document.getElementById('vsRecentSec');if(sec)sec.hidden=!list.length;box.innerHTML=list.length?list.map(p=>`<div class="vs-rec" role="button" tabindex="0" data-id="${esc(p.id)}"><div class="th">${p.thumb?`<img src="${p.thumb}" alt="">`:''}</div><b>${esc(p.name)}</b><small>${esc(p.aspect||'')} · ${ago(p.updated)}</small><button type="button" class="x" data-more="${esc(p.id)}" aria-haspopup="menu" title="Rename, duplicate or delete" aria-label="More for ${esc(p.name)}">⋯</button></div>`).join(''):'<p class="vs-help" style="margin:0">Videos you make show up here automatically.</p>'}
// ⋯ menu on Recent videos: Open, Rename, Duplicate, Delete.
let menu=null;const closeMenu=()=>{menu?.remove();menu=null};
function openMenu(btn,id){closeMenu();menu=document.createElement('div');menu.className='vs-menu';menu.setAttribute('role','menu');
  menu.innerHTML=[['open','Open'],['rename','Rename'],['dup','Duplicate'],['del','Delete']].map(([k,l])=>`<button type="button" role="menuitem" data-a="${k}" class="${k==='del'?'vs-danger':''}">${l}</button>`).join('');
  document.getElementById('veStart').appendChild(menu);let r=btn.getBoundingClientRect(),host=document.getElementById('veStart'),w=menu.offsetWidth;
  menu.style.top=(r.bottom+host.scrollTop+6)+'px';menu.style.left=Math.max(8,Math.min(host.clientWidth-w-8,r.right-w))+'px';
  menu.onclick=async e=>{let a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;closeMenu();try{await act(a,id)}catch(x){toast('That didn’t work: '+(x.message||x))}};menu.querySelector('button')?.focus()}
async function act(a,id){let rec=await req((await store('projects')).get(id));if(!rec){refresh();return}
  if(a==='open'){document.getElementById('veStart').hidden=true;return open(id)}
  if(a==='rename'){let n=prompt('Rename video',rec.name);if(n==null)return;n=n.trim().slice(0,80)||'Untitled video';rec.name=n;rec.state={...rec.state,name:n};await req((await store('projects','readwrite')).put(rec));
    if(projId===id){$('projectName').value=n;lastSig=JSON.stringify(capture())}toast('Renamed to “'+n+'”.');return refresh()}
  if(a==='dup'){let nid=uid(),media=await req((await store('media')).index('project').getAll(IDBKeyRange.only(id))),keys=[];
    for(let m of media){let key=nid+m.key.slice(id.length);keys.push(key);await req((await store('media','readwrite')).put({...m,key,project:nid}))}
    await req((await store('projects','readwrite')).put({...rec,id:nid,name:rec.name+' copy',state:{...rec.state,name:rec.name+' copy'},keys,updated:Date.now()}));toast('Duplicated “'+rec.name+'”.');return refresh()}
  if(a==='del'){if(!confirm('Delete “'+rec.name+'” from this device? This can’t be undone.'))return;await remove(id);if(projId===id){projId=null;lastSig=''}toast('Deleted.');return refresh()}}
document.addEventListener('click',e=>{if(menu&&!e.target.closest('.vs-menu')&&!e.target.closest('[data-more]'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function mount(){let start=document.getElementById('veStart');if(!start||document.getElementById('vsRecent'))return;
  let head=[...start.querySelectorAll('h2')].find(h=>/where you left off/i.test(h.textContent));if(!head)return;
  head.textContent='Open a saved project file';
  // Recent videos go at the top, above step 1, and stay hidden until there is one.
  let sec=document.createElement('section');sec.id='vsRecentSec';sec.hidden=true;sec.innerHTML='<h2>Recent videos</h2><p class="vs-help">Saved automatically on this device as you edit.</p>';
  let box=document.createElement('div');box.id='vsRecent';box.className='vs-recent';sec.appendChild(box);start.querySelector('.vs-lead').after(sec);
  box.onclick=async e=>{let more=e.target.closest('[data-more]');if(more){e.stopPropagation();openMenu(more,more.dataset.more);return}
    let card=e.target.closest('.vs-rec');if(!card)return;document.getElementById('veStart').hidden=true;try{await open(card.dataset.id)}catch(x){toast('Couldn’t open that video: '+(x.message||x))}};
  box.onkeydown=e=>{if(e.key==='Enter')e.target.closest('.vs-rec')?.click()};
  let css=document.createElement('style');css.textContent=`#veStart .vs-recent{display:flex;gap:12px;margin:0 -16px 4px;padding:2px 16px 10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scroll-padding-left:16px;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin}#veStart .vs-rec{flex:none;width:150px;scroll-snap-align:start}
@media(max-width:520px){#veStart .vs-rec{width:140px}}
#veStart .vs-rec{position:relative;cursor:pointer;border:1px solid var(--ts-border,#e5e5e5);border-radius:16px;background:var(--ts-surface,#fff);padding:8px}
#veStart .vs-rec:hover{border-color:var(--ts-border-strong,#d4d4d4)}
#veStart .vs-rec .th{height:150px;border-radius:10px;background:var(--ts-soft,#f5f5f5);display:grid;place-items:center;overflow:hidden}
#veStart .vs-rec .th img{max-width:100%;max-height:100%;display:block}
#veStart .vs-rec b{display:block;font-size:13px;margin:8px 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#veStart .vs-rec small{display:block;font-size:11px;margin:2px 2px 2px;color:var(--ts-muted,#737373)}
#veStart .vs-rec .x{position:absolute;top:4px;right:4px;width:32px;height:32px;padding:0;border-radius:50%;display:grid;place-items:center;font-size:18px;line-height:1}
#veStart .vs-menu{position:absolute;z-index:45;min-width:160px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:14px;background:var(--ts-surface,#fff);border:1px solid var(--ts-border,#e5e5e5);box-shadow:0 10px 30px rgb(0 0 0/.2)}
#veStart .vs-menu button{text-align:left;border:0!important;border-radius:10px!important;padding:10px 12px!important;font-size:14px;justify-content:flex-start}
html body #veStart .vs-menu button.vs-danger{color:#dc2626!important}html.ts-dark body #veStart .vs-menu button.vs-danger{color:#ff8b8b!important}`;document.head.appendChild(css);refresh()}

mount();
// Refresh the list whenever the start screen is shown again (⌂ Start).
let startEl=document.getElementById('veStart');if(startEl)new MutationObserver(()=>{if(!startEl.hidden)refresh()}).observe(startEl,{attributes:true,attributeFilter:['hidden']});
// The Studio's Projects page sends a project here as video.html#recent=<id> or #vault=<id>.
(()=>{let h=new URLSearchParams(location.hash.slice(1)),recent=h.get('recent'),vault=h.get('vault');if(!recent&&!vault)return;window.history.replaceState(null,'',location.pathname);
  document.getElementById('veStart').hidden=true;if(recent)open(recent).catch(e=>toast('Couldn’t open that video: '+(e.message||e)));else importVaultItem({id:vault,name:h.get('name')||'Project.tapshop.json',kind:'project',contentType:''})})();
setInterval(()=>save(),EVERY);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
window.addEventListener('pagehide',()=>save());
})();
