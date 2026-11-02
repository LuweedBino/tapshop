// TapShop look (tapshop-theme.css) for both editors. Marks <html> with .ts and mirrors the editor's
// own dark mode as .ts-dark. Inside the dashboard the editor follows the dashboard's light/dark
// switch (tapshop_theme cookie) and hides its own switch so there is only one.
(()=>{
  const root=document.documentElement,isVideo=!!document.getElementById('clips');
  root.classList.add('ts');
  const isDark=()=>isVideo?!document.body.classList.contains('light'):root.dataset.theme==='dark';
  const mark=()=>root.classList.toggle('ts-dark',isDark());
  function apply(dark){
    if(dark===isDark())return;
    if(isVideo){document.body.classList.toggle('light',!dark);try{syncThemeSwitch()}catch{}}
    else{root.dataset.theme=dark?'dark':'light';try{syncTheme()}catch{}}
    try{localStorage.setItem('forma-theme',dark?'dark':'light')}catch{}
    mark();
  }
  new MutationObserver(mark).observe(root,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(mark).observe(document.body,{attributes:true,attributeFilter:['class']});
  mark();
  let embedded=false;try{embedded=window.parent!==window&&window.parent.location.origin===location.origin}catch{}
  const cookieTheme=()=>(/(?:^|;\s*)tapshop_theme=(dark|light)/.exec(document.cookie)||[])[1];
  if(embedded){
    const style=document.createElement('style');style.textContent='html.ts body .theme-toggle{display:none!important}';document.head.appendChild(style);
    // No cookie yet means the dashboard is showing its default, light.
    const follow=()=>apply(cookieTheme()==='dark');
    follow();setInterval(follow,800);
  }
})();
// Design editor tools panel: split buttons like "◆   Shapes" into an icon and a label so the folded
// panel can still show them as icons. Re-split if a button's text is changed later.
(()=>{const tools=document.querySelector('.tools');if(!tools)return;
  const split=b=>{if(b.querySelector('.ts-ti'))return;let m=/^(\S{1,2})[\s ]{2,}(.+)$/.exec(b.textContent.trim())||/^([^\p{L}\p{N}\s]{1,2})[\s ]+(.+)$/u.exec(b.textContent.trim());if(!m||b.children.length)return;
    b.textContent='';let i=document.createElement('span');i.className='ts-ti';i.textContent=m[1];let l=document.createElement('span');l.className='ts-tl';l.textContent='  '+m[2];b.append(i,l);b.classList.add('ts-ic');if(!b.title)b.title=m[2];if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',m[2])};
  const all=()=>tools.querySelectorAll(':scope>button').forEach(split);all();
  new MutationObserver(all).observe(tools,{childList:true,subtree:true,characterData:true})})();
