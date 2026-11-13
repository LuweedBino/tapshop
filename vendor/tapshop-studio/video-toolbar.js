// Timeline toolbar: one scrollable row of buttons in labelled sections (Add, Create, Edit, View),
// and the "Timeline" title moved into the empty corner to the left of the ruler. Runs after every
// other script has put its buttons in the bar; buttons added later are sorted in the same way.
(()=>{
const bar=document.querySelector('.timebar');if(!bar)return;
const label=b=>(b.textContent||'').trim(),act=b=>b.getAttribute('onclick')||'';
const st=document.createElement('style');st.textContent=`
.timebar{flex-wrap:nowrap!important;overflow-x:auto;overflow-y:hidden;gap:0!important;padding:6px 12px 8px!important;align-items:stretch!important;scrollbar-width:thin;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.tb-sec{display:flex;flex-direction:column;gap:3px;flex:none;padding:0 12px;border-left:1px solid var(--ts-border,#8a7aa855)}
.tb-sec:first-child{border-left:0;padding-left:4px}.tb-sec:last-child{padding-right:0}
.tb-lab{font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;opacity:.55;line-height:1.2}
.tb-btns{display:flex;gap:6px;align-items:center;flex:1}.tb-btns button{white-space:nowrap;flex:none}
.tb-btns .status{white-space:nowrap;font-size:11px;opacity:.7}.tb-btns .timeline-zoom{width:110px;flex:none;margin:0}.tb-zoomlab{font-size:11px;white-space:nowrap;opacity:.8}
.tracks{position:relative}.tl-title{position:absolute;left:4px;display:flex;align-items:center;font-weight:800;font-size:12px;letter-spacing:.02em;pointer-events:none;z-index:2;overflow:hidden;white-space:nowrap}
@media (pointer:coarse){.timebar{scroll-snap-type:x proximity}.tb-sec{scroll-snap-align:start}}`;document.head.appendChild(st);

const SECTIONS=[
 ['add','Add',b=>/^(📹|🎵|🔤|🔶|🌈)/.test(label(b))||/openVideoDialog|addTrack\(|addGraphicTrack\(/.test(act(b))],
 ['create','Create',b=>/Graphics|Reviews|Captions|Brand|Smart tools/.test(label(b))],
 ['edit','Edit',b=>/Undo|Redo|Split|Duplicate|Delete/.test(label(b))||/moveClip|undo\(|redo\(|splitClip|duplicateClip|removeClip/.test(act(b))],
];
const secs={};
for(const [k,n] of [...SECTIONS,['view','View']]){let s=document.createElement('div');s.className='tb-sec';s.dataset.sec=k;s.setAttribute('role','group');s.setAttribute('aria-label',n);s.innerHTML=`<span class="tb-lab">${n}</span><div class="tb-btns"></div>`;secs[k]=s.lastElementChild}
function sort(){
  for(const el of [...bar.children]){if(el.classList.contains('tb-sec'))continue;
    if(el.tagName==='B'||el.classList.contains('spacer')){el.remove();continue}
    if(el.classList.contains('strip-help')){secs.view.parentElement.title=el.textContent;el.hidden=true;secs.view.appendChild(el);continue}
    if(el.id==='clipCount'||el.classList.contains('timeline-zoom')){secs.view.appendChild(el);continue}
    if(el.tagName!=='BUTTON'){secs.view.appendChild(el);continue}
    let s=SECTIONS.find(([,,test])=>test(el));secs[s?s[0]:'create'].appendChild(el)}
  for(const k of ['add','create','edit','view'])if(secs[k].parentElement.parentElement!==bar)bar.appendChild(secs[k].parentElement);
  let z=secs.view.querySelector('.timeline-zoom');if(z&&!z.previousElementSibling?.classList.contains('tb-zoomlab')){let l=document.createElement('span');l.className='tb-zoomlab';l.textContent='🔍 Zoom';l.setAttribute('aria-hidden','true');z.before(l);z.setAttribute('aria-label','Zoom the timeline')}
}
sort();new MutationObserver(()=>{if([...bar.children].some(c=>!c.classList.contains('tb-sec')))sort()}).observe(bar,{childList:true});

// "Timeline" sits in the corner left of the ruler (above the track names).
const tracks=document.querySelector('.tracks'),ruler=document.getElementById('ruler');
if(tracks&&ruler){let t=document.createElement('div');t.className='tl-title';t.textContent='Timeline';tracks.appendChild(t);
  const place=()=>{let w=ruler.offsetLeft-4;t.style.top=ruler.offsetTop+'px';t.style.height=ruler.offsetHeight+'px';t.style.width=Math.max(0,w)+'px';t.hidden=w<50};
  place();if(window.ResizeObserver)new ResizeObserver(place).observe(tracks);addEventListener('resize',place);setTimeout(place,300)}

})();
