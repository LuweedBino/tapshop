// A shared pixel-per-second scale keeps video, audio, text, and effects aligned.
let timelineScale=55,expandedStrip=null,stripDrag=null,decoratingStrips=false;
try{let stored=Number(localStorage.getItem('tapshop-timeline-zoom'));if(stored>=15&&stored<=150)timelineScale=stored}catch{}
function baseStarts(){let cursor=0;return clips.map(c=>{let start=Number.isFinite(c.offset)?c.offset:cursor;cursor=start+duration(c);return start})}
startOf=function(i){return baseStarts()[i]||0};
primaryDuration=()=>{let starts=baseStarts();return Math.max(0,...clips.map((c,i)=>starts[i]+duration(c)))};
at=function(t){let starts=baseStarts();for(let i=clips.length-1;i>=0;i--){let c=clips[i],start=starts[i],end=start+duration(c);if(t>=start&&t<end)return {c,i,start,source:Math.min(c.out,c.in+(t-start)*c.speed)}}return null};
total=()=>Math.max(primaryDuration(),...extraTracks.map(t=>t.offset+(t.end-t.start)/t.speed),...graphicTracks.map(t=>t.offset+t.length),0);
function timelineWidth(){return Math.max(800,(total()+8)*timelineScale)}
function stripModel(kind,id){if(kind==='main'){let i=clips.findIndex(c=>c.id===id);return i<0?null:{item:clips[i],offset:startOf(i),length:duration(clips[i]),name:asset(clips[i])?.name||'Video',i}}if(kind==='extra'){let t=extraTracks.find(t=>t.id===id);return t?{item:t,offset:t.offset,length:(t.end-t.start)/t.speed,name:t.name}:null}let t=graphicTracks.find(t=>t.id===id);return t?{item:t,offset:t.offset,length:t.length,name:t.name}:null}
function makeStripLine(kind,id,label,color){let model=stripModel(kind,id),line=document.createElement('div');line.className='strip-line';let name=document.createElement('span');name.className='strip-name';name.textContent=label;line.appendChild(name);let lane=document.createElement('div');lane.className='strip-lane';lane.style.width=timelineWidth()+'px';let strip=document.createElement('div');strip.className='duration-strip'+(expandedStrip===id?' active':'')+((()=>{try{return pickedStrip?.id===id}catch{return false}})()?' picked':'');strip.dataset.kind=color;strip.dataset.id=id;strip.dataset.model=kind;strip.tabIndex=0;strip.setAttribute('role','button');strip.setAttribute('aria-label',label+' · '+model.length.toFixed(1)+' seconds. Drag to move, up or down to change layer, double-tap for controls.');strip.setAttribute('aria-expanded',String(expandedStrip===id));strip.style.left=(model.offset*timelineScale)+'px';strip.style.width=Math.max(3,model.length*timelineScale)+'px';strip.textContent=model.length>0?label+' · '+model.length.toFixed(1)+'s':'＋ Add media';strip.title='Start '+model.offset.toFixed(1)+'s · Duration '+model.length.toFixed(1)+'s';if(model.length===0){strip.style.width='100px'}if(model.length>0)addResizeHandles(strip,label,model.length,kind);lane.appendChild(strip);line.appendChild(lane);return line}
const MIN_STRIP_LENGTH=.1,SNAP=.1;
// Edges of the other pieces on the same row: every main clip, or pieces split from the same layer/text/shape/effect.
function neighbourEdgesOnly(kind,id){let ids=kind==='main'?clips.map(c=>c.id):(kind==='extra'?extraTracks:graphicTracks).filter(t=>{let me=(kind==='extra'?extraTracks:graphicTracks).find(x=>x.id===id);return (t.lane||t.id)===(me?.lane||me?.id)}).map(t=>t.id);let edges=[];for(let other of ids){if(other===id)continue;let m=stripModel(kind,other);if(m&&m.length>0)edges.push(m.offset,m.offset+m.length)}return edges}
// Beat times of every music track that knows its tempo (t.bpm): its first beat is t.beatOffset seconds into the file (0 for
// generated music; found by video-bpm.js for uploads), so beat k lands at offset + (beatOffset + k·60/bpm − start)/speed. A track's own beats are left out while that track is being moved.
function beatTimes(skip){const out=[];for(const t of extraTracks){if(!t.bpm||!t.media||t.id===skip)continue;const b=60/t.bpm;
  const o=t.beatOffset||0;for(let k=Math.ceil((t.start-o)/b-1e-6);o+k*b<=t.end+1e-6&&out.length<4000;k++)out.push({T:t.offset+(o+k*b-t.start)/t.speed,bar:k%4===0})}return out}
