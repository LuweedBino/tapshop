// Photo Lab core: the image (doc) and its layers, drawing it on screen, zoom and pan, undo
// history, selections, the layers and history panels, menus, dialogs and shortcuts.
// Rule that keeps undo cheap: a layer's canvas (and the selection mask) is never drawn into
// once history may hold it. Edits draw into a copy (or a new canvas) and swap it in, so a
// history step only keeps references.
const $=id=>document.getElementById(id);
const inTapShop=window.parent!==window;
const touchy=matchMedia('(pointer:coarse)').matches;
const MAX_SIDE=8192,MAX_AREA=touchy?16e6:40e6;
function mk(w,h,read){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));if(read)c.getContext('2d',{willReadFrequently:true});return c}
function g2(c){return c.getContext('2d')}
function clone(c,read){const n=mk(c.width,c.height,read);g2(n).drawImage(c,0,0);return n}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hexRgb(h){h=String(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');let n=parseInt(h.slice(0,6),16)||0;return [n>>16&255,n>>8&255,n&255]}
function rgbHex(r,g,b){return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('')}
function toast(s,ms=2600){let t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),ms)}
function busy(on,text='Working…'){let b=$('busy');b.textContent=text;b.hidden=!on}
// Lets the "Working…" cover paint before a slow step runs.
function later(fn,text){busy(true,text);return new Promise(res=>requestAnimationFrame(()=>setTimeout(async()=>{try{res(await fn())}catch(e){console.error(e);toast(e.message||'Something went wrong');res()}finally{busy(false)}},20)))}

// ---- Document
let doc=null,uid=1;
const colors={fg:'#000000',bg:'#ffffff'};
function newLayer(name,w,h,x=0,y=0){return {id:uid++,name,canvas:mk(w,h),x,y,visible:true,opacity:1,blend:'source-over',lockAlpha:false,text:null}}
function layer(){return doc?doc.layers[doc.active]:null}
function layerIndex(id){return doc.layers.findIndex(l=>l.id===id)}
function fitSize(w,h){let s=Math.min(1,MAX_SIDE/w,MAX_SIDE/h,Math.sqrt(MAX_AREA/(w*h)));return [Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s)),s<1]}
function makeDoc(w,h,name){doc={w,h,layers:[],active:0,sel:null,name:name||'Untitled image'};$('docName').value=doc.name;hist=[];hpos=-1;preview=null;selCache=null;return doc}
function startDoc(w,h,fill,name){
  [w,h]=fitSize(w,h);makeDoc(w,h,name);
  let l=newLayer(fill==='transparent'?'Layer':'Background',w,h);
  if(fill!=='transparent'){let g=g2(l.canvas);g.fillStyle=fill==='fg'?colors.fg:fill==='black'?'#000':'#fff';g.fillRect(0,0,w,h)}
  doc.layers.push(l);opened('New image');
}
function docFromImage(img,name){
  let [w,h,shrunk]=fitSize(img.width,img.height);makeDoc(w,h,name);
  let l=newLayer(name||'Background',w,h);g2(l.canvas).drawImage(img,0,0,w,h);doc.layers.push(l);opened('Open image');
  if(shrunk)toast('This photo was made smaller to fit in the editor ('+w+' × '+h+').',4500);
}
function opened(label){fitView();commit(label);setTool(tool?tool.id:'brush',true);$('start').hidden=true;renderPanels()}

