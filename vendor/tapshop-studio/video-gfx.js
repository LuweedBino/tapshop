// Graphics packs for the Video Editor: ready-made animated overlays (hooks, price tags, link-in-bio
// arrows, star ratings, subscribe buttons, progress bars, confetti…). Each one is a graphic track of
// type 'gfx' ({gfx: <id>, x, y, scale, c1, c2, c3, font, plus its own text fields}) drawn here on the
// canvas every frame, so the preview, export and auto-save all work like the other tracks.
// Pieces draw in units of 1% of the frame's short side, centred on (x, y); `full` pieces use the
// whole frame in pixels.
(()=>{
const C=v=>v<0?0:v>1?1:v,eo=p=>1-Math.pow(1-C(p),3),ei=p=>C(p)*C(p);
const eb=p=>{p=C(p);let a=1.70158,b=a+1;return 1+b*Math.pow(p-1,3)+a*Math.pow(p-1,2)};
const el=p=>{p=C(p);return p===0?0:p===1?1:Math.pow(2,-10*p)*Math.sin((p*10-.75)*2*Math.PI/3)+1};
const rnd=i=>{let x=Math.sin(i*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
const fam=f=>!f||f==='system-ui'?'system-ui,-apple-system,"Segoe UI",sans-serif':`"${f}",system-ui,sans-serif`;
const fnt=(t,s,w=800)=>`${w} ${s}px ${fam(t.font)}`;
function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function txt(g,t,s,x,y,size,color,o={}){if(!s)return 0;g.font=fnt(t,size,o.w||800);g.textAlign=o.align||'center';g.textBaseline='middle';
  if(o.shadow){g.save();g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=size*.35;g.shadowOffsetY=size*.08}
  if(o.stroke){g.lineJoin='round';g.lineWidth=size*.16;g.strokeStyle=o.stroke;g.strokeText(s,x,y)}g.fillStyle=color;g.fillText(s,x,y);if(o.shadow)g.restore();return g.measureText(s).width}
function width(g,t,s,size,w=800){g.font=fnt(t,size,w);return s?g.measureText(s).width:0}
function wrap(g,t,s,size,max,w=800){g.font=fnt(t,size,w);let out=[],line='';for(const word of String(s||'').split(/\s+/)){let tr=line?line+' '+word:word;if(line&&g.measureText(tr).width>max){out.push(line);line=word}else line=tr}if(line)out.push(line);return out.length?out:['']}
function star(g,x,y,r,ri=.45){g.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,R=i%2?r*ri:r;g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R)}g.closePath()}
function heart(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*1.1,y-s*.35,x-s*.45,y-s*1.05,x,y-s*.45);g.bezierCurveTo(x+s*.45,y-s*1.05,x+s*1.1,y-s*.35,x,y+s*.35);g.closePath()}
function arrow(g,len,head,thick){g.beginPath();g.moveTo(-thick/2,-len/2);g.lineTo(thick/2,-len/2);g.lineTo(thick/2,len/2-head);g.lineTo(head*.9,len/2-head);g.lineTo(0,len/2);g.lineTo(-head*.9,len/2-head);g.lineTo(-thick/2,len/2-head);g.closePath()}
function check(g,x,y,s,color,p){g.save();g.strokeStyle=color;g.lineWidth=s*.22;g.lineCap='round';g.lineJoin='round';g.beginPath();let pts=[[x-s*.45,y],[x-s*.12,y+s*.32],[x+s*.5,y-s*.35]],a=Math.min(1,p*2),b=C(p*2-1);g.moveTo(...pts[0]);g.lineTo(pts[0][0]+(pts[1][0]-pts[0][0])*a,pts[0][1]+(pts[1][1]-pts[0][1])*a);if(b>0)g.lineTo(pts[1][0]+(pts[2][0]-pts[1][0])*b,pts[1][1]+(pts[2][1]-pts[1][1])*b);g.stroke();g.restore()}
const pop=(g,k)=>g.scale(k,k);

// ---- The graphics. f: editable text/number fields; col: labels for c1..c3 (missing = unused).
const T=(k,label,def)=>({k,label,def}),N=(k,label,def,min,max,step)=>({k,label,def,num:true,min,max,step}),S=(k,label,def,opts)=>({k,label,def,opts});
const GFX=[
 {id:'hook',pack:'hooks',name:'Hook banner',len:3,x:50,y:22,f:[T('t1','Text','You NEED this 👇')],col:['Bar','Shadow','Text'],c:['#ffe14d','#ff3ea5','#111111'],
  draw(g,t,L){let s=7,w=Math.max(20,width(g,t,t.t1,s))+s*1.6,h=s*1.8,p=eo(L/.35);g.rotate(-.035);g.fillStyle=t.c2;g.fillRect(-w/2+1.2,-h/2+1.2,w*p,h);g.fillStyle=t.c1;g.fillRect(-w/2,-h/2,w*p,h);if(L>.18){pop(g,eb((L-.18)/.35));txt(g,t,t.t1,0,s*.06,s,t.c3)}}},
 {id:'type',pack:'hooks',name:'Typewriter title',len:4,x:50,y:28,f:[T('t1','Text','Here’s what nobody tells you…')],col:['Box','Cursor','Text'],c:['#111111','#22d3ee','#ffffff'],
  draw(g,t,L){let s=5.5,lines=wrap(g,t,t.t1,s,72),lh=s*1.3,w=Math.max(...lines.map(l=>width(g,t,l,s)))+s*1.4,h=lines.length*lh+s*.9,n=Math.floor(Math.max(0,L-.25)*22);
   g.globalAlpha*=eo(L/.25);g.fillStyle=t.c1;g.globalAlpha*=.82;rr(g,-w/2,-h/2,w,h,s*.4);g.fill();g.globalAlpha/=.82;let used=0,cx=0,cy=0;
   lines.forEach((l,i)=>{let shown=l.slice(0,Math.max(0,n-used));used+=l.length+1;let y=-h/2+s*.45+lh*(i+.5);let x=-w/2+s*.7;let ww=txt(g,t,shown,x,y,s,t.c3,{align:'left'});if(shown.length&&(shown.length<l.length||i===lines.length-1||n-used<0)){cx=x+ww;cy=y}if(!shown.length&&i===0){cx=x;cy=y}});
   if(Math.floor(L*2.4)%2===0){g.fillStyle=t.c2;g.fillRect(cx+s*.12,cy-s*.55,s*.14,s*1.1)}}},
 {id:'number',pack:'hooks',name:'Big number list',len:3.5,x:50,y:40,f:[T('n','Number','3'),T('t1','Text','things I love')],col:['Ring','Glow','Text'],c:['#ff3ea5','#ffe14d','#ffffff'],
  draw(g,t,L){let p=eo(L/.6);g.save();g.lineWidth=2.4;g.strokeStyle=t.c1;g.beginPath();g.arc(0,0,17,-Math.PI/2,-Math.PI/2+p*Math.PI*2);g.stroke();g.restore();
   g.save();pop(g,el(L/.9));txt(g,t,t.n,0,1,26,t.c3,{shadow:true});g.restore();g.save();g.globalAlpha*=eo((L-.45)/.4);g.translate(0,(1-eo((L-.45)/.4))*5);txt(g,t,t.t1,0,26,6,t.c3,{stroke:'#000000aa'});g.restore();
   g.globalAlpha*=.6*(1-C(L/.7));g.strokeStyle=t.c2;g.lineWidth=1.2;g.beginPath();g.arc(0,0,17+L*20,0,7);g.stroke()}},
 {id:'pov',pack:'hooks',name:'POV',len:3.5,x:50,y:30,f:[T('chip','Label','POV'),T('t1','Text','you finally found the perfect bag')],col:['Label','—','Text'],c:['#ff3ea5','#ffffff','#ffffff'],
  draw(g,t,L){let s=5.4,lines=wrap(g,t,t.t1,s,74),lh=s*1.25,cs=4.2,cw=width(g,t,t.chip,cs)+cs*1.4,top=-(lines.length*lh)/2-cs*1.2;
   g.save();g.globalAlpha*=eo(L/.3);g.translate(0,(1-eo(L/.3))*4);g.fillStyle=t.c1;rr(g,-cw/2,top-cs*.75,cw,cs*1.5,cs*.75);g.fill();txt(g,t,t.chip,0,top,cs,t.c2);g.restore();
   lines.forEach((l,i)=>{let d=.18+i*.12;g.save();g.globalAlpha*=eo((L-d)/.35);g.translate(0,(1-eo((L-d)/.35))*4);txt(g,t,l,0,-(lines.length-1)*lh/2+i*lh+cs*.4,s,t.c3,{stroke:'#000000',shadow:true});g.restore()})}},
 {id:'new',pack:'hooks',name:'Shiny badge',len:3,x:80,y:14,f:[T('t1','Text','NEW ✨')],col:['Badge','Shine','Text'],c:['#22c55e','#ffffff','#ffffff'],
  draw(g,t,L){let s=5,w=width(g,t,t.t1,s)+s*1.8,h=s*1.9;pop(g,eb(L/.4));g.rotate(-.06+Math.sin(L*3)*.03);g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,h/2);g.fill();
   g.save();rr(g,-w/2,-h/2,w,h,h/2);g.clip();let sx=-w/2-h+((L*1.1)%1.6)*(w+h*2)/1.2;g.globalAlpha*=.55;g.fillStyle=t.c2;g.beginPath();g.moveTo(sx,-h/2);g.lineTo(sx+h*.7,-h/2);g.lineTo(sx+h*.2,h/2);g.lineTo(sx-h*.5,h/2);g.fill();g.restore();txt(g,t,t.t1,0,s*.05,s,t.c3)}},

 {id:'price',pack:'shop',name:'Swinging price tag',len:4,x:72,y:30,f:[T('t1','Price','$29'),T('t2','Old price (leave empty to hide)','$49')],col:['Tag','Strike-through','Text'],c:['#ffe14d','#e11d48','#111111'],
  draw(g,t,L){pop(g,eb(L/.3));g.rotate(Math.sin(L*5.5)*.38*Math.exp(-L*1.6));g.strokeStyle='#ffffffcc';g.lineWidth=.5;g.beginPath();g.moveTo(0,-14);g.lineTo(0,-6);g.stroke();
   let w=30,h=t.t2?22:17,y0=-6;g.fillStyle=t.c1;g.beginPath();g.moveTo(0,y0-3);g.lineTo(w/2,y0+5);g.lineTo(w/2,y0+h);g.lineTo(-w/2,y0+h);g.lineTo(-w/2,y0+5);g.closePath();g.save();g.shadowColor='#0006';g.shadowBlur=3;g.shadowOffsetY=1;g.fill();g.restore();
   g.fillStyle='#00000055';g.beginPath();g.arc(0,y0+2.2,1.2,0,7);g.fill();let k=t.t2?9:9.5,py=y0+(t.t2?11:11.5);txt(g,t,t.t1,0,py,k,t.c3);
   if(t.t2){let ow=txt(g,t,t.t2,0,y0+18.2,4.4,t.c3,{w:600});g.strokeStyle=t.c2;g.lineWidth=.8;g.beginPath();g.moveTo(-ow/2-.6,y0+18.4);g.lineTo(ow/2+.6,y0+17.8);g.stroke()}}},
 {id:'sale',pack:'shop',name:'Sale burst',len:3.5,x:76,y:24,f:[T('t1','Big text','50%'),T('t2','Small text','OFF')],col:['Burst','Ring','Text'],c:['#e11d48','#ffe14d','#ffffff'],
  draw(g,t,L){pop(g,eb(L/.35)*(1+Math.sin(L*6)*.03));g.save();g.rotate(L*.5);g.fillStyle=t.c1;g.beginPath();for(let i=0;i<32;i++){let a=i*Math.PI/16,r=i%2?16.5:20;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.strokeStyle=t.c2;g.lineWidth=1;g.beginPath();g.arc(0,0,14,0,7);g.stroke();g.restore();g.rotate(-.12);txt(g,t,t.t1,0,-2.5,10,t.c3);txt(g,t,t.t2,0,6,5,t.c3)}},
 {id:'linkbio',pack:'shop',name:'Link in bio',len:4,x:50,y:72,f:[T('t1','Text','Link in bio'),S('dir','Arrow','down',[['down','Arrow points down'],['up','Arrow points up']])],col:['Button','Arrow','Text'],c:['#ffffff','#ff3ea5','#111111'],
  draw(g,t,L){let s=5.2,w=width(g,t,t.t1,s)+s*2.2,h=s*2.1,up=t.dir==='up';pop(g,eb(L/.35));g.save();g.shadowColor='#0005';g.shadowBlur=3;g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,h/2);g.fill();g.restore();txt(g,t,t.t1,0,s*.06,s,t.c3);
   let b=Math.abs(Math.sin(L*4.5))*3;g.save();g.translate(0,up?-h/2-9-b:h/2+9+b);if(up)g.rotate(Math.PI);g.fillStyle=t.c2;arrow(g,12,5.5,3);g.fill();g.restore()}},
 {id:'shop',pack:'shop',name:'Shop now button',len:4,x:50,y:78,f:[T('t1','Text','Shop now')],col:['Button','Pulse','Text'],c:['#111111','#ff3ea5','#ffffff'],
  draw(g,t,L){let s=5.4,w=width(g,t,t.t1,s)+s*3,h=s*2.2,ph=(L%1.3)/1.3,press=L>1.05&&L<1.3?.93:1;g.save();g.globalAlpha*=(1-ph)*.8;g.strokeStyle=t.c2;g.lineWidth=1;let e=ph*5;rr(g,-w/2-e,-h/2-e,w+e*2,h+e*2,h/2+e);g.stroke();g.restore();
   pop(g,eb(L/.35)*press);g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,h/2);g.fill();g.strokeStyle=t.c2;g.lineWidth=.6;g.stroke();txt(g,t,t.t1+' →',0,s*.06,s,t.c3);
   if(L>.5){let p=eo((L-.5)/.5);g.font=`${10}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText('👆',w*.28+(1-p)*12,h*.85+(1-p)*12)}}},
 {id:'coupon',pack:'shop',name:'Coupon code',len:4,x:50,y:70,f:[T('t1','Top line','USE CODE'),T('t2','Code','SAVE20'),T('t3','Bottom line','for 20% off')],col:['Ticket','Code','Text'],c:['#ffffff','#ff3ea5','#111111'],
  draw(g,t,L){g.translate((1-eo(L/.45))*90,0);g.rotate((1-eo(L/.45))*.2);let w=56,h=t.t3?28:22,r=3;g.fillStyle=t.c1;g.beginPath();g.moveTo(-w/2,-h/2);g.lineTo(w/2,-h/2);g.lineTo(w/2,-r);g.arc(w/2,0,r,-Math.PI/2,Math.PI/2,true);g.lineTo(w/2,h/2);g.lineTo(-w/2,h/2);g.lineTo(-w/2,r);g.arc(-w/2,0,r,Math.PI/2,-Math.PI/2,true);g.closePath();g.save();g.shadowColor='#0006';g.shadowBlur=4;g.fill();g.restore();
   g.setLineDash([1.6,1.2]);g.strokeStyle=t.c2;g.lineWidth=.5;g.strokeRect(-w/2+2.5,-h/2+2.5,w-5,h-5);g.setLineDash([]);let top=-h/2+6;txt(g,t,t.t1,0,top,3.6,t.c3,{w:700});g.save();if(L>.5)pop(g,1+Math.max(0,Math.sin((L-.5)*6))*.04*Math.exp(-(L-.5)));txt(g,t,t.t2,0,top+8,9,t.c2);g.restore();txt(g,t,t.t3,0,top+15.5,3.4,t.c3,{w:600})}},

 {id:'stars',pack:'review',name:'Star rating',len:3.5,x:50,y:72,f:[N('n','Stars (0–5)',4.5,0,5,.5),T('t1','Text','4.5 / 5'),T('t2','Small text','my honest rating')],col:['Stars','Empty stars','Text'],c:['#ffc107','#52525b','#ffffff'],
  draw(g,t,L){let n=Math.max(0,Math.min(5,+t.n||0)),r=5.2,gap=12;for(let i=0;i<5;i++){let x=(i-2)*gap,d=.1+i*.14,k=eb((L-d)/.3);if(k<=0)continue;g.save();g.translate(x,-3);pop(g,k);g.fillStyle=t.c2;star(g,0,0,r);g.fill();let f=C(n-i);if(f>0&&L>d+.12){g.save();star(g,0,0,r);g.clip();g.fillStyle=t.c1;g.fillRect(-r,-r,r*2*f,r*2);g.restore()}g.restore()}
   g.save();g.globalAlpha*=eo((L-.85)/.35);txt(g,t,t.t1,0,8,5.5,t.c3,{shadow:true});txt(g,t,t.t2,0,14,3.5,t.c3,{w:600,shadow:true});g.restore()}},
 {id:'checklist',pack:'review',name:'Pros checklist',len:5,x:50,y:62,f:[T('t1','Line 1','Super soft'),T('t2','Line 2','True to size'),T('t3','Line 3','Under $30'),T('t4','Line 4','')],col:['Card','Ticks','Text'],c:['#ffffff','#22c55e','#111111'],
  draw(g,t,L){let items=[t.t1,t.t2,t.t3,t.t4].filter(Boolean),s=4.6,lh=s*2.1,w=Math.max(40,...items.map(i=>width(g,t,i,s,700)))+s*4.6,h=items.length*lh+s*1.4;pop(g,eb(L/.35));
   g.save();g.shadowColor='#0006';g.shadowBlur=4;g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,s*.8);g.fill();g.restore();
   items.forEach((it,i)=>{let d=.4+i*.45,p=C((L-d)/.35),y=-h/2+s*.7+lh*(i+.5),x=-w/2+s*1.8;if(p<=0)return;g.save();g.fillStyle=t.c2;g.globalAlpha*=.18;g.beginPath();g.arc(x,y,s*.95,0,7);g.fill();g.restore();check(g,x,y,s*1.1,t.c2,p);g.save();g.globalAlpha*=p;txt(g,t,it,x+s*1.6+(1-p)*3,y,s,t.c3,{align:'left',w:700});g.restore()})}},
 {id:'callout',pack:'review',name:'Product callout',len:3.5,x:40,y:55,f:[T('t1','Label','Waterproof!'),S('dir','Label side','right',[['right','Label on the right'],['left','Label on the left']])],col:['Label','Dot and line','Text'],c:['#ffffff','#ff3ea5','#111111'],
  draw(g,t,L){let sg=t.dir==='left'?-1:1,ring=(L%1.4)/1.4;g.save();g.globalAlpha*=1-ring;g.strokeStyle=t.c2;g.lineWidth=.6;g.beginPath();g.arc(0,0,1.6+ring*5,0,7);g.stroke();g.restore();
   g.save();pop(g,eb(L/.25));g.fillStyle=t.c2;g.beginPath();g.arc(0,0,1.6,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=.5;g.stroke();g.restore();
   let p=eo((L-.15)/.4),a=[sg*10,-10],b=[sg*24,-10];g.strokeStyle=t.c2;g.lineWidth=.7;g.beginPath();g.moveTo(0,0);let p1=Math.min(1,p*2),p2=C(p*2-1);g.lineTo(a[0]*p1,a[1]*p1);if(p2>0)g.lineTo(a[0]+(b[0]-a[0])*p2,a[1]);g.stroke();
   let k=eb((L-.5)/.3);if(k>0){let s=4.4,w=width(g,t,t.t1,s,700)+s*1.6,h=s*1.9;g.save();g.translate(b[0]+sg*w/2,b[1]);pop(g,k);g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,s*.5);g.fill();g.strokeStyle=t.c2;g.lineWidth=.5;g.stroke();txt(g,t,t.t1,0,s*.05,s,t.c3,{w:700});g.restore()}}},
 {id:'stamp',pack:'review',name:'Verdict stamp',len:3,x:50,y:45,f:[T('t1','Text','WORTH IT')],col:['Stamp','—','—'],c:['#e11d48','#ffffff','#ffffff'],
  draw(g,t,L){let p=C(L/.22),k=2.6-1.6*ei(p),sh=L>.22&&L<.45?Math.sin(L*90)*.6*(1-(L-.22)/.23):0;g.globalAlpha*=C(L/.12)*.92;g.translate(sh,sh*.5);g.rotate(-.18);pop(g,k);
   let s=9,w=width(g,t,t.t1,s,900)+s*1.4,h=s*1.8;g.strokeStyle=t.c1;g.lineWidth=1.2;rr(g,-w/2,-h/2,w,h,1.5);g.stroke();g.lineWidth=.5;rr(g,-w/2+1.4,-h/2+1.4,w-2.8,h-2.8,1);g.stroke();txt(g,t,t.t1,0,s*.06,s,t.c1,{w:900})}},
 {id:'beforeafter',pack:'review',name:'Before / After labels',full:true,len:5,x:50,y:8,f:[T('t1','Left label','BEFORE'),T('t2','Right label','AFTER')],col:['Labels','Divider','Text'],c:['#111111','#ffffff','#ffffff'],noScale:false,
  draw(g,t,L,W,H){let U=Math.min(W,H)/100*(t.scale||1),dx=W*(t.x/100)*eo(L/.6),y=H*t.y/100;g.fillStyle=t.c2;g.fillRect(dx-U*.35,0,U*.7,H);g.beginPath();g.arc(dx,H/2,U*3,0,7);g.fill();g.fillStyle=t.c1;g.font=`700 ${U*3}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText('⇆',dx,H/2);
   const lab=(s,x,d)=>{let k=eb((L-d)/.35);if(k<=0)return;let sz=U*4,w=width(g,t,s,sz)+sz*1.4,h=sz*1.7;g.save();g.translate(x,y);pop(g,k);g.globalAlpha*=.88;g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,sz*.4);g.fill();g.globalAlpha/=.88;txt(g,t,s,0,sz*.06,sz,t.c3);g.restore()};
   lab(t.t1,W*.25,.5);lab(t.t2,W*.75,.7)}},

 {id:'subscribe',pack:'social',name:'Subscribe button',len:4,x:50,y:78,f:[T('t1','Button text','SUBSCRIBE'),T('t2','After the tap','SUBSCRIBED')],col:['Button','After the tap','Text'],c:['#ff0000','#3f3f46','#ffffff'],
  draw(g,t,L){let done=L>1.25,s=5,label=done?t.t2:t.t1,w=Math.max(width(g,t,t.t1,s),width(g,t,t.t2,s))+s*2.4,h=s*2.2,press=L>1.15&&L<1.4?.92:1;pop(g,eb(L/.35));
   g.save();pop(g,press);g.fillStyle=done?t.c2:t.c1;rr(g,-w/2,-h/2,w,h,s*.45);g.fill();txt(g,t,label,0,s*.06,s,t.c3);g.restore();
   let bx=w/2+7,ring=done?Math.sin((L-1.25)*25)*.5*Math.exp(-(L-1.25)*2.2):0;g.save();g.translate(bx,0);g.rotate(ring);g.font='9px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('🔔',0,0);g.restore();
   if(L>.4&&L<2.2){let p=eo((L-.4)/.7),x=w*.15+(1-p)*25,y=h*.25+(1-p)*18;g.save();g.globalAlpha*=1-C((L-1.8)/.4);g.translate(x,y);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=.5;g.beginPath();g.moveTo(0,0);g.lineTo(0,9);g.lineTo(2.4,6.6);g.lineTo(4.2,10.4);g.lineTo(5.6,9.7);g.lineTo(3.8,6);g.lineTo(7,6);g.closePath();g.fill();g.stroke();g.restore()}}},
 {id:'heart',pack:'social',name:'Heart burst',len:3,x:50,y:45,f:[T('t1','Text (optional)','Double tap ❤')],col:['Heart','Little hearts','Text'],c:['#ff2d55','#ff8fb1','#ffffff'],
  draw(g,t,L){for(let i=0;i<9;i++){let d=.15+rnd(i)*.5,p=C((L-d)/1.3);if(p<=0||p>=1)continue;let x=(rnd(i+9)-.5)*34,y=-6-p*30,s=2+rnd(i+3)*2.5;g.save();g.globalAlpha*=1-p;g.fillStyle=t.c2;heart(g,x+Math.sin(p*8+i)*2,y,s);g.fill();g.restore()}
   g.save();pop(g,el(L/.8)*(1+Math.sin(L*7)*.025));g.fillStyle=t.c1;g.shadowColor='#0005';g.shadowBlur=4;heart(g,0,0,14);g.fill();g.restore();g.save();g.globalAlpha*=eo((L-.5)/.4);txt(g,t,t.t1,0,15,5,t.c3,{stroke:'#000000aa'});g.restore()}},
 {id:'comment',pack:'social',name:'Comment bubble',len:4,x:50,y:28,f:[T('t1','Name','@bestie'),T('t2','Comment','Where did you get this?! 😍')],col:['Bubble','Picture circle','Text'],c:['#ffffff','#ff3ea5','#111111'],
  draw(g,t,L){let s=4,lines=wrap(g,t,t.t2,s,48,600),w=Math.max(46,...lines.map(l=>width(g,t,l,s,600))+s*3)+12,h=lines.length*s*1.35+s*3.6;g.globalAlpha*=eo(L/.35);g.translate(0,(1-eo(L/.35))*8);
   g.save();g.shadowColor='#0005';g.shadowBlur=4;g.fillStyle=t.c1;rr(g,-w/2,-h/2,w,h,s*1.1);g.fill();g.beginPath();g.moveTo(-w/2+10,h/2-1);g.lineTo(-w/2+7,h/2+4);g.lineTo(-w/2+15,h/2-1);g.fill();g.restore();
   g.fillStyle=t.c2;g.beginPath();g.arc(-w/2+6.5,-h/2+6,3.6,0,7);g.fill();txt(g,t,(t.t1||'@').replace('@','').slice(0,1).toUpperCase(),-w/2+6.5,-h/2+6.2,3.6,'#ffffff');
   txt(g,t,t.t1,-w/2+12,-h/2+4.6,3.2,t.c3,{align:'left',w:800});lines.forEach((l,i)=>txt(g,t,l,-w/2+12,-h/2+9.3+i*s*1.35,s,t.c3,{align:'left',w:600}))}},
 {id:'lower',pack:'social',name:'Name lower third',len:4,x:8,y:84,f:[T('t1','Name','@yourhandle'),T('t2','Subtitle','UGC creator')],col:['Bar','Accent','Text'],c:['#111111','#ff3ea5','#ffffff'],
  draw(g,t,L){let s=5,w=Math.max(width(g,t,t.t1,s),width(g,t,t.t2,3.4,600))+s*2.4,h=t.t2?s*3.1:s*2;let a=eo(L/.3),b=eo((L-.2)/.45);g.fillStyle=t.c2;g.fillRect(0,-h/2,1.6*a,h);
   g.save();g.beginPath();g.rect(1.6,-h/2-1,w+2,h+2);g.clip();g.translate(-(1-b)*(w+2),0);g.globalAlpha*=.9;g.fillStyle=t.c1;g.fillRect(1.6,-h/2,w,h);g.globalAlpha/=.9;let ty=t.t2?-h/2+s*1.1:0;txt(g,t,t.t1,1.6+s*1.1,ty,s,t.c3,{align:'left'});txt(g,t,t.t2,1.6+s*1.1,ty+s*1.15,3.4,t.c3,{align:'left',w:600});g.restore()}},

 {id:'progress',pack:'structure',name:'Progress bar',full:true,len:10,x:50,y:0,f:[S('edge','Where','top',[['top','Top edge'],['bottom','Bottom edge']])],col:['Fill','Track','—'],c:['#ff3ea5','#ffffff','#ffffff'],
  draw(g,t,L,W,H,len){let th=Math.max(3,Math.min(W,H)*.012*(t.scale||1)),y=t.edge==='bottom'?H-th:0;g.globalAlpha*=.35;g.fillStyle=t.c2;g.fillRect(0,y,W,th);g.globalAlpha/=.35;g.fillStyle=t.c1;g.fillRect(0,y,W*C(L/len),th)},noOut:true},
 {id:'step',pack:'structure',name:'Step label',len:3.5,x:12,y:20,f:[T('n','Step number','1'),T('t1','Text','Clean the surface')],col:['Circle','Label','Text'],c:['#ff3ea5','#111111','#ffffff'],
  draw(g,t,L){let s=4.6,r=5,w=width(g,t,t.t1,s,700)+s*2.2,p=eo((L-.3)/.45);g.save();g.beginPath();g.rect(r,-r-1,(w+r)*p+1,r*2+2);g.clip();g.globalAlpha*=.9;g.fillStyle=t.c2;rr(g,0,-s*1.05,w+r,s*2.1,s*1.05);g.fill();g.globalAlpha/=.9;txt(g,t,t.t1,r+s*.9,s*.05,s,t.c3,{align:'left',w:700});g.restore();
   g.save();pop(g,el(L/.6));g.fillStyle=t.c1;g.beginPath();g.arc(0,0,r,0,7);g.fill();txt(g,t,t.n,0,.2,5.6,'#ffffff');g.restore()}},
 {id:'countdown',pack:'structure',name:'3-2-1 countdown',len:4,x:50,y:45,f:[T('t1','Last word','GO!')],col:['Ring','Circle','Text'],c:['#ff3ea5','#111111','#ffffff'],
  draw(g,t,L){let i=Math.floor(L),f=L-i,label=i<3?String(3-i):t.t1;g.globalAlpha*=.75;g.fillStyle=t.c2;g.beginPath();g.arc(0,0,16,0,7);g.fill();g.globalAlpha/=.75;if(i<3){g.strokeStyle=t.c1;g.lineWidth=2;g.beginPath();g.arc(0,0,16,-Math.PI/2,-Math.PI/2+(1-f)*Math.PI*2);g.stroke()}
   g.save();pop(g,eb(f/.3)*(i<3?1:1.1));txt(g,t,label,0,1,i<3?18:11,t.c3);g.restore()}},
 {id:'emoji',pack:'structure',name:'Emoji rain',full:true,len:4,x:50,y:50,f:[T('t1','Emojis','🔥💸✨')],col:[],c:['#ffffff','#ffffff','#ffffff'],
  draw(g,t,L,W,H){let em=[...(t.t1||'✨')].filter(c=>c.trim()&&c!=='️'),n=Math.round(18*(t.scale||1)),U=Math.min(W,H)/100;if(!em.length)return;g.textAlign='center';g.textBaseline='middle';
   for(let i=0;i<n;i++){let sp=.18+rnd(i)*.22,y=((L*sp+rnd(i+50))%1.25-.12)*H,x=rnd(i+100)*W+Math.sin(L*2+i)*U*2,sz=U*(4+rnd(i+7)*4);g.save();g.translate(x,y);g.rotate(Math.sin(L*2+i)*.3);g.font=`${sz}px system-ui`;g.fillText(em[i%em.length],0,0);g.restore()}}},
 {id:'confetti',pack:'structure',name:'Confetti pop',full:true,len:3,x:50,y:60,f:[],col:['Colour 1','Colour 2','Colour 3'],c:['#ff3ea5','#ffe14d','#22d3ee'],
  draw(g,t,L,W,H){let U=Math.min(W,H)/100,ox=W*t.x/100,oy=H*t.y/100,cols=[t.c1,t.c2,t.c3,'#ffffff'],n=Math.round(70*(t.scale||1));
   for(let i=0;i<n;i++){let a=-Math.PI/2+(rnd(i)-.5)*2.2,v=U*(55+rnd(i+1)*55),x=ox+Math.cos(a)*v*L*(1-L*.12),y=oy+Math.sin(a)*v*L+U*38*L*L,sz=U*(1+rnd(i+2)*1.4);g.save();g.translate(x,y);g.rotate(L*(4+rnd(i+3)*8));g.scale(1,Math.cos(L*(6+rnd(i+4)*6)));g.fillStyle=cols[i%4];g.fillRect(-sz/2,-sz/4,sz,sz/2);g.restore()}}},
];
const PACKS=[['hooks','Hooks & titles'],['shop','Shop & affiliate'],['review','Reviews'],['social','Social'],['structure','Steps & fun']];
const byId=id=>GFX.find(x=>x.id===id);
const isGfx=t=>t&&t.type==='gfx'&&byId(t.gfx);
window.VE_GFX=GFX;

