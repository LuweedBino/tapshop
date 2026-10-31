// TapShop colour picker: replaces the browser's own picker (which on phones only offers a few
// colours) for every <input type="color"> on the page. It writes back through the input itself
// (value + input/change events), so existing handlers keep working. When the colour has a
// see-through slider next to it, the picker shows a Transparency slider that drives that slider.
(function(){
const PRESETS=['#000000','#292135','#5b5b66','#a1a1aa','#e4e4e7','#ffffff','#ff3b30','#ff3ea5','#ff9500','#ffd60a','#34c759','#00c7be','#32ade6','#0a84ff','#5e5ce6','#9b6cf0','#bf5af2','#a2845e','#f5e6d3','#1c1c1e'];
const RECENT_KEY='tapshop-recent-colors',BRAND_KEY='tapshop-brand-colors',BRAND_MAX=20;
// Which see-through slider belongs to which colour (design studio + video editor).
const ALPHA_RULES=[
 [i=>i.id==='elg2',()=>document.querySelector('#props input[aria-label="Transparency"]')],
 [i=>i.id==='bg'||i.id==='bg2',()=>document.getElementById('bgOp')],
 [i=>/update\('fill'/.test(i.getAttribute('oninput')||''),()=>document.querySelector('#props input[aria-label="Transparency"]')],
 [i=>/update\('boxFill'/.test(i.getAttribute('oninput')||''),i=>i.parentElement?.querySelector('input[aria-label="Background see-through"]')],
 [i=>/editGraphic\('[^']+','boxColor'/.test(i.getAttribute('oninput')||''),i=>trackRange(i,'boxOpacity')],
 [i=>/editGraphic\('[^']+','gradTo'/.test(i.getAttribute('oninput')||''),i=>trackRange(i,'opacity')],
 [i=>/editGraphic\('[^']+','color'/.test(i.getAttribute('oninput')||''),i=>trackRange(i,'opacity')],
];
function trackRange(i,key){let id=/editGraphic\('([^']+)'/.exec(i.getAttribute('oninput'))[1];return document.querySelector(`input[type=range][oninput*="editGraphic('${id}','${key}'"]`)}
const alphaFor=i=>{for(const [test,find] of ALPHA_RULES)if(test(i)){let r=find(i);if(r)return r}return null};

const CHK='linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)';
// Panels can be rebuilt while the picker is open; find the same control again by its handler.
function live(el){if(!el||document.contains(el))return el;let h=el.getAttribute('oninput'),id=el.id;if(id&&document.getElementById(id))return document.getElementById(id);if(h)for(const x of document.querySelectorAll(`input[type=${el.type}]`))if(x.getAttribute('oninput')===h)return x;return el}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hexToRgb(h){h=String(h||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(h))h=h.split('').map(c=>c+c).join('');if(!/^[0-9a-f]{6}$/i.test(h))return null;return [0,2,4].map(k=>parseInt(h.slice(k,k+2),16))}
const rgbToHex=(r,g,b)=>'#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;let mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return [h,mx?d/mx:0,mx]}
function hsvToRgb(h,s,v){let c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,[r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return [(r+m)*255,(g+m)*255,(b+m)*255]}
function recent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]').filter(c=>hexToRgb(c)).slice(0,10)}catch{return []}}
function brand(){try{return JSON.parse(localStorage.getItem(BRAND_KEY)||'[]').filter(c=>hexToRgb(c)).slice(0,BRAND_MAX)}catch{return []}}
function setBrand(a){try{localStorage.setItem(BRAND_KEY,JSON.stringify(a.slice(0,BRAND_MAX)))}catch{}}
function remember(hex){try{localStorage.setItem(RECENT_KEY,JSON.stringify([hex,...recent().filter(c=>c!==hex)].slice(0,10)))}catch{}}

let box=null,cur=null;
function css(){if(document.getElementById('cpk-css'))return;let st=document.createElement('style');st.id='cpk-css';st.textContent=`
.cpk{position:fixed;z-index:10000;width:236px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;box-sizing:border-box;padding:9px;border-radius:14px;background:#fff;color:#292135;box-shadow:0 12px 40px #0004;font:12px system-ui,sans-serif;display:grid;grid-template-columns:minmax(0,1fr);gap:7px;touch-action:none;user-select:none;-webkit-user-select:none}
.cpk.dark{background:#211d2b;color:#f2eff8}
.cpk.sheet{left:8px!important;right:8px;bottom:8px;top:auto!important;width:auto;max-width:none;max-height:55vh;overflow:auto}
.cpk-sv{position:relative;height:96px;border-radius:8px;cursor:crosshair;background:linear-gradient(transparent,#000),linear-gradient(90deg,#fff,transparent)}
.cpk-sv i,.cpk-row i.k{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #0006,0 2px 6px #0005;pointer-events:none;box-sizing:border-box}
.cpk input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:12px;border-radius:99px;margin:0;outline:none;border:1px solid #0002}
.cpk input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 0 0 1px #0006,0 2px 5px #0005}
.cpk input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 0 0 1px #0006}
.cpk-hue{background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
.cpk-chk{background-color:#fff;background-image:linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);background-size:10px 10px;background-position:0 0,5px 5px}
.cpk-lbl{display:flex;justify-content:space-between;font-size:11px;opacity:.75;margin-bottom:-4px}
.cpk-top{display:flex;gap:8px;align-items:center}.cpk-prev{width:30px;height:30px;border-radius:8px;flex:none;border:1px solid #0002;position:relative;overflow:hidden}.cpk-prev b{position:absolute;inset:0}
.cpk-hex{flex:1;min-width:0;height:30px;box-sizing:border-box;padding:0 8px;border-radius:8px;border:1px solid #0003;font:600 12px ui-monospace,monospace;text-transform:uppercase;background:transparent;color:inherit}
.cpk button{height:30px;min-width:30px;padding:0 10px;border-radius:8px;border:1px solid #0002;background:#f1eff6;color:inherit;font:600 12px system-ui,sans-serif;cursor:pointer}.cpk.dark button{background:#2d2739;border-color:#fff2}.cpk.dark .cpk-hex{border-color:#fff3}
.cpk-sw{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}.cpk-sw button{height:auto;min-width:0;width:auto;margin:0;aspect-ratio:1;padding:0;box-shadow:none;border-radius:5px;border:1px solid #0003}.cpk-sw button.on{outline:2px solid #9b6cf0;outline-offset:1px}
.cpk-act{display:flex;gap:8px;justify-content:flex-end}.cpk-act .done{background:#9b6cf0;border-color:#9b6cf0;color:#fff}
.cpk-bh{display:flex;justify-content:space-between;align-items:center}.cpk .cpk-bedit{height:20px;min-width:0;padding:0 10px;font-size:11px;text-transform:none;letter-spacing:0;opacity:1}
.cpk-sw .cpk-badd{border:1.5px dashed currentColor!important;background:transparent!important;font-size:13px;line-height:1;opacity:.7}.cpk-brand button{position:relative}.cpk-brand i{position:absolute;inset:0;display:grid;place-items:center;font:700 12px system-ui;font-style:normal;color:#fff;background:#0007;border-radius:4px}
.cpk-sub{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;opacity:.6;margin-bottom:-4px}`;document.head.appendChild(st)}

function open(input){close(true);css();let rgb=hexToRgb(input.value)||[0,0,0],[h,s,v]=rgbToHsv(...rgb),range=alphaFor(input);
 cur={input,range,h,s,v,orig:input.value,origA:range?range.value:null,changed:false};
 window.cpkSession={};
 let dark=(()=>{let c=getComputedStyle(document.body).backgroundColor.match(/\d+/g)||[255,255,255];return (+c[0]*.3+ +c[1]*.59+ +c[2]*.11)<110})();
 box=document.createElement('div');box.className='cpk'+(dark?' dark':'');box.setAttribute('role','dialog');box.setAttribute('aria-label','Pick a colour');
 let rec=recent(),sw=a=>a.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${c}" title="${c}"></button>`).join('');
 box.innerHTML=`<div class="cpk-sv" aria-label="Colour shade"><i></i></div>
 <div class="cpk-lbl"><span>Colour</span></div><input type="range" class="cpk-hue" min="0" max="360" step="1" aria-label="Colour">
 ${range?`<div class="cpk-lbl"><span>Transparency</span><b class="cpk-av"></b></div><input type="range" class="cpk-alpha cpk-chk" min="${range.min||0}" max="${range.max||100}" step="${range.step||1}" aria-label="Transparency">`:''}
 <div class="cpk-top"><span class="cpk-prev cpk-chk"><b></b></span><input class="cpk-hex" maxlength="7" spellcheck="false" aria-label="Colour code">${'EyeDropper' in window?'<button type="button" class="cpk-eye" title="Pick a colour from the screen" aria-label="Pick a colour from the screen">💧</button>':''}</div>
 <div class="cpk-sub cpk-bh"><span>Brand colours</span><button type="button" class="cpk-bedit" aria-pressed="false">Edit</button></div><div class="cpk-sw cpk-brand"></div>
 <div class="cpk-sub">Colours</div><div class="cpk-sw">${sw(PRESETS)}</div>
 ${rec.length?`<div class="cpk-sub">Recent</div><div class="cpk-sw">${sw(rec)}</div>`:''}
 <div class="cpk-act"><button type="button" class="cancel">Cancel</button><button type="button" class="done">Done</button></div>`;
 document.body.appendChild(box);place();paint(false);
 let sv=box.querySelector('.cpk-sv'),svAt=e=>{let r=sv.getBoundingClientRect();cur.s=clamp((e.clientX-r.left)/r.width,0,1);cur.v=1-clamp((e.clientY-r.top)/r.height,0,1);paint(true)};
 sv.addEventListener('pointerdown',e=>{e.preventDefault();sv.setPointerCapture(e.pointerId);svAt(e);const mv=ev=>svAt(ev),up=()=>{sv.removeEventListener('pointermove',mv);sv.removeEventListener('pointerup',up);sv.removeEventListener('pointercancel',up)};sv.addEventListener('pointermove',mv);sv.addEventListener('pointerup',up);sv.addEventListener('pointercancel',up)});
 box.querySelector('.cpk-hue').addEventListener('input',e=>{cur.h=+e.target.value;paint(true)});
 box.querySelector('.cpk-alpha')?.addEventListener('input',e=>{setAlpha(e.target.value)});
 let hex=box.querySelector('.cpk-hex');hex.addEventListener('input',()=>{let c=hexToRgb(hex.value);if(c&&/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.value.trim())){[cur.h,cur.s,cur.v]=rgbToHsv(...c);paint(true,true)}});
 hex.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();close(false)}});
 box.addEventListener('click',e=>{let b=e.target.closest?.('.cpk-sw button');if(!b||!box.contains(b))return;
  if(b.classList.contains('cpk-badd')){let h=hexNow();setBrand([...brand().filter(c=>c!==h),h]);renderBrand();return}
  if(b.closest('.cpk-brand')&&box.classList.contains('bedit')){setBrand(brand().filter(c=>c!==b.dataset.c));renderBrand();return}
  [cur.h,cur.s,cur.v]=rgbToHsv(...hexToRgb(b.dataset.c));paint(true)});
 box.querySelector('.cpk-bedit').addEventListener('click',e=>{let on=box.classList.toggle('bedit');e.currentTarget.textContent=on?'Done':'Edit';e.currentTarget.setAttribute('aria-pressed',String(on));renderBrand()});
 renderBrand();
 box.querySelector('.cpk-eye')?.addEventListener('click',async()=>{try{let r=await new EyeDropper().open();let c=hexToRgb(r.sRGBHex);if(c){[cur.h,cur.s,cur.v]=rgbToHsv(...c);paint(true)}}catch{}});
 box.querySelector('.cancel').addEventListener('click',()=>close(true));box.querySelector('.done').addEventListener('click',()=>close(false));
 setTimeout(()=>document.addEventListener('pointerdown',outside,true),0);document.addEventListener('keydown',esc,true);addEventListener('resize',place)}
function renderBrand(){if(!box)return;let row=box.querySelector('.cpk-brand'),list=brand(),ed=box.classList.contains('bedit'),hex=cur?hexNow():'';
 row.innerHTML=list.map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${ed?'Remove '+c:c}" title="${ed?'Tap to remove':c}"${c===hex?' class="on"':''}>${ed?'<i>×</i>':''}</button>`).join('')+(ed||list.length>=BRAND_MAX?'':`<button type="button" class="cpk-badd" aria-label="Save this colour to your brand colours" title="Save this colour">＋</button>`);
 box.querySelector('.cpk-bedit').hidden=!list.length&&!ed;if(!list.length&&ed){box.classList.remove('bedit');renderBrand()}}
function hexNow(){return rgbToHex(...hsvToRgb(cur.h,cur.s,cur.v))}
function fire(el,v){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function setAlpha(v){if(!cur?.range)return;cur.changed=true;fire(cur.range=live(cur.range),v);paint(false)}
function paint(apply,fromHex){if(!box||!cur)return;let hex=hexNow(),pure=rgbToHex(...hsvToRgb(cur.h,1,1)),sv=box.querySelector('.cpk-sv');
 sv.style.backgroundColor=pure;let k=sv.querySelector('i');k.style.left=cur.s*100+'%';k.style.top=(1-cur.v)*100+'%';k.style.background=hex;
 let hue=box.querySelector('.cpk-hue');if(+hue.value!==Math.round(cur.h))hue.value=Math.round(cur.h);
 let a=box.querySelector('.cpk-alpha'),op=1;if(a&&cur.range){let r=cur.range=live(cur.range);a.value=r.value;let mn=+a.min,mx=+a.max;op=mx>mn?(+r.value-0)/100:1;
  a.style.backgroundImage=`linear-gradient(90deg,${hex}00,${hex}),${CHK},${CHK}`;a.style.backgroundSize='100% 100%,10px 10px,10px 10px';a.style.backgroundPosition='0 0,0 0,5px 5px';box.querySelector('.cpk-av').textContent=Math.round(100-+r.value)+'% see-through'}
 box.querySelector('.cpk-prev b').style.cssText=`background:${hex};opacity:${clamp(op,0,1)}`;
 if(!fromHex)box.querySelector('.cpk-hex').value=hex.toUpperCase();
 box.querySelectorAll('.cpk-sw button').forEach(b=>b.classList.toggle('on',(b.dataset.c||'').toLowerCase()===hex));
 if(apply&&hex!==String(cur.input.value).toLowerCase()){cur.changed=true;fire(cur.input=live(cur.input),hex)}}
function place(){if(!box||!cur)return;let narrow=innerWidth<300||innerHeight<360;box.classList.toggle('sheet',narrow);if(narrow){box.style.left='';box.style.top='';return}
 let r=cur.input.getBoundingClientRect(),w=box.offsetWidth,h=box.offsetHeight,x=clamp(r.left,8,innerWidth-w-8),y=r.bottom+8;if(y+h>innerHeight-8)y=r.top-h-8;if(y<8)y=clamp((innerHeight-h)/2,8,innerHeight-h-8);
 if(r.right+w+16<innerWidth&&(r.bottom+8+h>innerHeight-8)){x=r.right+12;y=clamp(r.top-h/2,8,innerHeight-h-8)}box.style.left=x+'px';box.style.top=y+'px'}
function outside(e){if(box&&!box.contains(e.target)&&e.target!==cur?.input)close(false)}
function esc(e){if(e.key==='Escape'&&box){e.preventDefault();e.stopPropagation();close(true)}}
function close(cancel){if(!box)return;let c=cur;if(cancel&&c?.changed){if(c.range&&c.origA!=null)fire(live(c.range),c.origA);fire(live(c.input),c.orig)}
 else if(c?.changed)remember(hexNow());
 box.remove();box=null;cur=null;window.cpkSession=null;document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',esc,true);removeEventListener('resize',place)}
document.addEventListener('click',e=>{let i=e.target;if(!(i instanceof HTMLInputElement)||i.type!=='color'||i.disabled)return;e.preventDefault();if(cur?.input===i){close(false);return}open(i)},true);
window.openColorPicker=open;
})();