// ---- Compositing and the screen
const view=$('view'),stage=$('stage');let zoom=1,panX=0,panY=0,dpr=1;
let comp=null,preview=null;// preview: {id, canvas, x, y, matrix?} drawn in place of that layer
let overlay=null;// function(g) drawing tool guides in image coordinates
let checker=null;
function checkerPattern(g){if(!checker){let c=mk(16,16),x=g2(c);x.fillStyle='#fff';x.fillRect(0,0,16,16);x.fillStyle='#d4d4d8';x.fillRect(0,0,8,8);x.fillRect(8,8,8,8);checker=c}return g.createPattern(checker,'repeat')}
function composite(target,opts={}){
  let g=g2(target);g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.clearRect(0,0,target.width,target.height);
  for(const l of doc.layers){
    if(!l.visible||opts.skip===l.id)continue;
    g.globalAlpha=l.opacity;g.globalCompositeOperation=l.blend;
    let p=!opts.plain&&preview&&preview.id===l.id?preview:null;
    if(p&&p.matrix){g.setTransform(...p.matrix);g.imageSmoothingQuality='high';g.drawImage(p.canvas,0,0);g.setTransform(1,0,0,1,0,0)}
    else if(p&&p.over){g.drawImage(p.canvas,p.x,p.y);g.globalAlpha=l.opacity*p.over.alpha;g.drawImage(p.over.canvas,p.x,p.y)}
    else if(p)g.drawImage(p.canvas,p.x,p.y);
    else g.drawImage(l.canvas,l.x,l.y);
  }
  g.globalAlpha=1;g.globalCompositeOperation='source-over';return target;
}
function flattened(){return composite(mk(doc.w,doc.h),{plain:true})}
let drawQueued=false;
function render(){if(!drawQueued){drawQueued=true;requestAnimationFrame(paint)}}
function paint(){
  drawQueued=false;dpr=window.devicePixelRatio||1;
  let W=stage.clientWidth,H=stage.clientHeight;
  if(view.width!==Math.round(W*dpr)||view.height!==Math.round(H*dpr)){view.width=Math.round(W*dpr);view.height=Math.round(H*dpr)}
  let g=g2(view);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,view.width,view.height);
  if(!doc)return;
  if(!comp||comp.width!==doc.w||comp.height!==doc.h)comp=mk(doc.w,doc.h);
  composite(comp);
  g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=checkerPattern(g);g.save();g.translate(panX,panY);g.fillRect(0,0,doc.w*zoom,doc.h*zoom);g.restore();
  g.save();g.translate(panX,panY);g.scale(zoom,zoom);g.imageSmoothingEnabled=zoom<2;g.imageSmoothingQuality='high';g.drawImage(comp,0,0);g.restore();
  g.strokeStyle='#0005';g.lineWidth=1;g.strokeRect(panX-.5,panY-.5,doc.w*zoom+1,doc.h*zoom+1);
  // Active layer's edge (dashed) when it isn't the full image.
  let l=layer();
  if(l&&(l.x||l.y||l.canvas.width!==doc.w||l.canvas.height!==doc.h)&&!(preview&&preview.matrix)){g.save();g.setLineDash([4,4]);g.strokeStyle='#e8a400';g.strokeRect(panX+l.x*zoom,panY+l.y*zoom,l.canvas.width*zoom,l.canvas.height*zoom);g.restore()}
  if(doc.sel)drawAnts(g);
  if(overlay){g.save();g.translate(panX,panY);g.scale(zoom,zoom);overlay(g);g.restore()}
  $('stZoom').textContent=Math.round(zoom*100)+'%';
}
window.addEventListener('resize',render);
if(window.ResizeObserver)new ResizeObserver(render).observe(stage);

function fitView(){if(!doc)return;let W=stage.clientWidth||600,H=stage.clientHeight||400,pad=touchy?16:40;zoom=clamp(Math.min((W-pad)/doc.w,(H-pad)/doc.h),.01,4);panX=(W-doc.w*zoom)/2;panY=(H-doc.h*zoom)/2;antsZoom=-1;render()}
function zoomAt(f,sx,sy){if(!doc)return;let nz=clamp(zoom*f,.01,32);if(sx===undefined){sx=stage.clientWidth/2;sy=stage.clientHeight/2}panX=sx-(sx-panX)*nz/zoom;panY=sy-(sy-panY)*nz/zoom;zoom=nz;render()}
function zoomTo(z){zoomAt(z/zoom)}
function toDoc(e){let r=view.getBoundingClientRect();return {x:(e.clientX-r.left-panX)/zoom,y:(e.clientY-r.top-panY)/zoom}}