// Strips snap to the edges of their neighbours and to the music's beats (hold Shift to move freely).
function neighbourEdges(kind,id){return [...neighbourEdgesOnly(kind,id),...beatTimes(kind==='extra'?id:null).map(b=>b.T)]}
function snapEdge(kind,id,t){let best=null,bd=SNAP+1e-6;for(let e of neighbourEdges(kind,id)){let dd=Math.abs(t-e);if(dd<=bd){bd=dd;best=e}}return best}
function snapMove(kind,id,offset,length){let best=null,bd=SNAP+1e-6;for(let e of neighbourEdges(kind,id)){for(let [mine,target] of [[offset,e],[offset+length,e-length]]){let dd=Math.abs(mine-e);if(dd<=bd&&target>=0){bd=dd;best=target}}}return best}
function addResizeHandles(strip,label,length,kind){let trims=kind!=='graphic';strip.textContent='';strip.classList.add('resizable');let text=document.createElement('span');text.className='strip-label';text.textContent=label+' · '+length.toFixed(1)+'s';strip.appendChild(text);for(let edge of ['start','end']){let h=document.createElement('span');h.className='strip-handle';h.dataset.edge=edge;h.title=trims?(edge==='start'?'Drag to trim the beginning':'Drag to trim the end'):(edge==='start'?'Drag to change the start (keeps the end)':'Drag to change the duration');strip.appendChild(h)}strip.setAttribute('aria-label',label+' · '+length.toFixed(1)+' seconds. Drag to move, drag an end to '+(trims?'trim':'resize')+', Alt+arrow keys to change the end, double-tap or Enter for controls.')}
// Video and audio strips trim their source: in/out (main clips) or start/end (layers).
function trimKeys(kind){return kind==='main'?['in','out']:kind==='extra'?['start','end']:null}
function sourceLimit(kind,item){return kind==='main'?asset(item)?.duration:item.media?.duration}
function beginResize(strip,model,edge){let kind=strip.dataset.model,keys=trimKeys(kind);return {element:strip,kind,id:strip.dataset.id,offset:model.offset,length:model.length,edge,srcIn:keys?model.item[keys[0]]:0,srcOut:keys?model.item[keys[1]]:0,speed:model.item.speed||1,max:keys?sourceLimit(kind,model.item):Infinity,moved:true}}
function resizeStrip(d,m,delta,free){let seconds=delta/timelineScale,end=d.offset+d.length,offset=d.offset,length=d.length,snapped=false;if(!free){let edge=d.edge==='end'?end+seconds:d.offset+seconds,hit=snapEdge(d.kind,d.id,edge);if(hit!==null){seconds=hit-(d.edge==='end'?end:d.offset);free=true;snapped=true}}d.element.classList.toggle('snapped',snapped);if(d.edge==='end'){length=d.length+seconds;if(!free)length=Math.round((offset+length)*10)/10-offset;length=Math.max(MIN_STRIP_LENGTH,length)}else{offset=Math.max(0,d.offset+seconds);if(!free)offset=Math.round(offset*10)/10;offset=Math.min(offset,end-MIN_STRIP_LENGTH);length=end-offset}let keys=trimKeys(d.kind);if(keys){let s=d.speed,min=Math.max(.1,MIN_STRIP_LENGTH*s);if(d.edge==='end'){let out=Math.min(d.max,Math.max(d.srcIn+min,d.srcIn+length*s));length=(out-d.srcIn)/s;m.item[keys[1]]=out}else{let inn=Math.max(0,Math.min(d.srcOut-min,d.srcOut-length*s));length=(d.srcOut-inn)/s;offset=end-length;m.item[keys[0]]=inn}m.item.offset=offset}else{if(!free){offset=Math.round(offset*1000)/1000;length=Math.round(length*1000)/1000}m.item.offset=offset;m.item.length=length}d.element.style.left=offset*timelineScale+'px';d.element.style.width=Math.max(3,length*timelineScale)+'px';d.element.classList.add('resizing');let text=d.element.querySelector('.strip-label');if(text)text.textContent=m.name+' · '+length.toFixed(1)+'s';d.element.title='Start '+offset.toFixed(1)+'s · Duration '+length.toFixed(1)+'s'}
function setRuler(){let r=$('ruler');r.innerHTML='';r.style.width=timelineWidth()+'px';let step=timelineScale<30?5:timelineScale<70?2:1;for(let t=0;t<=timelineWidth()/timelineScale;t+=step){let s=document.createElement('span');s.textContent=time(t);s.style.left=t*timelineScale+'px';r.appendChild(s)}document.querySelector('.tracks').style.setProperty('--second-width',timelineScale+'px');r.style.setProperty('--minor-width',timelineScale/(timelineScale>=100?10:timelineScale>=45?4:2)+'px');$('scrub').max=total()||1}
function selectStrip(kind,id){expandedStrip=expandedStrip===id?null:id;if(kind==='main'){let m=stripModel(kind,id);if(m){selected=m.i;inspector()}}decorateStrips();let model=stripModel(kind,id);if(model&&expandedStrip&&!(playhead>model.offset&&playhead<model.offset+model.length))seekTimeline(model.offset+Math.min(.5,model.length/2));}
function decorateStrips(){if(decoratingStrips)return;decoratingStrips=true;try{for(let [boxId,kind,list] of [['extraTracks','extra',extraTracks],['graphicTracks','graphic',graphicTracks]]){let box=$(boxId);if(!box)continue;[...box.children].forEach((row,i)=>{let t=list[i];if(!t)return;row.classList.add('strip-row');row.classList.toggle('expanded',expandedStrip===t.id);row.dataset.trackid=t.id;if(!row.querySelector('.strip-options')){let options=document.createElement('div');options.className='strip-options';[...row.children].forEach(child=>{if(child.classList.contains('layer-strip'))child.remove();else options.appendChild(child)});row.appendChild(options)}row.querySelector('.strip-line')?.remove();row.prepend(makeStripLine(kind,t.id,t.name,t.type));})}for(let row of document.querySelectorAll('#clips .strip-row')){let id=row.dataset.trackid;row.classList.toggle('expanded',expandedStrip===id);row.querySelector('.strip-line')?.remove();row.prepend(makeStripLine('main',id,stripModel('main',id)?.name||'Video','video'))}setRuler()}finally{decoratingStrips=false}}
renderTimeline=function(){let box=$('clips');box.innerHTML='';clips.forEach((c,i)=>{let row=document.createElement('div');row.className='strip-row'+(expandedStrip===c.id?' expanded':'');row.dataset.trackid=c.id;row.appendChild(makeStripLine('main',c.id,asset(c)?.name||'Video','video'));let options=document.createElement('div');options.className='strip-options';options.innerHTML=`<div class="main-strip-options"><label>Start (s)<input type="number" min="0" step=".1" value="${startOf(i).toFixed(2)}" onchange="editMainStrip('${c.id}','offset',+this.value)"></label><label>Trim in (s)<input type="number" min="0" step=".1" value="${c.in.toFixed(2)}" onchange="editMainStrip('${c.id}','in',+this.value)"></label><label>Trim out (s)<input type="number" min="0" step=".1" value="${c.out.toFixed(2)}" onchange="editMainStrip('${c.id}','out',+this.value)"></label><label>Speed<select onchange="editMainStrip('${c.id}','speed',+this.value)">${[.5,.75,1,1.5,2].map(v=>`<option ${c.speed===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Volume<input type="range" min="0" max="1" step=".05" value="${c.volume}" onchange="editMainStrip('${c.id}','volume',+this.value)"></label><button onclick="selected=${i};duplicateClip()">Duplicate</button><button onclick="selected=${i};removeClip()">Delete</button></div><p class="sub">Select this clip to use the full clip inspector.</p>`;row.appendChild(options);box.appendChild(row)});if(!clips.length)box.innerHTML='<p class="sub" style="padding-left:20px">Add media to start your timeline.</p>';setRuler()};
function editMainStrip(id,key,value){if(exporting||!Number.isFinite(value)||value<0)return;let m=stripModel('main',id);if(!m)return;let c=m.item,copy={...c,[key]:value};if(copy.out-copy.in<.1||copy.out>asset(c).duration+.01||copy.speed<=0){toast('Choose valid clip settings.');return}pause();snapshot();c[key]=value;render();seekTimeline(startOf(m.i))}
for(let name of ['renderTracks','renderGraphicTracks']){let old=name==='renderTracks'?renderTracks:renderGraphicTracks;let wrapped=function(){old();decorateStrips()};if(name==='renderTracks')renderTracks=wrapped;else renderGraphicTracks=wrapped}
const originalStripRender=render;render=function(){originalStripRender();decorateStrips()};
// Additional rows scroll together under one ruler.
let tracksHost=document.querySelector('.tracks');tracksHost.appendChild($('extraTracks'));tracksHost.appendChild($('graphicTracks'));
let toolbar=document.querySelector('.timebar'),help=document.createElement('span');help.className='strip-help';help.textContent='Tap a strip to pick it · drag to move (up or down to change layer) · drag ends to trim · double-tap to edit';toolbar.appendChild(help);let zoom=document.createElement('input');zoom.type='range';zoom.min=15;zoom.max=150;zoom.value=timelineScale;zoom.className='timeline-zoom';zoom.setAttribute('aria-label','Timeline zoom');zoom.title='Timeline zoom';zoom.oninput=()=>{timelineScale=+zoom.value;try{localStorage.setItem('tapshop-timeline-zoom',timelineScale)}catch{}decorateStrips()};toolbar.appendChild(zoom);
tracksHost.addEventListener('pointerdown',e=>{let strip=e.target.closest('.duration-strip');if(!strip||exporting)return;e.preventDefault();let model=stripModel(strip.dataset.model,strip.dataset.id);if(!model)return;pause();if(strip.dataset.model==='main'){let starts=baseStarts();clips.forEach((c,i)=>c.offset=starts[i]);snapshot()}let handle=e.target.closest('.strip-handle');stripDrag=handle?{...beginResize(strip,model,handle.dataset.edge),x:e.clientX,scroll:tracksHost.scrollLeft,moved:false}:{element:strip,kind:strip.dataset.model,id:strip.dataset.id,x:e.clientX,offset:model.offset,length:model.length,edge:null,scroll:tracksHost.scrollLeft,moved:false};strip.setPointerCapture(e.pointerId)});
tracksHost.addEventListener('pointermove',e=>{if(!stripDrag)return;let d=stripDrag,delta=e.clientX-d.x+tracksHost.scrollLeft-d.scroll;if(Math.abs(delta)>3)d.moved=true;if(!d.moved)return;let m=stripModel(d.kind,d.id);if(!m)return;if(d.edge){resizeStrip(d,m,delta,e.shiftKey)}else{let offset=Math.max(0,d.offset+delta/timelineScale),snap=e.shiftKey?null:snapMove(d.kind,d.id,offset,m.length);if(snap!==null)offset=snap;else if(!e.shiftKey)offset=Math.round(offset*10)/10;d.element.classList.toggle('snapped',snap!==null);m.item.offset=offset;d.element.style.left=offset*timelineScale+'px';d.element.classList.add('dragging');d.element.title='Start '+offset.toFixed(1)+'s'}let rect=tracksHost.getBoundingClientRect();if(e.clientX>rect.right-35)tracksHost.scrollLeft+=12;if(e.clientX<rect.left+120)tracksHost.scrollLeft-=12;d.element.parentElement.style.width=timelineWidth()+'px';});
function finishResize(d){pickedStrip={kind:d.kind,id:d.id};if(d.kind==='graphic')renderGraphicTracks();else{render();if(d.kind==='main'){let m=stripModel('main',d.id);if(m){selected=m.i;inspector()}}}let m=stripModel(d.kind,d.id);if(m){seekTimeline(d.edge==='end'?Math.max(m.offset,m.offset+m.length-.05):m.offset);toast((d.kind==='graphic'?'Duration ':'Trimmed to ')+m.length.toFixed(1)+' seconds')}document.querySelector(`.duration-strip[data-id="${d.id}"]`)?.focus({preventScroll:true})}
function finishStripDrag(){if(!stripDrag)return;let d=stripDrag;stripDrag=null;d.element.classList.remove('dragging','resizing','snapped');if(!d.moved){let m=stripModel(d.kind,d.id),under=m&&playhead>m.offset+.05&&playhead<m.offset+m.length-.05;tapStrip(d.kind,d.id);if(under)showSplit(d.kind,d.id);else hideSplit();return}if(d.edge){finishResize(d);return}pickedStrip={kind:d.kind,id:d.id};render();let m=stripModel(d.kind,d.id);if(m){seekTimeline(m.item.offset+Math.min(.5,m.length/2));toast('Moved to '+m.item.offset.toFixed(1)+' seconds')}}
tracksHost.addEventListener('pointerup',finishStripDrag);tracksHost.addEventListener('pointercancel',finishStripDrag);tracksHost.addEventListener('lostpointercapture',()=>{if(stripDrag)finishStripDrag()});tracksHost.addEventListener('keydown',e=>{let strip=e.target.closest('.duration-strip');if(!strip||exporting)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();selectStrip(strip.dataset.model,strip.dataset.id)}if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();let m=stripModel(strip.dataset.model,strip.dataset.id);if(!m||m.length<=0)return;pause();if(strip.dataset.model==='main'){let starts=baseStarts();clips.forEach((c,i)=>c.offset=starts[i]);snapshot()}let d=beginResize(strip,m,'end'),step=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1);resizeStrip(d,m,step*timelineScale,false);finishResize(d);return}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();let m=stripModel(strip.dataset.model,strip.dataset.id);if(!m)return;if(strip.dataset.model==='main'){let starts=baseStarts();clips.forEach((c,i)=>c.offset=starts[i])}m.item.offset=Math.max(0,m.offset+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1));render();seekTimeline(m.item.offset+Math.min(.5,m.length/2))}});
// A split preserves the clip's placement rather than stacking both halves.
const stripSplit=splitClip;splitClip=function(){let p=at(playhead);if(!p)return stripSplit();let splitTime=playhead,count=clips.length;stripSplit();if(clips.length>count){clips[p.i].offset=p.start;clips[p.i+1].offset=splitTime;renderTimeline();decorateStrips()}};
const stripDuplicate=duplicateClip;duplicateClip=function(){let c=clips[selected];if(!c)return;let end=startOf(selected)+duration(c),count=clips.length;stripDuplicate();if(clips.length>count){clips[selected].offset=end;renderTimeline();decorateStrips()}};
render();
// New soundtracks use the same movable audio lanes as other imported audio.
const legacyMusicRow=$('musicStrip')?.closest('.trackrow');if(legacyMusicRow)legacyMusicRow.style.display='none';
importMusic=async function(file){if(!file||exporting)return;addTrack('audio');let t=extraTracks.at(-1);targetTrack=t.id;expandedStrip=t.id;await loadTrackMedia(file);$('musicName').textContent='Added as '+t.name+' on the timeline';decorateStrips()};

// Playhead: a vertical line through every track with a small downward triangle on top.
// It follows playback and seeking; drag the triangle (or tap the ruler) to move it.
const LANE_START=76; // ruler margin = row padding (8px) + track name column (68px)
let splitButton=document.createElement('button');splitButton.type='button';splitButton.className='strip-split';splitButton.textContent='✂ Split';splitButton.hidden=true;
let playheadLine=document.createElement('div');playheadLine.className='timeline-playhead';playheadLine.setAttribute('aria-hidden','true');playheadLine.title='Drag to move the playhead';
let playheadHead=document.createElement('div');playheadHead.className='timeline-playhead-head';playheadHead.title='Drag to move the playhead';playheadLine.appendChild(playheadHead);tracksHost.appendChild(playheadLine);
function placePlayhead(){if(splitButton.dataset.at&&Math.abs(+splitButton.dataset.at-playhead)>1e-6)hideSplit();let x=LANE_START+playhead*timelineScale,top=$('ruler').offsetTop;playheadLine.style.left=x+'px';playheadLine.style.top=top+'px';let bottom=Math.max(tracksHost.clientHeight,...[...tracksHost.children].filter(el=>el!==playheadLine).map(el=>el.offsetTop+el.offsetHeight));playheadLine.style.height=Math.max(0,bottom-top)+'px';
 if(playing){let left=tracksHost.scrollLeft,view=tracksHost.clientWidth;if(x>left+view-40||x<left+LANE_START)tracksHost.scrollLeft=Math.max(0,x-LANE_START-40)}}
const drawWithPlayhead=draw;draw=function(){drawWithPlayhead();placePlayhead()};
const decorateWithPlayhead=decorateStrips;decorateStrips=function(){decorateWithPlayhead();placePlayhead()};
function playheadTime(e){let r=tracksHost.getBoundingClientRect(),x=e.clientX-r.left+tracksHost.scrollLeft-LANE_START;return Math.max(0,Math.min(total(),x/timelineScale))}
let playheadDrag=false;
playheadLine.addEventListener('pointerdown',e=>{if(exporting)return;e.preventDefault();e.stopPropagation();playheadDrag=true;playheadLine.dataset.wasPlaying=playing?'1':'';playheadLine.setPointerCapture(e.pointerId);pause();hideSplit()});
playheadLine.addEventListener('pointermove',e=>{if(!playheadDrag)return;playhead=playheadTime(e);placePlayhead()});
const endPlayheadDrag=async e=>{if(!playheadDrag)return;playheadDrag=false;let resume=playheadLine.dataset.wasPlaying;await seekTimeline(playheadTime(e));if(resume&&!playing&&!exporting&&playhead<total()-.1)togglePlay()};
playheadLine.addEventListener('pointerup',endPlayheadDrag);playheadLine.addEventListener('pointercancel',endPlayheadDrag);
$('ruler').addEventListener('pointerdown',e=>{if(exporting)return;seekTimeline(playheadTime(e))});
window.addEventListener('resize',placePlayhead);placePlayhead();

tracksHost.appendChild(splitButton);
function hideSplit(){splitButton.hidden=true;delete splitButton.dataset.at;delete splitButton.dataset.armed}
function showSplit(kind,id){let m=stripModel(kind,id);if(!m||m.length<=0||exporting||!(playhead>m.offset+.05&&playhead<m.offset+m.length-.05)){hideSplit();return}{let strip=tracksHost.querySelector(`.duration-strip[data-id="${id}"]`);if(!strip){hideSplit();return}let host=tracksHost.getBoundingClientRect(),r=strip.getBoundingClientRect();splitButton.style.left=(LANE_START+playhead*timelineScale)+'px';splitButton.style.top=(r.top-host.top+tracksHost.scrollTop+r.height/2)+'px';splitButton.dataset.kind=kind;splitButton.dataset.id=id;splitButton.dataset.at=String(playhead);delete splitButton.dataset.armed;splitButton.hidden=false;splitButton.setAttribute('aria-label','Split '+m.name+' at '+time(playhead))}}
splitButton.addEventListener('pointerdown',e=>{e.stopPropagation();splitButton.dataset.armed='1'});
splitButton.addEventListener('click',e=>{e.stopPropagation();if(!splitButton.dataset.armed)return;delete splitButton.dataset.armed;let {kind,id}=splitButton.dataset;hideSplit();splitStripAt(kind,id,playhead)});
document.addEventListener('pointerdown',e=>{if(!splitButton.hidden&&!e.target.closest('.strip-split,.duration-strip'))hideSplit()});
// Splits one strip in two at time t: the first part ends at t, the second starts there.
async function splitStripAt(kind,id,t){if(exporting)return;pause();let m=stripModel(kind,id);if(!m)return;let end=m.offset+m.length;if(t-m.offset<.1||end-t<.1){toast('Move the playhead a little further from the edge to split.');return}
if(kind==='main'){let starts=baseStarts();clips.forEach((c,i)=>c.offset=starts[i]);snapshot();let i=clips.findIndex(c=>c.id===id),c=clips[i],at=c.in+(t-starts[i])*c.speed;clips.splice(i+1,0,{...c,id:uid(),in:at,offset:t});c.out=at;selected=i+1;expandedStrip=null;render()}
else if(kind==='graphic'){let i=graphicTracks.findIndex(g=>g.id===id),g=graphicTracks[i],copy=structuredClone(g);Object.assign(copy,{id:uid(),offset:t,length:end-t,lane:g.lane||g.id});g.length=t-g.offset;graphicTracks.splice(i+1,0,copy);expandedStrip=null;renderGraphicTracks()}
else{let i=extraTracks.findIndex(x=>x.id===id),tr=extraTracks[i];if(!tr?.file){toast('This track has no media to split.');return}let at=tr.start+(t-tr.offset)*tr.speed,keep={...tr};addTrack(tr.type);let nt=extraTracks.at(-1);targetTrack=nt.id;await loadTrackMedia(tr.file);if(!nt.media){toast('Could not split this track.');return}Object.assign(nt,{lane:keep.lane||keep.id,name:keep.name+' (2)',offset:t,start:at,end:keep.end,speed:keep.speed,volume:keep.volume,muted:keep.muted,hidden:keep.hidden,x:keep.x,y:keep.y,scale:keep.scale,opacity:keep.opacity});tr.end=at;extraTracks.splice(extraTracks.indexOf(nt),1);extraTracks.splice(i+1,0,nt);expandedStrip=null;renderTracks()}
await seekTimeline(t);toast('Split at '+time(t))}

// Rows: pieces that don't overlap share one row. All main clips form one group; a split
// layer, text, shape or effect stays in its original row (same `lane`). Each piece keeps its
// own controls row, which only shows while that piece is open.
function packRows(box,groupOf,modelOf){if(!box)return;let rows=[...box.querySelectorAll(':scope > .strip-row')],placed=[];for(let row of rows){row.classList.remove('merged');let id=row.dataset.trackid,m=modelOf(id),strip=row.querySelector('.duration-strip');if(!m||!strip||m.length<=0){placed.push({group:null,host:row,spans:[]});continue}let g=groupOf(id),host=placed.find(r=>r.group===g&&r.spans.every(([a,b])=>m.offset>=b-1e-3||m.offset+m.length<=a+1e-3));if(host&&host.host!==row){host.host.querySelector('.strip-lane').appendChild(strip);host.spans.push([m.offset,m.offset+m.length]);row.classList.add('merged');row.querySelector('.strip-line')?.remove()}else placed.push({group:g,host:row,spans:[[m.offset,m.offset+m.length]]})}}
function packLanes(){packRows($('clips'),()=> 'main',id=>stripModel('main',id));packRows($('extraTracks'),id=>{let t=extraTracks.find(t=>t.id===id);return t?.lane||id},id=>stripModel('extra',id));packRows($('graphicTracks'),id=>{let t=graphicTracks.find(t=>t.id===id);return t?.lane||id},id=>stripModel('graphic',id))}
const decorateWithLanes=decorateStrips;decorateStrips=function(){decorateWithLanes();packLanes();placePlayhead()};
render();

// Jumping to a new time (ruler tap, preview slider) while the video plays keeps it playing
// from there, once the jumps settle. Editing a strip, splitting and the Pause button still stop it.
let resumeTimer=null,resumeWanted=false,inSeek=0;
const seekKeepPlaying=seekTimeline;seekTimeline=async function(t){if(playing&&!exporting)resumeWanted=true;inSeek++;try{await seekKeepPlaying(t)}finally{inSeek--}if(resumeWanted&&!exporting){clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{resumeWanted=false;if(!playing&&!exporting&&playhead<total()-.1)togglePlay()},250)}};
// Any other pause (Pause button, tapping a strip to edit, splitting) cancels the resume.
const pauseCancelsResume=pause;pause=function(){if(!inSeek){resumeWanted=false;clearTimeout(resumeTimer)}pauseCancelsResume()};
// Delete removes whichever strip was tapped last (text, shape, effect, audio or video), not only main clips.
let pickedStrip=null;const pickStripBase=selectStrip;selectStrip=function(kind,id){pickedStrip={kind,id};pickStripBase(kind,id)};
const removeMainClip=removeClip;removeClip=function(){let p=pickedStrip,m=p&&stripModel(p.kind,p.id);if(!m||p.kind==='main'){pickedStrip=null;removeMainClip();return}if(exporting)return;pickedStrip=null;expandedStrip=null;hideSplit();if(p.kind==='extra')deleteTrack(p.id);else removeGraphic(p.id);toast('Deleted '+(m.name||'strip'))};
// Duplicate copies whichever strip was tapped last and puts the copy right after it.
const duplicateMainClip=duplicateClip;duplicateClip=async function(){let p=pickedStrip,m=p&&stripModel(p.kind,p.id);if(!m||p.kind==='main'){duplicateMainClip();return}if(exporting)return;pause();let end=m.offset+m.length,id;if(p.kind==='graphic'){snapshot();let i=graphicTracks.findIndex(g=>g.id===p.id),g=graphicTracks[i],copy=structuredClone(g);id=uid();Object.assign(copy,{id,offset:end,lane:g.lane||g.id});graphicTracks.splice(i+1,0,copy);renderGraphicTracks()}else{let i=extraTracks.findIndex(x=>x.id===p.id),tr=extraTracks[i];if(!tr?.file){toast('This track has no media to copy.');return}snapshot();let keep={...tr};addTrack(tr.type);let nt=extraTracks.at(-1);targetTrack=nt.id;await loadTrackMedia(tr.file);if(!nt.media){toast('Could not copy this track.');return}Object.assign(nt,{lane:keep.lane||keep.id,name:keep.name+' (copy)',offset:end,start:keep.start,end:keep.end,speed:keep.speed,volume:keep.volume,muted:keep.muted,hidden:keep.hidden,x:keep.x,y:keep.y,scale:keep.scale,opacity:keep.opacity});extraTracks.splice(extraTracks.indexOf(nt),1);extraTracks.splice(i+1,0,nt);id=nt.id;renderTracks()}pickedStrip={kind:p.kind,id};decorateStrips();await seekTimeline(end+Math.min(.5,m.length/2));toast('Duplicated '+(m.name||'strip'))};
// Undo/Redo also remember text, shape and effect strips, not only main clips.
let redoStack=[];// Music/video layers hold live media, so undo keeps the same track objects and restores their settings.
const editState=()=>({s:JSON.stringify({clips,selected,graphic:graphicTracks}),extra:extraTracks.map(t=>[t,{...t}])});
snapshot=function(){history.push(editState());if(history.length>35)history.shift();redoStack=[];syncUndoButtons()};
function restoreEdit(st){let h=JSON.parse(st.s);if(st.extra){extraTracks.forEach(t=>t.media?.pause());extraTracks=st.extra.map(([t,p])=>Object.assign(t,p))}clips=h.clips;selected=h.selected;if(h.graphic)graphicTracks=h.graphic;activeId=null;if(pickedStrip&&!stripModel(pickedStrip.kind,pickedStrip.id))pickedStrip=null;expandedStrip=expandedStrip&&[...clips,...extraTracks,...graphicTracks].some(x=>x.id===expandedStrip)?expandedStrip:null;hideSplit();playhead=Math.min(playhead,total());render();renderGraphicTracks();renderTracks();draw();seekTimeline(playhead);syncUndoButtons()}
undo=function(){if(exporting||!history.length)return;pause();redoStack.push(editState());restoreEdit(history.pop())};
function redo(){if(exporting||!redoStack.length)return;pause();history.push(editState());restoreEdit(redoStack.pop())}
let redoBtn=document.createElement('button');redoBtn.id='redoBtn';redoBtn.textContent='↷ Redo';redoBtn.title='Redo (Ctrl+Shift+Z)';redoBtn.onclick=redo;$('undoBtn')?.after(redoBtn);
function syncUndoButtons(){$('undoBtn').disabled=!history.length;redoBtn.disabled=!redoStack.length}syncUndoButtons();
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||exporting)return;let k=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&((k==='z'&&e.shiftKey)||k==='y')){e.preventDefault();redo()}});
// Deleting or splitting a text/shape/effect strip can now be undone.
const removeGraphicBase=removeGraphic;removeGraphic=function(id){if(!exporting)snapshot();removeGraphicBase(id)};
const splitStripBase=splitStripAt;splitStripAt=function(kind,id,t){if(kind!=='main'&&!exporting){let m=stripModel(kind,id);if(m&&t-m.offset>=.1&&m.offset+m.length-t>=.1)snapshot()}return splitStripBase(kind,id,t)};
// Deleting a music or video layer keeps its media alive so Undo can bring it back.
deleteTrack=function(id){if(exporting)return;let t=extraTracks.find(t=>t.id===id);if(!t)return;pause();snapshot();t.media?.pause();extraTracks=extraTracks.filter(x=>x!==t);playhead=Math.min(playhead,total());renderTracks();draw()};
// ← → nudge the tapped text, shape, effect, music or video-layer strip by a tenth of a second; main clips still swap places.
const moveMainClip=moveClip;moveClip=function(dir,step=.1){let p=pickedStrip;if(!p&&clips[selected])p={kind:'main',id:clips[selected].id};let m=p&&stripModel(p.kind,p.id);if(!m){moveMainClip(dir);return}if(exporting)return;
  // A video clip slides between the clip before it and (if that one is pinned to a time) the one after it.
  let lo=0,hi=Infinity;if(p.kind==='main'){let st=baseStarts();if(m.i>0)lo=st[m.i-1]+duration(clips[m.i-1]);let nx=clips[m.i+1];if(nx&&Number.isFinite(nx.offset))hi=st[m.i+1]-m.length}
  let from=p.kind==='main'?startOf(m.i):m.item.offset,to=Math.min(hi,Math.max(lo,Math.round((from+dir*step)*10)/10));if(to===from){toast(dir<0?'Can’t move further left':'Can’t move further right');return}pause();if(!nudgeHold?.snapped)snapshot();if(nudgeHold)nudgeHold.snapped=true;m.item.offset=to;if(p.kind==='extra')renderTracks();else if(p.kind==='main')render();else renderGraphicTracks();decorateStrips();draw();toast('Moved to '+to.toFixed(1)+' seconds')};
document.querySelectorAll('.timebar button').forEach(b=>{let d=b.getAttribute('onclick');if(d==='moveClip(-1)'){b.setAttribute('aria-label','Move left');b.title='Move the tapped strip left'}if(d==='moveClip(1)'){b.setAttribute('aria-label','Move right');b.title='Move the tapped strip right'}});
// Holding ← or → keeps the tapped strip moving, faster after a moment; one hold is one Undo step.
let nudgeHold=null;
function stopNudgeHold(){if(!nudgeHold)return;clearTimeout(nudgeHold.timer);let h=nudgeHold;nudgeHold=null;if(h.repeated)setTimeout(()=>h.btn.dataset.skipClick='',350)}
document.querySelectorAll('.timebar button').forEach(b=>{let dir=b.getAttribute('onclick')==='moveClip(-1)'?-1:b.getAttribute('onclick')==='moveClip(1)'?1:0;if(!dir)return;b.style.userSelect='none';b.style.webkitUserSelect='none';b.style.webkitTouchCallout='none';b.style.touchAction='manipulation';
b.addEventListener('contextmenu',e=>e.preventDefault());
b.addEventListener('pointerdown',e=>{if(e.button>0||exporting)return;let p=pickedStrip||(clips[selected]&&{kind:'main',id:clips[selected].id});if(!p||!stripModel(p.kind,p.id))return;stopNudgeHold();let n=0,h=nudgeHold={btn:b,repeated:false,snapped:false};const tick=()=>{if(nudgeHold!==h)return;h.repeated=true;b.dataset.skipClick='1';moveClip(dir,++n>12?.5:.1);h.timer=setTimeout(tick,n>12?120:90)};h.timer=setTimeout(tick,400)});
['pointerup','pointercancel','pointerleave','blur'].forEach(ev=>b.addEventListener(ev,stopNudgeHold));
b.addEventListener('click',e=>{if(b.dataset.skipClick){b.dataset.skipClick='';e.stopImmediatePropagation();e.preventDefault()}},true)});
// The right-hand Clip inspector is gone; its Framing, Color look and caption settings now live in each
// video clip's strip options (Trim, Speed and Volume were already there), and the preview takes the space.
(()=>{let st=document.createElement('style');st.textContent='.layout>.panel.right,.layout>.right-divider{display:none!important}@media(min-width:751px){body .layout{grid-template-columns:0 0 minmax(240px,1fr) 0 0!important}}.top button,.top .brand{white-space:nowrap}.top .badge{display:none}.top #projectName{min-width:0;flex:1 1 140px}.main-strip-options .clip-caption{flex-basis:100%;display:flex;gap:8px;align-items:flex-end}.main-strip-options .clip-caption label{flex:1}';document.head.appendChild(st)})();
function editMainLook(id,key,value){let m=stripModel('main',id);if(!m||exporting)return;selected=m.i;change(key,value);decorateStrips()}
const renderTimelineNoLook=renderTimeline;renderTimeline=function(){renderTimelineNoLook();let fit=$('fit'),look=$('filter');
  document.querySelectorAll('#clips .strip-row').forEach(row=>{let c=clips.find(c=>c.id===row.dataset.trackid),box=row.querySelector('.main-strip-options');if(!c||!box)return;row.querySelector('.strip-options>p.sub')?.remove();
    let opts=(sel,v)=>[...sel.options].map(o=>`<option value="${o.value.replace(/"/g,'&quot;')}" ${o.value===v?'selected':''}>${o.textContent}</option>`).join(''),dup=box.querySelector('button');
    let wrap=document.createElement('div');wrap.style.display='contents';
    wrap.innerHTML=`<label>Framing<select onchange="editMainLook('${c.id}','fit',this.value)">${opts(fit,c.fit||'contain')}</select></label><label>Color look<select onchange="editMainLook('${c.id}','filter',this.value)">${opts(look,c.filter||'none')}</select></label>`+(c.text?`<div class="clip-caption"><label>Caption on this clip<input type="text" value="${String(c.text).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" onchange="editMainLook('${c.id}','text',this.value)"></label><button type="button" onclick="editMainLook('${c.id}','text','')">Remove caption</button></div>`:'');
    box.insertBefore(wrap,dup)})};
