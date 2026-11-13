// Photo Lab tools: the toolbox, tool options, pointer handling (one finger draws, two fingers
// pan and pinch), the paint and retouch brush engines, selections, fill, gradient, text,
// shapes, crop, transform, move, colour picker and zoom. Also Edit menu actions and shortcuts.
const OPT_KEY='tapshop-photo-tools';
let savedOpts={};try{savedOpts=JSON.parse(localStorage.getItem(OPT_KEY))||{}}catch{}
const saveOpts=()=>{try{localStorage.setItem(OPT_KEY,JSON.stringify(savedOpts))}catch{}};
const SIZE={key:'size',type:'range',label:'Size',min:1,max:500,value:24,unit:' px'},HARD={key:'hard',type:'range',label:'Hardness',min:0,max:100,value:50,unit:'%'},OPAC={key:'op',type:'range',label:'Opacity',min:1,max:100,value:100,unit:'%'},PRESS={key:'press',type:'check',label:'Pen pressure changes size',value:true};
const MODE={key:'blend',type:'select',label:'Mode',value:'source-over',options:BLENDS};
const SELMODE={key:'mode',type:'seg',label:'Mode',value:'replace',options:[['replace','New'],['add','Add'],['subtract','Take away'],['intersect','Overlap']]},FEATHER={key:'feather',type:'range',label:'Soft edges (feather)',min:0,max:100,value:0,unit:' px'};
const RATE={key:'rate',type:'range',label:'Strength',min:1,max:100,value:50,unit:'%'};
function optsOf(id){let t=TOOLS.find(t=>t.id===id),o={};for(const f of t.opts||[])o[f.key]=f.value;return Object.assign(o,savedOpts[id]||{})}
function setOpt(key,val){(savedOpts[tool.id]=savedOpts[tool.id]||{})[key]=val;saveOpts();tool.onOpt&&tool.onOpt(key,val);render()}

