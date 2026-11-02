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