render();

// Ripple delete: deleting a clip on the main video row closes the gap, and everything on the other rows
// (text, captions, stickers, effects, video layers, audio and music) moves with it. Things that only lived
// on the deleted clip go too; things that cross it get shorter. One Undo brings it all back.
function rippleGap(A,d,keep){if(d<=0)return;const B=A+d,E=.02;
  // Main clips after the gap that have their own place on the timeline.
  clips.forEach(c=>{if(Number.isFinite(c.offset)&&c.offset>=B-E)c.offset=Math.max(0,c.offset-d)});
  // Text, stickers, effects and captions: offset + length.
  graphicTracks=graphicTracks.filter(g=>{const s=g.offset||0,e=s+(g.length||0);
    if(g.type==='captions'&&Array.isArray(g.words)){g.words=g.words.filter(w=>{const ws=s+w.s;return !(ws>=A-E&&ws<B-E)}).map(w=>{const ws=s+w.s;return ws>=B-E?{...w,s:w.s-d,e:w.e-d}:w});
      if(s>=B-E){g.offset=s-d;return true}if(e<=A+E)return true;if(s>=A-E){const cut=B-s;g.offset=A;g.words=g.words.map(w=>({...w,s:w.s-cut,e:w.e-cut}));g.length=Math.max(.1,e-B);return g.words.length>0}g.length=Math.max(.1,(g.length||0)-Math.min(d,e-A));return g.words.length>0}
    if(e<=A+E)return true;if(s>=B-E){g.offset=s-d;return true}
    if(s>=A-E&&e<=B+E){if(keep){g.offset=A;return true}return false}
    if(s<A&&e>B){g.length-=d;return true}
    if(s<A){g.length=A-s;return true}
    g.offset=A;g.length=e-B;return true});
  // Video layers and audio/music tracks: offset + (end - start) / speed of their own media.
  extraTracks=extraTracks.filter(t=>{const sp=t.speed||1,s=t.offset||0,len=Math.max(0,(t.end-t.start)/sp),e=s+len;if(!t.file||len<=0)return true;
    if(e<=A+E)return true;if(s>=B-E){t.offset=s-d;return true}
    if(s>=A-E&&e<=B+E&&keep){t.offset=A;return true}
    if(s>=A-E&&e<=B+E){t.media?.pause();try{t.node?.disconnect();t.gain?.disconnect()}catch{}return false}
    if(s<A&&e>B){t.end-=d*sp;return true}
    if(s<A){t.end=t.start+(A-s)*sp;return true}
    t.start+=(B-s)*sp;t.offset=A;return true})}
{const removeWithoutRipple=removeClip;removeClip=function(){const p=pickedStrip;if(exporting||(p&&p.kind!=='main'))return removeWithoutRipple();
  const i=p?stripModel('main',p.id)?.i??selected:selected,c=clips[i];if(!c)return removeWithoutRipple();
  const A=startOf(i),d=duration(c),n=clips.length,others=graphicTracks.length+extraTracks.length;
  selected=i;removeWithoutRipple();if(clips.length>=n)return;
  rippleGap(A,d);render();renderGraphicTracks();renderTracks();draw();seekTimeline(Math.min(A,total()));
  if(graphicTracks.some(g=>g.type==='captions'))toast('Clip deleted and everything moved to close the gap. Captions look off? Tap the Captions strip → 🔄 Redo captions.');
  else if(others)toast('Clip deleted. Text and music moved to close the gap. (Undo brings it back.)')}}