// Draws one graphic track at `L` seconds in.
function drawGfx(g,t,L,W,H){let p=byId(t.gfx);if(!p)return null;g.save();
  if(!p.noOut)g.globalAlpha*=C((t.length-L)/.3);
  if(p.full){p.draw(g,t,L,W,H,t.length);g.restore();return null}
  let U=Math.min(W,H)/100*(t.scale||1),cx=W*t.x/100,cy=H*t.y/100;g.translate(cx,cy);g.scale(U,U);g.rotate((t.rotation||0)*Math.PI/180);p.draw(g,t,L,W,H,t.length);g.restore();
  return {cx,cy,r:U*22};
}
window.veDrawGfx=drawGfx;
let selGfx=null;const bounds=new Map();
const drawBefore=draw;draw=function(){drawBefore();let W=canvas.width,H=canvas.height;bounds.clear();
  for(const t of graphicTracks){if(!isGfx(t)||t.hidden)continue;let L=playhead-t.offset;if(L<0||L>=t.length)continue;let b=drawGfx(ctx,t,L,W,H);if(b)bounds.set(t.id,b)}
  if(selGfx&&!exporting&&bounds.has(selGfx)){let b=bounds.get(selGfx);ctx.save();ctx.setLineDash([8,6]);ctx.lineWidth=2;ctx.strokeStyle='#ff3ea5';ctx.strokeRect(b.cx-b.r,b.cy-b.r,b.r*2,b.r*2);ctx.restore()}};
