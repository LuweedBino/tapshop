// Photo Lab colours, filters and image/layer transforms. All pixel work is plain JS on
// ImageData (or canvas drawing), because Safari's canvas `filter` can't be relied on.
// Adjustments preview on a smaller copy of big layers, then run full size on OK.

// ---- Pixel helpers
function readData(c){return g2(c).getImageData(0,0,c.width,c.height)}
function dataCanvas(id){let c=mk(id.width,id.height);g2(c).putImageData(id,0,0);return c}
function scaledCopy(c,s){let n=mk(c.width*s,c.height*s),g=g2(n);g.imageSmoothingQuality='high';g.drawImage(c,0,0,n.width,n.height);return n}
function maskBlend(before,after,mask){let a=clone(after),ag=g2(a);ag.globalCompositeOperation='destination-in';ag.drawImage(mask,0,0,a.width,a.height);let o=clone(before),og=g2(o);og.globalCompositeOperation='destination-out';og.drawImage(mask,0,0,o.width,o.height);og.globalCompositeOperation='lighter';og.drawImage(a,0,0);return o}
function gaussRadii(sigma){let n=3,wi=Math.sqrt(12*sigma*sigma/n+1),wl=Math.floor(wi);if(wl%2===0)wl--;let m=Math.round((12*sigma*sigma-n*wl*wl-4*n*wl-3*n)/(-4*wl-4));return [0,1,2].map(i=>((i<m?wl:wl+2)-1)/2)}
function boxH(s,t,w,h,r){const k=1/(2*r+1),W=w-1;for(let y=0;y<h;y++){const row=y*w*4;let a=0,b=0,c=0,d=0;for(let j=-r;j<=r;j++){const i=row+(j<0?0:j>W?W:j)*4;a+=s[i];b+=s[i+1];c+=s[i+2];d+=s[i+3]}
  for(let x=0;x<w;x++){const o=row+x*4;t[o]=a*k;t[o+1]=b*k;t[o+2]=c*k;t[o+3]=d*k;const ad=row+(x+r+1>W?W:x+r+1)*4,rm=row+(x-r<0?0:x-r)*4;a+=s[ad]-s[rm];b+=s[ad+1]-s[rm+1];c+=s[ad+2]-s[rm+2];d+=s[ad+3]-s[rm+3]}}}
function boxV(s,t,w,h,r){const k=1/(2*r+1),H=h-1,st=w*4;for(let x=0;x<w;x++){const col=x*4;let a=0,b=0,c=0,d=0;for(let j=-r;j<=r;j++){const i=(j<0?0:j>H?H:j)*st+col;a+=s[i];b+=s[i+1];c+=s[i+2];d+=s[i+3]}
  for(let y=0;y<h;y++){const o=y*st+col;t[o]=a*k;t[o+1]=b*k;t[o+2]=c*k;t[o+3]=d*k;const ad=(y+r+1>H?H:y+r+1)*st+col,rm=(y-r<0?0:y-r)*st+col;a+=s[ad]-s[rm];b+=s[ad+1]-s[rm+1];c+=s[ad+2]-s[rm+2];d+=s[ad+3]-s[rm+3]}}}
// Gaussian blur (three box passes), premultiplied so see-through edges don't go dark.
function blurData(id,sigma){
  if(sigma<.3)return id;const {width:w,height:h,data:d}=id,n=w*h;let a=new Float32Array(n*4),b=new Float32Array(n*4);
  for(let i=0;i<n;i++){let al=d[i*4+3]/255;a[i*4]=d[i*4]*al;a[i*4+1]=d[i*4+1]*al;a[i*4+2]=d[i*4+2]*al;a[i*4+3]=d[i*4+3]}
  for(const r of gaussRadii(sigma)){if(r<1)continue;boxH(a,b,w,h,r);boxV(b,a,w,h,r)}
  for(let i=0;i<n;i++){let al=a[i*4+3];d[i*4+3]=al;if(al>.5){let k=255/al;d[i*4]=a[i*4]*k;d[i*4+1]=a[i*4+1]*k;d[i*4+2]=a[i*4+2]*k}}
  return id;
}
function blurCanvas(c,sigma){return dataCanvas(blurData(readData(c),sigma))}
function lum(r,g,b){return .2126*r+.7152*g+.0722*b}
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;let mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0;if(mx!==mn){let d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return [h,s,l]}
function hue2(p,q,t){if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p}
function hsl2rgb(h,s,l){if(!s){let v=l*255;return [v,v,v]}let q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return [hue2(p,q,h+1/3)*255,hue2(p,q,h)*255,hue2(p,q,h-1/3)*255]}
function perPixel(id,f){const d=id.data;for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;let o=f(d[i],d[i+1],d[i+2],d[i+3]);d[i]=o[0];d[i+1]=o[1];d[i+2]=o[2];if(o.length>3)d[i+3]=o[3]}return id}
function lut(id,lr,lg,lb){const d=id.data;lg=lg||lr;lb=lb||lr;for(let i=0;i<d.length;i+=4){d[i]=lr[d[i]];d[i+1]=lg[d[i+1]];d[i+2]=lb[d[i+2]]}return id}
function makeLut(f){let t=new Uint8ClampedArray(256);for(let i=0;i<256;i++)t[i]=f(i);return t}