// ---------- Tap, double-tap and dragging between layers ----------
// One tap picks a strip (pink outline, Delete/Split/Duplicate act on it) and keeps its editing menu closed, so
// it can be dragged straight away. A second tap within 0.4 s (a double-tap), or Enter, opens or closes the menu.
// Text, stickers, effects, captions, video layers and audio can also be dragged up or down: onto another row
// of the same kind to join it (its `lane`), or between rows, above the top or below the bottom for a new layer
// of their own. A row left empty simply goes away (rows exist only for the strips in them). Undo-able.
const toggleStripMenu=selectStrip;let lastTap={id:null,t:0};
function tapStrip(kind,id){const now=performance.now(),dbl=lastTap.id===id&&now-lastTap.t<400;lastTap={id,t:dbl?0:now};
  if(dbl){toggleStripMenu(kind,id);return}
  pickedStrip={kind,id};if(kind==='main'){const m=stripModel(kind,id);if(m){selected=m.i;inspector()}}
  decorateStrips();stripTip()}
// The ✂ split button pops up where the strip was tapped, so the second tap of a double-tap would land on it and
// split the strip. Within 0.45 s of a tap, a tap on it counts as that double-tap instead.
splitButton.addEventListener('pointerdown',e=>{if(lastTap.t&&performance.now()-lastTap.t<450){e.stopImmediatePropagation();e.preventDefault();delete splitButton.dataset.armed;
  const {kind,id}=splitButton.dataset;hideSplit();lastTap={id:null,t:0};suppressClick=true;toggleStripMenu(kind,id)}},true);