// ---- Brush tips
const dabCache=new Map();
function dabMask(d,hard){d=Math.max(1,Math.round(d));let k=d+'|'+hard;if(dabCache.has(k))return dabCache.get(k);
  let c=mk(d,d),g=g2(c),r=d/2;if(d<3){g.fillStyle='#fff';g.fillRect(0,0,d,d)}else{let gr=g.createRadialGradient(r,r,0,r,r,r);gr.addColorStop(0,'#fff');gr.addColorStop(clamp(hard/100,0,.99),'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(r,r,r,0,7);g.fill()}
  if(dabCache.size>40)dabCache.clear();dabCache.set(k,c);return c}
function tinted(d,hard,color){let k='t'+Math.round(d)+'|'+hard+'|'+color;if(dabCache.has(k))return dabCache.get(k);let c=clone(dabMask(d,hard)),g=g2(c);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);dabCache.set(k,c);return c}
function pencilTip(d,color){d=Math.max(1,Math.round(d));let k='p'+d+'|'+color;if(dabCache.has(k))return dabCache.get(k);let id=new ImageData(d,d),[r,g,b]=hexRgb(color),R=d/2;for(let y=0;y<d;y++)for(let x=0;x<d;x++)if(d<3||Math.hypot(x+.5-R,y+.5-R)<=R){let i=(y*d+x)*4;id.data[i]=r;id.data[i+1]=g;id.data[i+2]=b;id.data[i+3]=255}let c=dataCanvas(id);dabCache.set(k,c);return c}
function pressure(e,o){return o.press&&e.pointerType==='pen'&&e.pressure>0?.15+.85*e.pressure:1}

// ---- Strokes. Paint tools draw into a stroke buffer composited once (so opacity is per
// stroke, like GIMP); retouch tools change a working copy dab by dab.
let stroke=null,strokeQ=0;
function beginStroke(kind,p,e){
  let l=layer();if(!l)return null;if(!l.visible)toast('This layer is hidden — show it in Layers to see your changes.');
  let o=optsOf(tool.id),retouch=['clone','heal','smudge','blur','dodge'].includes(kind);
  stroke={kind,l,id:l.id,o,base:l.canvas,mask:retouch?null:maskFor(l),buf:retouch?null:mk(l.canvas.width,l.canvas.height),work:retouch?clone(l.canvas,true):mk(l.canvas.width,l.canvas.height),last:null,rem:0,lastSize:o.size,color:colors.fg};
  return stroke;
}
function strokeTo(p,e){
  let s=stroke;if(!s)return;let size=Math.max(1,s.o.size*pressure(e,s.o)),x=p.x-s.l.x,y=p.y-s.l.y;s.lastSize=size;
  let spacing=Math.max(1,size*(s.kind==='pencil'?.2:['smudge','blur','dodge'].includes(s.kind)?.25:.1));
  if(!s.last){stamp(x,y,size);s.last={x,y};s.rem=spacing}
  else{let dx=x-s.last.x,dy=y-s.last.y,d=Math.hypot(dx,dy),t=s.rem;for(;t<=d;t+=spacing)stamp(s.last.x+dx*t/d,s.last.y+dy*t/d,size);s.rem=t-d;s.last={x,y}}
  queueStroke();
}
function queueStroke(){cancelAnimationFrame(strokeQ);strokeQ=requestAnimationFrame(updateStroke)}
function strokeResult(){
  let s=stroke;if(!s.buf)return doc.sel?clipToSel(s.l,s.base,s.work):s.work;
  let w=s.work,g=g2(w);g.globalAlpha=1;g.globalCompositeOperation='copy';g.drawImage(s.base,0,0);
  let b=s.buf;if(s.mask){b=clone(s.buf);let bg=g2(b);bg.globalCompositeOperation='destination-in';bg.drawImage(s.mask,0,0)}
  g.globalAlpha=s.o.op/100;g.globalCompositeOperation=s.kind==='eraser'?'destination-out':s.l.lockAlpha?'source-atop':(s.o.blend||'source-over');g.drawImage(b,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';return w;
}
function updateStroke(){let s=stroke;if(!s)return;
  if(s.buf&&!s.mask&&s.kind!=='eraser'&&!s.l.lockAlpha&&(s.o.blend||'source-over')==='source-over'&&s.l.blend==='source-over'){preview={id:s.id,canvas:s.base,x:s.l.x,y:s.l.y,over:{canvas:s.buf,alpha:s.o.op/100}};return render()}
  preview={id:s.id,canvas:strokeResult(),x:s.l.x,y:s.l.y};render()}
function endStroke(label){let s=stroke;if(!s)return;clearInterval(s.timer);cancelAnimationFrame(strokeQ);let out=strokeResult();if(s.buf)out=clone(out);stroke=null;preview=null;let i=layerIndex(s.id);if(i<0)return render();doc.layers[i].canvas=out;doc.layers[i].text=null;commit(label)}
function cancelStroke(){if(!stroke)return;clearInterval(stroke.timer);cancelAnimationFrame(strokeQ);stroke=null;preview=null;render()}
let cloneSrc=null,cloneOff=null,cloneFresh=true,settingSource=false;
function patchAt(c,x,y,d){let t=mk(d,d,true);g2(t).drawImage(c,-x,-y);return t}
function stamp(x,y,size){
  let s=stroke,o=s.o,d=Math.max(1,Math.round(size)),r=d/2,px=Math.round(x-r),py=Math.round(y-r);
  if(s.buf){let g=g2(s.buf);
    if(s.kind==='pencil'){g.drawImage(pencilTip(d,s.kind==='eraser'?'#000':s.color),Math.floor(x-r+.5),Math.floor(y-r+.5));return}
    g.globalAlpha=s.kind==='air'?clamp(o.flow/100,.01,1)*.3:1;g.drawImage(tinted(d,o.hard,s.kind==='eraser'?'#000':s.color),x-r,y-r);g.globalAlpha=1;return}
  let w=g2(s.work),tip=dabMask(d,o.hard),t;
  if(s.kind==='clone'||s.kind==='heal'){
    let src=s.src,sx=x+s.l.x+cloneOff.x-(s.srcDoc?0:s.l.x),sy=y+s.l.y+cloneOff.y-(s.srcDoc?0:s.l.y);t=patchAt(src,Math.round(sx-r),Math.round(sy-r),d);
    if(s.kind==='heal'){let a=readData(t),b=g2(s.work).getImageData(px,py,d,d),ma=[0,0,0],mb=[0,0,0],n=0;for(let i=0;i<a.data.length;i+=4){if(a.data[i+3]<200||b.data[i+3]<200)continue;n++;for(let c=0;c<3;c++){ma[c]+=a.data[i+c];mb[c]+=b.data[i+c]}}
      if(n){for(let c=0;c<3;c++)ma[c]=(mb[c]-ma[c])/n;for(let i=0;i<a.data.length;i+=4)for(let c=0;c<3;c++)a.data[i+c]+=ma[c]}g2(t).putImageData(a,0,0)}
    let tg=g2(t);tg.globalCompositeOperation='destination-in';tg.drawImage(tip,0,0);w.globalAlpha=o.op/100;w.drawImage(t,px,py);w.globalAlpha=1;return}
  if(s.kind==='smudge'){let k=o.rate/100;if(!s.carry){s.carry=patchAt(s.work,px,py,d);return}if(s.carry.width!==d){let n=mk(d,d,true);g2(n).drawImage(s.carry,0,0,d,d);s.carry=n}
    t=clone(s.carry);let tg=g2(t);tg.globalCompositeOperation='destination-in';tg.drawImage(tip,0,0);w.globalAlpha=k;w.drawImage(t,px,py);w.globalAlpha=1;
    let cg=g2(s.carry);cg.globalAlpha=1-k;cg.drawImage(s.work,-px,-py);cg.globalAlpha=1;return}
  let id=g2(s.work).getImageData(px,py,d,d),k=o.rate/100;
  if(s.kind==='blur'){if(o.sharpen){let q=k*.6;convolve(id,[0,-q,0,-q,1+4*q,-q,0,-q,0])}else blurData(id,.6+k*2)}
  else{let e=k*.12,dark=o.dodge==='burn';perPixel(id,(R,G,B)=>{let L=lum(R,G,B)/255,wgt=o.range==='s'?clamp(1-L*1.8,0,1):o.range==='h'?clamp(L*1.8-.8,0,1):clamp(1-Math.abs(L-.5)*2,0,1),f=e*wgt;return dark?[R*(1-f),G*(1-f),B*(1-f)]:[R+(255-R)*f,G+(255-G)*f,B+(255-B)*f]})}
  t=dataCanvas(id);let tg=g2(t);tg.globalCompositeOperation='destination-in';tg.drawImage(tip,0,0);w.globalCompositeOperation='source-atop';w.drawImage(t,px,py);w.globalCompositeOperation='source-over';
}

// ---- Flood fill (fuzzy select, select by colour, bucket fill). Returns an alpha mask canvas.
function floodMask(data,w,h,sx,sy,thr,contig){
  let d=data.data,m=new Uint8Array(w*h);sx=clamp(Math.floor(sx),0,w-1);sy=clamp(Math.floor(sy),0,h-1);let i0=(sy*w+sx)*4,tr=d[i0],tg=d[i0+1],tb=d[i0+2],ta=d[i0+3];
  const ok=p=>{let i=p*4;return Math.max(Math.abs(d[i]-tr),Math.abs(d[i+1]-tg),Math.abs(d[i+2]-tb),Math.abs(d[i+3]-ta))<=thr};
  if(!contig){for(let p=0;p<w*h;p++)if(ok(p))m[p]=1}
  else{let st=[sx,sy];while(st.length){let y=st.pop(),x=st.pop(),p=y*w+x;if(m[p]||!ok(p))continue;let l=x,r=x;while(l>0&&!m[p-(x-l)-1]&&ok(y*w+l-1))l--;while(r<w-1&&!m[y*w+r+1]&&ok(y*w+r+1))r++;
    for(let xx=l;xx<=r;xx++){m[y*w+xx]=1;if(y>0&&!m[(y-1)*w+xx]&&ok((y-1)*w+xx))st.push(xx,y-1);if(y<h-1&&!m[(y+1)*w+xx]&&ok((y+1)*w+xx))st.push(xx,y+1)}}}
  let id=new ImageData(w,h);for(let p=0;p<w*h;p++)if(m[p]){let i=p*4;id.data[i]=id.data[i+1]=id.data[i+2]=id.data[i+3]=255}return dataCanvas(id);
}
function docPixels(merged){if(merged)return flattened();let l=layer(),c=mk(doc.w,doc.h);g2(c).drawImage(l.canvas,l.x,l.y);return c}
function selMode(e,o){return e&&(e.shiftKey&&(e.altKey||e.ctrlKey||e.metaKey))?'intersect':e&&e.shiftKey?'add':e&&(e.altKey||e.ctrlKey||e.metaKey)?'subtract':o.mode}
function finishShape(m,o,e,label){if(o.feather>0)m=blurCanvas(m,o.feather/2);combineSel(m,selMode(e,o),label)}

// ---- Overlay helpers (image coordinates; line widths in screen pixels)
let hoverPos=null;
function px(n){return n/zoom}
function dashedRect(g,x,y,w,h){g.save();g.lineWidth=px(1);g.strokeStyle='#000';g.strokeRect(x,y,w,h);g.setLineDash([px(4),px(4)]);g.strokeStyle='#fff';g.strokeRect(x,y,w,h);g.restore()}
function handle(g,x,y,round){g.save();g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=px(1.5);let r=px(touchy?9:6);g.beginPath();if(round)g.arc(x,y,r,0,7);else g.rect(x-r,y-r,r*2,r*2);g.fill();g.stroke();g.restore()}
function nearPt(p,x,y){return Math.hypot(p.x-x,p.y-y)<px(touchy?22:12)}
function brushCursor(g){if(!hoverPos||touchy||!tool.brush)return;let o=optsOf(tool.id),r=(o.size||10)/2;g.save();g.lineWidth=px(1);g.strokeStyle='#000';g.beginPath();g.arc(hoverPos.x,hoverPos.y,r,0,7);g.stroke();g.strokeStyle='#fff';g.beginPath();g.arc(hoverPos.x,hoverPos.y,r+px(1),0,7);g.stroke();g.restore()}
overlay=g=>{tool&&tool.overlay&&tool.overlay(g);brushCursor(g)};

// ---- Text layers
function fontFamily(f){return /^(system-ui|serif|sans-serif|monospace)$/.test(f)?f:`"${f}"`}
function fontString(t){return (t.italic?'italic ':'')+(t.bold?'bold ':'')+t.size+'px '+fontFamily(t.font)}
function renderText(t){
  let m=mk(1,1),g=g2(m);g.font=fontString(t);let lines=String(t.str||' ').split('\n'),lh=t.size*(t.lh||1.2),pad=Math.ceil(t.size*.25+(t.stroke||0)),w=Math.ceil(Math.max(1,...lines.map(s=>g.measureText(s).width)))+pad*2,h=Math.ceil(lines.length*lh)+pad*2;
  let c=mk(w,h);g=g2(c);g.font=fontString(t);g.textBaseline='middle';g.textAlign=t.align||'left';g.lineJoin='round';let x=t.align==='center'?w/2:t.align==='right'?w-pad:pad;
  lines.forEach((s,i)=>{let y=pad+lh*i+lh/2;if(t.stroke>0){g.lineWidth=t.stroke*2;g.strokeStyle=t.strokeColor||'#000';g.strokeText(s,x,y)}g.fillStyle=t.color;g.globalAlpha=t.alpha??1;g.fillText(s,x,y);g.globalAlpha=1});return c;
}
let textCommitT=0;
function flushText(){if(textCommitT){clearTimeout(textCommitT);textCommitT=0;commit('Edit text')}}
function editText(key,val){let l=layer();if(!l||!l.text)return;l.text={...l.text,[key]:val};l.canvas=renderText(l.text);if(key==='str')l.name=(val.split('\n')[0]||'Text').slice(0,30);render();clearTimeout(textCommitT);textCommitT=setTimeout(()=>{textCommitT=0;commit('Edit text')},700);
  if(key==='font'||key==='bold'||key==='italic'){let id=l.id;document.fonts&&document.fonts.load(fontString(l.text)).then(()=>{let i=layerIndex(id);if(i>=0&&doc.layers[i].text){doc.layers[i].canvas=renderText(doc.layers[i].text);render()}}).catch(()=>{})}}
const FONTS=[['system-ui','System'],['Georgia','Georgia'],['Times New Roman','Times'],['Arial','Arial'],['Helvetica','Helvetica'],['Verdana','Verdana'],['Trebuchet MS','Trebuchet'],['Courier New','Courier'],['Impact','Impact'],['Comic Sans MS','Comic Sans'],...(typeof TEXT_FONTS!=='undefined'?TEXT_FONTS.filter(f=>f.family!=='system-ui').map(f=>[f.family,f.label]):[])];

// ---- Tools
const TOOLS=[
 {id:'move',icon:'✥',name:'Move',key:'m',cursor:'move',opts:[{key:'pick',type:'check',label:'Pick the layer I touch',value:true},{key:'what',type:'seg',label:'Move',value:'layer',options:[['layer','Layer'],['sel','Selection outline']]}],hint:'Drag to move. Arrow keys nudge (Shift = 10 px).',
  down(p){let o=optsOf('move');if(o.what==='sel'){if(!doc.sel)return toast('There is no selection to move.');this.s={p,sel:true};return}
    if(o.pick){for(let i=doc.layers.length-1;i>=0;i--){let L=doc.layers[i],x=Math.floor(p.x-L.x),y=Math.floor(p.y-L.y);if(!L.visible||x<0||y<0||x>=L.canvas.width||y>=L.canvas.height)continue;if(g2(L.canvas).getImageData(x,y,1,1).data[3]>10){if(doc.active!==i){doc.active=i;changed()}break}}}
    let l=layer();this.s={p,l,x:l.x,y:l.y}},
  move(p){let s=this.s;if(!s)return;if(s.sel){antsShift={x:Math.round(p.x-s.p.x),y:Math.round(p.y-s.p.y)};render();return}s.l.x=Math.round(s.x+p.x-s.p.x);s.l.y=Math.round(s.y+p.y-s.p.y);s.moved=true;render()},
  up(){let s=this.s;this.s=null;if(!s)return;if(s.sel){let o=antsShift;antsShift=null;if(o&&(o.x||o.y)){doc.sel=affineMask(doc.sel,[1,0,0,1,o.x,o.y],doc.w,doc.h);selChanged();commit('Move selection')}else render();return}if(s.moved)commit('Move layer')},
  cancel(){let s=this.s;this.s=null;antsShift=null;if(s&&s.l){s.l.x=s.x;s.l.y=s.y}render()}},
 {id:'transform',icon:'⤢',name:'Transform (scale, rotate)',key:'T',shift:true,cursor:'default',opts:[{key:'ratio',type:'check',label:'Keep proportions',value:true}],hint:'Drag a corner to resize, the round handle to rotate (Shift snaps), inside to move. Then Apply. With a selection, the selected part is lifted onto its own layer first.',
  enter(){this.begin()},leave(){this.drop()},
  begin(){if(!doc)return;let l=layer();if(!l)return;
    this.t={id:l.id,cx:l.x+l.canvas.width/2,cy:l.y+l.canvas.height/2,w:l.canvas.width,h:l.canvas.height,sx:1,sy:1,rot:0};this.show()},
  matrix(t){let c=Math.cos(t.rot),s=Math.sin(t.rot);return [c*t.sx,s*t.sx,-s*t.sy,c*t.sy,t.cx-(c*t.sx*t.w/2-s*t.sy*t.h/2),t.cy-(s*t.sx*t.w/2+c*t.sy*t.h/2)]},
  corners(t){let m=this.matrix(t),P=(x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];return [P(0,0),P(t.w,0),P(t.w,t.h),P(0,t.h),P(t.w/2,-Math.max(24,30/zoom)/Math.abs(t.sy||1))]},
  show(){let t=this.t;if(!t)return;let i=layerIndex(t.id);if(i<0){this.t=null;return}preview={id:t.id,canvas:doc.layers[i].canvas,matrix:this.matrix(t)};render()},
  local(p){let t=this.t,dx=p.x-t.cx,dy=p.y-t.cy,c=Math.cos(-t.rot),s=Math.sin(-t.rot);return [dx*c-dy*s,dx*s+dy*c]},
  down(p,e){if(doc.sel){let b=selBounds();if(b&&!(b.x===0&&b.y===0&&b.w===doc.w&&b.h===doc.h)){this.drop();floatSelection(true)}else{doc.sel=null;selChanged()}this.begin()}if(!this.t)this.begin();let t=this.t;if(!t)return;let k=this.corners(t);
    if(nearPt(p,...k[4]))this.d={mode:'rot',a0:Math.atan2(p.y-t.cy,p.x-t.cx)-t.rot};
    else if(k.slice(0,4).some(q=>nearPt(p,...q)))this.d={mode:'scale'};
    else this.d={mode:'move',p,cx:t.cx,cy:t.cy}},
  move(p,e){let t=this.t,d=this.d;if(!t||!d)return;
    if(d.mode==='move'){t.cx=d.cx+p.x-d.p.x;t.cy=d.cy+p.y-d.p.y}
    else if(d.mode==='rot'){let a=Math.atan2(p.y-t.cy,p.x-t.cx)-d.a0;if(e.shiftKey)a=Math.round(a/(Math.PI/12))*Math.PI/12;t.rot=a}
    else{let [lx,ly]=this.local(p),nx=Math.max(1,Math.abs(lx)*2)/t.w*Math.sign(t.sx||1),ny=Math.max(1,Math.abs(ly)*2)/t.h*Math.sign(t.sy||1);if(optsOf('transform').ratio!==e.shiftKey){let s=Math.max(Math.abs(nx),Math.abs(ny));nx=s*Math.sign(nx);ny=s*Math.sign(ny)}t.sx=nx;t.sy=ny}
    this.show()},
  up(){this.d=null},
  overlay(g){let t=this.t;if(!t)return;let k=this.corners(t);g.save();g.lineWidth=px(1.5);g.strokeStyle='#e8a400';g.beginPath();k.slice(0,4).forEach((q,i)=>i?g.lineTo(...q):g.moveTo(...q));g.closePath();g.stroke();
    let mid=[(k[0][0]+k[1][0])/2,(k[0][1]+k[1][1])/2];g.beginPath();g.moveTo(...mid);g.lineTo(...k[4]);g.stroke();g.restore();k.slice(0,4).forEach(q=>handle(g,...q));handle(g,...k[4],true)},
  panel(box){let b=document.createElement('div');b.className='optbtns';b.innerHTML='<button data-a="fh">⇋ Flip</button><button data-a="fv">⇵ Flip</button><button data-a="r">Reset</button>';let a=document.createElement('div');a.className='optbtns';a.innerHTML='<button data-a="x">Cancel</button><button class="primary" data-a="ok">Apply</button>';box.append(b,a);
    box.onclick=e=>{let x=e.target.dataset&&e.target.dataset.a;if(!x)return;if(!this.t)this.begin();let t=this.t;if(!t)return;if(x==='fh')t.sx=-t.sx;if(x==='fv')t.sy=-t.sy;if(x==='r'){this.drop();this.begin();return}if(x==='x'){this.drop();this.begin();return}if(x==='ok')return this.apply();this.show()}},
  apply(){let t=this.t;if(!t)return;let i=layerIndex(t.id);if(i<0)return;let l=doc.layers[i];if(t.sx===1&&t.sy===1&&!t.rot&&t.cx===l.x+t.w/2&&t.cy===l.y+t.h/2){toast('Nothing to apply yet.');return}
    doc.layers[i]=affineLayer({...l,x:0,y:0},this.matrix(t));this.t=null;preview=null;commit('Transform layer');this.begin()},
  drop(){this.t=null;this.d=null;if(preview&&preview.matrix)preview=null;render()},
  cancel(){this.d=null},onLayer(){this.drop();this.begin()},onKey(e){if(e.key==='Enter'){this.apply();return true}}},
 {id:'crop',icon:'⛶',name:'Crop',key:'C',shift:true,cursor:'crosshair',opts:[{key:'ratio',type:'select',label:'Shape',value:'free',options:[['free','Any shape'],['orig','Same as image'],['1','Square 1:1'],['0.8','Portrait 4:5'],['0.5625','Story 9:16'],['1.7778','Wide 16:9'],['1.3333','4:3'],['0.6667','2:3']]}],hint:'Drag over the part to keep, adjust the corners, then Apply (or press Enter / double-tap inside).',
  ratio(){let r=optsOf('crop').ratio;return r==='free'?0:r==='orig'?doc.w/doc.h:+r},
  down(p){let c=this.c;if(c){let hs=this.handles(c),i=hs.findIndex(h=>nearPt(p,h[0],h[1]));if(i>=0){this.d={mode:'h',i,c:{...c}};return}if(p.x>c.x&&p.y>c.y&&p.x<c.x+c.w&&p.y<c.y+c.h){let now=Date.now();if(now-(this.tap||0)<350){this.apply();return}this.tap=now;this.d={mode:'move',p,c:{...c}};return}}this.d={mode:'new',p};this.c=null},
  move(p){let d=this.d;if(!d)return;let r=this.ratio(),cx=clamp(p.x,0,doc.w),cy=clamp(p.y,0,doc.h);
    if(d.mode==='new'){let w=cx-d.p.x,h=cy-d.p.y;if(r){h=Math.sign(h||1)*Math.abs(w)/r}this.c=norm({x:d.p.x,y:d.p.y,w,h})}
    else if(d.mode==='move'){let c=d.c;this.c={...c,x:clamp(c.x+p.x-d.p.x,0,doc.w-c.w),y:clamp(c.y+p.y-d.p.y,0,doc.h-c.h)}}
    else{let c=d.c,x0=c.x,y0=c.y,x1=c.x+c.w,y1=c.y+c.h,i=d.i;if(i===0||i===3)x0=cx;if(i===1||i===2)x1=cx;if(i===0||i===1)y0=cy;if(i===2||i===3)y1=cy;
      if(r){let w=Math.abs(x1-x0),h=w/r;if(i===0||i===1)y0=y1-h*Math.sign(y1-y0||1);else y1=y0+h*Math.sign(y1-y0||1)}this.c=norm({x:x0,y:y0,w:x1-x0,h:y1-y0})}
    render()},
  up(){this.d=null;if(this.c&&(this.c.w<2||this.c.h<2))this.c=null;render();renderOptions()},
  handles(c){return [[c.x,c.y],[c.x+c.w,c.y],[c.x+c.w,c.y+c.h],[c.x,c.y+c.h]]},
  overlay(g){let c=this.c;if(!c)return;g.save();g.fillStyle='#0008';g.beginPath();g.rect(0,0,doc.w,doc.h);g.rect(c.x,c.y,c.w,c.h);g.fill('evenodd');g.strokeStyle='#fff8';g.lineWidth=px(1);g.beginPath();for(let i=1;i<3;i++){g.moveTo(c.x+c.w*i/3,c.y);g.lineTo(c.x+c.w*i/3,c.y+c.h);g.moveTo(c.x,c.y+c.h*i/3);g.lineTo(c.x+c.w,c.y+c.h*i/3)}g.stroke();g.restore();dashedRect(g,c.x,c.y,c.w,c.h);this.handles(c).forEach(h=>handle(g,...h))},
  panel(box){let c=this.c,a=document.createElement('div');a.className='optbtns';a.innerHTML=`<button data-a="x"${c?'':' disabled'}>Clear</button><button class="primary" data-a="ok"${c?'':' disabled'}>Apply crop</button>`;box.appendChild(a);if(c){let p=document.createElement('p');p.className='hint';p.textContent=Math.round(c.w)+' × '+Math.round(c.h)+' px';box.appendChild(p)}
    a.onclick=e=>{let x=e.target.dataset.a;if(x==='x'){this.c=null;render();renderOptions()}if(x==='ok')this.apply()}},
  apply(){let c=this.c;if(!c)return;this.c=null;cropTo(c.x,c.y,c.w,c.h,'Crop');renderOptions()},
  leave(){this.c=null;this.d=null},onOpt(){this.c=null},onKey(e){if(e.key==='Enter'&&this.c){this.apply();return true}if(e.key==='Escape'&&this.c){this.c=null;render();renderOptions();return true}},cancel(){this.d=null}},
 {id:'rect',icon:'⬚',name:'Rectangle select',key:'r',cursor:'crosshair',opts:[SELMODE,FEATHER,{key:'round',type:'range',label:'Rounded corners',min:0,max:200,value:0,unit:' px'},{key:'square',type:'check',label:'Square',value:false}],hint:'Drag to select. Shift adds, Alt takes away. Tap once to select nothing.',
  down(p,e){this.s={p,e,q:p}},move(p){if(this.s){this.s.q=p;render()}},
  box(){let s=this.s,o=optsOf(this.id),w=s.q.x-s.p.x,h=s.q.y-s.p.y;if(o.square){let m=Math.max(Math.abs(w),Math.abs(h));w=m*Math.sign(w||1);h=m*Math.sign(h||1)}return norm({x:s.p.x,y:s.p.y,w,h})},
  shape(g,b,o){if(this.id==='ellipse'){g.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2,b.h/2,0,0,7)}else if(o.round>0&&g.roundRect)g.roundRect(b.x,b.y,b.w,b.h,Math.min(o.round,b.w/2,b.h/2));else g.rect(b.x,b.y,b.w,b.h)},
  up(p,e){let s=this.s;if(!s)return;let b=this.box();this.s=null;let o=optsOf(this.id),mode=selMode(s.e,o);if(b.w<2||b.h<2){if(mode==='replace')selectNone();render();return}
    let m=emptyMask(),g=g2(m);g.fillStyle='#fff';g.beginPath();this.shape(g,b,o);g.fill();finishShape(m,o,s.e,this.id==='ellipse'?'Ellipse select':'Rectangle select')},
  overlay(g){if(!this.s)return;let b=this.box(),o=optsOf(this.id);g.save();g.lineWidth=px(1);g.strokeStyle='#000';g.beginPath();this.shape(g,b,o);g.stroke();g.setLineDash([px(4),px(4)]);g.strokeStyle='#fff';g.stroke();g.restore()},cancel(){this.s=null;render()}},
 {id:'ellipse',icon:'◯',name:'Ellipse select',key:'e',cursor:'crosshair',opts:[SELMODE,FEATHER,{key:'square',type:'check',label:'Circle',value:false}],hint:'Drag to select an oval. Shift adds, Alt takes away.'},
 {id:'lasso',icon:'➰',name:'Free select (lasso)',key:'f',cursor:'crosshair',opts:[SELMODE,FEATHER],hint:'Draw around what you want. Let go to close the shape.',
  down(p,e){this.s={pts:[p],e}},move(p){if(this.s){let l=this.s.pts[this.s.pts.length-1];if(Math.hypot(p.x-l.x,p.y-l.y)>px(2))this.s.pts.push(p);render()}},
  up(){let s=this.s;this.s=null;if(!s)return;let o=optsOf('lasso');if(s.pts.length<3){if(selMode(s.e,o)==='replace')selectNone();render();return}let m=emptyMask(),g=g2(m);g.fillStyle='#fff';g.beginPath();s.pts.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.closePath();g.fill();finishShape(m,o,s.e,'Free select')},
  overlay(g){if(!this.s)return;g.save();g.lineWidth=px(1.5);g.strokeStyle='#000';g.beginPath();this.s.pts.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.stroke();g.setLineDash([px(4),px(4)]);g.strokeStyle='#fff';g.stroke();g.restore()},cancel(){this.s=null;render()}},
 {id:'wand',icon:'🪄',name:'Fuzzy select (magic wand)',key:'u',cursor:'crosshair',opts:[SELMODE,{key:'thr',type:'range',label:'Threshold (how similar)',min:0,max:255,value:32},{key:'merged',type:'check',label:'Look at all layers',value:false},{key:'contig',type:'check',label:'Only touching areas',value:true},FEATHER],hint:'Tap an area to select similar colours next to it.',
  down(p,e){let o=optsOf(this.id),contig=this.id==='bycolor'?false:o.contig;later(()=>{let src=docPixels(o.merged),m=floodMask(readData(src),doc.w,doc.h,p.x,p.y,o.thr,contig);finishShape(m,o,e,this.id==='bycolor'?'Select by colour':'Fuzzy select')},'Selecting…')}},
 {id:'bycolor',icon:'◉',name:'Select by colour',key:'O',shift:true,cursor:'crosshair',opts:[SELMODE,{key:'thr',type:'range',label:'Threshold (how similar)',min:0,max:255,value:32},{key:'merged',type:'check',label:'Look at all layers',value:false},FEATHER],hint:'Tap a colour to select it everywhere in the picture.'},
 {id:'brush',icon:'🖌',name:'Paintbrush',key:'p',brush:true,cursor:'crosshair',opts:[SIZE,HARD,OPAC,MODE,PRESS],hint:'Paint with the foreground colour. [ and ] change the size. Hold Alt to pick a colour.',down(p,e){if(beginStroke('brush',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke('Paintbrush')},cancel:cancelStroke},
 {id:'pencil',icon:'✏',name:'Pencil (hard edge)',key:'n',brush:true,cursor:'crosshair',opts:[{...SIZE,value:4},OPAC,MODE,PRESS],hint:'Hard-edged lines, great for pixel art.',down(p,e){if(beginStroke('pencil',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke('Pencil')},cancel:cancelStroke},
 {id:'air',icon:'💨',name:'Airbrush',key:'a',brush:true,cursor:'crosshair',opts:[{...SIZE,value:60},{...HARD,value:0},{key:'flow',type:'range',label:'Flow',min:1,max:100,value:30,unit:'%'},OPAC,MODE,PRESS],hint:'Builds up colour the longer you hold.',
  down(p,e){if(!beginStroke('air',p,e))return;strokeTo(p,e);let s=stroke;s.timer=setInterval(()=>{if(stroke===s&&s.last){stamp(s.last.x,s.last.y,s.lastSize);queueStroke()}},45)},move:strokeTo,up(){endStroke('Airbrush')},cancel:cancelStroke},
 {id:'eraser',icon:'🧽',name:'Eraser',key:'E',shift:true,brush:true,cursor:'crosshair',opts:[{...SIZE,value:40},HARD,OPAC,PRESS],hint:'Makes pixels see-through.',down(p,e){if(beginStroke('eraser',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke('Eraser')},cancel:cancelStroke},
 {id:'bucket',icon:'🪣',name:'Bucket fill',key:'B',shift:true,cursor:'crosshair',opts:[{key:'what',type:'seg',label:'Fill',value:'similar',options:[['similar','Similar colours'],['all','Whole selection']]},{key:'thr',type:'range',label:'Threshold',min:0,max:255,value:32},{key:'merged',type:'check',label:'Look at all layers',value:false},{key:'contig',type:'check',label:'Only touching areas',value:true},OPAC,MODE],hint:'Tap to fill with the foreground colour.',
  down(p){let l=layer();if(!l)return;let o=optsOf('bucket');later(()=>{let m;
    if(o.what==='all')m=null;else{let src=docPixels(o.merged),dm=floodMask(readData(src),doc.w,doc.h,p.x,p.y,o.thr,o.contig);m=mk(l.canvas.width,l.canvas.height);g2(m).drawImage(dm,-l.x,-l.y)}
    let fill=mk(l.canvas.width,l.canvas.height),fg=g2(fill);fg.fillStyle=colors.fg;fg.fillRect(0,0,fill.width,fill.height);if(m){fg.globalCompositeOperation='destination-in';fg.drawImage(m,0,0)}
    let out=clone(l.canvas),og=g2(out);og.globalAlpha=o.op/100;og.globalCompositeOperation=l.lockAlpha?'source-atop':o.blend;og.drawImage(fill,0,0);l.canvas=clipToSel(l,l.canvas,out);l.text=null;commit('Bucket fill')},'Filling…')}},
 {id:'gradient',icon:'◐',name:'Gradient',key:'g',cursor:'crosshair',opts:[{key:'kind',type:'select',label:'Colours',value:'fgbg',options:[['fgbg','Foreground → background'],['fgclear','Foreground → see-through'],['bgfg','Background → foreground']]},{key:'shape',type:'select',label:'Shape',value:'linear',options:[['linear','Straight line'],['mirror','Mirrored'],['radial','Circle'],['conic','Around a point']]},{key:'rev',type:'check',label:'Reverse',value:false},OPAC,MODE],hint:'Drag where the colours should change.',
  down(p){let l=layer();if(!l)return;this.s={l,id:l.id,p,q:p,base:l.canvas,o:optsOf('gradient')}},
  move(p,e){let s=this.s;if(!s)return;if(e.shiftKey){let a=Math.round(Math.atan2(p.y-s.p.y,p.x-s.p.x)/(Math.PI/12))*Math.PI/12,d=Math.hypot(p.x-s.p.x,p.y-s.p.y);p={x:s.p.x+Math.cos(a)*d,y:s.p.y+Math.sin(a)*d}}s.q=p;preview={id:s.id,canvas:this.result(),x:s.l.x,y:s.l.y};render()},
  result(){let s=this.s,o=s.o,l=s.l,c=mk(l.canvas.width,l.canvas.height),g=g2(c),ax=s.p.x-l.x,ay=s.p.y-l.y,bx=s.q.x-l.x,by=s.q.y-l.y,d=Math.hypot(bx-ax,by-ay)||1,gr;
    if(o.shape==='radial')gr=g.createRadialGradient(ax,ay,0,ax,ay,d);else if(o.shape==='conic'&&g.createConicGradient)gr=g.createConicGradient(Math.atan2(by-ay,bx-ax),ax,ay);else if(o.shape==='mirror')gr=g.createLinearGradient(ax-(bx-ax),ay-(by-ay),bx,by);else gr=g.createLinearGradient(ax,ay,bx,by);
    let [r,gg,b]=hexRgb(colors.fg),A=o.kind==='bgfg'?colors.bg:colors.fg,B=o.kind==='fgclear'?`rgba(${r},${gg},${b},0)`:o.kind==='bgfg'?colors.fg:colors.bg;if(o.rev)[A,B]=[B,A];
    if(o.shape==='mirror'){gr.addColorStop(0,B);gr.addColorStop(.5,A);gr.addColorStop(1,B)}else{gr.addColorStop(0,A);gr.addColorStop(1,B)}g.fillStyle=gr;g.fillRect(0,0,c.width,c.height);
    let out=clone(s.base),og=g2(out);og.globalAlpha=o.op/100;og.globalCompositeOperation=l.lockAlpha?'source-atop':o.blend;og.drawImage(c,0,0);return clipToSel(l,s.base,out)},
  up(){let s=this.s;this.s=null;if(!s)return;preview=null;if(Math.hypot(s.q.x-s.p.x,s.q.y-s.p.y)<2)return render();let i=layerIndex(s.id);if(i<0)return;this.s=s;doc.layers[i].canvas=this.result();this.s=null;doc.layers[i].text=null;commit('Gradient')},
  overlay(g){let s=this.s;if(!s)return;g.save();g.lineWidth=px(2);g.strokeStyle='#fff';g.beginPath();g.moveTo(s.p.x,s.p.y);g.lineTo(s.q.x,s.q.y);g.stroke();g.restore();handle(g,s.p.x,s.p.y,true);handle(g,s.q.x,s.q.y,true)},cancel(){this.s=null;preview=null;render()}},
 {id:'text',icon:'T',name:'Text',key:'t',cursor:'text',opts:[],hint:'Tap the picture to add text. Drag text to move it. Tap other text to edit it.',
  down(p){flushText();let hit=-1;for(let i=doc.layers.length-1;i>=0;i--){let L=doc.layers[i];if(L.text&&L.visible&&p.x>=L.x&&p.y>=L.y&&p.x<=L.x+L.canvas.width&&p.y<=L.y+L.canvas.height){hit=i;break}}
    if(hit>=0){doc.active=hit;let l=layer();this.s={p,l,x:l.x,y:l.y};changed();renderOptions();return}
    let d=this.defaults(),t={str:'Your text',...d},l=newLayer('Your text',1,1);l.text=t;l.canvas=renderText(t);l.x=Math.round(p.x-l.canvas.width/2);l.y=Math.round(p.y-l.canvas.height/2);addLayer(l,'Add text');renderOptions();
    if(touchy)showTab('opts');setTimeout(()=>{let ta=$('txtStr');if(ta){ta.focus();ta.select()}},60)},
  move(p){let s=this.s;if(!s)return;s.l.x=Math.round(s.x+p.x-s.p.x);s.l.y=Math.round(s.y+p.y-s.p.y);s.moved=true;render()},
  up(){let s=this.s;this.s=null;if(s&&s.moved)commit('Move text')},
  defaults(){let d=savedOpts.textDefaults||{};return {font:d.font||'system-ui',size:d.size||Math.max(16,Math.round(Math.min(doc.w,doc.h)/10)),color:colors.fg,bold:!!d.bold,italic:!!d.italic,align:d.align||'left',lh:d.lh||1.2,stroke:d.stroke||0,strokeColor:d.strokeColor||'#000000'}},
  panel(box){let l=layer(),t=l&&l.text;
    if(!t){let p=document.createElement('p');p.className='hint';p.textContent='Tap the picture to add text. Text stays editable until you paint on it or use a filter on it.';box.appendChild(p);return}
    box.innerHTML+=`<label class="opt"><span>Text</span><textarea id="txtStr" rows="3"></textarea></label>
<label class="opt"><span>Font</span><select id="txtFont">${FONTS.map(([v,n])=>`<option value="${esc(v)}">${esc(n)}</option>`).join('')}</select></label>
<label class="opt"><span>Size <b id="txtSizeV"></b></span><input type="range" id="txtSize" min="6" max="600"></label>
<div class="optbtns"><button id="txtB" style="font-weight:800">B</button><button id="txtI" style="font-style:italic">I</button><button data-al="left">⯇</button><button data-al="center">≡</button><button data-al="right">⯈</button></div>
<label class="opt"><span>Colour</span><input type="color" id="txtColor"></label>
<label class="opt"><span>Text see-through <b id="txtAlphaV"></b></span><input type="range" id="txtAlpha" min="0" max="100"></label>
<label class="opt"><span>Line spacing <b id="txtLhV"></b></span><input type="range" id="txtLh" min="0.7" max="3" step="0.05"></label>
<label class="opt"><span>Outline <b id="txtStV"></b></span><input type="range" id="txtSt" min="0" max="40"></label>
<label class="opt"><span>Outline colour</span><input type="color" id="txtStC"></label>`;
    $('txtStr').value=t.str;$('txtFont').value=t.font;$('txtSize').value=t.size;$('txtSizeV').textContent=t.size+' px';$('txtColor').value=t.color;$('txtAlpha').value=Math.round((t.alpha??1)*100);$('txtAlphaV').textContent=Math.round(100-(t.alpha??1)*100)+'%';$('txtLh').value=t.lh;$('txtLhV').textContent=t.lh;$('txtSt').value=t.stroke;$('txtStV').textContent=t.stroke+' px';$('txtStC').value=t.strokeColor;
    const mark=()=>{let T=layer().text;$('txtB').classList.toggle('primary',T.bold);$('txtI').classList.toggle('primary',T.italic);box.querySelectorAll('[data-al]').forEach(b=>b.classList.toggle('primary',b.dataset.al===T.align))};mark();
    const keep=(k,v)=>{editText(k,v);(savedOpts.textDefaults=savedOpts.textDefaults||{})[k]=v;saveOpts()};
    $('txtStr').oninput=e=>editText('str',e.target.value);$('txtFont').onchange=e=>keep('font',e.target.value);
    $('txtSize').oninput=e=>{keep('size',+e.target.value);$('txtSizeV').textContent=e.target.value+' px'};$('txtColor').oninput=e=>editText('color',e.target.value);$('txtAlpha').oninput=e=>{editText('alpha',e.target.value/100);$('txtAlphaV').textContent=(100-e.target.value)+'%'};
    $('txtLh').oninput=e=>{keep('lh',+e.target.value);$('txtLhV').textContent=e.target.value};$('txtSt').oninput=e=>{keep('stroke',+e.target.value);$('txtStV').textContent=e.target.value+' px'};$('txtStC').oninput=e=>keep('strokeColor',e.target.value);
    $('txtB').onclick=()=>{keep('bold',!layer().text.bold);mark()};$('txtI').onclick=()=>{keep('italic',!layer().text.italic);mark()};box.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{keep('align',b.dataset.al);mark()})},
  cancel(){let s=this.s;this.s=null;if(s&&s.moved){s.l.x=s.x;s.l.y=s.y;render()}},onLayer(){renderOptions()},leave(){flushText()}},
 {id:'shapes',icon:'◆',name:'Shapes and lines',key:'s',shift:false,cursor:'crosshair',opts:[{key:'shape',type:'select',label:'Shape',value:'rect',options:[['rect','Rectangle'],['round','Rounded rectangle'],['ellipse','Oval'],['line','Line'],['arrow','Arrow'],['star','Star'],['tri','Triangle']]},{key:'style',type:'seg',label:'Style',value:'fill',options:[['fill','Fill'],['line','Outline'],['both','Both']]},{key:'lw',type:'range',label:'Line width',min:1,max:100,value:6,unit:' px'},{key:'even',type:'check',label:'Same width and height',value:false},OPAC],hint:'Drag to draw. Fill uses the foreground colour; with Both, the outline uses the background colour.',
  down(p){let l=layer();if(!l)return;this.s={l,id:l.id,p,q:p,base:l.canvas,o:optsOf('shapes')}},
  move(p){let s=this.s;if(!s)return;s.q=p;preview={id:s.id,canvas:this.result(),x:s.l.x,y:s.l.y};render()},
  result(){let s=this.s,o=s.o,l=s.l,out=clone(s.base),g=g2(out),x=s.p.x-l.x,y=s.p.y-l.y,w=s.q.x-s.p.x,h=s.q.y-s.p.y;if(o.even&&o.shape!=='line'&&o.shape!=='arrow'){let m=Math.max(Math.abs(w),Math.abs(h));w=m*Math.sign(w||1);h=m*Math.sign(h||1)}
    g.globalAlpha=o.op/100;if(l.lockAlpha)g.globalCompositeOperation='source-atop';g.lineWidth=o.lw;g.lineJoin='round';g.lineCap='round';let line=o.shape==='line'||o.shape==='arrow';
    g.fillStyle=colors.fg;g.strokeStyle=o.style==='both'&&!line?colors.bg:colors.fg;g.beginPath();let b=norm({x,y,w,h});
    if(o.shape==='rect')g.rect(b.x,b.y,b.w,b.h);else if(o.shape==='round'){if(g.roundRect)g.roundRect(b.x,b.y,b.w,b.h,Math.min(b.w,b.h)*.18);else g.rect(b.x,b.y,b.w,b.h)}else if(o.shape==='ellipse')g.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2,b.h/2,0,0,7);
    else if(o.shape==='tri'){g.moveTo(b.x+b.w/2,b.y);g.lineTo(b.x+b.w,b.y+b.h);g.lineTo(b.x,b.y+b.h);g.closePath()}
    else if(o.shape==='star'){for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,r=i%2?.42:1;let px_=b.x+b.w/2+Math.cos(a)*b.w/2*r,py_=b.y+b.h/2+Math.sin(a)*b.h/2*r;i?g.lineTo(px_,py_):g.moveTo(px_,py_)}g.closePath()}
    else{g.moveTo(x,y);g.lineTo(x+w,y+h);if(o.shape==='arrow'){let a=Math.atan2(h,w),k=Math.max(12,o.lw*3.5);g.moveTo(x+w,y+h);g.lineTo(x+w-Math.cos(a-.45)*k,y+h-Math.sin(a-.45)*k);g.moveTo(x+w,y+h);g.lineTo(x+w-Math.cos(a+.45)*k,y+h-Math.sin(a+.45)*k)}}
    if(line||o.style!=='fill')g.stroke();if(!line&&o.style!=='line')g.fill();if(!line&&o.style==='both')g.stroke();return clipToSel(l,s.base,out)},
  up(){let s=this.s;if(!s)return;preview=null;if(Math.hypot(s.q.x-s.p.x,s.q.y-s.p.y)<2){this.s=null;return render()}let i=layerIndex(s.id);if(i>=0){doc.layers[i].canvas=this.result();doc.layers[i].text=null;this.s=null;commit('Draw shape')}this.s=null},cancel(){this.s=null;preview=null;render()}},
 {id:'clone',icon:'⧉',name:'Clone',key:'c',brush:true,cursor:'crosshair',opts:[{...SIZE,value:40},{...HARD,value:40},OPAC,{key:'aligned',type:'check',label:'Aligned (source follows you)',value:true},{key:'merged',type:'check',label:'Copy from all layers',value:false}],hint:'Alt+click (or tap “Set source”, then tap) where to copy from, then paint.',
  down(p,e){if(settingSource||e.altKey||e.ctrlKey||e.metaKey){cloneSrc={x:p.x,y:p.y};cloneFresh=true;settingSource=false;toast('Source set. Now paint where you want the copy.');renderOptions();render();return}
    if(!cloneSrc){toast(touchy?'Tap “Set source” first, then tap where to copy from.':'Alt+click where to copy from first.');return}
    let o=optsOf(this.id);if(!o.aligned||cloneFresh||!cloneOff){cloneOff={x:cloneSrc.x-p.x,y:cloneSrc.y-p.y};cloneFresh=false}
    let s=beginStroke(this.id,p,e);if(!s)return;s.srcDoc=o.merged;s.src=o.merged?flattened():s.base;if(o.merged){cloneOff={...cloneOff}}strokeTo(p,e)},
  move:strokeTo,up(){endStroke(this.name.split(' ')[0])},cancel:cancelStroke,
  overlay(g){let at=stroke&&stroke.last?{x:stroke.last.x+stroke.l.x,y:stroke.last.y+stroke.l.y}:hoverPos;let src=cloneSrc&&at&&cloneOff&&!cloneFresh?{x:at.x+cloneOff.x,y:at.y+cloneOff.y}:cloneSrc;if(!src)return;g.save();g.lineWidth=px(1.5);g.strokeStyle='#fff';g.beginPath();g.moveTo(src.x-px(8),src.y);g.lineTo(src.x+px(8),src.y);g.moveTo(src.x,src.y-px(8));g.lineTo(src.x,src.y+px(8));g.stroke();g.strokeStyle='#000';g.lineWidth=px(.8);g.stroke();g.restore()},
  panel(box){let a=document.createElement('div');a.className='optbtns';a.innerHTML=`<button class="${settingSource?'primary':''}">🎯 Set source</button>`;a.onclick=()=>{settingSource=!settingSource;renderOptions();if(settingSource)toast('Now tap where to copy from.')};box.prepend(a)}},
 {id:'heal',icon:'✚',name:'Heal (fix spots)',key:'h',brush:true,cursor:'crosshair',opts:[{...SIZE,value:30},{...HARD,value:30},OPAC,{key:'aligned',type:'check',label:'Aligned (source follows you)',value:true},{key:'merged',type:'check',label:'Copy from all layers',value:false}],hint:'Like Clone, but blends into the colours around it — good for spots and blemishes. Set a source first.'},
 {id:'smudge',icon:'👆',name:'Smudge',key:'S',shift:true,brush:true,cursor:'crosshair',opts:[{...SIZE,value:30},{...HARD,value:30},RATE],hint:'Push colours around like wet paint.',down(p,e){if(beginStroke('smudge',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke('Smudge')},cancel:cancelStroke},
 {id:'blur',icon:'💧',name:'Blur / Sharpen brush',key:'U',shift:true,brush:true,cursor:'crosshair',opts:[{...SIZE,value:40},{...HARD,value:30},RATE,{key:'sharpen',type:'check',label:'Sharpen instead',value:false}],hint:'Soften (or sharpen) just where you paint.',down(p,e){if(beginStroke('blur',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke(optsOf('blur').sharpen?'Sharpen brush':'Blur brush')},cancel:cancelStroke},
 {id:'dodge',icon:'◑',name:'Dodge / Burn',key:'D',shift:true,brush:true,cursor:'crosshair',opts:[{key:'dodge',type:'seg',label:'Type',value:'dodge',options:[['dodge','Lighten (dodge)'],['burn','Darken (burn)']]},{key:'range',type:'select',label:'Affects',value:'m',options:[['s','Shadows'],['m','Midtones'],['h','Highlights']]},{...SIZE,value:50},{...HARD,value:20},{...RATE,value:30}],hint:'Lighten or darken just where you paint.',down(p,e){if(beginStroke('dodge',p,e))strokeTo(p,e)},move:strokeTo,up(){endStroke(optsOf('dodge').dodge==='burn'?'Burn':'Dodge')},cancel:cancelStroke},
 {id:'picker',icon:'🎨',name:'Colour picker',key:'o',cursor:'crosshair',opts:[{key:'merged',type:'check',label:'Pick from all layers',value:true},{key:'to',type:'seg',label:'Set',value:'fg',options:[['fg','Foreground'],['bg','Background']]}],hint:'Tap to take a colour from the picture.',
  down(p,e){this.pick(p,e);this.on=true},move(p,e){if(this.on)this.pick(p,e)},up(){this.on=false},
  pick(p,e){let o=optsOf('picker'),x=Math.floor(p.x),y=Math.floor(p.y);if(x<0||y<0||x>=doc.w||y>=doc.h)return;let c=mk(1,1,true),g=g2(c);if(o.merged)g.drawImage(comp||flattened(),-x,-y);else{let l=layer();g.drawImage(l.canvas,l.x-x,l.y-y)}let d=g.getImageData(0,0,1,1).data;if(d[3]<5)return;let hex=rgbHex(d[0],d[1],d[2]);setColor(e.ctrlKey||e.metaKey||o.to==='bg'?'bg':'fg',hex);$('stHint').textContent='Picked '+hex}},
 {id:'zoom',icon:'🔍',name:'Zoom',key:'z',cursor:'zoom-in',opts:[{key:'out',type:'check',label:'Zoom out',value:false}],hint:'Tap to zoom in (Alt to zoom out). Pinch or Ctrl+scroll works with any tool.',
  down(p,e){let r=view.getBoundingClientRect(),out=optsOf('zoom').out!==e.altKey;zoomAt(out?.5:2,e.clientX-r.left,e.clientY-r.top)}},
 {id:'hand',icon:'✋',name:'Pan',key:' ',cursor:'grab',opts:[],hint:'Drag to move around. Hold Space with any tool, or use two fingers.'},
];
// Tools that share another tool's behaviour.
for(const [id,from] of [['ellipse','rect'],['bycolor','wand'],['heal','clone']]){let t=TOOLS.find(t=>t.id===id),f=TOOLS.find(t=>t.id===from);for(const k of ['down','move','up','overlay','cancel','box','shape','panel'])if(f[k]&&!t[k])t[k]=f[k]}
function norm(b){let x=b.w<0?b.x+b.w:b.x,y=b.h<0?b.y+b.h:b.y;return {x,y,w:Math.abs(b.w),h:Math.abs(b.h)}}
let tool=null,antsShift=null;
// Selection outline moving with the Move tool: shift the ants while dragging.
const baseDrawAnts=drawAnts;drawAnts=function(g){if(antsShift){g.save();g.translate(antsShift.x*zoom,antsShift.y*zoom);baseDrawAnts(g);g.restore()}else baseDrawAnts(g)};

function setTool(id,force){
  let t=TOOLS.find(t=>t.id===id);if(!t||(tool===t&&!force))return;cancelTool();if(tool&&tool!==t&&tool.leave)tool.leave();
  tool=t;settingSource=false;stage.style.cursor=t.cursor||'crosshair';document.querySelectorAll('#toolgrid button').forEach(b=>b.classList.toggle('on',b.dataset.tool===id));
  if(doc&&t.enter)t.enter();renderOptions();render();$('stHint').textContent=touchy?'':t.hint||'';try{localStorage.setItem('tapshop-photo-tool',id)}catch{}
}
function onActiveLayer(){if(tool&&tool.onLayer)tool.onLayer();renderOptions()}
function renderOptions(){
  let p=$('pane-opts');p.innerHTML='';if(!tool)return;let h=document.createElement('p');h.className='toolhead';h.textContent=tool.icon+'  '+tool.name;p.appendChild(h);
  let o=optsOf(tool.id),box=document.createElement('div');
  for(const f of tool.opts||[]){let lab=document.createElement(f.type==='seg'?'div':'label');lab.className='opt'+(f.type==='check'?' check':'');let span=document.createElement('span');span.textContent=f.label;
    if(f.type==='seg'){let w=document.createElement('div');w.className='optbtns';w.style.margin='0';for(const [v,n] of f.options){let b=document.createElement('button');b.type='button';b.textContent=n;b.style.padding='6px 4px';if(o[f.key]===v)b.classList.add('primary');b.onclick=e=>{e.preventDefault();setOpt(f.key,v);renderOptions()};w.appendChild(b)}lab.append(span,w);box.appendChild(lab);continue}
    let el;if(f.type==='select'){el=document.createElement('select');for(const [v,n] of f.options){let op=document.createElement('option');op.value=v;op.textContent=n;el.appendChild(op)}el.value=o[f.key];el.onchange=()=>setOpt(f.key,el.value)}
    else if(f.type==='check'){el=document.createElement('input');el.type='checkbox';el.checked=!!o[f.key];el.onchange=()=>setOpt(f.key,el.checked)}
    else{el=document.createElement('input');el.type='range';el.min=f.min;el.max=f.max;el.step=f.step||1;el.value=o[f.key];let b=document.createElement('b');b.textContent=o[f.key]+(f.unit||'');span.appendChild(b);el.oninput=()=>{b.textContent=el.value+(f.unit||'');setOpt(f.key,+el.value)}}
    if(f.type==='check')lab.append(el,span);else lab.append(span,el);box.appendChild(lab)}
  p.appendChild(box);if(tool.panel)tool.panel(box);
  if(tool.hint){let n=document.createElement('p');n.className='hint';n.textContent=tool.hint;p.appendChild(n)}
}
function buildToolbox(){let g=$('toolgrid');g.innerHTML='';for(const t of TOOLS){let b=document.createElement('button');b.dataset.tool=t.id;b.textContent=t.icon;let k=t.key===' '?'Space':(t.shift?'Shift+':'')+t.key.toUpperCase();b.title=t.name+' ('+k+')';b.setAttribute('aria-label',t.name);b.onclick=()=>{setTool(t.id);if(!touchy)showTab('opts')};g.appendChild(b)}}

// ---- Pointer handling on the stage
let pointers=new Map(),gest=null,pan=null,spaceDown=false,active=null;
function cancelTool(){flushText();if(active){active=null;tool&&tool.cancel&&tool.cancel()}}
function startGesture(){let [a,b]=[...pointers.values()];gest={d:Math.hypot(a.x-b.x,a.y-b.y)||1,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,zoom,panX,panY}}
stage.addEventListener('pointerdown',e=>{
  if(!doc)return;closeMenu();try{stage.setPointerCapture(e.pointerId)}catch{}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){cancelTool();pan=null;startGesture();return}if(pointers.size>2)return;
  if(e.button===1||spaceDown||tool.id==='hand'||(dialogOpen()&&preview)){pan={x:e.clientX,y:e.clientY,panX,panY};stage.style.cursor='grabbing';return}
  if(e.button!==0)return;
  if(e.altKey&&tool.brush&&!['clone','heal'].includes(tool.id)){TOOLS.find(t=>t.id==='picker').pick(toDoc(e),{ctrlKey:false});return}
  active={id:e.pointerId};tool.down&&tool.down(toDoc(e),e);
});
stage.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gest&&pointers.size===2){let [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,r=stage.getBoundingClientRect(),nz=clamp(gest.zoom*d/gest.d,.01,32);
    let sx=gest.cx-r.left,sy=gest.cy-r.top;panX=(cx-r.left)-(sx-gest.panX)*nz/gest.zoom;panY=(cy-r.top)-(sy-gest.panY)*nz/gest.zoom;zoom=nz;render();return}
  if(pan){panX=pan.panX+e.clientX-pan.x;panY=pan.panY+e.clientY-pan.y;render();return}
  let p=toDoc(e);$('stPos').textContent=doc?Math.floor(p.x)+', '+Math.floor(p.y):'';
  if(active&&active.id===e.pointerId){let evs=e.getCoalescedEvents?e.getCoalescedEvents():[];if(evs.length>1&&tool.brush){for(const ev of evs)tool.move&&tool.move(toDoc(ev),ev)}else tool.move&&tool.move(p,e)}
  if(e.pointerType==='mouse'){hoverPos=p;if(tool&&(tool.brush||tool.id==='clone'||tool.id==='heal'))render()}
});
function pointerEnd(e,cancelled){
  pointers.delete(e.pointerId);
  if(gest){if(pointers.size<2)gest=null;return}
  if(pan){pan=null;stage.style.cursor=tool.cursor||'crosshair';return}
  if(active&&active.id===e.pointerId){active=null;if(cancelled)tool.cancel&&tool.cancel();else tool.up&&tool.up(toDoc(e),e)}
}
stage.addEventListener('pointerup',e=>pointerEnd(e,false));stage.addEventListener('pointercancel',e=>pointerEnd(e,true));
stage.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hoverPos=null;render()}});
stage.addEventListener('wheel',e=>{if(!doc)return;e.preventDefault();let r=stage.getBoundingClientRect();if(e.ctrlKey||e.metaKey){zoomAt(Math.exp(-e.deltaY*.01),e.clientX-r.left,e.clientY-r.top)}else{panX-=e.shiftKey?e.deltaY:e.deltaX;panY-=e.shiftKey?0:e.deltaY;render()}},{passive:false});
stage.addEventListener('contextmenu',e=>e.preventDefault());
// iOS Safari pinch on the page itself
['gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));

// ---- Edit actions
let clip=null;// {canvas, x, y}
function selectedPixels(l,merged){let src=merged?{canvas:flattened(),x:0,y:0}:l;let b=doc.sel?selBounds():{x:src.x,y:src.y,w:src.canvas.width,h:src.canvas.height};if(!b)return null;
  let c=mk(b.w,b.h),g=g2(c);g.drawImage(src.canvas,src.x-b.x,src.y-b.y);if(doc.sel){g.globalCompositeOperation='destination-in';g.drawImage(doc.sel,-b.x,-b.y)}return {canvas:c,x:b.x,y:b.y}}
function copySel(merged){let l=layer();if(!l)return;let p=selectedPixels(l,merged);if(!p)return toast('Nothing selected.');clip=p;toast(merged?'Copied what you see':'Copied');
  try{if(navigator.clipboard&&window.ClipboardItem)p.canvas.toBlob(b=>{if(b)navigator.clipboard.write([new ClipboardItem({'image/png':b})]).catch(()=>{})},'image/png')}catch{}}
function clearSel(label='Clear'){let l=layer();if(!l)return;let out=clone(l.canvas),g=g2(out);if(doc.sel){g.globalCompositeOperation='destination-out';g.drawImage(doc.sel,-l.x,-l.y)}else g.clearRect(0,0,out.width,out.height);l.canvas=out;l.text=null;commit(label)}
function cutSel(){copySel(false);clearSel('Cut')}
function pasteCanvas(c,x,y,label='Paste'){if(!doc){docFromImage(c,'Pasted image');return}let l=newLayer('Pasted',c.width,c.height);g2(l.canvas).drawImage(c,0,0);l.x=x===undefined?Math.round((doc.w-c.width)/2):x;l.y=y===undefined?Math.round((doc.h-c.height)/2):y;addLayer(l,label);if(tool.id!=='move')setTool('move')}
function pasteClip(){if(clip)return pasteCanvas(clip.canvas,clip.x,clip.y);if(navigator.clipboard&&navigator.clipboard.read){navigator.clipboard.read().then(async items=>{for(const it of items){let t=it.types.find(t=>t.startsWith('image/'));if(t){let bm=await createImageBitmap(await it.getType(t));let c=mk(bm.width,bm.height);g2(c).drawImage(bm,0,0);return pasteCanvas(c)}}toast('There is no picture to paste.')}).catch(()=>toast('There is no picture to paste.'))}else toast('Copy something first.')}
function fillSel(which){let l=layer();if(!l)return;let out=clone(l.canvas),g=g2(out),f=mk(out.width,out.height),fg=g2(f);fg.fillStyle=colors[which];fg.fillRect(0,0,f.width,f.height);if(l.lockAlpha)g.globalCompositeOperation='source-atop';g.drawImage(f,0,0);l.canvas=clipToSel(l,l.canvas,out);l.text=null;commit(which==='fg'?'Fill with foreground':'Fill with background')}
function strokeSel(){if(!doc.sel)return toast('Make a selection first.');openDialog({title:'Stroke selection',fields:[{key:'w',type:'range',label:'Line width',min:1,max:100,value:4,unit:' px'}],ok:v=>later(()=>{let l=layer(),b=blurCanvas(doc.sel,Math.max(.5,v.w/3.6)),band=thresholdMask(b,24),inner=thresholdMask(b,231),bg=g2(band);bg.globalCompositeOperation='destination-out';bg.drawImage(inner,0,0);
  let f=mk(doc.w,doc.h),fg=g2(f);fg.fillStyle=colors.fg;fg.fillRect(0,0,doc.w,doc.h);fg.globalCompositeOperation='destination-in';fg.drawImage(band,0,0);let out=clone(l.canvas),og=g2(out);og.drawImage(f,-l.x,-l.y);l.canvas=out;l.text=null;commit('Stroke selection')})})}
// Lifts the selected part of the active layer onto its own layer.
function floatSelection(cut){let l=layer();if(!l||!doc.sel)return toast('Make a selection first.');let p=selectedPixels(l,false);if(!p)return;
  if(cut){let out=clone(l.canvas),g=g2(out);g.globalCompositeOperation='destination-out';g.drawImage(doc.sel,-l.x,-l.y);l.canvas=out;l.text=null}
  let n=newLayer(cut?'Floating selection':'Selection copy',1,1);n.canvas=p.canvas;n.x=p.x;n.y=p.y;doc.sel=null;selChanged();addLayer(n,cut?'Cut to new layer':'Copy to new layer')}

// ---- Keyboard shortcuts
document.addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  let mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(e.key===' '&&!spaceDown){spaceDown=true;stage.style.cursor='grab';e.preventDefault();return}
  if(!doc){if(mod&&k==='o'){e.preventDefault();$('fileIn').click()}return}
  if(tool&&tool.onKey&&!mod&&tool.onKey(e)){e.preventDefault();return}
  if(mod){const map={z:e.shiftKey?redo:undo,y:redo,a:e.shiftKey?selectNone:selectAll,i:selectInvert,c:()=>copySel(e.shiftKey),x:cutSel,v:pasteClip,',':()=>fillSel('fg'),'.':()=>fillSel('bg'),e:()=>openExport(),d:duplicateLayer,n:e.shiftKey?newLayerDialog:showStart,o:()=>$('fileIn').click(),j:e.shiftKey?fitView:null};let f=map[k];if(f){e.preventDefault();f()}return}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSel();return}
  if(e.key==='Escape'){if(dialogOpen())return;closeMenu();cancelTool();return}
  if(e.key.startsWith('Arrow')&&tool.id==='move'){e.preventDefault();let l=layer(),n=e.shiftKey?10:1;l.x+=e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0;l.y+=e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0;render();clearTimeout(nudgeT);nudgeT=setTimeout(()=>commit('Move layer'),400);return}
  if(e.key==='['||e.key===']'){let o=optsOf(tool.id);if(o.size){setOpt('size',clamp(Math.round(o.size*(e.key===']'?1.15:1/1.15)+(e.key===']'?1:-1)),1,500));renderOptions()}return}
  if(e.key==='+'||e.key==='='){zoomAt(1.25);return}if(e.key==='-'){zoomAt(.8);return}if(e.key==='1'){zoomTo(1);return}
  if(k==='x'&&!e.shiftKey){swapColors();return}if(k==='d'&&!e.shiftKey){resetColors();return}
  let t=TOOLS.find(t=>t.key!==' '&&t.key.toLowerCase()===k&&!!t.shift===e.shiftKey);if(t)setTool(t.id);
});
let nudgeT=0;
document.addEventListener('keyup',e=>{if(e.key===' '){spaceDown=false;if(tool)stage.style.cursor=tool.cursor||'crosshair'}});

function onRestore(){if(tool&&tool.onLayer)tool.onLayer();else renderOptions()}
