// Top bar: two tidy rows. Row 1 is getting around (← Studio, ⌂ Start) and the video's name, shown as
// a clear "name your video" field. Row 2 holds the actions in labelled sections: Project and Share.
// Runs after every script that adds top-bar buttons; only moves and relabels them, never rewires them.
(()=>{
const bar=document.querySelector('header.top');if(!bar)return;
const name=document.getElementById('projectName');if(!name)return;
const st=document.createElement('style');st.textContent=`
html body header.top.vt-bar{display:block!important;height:auto!important;padding:10px 14px 8px!important;gap:0!important}
.vt-row{display:flex;align-items:center;gap:8px;min-width:0}
.vt-row1{margin-bottom:8px}
.vt-row1 .brand,.vt-row1 .badge,.vt-row1 .spacer{display:none!important}
html body header.top.vt-bar .vt-row button{flex:none;white-space:nowrap;padding:7px 12px!important;font-size:13px!important;min-height:0;border-radius:999px!important}
.vt-name{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;cursor:text;max-width:520px}
.vt-name-lab{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;opacity:.6;padding-left:2px;line-height:1.1}
.vt-name-box{position:relative;display:block}
.vt-name-box .vt-pen{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;opacity:.75}
html body header.top.vt-bar #projectName{width:100%!important;max-width:none!important;flex:none;box-sizing:border-box;padding:8px 12px 8px 32px!important;font-size:15px!important;font-weight:700;border:1.5px dashed var(--ts-border-strong,#999)!important;border-radius:10px!important;background:var(--ts-hover,#f2f2f2)!important;transition:border-color .15s,box-shadow .15s}
html body header.top.vt-bar #projectName:hover{border-color:var(--ts-text,#111)!important}
html body header.top.vt-bar #projectName:focus{border-style:solid!important;border-color:#ff3ea5!important;box-shadow:0 0 0 3px #ff3ea533!important;background:var(--ts-surface,#fff)!important}
html body header.top.vt-bar #projectName::placeholder{color:inherit;opacity:.45;font-weight:600}
.vt-name.untitled .vt-name-lab::after{content:'  ·  tap to name it';text-transform:none;letter-spacing:0;font-weight:700;color:#ff3ea5;opacity:1}
.vt-row2{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;align-items:stretch;gap:0;padding-top:6px;border-top:1px solid var(--ts-border,#8a7aa855)}
.vt-row2::-webkit-scrollbar{display:none}
.vt-sec{display:flex;flex-direction:column;gap:3px;flex:none;padding:0 12px;border-left:1px solid var(--ts-border,#8a7aa855)}
.vt-sec:first-child{border-left:0;padding-left:0}
.vt-lab{font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;opacity:.55;line-height:1.2}
.vt-btns{display:flex;gap:6px}
@media(max-width:520px){html body header.top.vt-bar .vt-row1 button:not(.theme-toggle){padding:7px 10px!important;font-size:12px!important}.vt-name{min-width:150px}}
@media(min-width:751px){body .layout{height:calc(100vh - var(--vt-h,63px))!important}}`;
document.head.appendChild(st);

const row1=document.createElement('div');row1.className='vt-row vt-row1';
const row2=document.createElement('div');row2.className='vt-row vt-row2';
const btn=f=>[...bar.querySelectorAll('button')].find(f);
const by=fn=>btn(b=>(b.getAttribute('onclick')||'').includes(fn));
const back=by("index.html"),start=btn(b=>/Start/.test(b.textContent)&&!b.getAttribute('onclick')),theme=bar.querySelector('.theme-toggle');
const relabel=(b,t)=>{if(b)b.textContent=t};
const open=by('openProjectChoice'),save=by('openSaveChoice'),reset=by('resetPanelLayout');
const vault=document.getElementById('vaultProject'),sell=document.getElementById('sellVideo'),exp=by('openExport');
relabel(open,'📂 Open');relabel(save,'💾 Save');relabel(reset,'↺ Reset layout');
relabel(vault,'⛁ Save to Vault');relabel(sell,'🏷️ Sell this');relabel(exp,'⬇ Export');
if(open)open.title='Open a saved project';if(save)save.title='Save this project with its clips';

// The name field: a labelled box with a pencil, so it reads as "type your video's name here".
const wrap=document.createElement('label');wrap.className='vt-name';
wrap.innerHTML='<span class="vt-name-lab">Video name</span><span class="vt-name-box"><span class="vt-pen" aria-hidden="true">✏️</span></span>';
name.placeholder='Name your video…';name.setAttribute('aria-label','Video name');name.title='Tap to rename your video';
wrap.lastElementChild.appendChild(name);
const mark=()=>wrap.classList.toggle('untitled',!name.value.trim()||/^Untitled video$/.test(name.value.trim()));
name.addEventListener('input',mark);name.addEventListener('change',mark);
name.addEventListener('focus',()=>{if(/^Untitled video$/.test(name.value))name.select()});
// Other scripts set the name in code (templates, opening projects), which fires no event.
let last=name.value;setInterval(()=>{if(name.value!==last){last=name.value;mark()}},700);mark();

const sec=(label,items)=>{let s=document.createElement('div');s.className='vt-sec';s.setAttribute('role','group');s.setAttribute('aria-label',label);
  s.innerHTML=`<span class="vt-lab">${label}</span><div class="vt-btns"></div>`;items.filter(Boolean).forEach(b=>s.lastElementChild.appendChild(b));return s};

const rest=[...bar.children];
[back,start].filter(Boolean).forEach(b=>row1.appendChild(b));
row1.appendChild(wrap);if(theme)row1.appendChild(theme);
row2.appendChild(sec('Project',[open,save,reset]));
const share=[vault,sell,exp].filter(Boolean);if(share.length)row2.appendChild(sec('Share',share));
// Anything else (hidden file input, brand, badge, buttons added by future scripts) keeps living in the bar.
const extra=rest.filter(el=>!row1.contains(el)&&!row2.contains(el));
bar.textContent='';bar.classList.add('vt-bar');bar.append(row1,row2);
const more=extra.filter(el=>el.tagName==='BUTTON');if(more.length)row2.appendChild(sec('More',more));
extra.filter(el=>el.tagName!=='BUTTON').forEach(el=>row1.appendChild(el));

const fit=()=>document.documentElement.style.setProperty('--vt-h',bar.offsetHeight+'px');
fit();if(window.ResizeObserver)new ResizeObserver(fit).observe(bar);addEventListener('resize',fit);
})();