let suppressClick=false;splitButton.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.stopImmediatePropagation()}},true);
{const st=document.createElement('style');st.textContent=`.duration-strip.picked{outline:2px solid #ff3ea5;outline-offset:1px;z-index:3}
.strip-row.drop-into>.strip-line .strip-lane{box-shadow:inset 0 0 0 2px #ff3ea5;border-radius:6px;background:#ff3ea514}
.lane-drop-line{position:fixed;height:3px;background:#ff3ea5;border-radius:3px;z-index:9998;pointer-events:none;box-shadow:0 0 0 2px #ff3ea533}
.lane-drop-line::after{content:attr(data-label);position:absolute;left:8px;top:-22px;font:700 11px system-ui,sans-serif;color:#fff;background:#ff3ea5;padding:2px 8px;border-radius:999px;white-space:nowrap}
.duration-strip.lifting{opacity:.85;box-shadow:0 6px 18px #0006;z-index:5}
.strip-tip{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 12px);z-index:9999;width:min(420px,calc(100vw - 20px));display:flex;gap:10px;align-items:flex-start;background:#ff3ea5;color:#fff;border-radius:16px;padding:12px 12px 12px 14px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 12px 34px #0005;animation:stripTipIn .35s ease-out}
.strip-tip b{display:block;margin-bottom:2px}.strip-tip ul{margin:0;padding-left:18px}
html body .strip-tip button{flex:none;width:30px;height:30px;padding:0!important;border-radius:50%!important;border:0!important;background:#fff3!important;color:#fff!important;font-size:16px;cursor:pointer}
@keyframes stripTipIn{from{opacity:0;transform:translate(-50%,-12px)}}@media(prefers-reduced-motion:reduce){.strip-tip{animation:none}}`;document.head.appendChild(st)}