const exportBefore=exportVideo;exportVideo=async function(...a){let s=selGfx;selGfx=null;try{await Promise.all(graphicTracks.filter(isGfx).map(t=>document.fonts.load(fnt(t,64))))}catch{}try{return await exportBefore.apply(this,a)}finally{selGfx=s}};

// ---- Drag a graphic on the preview (before the text/shape handlers see the touch).
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(exporting||e.button!==0)return;let p=canvasPoint(e),hit=null;for(const [id,b] of [...bounds].reverse())if(Math.abs(p.x-b.cx)<b.r&&Math.abs(p.y-b.cy)<b.r){hit=id;break}
  if(!hit){if(selGfx){selGfx=null;draw()}return}let t=graphicTracks.find(t=>t.id===hit);e.stopImmediatePropagation();e.preventDefault();pause();selGfx=hit;drag={id:hit,p,x:t.x,y:t.y,pid:e.pointerId};canvas.setPointerCapture(e.pointerId);draw()},{capture:true});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pid)return;e.stopImmediatePropagation();e.preventDefault();let t=graphicTracks.find(t=>t.id===drag.id);if(!t)return;let p=canvasPoint(e);t.x=Math.round(C((drag.x+(p.x-drag.p.x)/canvas.width*100)/100)*1000)/10;t.y=Math.round(C((drag.y+(p.y-drag.p.y)/canvas.height*100)/100)*1000)/10;draw()},{capture:true});
