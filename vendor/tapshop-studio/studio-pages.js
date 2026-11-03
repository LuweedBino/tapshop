// Pages and PDF for the design studio. The page being edited always lives at the top of the design
// (design.els, design.bg, …), which is what every other part of the editor uses. design.pages holds
// the others, with null in the current page's slot, and design.page says which that is. Designs with
// one page have neither field, so older designs work unchanged.
(()=>{
const FIELDS=['bg','bgOpacity','bgGrad','els'];
const pick=o=>{let p={};for(const k of FIELDS)if(o[k]!==undefined)p[k]=o[k];return p};
const count=d=>d?.pages?.length||1;
const pageOf=(d,i)=>d.pages&&i!==(d.page||0)?d.pages[i]:pick(d);
// A one-page design for drawing: works with everything that draws a design.
function pageDesign(d,i){let o={...d};delete o.pages;delete o.page;for(const k of FIELDS)delete o[k];return Object.assign(o,pageOf(d,i))}
function load(i){let p=design.pages[i];for(const k of FIELDS)delete design[k];Object.assign(design,p);design.pages[i]=null;design.page=i}
function refresh(){selected=-1;multiSel=[];draw();properties();save()}
function goTo(i){let cur=design.page||0;if(!design.pages?.[i]||i===cur)return;design.pages[cur]=pick(design);load(i);refresh()}
function insert(page){checkpoint();if(!design.pages){design.pages=[null];design.page=0}let at=design.page+1;design.pages.splice(at,0,page);goTo(at)}
function addPage(){insert({bg:design.bg,...(design.bgOpacity!==undefined&&{bgOpacity:design.bgOpacity}),...(design.bgGrad&&{bgGrad:design.bgGrad}),els:[]})}
function duplicatePage(){insert(structuredClone(pick(design)))}
function deletePage(){if(count(design)<2)return;if(design.els.length&&!confirm('Delete this page? You can bring it back with Undo.'))return;checkpoint();let cur=design.page;design.pages.splice(cur,1);load(Math.min(cur,design.pages.length-1));
  if(design.pages.length===1){delete design.pages;delete design.page}refresh()}
function movePage(by){let a=design.page,b=a+by;if(!design.pages?.[b])return;checkpoint();[design.pages[a],design.pages[b]]=[design.pages[b],design.pages[a]];design.page=b;save();strip(true)}

// ---------- The strip under the canvas ----------
let bar=null,timer=null,sig='';
const thumbUrl=i=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgString(pageDesign(design,i)));
function strip(force){if(!bar||!design)return;let n=count(design),cur=design.page||0,now=n+':'+cur+':'+design.w+'x'+design.h;
  if(!force&&now===sig){bar.querySelector('[aria-current=true] img')?.setAttribute('src',thumbUrl(cur));return}sig=now;
  let aspect=design.w/design.h,thumbs=n>1?Array.from({length:n},(_,i)=>`<button type="button" class="pg-th" data-go="${i}" aria-label="Page ${i+1}" aria-current="${i===cur}" style="aspect-ratio:${aspect}"><img alt="" src="${thumbUrl(i)}"><span>${i+1}</span></button>`).join(''):'';
  bar.innerHTML=`<div class="pg-list">${thumbs}</div><div class="pg-tools"><button type="button" data-do="add">＋ Add page</button>${n>1?`<button type="button" data-do="dup" title="Duplicate this page" aria-label="Duplicate this page">⧉</button><button type="button" data-do="left" title="Move page earlier" aria-label="Move page earlier" ${cur?'':'disabled'}>←</button><button type="button" data-do="right" title="Move page later" aria-label="Move page later" ${cur<n-1?'':'disabled'}>→</button><button type="button" data-do="del" title="Delete this page" aria-label="Delete this page">🗑</button>`:''}</div>`;
  bar.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest',inline:'nearest'})}
function mount(){let stage=document.getElementById('stage'),col=document.createElement('div');col.className='stage-col';stage.replaceWith(col);bar=document.createElement('div');bar.id='pageStrip';bar.setAttribute('aria-label','Pages');col.append(stage,bar);
  bar.onclick=e=>{let go=e.target.closest('[data-go]');if(go)return goTo(+go.dataset.go);let a=e.target.closest('[data-do]')?.dataset.do;({add:addPage,dup:duplicatePage,del:deletePage,left:()=>movePage(-1),right:()=>movePage(1)})[a]?.()};
  let css=document.createElement('style');css.textContent=`.stage-col{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}.stage-col>.stage{flex:1;min-height:0}
#pageStrip{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid var(--ts-border,#e5e5e5);background:var(--ts-surface,#fff)}
.pg-list{display:flex;gap:8px;overflow-x:auto;flex:0 1 auto;min-width:0;padding:2px}.pg-list:empty{display:none}.pg-th{position:relative;flex:none;height:56px;padding:0!important;border-radius:6px!important;overflow:hidden;background:#fff}.pg-th img{display:block;width:100%;height:100%}
.pg-th span{position:absolute;right:2px;bottom:2px;min-width:16px;padding:0 3px;border-radius:4px;background:#000a;color:#fff;font:600 10px/14px system-ui,sans-serif;text-align:center}.pg-th[aria-current=true]{outline:2px solid var(--ts-primary,#171717);outline-offset:1px}
.pg-tools{display:flex;gap:6px;flex:none;margin-left:auto}.pg-tools button{margin:0;padding:8px 10px;white-space:nowrap}
.sell-option{display:block;width:100%;margin-top:8px;padding:12px 14px;text-align:left}
@media(max-width:700px){#pageStrip{flex-direction:column;align-items:stretch;gap:6px;padding:6px 8px}.pg-tools{margin-left:0;overflow-x:auto}.pg-tools button{padding:6px 8px}.pg-th{height:44px}}`;document.head.appendChild(css)}
mount();
const drawNoStrip=draw;draw=function(){drawNoStrip();clearTimeout(timer);timer=setTimeout(strip,200)};
const startNoPages=start;start=function(){if(design?.pages&&design.page){design.pages[design.page]=pick(design);load(0)}sig='';startNoPages();strip(true)};

// ---------- PDF ----------
// Each page goes in as a sharp JPEG, so it looks exactly like the editor whatever fonts it uses.
const PDF_LONG_SIDE=792; // Letter height in points; every PDF page is scaled to fit it
const JPEG_LONG_SIDE=1800;
async function pageJpeg(d){await prepFontData(usedFonts(d));embedFonts=true;let svg;try{svg=svgString(d)}finally{embedFonts=false}
  let im=await svgImage(svg),k=Math.max(1,Math.min(2,JPEG_LONG_SIDE/Math.max(d.w,d.h))),c=document.createElement('canvas');c.width=Math.round(d.w*k);c.height=Math.round(d.h*k);let x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);
  let blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));if(!blob)throw Error('Part of the design could not be drawn.');return {bytes:new Uint8Array(await blob.arrayBuffer()),w:c.width,h:c.height}}
