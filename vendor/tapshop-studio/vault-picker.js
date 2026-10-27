// Media Vault picker shared by the design and video studios (only inside TapShop).
// Lists the signed-in creator's Vault files and hands the chosen one to the page's
// importVaultItem(item). The dashboard's "Use in Studio" arrives as tapshop:vault-import.
(function(){
  const inTapShop=window.parent!==window;
  const KIND_ICON={video:'▶',image:'🖼',audio:'♫',document:'📄',project:'✳',other:'📦'};
  const css=`.vp{width:min(560px,94vw);max-height:min(86vh,86dvh);overflow:auto;border:1px solid #8a7aa855;border-radius:16px;padding:18px;background:#fff;color:#221d2c;box-shadow:0 20px 60px #0006}
.vp.vp-dark{background:#1d1a26;color:#eee9f7}.vp::backdrop{background:#0008}.vp h2{margin:0 0 4px;font-size:18px}.vp p{margin:0 0 12px;font-size:12px;opacity:.75}
.vp-x{float:right;position:sticky;top:0;width:36px;height:36px;border-radius:50%;border:1px solid #8a7aa855;background:inherit;color:inherit;font-size:20px;cursor:pointer}
.vp-list{display:grid;gap:8px}.vp-item[hidden]{display:none}.vp-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:8px;border:1px solid #8a7aa855;border-radius:12px;background:transparent;color:inherit;cursor:pointer;font:inherit}
.vp-item:hover,.vp-item:focus-visible{border-color:#a07ae0;background:#a07ae01a}.vp-thumb{flex:0 0 64px;height:40px;border-radius:8px;background:#8a7aa833;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:18px}
.vp-thumb img{width:100%;height:100%;object-fit:cover}.vp-name{display:block;font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vp-meta{font-size:11px;opacity:.65}
.vp.vp-hidden{opacity:0}.vp.vp-hidden::backdrop{background:transparent}.vp-item.vp-drag{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}.vp-ghost{position:fixed;z-index:2147483647;pointer-events:none;transform:translate(-50%,-130%);padding:8px 12px;border-radius:12px;background:#221d2c;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 8px 24px #0006;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis;opacity:.92}.vp-ghost.vp-no{background:#6b6378}
.vp-folders{display:flex;gap:6px;overflow-x:auto;margin:0 0 10px;padding-bottom:2px}.vp-folder{white-space:nowrap;padding:6px 11px;border:1px solid #8a7aa855;border-radius:10px;background:transparent;color:inherit;font:600 12px system-ui,sans-serif;cursor:pointer}.vp-folder[aria-pressed=true]{background:#8a5fd6;border-color:#8a5fd6;color:#fff}
.vp-empty{padding:24px;text-align:center;border:2px dashed #8a7aa855;border-radius:12px;font-size:13px}.vp-link{margin-top:12px;border:0;background:none;color:#8a5fd6;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer;padding:0}`;
  let style=null;
  function size(n){return n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB'}
  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function dark(){return document.documentElement.dataset.theme==='dark'||(location.pathname.endsWith('video.html')&&!document.body.classList.contains('light'))}
  async function load(){let r=await fetch('/api/vault',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('Your Media Vault could not be loaded.');let j=await r.json();return {items:j.items||[],folders:j.folders||[]}}
  async function list(){return (await load()).items}
  async function file(item){let r=await fetch('/api/vault/'+encodeURIComponent(item.id)+'?raw=1',{credentials:'same-origin'});if(!r.ok)throw Error('That file could not be loaded from your Media Vault.');let b=await r.blob();return new File([b],item.name,{type:item.contentType||b.type||'application/octet-stream'})}
  async function open({title='From your Media Vault',kinds,accept,onPick,drag}){
    if(!inTapShop)return;
    if(!style){style=document.createElement('style');style.textContent=css;document.head.appendChild(style)}
    let d=document.createElement('dialog');d.className='vp'+(dark()?' vp-dark':'');d.setAttribute('aria-label',title);
    d.innerHTML=`<button type="button" class="vp-x" aria-label="Close">×</button><h2>${esc(title)}</h2><p>Loading your files…</p><div class="vp-folders" hidden></div><div class="vp-list"></div>`;
    document.body.appendChild(d);d.showModal();
    const close=()=>{d.close();d.remove()};
    d.querySelector('.vp-x').onclick=close;d.addEventListener('cancel',e=>{e.preventDefault();close()});
    d.addEventListener('click',e=>{if(e.target!==d)return;let r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()});
    let items,folders;try{({items,folders}=await load());items=items.filter(i=>(!kinds||kinds.includes(i.kind))&&(!accept||accept(i)))}catch(e){d.querySelector('p').textContent=e.message;return}
    d.querySelector('p').textContent=items.length?(drag?'Tap a file to add it, or drag it onto the timeline.':'Tap a file to add it.'):'';
    let box=d.querySelector('.vp-list');
    if(!items.length)box.innerHTML=`<div class="vp-empty">Nothing here yet. Upload files in your Media Vault, or use “Save to Vault”.</div>`;
    // Folder buttons, only for folders holding something this editor can use.
    let used=folders.filter(f=>items.some(i=>i.folderId===f.id)),bar=d.querySelector('.vp-folders');
    if(used.length){bar.hidden=false;for(const f of [{id:'',name:'All files'},...used]){let c=document.createElement('button');c.type='button';c.className='vp-folder';c.textContent=(f.id?'📁 ':'🗂 ')+f.name;c.setAttribute('aria-pressed',String(!f.id));
      c.onclick=()=>{for(const x of bar.children)x.setAttribute('aria-pressed',String(x===c));for(const x of box.children)x.hidden=!!f.id&&x.dataset.folder!==f.id};bar.appendChild(c)}}
    for(const it of items){let b=document.createElement('button');b.dataset.folder=it.folderId||'';b.type='button';b.className='vp-item';
      b.innerHTML=`<span class="vp-thumb">${it.kind==='image'&&!/svg/.test(it.contentType)?`<img src="/api/vault/${encodeURIComponent(it.id)}" alt="" loading="lazy">`:(KIND_ICON[it.kind]||'📦')}</span><span style="min-width:0"><span class="vp-name">${esc(it.name)}</span><span class="vp-meta">${size(it.size)}</span></span>`;
      b.onclick=()=>{if(b.dataset.dragged){delete b.dataset.dragged;return}close();onPick(it)};if(drag)draggable(b,it,d,close,drag);box.appendChild(b)}
    let more=document.createElement('button');more.type='button';more.className='vp-link';more.textContent='Open Media Vault';more.onclick=()=>{close();window.parent.postMessage({type:'tapshop:open-vault',version:1},location.origin)};d.appendChild(more);
  }
  // Drag a file out of the picker: a mouse drags after a small move; a finger holds for a
  // moment first, so swiping still scrolls the list. The picker turns invisible (not closed,
  // which would stop a finger's moves arriving) so the page underneath shows; drag.over(x,y) says what a drop there would do.
  // Registered up front: the browser decides whether a touch may scroll as the touch starts.
  let dragging=false;addEventListener('touchmove',e=>{if(dragging)e.preventDefault()},{passive:false});
  function draggable(b,it,d,close,drag){
    b.classList.add('vp-drag');b.addEventListener('contextmenu',e=>e.preventDefault());
    b.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      let sx=e.clientX,sy=e.clientY,x=sx,y=sy,active=false,ghost=null,timer=null,id=e.pointerId,touch=e.pointerType!=='mouse';
      const start=()=>{active=dragging=true;b.dataset.dragged='1';d.classList.add('vp-hidden');ghost=document.createElement('div');ghost.className='vp-ghost';document.body.appendChild(ghost);navigator.vibrate?.(15);move()};
      const move=()=>{if(!ghost)return;ghost.style.left=x+'px';ghost.style.top=y+'px';let o=drag.over(x,y);ghost.classList.toggle('vp-no',!o);ghost.textContent=(KIND_ICON[it.kind]||'📦')+' '+(o?.label||it.name)};
      const onMove=ev=>{if(ev.pointerId!==id)return;x=ev.clientX;y=ev.clientY;if(active){move();return}if(Math.hypot(x-sx,y-sy)>(touch?10:6)){if(touch)stop();else start()}};
      
      const stop=()=>{clearTimeout(timer);removeEventListener('pointermove',onMove);removeEventListener('pointerup',onUp);removeEventListener('pointercancel',onCancel);dragging=false;ghost?.remove();drag.over(-1,-1)};
      const onUp=ev=>{if(ev.pointerId!==id)return;stop();if(!active)return;setTimeout(()=>delete b.dataset.dragged,0);let ok=drag.over(ev.clientX,ev.clientY)&&true;drag.over(-1,-1);close();if(ok)drag.drop(it,ev.clientX,ev.clientY);else drag.miss?.(it)};
      const onCancel=ev=>{if(ev.pointerId!==id)return;stop();if(active){delete b.dataset.dragged;close()}};
      addEventListener('pointermove',onMove);addEventListener('pointerup',onUp);addEventListener('pointercancel',onCancel);
      if(touch)timer=setTimeout(start,350);
    });
  }
  window.VaultPicker={inTapShop,list,file,open};
  window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin)return;let m=e.data;if(!m||m.type!=='tapshop:vault-import'||m.version!==1||!m.item||typeof m.item.id!=='string')return;if(typeof window.importVaultItem==='function')window.importVaultItem({id:m.item.id,name:String(m.item.name||'file'),kind:String(m.item.kind||'other'),contentType:String(m.item.contentType||'')})});
})();
