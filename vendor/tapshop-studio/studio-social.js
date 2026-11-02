// Social media templates for the design studio, one chip per platform, at each platform's own size.
// Built with the same TPL helpers as the animated templates (text _cx = centre x). Photo spots are
// rectangles that say "Your photo" so it's clear where a picture goes.
(()=>{
const W='#ffffff',K='#111111',PH=(o)=>({fill:'#d9d9de',text:'＋ Your photo',textColor:'#6b6b75',textBold:true,textSize:40,...o});
const SOCIAL=[
// ---------- Instagram ----------
{name:'Product spotlight',category:'Instagram',w:1080,h:1350,bg:'#f4efe8',els:({T,SH})=>[
  SH('rect',PH({x:90,y:90,w:900,h:820,radius:40})),
  T('NEW FAVOURITE',{cx:540,y:960,size:64,font:'TapFont1',weight:'bold',fill:K,letter:4}),
  T('The serum I can’t stop using',{cx:540,y:1080,size:44,fill:'#55505a'}),
  SH('pill',{x:340,y:1170,w:400,h:100,fill:K,text:'LINK IN BIO',textColor:W})]},
{name:'Customer quote',category:'Instagram',w:1080,h:1080,bg:'#111114',els:({T,ST})=>[
  T('“',{cx:540,y:250,size:260,font:'TapFont10',fill:'#ffd84d'}),
  T('I’m honestly\nobsessed with this.',{cx:540,y:400,size:84,font:'TapFont10',fill:W,lineH:1.2}),
  T('★★★★★',{cx:540,y:690,size:64,fill:'#ffd84d',letter:8}),
  T('— @customer',{cx:540,y:800,size:44,fill:'#b9b9c3'})]},
{name:'Carousel cover',category:'Instagram',w:1080,h:1350,bg:'#ffd84d',els:({T,SH})=>[
  T('5 TIPS',{cx:540,y:300,size:154,font:'TapFont1',weight:'bold',fill:K}),
  T('for better skin',{cx:540,y:560,size:80,font:'TapFont10',fill:K}),
  SH('pill',{x:330,y:1050,w:420,h:110,fill:K,text:'SWIPE →',textColor:W}),
  T('@yourhandle',{cx:540,y:1230,size:36,fill:'#5a4a00'})]},
{name:'Story · Poll',category:'Instagram',w:1080,h:1920,bg:'#1d1b29',els:({T,SH})=>[
  T('Which one\nshould I keep?',{cx:540,y:200,size:67,font:'TapFont1',weight:'bold',fill:W,lineH:1.1}),
  SH('rect',PH({x:90,y:520,w:430,h:760,radius:32})),SH('rect',PH({x:560,y:520,w:430,h:760,radius:32})),
  SH('pill',{x:190,y:1330,w:230,h:110,fill:W,text:'A',textColor:K}),SH('pill',{x:660,y:1330,w:230,h:110,fill:W,text:'B',textColor:K}),
  T('Vote in the poll 👇',{cx:540,y:1620,size:56,fill:'#d9d6ea'})]},
{name:'Story · New video',category:'Instagram',w:1080,h:1920,bg:'#ff4d6d',els:({T,SH,ST})=>[
  T('NEW VIDEO',{cx:540,y:260,size:105,font:'TapFont1',weight:'bold',fill:W}),
  T('is up!',{cx:540,y:440,size:90,font:'TapFont10',fill:W}),
  SH('rect',PH({x:140,y:620,w:800,h:800,radius:40})),
  SH('pill',{x:290,y:1520,w:500,h:120,fill:W,text:'TAP THE LINK ↓',textColor:'#ff4d6d'}),ST('👆',{x:470,y:1680,s:140})]},
{name:'Story · Paid partnership',category:'Instagram',w:1080,h:1920,bg:'#f2f2f2',els:({T,SH})=>[
  T('In partnership with',{cx:540,y:220,size:52,fill:'#555'}),
  T('GLOWCO',{cx:540,y:320,size:84,font:'TapFont1',weight:'bold',fill:K}),
  SH('rect',PH({x:90,y:520,w:900,h:1000,radius:40})),
  T('Use code GLOW15 for 15% off',{cx:540,y:1620,size:54,fill:K,weight:'bold'}),
  T('#ad',{cx:540,y:1740,size:40,fill:'#777'})]},
// ---------- TikTok ----------
{name:'Cover · Part 1',category:'TikTok',w:1080,h:1920,bg:'#000000',els:({T,SH})=>[
  SH('rect',PH({x:0,y:0,w:1080,h:1920,fill:'#2a2a30',text:'＋ Your video still'})),
  T('PART 1',{cx:540,y:700,size:140,font:'TapFont1',weight:'bold',fill:W,effect:'outline',fxColor:'#000000',fxStr:6}),
  SH('pill',{x:240,y:960,w:600,h:130,fill:'#fe2c55',text:'How I started UGC',textColor:W})]},
{name:'Cover · Storytime',category:'TikTok',w:1080,h:1920,bg:'#25f4ee',els:({T,ST})=>[
  T('STORY\nTIME',{cx:540,y:520,size:168,font:'TapFont1',weight:'bold',fill:K,lineH:.95}),
  T('(you won’t believe this)',{cx:540,y:1040,size:60,fill:K}),ST('🍵',{x:430,y:1240,s:220})]},
{name:'Cover · GRWM',category:'TikTok',w:1080,h:1920,bg:'#fbe3ec',els:({T,SH})=>[
  SH('rect',PH({x:90,y:90,w:900,h:1300,radius:40})),
  T('GRWM',{cx:540,y:1460,size:140,font:'TapFont1',weight:'bold',fill:'#e11d74'}),
  T('for date night ✨',{cx:540,y:1700,size:70,font:'TapFont10',fill:'#7a1f45'})]},
{name:'Cover · Review',category:'TikTok',w:1080,h:1920,bg:'#121212',els:({T,SH})=>[
  SH('rect',PH({x:90,y:300,w:900,h:900,radius:40})),
  T('HONEST',{cx:540,y:1300,size:119,font:'TapFont1',weight:'bold',fill:W}),
  T('REVIEW',{cx:540,y:1480,size:119,font:'TapFont1',weight:'bold',fill:'#25f4ee'}),
  T('★★★★☆',{cx:540,y:1700,size:80,fill:'#ffd84d',letter:10})]},
// ---------- YouTube ----------
{name:'Thumbnail · I tried it',category:'YouTube',w:1280,h:720,bg:'#ffd400',els:({T,SH,ST})=>[
  SH('rect',PH({x:640,y:0,w:640,h:720})),
  T('I TRIED',{x:50,y:160,size:100,font:'TapFont1',weight:'bold',fill:K,align:'left'}),
  T('THIS SERUM',{x:50,y:320,size:80,font:'TapFont1',weight:'bold',fill:'#ff0000',align:'left'}),
  T('for 30 days',{x:55,y:500,size:70,weight:'bold',fill:K,align:'left'}),ST('😱',{x:520,y:440,s:220})]},
{name:'Thumbnail · Versus',category:'YouTube',w:1280,h:720,bg:'#111111',els:({T,SH})=>[
  SH('rect',PH({x:0,y:0,w:640,h:720,fill:'#2b2b33'})),SH('rect',PH({x:640,y:0,w:640,h:720,fill:'#3a3a44'})),
  SH('circle',{x:540,y:260,w:200,h:200,fill:'#ff0000',text:'VS',textColor:W}),
  T('CHEAP',{cx:320,y:590,size:67,font:'TapFont1',weight:'bold',fill:W,effect:'outline',fxColor:'#000000',fxStr:5}),T('PRICEY',{cx:960,y:590,size:67,font:'TapFont1',weight:'bold',fill:'#ffd84d',effect:'outline',fxColor:'#000000',fxStr:5})]},
{name:'Thumbnail · Vlog',category:'YouTube',w:1280,h:720,bg:'#e9e4dc',els:({T,SH})=>[
  SH('rect',PH({x:0,y:0,w:1280,h:720,fill:'#cfc8bd'})),
  T('a day in my life',{x:60,y:470,size:96,font:'TapFont10',fill:W,align:'left',effect:'shadow',fxColor:'#000000',fxStr:4}),
  SH('pill',{x:60,y:600,w:300,h:80,fill:W,text:'VLOG #12',textColor:K})]},
{name:'Thumbnail · Tutorial',category:'YouTube',w:1280,h:720,bg:'#0f172a',els:({T,SH})=>[
  SH('rect',PH({x:700,y:60,w:520,h:600,radius:30,fill:'#1e293b'})),
  T('HOW TO',{x:60,y:140,size:84,font:'TapFont1',weight:'bold',fill:'#38bdf8',align:'left'}),
  T('EDIT VIDEOS',{x:60,y:290,size:98,font:'TapFont1',weight:'bold',fill:W,align:'left'}),
  SH('pill',{x:60,y:520,w:360,h:100,fill:'#22c55e',text:'EASY · 5 MIN',textColor:K})]},
{name:'Shorts cover',category:'YouTube',w:1080,h:1920,bg:'#ff0000',els:({T,SH,ST})=>[
  SH('rect',PH({x:90,y:420,w:900,h:1000,radius:40})),
  T('WAIT FOR IT',{cx:540,y:220,size:105,font:'TapFont1',weight:'bold',fill:W}),
  T('👀',{cx:540,y:1520,size:180}),T('#shorts',{cx:540,y:1760,size:56,fill:'#ffe0e0'})]},
// ---------- Facebook ----------
{name:'Post · Announcement',category:'Facebook',w:1200,h:630,bg:'#1877f2',els:({T,SH})=>[
  SH('rect',PH({x:720,y:0,w:480,h:630,fill:'#cfe0fb'})),
  T('BIG NEWS',{x:60,y:120,size:77,font:'TapFont1',weight:'bold',fill:W,align:'left'}),
  T('Something new is\ncoming on Friday',{x:62,y:290,size:52,fill:'#e3edff',align:'left',lineH:1.2}),
  SH('pill',{x:60,y:480,w:340,h:90,fill:W,text:'LEARN MORE',textColor:'#1877f2'})]},
{name:'Post · Giveaway',category:'Facebook',w:1080,h:1080,bg:'#fff3d6',els:({T,SH,ST})=>[
  T('GIVEAWAY',{cx:540,y:150,size:119,font:'TapFont1',weight:'bold',fill:'#e4572e'}),
  SH('rect',PH({x:240,y:330,w:600,h:420,radius:30})),
  T('1. Like  2. Follow  3. Tag a friend',{cx:540,y:830,size:46,weight:'bold',fill:K}),
  T('Winner picked Friday',{cx:540,y:930,size:40,fill:'#6b5a30'}),ST('🎁',{x:70,y:880,s:140}),ST('🎉',{x:870,y:880,s:140})]},
// ---------- Pinterest ----------
{name:'Pin · Ideas list',category:'Pinterest',w:1000,h:1500,bg:'#fdfaf5',els:({T,SH})=>[
  SH('rect',PH({x:0,y:0,w:1000,h:820})),
  SH('rect',{x:80,y:740,w:840,h:300,fill:'#e60023',radius:24,text:'10 COZY ROOM IDEAS\nyou’ll want to try',textColor:W}),
  T('Save for later ↓',{cx:500,y:1180,size:52,font:'TapFont10',fill:K}),T('yourwebsite.com',{cx:500,y:1380,size:36,fill:'#888'})]},
{name:'Pin · Step by step',category:'Pinterest',w:1000,h:1500,bg:'#eef5ef',els:({T,SH})=>[
  T('How to style it',{cx:500,y:90,size:90,font:'TapFont10',fill:'#1f3d2b'}),
  ...[0,1,2].map(i=>SH('rect',PH({x:80,y:260+i*380,w:520,h:340,radius:24}))),
  ...[0,1,2].map(i=>T('Step '+(i+1),{x:640,y:380+i*380,size:56,weight:'bold',fill:'#1f3d2b',align:'left'}))]},
// ---------- LinkedIn ----------
{name:'Post · Brand collab',category:'LinkedIn',w:1200,h:1200,bg:'#f3f6f8',els:({T,SH})=>[
  T('Excited to share',{cx:600,y:140,size:64,fill:'#0a66c2',weight:'bold'}),
  T('I partnered with Glowco',{cx:600,y:250,size:84,font:'TapFont10',fill:K}),
  SH('rect',PH({x:150,y:400,w:900,h:560,radius:24})),
  T('Here’s what we made →',{cx:600,y:1050,size:50,fill:'#444'})]},
{name:'Post · Results',category:'LinkedIn',w:1200,h:627,bg:'#0a66c2',els:({T})=>[
  T('+250%',{x:60,y:190,size:140,font:'TapFont1',weight:'bold',fill:W,align:'left'}),
  T('engagement on the Glowco campaign',{x:66,y:380,size:52,fill:'#dbeafe',align:'left'}),
  T('Case study · swipe for the full breakdown',{x:66,y:500,size:34,fill:'#bfdbfe',align:'left'})]},
// ---------- X ----------
{name:'Post · Thread',category:'X',w:1600,h:900,bg:'#000000',els:({T,SH})=>[
  T('A thread 🧵',{x:90,y:150,size:120,weight:'bold',fill:W,align:'left'}),
  T('Everything I learned\nfrom 100 brand deals',{x:90,y:350,size:90,font:'TapFont10',fill:'#e7e9ea',align:'left',lineH:1.15}),
  SH('pill',{x:90,y:700,w:360,h:100,fill:W,text:'1 / 10 ↓',textColor:K})]},
// ---------- For creators (UGC) ----------
{name:'UGC rate card',category:'Creator',w:1080,h:1350,bg:'#111114',els:({T,SH})=>[
  T('UGC RATES',{cx:540,y:120,size:91,font:'TapFont1',weight:'bold',fill:W}),
  T('@yourhandle · 2026',{cx:540,y:270,size:40,fill:'#a1a1ad'}),
  ...[['1 video','$250'],['3 videos','$250'],['Raw footage','+$100'],['Usage rights (30 days)','+$100']].map(([a,b],i)=>SH('rect',{x:90,y:380+i*190,w:900,h:150,fill:'#1e1e24',radius:24,text:a+'   ·   '+b,textColor:W})),
  T('DM or email to book',{cx:540,y:1200,size:46,fill:'#ffd84d',weight:'bold'})]},
{name:'Let’s work together',category:'Creator',w:1080,h:1350,bg:'#f6f1ea',els:({T,SH})=>[
  SH('circle',PH({x:340,y:110,w:400,h:400})),
  T('Hi, I’m Luna',{cx:540,y:600,size:90,font:'TapFont10',fill:K}),
  T('UGC creator · product demos · reviews',{cx:540,y:720,size:40,fill:'#6b6258'}),
  T('Brands I’ve worked with',{cx:540,y:860,size:44,weight:'bold',fill:K}),
  T('Glowco   ·   Brewly   ·   Fitfam',{cx:540,y:950,size:44,fill:'#6b6258'}),
  SH('pill',{x:290,y:1110,w:500,h:120,fill:K,text:'LET’S WORK TOGETHER',textColor:W})]},
{name:'Before / After',category:'Creator',w:1080,h:1350,bg:K,els:({T,SH})=>[
  SH('rect',PH({x:0,y:0,w:540,h:1350,fill:'#3a3a44'})),SH('rect',PH({x:540,y:0,w:540,h:1350,fill:'#55555f'})),
  SH('pill',{x:120,y:60,w:300,h:100,fill:W,text:'BEFORE',textColor:K}),SH('pill',{x:660,y:60,w:300,h:100,fill:'#ffd84d',text:'AFTER',textColor:K})]}];

// Same build path as the animated templates (TPL helpers, centred text), minus the "Animated" badge.
const makeNoSocial=make;make=function(t){if(!t?.social)return makeNoSocial(t);let els=t.els(TPL).map(e=>structuredClone(e));
  for(const e of els)if(e.type==='text'&&e._cx!=null){let L=txLayout(e);e.x=Math.round(e._cx-L.inner/2);delete e._cx;delete e.cx}
  return {id:'d'+Date.now().toString(36)+Math.random().toString(36).slice(2),name:t.name,w:t.w,h:t.h,bg:t.bg,els}};
// The old simple "Social" ones become "Simple"; platform templates go first in the gallery.
for(const t of templates)if(t.category==='Social')t.category='Simple';
SOCIAL.forEach(t=>t.social=true);templates.unshift(...SOCIAL);
const PLATFORM_CHIPS=['All templates','Instagram','TikTok','YouTube','Facebook','Pinterest','LinkedIn','X','Creator','Animated','Simple','Presentations','Posters','Stories'];
const renderNoPlatforms=render;render=function(){renderNoPlatforms();if(mode==='projects')return;let chips=document.getElementById('chips');if(!chips)return;
  chips.innerHTML=PLATFORM_CHIPS.map(c=>`<button class="${filter===c?'active':''}" onclick="filter='${c}';render()">${c}</button>`).join('')};
// Each card says its size so it's clear which platform format it is.
const renderSizes=render;render=function(){renderSizes();if(mode==='projects')return;document.querySelectorAll('#grid .card').forEach(c=>{let i=+(/openDesign\((\d+)\)/.exec(c.getAttribute('onclick')||'')||[])[1],t=templates[i];if(t?.social){let s=c.querySelector('small');if(s)s.textContent=`${t.category} · ${t.w}×${t.h}`}})};
})();
