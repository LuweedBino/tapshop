// Review showcase for the Video Editor: affiliates paste (or pick) screenshots of other people's
// reviews and get an animated sequence. It is one graphics track (gfx: 'reviews') holding the
// pictures as data URLs in `imgs` ([{src, w, h, anim, badge}]; empty anim/badge = the track's own).
// Layouts: one by one, stack, carousel, wall, scroll. Optional opening line, ending line with a
// link-in-bio button, confetti, background dim/blur/colour, and a badge per review.
(()=>{
if(!window.veGfxAdd)return;
const {C,eo,ei,eb,el,rnd,rr,txt,star,pop}=VE_GFX_KIT;
const T=(k,label,def)=>({k,label,def}),N=(k,label,def,min,max,step=.1)=>({k,label,def,num:true,min,max,step}),S=(k,label,def,opts)=>({k,label,def,opts});
const LAYOUTS=[['one','One by one'],['stack','Pile up'],['carousel','Swipe carousel'],['wall','Review wall'],['scroll','Scroll through (long screenshots)']];
const ANIMS=[['slide','Slide in'],['pop','Pop'],['flip','Flip'],['drop','Drop and bounce'],['swipe','Swipe and tilt'],['zoom','Zoom in'],['fade','Fade'],['mix','Mix it up']];
const BADGES=[['stars','★★★★★ Stars'],['verified','✓ Verified buyer'],['heart','❤️ Heart sticker'],['fire','🔥 Fire sticker'],['count','Review number (3 / 12)'],['glow','Glowing edge'],['none','Nothing']];
const BGS=[['dim','Darken the video'],['blur','Blur the video'],['color','Colour background'],['none','Nothing']];
const intro=t=>t.t1?1.6:0,outro=t=>t.t2?2.4:0;
const lengthOf=t=>Math.round((intro(t)+Math.max(1,(t.imgs||[]).length)*(+t.per||2.2)+outro(t)+.2)*10)/10;

// ---- Pictures: one decoded <img> per data URL, shared by the preview, picker and export.
const imgs=new Map();
function img(src){let i=imgs.get(src);if(!i){i=new Image();i.decoding='async';i.src=src;imgs.set(src,i);i.onload=()=>{if(typeof draw==='function')draw()}}return i.complete&&i.naturalWidth?i:null}
// Sample "reviews" so the picker card (and an empty track) shows what this does.
let demo=null;function demos(){if(demo)return demo;demo=[['Sarah K.','Obsessed!! Worth every penny 😍',5],['Mike R.','Arrived fast, quality is amazing',5],['Jess','Bought a second one for my mom',4]].map(([n,txt,s],i)=>{let c=document.createElement('canvas');c.width=520;c.height=200;let g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,520,200);g.fillStyle=['#ff3ea5','#3b82f6','#22c55e'][i];g.beginPath();g.arc(48,52,26,0,7);g.fill();g.fillStyle='#fff';g.font='700 26px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(n[0],48,53);g.textAlign='left';g.fillStyle='#111';g.font='700 24px system-ui';g.fillText(n,88,40);g.fillStyle='#f5b301';for(let k=0;k<5;k++){g.globalAlpha=k<s?1:.25;star(g,98+k*26,72,11);g.fill()}g.globalAlpha=1;g.fillStyle='#333';g.font='22px system-ui';g.fillText(txt,24,130);g.fillStyle='#999';g.font='16px system-ui';g.fillText('Verified purchase · 2 days ago',24,170);return {el:c,w:520,h:200}});return demo}
function pics(t){let list=t.imgs||[];if(!list.length)return demos().map((d,i)=>({...d,anim:'',badge:'',i}));return list.map((r,i)=>{let el=img(r.src);return {el,w:r.w,h:r.h,anim:r.anim,badge:r.badge,i}})}

// ---- Drawing helpers
function fit(w,h,mw,mh){let s=Math.min(mw/w,mh/h);return [w*s,h*s]}
function enter(g,kind,p,W,H,i){p=C(p);if(kind==='mix')kind=['slide','pop','flip','drop','swipe','zoom'][i%6];
  if(kind==='slide'){g.translate((1-eo(p))*W*.7,0);g.globalAlpha*=C(p*3)}
  else if(kind==='pop'){let k=el(p);g.scale(k,k)}
  else if(kind==='flip'){g.scale(Math.max(.001,eo(p)),1)}
  else if(kind==='drop'){g.translate(0,-(1-eb(p))*H*.5);g.globalAlpha*=C(p*4)}
  else if(kind==='swipe'){g.translate((1-eo(p))*W*.6,(1-eo(p))*H*.08);g.rotate((1-eo(p))*.45);g.globalAlpha*=C(p*3)}
  else if(kind==='zoom'){let k=1.5-.5*eo(p);g.scale(k,k);g.globalAlpha*=p}
  else g.globalAlpha*=p}
function card(g,t,pic,w,h,u,W,H,L,total,anim,quiet){
  let frame=t.frame!=='none',pad=frame?u*1.1:0;g.save();g.shadowColor='#0008';g.shadowBlur=u*3;g.shadowOffsetY=u*1;g.fillStyle='#ffffff';rr(g,-w/2-pad,-h/2-pad,w+pad*2,h+pad*2,u*2.4);g.fill();g.restore();
  let badge=pic.badge||t.badge||'stars';if(badge==='glow'){g.save();g.shadowColor=t.c1;g.shadowBlur=u*4*(.6+.4*Math.sin(L*5));g.strokeStyle=t.c1;g.lineWidth=u*.6;rr(g,-w/2-pad,-h/2-pad,w+pad*2,h+pad*2,u*2.4);g.stroke();g.restore()}
  g.save();rr(g,-w/2,-h/2,w,h,u*1.6);g.clip();if(pic.el)g.drawImage(pic.el,-w/2,-h/2,w,h);else{g.fillStyle='#e4e4e7';g.fillRect(-w/2,-h/2,w,h)}g.restore();
  // Badges show up a beat after the card lands.
  let b=C((L-.35)/.35);if(b<=0||quiet)return;g.save();g.translate(0,0);
  if(badge==='stars'){for(let k=0;k<5;k++){let kk=eb((L-.35-k*.07)/.25);if(kk<=0)continue;g.save();g.translate((k-2)*u*5.6,-h/2-pad-u*4.6);g.scale(kk,kk);g.fillStyle=t.c1;g.shadowColor='#0007';g.shadowBlur=u*1.5;star(g,0,0,u*2.5);g.fill();g.restore()}}
  else if(badge==='verified'){g.translate(w/2+pad-u*2,h/2+pad);g.scale(eb(b),eb(b));let s=u*3.2,tw=(g.font=`800 ${s}px system-ui`,g.measureText('✓ Verified buyer').width)+s*1.6;g.fillStyle=t.c2;rr(g,-tw,-s,tw,s*2,s);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText('✓ Verified buyer',-tw/2,s*.05)}
  else if(badge==='heart'||badge==='fire'){g.translate(w/2+pad-u,-h/2-pad+u);g.rotate(.25);g.scale(el(b),el(b));g.font=`${u*9}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText(badge==='heart'?'❤️':'🔥',0,0)}
  else if(badge==='count'){g.translate(-w/2-pad+u*2,-h/2-pad);g.scale(eb(b),eb(b));let s=u*3,str=(pic.i+1)+' / '+total,tw=(g.font=`800 ${s}px system-ui`,g.measureText(str).width)+s*1.6;g.fillStyle=t.c1;rr(g,0,-s,tw,s*2,s);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(str,tw/2,s*.05)}
  g.restore()}
function background(g,t,L,W,H,len){let a=C(L/.4)*C((len-L)/.4);if(a<=0||t.bg==='none')return;g.save();g.globalAlpha*=a;
  if(t.bg==='blur'){let src=g.canvas,s=mkTmp(Math.max(8,W/14),Math.max(8,H/14));s.g.drawImage(src,0,0,s.c.width,s.c.height);g.imageSmoothingQuality='high';g.drawImage(s.c,0,0,W,H);g.fillStyle='#0004';g.fillRect(0,0,W,H)}
  else if(t.bg==='color'){let gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,t.c3);gr.addColorStop(1,shade(t.c3,-.45));g.fillStyle=gr;g.fillRect(0,0,W,H)}
  else{g.fillStyle='#000';g.globalAlpha*=.5;g.fillRect(0,0,W,H)}g.restore()}
let tmp=null;function mkTmp(w,h){w=Math.round(w);h=Math.round(h);if(!tmp)tmp={c:document.createElement('canvas')};if(tmp.c.width!==w||tmp.c.height!==h){tmp.c.width=w;tmp.c.height=h}tmp.g=tmp.c.getContext('2d');tmp.g.clearRect(0,0,w,h);return tmp}
function shade(hex,k){let n=parseInt(String(hex||'#000').slice(1),16)||0,f=v=>Math.round(Math.max(0,Math.min(255,v+(k<0?v*k:(255-v)*k))));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`}

function drawReviews(g,t,L,W,H,len){
  background(g,t,L,W,H,len);
  let u=Math.min(W,H)/100,sc=t.scale||1,cx=W*t.x/100,cy=H*t.y/100,list=pics(t),n=list.length,per=+t.per||2.2,i0=intro(t),end=i0+n*per,lay=t.layout||'one';
  if(t.t1&&L<i0+.4){let h=veGfxDefaults('hook');Object.assign(h,{t1:t.t1,c1:t.c1,c2:t.c2,c3:'#111111',font:t.font,x:50,y:lay==='wall'?14:40,scale:Math.min(1.2,(W/Math.min(W,H))*88/(String(t.t1).length*4.3+12)),length:i0});g.save();if(L>i0)g.globalAlpha*=C((i0+.4-L)/.4);veDrawGfx(g,h,Math.min(L,i0-.01),W,H);g.restore()}
  let R=L-i0;if(R<0)return;let mw=W*.82*sc,mh=H*(lay==='scroll'?.8:.6)*sc;
  const at=(p,x,y,w,h,local,anim,extra,quiet)=>{g.save();g.translate(x,y);enter(g,anim,local/.45,W,H,p.i);if(extra)extra();card(g,t,p,w,h,u*sc,W,H,local,n,anim,quiet);g.restore()};
  if(lay==='one'||lay==='scroll'){let i=Math.min(n-1,Math.floor(R/per)),f=R-i*per;if(R>=n*per)return outroDraw();let p=list[i],[w,h]=fit(p.w,p.h,mw,lay==='scroll'?Infinity:mh);let ex=f>per-.3&&!(i===n-1&&!t.t2)?C((f-(per-.3))/.3):0;
    g.save();g.globalAlpha*=1-ex;g.translate(-ex*W*.25,0);if(lay==='scroll'&&h>mh){g.save();g.beginPath();g.rect(0,cy-mh/2-u*6,W,mh+u*12);g.clip();let pan=(h-mh)*ei(C((f-.5)/(per-.9)));at(p,cx,cy+(h-mh)/2-pan,w,h,f,p.anim||t.anim);g.restore()}else at(p,cx,cy,w,h,f,p.anim||t.anim);g.restore()}
  else if(lay==='stack'){let i=Math.min(n-1,Math.floor(R/per));for(let j=Math.max(0,i-5);j<=i;j++){let p=list[j],[w,h]=fit(p.w,p.h,mw*.92,mh*.92),age=i-j,local=R-j*per;g.save();g.translate(0,-age*u*3);at(p,cx+(rnd(j)-.5)*u*8,cy+(rnd(j+3)-.5)*u*6,w,h,local,p.anim||t.anim,()=>{g.rotate((rnd(j+7)-.5)*.16);let k=Math.pow(.96,age);g.scale(k,k)},age>0);if(age){g.save();g.globalAlpha*=Math.min(.45,age*.15);g.restore()}g.restore()}}
  else if(lay==='carousel'){let slot=Math.min(n-1,R/per),i=Math.floor(slot),f=(slot-i)*per,pos=i+(i<n-1?ei(C((f-(per-.55))/.55)):0),cw=mw*.78;for(let j=0;j<n;j++){let d=j-pos;if(Math.abs(d)>1.6)continue;let p=list[j],[w,h]=fit(p.w,p.h,cw,mh),k=1-.18*Math.min(1,Math.abs(d)),local=j===0?R:R-(j-1)*per+.45;g.save();g.globalAlpha*=1-.45*Math.min(1,Math.abs(d));at(p,cx+d*cw*1.04,cy,w,h,Math.max(.45,j===0?R:9),'fade',()=>{g.scale(k,k)},Math.abs(d)>.5);g.restore();void local}}
  else if(lay==='wall'){let cols=n<=2?1:n<=4?2:n<=9?3:4,rows=Math.ceil(n/cols),aw=W*.92*sc,ah=H*.7*sc,cwid=aw/cols,chei=ah/rows,step=Math.min(per,.7),i=Math.min(n-1,Math.floor(R/step));for(let j=0;j<=i;j++){let p=list[j],[w,h]=fit(p.w,p.h,cwid*.88,chei*.86),col=j%cols,row=Math.floor(j/cols),x=W/2-aw/2+cwid*(col+.5)+(cx-W/2),y=cy-ah/2+chei*(row+.5)+u*3,cur=j===i&&R<n*step+.6;at(p,x,y,w,h,R-j*step,p.anim||t.anim||'pop',()=>{if(cur){let k=1+.06*Math.sin(Math.min(1,(R-j*step)/.5)*Math.PI);g.scale(k,k)}})}}
  if(R>=n*per)outroDraw();
  function outroDraw(){let O=R-n*per;if(O<0||!t.t2)return;let b=veGfxDefaults('linkbio');Object.assign(b,{t1:t.t2,c1:'#ffffff',c2:t.c1,c3:'#111111',font:t.font,x:50,y:lay==='wall'?88:50,scale:Math.min(1.3,(W/Math.min(W,H))*80/(String(t.t2).length*3.3+12)),length:outro(t)});veDrawGfx(g,b,O,W,H);if(t.confetti!=='no'){let c=veGfxDefaults('confetti');Object.assign(c,{x:50,y:62,c1:t.c1,c2:t.c2,c3:'#ffe14d',length:3});veDrawGfx(g,c,Math.min(O,2.9),W,H)}}
}

// ---- Turning pasted/chosen files into small JPEG data URLs (screenshots stay readable).
async function toEntry(blob){let bm;try{bm=await createImageBitmap(blob)}catch{let u=URL.createObjectURL(blob);bm=await new Promise((res,rej)=>{let i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('That file is not a picture.'));i.src=u})}
  let w=bm.width,h=bm.height,s=Math.min(1,1000/w,2000/h),c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);let g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bm,0,0,c.width,c.height);return {src:c.toDataURL('image/jpeg',.88),w:c.width,h:c.height,anim:'',badge:''}}

// ---- Builder dialog
const css=document.createElement('style');css.textContent=`#rvDialog{width:min(720px,96vw)}#rvDrop{border:2px dashed #ff3ea588;border-radius:14px;padding:18px;text-align:center;margin:8px 0 10px}#rvDrop.over{background:#ff3ea522}#rvDrop b{display:block;font-size:16px;margin-bottom:6px}.rv-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}
.rv-list{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;min-height:20px}.rv-item{position:relative;flex:none;width:92px}.rv-item img{width:92px;height:120px;object-fit:contain;border-radius:8px;display:block;background:#fff}.rv-item .rv-ctl{display:flex;gap:2px;margin-top:3px}.rv-item .rv-ctl button{flex:1;padding:3px!important;font-size:11px;min-width:0}.rv-item select{width:100%;font-size:11px;margin-top:3px;padding:2px}
.rv-num{position:absolute;top:4px;left:4px;background:#000a;color:#fff;font:700 11px system-ui;border-radius:6px;padding:1px 5px}.rv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:8px 0}.rv-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px}.rv-layouts{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px;margin:6px 0 10px}.rv-layouts button{padding:8px!important;text-align:left;font-size:12px;border-radius:10px!important}.rv-layouts button.on{outline:2px solid #ff3ea5;background:#ff3ea522}.rv-layouts canvas{width:100%;display:block;border-radius:6px;margin-bottom:5px;background:linear-gradient(160deg,#4b4b63,#1b1b25)}
.gfx-panel .rv-panel{flex-basis:100%}.vs-reviews{display:block;width:100%;text-align:left;padding:14px 16px!important;margin:4px 0 14px;border-radius:14px!important;border:2px solid #ff3ea5!important;background:linear-gradient(90deg,#ff3ea522,#ffc10722)!important}.vs-reviews b{display:block;font-size:15px;margin-bottom:3px}.vs-reviews span{font-size:12px;opacity:.75}`;document.head.appendChild(css);
const dlg=document.createElement('dialog');dlg.id='rvDialog';dlg.className='closable';document.body.appendChild(dlg);
let work=null,editing=null,raf=0;
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opts=(list,v)=>list.map(([k,n])=>`<option value="${k}"${k===v?' selected':''}>${enc(n)}</option>`).join('');
function open(track){editing=track||null;work=track?JSON.parse(JSON.stringify(track)):veGfxDefaults('reviews');if(!track&&!clips.length&&!extraTracks.length)work.bg='color';render();dlg.showModal()}
async function add(blobs){let got=0;for(const b of blobs){if(!b||!/^image\//.test(b.type||'image/'))continue;try{work.imgs.push(await toEntry(b));got++}catch(e){toast(e.message)}}if(got){toast(got+' review'+(got>1?'s':'')+' added');list()}else toast('No pictures found to add.')}
function list(){let box=dlg.querySelector('.rv-list');if(!box)return;box.innerHTML=work.imgs.length?'':'<p class="sub" style="margin:auto">No reviews yet. Paste or choose some screenshots above.</p>';
  work.imgs.forEach((r,i)=>{let d=document.createElement('div');d.className='rv-item';d.innerHTML=`<img alt="Review ${i+1}" src="${r.src}"><span class="rv-num">${i+1}</span><div class="rv-ctl"><button type="button" data-a="l" aria-label="Move earlier">←</button><button type="button" data-a="r" aria-label="Move later">→</button><button type="button" data-a="x" aria-label="Remove">×</button></div><select data-k="anim" aria-label="Animation for review ${i+1}"><option value="">Animation: same</option>${opts(ANIMS,r.anim)}</select><select data-k="badge" aria-label="Extra for review ${i+1}"><option value="">Extra: same</option>${opts(BADGES,r.badge)}</select>`;
    d.onclick=e=>{let a=e.target.dataset.a;if(!a)return;if(a==='x')work.imgs.splice(i,1);else{let j=i+(a==='l'?-1:1);if(j<0||j>=work.imgs.length)return;[work.imgs[i],work.imgs[j]]=[work.imgs[j],work.imgs[i]]}list()};d.querySelectorAll('select').forEach(s=>s.onchange=()=>{r[s.dataset.k]=s.value});box.appendChild(d)});
  let go=dlg.querySelector('#rvGo');if(go){go.disabled=!work.imgs.length;go.textContent=(editing?'Update':'Make my review video')+(work.imgs.length?' ('+work.imgs.length+')':'')}}
function render(){
  dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>⭐ Review showcase</h2><p class="sub">Show off what other people say about the product. Paste or add screenshots of their reviews, pick a style, and it animates them for you.</p>
  <div id="rvDrop"><b>📋 Paste screenshots here</b><span class="sub">Copy a screenshot, then press Ctrl+V (⌘V), or tap “Paste”. You can also drop pictures here.</span><div class="rv-btns"><button type="button" class="primary" id="rvPaste">📋 Paste</button><button type="button" id="rvChoose">🖼 Choose pictures</button>${typeof VaultPicker!=='undefined'&&VaultPicker.inTapShop?'<button type="button" id="rvVault">⛁ From Media Vault</button>':''}</div><input type="file" id="rvFiles" accept="image/*" multiple hidden></div>
  <div class="rv-list"></div><p class="sub" style="margin:0">Use ← → to change the order. Each review can have its own animation and extra.</p>
  <h3 style="margin:14px 0 4px">Style</h3><div class="rv-layouts">${LAYOUTS.map(([k,n])=>`<button type="button" data-l="${k}" class="${work.layout===k?'on':''}"><canvas width="200" height="250"></canvas>${enc(n)}</button>`).join('')}</div>
  <div class="rv-grid"><label>Animation<select data-k="anim">${opts(ANIMS,work.anim)}</select></label><label>Extra on each review<select data-k="badge">${opts(BADGES,work.badge)}</select></label><label>Behind the reviews<select data-k="bg">${opts(BGS,work.bg)}</select></label>
  <label>Seconds per review <small>${work.per}s</small><input type="range" min=".8" max="6" step=".1" value="${work.per}" data-k="per"></label><label>Opening line (leave empty for none)<input type="text" value="${enc(work.t1)}" data-k="t1"></label><label>Ending line (leave empty for none)<input type="text" value="${enc(work.t2)}" data-k="t2"></label>
  <label>Accent colour<input type="color" value="${work.c1}" data-k="c1"></label><label>Background colour<input type="color" value="${work.c3}" data-k="c3"></label><label>Confetti at the end<select data-k="confetti">${opts([['yes','Yes'],['no','No']],work.confetti)}</select></label></div>
  <div class="row"><button type="button" id="rvCancel">Cancel</button><button type="button" class="primary" id="rvGo">Make my review video</button></div>`;
  dlg.querySelector('.dialog-x').onclick=dlg.querySelector('#rvCancel').onclick=()=>dlg.close();
  let fi=dlg.querySelector('#rvFiles');dlg.querySelector('#rvChoose').onclick=()=>fi.click();fi.onchange=()=>{add([...fi.files]);fi.value=''};
  dlg.querySelector('#rvPaste').onclick=async()=>{if(!navigator.clipboard?.read){toast('Press Ctrl+V (⌘V) to paste here.');return}try{let items=await navigator.clipboard.read(),bl=[];for(const it of items){let ty=it.types.find(x=>x.startsWith('image/'));if(ty)bl.push(await it.getType(ty))}if(!bl.length)toast('There’s no screenshot copied yet. Copy one first.');else add(bl)}catch{toast('Your browser blocked pasting. Try Ctrl+V (⌘V), or choose pictures instead.')}};
  let vb=dlg.querySelector('#rvVault');if(vb)vb.onclick=()=>VaultPicker.open({title:'Pick a review screenshot',kinds:['image'],accept:i=>!/svg/.test(i.contentType),onPick:async it=>{try{toast('Loading '+it.name+'…');await add([await VaultPicker.file(it)])}catch(e){toast(e.message)}if(!dlg.open)dlg.showModal()}});
  let drop=dlg.querySelector('#rvDrop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');add([...e.dataTransfer.files])};
  dlg.querySelectorAll('[data-k]').forEach(el=>{if(el.closest('.rv-item'))return;el.oninput=el.onchange=()=>{let k=el.dataset.k;work[k]=el.type==='range'?+el.value:el.value;if(el.type==='range')el.previousElementSibling.textContent=el.value+'s'}});
  dlg.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{work.layout=b.dataset.l;dlg.querySelectorAll('[data-l]').forEach(x=>x.classList.toggle('on',x===b))});
  dlg.querySelector('#rvGo').onclick=build;list();
  cancelAnimationFrame(raf);let t0=performance.now();const tick=now=>{if(!dlg.open)return;let L=(now-t0)/1000;dlg.querySelectorAll('[data-l]').forEach(b=>{let c=b.firstChild,g=c.getContext('2d'),t={...work,imgs:[],layout:b.dataset.l,t1:'',t2:'',bg:'none',scale:1,x:50,y:50,per:1.4},len=lengthOf(t)+.6;g.clearRect(0,0,c.width,c.height);drawReviews(g,t,L%len,c.width,c.height,len)});raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
}
dlg.addEventListener('paste',e=>{let f=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(f.length){e.preventDefault();add(f)}});
document.addEventListener('paste',e=>{if(dlg.open&&!dlg.contains(e.target)){let f=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith('image/'));if(f.length){e.preventDefault();add(f)}}});
dlg.addEventListener('close',()=>cancelAnimationFrame(raf));
function build(){if(!work.imgs.length)return toast('Add at least one review first.');if(typeof snapshot==='function')snapshot();
  let t=editing||{id:uid(),offset:Math.max(0,Math.round(playhead*10)/10),hidden:false};Object.assign(t,work,{id:t.id,offset:t.offset,hidden:t.hidden,type:'gfx',gfx:'reviews'});t.length=lengthOf(t);dlg.close();veGfxInsert(t);toast(editing?'Review video updated.':'Review video added. Press ▶ to watch it.')}

veGfxAdd([],[{id:'reviews',pack:'review',name:'⭐ Review showcase (your screenshots)',full:true,xy:true,len:9,x:50,y:52,pv:1,open,
  tags:'testimonials screenshots customer reviews paste social proof affiliate',
  f:[T('t1','Opening line','Don’t take my word for it 👇'),T('t2','Ending line','Link in bio to get yours'),S('layout','Style','one',LAYOUTS),S('anim','Animation','pop',ANIMS),S('badge','Extra on each review','stars',BADGES),S('bg','Behind the reviews','dim',BGS),N('per','Seconds per review',2.2,.8,8),S('confetti','Confetti at the end','yes',[['yes','Yes'],['no','No']]),S('frame','White frame','white',[['white','Yes'],['none','No']])],
  col:['Accent (stars, hook)','Badge','Background colour'],c:['#ffc107','#22c55e','#1f1b2e'],
  init(t){t.imgs=[]},
  draw:drawReviews,
  fix(t,k){if(['per','t1','t2','imgs'].includes(k)){let L=lengthOf(t);if(L!==t.length){t.length=L;return true}}return false},
  prepare(t){return Promise.all((t.imgs||[]).map(r=>{img(r.src);let i=imgs.get(r.src);return i.decode?i.decode().catch(()=>{}):null}))},
  extra(t){return `<div class="rv-panel"><b style="font-size:12px">${(t.imgs||[]).length} review screenshot${(t.imgs||[]).length===1?'':'s'}</b> <button type="button" onclick="rvEdit('${t.id}')">📋 Add, remove or reorder reviews</button></div>`}}]);
window.rvEdit=id=>{let t=graphicTracks.find(t=>t.id===id);if(t)open(t)};
// The generic defaults don't know about the list of pictures.
const baseDefaults=veGfxDefaults;window.veGfxDefaults=id=>{let t=baseDefaults(id);if(t&&id==='reviews'){t.imgs=[];t.frame='white'}return t};
// A toolbar button too, since this is the main thing affiliates will reach for.
let g=[...document.querySelectorAll('.timebar button')].find(b=>/Graphics/.test(b.textContent));let btn=document.createElement('button');btn.type='button';btn.textContent='⭐ Reviews';btn.title='Turn screenshots of reviews into an animated video';btn.onclick=()=>open(null);if(g)g.after(btn);else document.querySelector('.timebar')?.appendChild(btn);
window.openReviews=()=>open(null);
// Also offer it on the start screen, above the templates: it applies the chosen platform first.
function startButton(){let cats=document.getElementById('vsCats');if(!cats||document.getElementById('vsReviews'))return;let b=document.createElement('button');b.type='button';b.id='vsReviews';b.className='vs-reviews';b.innerHTML='<b>⭐ Make a review video from screenshots</b><span>Paste screenshots of other people’s reviews and they’re animated for you — great for affiliate videos.</span>';
  b.onclick=()=>{let go=document.getElementById('vsGo');if(go)go.click();let el=document.getElementById('veStart');if(el)el.hidden=true;setTimeout(()=>open(null),60)};cats.before(b)}
new MutationObserver(startButton).observe(document.body,{childList:true,subtree:true});startButton();
})();