// ---- The adjustment runner: preview while the dialog is open, full size on OK.
// fn(imageData, values, scale, layer) changes pixels, or with opts.canvas fn(canvas, values, scale)
// returns a canvas (or {canvas, ox, oy} when the layer grows, like a drop shadow).
function adjust(title,fields,fn,opts={}){
  let l=layer();if(!l)return toast('Open an image first.');
  if(!l.visible)toast('This layer is hidden.');
  const area=l.canvas.width*l.canvas.height,s=area>1.2e6?Math.sqrt(1.2e6/area):1;
  const small=s<1?scaledCopy(l.canvas,s):l.canvas,sx=l.canvas.width/small.width,sy=l.canvas.height/small.height;
  const smallMask=doc.sel&&!opts.noSel?(m=>s<1?scaledCopy(m,s):m)(maskFor(l)):null;
  let base=opts.canvas?null:readData(small),id=l.id;
  const run=(src,data,v,scale)=>{
    if(opts.canvas){let r=fn(src,v,scale,l);return r.canvas?r:{canvas:r,ox:0,oy:0}}
    let copy=new ImageData(new Uint8ClampedArray(data.data),data.width,data.height);fn(copy,v,scale,l);return {canvas:dataCanvas(copy),ox:0,oy:0};
  };
  fields=[...fields,{key:'preview',type:'check',label:'Preview',value:true}];
  openDialog({title,fields,
    onChange:v=>{if(!v.preview||layerIndex(id)<0){preview=null;return render()}
      let r=run(small,base,v,s),c=r.canvas;if(smallMask&&!r.ox&&!r.oy&&c.width===small.width)c=maskBlend(small,c,smallMask);
      preview={id,canvas:c,matrix:[sx,0,0,sy,l.x+r.ox*sx,l.y+r.oy*sy]};render()},
    cancel:()=>{preview=null;render()},
    ok:v=>later(()=>{preview=null;let i=layerIndex(id);if(i<0)return;let L=doc.layers[i],r=run(L.canvas,opts.canvas?null:readData(L.canvas),v,1);
      let c=r.canvas;if(!r.ox&&!r.oy&&c.width===L.canvas.width&&c.height===L.canvas.height)c=opts.noSel?c:clipToSel(L,L.canvas,c);
      L.canvas=c;L.x+=r.ox;L.y+=r.oy;L.text=null;commit(title)},'Applying…')});
}
// One-click versions (no dialog).
function quick(title,fn){let l=layer();if(!l)return;later(()=>{let id=readData(l.canvas);fn(id,l);l.canvas=clipToSel(l,l.canvas,dataCanvas(id));l.text=null;commit(title)})}

// ---- Colours
function brightnessContrast(){adjust('Brightness and contrast',[{key:'b',type:'range',label:'Brightness',min:-100,max:100,value:0},{key:'c',type:'range',label:'Contrast',min:-100,max:100,value:0}],
  (id,v)=>{let cf=Math.tan((v.c/100+1)*Math.PI/4),b=v.b*1.28;let t=makeLut(x=>(x-128)*cf+128+b);lut(id,t)})}
function hueSaturation(){adjust('Hue and saturation',[{key:'h',type:'range',label:'Hue',min:-180,max:180,value:0,unit:'°'},{key:'s',type:'range',label:'Saturation',min:-100,max:100,value:0},{key:'l',type:'range',label:'Lightness',min:-100,max:100,value:0}],
  (id,v)=>{let dh=v.h/360,ds=v.s/100,dl=v.l/100;perPixel(id,(r,g,b)=>{let [h,s,l]=rgb2hsl(r,g,b);h=(h+dh+1)%1;s=clamp(ds>0?s+(1-s)*ds:s*(1+ds),0,1);l=clamp(dl>0?l+(1-l)*dl:l*(1+dl),0,1);return hsl2rgb(h,s,l)})})}
function levels(){adjust('Levels',[{key:'ch',type:'select',label:'Channel',value:'v',options:[['v','All (value)'],['r','Red'],['g','Green'],['b','Blue']]},{key:'lo',type:'range',label:'Input shadows',min:0,max:254,value:0},{key:'hi',type:'range',label:'Input highlights',min:1,max:255,value:255},{key:'gm',type:'range',label:'Midtones (gamma)',min:.1,max:3,step:.01,value:1},{key:'olo',type:'range',label:'Output shadows',min:0,max:255,value:0},{key:'ohi',type:'range',label:'Output highlights',min:0,max:255,value:255}],
  (id,v)=>{let hi=Math.max(v.hi,v.lo+1),t=makeLut(x=>{let n=clamp((x-v.lo)/(hi-v.lo),0,1);n=Math.pow(n,1/v.gm);return v.olo+n*(v.ohi-v.olo)}),same=makeLut(x=>x);lut(id,v.ch==='v'||v.ch==='r'?t:same,v.ch==='v'||v.ch==='g'?t:same,v.ch==='v'||v.ch==='b'?t:same)})}
// Curves: points on a 256×256 graph, drawn and dragged in the dialog; smooth (monotone) between them.
function curveLut(pts){pts=[...pts].sort((a,b)=>a[0]-b[0]);let n=pts.length,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);if(n<2)return makeLut(x=>x);
  let d=[],m=[];for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/((xs[i+1]-xs[i])||1));m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(let i=0;i<n-1;i++){if(!d[i]){m[i]=m[i+1]=0;continue}let a=m[i]/d[i],b=m[i+1]/d[i],s=a*a+b*b;if(s>9){let t=3/Math.sqrt(s);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
  return makeLut(x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;let h=xs[i+1]-xs[i]||1,t=(x-xs[i])/h,t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1]})}