// The "how strips work" note: pops up for 9 s the first 3 times the editor is used on this device (and on the
// first tap of a strip until it has been seen 3 times). The ✕ closes it for good.
let tipShown=false;
function stripTip(force){if(!editorWithStrips())return;let n=0;try{n=+localStorage.getItem('tapshop-strip-tip2')||0}catch{}if(tipShown||n>=3&&!force)return;tipShown=true;try{localStorage.setItem('tapshop-strip-tip2',String(n+1))}catch{}
  const el=document.createElement('div');el.className='strip-tip';el.setAttribute('role','status');
  el.innerHTML='<div><b>✨ New: moving strips is easier</b><ul><li><b style="display:inline">Tap</b> a strip to pick it, then drag it along the timeline.</li><li>Drag it <b style="display:inline">up or down</b> to put it on another row, or on a new layer of its own. Main video clips become a picture-in-picture layer.</li><li><b style="display:inline">Double-tap</b> a strip to open its editing menu.</li></ul></div><button type="button" aria-label="Close" style="background:none">✕</button>';
  document.body.appendChild(el);const go=()=>{el.remove();clearInterval(watch)},watch=setInterval(()=>{if(!editorWithStrips())go()},500);el.querySelector('button').onclick=()=>{try{localStorage.setItem('tapshop-strip-tip2','3')}catch{}go()};setTimeout(go,9000)}
// Only in the editor itself: the page has finished loading, the start screen is closed, and strips are showing
// on the timeline. Checked every second until then; if the start screen opens again, the note goes away.
const editorWithStrips=()=>{const st=document.getElementById('veStart');return document.readyState==='complete'&&!document.documentElement.classList.contains('ve-boot')&&!!st&&!st.getClientRects().length&&[...document.querySelectorAll('.tracks .duration-strip')].some(x=>x.getClientRects().length)};
{const wait=()=>{if(editorWithStrips())setTimeout(()=>{if(editorWithStrips())stripTip()},600);else setTimeout(wait,1000)};addEventListener('load',()=>setTimeout(wait,800))}

// Dragging between rows. Runs alongside the left/right drag in the pointer handlers above.
let laneLine=null,laneTarget=null;
const laneOf=(list,t)=>t.lane||t.id;
function laneRows(kind){const box=$(kind==='extra'?'extraTracks':'graphicTracks');return box?[...box.querySelectorAll(':scope > .strip-row:not(.merged)')].filter(r=>r.querySelector('.strip-line .duration-strip')):[]}
function clearLaneDrop(){laneLine?.remove();laneLine=null;document.querySelectorAll('.strip-row.drop-into').forEach(r=>r.classList.remove('drop-into'));laneTarget=null}
const mainRow=()=>document.querySelector('#clips > .strip-row:not(.merged)');
// A main video clip dragged off the main row becomes a video layer (picture in picture) at the same time:
// over the middle of a video-layer row it joins that row, anywhere else it gets a new layer.
function mainDrop(y){const mr=mainRow()?.querySelector('.strip-line')?.getBoundingClientRect();if(!mr||(y>=mr.top-4&&y<=mr.bottom+4))return null;
  for(const r of laneRows('extra')){const line=r.querySelector('.strip-line'),rect=line.getBoundingClientRect(),items=[...line.querySelectorAll('.duration-strip')].map(x=>extraTracks.find(t=>t.id===x.dataset.id)).filter(Boolean);
    if(items[0]?.type==='video'&&y>=rect.top+rect.height*.28&&y<=rect.bottom-rect.height*.28)return {mode:'join',row:{r,items,lane:laneOf(extraTracks,items[0]),type:'video'}}}
  return {mode:'layer',y:y<mr.top?mr.top-3:y}}
function laneDrop(d,y){const list=d.kind==='extra'?extraTracks:graphicTracks,me=list.find(t=>t.id===d.id);if(!me)return null;
  if(d.kind==='extra'&&me.type==='video'&&me.file){const mr=mainRow()?.querySelector('.strip-line')?.getBoundingClientRect();if(mr&&y>=mr.top&&y<=mr.bottom)return {mode:'toMain'}}
  const rows=laneRows(d.kind);if(!rows.length)return null;
  const info=rows.map(r=>{const line=r.querySelector('.strip-line'),rect=line.getBoundingClientRect(),ids=[...line.querySelectorAll('.duration-strip')].map(s=>s.dataset.id),items=ids.map(id=>list.find(t=>t.id===id)).filter(Boolean);return {r,rect,items,lane:items[0]&&laneOf(list,items[0]),type:items[0]?.type}});
  const first=info[0],last=info.at(-1);
  const alone=R=>R.items.length===1&&R.items[0]===me,same=R=>alone(R)&&list.filter(x=>laneOf(list,x)===laneOf(list,me)).length===1;
  const pick=t=>t&&t.mode==='new'&&same(t.before||t.after)?null:t;
  if(y<first.rect.top)return pick({mode:'new',before:first,y:first.rect.top-3});
  if(y>last.rect.bottom)return pick({mode:'new',after:last,y:last.rect.bottom+3});
  for(let k=0;k<info.length;k++){const R=info[k],top=R.rect.top,h=R.rect.height;
    if(y>=top&&y<=R.rect.bottom){const f=(y-top)/h,mine=R.items.some(t=>t.id===me.id);
      if(f>.28&&f<.72){if(mine)return null;if(R.type===me.type)return {mode:'join',row:R};
        // A row of another kind (say text over a sticker row): a new track above or below it, by which half.
        return pick(f<.5?{mode:'new',before:R,y:top-2}:{mode:'new',after:R,y:R.rect.bottom+2})}
      return pick(f<=.28?{mode:'new',before:R,y:top-2}:{mode:'new',after:R,y:R.rect.bottom+2})}
    const nx=info[k+1];if(nx&&y>R.rect.bottom&&y<nx.rect.top)return pick(same(nx)?null:{mode:'new',after:R,y:(R.rect.bottom+nx.rect.top)/2})}
  return null}
tracksHost.addEventListener('pointerdown',e=>{if(stripDrag){stripDrag.y0=e.clientY;stripDrag.x0=e.clientX;stripDrag.vert=false;stripDrag.touch=e.pointerType!=='mouse'}},false);
tracksHost.addEventListener('pointermove',e=>{const d=stripDrag;if(!d||d.edge||d.y0==null)return;const dy=e.clientY-d.y0;
  if(!d.vert){const need=d.touch?(d.kind==='main'?44:34):14,dx=Math.abs(e.clientX-(d.x0??e.clientX));if(Math.abs(dy)<need||Math.abs(dy)<dx*.8)return}d.vert=true;d.moved=true;d.element.classList.add('lifting');d.element.style.transform=`translateY(${dy}px)`;
  clearLaneDrop();const t=d.kind==='main'?mainDrop(e.clientY):laneDrop(d,e.clientY);laneTarget=t;if(!t)return;
  if(t.mode==='toMain'){mainRow()?.classList.add('drop-into');return}
  if(t.mode==='join'){t.row.r.classList.add('drop-into')}
  else{const host=tracksHost.getBoundingClientRect();laneLine=document.createElement('div');laneLine.className='lane-drop-line';laneLine.dataset.label=t.mode==='layer'?'New video layer (picture in picture)':'New layer';laneLine.style.left=(host.left+8)+'px';laneLine.style.width=Math.max(60,host.width-16)+'px';laneLine.style.top=(t.y-1)+'px';document.body.appendChild(laneLine)}});