// ---- Selection: doc.sel is an image-sized mask canvas (white where selected) or null.
let selCache=null,antsZoom=-1,antsOn=false;
function selChanged(){selCache=null;antsZoom=-1;render()}
function selBounds(){
  if(!doc.sel)return null;if(selCache&&selCache.b!==undefined)return selCache.b;
  let d=g2(doc.sel).getImageData(0,0,doc.w,doc.h).data,x0=doc.w,y0=doc.h,x1=-1,y1=-1;
  for(let y=0;y<doc.h;y++){let row=y*doc.w;for(let x=0;x<doc.w;x++)if(d[(row+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  selCache=selCache||{};selCache.b=x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};return selCache.b;
}
// Marching ants: the mask's edge pixels, thickened so they stay visible when zoomed out.
function buildAnts(){
  let t=Math.max(1,Math.round(1.3/zoom)),w=doc.w,h=doc.h;
  let src=g2(doc.sel).getImageData(0,0,w,h).data,out=new ImageData(w,h),o=out.data;
  let inside=i=>src[i*4+3]>=128;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=y*w+x,a=inside(i);
    if((x>0&&inside(i-1)!==a)||(y>0&&inside(i-w)!==a)||(!a?false:(x===0||y===0||x===w-1||y===h-1))){
      for(let dy=0;dy<t;dy++)for(let dx=0;dx<t;dx++){let xx=x+dx-(t>>1),yy=y+dy-(t>>1);if(xx<0||yy<0||xx>=w||yy>=h)continue;o[(yy*w+xx)*4+3]=255}}}
  let a=mk(w,h);g2(a).putImageData(out,0,0);
  let b=clone(a),bg=g2(b);bg.globalCompositeOperation='source-in';bg.fillStyle='#fff';bg.fillRect(0,0,w,h);
  selCache=selCache||{};selCache.ants=[a,b];antsZoom=t;
}
function drawAnts(g){
  let t=Math.max(1,Math.round(1.3/zoom));if(!selCache||!selCache.ants||antsZoom!==t)buildAnts();
  g.save();g.translate(panX,panY);g.scale(zoom,zoom);g.imageSmoothingEnabled=false;g.drawImage(selCache.ants[antsOn?1:0],0,0);g.restore();
}
setInterval(()=>{if(doc&&doc.sel){antsOn=!antsOn;render()}},450);
function selMask(){return doc.sel}
// The mask in a layer's own coordinates (same size as the layer).
function maskFor(l){if(!doc.sel)return null;let m=mk(l.canvas.width,l.canvas.height);g2(m).drawImage(doc.sel,-l.x,-l.y);return m}
// Keeps `before` outside the selection and `after` inside it (blended across a soft edge).
function clipToSel(l,before,after){
  if(!doc.sel)return after;
  let a=clone(after),ag=g2(a);ag.globalCompositeOperation='destination-in';ag.drawImage(doc.sel,-l.x,-l.y);
  let out=clone(before),og=g2(out);og.globalCompositeOperation='destination-out';og.drawImage(doc.sel,-l.x,-l.y);
  og.globalCompositeOperation='lighter';og.drawImage(a,0,0);return out;
}
function emptyMask(){return mk(doc.w,doc.h)}
function isEmptyMask(m){let d=g2(m).getImageData(0,0,m.width,m.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>8)return false;return true}
// mode: replace | add | subtract | intersect
function combineSel(shape,mode,label){
  let out;
  if(mode==='replace'||!doc.sel){out=mode==='subtract'?null:mode==='intersect'?null:shape}
  else{out=clone(doc.sel);let g=g2(out);g.globalCompositeOperation=mode==='add'?'source-over':mode==='subtract'?'destination-out':'destination-in';g.drawImage(shape,0,0)}
  if(out&&isEmptyMask(out))out=null;
  doc.sel=out;selChanged();commit(label||'Select');
}
function selectAll(){if(!doc)return;let m=emptyMask(),g=g2(m);g.fillStyle='#fff';g.fillRect(0,0,doc.w,doc.h);doc.sel=m;selChanged();commit('Select all')}
function selectNone(){if(!doc||!doc.sel)return;doc.sel=null;selChanged();commit('Select none')}
function selectInvert(){if(!doc)return;let m=emptyMask(),g=g2(m);g.fillStyle='#fff';g.fillRect(0,0,doc.w,doc.h);if(doc.sel){g.globalCompositeOperation='destination-out';g.drawImage(doc.sel,0,0)}doc.sel=isEmptyMask(m)?null:m;selChanged();commit('Invert selection')}

// ---- History
let hist=[],hpos=-1;const HIST_MAX=60,HIST_BYTES=touchy?320e6:900e6;
function snap(label){return {label,w:doc.w,h:doc.h,active:doc.active,sel:doc.sel,layers:doc.layers.map(l=>({...l,text:l.text&&{...l.text}}))}}
function histBytes(){let seen=new Set(),n=0;const add=c=>{if(c&&!seen.has(c)){seen.add(c);n+=c.width*c.height*4}};for(const s of hist){add(s.sel);s.layers.forEach(l=>add(l.canvas))}return n}
function commit(label){
  if(!doc)return;hist=hist.slice(0,hpos+1);hist.push(snap(label));
  while(hist.length>2&&(hist.length>HIST_MAX||histBytes()>HIST_BYTES))hist.shift();
  hpos=hist.length-1;changed();
}
function restore(s){doc.w=s.w;doc.h=s.h;doc.active=s.active;doc.sel=s.sel;doc.layers=s.layers.map(l=>({...l,text:l.text&&{...l.text}}));preview=null;selChanged();changed();if(window.onRestore)onRestore()}
function undo(){if(!doc||busyTool())return;if(hpos>0){hpos--;restore(hist[hpos]);toast('Undid: '+hist[hpos+1].label,1200)}}
function redo(){if(!doc||busyTool())return;if(hpos<hist.length-1){hpos++;restore(hist[hpos]);toast('Redid: '+hist[hpos].label,1200)}}
function jumpTo(i){if(busyTool())return;hpos=i;restore(hist[i])}
function busyTool(){if(window.cancelTool)cancelTool();return false}
let onChange=[];
function changed(){render();renderPanels();$('undoBtn').disabled=hpos<=0;$('redoBtn').disabled=hpos>=hist.length-1;$('stSize').textContent=doc?doc.w+' × '+doc.h:'';onChange.forEach(f=>f())}

// ---- Layer operations
function addLayer(l,label,at){doc.layers.splice(at===undefined?doc.active+1:at,0,l);doc.active=doc.layers.indexOf(l);commit(label||'New layer')}
function newLayerDialog(){
  if(!doc)return;
  openDialog({title:'New layer',fields:[{key:'name',type:'text',label:'Name',value:'Layer '+(doc.layers.length+1)},{key:'fill',type:'select',label:'Fill with',value:'transparent',options:[['transparent','Transparent'],['fg','Foreground colour'],['bg','Background colour'],['white','White']]}],
    ok:v=>{let l=newLayer(v.name||'Layer',doc.w,doc.h);if(v.fill!=='transparent'){let g=g2(l.canvas);g.fillStyle=v.fill==='fg'?colors.fg:v.fill==='bg'?colors.bg:'#fff';g.fillRect(0,0,doc.w,doc.h)}addLayer(l,'New layer')}});
}
function duplicateLayer(){let l=layer();if(!l)return;addLayer({...l,id:uid++,name:l.name+' copy',text:l.text&&{...l.text}},'Duplicate layer')}
function deleteLayer(){if(!doc||doc.layers.length<2)return toast('An image needs at least one layer.');doc.layers.splice(doc.active,1);doc.active=Math.min(doc.active,doc.layers.length-1);commit('Delete layer')}
function moveLayer(d){if(!doc)return;let i=doc.active,j=d==='top'?doc.layers.length-1:d==='bottom'?0:i+d;j=clamp(j,0,doc.layers.length-1);if(i===j)return;let [l]=doc.layers.splice(i,1);doc.layers.splice(j,0,l);doc.active=j;commit(d>0||d==='top'?'Raise layer':'Lower layer')}
// Draws `top` onto a copy of `bottom` grown to hold both; returns the merged layer.
function mergeTwo(bottom,top){
  let x0=Math.min(bottom.x,top.x),y0=Math.min(bottom.y,top.y),x1=Math.max(bottom.x+bottom.canvas.width,top.x+top.canvas.width),y1=Math.max(bottom.y+bottom.canvas.height,top.y+top.canvas.height);
  let c=mk(x1-x0,y1-y0),g=g2(c);g.globalAlpha=bottom.opacity;g.drawImage(bottom.canvas,bottom.x-x0,bottom.y-y0);
  g.globalAlpha=top.visible?top.opacity:0;g.globalCompositeOperation=top.blend;g.drawImage(top.canvas,top.x-x0,top.y-y0);
  return {...bottom,canvas:c,x:x0,y:y0,opacity:1,text:null};
}
function mergeDown(){if(!doc||doc.active===0)return toast('There is no layer below to merge into.');let i=doc.active;doc.layers.splice(i-1,2,mergeTwo(doc.layers[i-1],doc.layers[i]));doc.active=i-1;commit('Merge down')}
function mergeVisible(){if(!doc)return;let vis=doc.layers.filter(l=>l.visible);if(vis.length<2)return;let m={...vis[0],id:uid++,name:'Visible',canvas:flattened(),x:0,y:0,opacity:1,blend:'source-over',text:null};let at=doc.layers.indexOf(vis[0]);doc.layers=doc.layers.filter(l=>!l.visible||l===vis[0]);doc.layers[doc.layers.indexOf(vis[0])]=m;doc.active=doc.layers.indexOf(m);commit('Merge visible layers')}
function flattenImage(){if(!doc)return;let c=mk(doc.w,doc.h),g=g2(c);g.fillStyle=colors.bg;g.fillRect(0,0,doc.w,doc.h);g.drawImage(flattened(),0,0);doc.layers=[{...newLayer('Background',1,1),canvas:c}];doc.active=0;commit('Flatten image')}
function layerToImageSize(){let l=layer();if(!l)return;let c=mk(doc.w,doc.h);g2(c).drawImage(l.canvas,l.x,l.y);l.canvas=c;l.x=0;l.y=0;l.text=null;commit('Layer to image size')}
function alphaToSel(){let l=layer();if(!l)return;let m=emptyMask();g2(m).drawImage(l.canvas,l.x,l.y);let g=g2(m);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,doc.w,doc.h);combineSel(m,'replace','Alpha to selection')}
function renameLayer(l){openDialog({title:'Rename layer',fields:[{key:'name',type:'text',label:'Name',value:l.name}],ok:v=>{let i=layerIndex(l.id);if(i<0)return;doc.layers[i].name=(v.name||'Layer').slice(0,60);commit('Rename layer')}})}

// ---- Panels
let tab='opts';
function showTab(t){tab=t;document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));['opts','layers','hist'].forEach(p=>$('pane-'+p).hidden=p!==t);$('dock').classList.remove('closed');$('dockToggle').textContent='▾';renderPanels()}
document.querySelectorAll('.tabs [data-tab]').forEach(b=>b.onclick=()=>{if(touchy&&tab===b.dataset.tab&&!$('dock').classList.contains('closed')){$('dock').classList.add('closed');$('dockToggle').textContent='▴';return}showTab(b.dataset.tab)});
$('dockToggle').onclick=()=>{let c=$('dock').classList.toggle('closed');$('dockToggle').textContent=c?'▴':'▾';render()};
if(!matchMedia('(max-width:820px)').matches)$('dock').classList.remove('closed');
const BLENDS=[['source-over','Normal'],['multiply','Multiply'],['screen','Screen'],['overlay','Overlay'],['darken','Darken only'],['lighten','Lighten only'],['color-dodge','Dodge'],['color-burn','Burn'],['hard-light','Hard light'],['soft-light','Soft light'],['difference','Difference'],['exclusion','Exclusion'],['hue','Hue'],['saturation','Saturation'],['color','Colour'],['luminosity','Value']];
function renderPanels(){if(tab==='layers')renderLayers();else if(tab==='hist')renderHist()}
function renderLayers(){
  let p=$('pane-layers');if(!doc){p.innerHTML='';return}
  let l=layer();
  p.innerHTML=`<label class="opt"><span>Mode</span><select id="lBlend">${BLENDS.map(([v,n])=>`<option value="${v}"${l.blend===v?' selected':''}>${n}</option>`).join('')}</select></label>
<label class="opt"><span>Opacity <b id="lOpV">${Math.round(l.opacity*100)}%</b></span><input type="range" id="lOp" min="0" max="100" value="${Math.round(l.opacity*100)}"></label>
<label class="opt check"><input type="checkbox" id="lLock"${l.lockAlpha?' checked':''}><span>Lock see-through parts (paint only where there's already colour)</span></label>
<div class="lctl"><button id="lNew" title="New layer">＋ New</button><button id="lDup" title="Duplicate layer">⧉ Copy</button><button id="lUp" title="Raise layer">▲</button><button id="lDown" title="Lower layer">▼</button><button id="lMerge" title="Merge down">⤓ Merge</button><button id="lRen" title="Rename">✎ Name</button><button id="lAlpha" title="Alpha to selection">⬚ Select</button><button id="lDel" title="Delete layer">🗑</button></div>
<div class="layers" id="lList"></div><p class="hint">Top of the list is the front. Double-tap a name to rename it.</p>`;
  let list=$('lList');
  for(let i=doc.layers.length-1;i>=0;i--){let L=doc.layers[i],row=document.createElement('div');row.className='lrow'+(i===doc.active?' on':'');
    let th=document.createElement('canvas');th.width=80;th.height=80;let s=Math.min(80/doc.w,80/doc.h),tg=g2(th);tg.drawImage(L.canvas,40-doc.w*s/2+L.x*s,40-doc.h*s/2+L.y*s,L.canvas.width*s,L.canvas.height*s);
    let eye=document.createElement('button');eye.textContent='👁';eye.title=L.visible?'Hide':'Show';if(!L.visible)eye.classList.add('off');
    eye.onclick=e=>{e.stopPropagation();doc.layers[i].visible=!L.visible;commit(L.visible?'Hide layer':'Show layer')};
    let nm=document.createElement('span');nm.className='nm';nm.textContent=(L.text?'T  ':'')+L.name;
    row.append(eye,th,nm);row.onclick=()=>{if(doc.active!==i){doc.active=i;changed();if(window.onActiveLayer)onActiveLayer()}};row.ondblclick=()=>renameLayer(L);list.appendChild(row)}
  $('lBlend').onchange=e=>{l.blend=e.target.value;commit('Layer mode')};
  $('lOp').oninput=e=>{l.opacity=e.target.value/100;$('lOpV').textContent=e.target.value+'%';render()};$('lOp').onchange=()=>commit('Layer opacity');
  $('lLock').onchange=e=>{l.lockAlpha=e.target.checked;commit('Lock see-through')};
  $('lNew').onclick=newLayerDialog;$('lDup').onclick=duplicateLayer;$('lUp').onclick=()=>moveLayer(1);$('lDown').onclick=()=>moveLayer(-1);$('lMerge').onclick=mergeDown;$('lRen').onclick=()=>renameLayer(l);$('lDel').onclick=deleteLayer;$('lAlpha').onclick=alphaToSel;
}
function renderHist(){let p=$('pane-hist');p.innerHTML='';hist.forEach((s,i)=>{let b=document.createElement('button');b.textContent=s.label;if(i===hpos)b.className='on';else if(i>hpos)b.className='future';b.onclick=()=>jumpTo(i);p.appendChild(b)});let n=document.createElement('p');n.className='hint';n.textContent='Tap a step to go back to it. Older steps are dropped when memory runs low.';p.appendChild(n);let on=p.querySelector('.on');on&&on.scrollIntoView({block:'nearest'})}