function curves(){
  let pts={v:[[0,0],[255,255]],r:[[0,0],[255,255]],g:[[0,0],[255,255]],b:[[0,0],[255,255]]},chan='v',cv,inputs;
  adjust('Curves',[{key:'ch',type:'select',label:'Channel',value:'v',options:[['v','All (value)'],['r','Red'],['g','Green'],['b','Blue']]},{key:'note',type:'note',label:'Drag the line to bend it. Tap to add a point, drag a point off the edge to remove it.'},{key:'k',type:'text',label:'',value:''}],
    (id,v)=>{let k=JSON.parse(v.k||'null')||pts,t=curveLut(k.v),same=makeLut(x=>x);let R=curveLut(k.r),G=curveLut(k.g),B=curveLut(k.b);lut(id,makeLut(x=>t[R[x]]),makeLut(x=>t[G[x]]),makeLut(x=>t[B[x]]));void same});
  // Turn the hidden text field into the graph.
  let d=$('dlg'),txt=d.querySelector('input[type=text]');if(!txt)return;let lab=txt.closest('label');lab.style.display='none';
  let sel=d.querySelector('select');cv=document.createElement('canvas');cv.width=256;cv.height=256;cv.style.cssText='width:100%;aspect-ratio:1;border:1px solid var(--line);border-radius:8px;touch-action:none;background:var(--soft)';lab.after(cv);
  const push=()=>{txt.value=JSON.stringify(pts);txt.dispatchEvent(new Event('input',{bubbles:true}))};
  const drawC=()=>{let g=g2(cv);g.clearRect(0,0,256,256);g.strokeStyle='#8888';g.lineWidth=1;for(let i=1;i<4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,256);g.moveTo(0,i*64);g.lineTo(256,i*64);g.stroke()}
    let t=curveLut(pts[chan]);g.strokeStyle={v:'#888',r:'#e33',g:'#2a2',b:'#36f'}[chan];g.lineWidth=2;g.beginPath();for(let x=0;x<256;x++){let y=255-t[x];x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
    g.fillStyle=g.strokeStyle;for(const [x,y] of pts[chan]){g.beginPath();g.arc(x,255-y,5,0,7);g.fill()}};
  sel.addEventListener('change',()=>{chan=sel.value;drawC()});
  let drag=-1;const pos=e=>{let r=cv.getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width*256,0,255),clamp(255-(e.clientY-r.top)/r.height*256,0,255),(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]};
  cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);let [x,y]=pos(e),P=pts[chan];drag=P.findIndex(p=>Math.hypot(p[0]-x,p[1]-y)<14);if(drag<0){P.push([Math.round(x),Math.round(y)]);P.sort((a,b)=>a[0]-b[0]);drag=P.findIndex(p=>p[0]===Math.round(x)&&p[1]===Math.round(y))}drawC();push()};
  cv.onpointermove=e=>{if(drag<0)return;let [x,y,fx,fy]=pos(e),P=pts[chan];if((fx<-.1||fx>1.1||fy<-.1||fy>1.1)&&P.length>2&&drag>0&&drag<P.length-1){P.splice(drag,1);drag=-1}else{let lo=drag>0?P[drag-1][0]+1:0,hi=drag<P.length-1?P[drag+1][0]-1:255;P[drag]=[clamp(Math.round(x),lo,hi),Math.round(y)]}drawC();push()};
  cv.onpointerup=()=>{drag=-1};drawC();
}
function colorBalance(){adjust('Colour balance',[{key:'rng',type:'select',label:'Adjust',value:'m',options:[['s','Shadows'],['m','Midtones'],['h','Highlights']]},{key:'cr',type:'range',label:'Cyan ↔ Red',min:-100,max:100,value:0},{key:'mg',type:'range',label:'Magenta ↔ Green',min:-100,max:100,value:0},{key:'yb',type:'range',label:'Yellow ↔ Blue',min:-100,max:100,value:0},{key:'keep',type:'check',label:'Keep brightness',value:true}],
  (id,v)=>{const w=x=>{let l=x/255;return v.rng==='s'?clamp(1-l*2.2,0,1):v.rng==='h'?clamp(l*2.2-1.2,0,1):clamp(1-Math.abs(l-.5)*2.4,0,1)};
    perPixel(id,(r,g,b)=>{let L=lum(r,g,b),k=w(L)*.6,nr=r+v.cr*k,ng=g+v.mg*k,nb=b+v.yb*k;if(v.keep){let d=L-lum(nr,ng,nb);nr+=d;ng+=d;nb+=d}return [nr,ng,nb]})})}
function colorize(){adjust('Colourise',[{key:'h',type:'range',label:'Hue',min:0,max:360,value:30,unit:'°'},{key:'s',type:'range',label:'Saturation',min:0,max:100,value:50},{key:'l',type:'range',label:'Lightness',min:-100,max:100,value:0}],
  (id,v)=>perPixel(id,(r,g,b)=>{let L=lum(r,g,b)/255;L=v.l>0?L+(1-L)*v.l/100:L*(1+v.l/100);return hsl2rgb(v.h/360,v.s/100,L)}))}
function exposure(){adjust('Exposure',[{key:'e',type:'range',label:'Exposure (stops)',min:-3,max:3,step:.05,value:0},{key:'o',type:'range',label:'Black level',min:-50,max:50,value:0},{key:'g',type:'range',label:'Gamma',min:.3,max:3,step:.01,value:1}],
  (id,v)=>{let m=Math.pow(2,v.e);lut(id,makeLut(x=>{let n=x/255;n=Math.pow(Math.max(0,n*m+v.o/255),1/v.g);return n*255}))})}