// Before the left/right drag finishes (capture phase), apply the move between rows.
tracksHost.addEventListener('pointerup',()=>{const d=stripDrag;if(!d||!d.vert)return;d.element.style.transform='';d.element.classList.remove('lifting');const t=laneTarget;clearLaneDrop();if(!t)return;
  if(d.kind==='main'){clipToLayer(d.id,t);return}
  if(t.mode==='toMain'){layerToClip(d.id);return}
  const list=d.kind==='extra'?extraTracks:graphicTracks,i=list.findIndex(x=>x.id===d.id);if(i<0)return;snapshot();const me=list[i];list.splice(i,1);
  const idx=it=>list.indexOf(it);let msg;
  if(t.mode==='join'){me.lane=t.row.lane;const members=list.filter(x=>laneOf(list,x)===t.row.lane),at=Math.max(...members.map(idx))+1;list.splice(at,0,me);msg='Moved to that row'}
  else{me.lane=uid();const ref=(t.before||t.after).items.filter(x=>x!==me);let at;if(!ref.length)at=list.length;else if(t.before)at=Math.min(...ref.map(idx));else at=Math.max(...ref.map(idx))+1;list.splice(Math.max(0,at),0,me);msg='Moved to a new layer'}
  pickedStrip={kind:d.kind,id:d.id};if(d.kind==='extra')renderTracks();else renderGraphicTracks();draw();setTimeout(()=>toast(msg+'. (Undo puts it back.)'),30)},true);
tracksHost.addEventListener('pointercancel',()=>{if(stripDrag?.vert){stripDrag.element.style.transform='';stripDrag.element.classList.remove('lifting')}clearLaneDrop()},true);


// ---------- 🗑 in the empty space between strips ----------
// Every row shows a small bin in each gap between two strips (a gap of at least 0.15 s). Tapping it deletes that
// empty time. On the main video row everything after the gap moves left with the video (text, captions, music…,
// like deleting a clip, but nothing is removed: anything inside the gap moves to its start). On any other row
// only the strips after the gap in that row move. Undo puts it back.
{const st=document.createElement('style');st.textContent=`.gap-bin{position:absolute;top:50%;transform:translate(-50%,-50%);z-index:4;width:22px;height:22px;min-height:0!important;padding:0!important;border-radius:50%!important;border:1px dashed #ff3ea5aa!important;color:#ff3ea5!important;font-size:12px;line-height:1;display:grid;place-items:center;cursor:pointer;opacity:.85}
.gap-bin:hover,.gap-bin:focus-visible{opacity:1;border-style:solid!important;background:#ff3ea522!important}@media (pointer:coarse){.gap-bin{width:28px;height:28px;font-size:14px}}`;document.head.appendChild(st)}
function gapsOf(spans){spans=spans.filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);const out=[];let end=null;for(const [a,b] of spans){if(end!=null&&a-end>=.15)out.push([end,a-end]);end=end==null?b:Math.max(end,b)}return out}
function addGapBins(){if(exporting)return;tracksHost.querySelectorAll('.gap-bin').forEach(b=>b.remove());
  const put=(lane,kind,ids,A,d)=>{if(d*timelineScale<16)return;const b=document.createElement('button');b.type='button';b.className='gap-bin';b.style.background='none';b.textContent='🗑';
    b.title=`Delete this empty space (${d.toFixed(1)} s)`;b.setAttribute('aria-label',b.title);b.style.left=((A+d/2)*timelineScale)+'px';
    b.addEventListener('pointerdown',e=>e.stopPropagation());b.onclick=e=>{e.stopPropagation();closeGap(kind,ids,A,d)};lane.appendChild(b)};
  {const lane=document.querySelector('#clips > .strip-row:not(.merged) .strip-lane');if(lane&&clips.length>1){const st=baseStarts();for(const [A,d] of gapsOf(clips.map((c,i)=>[st[i],st[i]+duration(c)])))put(lane,'main',null,A,d)}}
  for(const kind of ['extra','graphic'])for(const row of laneRows(kind)){const lane=row.querySelector('.strip-line .strip-lane'),ids=[...lane.querySelectorAll('.duration-strip')].map(x=>x.dataset.id);if(ids.length<2)continue;
    const spans=ids.map(id=>stripModel(kind,id)).filter(Boolean).map(m=>[m.offset,m.offset+m.length]);for(const [A,d] of gapsOf(spans))put(lane,kind,ids,A,d)}}
function closeGap(kind,ids,A,d){if(exporting)return;pause();snapshot();const B=A+d;
  if(kind==='main'){const st=baseStarts();clips.forEach((c,i)=>{if(!Number.isFinite(c.offset))c.offset=st[i]});rippleGap(A,d,true)}
  else for(const id of ids){const m=stripModel(kind,id);if(m&&m.offset>=B-.02)m.item.offset=Math.max(0,m.item.offset-d)}
  hideSplit();render();renderGraphicTracks();renderTracks();draw();seekTimeline(Math.min(A,total()));toast(`Deleted ${d.toFixed(1)} s of empty space. (Undo brings it back.)`)}
{const decorateWithBins=decorateStrips;decorateStrips=function(){decorateWithBins();addGapBins()}}
render();


// ---------- Main video clips <-> video layers ----------
// The other main clips keep their places (their offsets are fixed first), so a gap is left where the clip was;
// its 🗑 closes it. The layer starts full size (scale 100) so the picture looks the same until it's resized.
async function clipToLayer(id,t){const i=clips.findIndex(c=>c.id===id);if(i<0||exporting)return;const c=clips[i],a=asset(c);if(!a?.file){toast('Can’t find this clip’s video file.');return}
  pause();snapshot();const st=baseStarts();clips.forEach((x,k)=>{if(!Number.isFinite(x.offset))x.offset=st[k]});const at=st[i];clips.splice(i,1);selected=Math.min(selected,clips.length-1);activeId=null;render();
  addTrack('video');const L=extraTracks.at(-1);targetTrack=L.id;
  // Its own <video> for the same file. Not loadTrackMedia: that rejects files whose length the phone only knows
  // later (common for phone recordings); the clip's length is already known here.
  try{const v=document.createElement('video');v.preload='auto';v.playsInline=true;v.muted=false;const url=URL.createObjectURL(a.file);v.src=url;
    await new Promise((ok,no)=>{const to=setTimeout(()=>no(Error('timeout')),15000);v.onloadedmetadata=()=>{clearTimeout(to);ok()};v.onerror=()=>{clearTimeout(to);no(Error('read'))}});
    Object.assign(L,{media:v,file:a.file,url,node:null,gain:null});await ensureAudio()}
  catch(e){console.warn('Layer failed:',e);undo();toast('Couldn’t turn that clip into a layer on this device, so it stayed where it was.');return}
  Object.assign(L,{name:(a.name||'Video')+' (layer)',offset:at,start:c.in,end:c.out,speed:c.speed||1,volume:c.volume??1,scale:100,x:50,y:50,opacity:1});
  if(t.mode==='join'){L.lane=t.row.lane;const members=extraTracks.filter(x=>x!==L&&laneOf(extraTracks,x)===t.row.lane);extraTracks.splice(extraTracks.indexOf(L),1);extraTracks.splice(Math.max(...members.map(x=>extraTracks.indexOf(x)))+1,0,L)}
  else{L.lane=uid();extraTracks.splice(extraTracks.indexOf(L),1);extraTracks.splice(t.y!=null&&laneRows('extra').length&&t.y>(laneRows('extra')[0].getBoundingClientRect().top)?extraTracks.length:0,0,L)}
  pickedStrip={kind:'extra',id:L.id};expandedStrip=null;render();renderTracks();draw();await seekTimeline(at);toast('Now a video layer on top of the main video. Resize it on the preview, or drag it back down to the main row.')}
async function layerToClip(id){const L=extraTracks.find(t=>t.id===id);if(!L?.file||exporting)return;pause();snapshot();
  let a=assets.find(x=>x.file===L.file);if(!a){try{a=await loadAsset(L.file)}catch(e){toast(e.message);return}}
  const st=baseStarts();clips.forEach((x,k)=>{if(!Number.isFinite(x.offset))x.offset=st[k]});
  const c=makeClip(a);Object.assign(c,{in:L.start,out:L.end,speed:L.speed||1,volume:L.volume??1});const len=duration(c);
  // At the layer's time, or the first free spot after it on the main row.
  let at=Math.max(0,L.offset);const spans=clips.map(x=>[x.offset,x.offset+duration(x)]).sort((p,q)=>p[0]-q[0]);for(const [s0,e0] of spans)if(at<e0-.01&&at+len>s0+.01)at=e0;c.offset=at;
  clips.push(c);clips.sort((p,q)=>p.offset-q.offset);
  L.media?.pause();try{L.node?.disconnect();L.gain?.disconnect()}catch{}extraTracks=extraTracks.filter(t=>t!==L);
  selected=clips.indexOf(c);pickedStrip={kind:'main',id:c.id};expandedStrip=null;render();renderTracks();draw();await seekTimeline(at);toast('Moved into the main video.')}