// ---- Dialogs. Non-modal and placed at the side, so the picture stays visible for previews.
// fields: {key,type:range|number|select|check|text|textarea|color|note,label,min,max,step,value,options}
let dlgClose=null;
function openDialog({title,fields=[],ok,cancel,onChange,okText='OK',modal=false,extra}){
  let d=$('dlg');if(d.open)closeDialog(false);
  d.className='pl-dlg'+(modal?' center':'');
  d.innerHTML=`<h3>${esc(title)}</h3><div class="fields"></div><div class="row"><button type="button" data-x="cancel">Cancel</button><button type="button" class="primary" data-x="ok">${esc(okText)}</button></div>`;
  let box=d.querySelector('.fields'),inputs={};
  for(const f of fields){
    if(f.type==='note'){let p=document.createElement('p');p.className='hint';p.textContent=f.label;box.appendChild(p);continue}
    let lab=document.createElement('label');lab.className='opt'+(f.type==='check'?' check':'');let el;
    if(f.type==='select'){el=document.createElement('select');for(const [v,n] of f.options){let o=document.createElement('option');o.value=v;o.textContent=n;el.appendChild(o)}el.value=f.value}
    else if(f.type==='textarea'){el=document.createElement('textarea');el.rows=3;el.value=f.value||''}
    else{el=document.createElement('input');el.type=f.type==='range'?'range':f.type==='check'?'checkbox':f.type==='color'?'color':f.type==='number'?'number':'text';
      if(f.min!==undefined)el.min=f.min;if(f.max!==undefined)el.max=f.max;if(f.step!==undefined)el.step=f.step;
      if(f.type==='check')el.checked=!!f.value;else el.value=f.value}
    let span=document.createElement('span');span.textContent=f.label;
    if(f.type==='range'){let b=document.createElement('b');b.textContent=el.value+(f.unit||'');span.appendChild(b);el.addEventListener('input',()=>b.textContent=el.value+(f.unit||''))}
    if(f.type==='check')lab.append(el,span);else lab.append(span,el);
    box.appendChild(lab);inputs[f.key]=el;
  }
  if(extra)extra(box,inputs);
  const values=()=>{let v={};for(const f of fields){let el=inputs[f.key];if(!el)continue;v[f.key]=f.type==='check'?el.checked:(f.type==='range'||f.type==='number')?+el.value:el.value}return v};
  if(onChange){let q=0;const fire=()=>{cancelAnimationFrame(q);q=requestAnimationFrame(()=>onChange(values()))};box.addEventListener('input',fire);box.addEventListener('change',fire);fire()}
  dlgClose=okd=>{dlgClose=null;if(okd===false&&cancel)cancel()};
  d.querySelector('[data-x=cancel]').onclick=()=>closeDialog(false);
  d.querySelector('[data-x=ok]').onclick=async()=>{let v=values();let r=ok?await ok(v):undefined;if(r===false)return;closeDialog(true)};
  d.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeDialog(false)}else if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();d.querySelector('[data-x=ok]').click()}};
  if(modal)d.showModal();else d.show();
  let first=d.querySelector('input[type=text],input[type=number],textarea');if(first&&!touchy)first.focus();
  return {el:d,inputs,values};
}
function closeDialog(okd){let d=$('dlg');if(!d.open)return;let f=dlgClose;d.close();d.innerHTML='';f&&f(okd)}
function dialogOpen(){return $('dlg').open}
// A small chooser: buttons, resolves with the chosen value (or null).
function choose(title,options,sub){return new Promise(res=>{let d=$('dlg');if(d.open)closeDialog(false);d.className='pl-dlg center';
  d.innerHTML=`<h3>${esc(title)}</h3>${sub?`<p class="hint">${esc(sub)}</p>`:''}<div class="optbtns" style="flex-direction:column"></div><div class="row"><button type="button">Cancel</button></div>`;
  let box=d.querySelector('.optbtns');for(const [v,n] of options){let b=document.createElement('button');b.type='button';b.textContent=n;b.onclick=()=>{d.close();res(v)};box.appendChild(b)}
  d.querySelector('.row button').onclick=()=>{d.close();res(null)};d.oncancel=()=>res(null);dlgClose=null;d.showModal()})}