function temperature(){adjust('Temperature and tint',[{key:'t',type:'range',label:'Cooler ↔ Warmer',min:-100,max:100,value:0},{key:'n',type:'range',label:'Green ↔ Magenta',min:-100,max:100,value:0}],
  (id,v)=>{let r=makeLut(x=>x+v.t*.45+v.n*.2),g=makeLut(x=>x-v.n*.4),b=makeLut(x=>x-v.t*.45+v.n*.2);lut(id,r,g,b)})}
function vibrance(){adjust('Vibrance',[{key:'v',type:'range',label:'Vibrance',min:-100,max:100,value:25},{key:'s',type:'range',label:'Saturation',min:-100,max:100,value:0}],
  (id,v)=>perPixel(id,(r,g,b)=>{let mx=Math.max(r,g,b),avg=(r+g+b)/3,amt=(mx-avg)/255,k=1+v.s/100+(v.v/100)*(1-amt*2.5)*(v.v>0?1:.6);let L=lum(r,g,b);return [L+(r-L)*k,L+(g-L)*k,L+(b-L)*k]}))}
function threshold(){adjust('Threshold',[{key:'lo',type:'range',label:'Low',min:0,max:255,value:127},{key:'hi',type:'range',label:'High',min:0,max:255,value:255}],(id,v)=>perPixel(id,(r,g,b)=>{let L=lum(r,g,b),o=L>=v.lo&&L<=v.hi?255:0;return [o,o,o]}))}
function posterize(){adjust('Posterise',[{key:'n',type:'range',label:'Levels',min:2,max:32,value:4}],(id,v)=>{let k=255/(v.n-1);lut(id,makeLut(x=>Math.round(Math.round(x/k)*k)))})}
function desaturate(){adjust('Desaturate',[{key:'m',type:'select',label:'Shade by',value:'lum',options:[['lum','Luminance'],['avg','Average'],['light','Lightness'],['red','Red only (punchy skies)']]}],(id,v)=>perPixel(id,(r,g,b)=>{let o=v.m==='avg'?(r+g+b)/3:v.m==='light'?(Math.max(r,g,b)+Math.min(r,g,b))/2:v.m==='red'?r:lum(r,g,b);return [o,o,o]}))}
function invertColors(){quick('Invert colours',id=>perPixel(id,(r,g,b)=>[255-r,255-g,255-b]))}
function sepia(){adjust('Sepia',[{key:'a',type:'range',label:'Strength',min:0,max:100,value:100}],(id,v)=>{let k=v.a/100;perPixel(id,(r,g,b)=>{let sr=r*.393+g*.769+b*.189,sg=r*.349+g*.686+b*.168,sb=r*.272+g*.534+b*.131;return [r+(sr-r)*k,g+(sg-g)*k,b+(sb-b)*k]})})}
// Stretch each channel to the full range, ignoring the outermost 0.05% (like GIMP's White balance).
function autoLevels(perChannel){quick(perChannel?'White balance':'Stretch contrast',id=>{let d=id.data,hs=[0,1,2].map(()=>new Uint32Array(256)),n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<8)continue;n++;hs[0][d[i]]++;hs[1][d[i+1]]++;hs[2][d[i+2]]++}if(!n)return;
  let cut=n*.0005,lims=hs.map(h=>{let lo=0,hi=255,s=0;while(lo<255&&(s+=h[lo])<=cut)lo++;s=0;while(hi>0&&(s+=h[hi])<=cut)hi--;return [lo,Math.max(hi,lo+1)]});
  if(!perChannel){let lo=Math.min(...lims.map(l=>l[0])),hi=Math.max(...lims.map(l=>l[1]));lims=[[lo,hi],[lo,hi],[lo,hi]]}
  let t=lims.map(([lo,hi])=>makeLut(x=>(x-lo)*255/(hi-lo)));lut(id,t[0],t[1],t[2])})}
function colorToAlpha(){adjust('Colour to transparent',[{key:'c',type:'color',label:'Colour to remove',value:colors.bg},{key:'note',type:'note',label:'Turns this colour see-through and softens it out of the colours around it — great for removing a white background.'}],
  (id,v)=>{let [cr,cg,cb]=hexRgb(v.c);perPixel(id,(r,g,b,a)=>{const ch=(c,k)=>c>k?(c-k)/(255-k||1):c<k?(k-c)/(k||1):0;let al=Math.max(ch(r,cr),ch(g,cg),ch(b,cb));if(al<=0)return [r,g,b,0];return [(r-cr)/al+cr,(g-cg)/al+cg,(b-cb)/al+cb,a*al]})})}

// ---- Filters
function gaussianBlur(){adjust('Gaussian blur',[{key:'r',type:'range',label:'Size',min:0,max:100,step:.5,value:5,unit:' px'}],(id,v,s)=>blurData(id,v.r*s/2))}
function motionBlur(){adjust('Motion blur',[{key:'len',type:'range',label:'Length',min:1,max:200,value:20,unit:' px'},{key:'ang',type:'range',label:'Angle',min:0,max:180,value:0,unit:'°'}],(c,v,s)=>{
  let L=v.len*s,n=Math.min(64,Math.max(2,Math.ceil(L))),o=mk(c.width,c.height),g=g2(o),a=v.ang*Math.PI/180;
  for(let i=0;i<n;i++){let t=(i/(n-1)-.5)*L;g.globalAlpha=1/(i+1);g.drawImage(c,Math.cos(a)*t,Math.sin(a)*t)}return o},{canvas:true})}
