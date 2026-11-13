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
.tb-btns{display:flex;gap:4px;align-items:flex-start;flex:1}
html .timebar .tb-btns button.tb-btn{display:flex;flex-direction:column;align-items:center;gap:5px;width:62px;flex:none;padding:2px 0 0!important;margin:0;border:0!important;background:none!important;box-shadow:none!important;border-radius:0!important;color:inherit;min-height:0;cursor:pointer}
.tb-ic{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;font-size:20px;line-height:1;background:var(--ts-hover,#3a3a44);border:1px solid var(--ts-border,#8a7aa855);transition:background .15s,transform .1s}
html .timebar button.tb-btn:hover:not(:disabled) .tb-ic{background:var(--ts-border-strong,#55505f)}html .timebar button.tb-btn:active:not(:disabled) .tb-ic{transform:scale(.92)}
html .timebar button.tb-btn:disabled{opacity:.4;cursor:default}html .timebar button.tb-btn:focus-visible{outline:none}html .timebar button.tb-btn:focus-visible .tb-ic{outline:2px solid #ff3ea5;outline-offset:2px}
.tb-tx{display:block;width:100%;overflow:hidden;white-space:nowrap;font-size:11px;font-weight:600;line-height:1.25;text-align:center}.tb-tx>span{display:inline-block}
.tb-tx.run{text-align:left;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.tb-tx.run>span{padding:0 3px;animation:tb-tick var(--dur,5s) ease-in-out infinite alternate}
@keyframes tb-tick{0%,15%{transform:translateX(0)}85%,100%{transform:translateX(var(--over,0px))}}
@media (prefers-reduced-motion:reduce){.tb-tx.run>span,.strip-name.run>span{animation:none}.tb-tx.run{text-overflow:ellipsis}}
.strip-name>span{display:inline-block}.strip-name.run{text-overflow:clip;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 88%,transparent)}
.strip-name.run>span{padding:0 2px;animation:tb-tick var(--dur,5s) ease-in-out infinite alternate}
.tb-sec[data-sec=view] .tb-btns{align-self:center;padding-top:8px}
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
// Quick-settings look: a round icon with the name under it. Names too long for the space scroll
// sideways like a ticker. Buttons whose text is replaced later are rebuilt by the observer.
const ICONS={Delete:'🗑',Duplicate:'⧉'},MOVE={'moveClip(-1)':['◀','Move left'],'moveClip(1)':['▶','Move right']};
function circle(b){if(b.querySelector(':scope>.tb-ic'))return;let raw=label(b),ic='',tx=raw,mv=MOVE[act(b)];
  if(mv)[ic,tx]=mv;else{let m=raw.match(/^(\p{Extended_Pictographic}️?|[^\p{L}\p{N}\s]+)\s*(.*)$/u);if(m&&m[2]){ic=m[1];tx=m[2]}else ic=ICONS[raw]||raw.slice(0,1)}
  if(!b.title)b.title=tx;if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',tx);b.classList.add('tb-btn');
  b.innerHTML=`<span class="tb-ic" aria-hidden="true">${ic}</span><span class="tb-tx" aria-hidden="true"><span>${tx.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span></span>`;ticker(b)}
function ticker(b){let box=b.querySelector('.tb-tx'),t=box?.firstElementChild;if(!t)return;requestAnimationFrame(()=>{let over=t.scrollWidth-box.clientWidth;box.classList.toggle('run',over>1);if(over>1){box.style.setProperty('--over',(-over-6)+'px');box.style.setProperty('--dur',Math.max(3,over/12+2.5)+'s')}})}
function circles(){bar.querySelectorAll('.tb-btns button').forEach(circle)}
new MutationObserver(ms=>{for(const m of ms){let b=m.target.closest?.('button')||m.target.parentElement?.closest?.('button');if(b&&bar.contains(b)&&!b.querySelector(':scope>.tb-ic'))circle(b)}}).observe(bar,{subtree:true,childList:true,characterData:true});
sort();circles();addEventListener('resize',()=>bar.querySelectorAll('.tb-btn').forEach(ticker));if(document.fonts)document.fonts.ready.then(()=>bar.querySelectorAll('.tb-btn').forEach(ticker));
new MutationObserver(()=>{if([...bar.children].some(c=>!c.classList.contains('tb-sec'))){sort();circles()}}).observe(bar,{childList:true});

// "Timeline" sits in the corner left of the ruler (above the track names).
const tracks=document.querySelector('.tracks'),ruler=document.getElementById('ruler');
if(tracks&&ruler){let t=document.createElement('div');t.className='tl-title';t.textContent='Timeline';tracks.appendChild(t);
  const place=()=>{let w=ruler.offsetLeft-4;t.style.top=ruler.offsetTop+'px';t.style.height=ruler.offsetHeight+'px';t.style.width=Math.max(0,w)+'px';t.hidden=w<50};
  place();if(window.ResizeObserver)new ResizeObserver(place).observe(tracks);addEventListener('resize',place);setTimeout(place,300)}

// Track names left of the lanes: names too long for the column slide back and forth like the buttons.
function nameTicker(n){let t=n.firstElementChild;if(!t){t=document.createElement('span');t.textContent=n.textContent;n.textContent='';n.appendChild(t);n.title=t.textContent}
  let over=t.scrollWidth-(n.clientWidth-6);n.classList.toggle('run',over>1);if(over>1){n.style.setProperty('--over',(-over-4)+'px');n.style.setProperty('--dur',Math.max(3,over/12+2.5)+'s')}}
const tl=document.querySelector('.timeline');let nameQ=0;
const names=()=>{nameQ=0;tl.querySelectorAll('.strip-name').forEach(nameTicker)};
const queueNames=()=>{if(!nameQ)nameQ=requestAnimationFrame(names)};
if(tl){new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(x=>x.nodeType===1&&!x.matches('.strip-name>span'))))queueNames()}).observe(tl,{childList:true,subtree:true});
  queueNames();addEventListener('resize',queueNames);if(document.fonts)document.fonts.ready.then(queueNames)}

})();