// ---- Menus
let MENUS={};// filled by the other files: name -> [[label, fn, shortcut, needsDoc=true] | '-' | '#Heading']
function buildMenubar(){let bar=$('menubar');bar.innerHTML='';for(const name of Object.keys(MENUS)){let b=document.createElement('button');b.textContent=name;b.setAttribute('aria-haspopup','true');b.setAttribute('aria-expanded','false');b.onclick=e=>{e.stopPropagation();openMenu(name,b)};bar.appendChild(b)}}
let openMenuEl=null;
function closeMenu(){if(openMenuEl){openMenuEl.remove();openMenuEl=null;document.querySelectorAll('.menubar>button').forEach(b=>b.setAttribute('aria-expanded','false'))}}
function openMenu(name,btn){
  let was=btn.getAttribute('aria-expanded')==='true';closeMenu();if(was)return;
  let m=document.createElement('div');m.className='menu';m.setAttribute('role','menu');
  for(const it of MENUS[name]){
    if(it==='-'){m.appendChild(document.createElement('hr'));continue}
    if(typeof it==='string'&&it[0]==='#'){let h=document.createElement('h6');h.textContent=it.slice(1);m.appendChild(h);continue}
    let [label,fn,key,needs=true]=it,b=document.createElement('button');b.setAttribute('role','menuitem');b.innerHTML=esc(label)+(key?`<kbd>${esc(key)}</kbd>`:'');b.disabled=needs&&!doc;
    b.onclick=()=>{closeMenu();fn()};m.appendChild(b)}
  document.body.appendChild(m);let r=btn.getBoundingClientRect();m.style.top=(r.bottom+2)+'px';m.style.left=Math.max(4,Math.min(r.left,innerWidth-m.offsetWidth-4))+'px';
  btn.setAttribute('aria-expanded','true');openMenuEl=m;
}
document.addEventListener('pointerdown',e=>{if(openMenuEl&&!openMenuEl.contains(e.target)&&!e.target.closest('.menubar'))closeMenu()});