function pixelize(){adjust('Pixelate',[{key:'b',type:'range',label:'Block size',min:2,max:100,value:12,unit:' px'}],(c,v,s)=>{let b=Math.max(1,v.b*s),t=mk(c.width/b,c.height/b);g2(t).drawImage(c,0,0,t.width,t.height);let o=mk(c.width,c.height),g=g2(o);g.imageSmoothingEnabled=false;g.drawImage(t,0,0,t.width*b,t.height*b);return o},{canvas:true})}
function unsharp(){adjust('Sharpen (unsharp mask)',[{key:'r',type:'range',label:'Radius',min:.5,max:20,step:.1,value:2},{key:'a',type:'range',label:'Amount',min:0,max:300,value:80,unit:'%'},{key:'t',type:'range',label:'Threshold',min:0,max:60,value:2}],(id,v,s)=>{
  let bl=blurData(new ImageData(new Uint8ClampedArray(id.data),id.width,id.height),Math.max(.4,v.r*s)).data,d=id.data,k=v.a/100;
  for(let i=0;i<d.length;i+=4)for(let c=0;c<3;c++){let diff=d[i+c]-bl[i+c];if(Math.abs(diff)>=v.t)d[i+c]=d[i+c]+diff*k}})}
function softGlow(){adjust('Soft glow',[{key:'r',type:'range',label:'Glow size',min:1,max:60,value:12},{key:'b',type:'range',label:'Brightness',min:0,max:100,value:60}],(id,v,s)=>{
  let bl=blurData(new ImageData(new Uint8ClampedArray(id.data),id.width,id.height),v.r*s).data,d=id.data,k=v.b/100;for(let i=0;i<d.length;i+=4)for(let c=0;c<3;c++){let a=d[i+c],b=bl[i+c],sc=255-(255-a)*(255-b)/255;d[i+c]=a+(sc-a)*k}})}
function addNoise(){adjust('Add noise',[{key:'a',type:'range',label:'Amount',min:0,max:100,value:20},{key:'mono',type:'check',label:'Same for every colour (film grain)',value:true}],(id,v)=>{let k=v.a*1.6;perPixel(id,(r,g,b)=>{if(v.mono){let n=(Math.random()-.5)*k;return [r+n,g+n,b+n]}return [r+(Math.random()-.5)*k,g+(Math.random()-.5)*k,b+(Math.random()-.5)*k]})})}
function convolve(id,k,opts={}){const {width:w,height:h,data:d}=id,src=new Uint8ClampedArray(d);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4,acc=[0,0,0];for(let j=0;j<9;j++){let xx=clamp(x+j%3-1,0,w-1),yy=clamp(y+((j/3)|0)-1,0,h-1),p=(yy*w+xx)*4;for(let c=0;c<3;c++)acc[c]+=src[p+c]*k[j]}for(let c=0;c<3;c++)d[i+c]=acc[c]+(opts.add||0)}return id}
function emboss(){adjust('Emboss',[{key:'a',type:'range',label:'Strength',min:1,max:5,step:.1,value:1.5},{key:'col',type:'check',label:'Keep colours',value:false}],(id,v)=>{let k=v.a,K=[-k,-k/2,0,-k/2,1,k/2,0,k/2,k],orig=new Uint8ClampedArray(id.data);if(v.col){K=[-k,-k/2,0,-k/2,1,k/2,0,k/2,k];convolve(id,K)}else{convolve(id,K.map((x,i)=>i===4?0:x),{add:128});perPixel(id,(r,g,b)=>{let L=lum(r,g,b);return [L,L,L]})}void orig})}
function edgeDetect(){adjust('Edge detect',[{key:'a',type:'range',label:'Strength',min:1,max:5,step:.1,value:2},{key:'inv',type:'check',label:'Dark lines on white (sketch)',value:false}],(id,v)=>{
  const {width:w,height:h,data:d}=id,g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=lum(d[i*4],d[i*4+1],d[i*4+2]);const at=(x,y)=>g[clamp(y,0,h-1)*w+clamp(x,0,w-1)];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let gx=at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1)-at(x-1,y-1)-2*at(x-1,y)-at(x-1,y+1),gy=at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1)-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1),m=clamp(Math.hypot(gx,gy)*v.a/4,0,255);if(v.inv)m=255-m;let i=(y*w+x)*4;d[i]=d[i+1]=d[i+2]=m}})}