const endDrag=e=>{if(!drag||e.pointerId!==drag.pid)return;e.stopImmediatePropagation();drag=null;renderGraphicTracks()};
canvas.addEventListener('pointerup',endDrag,{capture:true});canvas.addEventListener('pointercancel',endDrag,{capture:true});

// ---- Picker: packs of cards that play a live preview.
const css=document.createElement('style');css.textContent=`#gfxDialog{width:min(760px,96vw)}.gfx-tabs{display:flex;gap:6px;overflow-x:auto;margin:6px 0 12px;padding-bottom:2px}.gfx-tabs button{white-space:nowrap}.gfx-tabs button.on{background:#ff3ea5;color:#fff;border-color:#ff3ea5}
.gfx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.gfx-card{padding:0!important;overflow:hidden;border-radius:12px!important;text-align:left;display:flex;flex-direction:column}.gfx-card canvas{width:100%;display:block;background:linear-gradient(160deg,#4b4b63,#1b1b25)}.gfx-card span{display:block;padding:7px 9px;font-size:12px;font-weight:700}
.duration-strip[data-kind="gfx"]{background:linear-gradient(90deg,#ff3ea5,#8b5cf6)!important;color:#fff!important}.gfx-panel{display:flex;flex-direction:column;gap:10px;padding:4px 0}.gfx-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gfx-head b{flex:1;min-width:120px}
.gfx-fields{display:flex;flex-wrap:wrap;gap:10px}.gfx-fields label{display:flex;flex-direction:column;gap:4px;flex:1 1 150px;font-size:12px}.gfx-fields label.wide{flex-basis:100%}.gfx-pos{display:grid;grid-template-columns:repeat(3,34px);gap:3px}.gfx-pos button{padding:4px!important;font-size:12px;min-width:0}`;document.head.appendChild(css);
const dlg=document.createElement('dialog');dlg.id='gfxDialog';dlg.className='closable';dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>Animated graphics</h2><p class="sub">Tap one to add it at the playhead. Then drag it on the preview and change its words and colours on the timeline.</p><div class="gfx-tabs"></div><div class="gfx-grid"></div>`;document.body.appendChild(dlg);
let pack='hooks',replaceId=null,raf=0;
dlg.querySelector('.dialog-x').onclick=()=>dlg.close();dlg.addEventListener('close',()=>{cancelAnimationFrame(raf);replaceId=null});
function fill(){let tabs=dlg.querySelector('.gfx-tabs');tabs.innerHTML='';for(const [k,n] of PACKS){let b=document.createElement('button');b.type='button';b.textContent=n;if(k===pack)b.className='on';b.onclick=()=>{pack=k;fill()};tabs.appendChild(b)}
  let grid=dlg.querySelector('.gfx-grid');grid.innerHTML='';let W=canvas.width,H=canvas.height,cw=260,ch=Math.round(cw*Math.min(1.78,H/W));
  for(const p of GFX.filter(p=>p.pack===pack)){let b=document.createElement('button');b.type='button';b.className='gfx-card';let c=document.createElement('canvas');c.width=cw;c.height=ch;b.append(c);let s=document.createElement('span');s.textContent=p.name;b.append(s);b.onclick=()=>addGfx(p.id);b._p=p;grid.appendChild(b)}
  cancelAnimationFrame(raf);let t0=performance.now();const tick=now=>{let L=(now-t0)/1000;for(const b of grid.children){let p=b._p,c=b.firstChild,g=c.getContext('2d'),t=defaults(p),len=Math.min(p.len,4);if(!p.full){t.x=50;t.y=50;t.scale=1.7}else if(p.id==='progress')t.scale=2;t.length=len+.8;g.clearRect(0,0,c.width,c.height);drawGfx(g,t,(L%(len+.8)),c.width,c.height)}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
function brand(){try{return (JSON.parse(localStorage.getItem('tapshop-brand-colors'))||[]).filter(x=>/^#[0-9a-f]{6}$/i.test(x))}catch{return []}}
function defaults(p){let t={type:'gfx',gfx:p.id,name:p.name,x:p.x,y:p.y,scale:1,rotation:0,c1:p.c[0],c2:p.c[1],c3:p.c[2],font:'system-ui',length:p.len};for(const f of p.f)t[f.k]=f.def;return t}
function addGfx(id){let p=byId(id);if(!p)return;if(typeof snapshot==='function')snapshot();
  if(replaceId){let t=graphicTracks.find(t=>t.id===replaceId);if(t){let keep={id:t.id,offset:t.offset,length:t.length,hidden:t.hidden};Object.keys(t).forEach(k=>delete t[k]);Object.assign(t,defaults(p),keep);finish(t);return}}
  let t={id:uid(),...defaults(p),offset:Math.max(0,Math.round(playhead*10)/10),hidden:false};
  let room=total()-t.offset;if(p.id==='progress'&&total()>0){t.offset=0;t.length=Math.max(1,Math.round(total()*10)/10)}else if(room>.5&&room<t.length)t.length=Math.round(room*10)/10;
  let b=brand();if(b.length&&['hook','type','number','new','shop','linkbio','lower','step','progress','countdown'].includes(p.id)){t.c1=b[0];if(b[1]&&p.col[1]&&p.col[1]!=='—')t.c2=b[1]}
  graphicTracks.push(t);finish(t);toast(p.name+' added. Drag it on the preview to place it.')}
function finish(t){dlg.close();selGfx=t.id;try{expandedStrip=t.id}catch{}if(!playing){let mid=t.offset+Math.min(t.length*.6,1.5);if(playhead<t.offset||playhead>=t.offset+t.length)seekTimeline(Math.min(mid,total()))}renderGraphicTracks();draw()}
window.openGfx=function(id){replaceId=id||null;fill();dlg.showModal()};

// ---- The track's options on the timeline.
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.gfxSet=function(id,k,v,live){let t=graphicTracks.find(t=>t.id===id);if(!t)return;t[k]=v;selGfx=id;if(live)draw();else{renderGraphicTracks();draw()}};
window.gfxPlace=function(id,x,y){let t=graphicTracks.find(t=>t.id===id);if(!t)return;let p=byId(t.gfx);if(p.id==='lower'){x=x===50?30:x===85?60:8}t.x=x;t.y=y;selGfx=id;renderGraphicTracks();draw()};
function panel(t){let p=byId(t.gfx),id=t.id,fonts=typeof TEXT_FONTS!=='undefined'?TEXT_FONTS:[{family:'system-ui',label:'System'}],hasText=p.f.some(f=>!f.num&&!f.opts);
  let f=p.f.map(x=>x.opts?`<label>${enc(x.label)}<select onchange="gfxSet('${id}','${x.k}',this.value)">${x.opts.map(([v,n])=>`<option value="${enc(v)}"${t[x.k]===v?' selected':''}>${enc(n)}</option>`).join('')}</select></label>`
    :x.num?`<label>${enc(x.label)}<input type="number" min="${x.min}" max="${x.max}" step="${x.step}" value="${enc(t[x.k])}" oninput="gfxSet('${id}','${x.k}',+this.value,true)"></label>`
    :`<label class="${String(x.def).length>14?'wide':''}">${enc(x.label)}<input type="text" value="${enc(t[x.k])}" oninput="gfxSet('${id}','${x.k}',this.value,true)" onchange="gfxSet('${id}','${x.k}',this.value)"></label>`).join('');
  let cols=['c1','c2','c3'].map((k,i)=>p.col[i]&&p.col[i]!=='—'?`<label>${enc(p.col[i])}<input type="color" value="${enc(t[k])}" oninput="gfxSet('${id}','${k}',this.value,true)" onchange="gfxSet('${id}','${k}',this.value)"></label>`:'').join('');
  let pos=p.full&&p.id!=='confetti'?'':`<label>Quick place<span class="gfx-pos">${[[15,15,'↖'],[50,15,'↑'],[85,15,'↗'],[15,50,'←'],[50,50,'•'],[85,50,'→'],[15,85,'↙'],[50,85,'↓'],[85,85,'↘']].map(([x,y,a])=>`<button type="button" onclick="gfxPlace('${id}',${x},${y})" aria-label="Place ${a}">${a}</button>`).join('')}</span></label>`;
  let sizeLabel=p.id==='emoji'||p.id==='confetti'?'Amount':p.id==='progress'?'Thickness':'Size';
  return `<div class="gfx-panel"><div class="gfx-head"><b>✨ ${enc(p.name)}</b><button type="button" onclick="openGfx('${id}')">Change graphic</button><button type="button" onclick="editGraphic('${id}','hidden',${!t.hidden})">${t.hidden?'Show':'Hide'}</button><button type="button" onclick="removeGraphic('${id}')">Delete</button></div>
  <div class="gfx-fields">${f}${cols}${hasText?`<label>Font<select onchange="gfxSet('${id}','font',this.value)">${fonts.map(o=>`<option value="${enc(o.family)}"${t.font===o.family?' selected':''}>${enc(o.label)}</option>`).join('')}</select></label>`:''}
  <label>${sizeLabel} <small>${Math.round((t.scale||1)*100)}%</small><input type="range" min=".4" max="2.5" step=".05" value="${t.scale||1}" oninput="this.previousElementSibling.textContent=Math.round(this.value*100)+'%';gfxSet('${id}','scale',+this.value,true)"></label>
  ${p.full&&p.id!=='confetti'&&p.id!=='beforeafter'?'':`<label>Across ←→ <small>${Math.round(t.x)}%</small><input type="range" min="0" max="100" step="1" value="${t.x}" oninput="this.previousElementSibling.textContent=this.value+'%';gfxSet('${id}','x',+this.value,true)"></label><label>Up ↑↓ <small>${Math.round(t.y)}%</small><input type="range" min="0" max="100" step="1" value="${t.y}" oninput="this.previousElementSibling.textContent=this.value+'%';gfxSet('${id}','y',+this.value,true)"></label>`}
  ${p.full?'':`<label>Tilt <small>${t.rotation||0}°</small><input type="range" min="-45" max="45" step="1" value="${t.rotation||0}" oninput="this.previousElementSibling.textContent=this.value+'°';gfxSet('${id}','rotation',+this.value,true)"></label>`}
  ${pos}<label>Start (s)<input type="number" min="0" step=".1" value="${t.offset}" onchange="editGraphic('${id}','offset',+this.value)"></label><label>Duration (s)<input type="number" min=".1" step=".1" value="${t.length}" onchange="editGraphic('${id}','length',+this.value)"></label></div></div>`}
const renderBefore=renderGraphicTracks;renderGraphicTracks=function(){renderBefore();for(const t of graphicTracks){if(!isGfx(t))continue;let box=document.querySelector(`#graphicTracks .strip-row[data-trackid="${t.id}"] .strip-options`);if(box)box.innerHTML=panel(t)}};

// ---- "✨ Graphics" button in the timeline bar, next to the effects track.
let fx=[...document.querySelectorAll('.timebar button')].find(b=>(b.getAttribute('onclick')||'').includes("addGraphicTrack('effect')"));
let btn=document.createElement('button');btn.type='button';btn.textContent='🎬 Graphics';btn.title='Animated graphics: hooks, price tags, link in bio, ratings and more';btn.onclick=()=>openGfx();
if(fx)fx.after(btn);else document.querySelector('.timebar')?.appendChild(btn);
})();
