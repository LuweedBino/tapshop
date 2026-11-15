// Resize and move videos on the preview, like text and shapes. Tap a video on the preview to pick it: a pink box
// with four corner handles shows. Drag inside to move it, drag a corner to make it bigger or smaller (it keeps its
// shape). A double-tap opens its editing menu (below), which has "Back to normal size". Works for main clips (new clip fields zoom, px, py: size ×, and
// shift as a share of the frame; missing = normal) and video layers (their own x, y, scale). Text and shapes on top
// win the tap. Drawn through clipMotion and the layer drawing, so the preview and both exports match. Undo-able.
(()=>{
let picked=null,gest=null,lastTap={t:0,key:''};
const W=()=>canvas.width,H=()=>canvas.height;
// Main clips: fold the clip's own size and shift into its movement, so draw() (preview and exports) uses them.
const baseMotion=clipMotion;clipMotion=function(p,t,w,h){const m=baseMotion(p,t,w,h),c=p.c;m.s*=c.zoom||1;m.dx+=(c.px||0)*w;m.dy+=(c.py||0)*h;return m};
const layerOn=t=>t.type==='video'&&!t.hidden&&t.media&&(t.media.readyState>=2||t.media._frame)&&playhead>=t.offset&&playhead<t.offset+(t.end-t.start)/(t.speed||1);
function box(k){if(k.kind==='layer'){const t=extraTracks.find(x=>x.id===k.id);if(!t||!layerOn(t))return null;const v=t.media,w=W()*t.scale/100,h=w*(v.videoHeight||9)/(v.videoWidth||16);return {x:W()*t.x/100-w/2,y:H()*t.y/100-h/2,w,h}}
  const p=at(playhead);if(!p||p.c.id!==k.id)return null;const v=asset(p.c)?.video;if(!v?.videoWidth)return null;
  const f=p.c.fit==='cover'?Math.max(W()/v.videoWidth,H()/v.videoHeight):Math.min(W()/v.videoWidth,H()/v.videoHeight),m=clipMotion(p,playhead,W(),H()),w=v.videoWidth*f*m.s,h=v.videoHeight*f*m.s;
  return {x:(W()-w)/2+m.dx,y:(H()-h)/2+m.dy,w,h}}
// Corner handles, kept inside the frame so a filled (bigger than the frame) video can still be resized.
function corners(b){const r=handleRadius()*1.2,cl=(v,a)=>Math.max(r,Math.min(a-r,v));return [[cl(b.x,W()),cl(b.y,H())],[cl(b.x+b.w,W()),cl(b.y,H())],[cl(b.x+b.w,W()),cl(b.y+b.h,H())],[cl(b.x,W()),cl(b.y+b.h,H())]]}
function hit(pt){for(const t of [...extraTracks].reverse()){if(!layerOn(t))continue;const b=box({kind:'layer',id:t.id});if(b&&pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h)return {kind:'layer',id:t.id}}
  const p=at(playhead);if(p){const b=box({kind:'clip',id:p.c.id});if(b&&pt.x>=Math.max(0,b.x)&&pt.x<=Math.min(W(),b.x+b.w)&&pt.y>=Math.max(0,b.y)&&pt.y<=Math.min(H(),b.y+b.h))return {kind:'clip',id:p.c.id}}return null}
const item=k=>k.kind==='layer'?extraTracks.find(x=>x.id===k.id):clips.find(c=>c.id===k.id);
// The pink box and handles (never in exports).
const baseDraw=draw;draw=function(){baseDraw();if(!picked||exporting||(typeof veRendering!=='undefined'&&veRendering))return;const b=box(picked);if(!b){return}
  const r=handleRadius();ctx.save();ctx.strokeStyle='#ff3ea5';ctx.lineWidth=Math.max(2,r*.35);ctx.setLineDash([r*1.2,r*.8]);ctx.strokeRect(Math.max(0,b.x),Math.max(0,b.y),Math.min(W(),b.x+b.w)-Math.max(0,b.x),Math.min(H(),b.y+b.h)-Math.max(0,b.y));ctx.setLineDash([]);
  ctx.fillStyle='#fff';for(const [x,y] of corners(b)){ctx.beginPath();ctx.arc(x,y,r*.95,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.restore()};
// Runs after the text/shape handlers: if they took the tap (a text or shape was hit), the video lets go.
canvas.addEventListener('pointerdown',e=>{if(exporting||e.button!==0)return;if(e.defaultPrevented){if(picked){picked=null;draw()}return}
  const pt=canvasPoint(e),r=hitRadius(e);let onHandle=-1;
  if(picked){const b=box(picked);if(b)onHandle=corners(b).findIndex(([x,y])=>Math.hypot(pt.x-x,pt.y-y)<=r)}
  const k=onHandle>=0?picked:hit(pt);if(!k){if(picked){picked=null;draw()}return}
  const key=k.kind+k.id,now=performance.now();
  lastTap={t:now,key};e.preventDefault();pause();picked=k;try{pickedStrip={kind:k.kind==='layer'?'extra':'main',id:k.id};decorateStrips()}catch{}const b=box(k),it=item(k);if(!b||!it)return;
  const cx=b.x+b.w/2,cy=b.y+b.h/2;gest={k,start:pt,cx,cy,d0:Math.max(1,Math.hypot(pt.x-cx,pt.y-cy)),resize:onHandle>=0,
    o:k.kind==='layer'?{x:it.x,y:it.y,scale:it.scale}:{zoom:it.zoom||1,px:it.px||0,py:it.py||0}};
  canvas.setPointerCapture(e.pointerId);canvas.style.cursor=gest.resize?'nwse-resize':'grabbing';draw()});
canvas.addEventListener('pointermove',e=>{if(!gest)return;const pt=canvasPoint(e),g=gest,it=item(g.k);if(!it)return;
  if(!g.snap){if(Math.hypot(pt.x-g.start.x,pt.y-g.start.y)<2)return;snapshot();g.snap=true}
  if(g.resize){const ratio=Math.hypot(pt.x-g.cx,pt.y-g.cy)/g.d0;if(g.k.kind==='layer')it.scale=Math.max(5,Math.min(400,Math.round(g.o.scale*ratio*10)/10));else it.zoom=Math.max(.2,Math.min(5,Math.round(g.o.zoom*ratio*1000)/1000))}
  else{const dx=pt.x-g.start.x,dy=pt.y-g.start.y;if(g.k.kind==='layer'){it.x=Math.round((g.o.x+dx/W()*100)*10)/10;it.y=Math.round((g.o.y+dy/H()*100)*10)/10}else{it.px=Math.round((g.o.px+dx/W())*1000)/1000;it.py=Math.round((g.o.py+dy/H())*1000)/1000}}
  draw()});
const end=()=>{if(!gest)return;const g=gest;gest=null;canvas.style.cursor='default';if(g.k.kind==='layer')renderTracks();draw()};
canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
// Let go when the picked video leaves the screen (another time, deleted) so the box never points at nothing.
const baseSeek=seekTimeline;seekTimeline=async function(t){const r=await baseSeek(t);if(picked&&!box(picked)){picked=null;draw()}return r};
window.vePickedVideo=()=>picked;window.veEndVideoGesture=()=>{if(gest){gest=null;canvas.style.cursor='default'}};
window.veResetVideoFrame=k=>{const it=item(k);if(!it)return;pause();snapshot();if(k.kind==='layer')Object.assign(it,{x:50,y:50,scale:100});else{delete it.zoom;delete it.px;delete it.py}if(k.kind==='layer')renderTracks();draw();toast('Back to normal size and place.')};
})();


// ---------- Editing menu on the preview ----------
// Double-tap text, a sticker or a video on the preview and the same editing menu its timeline strip has pops up
// over the editor, with Apply. Changes show straight away as usual; Apply (or ✕, or a tap anywhere else) closes it.
// The strip's own options block is moved into the pop-up while it's open (moved back on every re-render), so
// nothing is duplicated and every control keeps working.
let pop=null,popFor=null,canvasTap={t:0,x:0,y:0};
{const st=document.createElement('style');st.textContent=`.pv-pop{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:9990;width:min(620px,calc(100vw - 16px));max-height:min(62vh,640px);display:flex;flex-direction:column;background:var(--ts-surface,#1b1922);color:var(--ts-text,#f4f1f7);border:2px solid #ff3ea5;border-radius:18px;box-shadow:0 18px 48px #0007;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:pvIn .18s ease-out}
html:not(.ts-dark) .pv-pop{background:#fff;color:#16141c;box-shadow:0 18px 48px #0003}
.pv-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--ts-border,#8a7aa833)}.pv-head b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
.pv-body{overflow:auto;padding:4px 4px 8px;overscroll-behavior:contain}.pv-body .strip-options{display:block!important;padding:8px!important;max-width:none!important;animation:none!important}
.pv-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--ts-border,#8a7aa833)}
html body .pv-pop .pv-apply{flex:1;min-height:44px;border-radius:999px!important;background:#ff3ea5!important;border-color:#ff3ea5!important;color:#fff!important;font-weight:800;font-size:15px}
html body .pv-pop .pv-x{width:34px;height:34px;padding:0!important;border-radius:50%!important}
@keyframes pvIn{from{opacity:0;transform:translate(-50%,14px)}}@media(prefers-reduced-motion:reduce){.pv-pop{animation:none}}`;document.head.appendChild(st)}
const rowOf=f=>document.querySelector(`${f.kind==='main'?'#clips':f.kind==='extra'?'#extraTracks':'#graphicTracks'} .strip-row[data-trackid="${f.id}"]`);
function fillPop(){if(!pop||!popFor)return;const row=rowOf(popFor),opts=row?.querySelector(':scope > .strip-options');const body=pop.querySelector('.pv-body');
  if(!opts){if(!body.querySelector('.strip-options'))closePop();return}
  const old=body.querySelector('.strip-options');if(old!==opts){old?.remove();body.appendChild(opts)}}
function nameOf(f){if(f.kind==='main'){const c=clips.find(x=>x.id===f.id);return (asset(c||{})?.name||'Video clip')}const t=(f.kind==='extra'?extraTracks:graphicTracks).find(x=>x.id===f.id);return t?.name||'Edit'}
function openPop(f){closePop(true);popFor=f;pause();try{pickedStrip={kind:f.kind,id:f.id};expandedStrip=null}catch{}
  pop=document.createElement('div');pop.className='pv-pop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Edit '+nameOf(f));
  const isVideo=f.kind==='main'||(f.kind==='extra'&&extraTracks.find(x=>x.id===f.id)?.type==='video');
  pop.innerHTML=`<div class="pv-head"><b>✏️ ${String(nameOf(f)).replace(/[<>&]/g,'')}</b>${isVideo?'<button type="button" class="pv-reset" style="background:none">↺ Normal size</button>':''}<button type="button" class="pv-x" aria-label="Close" style="background:none">✕</button></div><div class="pv-body"></div><div class="pv-foot"><button type="button" class="pv-apply">✓ Apply</button></div>`;
  document.body.appendChild(pop);pop.querySelector('.pv-x').onclick=()=>closePop();pop.querySelector('.pv-apply').onclick=()=>{closePop();toast('Applied.')};
  pop.querySelector('.pv-reset')?.addEventListener('click',()=>veResetVideoFrame({kind:f.kind==='main'?'clip':'layer',id:f.id}));
  if(f.kind==='main')render();else if(f.kind==='extra')renderTracks();else renderGraphicTracks();fillPop()}
function closePop(quiet){if(!pop)return;const f=popFor;pop.remove();pop=null;popFor=null;if(quiet)return;
  // Put the options back where they belong by drawing the timeline again.
  render();renderTracks();renderGraphicTracks();draw()}
window.veOpenPreviewEditor=openPop;
// Keep the pop-up showing the strip's freshly drawn options after any timeline re-render.
{const base=decorateStrips;decorateStrips=function(){base();if(pop)queueMicrotask(fillPop)}}
// Double-tap on the preview: whatever the first tap picked (text/sticker, else a video).
canvas.addEventListener('pointerdown',e=>{if(exporting||e.button!==0)return;
  if(typeof shapeDraw!=='undefined'&&shapeDraw||typeof textDraw!=='undefined'&&textDraw||typeof shapeEdit!=='undefined'&&shapeEdit||typeof textEdit!=='undefined'&&textEdit)return;
  const p=canvasPoint(e),now=performance.now(),near=Math.hypot(p.x-canvasTap.x,p.y-canvasTap.y)<handleRadius()*4,dbl=now-canvasTap.t<380&&near;canvasTap={t:dbl?0:now,x:p.x,y:p.y};if(!dbl)return;
  let f=null;if(selectedTextId&&graphicTracks.some(t=>t.id===selectedTextId))f={kind:'graphic',id:selectedTextId};else{const pv=vePickedVideo();if(pv)f={kind:pv.kind==='layer'?'extra':'main',id:pv.id}}
  if(f){window.veEndVideoGesture?.();setTimeout(()=>openPop(f),0)}});
// A tap anywhere else closes it (the toast and the colour picker don't count).
document.addEventListener('pointerdown',e=>{if(!pop||pop.contains(e.target)||e.target.closest('.toast,[class*="cpk"],[id^="cpk"],dialog[open]'))return;closePop()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pop)closePop()});