function remap(id,f){const {width:w,height:h,data:d}=id,src=new Uint8ClampedArray(d);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let [sx,sy]=f(x,y),i=(y*w+x)*4;if(sx<0||sy<0||sx>w-1||sy>h-1){d[i+3]=0;continue}let x0=sx|0,y0=sy|0,x1=Math.min(x0+1,w-1),y1=Math.min(y0+1,h-1),fx=sx-x0,fy=sy-y0;for(let c=0;c<4;c++){let a=src[(y0*w+x0)*4+c],b=src[(y0*w+x1)*4+c],cc=src[(y1*w+x0)*4+c],dd=src[(y1*w+x1)*4+c];d[i+c]=(a*(1-fx)+b*fx)*(1-fy)+(cc*(1-fx)+dd*fx)*fy}}return id}
function waves(){adjust('Waves',[{key:'a',type:'range',label:'Height',min:0,max:80,value:10,unit:' px'},{key:'l',type:'range',label:'Wavelength',min:4,max:400,value:60,unit:' px'},{key:'dir',type:'select',label:'Direction',value:'h',options:[['h','Side to side'],['v','Up and down'],['r','Ripples from centre']]}],(id,v,s)=>{let A=v.a*s,L=Math.max(2,v.l*s),cx=id.width/2,cy=id.height/2;remap(id,(x,y)=>{if(v.dir==='h')return [x+A*Math.sin(y/L*2*Math.PI),y];if(v.dir==='v')return [x,y+A*Math.sin(x/L*2*Math.PI)];let dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy)||1,k=A*Math.sin(r/L*2*Math.PI)/r;return [x+dx*k,y+dy*k]})})}
function whirl(){adjust('Whirl and pinch',[{key:'a',type:'range',label:'Whirl',min:-720,max:720,value:90,unit:'°'},{key:'p',type:'range',label:'Pinch',min:-100,max:100,value:0},{key:'r',type:'range',label:'Size',min:5,max:100,value:60,unit:'%'}],(id,v)=>{let cx=id.width/2,cy=id.height/2,R=Math.min(cx,cy)*v.r/50;remap(id,(x,y)=>{let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);if(d>=R||d<.5)return [x,y];let t=1-d/R,a=v.a*Math.PI/180*t*t,p=Math.pow(Math.sin(Math.PI/2*d/R),-v.p/100),c=Math.cos(a),s=Math.sin(a),nx=(dx*c-dy*s)*(v.p?p:1),ny=(dx*s+dy*c)*(v.p?p:1);return [cx+nx,cy+ny]})})}
function vignette(){adjust('Vignette',[{key:'a',type:'range',label:'Strength',min:0,max:100,value:60},{key:'r',type:'range',label:'Size',min:10,max:150,value:80},{key:'s',type:'range',label:'Softness',min:1,max:100,value:60},{key:'c',type:'color',label:'Colour',value:'#000000'}],(c,v)=>{
  let o=clone(c),g=g2(o),w=c.width,h=c.height,R=Math.hypot(w,h)/2*v.r/100,inner=R*(1-v.s/100),gr=g.createRadialGradient(w/2,h/2,Math.max(0,inner),w/2,h/2,Math.max(inner+1,R));let [r,gg,b]=hexRgb(v.c);
  gr.addColorStop(0,`rgba(${r},${gg},${b},0)`);gr.addColorStop(1,`rgba(${r},${gg},${b},${v.a/100})`);g.globalCompositeOperation='source-atop';g.fillStyle=gr;g.fillRect(0,0,w,h);return o},{canvas:true})}
function oldPhoto(){adjust('Old photo',[{key:'a',type:'range',label:'Age',min:0,max:100,value:70}],(id,v,s)=>{let k=v.a/100,w=id.width,h=id.height,d=id.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4;if(!d[i+3])continue;let r=d[i],g=d[i+1],b=d[i+2],sr=r*.393+g*.769+b*.189,sg=r*.349+g*.686+b*.168,sb=r*.272+g*.534+b*.131,n=(Math.random()-.5)*40*k,dx=x/w-.5,dy=y/h-.5,vg=1-k*.9*Math.min(1,(dx*dx+dy*dy)*2.2);
    d[i]=(r+(sr-r)*k+n)*vg;d[i+1]=(g+(sg-g)*k+n)*vg;d[i+2]=(b+(sb-b)*k+n)*vg}void s})}
function dropShadow(){adjust('Drop shadow',[{key:'x',type:'range',label:'Move right',min:-100,max:100,value:12,unit:' px'},{key:'y',type:'range',label:'Move down',min:-100,max:100,value:12,unit:' px'},{key:'b',type:'range',label:'Blur',min:0,max:80,value:12,unit:' px'},{key:'c',type:'color',label:'Colour',value:'#000000'},{key:'o',type:'range',label:'Opacity',min:0,max:100,value:60,unit:'%'}],(c,v,s)=>{
  let pad=Math.ceil((v.b*1.5+Math.max(Math.abs(v.x),Math.abs(v.y)))*s)+2,w=c.width+pad*2,h=c.height+pad*2,sh=mk(w,h),g=g2(sh);g.drawImage(c,pad+v.x*s,pad+v.y*s);g.globalCompositeOperation='source-in';g.fillStyle=v.c;g.fillRect(0,0,w,h);
  let bl=v.b>0?blurCanvas(sh,v.b*s/2):sh,o=mk(w,h),og=g2(o);og.globalAlpha=v.o/100;og.drawImage(bl,0,0);og.globalAlpha=1;og.drawImage(c,pad,pad);return {canvas:o,ox:-pad,oy:-pad}},{canvas:true,noSel:true})}
function outline(){adjust('Outline (stroke around)',[{key:'w',type:'range',label:'Width',min:1,max:60,value:6,unit:' px'},{key:'c',type:'color',label:'Colour',value:'#ffffff'}],(c,v,s)=>{
  let W=Math.max(1,v.w*s),pad=Math.ceil(W)+2,o=mk(c.width+pad*2,c.height+pad*2),g=g2(o),n=Math.max(12,Math.ceil(W*3));for(let i=0;i<n;i++){let a=i/n*Math.PI*2;g.drawImage(c,pad+Math.cos(a)*W,pad+Math.sin(a)*W)}
  g.globalCompositeOperation='source-in';g.fillStyle=v.c;g.fillRect(0,0,o.width,o.height);g.globalCompositeOperation='source-over';g.drawImage(c,pad,pad);return {canvas:o,ox:-pad,oy:-pad}},{canvas:true,noSel:true})}