// ---- Beat markers: small pink ticks on the ruler at every beat of each music track with a tempo, taller ones every bar (4 beats),
// and faint lines across the music strip itself. Redrawn with the ruler (zoom, moves, trims).
{const base=setRuler;setRuler=function(){base();const r=$('ruler');if(!r)return;r.querySelectorAll('.beat-marks').forEach(x=>x.remove());
  for(const t of extraTracks){if(!t.bpm||!t.media)continue;const b=60/t.bpm,o=t.beatOffset||0,k0=Math.ceil((t.start-o)/b-1e-6),T0=t.offset+(o+k0*b-t.start)/t.speed,end=t.offset+(t.end-t.start)/t.speed,beatPx=b/t.speed*timelineScale;
    if(beatPx<3||end<=T0)continue;const kb=Math.ceil(k0/4)*4,B0=t.offset+(o+kb*b-t.start)/t.speed;
    for(const [from,size,cls] of [[T0,beatPx,'beat-marks'],[B0,beatPx*4,'beat-marks bar']]){const m=document.createElement('div');m.className=cls;m.style.left=from*timelineScale+'px';m.style.width=Math.max(0,(end-from)*timelineScale)+'px';m.style.backgroundSize=size+'px 100%';r.appendChild(m)}
    const strip=document.querySelector(`#extraTracks .duration-strip[data-id="${t.id}"]`);if(strip){strip.querySelector('.beat-lines')?.remove();const l=document.createElement('span');l.className='beat-lines';l.style.backgroundSize=beatPx*4+'px 100%';l.style.backgroundPositionX=(B0-t.offset)*timelineScale+'px';strip.appendChild(l)}}}}
{const st=document.createElement('style');st.textContent=`.ruler .beat-marks{position:absolute;bottom:0;height:5px;pointer-events:none;background-image:linear-gradient(90deg,#ff3ea5 0 1px,transparent 1px);background-repeat:repeat-x;opacity:.75;z-index:1}
.ruler .beat-marks.bar{height:10px;background-image:linear-gradient(90deg,#ff3ea5 0 2px,transparent 2px);opacity:1}
.duration-strip .beat-lines{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(90deg,#ffffff38 0 1px,transparent 1px);background-repeat:repeat-x;border-radius:inherit}
html body .extra-track-fields label.duck-toggle{display:flex!important;flex-direction:row!important;align-items:center;gap:8px;flex-basis:200px;font-size:12.5px;font-weight:600;color:inherit;align-self:end;min-height:38px}.extra-track-fields .duck-toggle input{width:auto;accent-color:#ff3ea5}.duck-pct{font-weight:700;color:#ff3ea5}
.extra-track-fields input[type=range]:disabled{opacity:.4}.beat-note{flex-basis:100%;font-size:11.5px;opacity:.7}`;document.head.appendChild(st)}

// ---- Waveforms on audio strips: loudness bars drawn on a canvas inside each audio track's strip (generated music and uploads
// alike), so beats, quiet spots and drops show. The file is decoded once (mono, 8 kHz) into loudness every 20 ms (cached per
// file); each strip draws the part it plays (start → end, at its speed), one bar every 2 px. The canvas is kept and re-attached
// while nothing about the strip changes, so drags and redraws stay cheap.
{const STEP=.02,levels=new WeakMap();
 function loud(file){let r=levels.get(file);if(r)return r;
  r=(async()=>{try{const buf=await new OfflineAudioContext(1,1,8000).decodeAudioData(await file.arrayBuffer()),d=buf.getChannelData(0),hop=Math.round(buf.sampleRate*STEP),n=Math.floor(d.length/hop),out=new Float32Array(n);let top=0;
     for(let i=0;i<n;i++){let s=0;for(let k=i*hop;k<(i+1)*hop;k++)s+=d[k]*d[k];out[i]=Math.sqrt(s/hop);if(out[i]>top)top=out[i]}
     for(let i=0;i<n;i++)out[i]=top?Math.sqrt(out[i]/top):0;levels.set(file,out);decorateStrips();return out}catch{levels.set(file,'none');return 'none'}})();
  levels.set(file,r);return r}
 function wave(t,strip){const lv=loud(t.file);if(!(lv instanceof Float32Array))return;const w=Math.max(1,Math.round((t.end-t.start)/t.speed*timelineScale)),h=strip.clientHeight||19,key=[t.start,t.end,t.speed,w,h].join();
  let c=t._wave;if(!c||c._key!==key||c._lv!==lv){c=document.createElement('canvas');c.className='wave';c._key=key;c._lv=lv;const dpr=Math.min(2,devicePixelRatio||1),cw=Math.min(16000,Math.round(w*dpr));c.width=cw;c.height=Math.round(h*dpr);
    const g=c.getContext('2d'),bar=Math.max(1,Math.round(2*dpr)),mid=c.height/2;g.fillStyle='#ffffffb8';
    for(let x=0;x<cw;x+=bar+1){const a=t.start+(x/cw)*(t.end-t.start),b=t.start+((x+bar)/cw)*(t.end-t.start);let m=0;for(let i=Math.floor(a/STEP);i<=Math.min(lv.length-1,Math.floor(b/STEP));i++)m=Math.max(m,lv[i]);
      const hh=Math.max(1,m*(c.height-2*dpr));g.fillRect(x,mid-hh/2,bar,hh)}
    Object.defineProperty(t,'_wave',{value:c,writable:true,configurable:true,enumerable:false})}
  if(c.parentNode!==strip)strip.prepend(c)}
 const base=decorateStrips;decorateStrips=function(){const r=base.apply(this,arguments);
  for(const t of extraTracks){if(t.type!=='audio'||!t.file||!t.media)continue;const s=document.querySelector(`#extraTracks .duration-strip[data-id="${t.id}"]`);if(s)wave(t,s)}return r};
 window.veTrackWave=t=>loud(t.file)}

// ---- Live ducking meter: while the video plays, each auto-ducking music strip shows a small 🎙️ gain bar at the playhead.
// The bar is the music's level right now (its duck only, not fades): it shrinks while someone talks and the strip's waveform
// dims with it, so you can see the dip happen. Hidden when paused or not ducking. Driven from syncExtra(), every frame.
{const base=syncExtra;syncExtra=function(){base.apply(this,arguments);
  for(const t of extraTracks){if(t.type!=='audio'||!t.duck)continue;const s=document.querySelector(`#extraTracks .duration-strip[data-id="${t.id}"]`);if(!s)continue;
    const local=playhead-t.offset,on=playing&&!t.muted&&local>=0&&local<=(t.end-t.start)/t.speed,depth=on&&window.veSpeechWindows?veDuckDepth(veSpeechWindows(),playhead):0,level=1-Math.max(0,Math.min(1,t.duckAmt??.85))*depth;
    let m=s.querySelector('.duck-meter');if(!m){m=document.createElement('span');m.className='duck-meter';m.innerHTML='<b>🎙️</b><i><u></u></i>';s.appendChild(m)}
    m.classList.toggle('on',depth>.05);m.style.left=Math.max(0,local*timelineScale+4)+'px';m.querySelector('u').style.height=Math.round(level*100)+'%';m.title=`Music at ${Math.round(level*100)}% while someone talks`;
    s.style.setProperty('--duck',depth.toFixed(2))}};
 // Clear the meters when playback stops (syncExtra keeps running on seeks, but `playing` is false then).
 const p=pause;pause=function(){const r=p.apply(this,arguments);document.querySelectorAll('.duration-strip .duck-meter.on').forEach(m=>m.classList.remove('on'));document.querySelectorAll('#extraTracks .duration-strip').forEach(s=>s.style.removeProperty('--duck'));return r}}
{const st=document.createElement('style');st.textContent=`.duration-strip .wave{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:calc(.55 - .35*var(--duck,0));transition:opacity .12s;border-radius:inherit}
.duration-strip .strip-label{position:relative;z-index:1;text-shadow:0 1px 2px #000a}
.duration-strip .duck-meter{position:absolute;top:1px;bottom:1px;display:flex;align-items:center;gap:2px;padding:0 3px;border-radius:6px;background:#0009;opacity:0;transform:translateX(-2px);transition:opacity .15s,transform .15s;pointer-events:none;z-index:2}
.duration-strip .duck-meter.on{opacity:1;transform:none}.duration-strip .duck-meter b{font-size:9px;line-height:1;font-weight:400}
.duration-strip .duck-meter i{position:relative;width:5px;height:100%;border-radius:2px;background:#ffffff33;overflow:hidden;display:block}.duration-strip .duck-meter u{position:absolute;left:0;right:0;bottom:0;background:#ff3ea5;transition:height .1s;text-decoration:none}`;document.head.appendChild(st)}