// ---- Colours
function setColor(which,hex){colors[which]=hex;$(which==='fg'?'fgSw':'bgSw').style.background=hex;$(which==='fg'?'fgIn':'bgIn').value=hex;try{localStorage.setItem('tapshop-photo-colors',JSON.stringify(colors))}catch{}if(window.onColors)onColors()}
try{let c=JSON.parse(localStorage.getItem('tapshop-photo-colors'));if(c&&/^#[0-9a-f]{6}$/i.test(c.fg)&&/^#[0-9a-f]{6}$/i.test(c.bg)){colors.fg=c.fg;colors.bg=c.bg}}catch{}
setColor('fg',colors.fg);setColor('bg',colors.bg);
$('fgSw').onclick=()=>$('fgIn').click();$('bgSw').onclick=()=>$('bgIn').click();
$('fgIn').oninput=e=>setColor('fg',e.target.value);$('bgIn').oninput=e=>setColor('bg',e.target.value);
function swapColors(){let f=colors.fg;setColor('fg',colors.bg);setColor('bg',f)}
function resetColors(){setColor('fg','#000000');setColor('bg','#ffffff')}
$('swapC').onclick=swapColors;$('resetC').onclick=resetColors;

$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
$('fitBtn').onclick=fitView;$('oneBtn').onclick=()=>zoomTo(1);
$('docName').oninput=e=>{if(doc){doc.name=e.target.value||'Untitled image';onChange.forEach(f=>f())}};
$('backBtn').onclick=()=>location.href='index.html';