// ---- Geometry. affineLayer draws a layer through matrix m (image coords → new image coords).
function affineLayer(l,m,quality='high'){
  let [a,b,c,d,e,f]=m,pts=[[l.x,l.y],[l.x+l.canvas.width,l.y],[l.x,l.y+l.canvas.height],[l.x+l.canvas.width,l.y+l.canvas.height]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f]);
  let x0=Math.floor(Math.min(...pts.map(p=>p[0]))+1e-6),y0=Math.floor(Math.min(...pts.map(p=>p[1]))+1e-6),x1=Math.ceil(Math.max(...pts.map(p=>p[0]))-1e-6),y1=Math.ceil(Math.max(...pts.map(p=>p[1]))-1e-6);
  let cv=mk(Math.max(1,x1-x0),Math.max(1,y1-y0)),g=g2(cv);g.imageSmoothingQuality=quality;g.setTransform(a,b,c,d,e-x0,f-y0);g.drawImage(l.canvas,l.x,l.y);
  return {...l,canvas:cv,x:x0,y:y0,text:null};
}
function affineMask(mask,m,W,H){if(!mask)return null;let o=mk(W,H),g=g2(o);g.setTransform(...m);g.drawImage(mask,0,0);return isEmptyMask(o)?null:o}
function transformImage(label,m,W,H){doc.layers=doc.layers.map(l=>affineLayer(l,m));doc.sel=affineMask(doc.sel,m,W,H);doc.w=W;doc.h=H;selChanged();commit(label);fitView()}
function flipImage(h){let W=doc.w,H=doc.h;transformImage(h?'Flip image sideways':'Flip image upside down',h?[-1,0,0,1,W,0]:[1,0,0,-1,0,H],W,H)}
function rotateImage(deg){let W=doc.w,H=doc.h;if(deg===90)transformImage('Rotate 90° right',[0,1,-1,0,H,0],H,W);else if(deg===-90)transformImage('Rotate 90° left',[0,-1,1,0,0,W],H,W);else transformImage('Rotate 180°',[-1,0,0,-1,W,H],W,H)}
function rotateArbitrary(){openDialog({title:'Rotate image',fields:[{key:'a',type:'range',label:'Angle',min:-180,max:180,step:.5,value:0,unit:'°'},{key:'grow',type:'check',label:'Make the canvas bigger so nothing is cut off',value:true}],ok:v=>later(()=>{
  let r=v.a*Math.PI/180,c=Math.cos(r),s=Math.sin(r),W=doc.w,H=doc.h,NW=W,NH=H;if(v.grow){NW=Math.ceil(Math.abs(W*c)+Math.abs(H*s));NH=Math.ceil(Math.abs(W*s)+Math.abs(H*c))}
  let m=[c,s,-s,c,NW/2-(c*W/2-s*H/2),NH/2-(s*W/2+c*H/2)];transformImage('Rotate image',m,NW,NH)})})}
function scaleImage(){let W=doc.w,H=doc.h;openDialog({title:'Scale image',fields:[{key:'w',type:'number',label:'Width (px)',value:W,min:1,max:MAX_SIDE},{key:'h',type:'number',label:'Height (px)',value:H,min:1,max:MAX_SIDE},{key:'lock',type:'check',label:'Keep proportions',value:true}],
  extra:(box,inp)=>{inp.w.oninput=()=>{if(inp.lock.checked)inp.h.value=Math.max(1,Math.round(inp.w.value*H/W))};inp.h.oninput=()=>{if(inp.lock.checked)inp.w.value=Math.max(1,Math.round(inp.h.value*W/H))}},
  ok:v=>{let [nw,nh]=fitSize(Math.max(1,v.w|0),Math.max(1,v.h|0));later(()=>transformImage('Scale image',[nw/W,0,0,nh/H,0,0],nw,nh))}})}
function canvasSize(){let W=doc.w,H=doc.h;openDialog({title:'Canvas size',fields:[{key:'w',type:'number',label:'Width (px)',value:W,min:1,max:MAX_SIDE},{key:'h',type:'number',label:'Height (px)',value:H,min:1,max:MAX_SIDE},{key:'an',type:'select',label:'Keep the picture at',value:'c',options:[['tl','Top left'],['t','Top'],['tr','Top right'],['l','Left'],['c','Centre'],['r','Right'],['bl','Bottom left'],['b','Bottom'],['br','Bottom right']]},{key:'fill',type:'select',label:'Fill new space with',value:'none',options:[['none','Nothing (see-through)'],['bg','Background colour'],['fg','Foreground colour'],['white','White']]}],
  ok:v=>{let [nw,nh]=fitSize(Math.max(1,v.w|0),Math.max(1,v.h|0)),dx=v.an.includes('l')?0:v.an.includes('r')?nw-W:Math.round((nw-W)/2),dy=v.an.startsWith('t')?0:v.an.startsWith('b')?nh-H:Math.round((nh-H)/2);
    doc.layers=doc.layers.map(l=>({...l,x:l.x+dx,y:l.y+dy}));doc.sel=affineMask(doc.sel,[1,0,0,1,dx,dy],nw,nh);doc.w=nw;doc.h=nh;
    if(v.fill!=='none'){let c=mk(nw,nh),g=g2(c);g.fillStyle=v.fill==='bg'?colors.bg:v.fill==='fg'?colors.fg:'#fff';g.fillRect(0,0,nw,nh);doc.layers.unshift({...newLayer('Fill',1,1),canvas:c});doc.active++}
    selChanged();commit('Canvas size');fitView()}})}