async function designPdf(d,onPage){let k=PDF_LONG_SIDE/Math.max(d.w,d.h),W=+(d.w*k).toFixed(2),H=+(d.h*k).toFixed(2),n=count(d),parts=[],at=0,offsets=[];
  const put=x=>{let b=typeof x==='string'?new TextEncoder().encode(x):x;parts.push(b);at+=b.length};
  const obj=(id,body)=>{offsets[id]=at;put(`${id} 0 obj\n${body}\nendobj\n`)};
  put('%PDF-1.4\n');put(new Uint8Array([37,226,227,207,211,10]));obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Count ${n} /Kids [${Array.from({length:n},(_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  for(let i=0;i<n;i++){onPage?.(i,n);let img=await pageJpeg(pageDesign(d,i)),p=3+i*3,draw=`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(p,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${p+1} 0 R /Resources << /XObject << /Im0 ${p+2} 0 R >> >> >>`);
    obj(p+1,`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    offsets[p+2]=at;put(`${p+2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);put(img.bytes);put('\nendstream\nendobj\n')}
  let size=3+n*3,xref=at;put(`xref\n0 ${size}\n0000000000 65535 f \n`);for(let i=1;i<size;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  put(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);return new Blob(parts,{type:'application/pdf'})}
const busy=(i,n)=>toast(n>1?`Making your PDF… page ${i+1} of ${n}`:'Making your PDF…');
window.exportPdf=async()=>{if(!design)return;save();try{let b=await designPdf(design,busy);download(URL.createObjectURL(b),'pdf')}catch(e){toast(e.message||'The PDF could not be made.')}};
window.sellAsPdf=async()=>{try{sendToVault([{blob:await designPdf(design,busy),name:vaultName(design.name)+'.pdf',source:'design'}],true)}catch(e){toast(e.message||'The PDF could not be made.')}};
window.designPageCount=()=>count(design);
// Multi-page designs also go to the Vault as a PDF; the PNG beside it is the current page.
const itemsNoPdf=designItems;designItems=async function(d){let items=await itemsNoPdf(d);if(count(d)>1)items.push({blob:await designPdf(d),name:vaultName(d.name)+'.pdf',source:'design'});return items};
})();
