// Project management on the design studio's Projects page: a ⋯ menu on each card (Open, Rename,
// Duplicate, Delete) and a Select mode to delete several at once. Projects live in `projects`
// (localStorage forma-projects), newest first.
(()=>{
const keep=()=>{try{localStorage.setItem('forma-projects',JSON.stringify(projects));return true}catch{toast('Browser storage is full. Delete or download some designs.');return false}};
const newId=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2);
let picking=false,picked=new Set(),menu=null;
const idxOf=c=>+(/loadProject\((\d+)\)/.exec(c.getAttribute('onclick')||'')||[])[1];

function closeMenu(){menu?.remove();menu=null}
function openMenu(btn,i){closeMenu();let p=projects[i];if(!p)return;menu=document.createElement('div');menu.className='pj-menu';menu.setAttribute('role','menu');
  menu.innerHTML=[['open','Open'],['rename','Rename'],['dup','Duplicate'],['del','Delete']].map(([k,l])=>`<button type="button" role="menuitem" data-a="${k}" class="${k==='del'?'pj-danger':''}">${l}</button>`).join('');
  document.body.appendChild(menu);let r=btn.getBoundingClientRect(),w=menu.offsetWidth;menu.style.top=(r.bottom+window.scrollY+6)+'px';menu.style.left=Math.max(8,Math.min(window.innerWidth-w-8,r.right+window.scrollX-w))+'px';
  menu.onclick=e=>{let a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;closeMenu();act(a,i)};menu.querySelector('button')?.focus()}
function act(a,i){let p=projects[i];if(!p)return;
  if(a==='open')return loadProject(i);
  if(a==='rename'){let n=prompt('Rename design',p.name||'Untitled design');if(n==null)return;n=n.trim().slice(0,80)||'Untitled design';p.name=n;if(typeof design!=='undefined'&&design?.id===p.id){design.name=n;let t=document.getElementById('title');if(t)t.value=n}if(keep())toast('Renamed to “'+n+'”.');render();return}
  if(a==='dup'){let c=structuredClone(p);c.id=newId();c.name=(p.name||'Untitled design')+' copy';projects.splice(i+1,0,c);if(keep())toast('Duplicated “'+p.name+'”.');render();return}
  if(a==='del'){if(!confirm('Delete “'+(p.name||'Untitled design')+'”? This can’t be undone.'))return;projects.splice(i,1);if(keep())toast('Deleted.');render()}}
function deletePicked(){let ids=[...picked];if(!ids.length)return;if(!confirm(`Delete ${ids.length} design${ids.length>1?'s':''}? This can’t be undone.`))return;
  for(let id of ids){let i=projects.findIndex(p=>p.id===id);if(i>=0)projects.splice(i,1)}picked.clear();picking=false;if(keep())toast(`Deleted ${ids.length} design${ids.length>1?'s':''}.`);render()}

const renderNoManage=render;render=function(){renderNoManage();closeMenu();if(mode!=='projects'){picking=false;picked.clear();return}
  let grid=document.getElementById('grid');if(!grid)return;grid.classList.toggle('pj-picking',picking);
  grid.querySelectorAll('.card').forEach(c=>{let i=idxOf(c),p=projects[i];if(!p)return;c.classList.add('pj-card');c.dataset.pid=p.id;
    let b=document.createElement('button');b.type='button';b.className='pj-more';b.textContent='⋯';b.title='Rename, duplicate or delete';b.setAttribute('aria-label','More for '+(p.name||'design'));b.setAttribute('aria-haspopup','menu');
    b.onclick=e=>{e.stopPropagation();openMenu(b,i)};c.appendChild(b);
    if(picking){let on=picked.has(p.id);c.classList.toggle('pj-on',on);let m=document.createElement('span');m.className='pj-check';m.textContent=on?'✓':'';c.appendChild(m)}});
  // Select mode controls next to the design count.
  let count=document.getElementById('count');if(count&&projects.length){let tools=document.createElement('span');tools.className='pj-tools';
    tools.innerHTML=picking?` · <button type="button" class="vault-link" data-pj="del">Delete selected (${picked.size})</button> · <button type="button" class="vault-link" data-pj="all">${picked.size===projects.length?'Select none':'Select all'}</button> · <button type="button" class="vault-link" data-pj="done">Done</button>`:` · <button type="button" class="vault-link" data-pj="pick">Select</button>`;
    tools.onclick=e=>{let k=e.target.closest('[data-pj]')?.dataset.pj;if(k==='pick'){picking=true;picked.clear()}else if(k==='done'){picking=false;picked.clear()}else if(k==='all'){if(picked.size===projects.length)picked.clear();else projects.forEach(p=>picked.add(p.id))}else if(k==='del')return deletePicked();else return;render()};
    count.appendChild(tools)}};
// Video projects under the designs: ones saved to the Media Vault, and the Video Editor's Recent
// videos on this device. Both open in the Video Editor. The database belongs to video-autosave.js,
// so if it doesn't exist yet the upgrade is abandoned rather than creating it without its stores.
function recentVideos(){return new Promise(res=>{let scope='local';try{localStorage.setItem('tapshop-scope-probe','1');let k=Object.keys(localStorage).find(k=>/^studio:.+:tapshop-scope-probe$/.test(k));if(k)scope=k.slice(7,-':tapshop-scope-probe'.length)}catch{}
  let r;try{r=indexedDB.open('tapshop-video-'+scope,1)}catch{return res([])}
  r.onupgradeneeded=()=>r.transaction.abort();r.onerror=()=>res([]);r.onsuccess=()=>{let d=r.result,all=d.transaction('projects').objectStore('projects').getAll();all.onsuccess=()=>{d.close();res(all.result||[])};all.onerror=()=>{d.close();res([])}}})}
async function vaultProjects(){if(typeof VaultPicker==='undefined'||!VaultPicker.inTapShop)return [];try{return (await VaultPicker.list()).filter(i=>/\.tapshop\.json$/i.test(i.name))}catch{return []}}
let videoPass=0;
async function renderVideos(){let pass=++videoPass,grid=document.getElementById('grid');if(!grid)return;let [recent,vault]=await Promise.all([recentVideos(),vaultProjects()]);if(pass!==videoPass||mode!=='projects')return;
  document.getElementById('pjVideos')?.remove();let cards=[...vault.map(i=>({name:i.name.replace(/\.tapshop\.json$/i,''),where:'⛁ Media Vault',href:'video.html#'+new URLSearchParams({vault:i.id,name:i.name})})),...recent.sort((a,b)=>b.updated-a.updated).map(p=>({name:p.name,where:'📱 This device',thumb:p.thumb,href:'video.html#'+new URLSearchParams({recent:p.id})}))];
  if(!cards.length)return;let sec=document.createElement('section');sec.id='pjVideos';let h=document.createElement('h2');h.textContent='Video projects';let box=document.createElement('div');box.className='pj-vids';
  for(const c of cards){let a=document.createElement('a'),th=document.createElement('span'),b=document.createElement('b'),s=document.createElement('small');a.href=c.href;a.className='pj-vid';th.className='pj-th';if(c.thumb){let i=new Image();i.alt='';i.src=c.thumb;th.appendChild(i)}else th.textContent='🎬';b.textContent=c.name;s.textContent=c.where;a.append(th,b,s);box.appendChild(a)}
  sec.append(h,box);grid.after(sec)}
const renderNoVideos=render;render=function(){document.getElementById('pjVideos')?.remove();renderNoVideos();if(mode==='projects')renderVideos();else videoPass++};
// In Select mode a tap on a card picks it instead of opening it.
document.addEventListener('click',e=>{if(!picking||mode!=='projects')return;let c=e.target.closest('#grid .pj-card');if(!c||e.target.closest('.pj-more'))return;e.preventDefault();e.stopImmediatePropagation();
  let id=c.dataset.pid;if(picked.has(id))picked.delete(id);else picked.add(id);render()},true);
document.addEventListener('click',e=>{if(menu&&!e.target.closest('.pj-menu')&&!e.target.closest('.pj-more'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
window.addEventListener('resize',closeMenu);

let css=document.createElement('style');css.textContent=`.pj-card{position:relative}
.pj-more{position:absolute;top:14px;right:14px;z-index:2;width:36px;height:36px;padding:0!important;border-radius:50%!important;font-size:18px;line-height:1;display:grid;place-items:center}
.pj-menu{position:absolute;z-index:60;min-width:160px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:14px;background:var(--ts-surface,#fff);border:1px solid var(--ts-border,#e5e5e5);box-shadow:0 10px 30px rgb(0 0 0/.18)}
.pj-menu button{text-align:left;border:0!important;border-radius:10px!important;padding:10px 12px!important;font-size:14px;justify-content:flex-start}
html body .pj-menu button.pj-danger{color:#dc2626!important}html.ts-dark body .pj-menu button.pj-danger{color:#ff8b8b!important}
.pj-check{position:absolute;top:14px;left:14px;z-index:2;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:var(--ts-surface,#fff);color:var(--ts-on-primary,#fff);border:2px solid var(--ts-border-strong,#d4d4d4)}
.pj-on .pj-check{background:var(--ts-primary,#171717);border-color:var(--ts-primary,#171717)}
.pj-picking .pj-card{cursor:pointer}.pj-on{outline:3px solid var(--ts-primary,#171717);outline-offset:-1px}
.pj-tools button{font:inherit}
#pjVideos{margin-top:24px}#pjVideos h2{margin:0 0 12px;font-size:18px}.pj-vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.pj-vid{display:block;padding:8px;border:1px solid var(--ts-border,#e5e5e5);border-radius:16px;background:var(--ts-surface,#fff);color:inherit;text-decoration:none}.pj-vid:hover{border-color:var(--ts-border-strong,#d4d4d4)}
.pj-th{display:grid;place-items:center;height:150px;border-radius:10px;overflow:hidden;background:var(--ts-soft,#f5f5f5);font-size:32px}.pj-th img{max-width:100%;max-height:100%;display:block}
.pj-vid b{display:block;margin:8px 2px 0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pj-vid small{display:block;margin:2px;font-size:11px;color:var(--ts-muted,#737373)}`;document.head.appendChild(css);
})();