function cropTo(x,y,w,h,label){
  x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  doc.layers=doc.layers.map(l=>{let nx=Math.max(l.x,x),ny=Math.max(l.y,y),r=Math.min(l.x+l.canvas.width,x+w),b=Math.min(l.y+l.canvas.height,y+h);if(r<=nx||b<=ny)return {...l,canvas:mk(1,1),x:0,y:0,text:null};
    let c=mk(r-nx,b-ny);g2(c).drawImage(l.canvas,l.x-nx,l.y-ny);return {...l,canvas:c,x:nx-x,y:ny-y,text:(l.x===nx&&l.y===ny&&c.width===l.canvas.width&&c.height===l.canvas.height)?l.text:null}});
  doc.sel=affineMask(doc.sel,[1,0,0,1,-x,-y],w,h);doc.w=w;doc.h=h;selChanged();commit(label||'Crop');fitView();
}
function cropToSelection(){let b=selBounds();if(!b)return toast('Make a selection first.');cropTo(b.x,b.y,b.w,b.h,'Crop to selection')}
function cropToContent(){let f=flattened(),d=readData(f).data,W=doc.w,H=doc.h,ref=[d[0],d[1],d[2],d[3]],diff=i=>ref[3]<8?d[i+3]>8:(Math.abs(d[i]-ref[0])+Math.abs(d[i+1]-ref[1])+Math.abs(d[i+2]-ref[2])+Math.abs(d[i+3]-ref[3])>24);
  let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(diff((y*W+x)*4)){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return toast('Nothing to crop — the picture is one plain colour.');if(x0===0&&y0===0&&x1===W-1&&y1===H-1)return toast('There are no empty edges to crop.');cropTo(x0,y0,x1-x0+1,y1-y0+1,'Crop to content')}
// Active layer only.
function transformLayer(label,m){let l=layer();if(!l)return;doc.layers[doc.active]=affineLayer(l,m);commit(label)}
function layerCenter(l){return [l.x+l.canvas.width/2,l.y+l.canvas.height/2]}
function flipLayer(h){let l=layer();if(!l)return;let [cx,cy]=layerCenter(l);transformLayer(h?'Flip layer sideways':'Flip layer upside down',h?[-1,0,0,1,2*cx,0]:[1,0,0,-1,0,2*cy])}
function rotateLayer(deg){let l=layer();if(!l)return;let [cx,cy]=layerCenter(l),r=deg*Math.PI/180,c=Math.round(Math.cos(r)*1e9)/1e9,s=Math.round(Math.sin(r)*1e9)/1e9;transformLayer('Rotate layer',[c,s,-s,c,cx-c*cx+s*cy,cy-s*cx-c*cy])}
function rotateLayerDialog(){openDialog({title:'Rotate layer',fields:[{key:'a',type:'range',label:'Angle',min:-180,max:180,step:.5,value:15,unit:'°'}],ok:v=>rotateLayer(v.a)})}
function scaleLayer(){let l=layer();if(!l)return;let W=l.canvas.width,H=l.canvas.height;openDialog({title:'Scale layer',fields:[{key:'w',type:'number',label:'Width (px)',value:W,min:1,max:MAX_SIDE},{key:'h',type:'number',label:'Height (px)',value:H,min:1,max:MAX_SIDE},{key:'lock',type:'check',label:'Keep proportions',value:true}],
  extra:(box,inp)=>{inp.w.oninput=()=>{if(inp.lock.checked)inp.h.value=Math.max(1,Math.round(inp.w.value*H/W))};inp.h.oninput=()=>{if(inp.lock.checked)inp.w.value=Math.max(1,Math.round(inp.h.value*W/H))}},
  ok:v=>{let [nw,nh]=fitSize(Math.max(1,v.w|0),Math.max(1,v.h|0)),sx=nw/W,sy=nh/H,[cx,cy]=layerCenter(l);transformLayer('Scale layer',[sx,0,0,sy,cx-sx*cx,cy-sy*cy])}})}
// Selection grow/shrink/feather/border work on the mask.
function featherSel(){if(!doc.sel)return toast('Make a selection first.');openDialog({title:'Feather selection',fields:[{key:'r',type:'range',label:'Softness',min:1,max:200,value:10,unit:' px'}],ok:v=>later(()=>{doc.sel=blurCanvas(doc.sel,v.r/2);selChanged();commit('Feather selection')})})}
function thresholdMask(m,t){let id=readData(m),d=id.data;for(let i=3;i<d.length;i+=4){d[i]=d[i]>=t?255:0;d[i-1]=d[i-2]=d[i-3]=255}return dataCanvas(id)}
function growSel(sign){if(!doc.sel)return toast('Make a selection first.');openDialog({title:sign>0?'Grow selection':'Shrink selection',fields:[{key:'r',type:'range',label:'By',min:1,max:200,value:10,unit:' px'}],ok:v=>later(()=>{let b=blurCanvas(doc.sel,v.r/1.8);let m=thresholdMask(b,sign>0?18:237);doc.sel=isEmptyMask(m)?null:m;selChanged();commit(sign>0?'Grow selection':'Shrink selection')})})}
function borderSel(){if(!doc.sel)return toast('Make a selection first.');openDialog({title:'Border selection',fields:[{key:'r',type:'range',label:'Border width',min:1,max:200,value:10,unit:' px'}],ok:v=>later(()=>{let b=blurCanvas(doc.sel,v.r/3.6),outer=thresholdMask(b,18),inner=thresholdMask(b,237),g=g2(outer);g.globalCompositeOperation='destination-out';g.drawImage(inner,0,0);doc.sel=isEmptyMask(outer)?null:outer;selChanged();commit('Border selection')})})}
