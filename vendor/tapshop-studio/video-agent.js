// 🪄 Build My Video With AI: a guided maker that walks the creator from a product to a finished, editable video.
// It reuses the editor's own tools: the AI Script Writer (/api/generate-script, streamed), the camera (VideoCamera),
// the voiceover teleprompter (veVoiceover with onTake), captions (veClipWords / vePlaceCaptions / veAutoCaptions),
// text animations, sound effects (TapSFX) and free music (veMakeBeat). What it builds is ordinary clips and tracks,
// so everything stays editable. The scene plan (S.scenes) is the backbone: each step fills in its words, footage,
// voice timing, graphic and sound. Choices and words are kept as a draft (tapshop-agent-draft); clips and the voice
// take live in memory only.
(()=>{
const KEY='tapshop-agent-draft';
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STEPS=[['about','About'],['story','Story'],['script','Script'],['voice','Voice'],['footage','Footage'],['parts','Text + FX'],['build','Build']];
const PLATFORMS=[['tiktok','TikTok','9:16'],['shorts','YouTube Shorts','9:16'],['reels','Instagram Reels','9:16'],['stories','Stories','9:16'],['youtube','YouTube video','16:9'],['square','Square post','1:1'],['feed','Feed post','4:5']];
const TONES=['Casual & Authentic','High Energy','ASMR / Calm','Storytime'];
// [id, group, label, blurb, music style]. Ids match STORY_TYPES in src/types/script.ts.
const STORIES=[['AUTO','','✨ Pick for me','The AI picks the best story for your product.','auto'],
  ['PAS','Sell it','Problem → Agitate → Solve','Name the pain, twist the knife, reveal the fix.','hook'],
  ['3_REASONS','Sell it','3 Reasons Why','Three fast, punchy reasons to buy.','haul'],
  ['TIKTOK_SHOP_HOOK','Sell it','TikTok Shop Hook','Deal-driven, urgent, orange-cart energy.','flash'],
  ['BEFORE_AFTER','Sell it','Before / After','Life without it, then with it.','reveal'],
  ['THIS_VS_THAT','Sell it','This vs That','Beat the usual way of doing it.','fitness'],
  ['PRICE_REVEAL','Sell it','Price Reveal','Build value, then reveal the price.','flash'],
  ['HONEST_REVIEW','Build trust','Honest Review','What\'s good, one real con, a verdict.','story'],
  ['SKEPTIC_UNBOXING','Build trust','Skeptic Unboxing','"I didn\'t think this would work…" then proof.','unbox'],
  ['STORYTIME','Build trust','Storytime','A personal story that leads to the product.','story'],
  ['MYTH_VS_TRUTH','Build trust','Myth vs Truth','Bust a common myth.','tech'],
  ['DEINFLUENCING','Build trust','De-influencing','Skip the hype, get this instead.','story'],
  ['DONT_BUY_UNTIL','Build trust','Don\'t Buy Until…','Warn, then show what to look for.','tech'],
  ['UNBOXING','Show it','Unboxing','Open it on camera, first look.','unbox'],
  ['HOW_TO_USE','Show it','How to Use It','Step by step.','tutorial'],
  ['HACK','Show it','Hack / Tutorial','A clever trick with the product.','tutorial'],
  ['DAY_IN_LIFE','Show it','Day in My Life','The product inside a real day.','unbox'],
  ['GRWM','Show it','GRWM / Routine','Get ready with me, product as the star.','luxe'],
  ['ASMR_DEMO','Show it','ASMR Demo','Sounds and textures, few words.','luxe'],
  ['POV','Hook-first','POV','A relatable moment.','story'],
  ['MISTAKES','Hook-first','Mistakes You\'re Making','Call out a mistake, fix it.','tech'],
  ['WISH_I_KNEW','Hook-first','Things I Wish I Knew','What I\'d tell my past self.','story'],
  ['TOP_3','Hook-first','Top 3 List','Countdown with the product at #1.','haul'],
  ['WAIT_FOR_IT','Hook-first','Wait for It… Reveal','Build up to a satisfying reveal.','reveal'],
  ['PUT_TO_TEST','Hook-first','Put It to the Test','Stress-test it on camera.','fitness']];
const GROUPS=['Sell it','Build trust','Show it','Hook-first'];
// Default look for each part of the story: text animation, sound effect, height on screen (%).
// Word looks: every scene's words get their own style (font, colours, box, effect, or a shape with the words inside),
// so the video doesn't feel samey. Fonts are the editor's bundled TapFont* ones, so phones without Impact look the same.
// t = a text strip's fields, s = a shape strip's fields (inner text). SUIT lists the looks that fit each scene type.
const BOLD='TapFont17',TLOOKS={
  pill:['💗 Bold pill',{t:{color:'#ffffff',font:BOLD,boxColor:'#ff3ea5',boxOpacity:1,boxPad:30,boxRadius:60,textEffect:'shadow'}}],
  marker:['🖍️ Highlighter',{t:{color:'#111111',font:BOLD,boxColor:'#ffe14d',boxOpacity:1,boxPad:22,boxRadius:6,rotation:-2}}],
  neon:['💡 Neon sign',{t:{color:'#39ff14',font:BOLD,textEffect:'neon',effectColor:'#39ff14',boxColor:'#0b0b12',boxOpacity:.8,boxBorder:'solid',boxBorderW:4,boxBorderColor:'#39ff14',boxPad:26,boxRadius:20}}],
  sticker:['🏷️ Sticker',{t:{color:'#111111',font:BOLD,boxColor:'#ffffff',boxOpacity:1,boxBorder:'solid',boxBorderW:7,boxBorderColor:'#111111',boxPad:24,boxRadius:22,rotation:3}}],
  sunset:['🌅 Sunset 3D',{t:{color:'#ff8a00',gradTo:'#ff3ea5',gradAngle:90,textEffect:'extrude',effectColor:'#2a0f3d',font:BOLD}}],
  retro:['🕹️ Retro',{t:{color:'#ffd23f',textEffect:'retro',effectColor:'#ff3ea5',font:'TapFont9'}}],
  glass:['🧊 Frosted glass',{t:{color:'#ffffff',font:'TapFont16',boxColor:'#ffffff',boxOpacity:.22,boxBorder:'solid',boxBorderW:2,boxBorderColor:'#ffffff',boxPad:28,boxRadius:30,textEffect:'shadow'}}],
  gold:['🏆 Gold',{t:{color:'#ffd27a',textEffect:'gold',boxColor:'#111111',boxOpacity:.75,boxPad:24,boxRadius:10,font:'TapFont3'}}],
  fire:['🔥 Fire',{t:{color:'#ffcc00',textEffect:'fire',font:BOLD}}],
  comic:['💥 Comic',{t:{color:'#ffffff',textEffect:'doubleOutline',effectColor:'#7c3aed',font:BOLD,rotation:-3}}],
  ocean:['🌊 Ocean',{t:{color:'#38bdf8',textEffect:'ocean',font:BOLD,boxColor:'#0b1b33',boxOpacity:.7,boxPad:22,boxRadius:40}}],
  burst:['⭐ Starburst',{s:{shape:'burst',color:'#ffcc00',innerColor:'#1a1a1a'}}],
  speech:['💬 Speech bubble',{s:{shape:'cat:speech',color:'#ffffff',innerColor:'#111111'}}],
  shout:['📣 Shout bubble',{s:{shape:'cat:shout',color:'#ff2d55',innerColor:'#ffffff'}}],
  tag:['🏷️ Price tag',{s:{shape:'cat:tag',color:'#22c55e',innerColor:'#ffffff'}}],
  banner:['🎀 Ribbon',{s:{shape:'cat:banner',color:'#7c3aed',innerColor:'#ffffff'}}],
  seal:['🔴 Badge',{s:{shape:'cat:seal',color:'#ff3b30',innerColor:'#ffffff'}}],
  classic:['⬛ Simple box',{t:{color:'#ffffff',boxColor:'#000000',boxOpacity:.55,boxPad:24,boxRadius:16}}]};
const SUIT={Hook:['pill','sticker','sunset','comic','shout','neon','fire'],Problem:['marker','shout','comic','neon','retro'],Agitate:['fire','shout','marker','comic','retro'],
  'Demo/Solution':['glass','speech','ocean','pill','gold','banner'],'Social Proof':['gold','speech','banner','seal','glass'],CTA:['burst','tag','seal','pill','banner']};
// Size a shape so its words fit inside at a readable size: long words go on two balanced lines, then the shape is made
// big and wide enough for its own text area (veTextBox, SHAPE_ASPECT in video.js) to hold them, within the frame.
function shapeFit(g,text,W,H){const words=text.split(/\s+/);let lines=[text];
  if(text.length>11&&words.length>1){let best=null;for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(' '),b=words.slice(i).join(' '),m=Math.max(a.length,b.length);if(!best||m<best[0])best=[m,[a,b]]}lines=best[1]}
  const tb=(typeof veTextBox==='function'&&veTextBox(g))||[.15,.15,.85,.85],bw=tb[2]-tb[0],bh=tb[3]-tb[1],ar=(typeof SHAPE_ASPECT!=='undefined'&&SHAPE_ASPECT[g.shape])||1,m=Math.max(...lines.map(l=>l.length),1);
  const F=.075*W;let sw=m*.58*F/bw,sh=lines.length*1.2*F/bh;const k=Math.min(1,.94*W/sw,.3*H/sh);sw*=k;sh*=k;
  Object.assign(g,{inner:lines.join('\n'),size:sh*1280/(2*W),sx:Math.max(.6,Math.min(4,sw/(sh*ar))),sy:1})}
// Resolve "🎲 Surprise me" scenes: a look that fits the scene type, never the same as the one before it.
function chooseLooks(){let last='';return S.scenes.map(s=>{let k=s.look;if(!TLOOKS[k]){const pool=(SUIT[s.type]||Object.keys(TLOOKS).filter(x=>x!=='classic')).filter(x=>x!==last);k=pool[Math.floor(Math.random()*pool.length)]}last=k;return k})}
const LOOK={Hook:['pop','whoosh',30],Problem:['shake','buzz',22],Agitate:['wobble','scratch',22],'Demo/Solution':['slide','ding',22],'Social Proof':['bounce','sparkle',22],CTA:['elastic','click',72]};
const CAPS=[['pop','Word pop'],['karaoke','Karaoke'],['classic','Classic'],['boxed','Bold box'],['bounce','Bounce'],['reveal','Type on'],['neon','Neon'],['highlight','Highlight']];

const fresh=()=>({order:2,step:0,max:0,brief:{product:'',benefits:'',audience:'',platform:'tiktok',length:30,tone:'Casual & Authentic'},
  story:'AUTO',group:'',scriptMode:'ai',ownLines:'',title:'',hookOptions:[],hook:0,scenes:[],
  footage:'clips',voice:'record',captions:true,capStyle:'pop',brand:true,music:'auto',built:false});
let S=(()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d||!d.brief)return fresh();if(d.order!==2){if(d.step===3||d.step===4)d.step=7-d.step;d.order=2}return {...fresh(),...d,footage:'clips'}}catch{return fresh()}})();
const files=new Map();let take=null,busy=false,musicPlayer=null;
let saveT=0;const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}},300)};
const scene=x=>({type:x.sectionType||'Demo/Solution',secs:Math.max(1,+x.durationSeconds||3),say:String(x.voiceoverLine||''),text:String(x.onScreenText||''),shot:String(x.visualDirection||''),anim:'',sfx:''});
function pickParts(all){for(const s of S.scenes){const l=LOOK[s.type]||LOOK['Demo/Solution'];if(all||!s.anim)s.anim=l[0];if(all||!s.sfx)s.sfx=l[1]}}
const sfxList=()=>window.TapSFX?TapSFX.list:[];
const anims=()=>typeof TEXT_ANIMATIONS!=='undefined'?TEXT_ANIMATIONS.filter(([k])=>!/^giant/.test(k)):[['fade','Fade in / out']];
const hasBrand=()=>{try{return (typeof veBrandColors==='function'&&veBrandColors().length>0)||(typeof veBk==='function'&&!!veBk('tapshop-brand-fonts',null))}catch{return false}};

// ---------- dialog ----------
const css=document.createElement('style');
css.textContent=`#agDialog{width:min(720px,96vw);padding:14px 16px}
#agDialog[open]{display:flex;flex-direction:column;gap:8px;overflow:hidden;height:min(88vh,88dvh);max-height:min(88vh,88dvh)}
.ag-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.ag-head h2{margin:0;font-size:20px}.ag-sub{margin:2px 0 0;font-size:13px;opacity:.7}
.ag-x{flex:none;width:40px;height:40px;padding:0!important;border-radius:50%!important;font-size:22px;line-height:1}
.ag-steps{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.ag-steps::-webkit-scrollbar{display:none}
.ag-steps button{flex:none;border-radius:999px!important;padding:4px 10px!important;font-size:12px;opacity:.55}
.ag-steps button.on{opacity:1;background:#ff3ea5!important;color:#fff!important;border-color:#ff3ea5!important}.ag-steps button.done{opacity:.9}
.ag-steps button:disabled{opacity:.3}
/* Only the middle scrolls; the header, steps and buttons never shrink. contain + pan-y keep a finger swipe inside the window
   instead of scrolling the page behind it (big touch screens like a folded-open phone). */
.ag-head,.ag-steps,.ag-status,.ag-bar{flex:none}
.ag-body{flex:1 1 auto;min-height:0;overflow:auto;padding:2px 2px 8px;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}
.ag-body h3{margin:6px 0 4px;font-size:17px}.ag-help{margin:0 0 10px;font-size:13px;opacity:.75}.ag-help.ag-tip{opacity:1;color:#ec4899;font-weight:600;margin:4px 0 6px}
.ag-body label.ag-f{display:block;margin:10px 0;font-size:13px;font-weight:600}
.ag-body label.ag-f input,.ag-body label.ag-f textarea,.ag-body label.ag-f select{display:block;width:100%;margin-top:4px;font-weight:400}
.ag-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 10px}
.ag-card{text-align:left!important;padding:10px 12px!important;border-radius:12px!important;line-height:1.3}
.ag-card b{display:block;font-size:14px}.ag-card small{display:block;opacity:.7;font-size:12px;font-weight:400;margin-top:2px}
.ag-card.on{border-color:#ff3ea5!important;box-shadow:inset 0 0 0 1px #ff3ea5;background:#ff3ea51a!important}
.ag-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.ag-chips button{border-radius:999px!important;padding:5px 12px!important;font-size:13px}
.ag-chips button.on{background:#ff3ea5!important;color:#fff!important;border-color:#ff3ea5!important}
.ag-sec{border:1px solid #8884;border-radius:16px;padding:12px;margin:14px 0;background:#ffffff06}
.ag-sh{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:15px}.ag-sh b{flex:1}
.ag-num{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#ff3ea5;color:#fff;font-weight:800;font-size:13px}
.ag-opt .ag-num{background:#8888}.ag-sum{font-size:12px;opacity:.75;white-space:nowrap}.ag-sum b{color:#ff3ea5}
.ag-sc{border:1px solid #8886!important;border-radius:14px!important;padding:0 12px 10px!important;margin:12px 0!important;overflow:hidden}
.ag-sch{display:flex;align-items:center;gap:8px;margin:0 -12px 8px;padding:8px 12px;background:#8881;border-bottom:1px solid #8884}
.ag-snum{flex:none;display:grid;place-items:center;min-width:28px;height:28px;border-radius:9px;background:#ff3ea5;color:#fff;font-weight:800}
.ag-type{flex:1;min-width:0;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;line-height:1.2;overflow-wrap:anywhere}
.ag-sc input,.ag-sc textarea{box-sizing:border-box}.ag-sc .ag-len input{width:52px}
.t-hook{color:#ff3ea5}.t-cta{color:#22c55e}.t-prob{color:#f59e0b}.t-sol{color:#38bdf8}.t-mid{color:#a78bfa}
.ag-rm{flex:none;padding:4px 8px!important;font-size:14px;border-radius:9px}
.ag-fl{display:block;font-size:12px;font-weight:700;opacity:.9;margin-top:8px}
.ag-fold{border:1px dashed #8886;border-radius:12px;padding:8px 10px;margin-top:10px}.ag-fold[open]{border-style:solid}
.ag-fold summary{cursor:pointer;font-weight:700;font-size:14px;list-style-position:inside}.ag-fold summary small{display:block;font-weight:500;opacity:.7;margin-left:18px;font-size:12px}
.ag-linefold{border:0;padding:0;margin-top:8px}.ag-linefold summary{font-size:13px;color:#ff3ea5}
.ag-g{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:12px 0 0}
.ag-scene{border:1px solid #8885;border-radius:12px;padding:10px 12px;margin:8px 0}
.ag-scene.next{border-color:#ff3ea5;box-shadow:inset 0 0 0 1px #ff3ea5}
.ag-tag{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#ff3ea5}
.ag-tag button{font-size:12px;padding:2px 8px!important;text-transform:none;letter-spacing:0}
.ag-tag>span:first-child{flex:1}.ag-addrow{align-items:center}.ag-total{margin-left:auto;font-size:15px;text-align:right}.ag-total b{color:#ff3ea5;font-size:18px}
.ag-len{display:inline-flex;align-items:center;gap:4px;text-transform:none;letter-spacing:0;font-size:13px;color:inherit}.ag-len button{min-width:30px;font-size:16px!important;font-weight:800;padding:2px 0!important}.ag-len input{width:54px;padding:3px 4px;text-align:center;font:inherit;font-weight:700;border-radius:8px}
.ag-scene input,.ag-scene textarea,.ag-scene select{width:100%;margin-top:4px}
.ag-scene .ag-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:6px}.ag-scene .ag-row>label{flex:1 1 140px;font-size:12px}
.ag-shot{font-size:13px;opacity:.85;margin:4px 0}.ag-need{display:block;margin:2px 0 8px;font-size:13px;line-height:1.45;color:#ec4899}.ag-move{margin:0 4px;padding:2px 4px;font-size:12px;border-radius:8px;max-width:96px}.ag-retake{margin:0 4px;padding:2px 8px!important;font-size:12px;border-radius:8px;color:#ec4899}.ag-hooks .ag-card small{white-space:normal;font-size:13px;line-height:1.35}.ag-ai{display:flex;gap:6px;overflow-x:auto;align-items:center;margin:8px 0 2px;padding-bottom:2px;scrollbar-width:thin}.ag-ai span{flex:none;font-size:12px;font-weight:700;color:#ec4899}.ag-ai button{flex:none;font-size:12px;padding:5px 10px;border-radius:999px;white-space:nowrap}.ag-ai button.on{border-color:#ec4899;color:#ec4899}
.ag-files{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ag-file{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid #8886;border-radius:999px;padding:3px 4px 3px 10px;max-width:100%}
.ag-file span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}.ag-file button{width:24px;height:24px;padding:0!important;border-radius:50%!important;font-size:13px}
.ag-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.ag-meter{margin:6px 0 2px;padding:10px 12px;border-radius:14px;border:2px solid #ec4899;background:#ec489914}.ag-meter.ok{border-color:#22c55e;background:#22c55e14}
.ag-mtop{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px}.ag-mtop b{font-size:16px}.ag-mtop span{font-size:12px;opacity:.8}
.ag-bar{height:8px;margin-top:8px;border-radius:99px;background:#8883;overflow:hidden}.ag-bar i{display:block;height:100%;border-radius:inherit;background:#ec4899;transition:width .3s}.ag-meter.ok .ag-bar i{background:#22c55e}.ag-meter.ok .ag-mtop span{color:#22c55e;opacity:1;font-weight:700}
.ag-clipname em{flex:none;font-style:normal;font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:#8882}
.ag-clip{margin:10px 0 0;padding:10px;border:1px solid #8886;border-radius:14px;background:#8881}
.ag-clipname{display:flex;align-items:center;gap:6px;font-size:13px;min-width:0}.ag-clipname span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
.ag-clipbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ag-clipbtns button{min-height:44px;border-radius:12px!important;font-weight:700;font-size:14px}
.ag-clipbtns button[data-act=rmFile]{color:#f87171}
.ag-ex{margin:2px 0 6px;font-size:13px;line-height:1.4;opacity:.85}
.ag-shotlist{display:block;margin:4px 0 12px;padding:14px 16px;border-radius:16px;border:2px solid #ec4899;background:#ec48991a}.ag-shotlist b{display:block;font-size:18px;margin-bottom:4px}.ag-shotlist span{display:block;font-size:14px;line-height:1.45;opacity:.85}
.ag-action{display:block;width:100%;margin-top:10px;min-height:50px;border-radius:14px!important;border:none!important;background:linear-gradient(135deg,#ec4899,#f43f5e)!important;color:#fff!important;font:800 16px system-ui,sans-serif!important;box-shadow:0 4px 14px #ec489955;cursor:pointer}
.ag-action:active{transform:scale(.98)}
.ag-best{position:relative;border:2px solid #ec4899!important;background:#ec489926!important;font-weight:700}.ag-best::after{content:'⭐ Best';position:absolute;top:-9px;right:-6px;padding:1px 7px;border-radius:999px;background:#ec4899;color:#fff;font-size:10px;font-weight:800;line-height:16px}
.ag-rec{margin:4px 0 12px;padding:12px 14px;border-radius:14px;border:2px solid #ec4899;background:linear-gradient(90deg,#ec489922,#fbbf2418);font-size:14px;line-height:1.45}.ag-rec b{color:#ec4899}
.ag-take{display:flex;align-items:center;gap:10px;margin:2px 0 10px}.ag-take b{display:block;font-size:15px}.ag-take small{display:block;font-size:12px;opacity:.7;margin-top:1px}
.ag-ok{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#22c55e;color:#fff;font-weight:800;font-size:17px}
.ag-audio{display:block;width:100%;margin:0 0 4px}
.ag-fxpill{display:inline-block;margin:6px 0 0;padding:4px 10px;border-radius:999px;background:#ff3ea51f;color:#ff3ea5;font-size:12px;font-weight:700}
.ag-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.ag-row2.ag-one{grid-template-columns:1fr}.ag-row2 button{min-height:46px;border-radius:12px!important;font-weight:700}
.ag-note{margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#8881;font-size:13px;line-height:1.45;opacity:.9}
.ag-dim{font-size:12px;opacity:.6;font-weight:400}.ag-sec .ag-cards{margin:0}.ag-sec .ag-check{margin:2px 0 4px}.ag-sec label.ag-f{margin-bottom:0}
.ag-check{display:flex!important;align-items:center;gap:8px;font-size:14px;margin:10px 0}.ag-check input{width:20px;height:20px;flex:none}
.ag-sum{margin:6px 0;padding-left:18px;line-height:1.7}.ag-done{text-align:center;padding:24px 8px}.ag-done b{display:block;font-size:22px;margin-bottom:6px}
.ag-status{margin:0;font-size:13px;min-height:1.2em;opacity:.85}
.ag-bar{display:flex;gap:8px}.ag-bar button{flex:1 1 0;min-width:0;min-height:48px;font-size:16px;font-weight:700}.ag-bar button[hidden]{display:none}
.ag-card.on b::after{content:' ✓';color:#ff3ea5}
/* The editor theme paints every pressed button in its own colours; the agent's picks must stay pink in light and dark. */
html body #agDialog .ag-card.on{background:#ff3ea51f!important;color:inherit!important;border-color:#ff3ea5!important;box-shadow:inset 0 0 0 2px #ff3ea5!important}
html body #agDialog .ag-chips button.on,html body #agDialog .ag-steps button.on{background:#ff3ea5!important;color:#fff!important;border-color:#ff3ea5!important}
@media (max-width:700px),(pointer:coarse){#agDialog[open]{width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:100dvh;margin:0;inset:0;border-radius:0;border:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}}`;
document.head.appendChild(css);

const dlg=document.createElement('dialog');dlg.id='agDialog';dlg.className='closable';dlg.setAttribute('aria-labelledby','agTitle');
dlg.innerHTML=`<div class="ag-head"><div><h2 id="agTitle">🪄 Build My Video With AI</h2><p class="ag-sub">Your footage, your voice. AI helps put it together.</p></div><button type="button" class="ag-x" aria-label="Close" title="Close">×</button></div>
<nav class="ag-steps" id="agSteps" aria-label="Steps"></nav>
<div class="ag-body" id="agBody"></div>
<p class="ag-status" id="agStatus" role="status"></p>
<div class="ag-bar"><button type="button" id="agBack">← Back</button><button type="button" class="primary" id="agNext">Next →</button></div>
<input type="file" id="agFile" accept="video/*" multiple hidden>`;
document.body.appendChild(dlg);
const body=byId('agBody'),status=s=>byId('agStatus').textContent=s,nextBtn=byId('agNext'),backBtn=byId('agBack'),fileIn=byId('agFile');
let fileTarget=-1;

// ---------- each step ----------
const card=(act,v,on,title,sub='',extra='')=>`<button type="button" class="ag-card${on?' on':''}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${!!on}" ${extra}><b>${title}</b>${sub?`<small>${sub}</small>`:''}</button>`;
const chip=(act,v,on,label)=>`<button type="button" class="${on?'on':''}" data-act="${act}" data-v="${esc(v)}" aria-pressed="${!!on}">${label}</button>`;
const opts=(list,cur)=>list.map(([k,v])=>`<option value="${esc(k)}"${k===cur?' selected':''}>${esc(v)}</option>`).join('');

// A quick, real-life way to film each kind of scene: two per type (alternating so scenes next to each other differ),
// one set for b-roll and one for talking to the camera. P = the product's name.
const EXAMPLES={
  'Hook':[['Start close on {P}, then pull back fast so it fills the frame','Drop {P} onto the table or into your hand, in one quick move'],['Lean into the camera and say your line like you\'re telling a friend a secret','Hold {P} up next to your face and say your line with a big reaction']],
  'Problem':[['Show the old way going wrong: the mess, the struggle, the thing that annoys you','Film your hands trying (and failing) with what you used before'],['Shake your head and say it with a tired, been-there face','Hold up the old thing and say your line like you\'re fed up with it']],
  'Agitate':[['A slow close-up of the worst part: the stain, the smell, the clutter','Film it twice in a row, a little closer each time, so it feels like it keeps happening'],['Count on your fingers as you list what goes wrong','Say it a little louder and faster, like you\'ve had enough']],
  'Demo/Solution':[['Show {P} working from start to finish, hands only, close up','Film the before and after in the same spot, so the change is easy to see'],['Hold {P} up and show the one thing you love most while you talk','Use {P} on camera and talk us through it as you go']],
  'Social Proof':[['Scroll through real reviews or messages on your phone screen','Show {P} being used at home: on the shelf, in your bag, every day'],['Say it like a friend sharing a real result, with a smile','Point at {P} and say your line with total confidence']],
  'CTA':[['Hold {P} toward the camera, then point down to the cart or link','End on {P} sitting nicely in the frame, with space for the words'],['Smile, point down at the link and say your line clearly','Hold {P} next to your face, nod and say your line']]};
const example=(s,i)=>{const t=EXAMPLES[s.type]||EXAMPLES['Demo/Solution'],l=t[S.voice==='talking'?1:0][i%2],p=(S.brief.product||'').trim();return l.replace(/\{P\}/g,p||'it')};
const VIEWS={
about(){const b=S.brief;return `<h3>Tell me about it</h3><p class="ag-help">What are you making a video for? Only use claims the brand approved.</p>
  <label class="ag-f">Product name *<input data-k="brief.product" maxlength="120" value="${esc(b.product)}" placeholder="e.g. GlowDrop Vitamin C Serum"></label>
  <label class="ag-f">Key benefits *<textarea data-k="brief.benefits" rows="4" maxlength="1500" placeholder="Fades dark spots, lightweight, no sticky feel">${esc(b.benefits)}</textarea></label>
  <label class="ag-f">Who it's for (optional)<input data-k="brief.audience" maxlength="400" value="${esc(b.audience)}" placeholder="Busy moms, gym beginners…"></label>
  <div class="ag-g">Where will you post it?</div><div class="ag-chips">${PLATFORMS.map(([id,n,a])=>chip('platform',id,b.platform===id,`${esc(n)} · ${a}`)).join('')}</div>
  <div class="ag-g">How long?</div><div class="ag-chips">${[15,30,60].map(n=>chip('length',n,b.length===n,n+' s')).join('')}</div>
  <label class="ag-f">Tone<select data-k="brief.tone">${opts(TONES.map(t=>[t,t]),b.tone)}</select></label>`},
story(){const list=STORIES.slice(1).filter(s=>!S.group||s[1]===S.group);
  return `<h3>Pick a story</h3><p class="ag-help">The shape of your video. Not sure? Let the AI pick.</p>
  <div class="ag-cards">${card('story','AUTO',S.story==='AUTO','✨ Pick for me','The AI picks the best story for your product.')}</div>
  <div class="ag-chips">${chip('group','',!S.group,'All 24')}${GROUPS.map(g=>chip('group',g,S.group===g,g)).join('')}</div>
  ${(S.group?[S.group]:GROUPS).map(g=>`<div class="ag-g">${g}</div><div class="ag-cards">${list.filter(s=>s[1]===g).map(s=>card('story',s[0],S.story===s[0],esc(s[2]),esc(s[3]))).join('')}</div>`).join('')}`},
script(){const m=S.scriptMode,n=S.scenes.length;
  // Three numbered sections: how to write it, the scenes themselves, then optional AI help folded away.
  let h=`<h3>Your script</h3><p class="ag-help">What you'll say in each scene. Write it, check your scenes, then tap <b>Next</b>.</p>
  <section class="ag-sec"><div class="ag-sh"><span class="ag-num">1</span><b>How do you want your script?</b></div>
  <div class="ag-cards">${card('mode','ai',m==='ai','✨ Write it for me','AI writes it from your product')}${card('mode','own',m==='own','I have my own','Paste your lines')}${card('mode','none',m==='none','No talking','Words on screen only')}</div>`;
  if(m==='own')h+=`<label class="ag-f">One line per scene. The first is your hook, the last your call to action.<textarea data-k="ownLines" rows="6" placeholder="Stop scrolling if your shakes are chalky.&#10;Mine always were…&#10;Then I found this bottle.&#10;Tap the orange cart.">${esc(S.ownLines)}</textarea></label><div class="ag-btns"><button type="button" class="primary" data-act="own">Use my lines</button></div>`;
  else h+=`<div class="ag-btns"><button type="button" class="primary" data-act="write" ${busy?'disabled':''}>${busy?'Writing…':n?'↻ Write a new one':'✨ Write my script'}</button></div>`;
  h+=`</section>`;
  if(!n)return h;
  h+=`<section class="ag-sec"><div class="ag-sh"><span class="ag-num">2</span><b>${esc(S.title||'Your scenes')}</b><span class="ag-sum">${n} scene${n>1?'s':''} · ⏱️ <span id="agTotal">${totalLen()}</span></span></div>
  <p class="ag-help">✏️ Tap any text to change it. <b>− / +</b> sets how long a scene lasts (give slow or calm lines more time).</p>`+
  S.scenes.map((s,i)=>`<div class="ag-scene ag-sc"><div class="ag-sch"><span class="ag-snum">${i+1}</span><span class="ag-type ${typeTone(s.type)}">${esc(s.type||'Scene')}</span>
    <span class="ag-len" title="How long this scene lasts"><button type="button" data-act="secs" data-i="${i}" data-v="-0.5" aria-label="Shorter">−</button><input type="number" inputmode="decimal" min="1" max="60" step="0.5" data-k="secs" data-i="${i}" value="${s.secs}" aria-label="Scene ${i+1} length in seconds">s<button type="button" data-act="secs" data-i="${i}" data-v="0.5" aria-label="Longer">+</button></span>
    <button type="button" class="ag-rm" data-act="rmScene" data-i="${i}" aria-label="Remove scene ${i+1}" title="Remove this scene">🗑</button></div>
    ${m==='none'?'':`<label class="ag-fl">🗣️ What you say<textarea data-k="say" data-i="${i}" rows="2">${esc(s.say)}</textarea></label>`}
    <label class="ag-fl">🔤 Words on screen<input data-k="text" data-i="${i}" maxlength="120" value="${esc(s.text)}"></label>${lineAI(i)}</div>`).join('')+
  `<div class="ag-btns ag-addrow"><button type="button" data-act="addScene">＋ Add a scene</button></div></section>`;
  h+=`<section class="ag-sec ag-opt"><div class="ag-sh"><span class="ag-num">3</span><b>Extra AI help</b><span class="ag-sum">optional</span></div>`;
  if(m!=='none'){const cur=S.hook?'Hook '+String.fromCharCode(64+S.hook):'Original';
    h+=`<details class="ag-fold" data-fold="hook" ${UI.hook?'open':''}><summary>🎣 Try a different hook <small>Now using: ${cur}</small></summary><p class="ag-help">The first line decides if people keep watching. Tap the one you like best; it becomes scene 1.</p>`;
    if(S.hookOptions.length>1)h+=`<div class="ag-cards ag-hooks">${S.hookOptions.map((o,i)=>card('hook',i,S.hook===i,i?'Hook '+String.fromCharCode(64+i):'Original',esc(o))).join('')}</div>`;
    h+=`<div class="ag-btns"><button type="button" data-act="newHooks" ${busy?'disabled':''}>↻ 3 new hooks</button></div></details>`}
  h+=`<details class="ag-fold" data-fold="ask" ${UI.ask||S.prev?'open':''}><summary>💬 Change the whole script <small>Tell the AI what to change</small></summary><p class="ag-help">Like you'd tell a friend. It keeps everything else.</p>
    <div class="ag-chips">${ASKS.map(a=>`<button type="button" data-act="ask" data-v="${esc(a)}" ${busy?'disabled':''}>${esc(a)}</button>`).join('')}</div>
    <label class="ag-f"><textarea data-k="ask" rows="2" maxlength="500" placeholder="e.g. make it funnier, or mention it's dishwasher safe">${esc(S.ask||'')}</textarea></label>
    <div class="ag-btns"><button type="button" class="primary" data-act="askGo" ${busy?'disabled':''}>✨ Change it</button>${S.prev?`<button type="button" data-act="undoAsk" ${busy?'disabled':''}>↩ Undo last change</button>`:''}</div></details></section>`;
  return h},
footage(){let h=`<div class="ag-shotlist"><b>🎬 Your shot list</b><span>Film scene by scene with shot ideas and use scripts as guides every step of the way.</span></div>`;
  const nextI=S.scenes.findIndex((s,i)=>!(files.get(i)||[]).length);
  h+=S.scenes.map((s,i)=>{const fl=files.get(i)||[];return `<div class="ag-scene${i===nextI?' next':''}"><div class="ag-tag"><span>${i+1} · ${esc(s.type)}${i===nextI?' · next to film':''}</span></div>
    <p class="ag-shot">🎥 <b>Shot idea:</b> ${esc(s.shot||'Anything that shows: '+(s.text||s.say))}</p>
    <p class="ag-ex">💡 <b>Example:</b> ${esc(example(s,i))}</p>
    <p class="ag-need">⏱️ <b>About ${filmSecs(s)} seconds</b> ${S.voice==='talking'?'· say your line in one take, with a breath before and after':'· a little extra is fine, we trim it to fit'}</p>
    ${filmed(fl,filmSecs(s))}
    ${fl.map((x,j)=>`<div class="ag-clip"><div class="ag-clipname">🎞️ <span>${esc(x.name)}</span>${clipDur(x)?`<em>${fmtS(clipDur(x))}</em>`:''}</div><div class="ag-clipbtns">${window.VideoCamera?`<button type="button" data-act="retake" data-i="${i}" data-j="${j}" aria-label="Retake this clip">↺ Retake</button>`:''}<button type="button" data-act="rmFile" data-i="${i}" data-j="${j}" aria-label="Remove this clip">✕ Remove</button></div></div>`).join('')}
    <button type="button" class="ag-action" data-act="${touch()?'filmLine':'film'}" data-i="${i}" style="${fl.length?'background:transparent!important;color:#ec4899!important;border:2px solid #ec4899!important;box-shadow:none':'background:linear-gradient(135deg,#ec4899,#f43f5e)!important;color:#fff!important;border:none!important'}">${fl.length?'🎬 Film more':'🎬 Lights, camera, action!'}</button></div>`}).join('');
  return h},
voice(){const v=S.voice,none=S.scriptMode==='none';
  const sec=(n,title,body,sum='')=>`<section class="ag-sec"><div class="ag-sh"><span class="ag-num">${n}</span><b>${title}</b>${sum}</div>${body}</section>`;
  let h=`<h3>Voice + captions</h3><p class="ag-help">${none?'You picked no talking, so music and words on screen carry the video.':'How will people hear your script?'}</p>`;
  h+=sec(1,'How you\'ll be heard',`<div class="ag-cards">${card('voice','record',v==='record','🎙️ Record a voiceover','With a teleprompter')}${card('voice','talking',v==='talking','🗣️ I\'ll talk while I film','Use the sound from my filming')}${card('voice','none',v==='none','🔇 No voice','Music and text only')}</div>`);
  let n=2;
  if(v==='record')h+=sec(n++,'Your voiceover',take
    ?`<div class="ag-take"><span class="ag-ok">✓</span><div><b>Voiceover ready</b><small>${take.dur.toFixed(1)} s · scenes line up with when you said them</small></div></div>
      <audio controls src="${esc(take.url)}" class="ag-audio"></audio>
      ${take.fx?`<p class="ag-fxpill">🎚️ ${esc(fxLabel(take.fx))}</p>`:''}
      <div class="ag-row2">${window.veVoiceStudio?`<button type="button" class="primary" data-act="voiceFx">🎚️ Edit my voice</button>`:''}<button type="button" data-act="record">↺ Record again</button></div>
      ${window.veVoiceStudio&&!take.fx?`<p class="ag-note">🎚️ <b>Edit my voice</b> removes fan and AC noise and adds effects like podcast, reverb or echo. You can listen before you keep it.</p>`:''}`
    :`<p class="ag-help ag-tip">👇 Tap <b>Open the teleprompter</b> to record. Your script scrolls on screen while you read it out loud.</p><div class="ag-row2 ag-one"><button type="button" class="primary" data-act="record">🎙️ Open the teleprompter</button></div>`);
  if(v!=='none')h+=sec(n,'Captions',`<label class="ag-check"><input type="checkbox" data-k="captions" ${S.captions?'checked':''}> ✨ Auto captions <small class="ag-dim">words appear as you speak</small></label>${S.captions?`<label class="ag-f">Caption style<select data-k="capStyle">${opts(CAPS,S.capStyle)}</select></label>`:''}`);
  return h},
parts(){const sx=[['','None'],...sfxList().map(([k,e,n])=>[k,e+' '+n])],an=anims(),groups=window.veMusicGroups?veMusicGroups():[];
  const music=[['auto','✨ Pick for me'],['','No music'],...groups.flatMap(([l,ks])=>ks.filter(k=>window.veMoods?.[k]).map(k=>[k,l.split(' ')[0]+' '+veMoods[k].name]))];
  return `<h3>🎨 Text, graphics + sounds</h3><p class="ag-help">This step adds the fun stuff on top of your video: words on screen, emoji, call-to-action buttons (like “Shop now”), animations, sound effects and music. Tap ✨ Pick for me, or choose each part yourself. 🎲 Surprise me gives every part its own eye-catching style. You can change anything later in the editor.</p>
  <div class="ag-btns"><button type="button" data-act="pick">✨ Pick for me</button></div>
  ${hasBrand()?`<label class="ag-check"><input type="checkbox" data-k="brand" ${S.brand?'checked':''}> ★ Use my brand kit (fonts and colours)</label>`:''}
  ${S.scenes.map((s,i)=>`<div class="ag-scene"><div class="ag-tag"><span>${i+1} · ${esc(s.type)}</span></div>
    <label>Words on screen<input data-k="text" data-i="${i}" maxlength="120" value="${esc(s.text)}" placeholder="Leave empty for no text"></label>
    <div class="ag-row"><label>Look<select data-k="look" data-i="${i}">${opts([['','🎲 Surprise me'],...Object.entries(TLOOKS).map(([k,[n]])=>[k,n])],s.look||'')}</select></label>
    <label>Animation<select data-k="anim" data-i="${i}">${opts(an,s.anim||'fade')}</select></label>
    <label>Sound effect<select data-k="sfx" data-i="${i}">${opts(sx,s.sfx)}</select></label><button type="button" data-act="sfxPlay" data-i="${i}" aria-label="Play sound">▶</button></div></div>`).join('')}
  <div class="ag-g">Music</div><div class="ag-row" style="display:flex;gap:8px;align-items:center"><select data-k="music" style="flex:1">${opts(music,S.music)}</select><button type="button" data-act="musicPlay" aria-label="Listen">▶ Listen</button></div>`},
build(){if(S.built)return `<div class="ag-done"><b>🎉 Your video is ready!</b><p class="ag-help">It's in the editor now: every clip, word, sound and caption can still be changed.</p>
  <div class="ag-btns" style="justify-content:center"><button type="button" class="primary" data-act="watch">▶ Watch it</button><button type="button" data-act="edit">✏️ Edit it</button><button type="button" data-act="restart">🪄 Make another</button></div></div>`;
  const n=[...files.values()].reduce((a,l)=>a+l.length,0),st=STORIES.find(s=>s[0]===S.story);
  return `<h3>Ready to build</h3><p class="ag-help">Here's what goes into your video:</p><ul class="ag-sum">
  <li><b>${esc(S.brief.product)}</b> · ${esc(PLATFORMS.find(p=>p[0]===S.brief.platform)?.[1]||'')} · ${S.brief.length} s</li>
  <li>Story: ${esc(st?st[2]:S.story)} · ${S.scenes.length} scenes</li>
  <li>Footage: ${n+' clip'+(n===1?'':'s')}</li>
  <li>Voice: ${S.voice==='record'?(take?'your voiceover ✓':'not recorded yet'):S.voice==='talking'?'from your clips':'none'}${S.voice!=='none'&&S.captions?' · auto captions':''}</li>
  <li>Music: ${S.music==='auto'?'picked for you':S.music?esc(window.veMoods?.[S.music]?.name||S.music):'none'}</li></ul>
  <p class="ag-help">If you already have a video open, it's kept in Recent videos.</p>`}};

function paint(){const i=S.step;
  byId('agSteps').innerHTML=STEPS.map(([k,l],j)=>`<button type="button" data-step="${j}" class="${j===i?'on':j<i?'done':''}" ${j>S.max?'disabled':''}>${j+1} ${l}</button>`).join('');
  body.innerHTML=VIEWS[STEPS[i][0]]();
  backBtn.hidden=i===0||(S.built&&i===STEPS.length-1);nextBtn.hidden=S.built&&i===STEPS.length-1;
  nextBtn.disabled=busy;nextBtn.textContent=i===STEPS.length-1?'🎬 Build my video':'Next →';
  byId('agSteps').querySelector('.on')?.scrollIntoView({inline:'nearest',block:'nearest'})}

function check(){const k=STEPS[S.step][0];
  if(k==='about'&&(!S.brief.product.trim()||!S.brief.benefits.trim()))return 'Add the product name and its key benefits first.';
  if(k==='script'&&!S.scenes.length)return S.scriptMode==='own'?'Type your lines, then tap Use my lines.':'Tap ✨ Write my script first.';
  if(k==='voice'&&S.voice==='record'&&!take)return 'Tap 🎙️ Open the teleprompter to record your voiceover, or pick another option.';
  return ''}
function go(to){if(busy)return;if(to>S.step){const e=check();if(e){status(e);return}}
  stopMusic();S.step=Math.max(0,Math.min(STEPS.length-1,to));S.max=Math.max(S.max,S.step);
  if(STEPS[S.step][0]==='parts')pickParts(false);
  status('');save();paint();body.scrollTop=0}

// ---------- the script ----------
async function readStream(res,onProgress){const reader=res.body.getReader(),dec=new TextDecoder();let buf='',result=null;
  for(;;){const {done,value}=await reader.read();if(value)buf+=dec.decode(value,{stream:true});let nl;
    while((nl=buf.indexOf('\n'))>=0){const line=buf.slice(0,nl).trim();buf=buf.slice(nl+1);if(!line)continue;
      try{const ev=JSON.parse(line);if(ev.type==='progress')onProgress(ev.chars||0);else if(ev.type==='result')result=ev}catch{}}
    if(done)return result}}
async function writeScript(){if(busy)return;busy=true;paint();const b=S.brief,t0=Date.now(),secs=()=>Math.round((Date.now()-t0)/1000);
  // A live counter so a slow answer never looks frozen, and a time limit so it can't wait forever.
  let chars=0;const tick=()=>status(chars?`Writing your script… ${Math.min(95,Math.round(chars/(900+b.length*60)*100))}%`:`Thinking… ${secs()} s${secs()>30?' (almost there)':''}`);
  const timer=setInterval(tick,1000),ctl=new AbortController(),limit=setTimeout(()=>ctl.abort(),150000);tick();
  try{const res=await fetch('/api/generate-script',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
      body:JSON.stringify({productName:b.product,keyBenefits:b.benefits,targetAudience:b.audience||undefined,framework:S.story,durationSeconds:b.length,tone:b.tone,platform:b.platform,textOnly:S.scriptMode==='none'})});
    const data=(res.headers.get('content-type')||'').includes('ndjson')&&res.body
      ?await readStream(res,ch=>{chars=ch;tick()})
      :await res.json().catch(()=>null);
    if(!data){status(res.status===504?'The AI took too long. Please try again.':'The connection dropped before the script finished. Please try again.');return}
    if(!data.ok){status(data.error||'Couldn\'t write the script. Please try again.');return}
    const sc=data.script;S.title=sc.title||'';S.scenes=sc.scenes.map(scene);S.hookOptions=[S.scenes[0]?.say||'',...(sc.hookVariations||[])].filter(Boolean);S.hook=0;
    pickParts(true);files.clear();status('Script ready. Edit any line, remove scenes with ✕ or add more, then tap Next.')}
  catch(e){status(e?.name==='AbortError'?'The AI took too long. Tap ✨ Write my script to try again.':'Network error. Check your connection and try again.')}
  finally{clearInterval(timer);clearTimeout(limit);busy=false;save();paint()}}
// Phase 4: change the script by asking (or get 3 fresh hooks) through /api/edit-script. The scenes keep their
// look, animation and sound when the change leaves them at the same place; ↩ Undo restores the last version.
// Per-scene AI: a row of chips under each scene; one tap asks for 3 rewrites of just that scene's line in that
// style, shown as cards to tap; ↩ puts the line back. Only one scene's options are open at a time (S.sugg).
const LINE_STYLES=[['better','✨ Better','make it better: more scroll-stopping and clear'],['simple','🧸 Simpler','simpler words, easy to say'],['natural','🗣️ More natural','more natural flowing, like real talk'],['punchy','⚡ Punchier','punchier and more energetic'],['funny','😂 Funnier','add a little humor'],['short','✂️ Shorter','shorter'],['emotional','💗 More emotional','more emotional and relatable'],['specific','🎯 More specific','more specific and concrete, sensory details']];
function lineAI(i){const g=S.sugg,open=g&&g.i===i,undo=S.lineUndo&&S.lineUndo.i===i;let h=`<details class="ag-fold ag-linefold" ${open||undo||UI['line'+i]?'open':''} data-fold="line${i}"><summary>✨ Rewrite this line with AI</summary><div class="ag-ai"><span>✨ AI:</span>${LINE_STYLES.map(([k,l])=>`<button type="button" data-act="lineAI" data-i="${i}" data-v="${k}" class="${open&&g.style===k?'on':''}" ${busy?'disabled':''}>${l}</button>`).join('')}</div>`;
  if(open&&g.options)h+=`<div class="ag-cards ag-hooks">${g.options.map((o,j)=>`<button type="button" class="ag-card" data-act="useLine" data-i="${i}" data-v="${j}"><b>Option ${j+1}</b><small>${esc(o.say)}${o.text?`<br><i>On screen: ${esc(o.text)}</i>`:''}</small></button>`).join('')}</div><div class="ag-btns"><button type="button" data-act="lineAI" data-i="${i}" data-v="${g.style}" ${busy?'disabled':''}>↻ 3 more</button><button type="button" data-act="closeLine">Close</button></div>`;
  if(undo)h+=`<div class="ag-btns"><button type="button" data-act="undoLine" data-i="${i}">↩ Put back my old line</button></div>`;return h+'</details>'}
// Which folded boxes are open, so a repaint doesn't snap them shut.
const UI={};
const typeTone=t=>/hook/i.test(t)?'t-hook':/cta|call/i.test(t)?'t-cta':/problem|agitat|pain|myth|before/i.test(t)?'t-prob':/solution|demo|result|after|proof|benefit/i.test(t)?'t-sol':'t-mid';
async function lineEdit(i,style){if(busy||!S.scenes[i])return;const st=LINE_STYLES.find(x=>x[0]===style);if(!st)return;busy=true;S.sugg={i,style};paint();const b=S.brief,t0=Date.now();
  const timer=setInterval(()=>status(`✨ Rewriting scene ${i+1} (${st[1].slice(2).trim()})… ${Math.round((Date.now()-t0)/1000)} s`),1000),ctl=new AbortController(),limit=setTimeout(()=>ctl.abort(),120000);
  try{const res=await fetch('/api/edit-script',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({mode:'line',index:i,request:st[2],product:b.product,benefits:b.benefits,tone:b.tone,title:S.title,
        scenes:S.scenes.map(x=>({sectionType:x.type,durationSeconds:x.secs,visualDirection:x.shot,voiceoverLine:x.say,onScreenText:x.text}))})});
    const data=(res.headers.get('content-type')||'').includes('ndjson')&&res.body?await readStream(res,()=>{}):await res.json().catch(()=>null);
    if(!data){status('The connection dropped before the AI finished. Please try again.');S.sugg=null;return}
    if(!data.ok){status(data.error||'Couldn’t rewrite that line. Please try again.');S.sugg=null;return}
    S.sugg={i,style,options:data.options};status(`✨ 3 options for scene ${i+1}. Tap one to use it.`)}
  catch(e){S.sugg=null;status(e?.name==='AbortError'?'The AI took too long. Please try again.':'Network error. Check your connection and try again.')}
  finally{clearInterval(timer);clearTimeout(limit);busy=false;paint()}}
const ASKS=['Make the hook punchier','Make it shorter','More casual and fun','Stronger call to action','Add a little humor','More about the benefits'];
async function editScript(mode,request){if(busy||!S.scenes.length)return;if(mode==='edit'&&!request){status('Type what you’d like to change first.');return}
  busy=true;paint();const b=S.brief,t0=Date.now();let chars=0;const tick=()=>status(mode==='hooks'?`Writing new hooks… ${Math.round((Date.now()-t0)/1000)} s`:chars?`Changing your script… ${Math.min(95,Math.round(chars/(400+S.scenes.length*260)*100))}%`:`Thinking… ${Math.round((Date.now()-t0)/1000)} s`);
  const timer=setInterval(tick,1000),ctl=new AbortController(),limit=setTimeout(()=>ctl.abort(),150000);tick();
  try{const res=await fetch('/api/edit-script',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({mode,request,product:b.product,benefits:b.benefits,tone:b.tone,title:S.title,
        hooks:S.hookOptions.slice(1),scenes:S.scenes.map(x=>({sectionType:x.type,durationSeconds:x.secs,visualDirection:x.shot,voiceoverLine:x.say,onScreenText:x.text}))})});
    const data=(res.headers.get('content-type')||'').includes('ndjson')&&res.body?await readStream(res,ch=>{chars=ch;tick()}):await res.json().catch(()=>null);
    if(!data){status('The connection dropped before the AI finished. Please try again.');return}
    if(!data.ok){status(data.error||'Couldn’t change the script. Please try again.');return}
    const sc=data.script;S.prev={scenes:S.scenes.map(x=>({...x})),hookOptions:S.hookOptions.slice(),hook:S.hook,title:S.title};
    if(mode==='hooks'){S.hookOptions=[S.scenes[0]?.say||'',...sc.hookVariations].filter(Boolean);S.hook=0;status('🎣 3 fresh hooks. Tap one to use it.')}
    else{const old=S.scenes;S.scenes=sc.scenes.map((x,i)=>{const n=scene(x),o=old[i];if(o&&o.type===n.type){n.anim=o.anim;n.sfx=o.sfx;n.look=o.look}return n});
      if(sc.title)S.title=sc.title;S.hookOptions=[S.scenes[0]?.say||'',...(sc.hookVariations||[])].filter(Boolean);S.hook=0;pickParts(false);S.ask='';
      for(const k of [...files.keys()])if(k>=S.scenes.length)files.delete(k);status('✨ '+(data.summary||'Done.')+' Tap ↩ Undo last change if you liked it better before.')}}
  catch(e){status(e?.name==='AbortError'?'The AI took too long. Please try again.':'Network error. Check your connection and try again.')}
  finally{clearInterval(timer);clearTimeout(limit);busy=false;save();paint()}}
function useOwn(){const lines=S.ownLines.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,20);if(!lines.length){status('Type at least one line.');return}
  const n=lines.length;S.scenes=lines.map((l,i)=>({type:i===0?'Hook':i===n-1&&n>1?'CTA':i===1&&n>=4?'Problem':'Demo/Solution',
    secs:Math.max(2,Math.round(l.split(/\s+/).length/2.5)),say:l,text:l.split(/\s+/).slice(0,7).join(' '),shot:'',anim:'',sfx:''}));
  S.title='';S.hookOptions=[];pickParts(true);save();paint();status('Got it. Edit any line, remove scenes with ✕ or add more, then tap Next.')}

// ---------- footage ----------
function addTo(i,list){const vids=[...(list||[])].filter(f=>/^video\//.test(f.type)||/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name));if(!vids.length)return;
  if(i<0){let k=0;for(const f of vids){let t=S.scenes.findIndex((s,j)=>!(files.get(j)||[]).length);if(t<0)t=k++%S.scenes.length;files.set(t,[...(files.get(t)||[]),f])}}
  else files.set(i,[...(files.get(i)||[]),...vids]);
  paint();status(`${vids.length} clip${vids.length>1?'s':''} added.`)}
fileIn.onchange=()=>{addTo(fileTarget,fileIn.files);fileIn.value=''};

// ---------- voice ----------
const FX_NAMES={none:'',podcast:'🎙️ Podcast',crisp:'✨ Crisp & clear',warm:'☕ Warm',radio:'📻 Radio host',phone:'☎️ Phone call',megaphone:'📢 Megaphone',room:'🏠 Room',reverb:'🌌 Reverb',hall:'⛪ Concert hall',echo:'🔁 Echo',stadium:'🏟️ Stadium',robot:'🤖 Robot',underwater:'🌊 Underwater',whisper:'🌙 ASMR'};
const fxLabel=f=>[f.noise!=='off'?`Background noise removed (${f.noise})`:'',FX_NAMES[f.fx]||''].filter(Boolean).join(' · ');
// Voice studio (video-voicefx.js): always edits the untouched take, so trying again never stacks effects.
async function editVoice(){if(!take||!window.veVoiceStudio)return;const r=await veVoiceStudio(take.original||take.file,take.fx);if(!r||!take)return;
  if(!take.original)take.original=take.file;take.file=r.plain?take.original:r.file;take.fx=r.plain?null:r.settings;
  URL.revokeObjectURL(take.url);take.url=URL.createObjectURL(take.file);paint();status(r.plain?'Back to your original recording.':'🎚️ Voice updated. Tap ▶ to hear it.')}
function record(){if(!window.veVoiceover){status('The voiceover recorder isn\'t available here.');return}
  veVoiceover({scenes:S.scenes.map(s=>({sectionType:s.type,durationSeconds:s.secs,voiceoverLine:s.say,onScreenText:''}))},
    {onLength:(i,v)=>{if(S.scenes[i]){S.scenes[i].secs=v;save()}},onTake:t=>{if(take?.url)URL.revokeObjectURL(take.url);take={...t,url:URL.createObjectURL(t.file)};paint();status('Voiceover saved for this video.')}})}

// ---------- music preview ----------
function stopMusic(){try{musicPlayer?.stop()}catch{}musicPlayer=null}
async function playMusic(){if(musicPlayer){stopMusic();return}const k=musicKey();const item=k&&window.AUDIO_LIBRARY?.find(x=>x.id===k);
  if(!item){status(k?'Can\'t preview this one.':'No music picked.');return}status('Playing a preview… tap ▶ again to stop.');try{musicPlayer=await item.play(10)}catch{status('Couldn\'t play the preview.')}}
function musicKey(){if(S.music!=='auto')return S.music;const st=STORIES.find(s=>s[0]===S.story);let k=st&&st[4]!=='auto'?st[4]:(S.voice==='none'?'hook':'story');
  return window.veMoods?.[k]?k:(window.veCreatorMoods?Object.keys(veCreatorMoods)[0]:Object.keys(window.veMoods||{})[0])||''}

// How long to film a scene: as long as its line takes to say (about 2.5 words a second) or the planned length,
// whichever is longer, plus 2 s to trim from. Talking to camera: the line's own length plus a breath.
const nWords=t=>String(t||'').split(/\s+/).filter(Boolean).length;
// How long each filmed clip is. Browser recordings often don't state their length until the video is
// sought to the end, so a hidden <video> is asked once per file; the shot list repaints when it knows.
const DUR=new WeakMap();
function clipDur(f){if(DUR.has(f))return DUR.get(f);DUR.set(f,null);
  const v=document.createElement('video'),url=URL.createObjectURL(f);let done=false;
  const end=d=>{if(done)return;done=true;URL.revokeObjectURL(url);v.removeAttribute('src');DUR.set(f,d>0&&isFinite(d)?d:0);if(STEPS[S.step][0]==='footage'&&dlg.open){const b=body.scrollTop;paint();body.scrollTop=b}};
  v.preload='metadata';v.muted=true;
  v.onloadedmetadata=()=>{if(isFinite(v.duration)&&v.duration>0)end(v.duration);else{v.ontimeupdate=()=>{if(isFinite(v.duration)){v.ontimeupdate=null;end(v.duration)}};try{v.currentTime=1e9}catch{end(0)}}};
  v.onerror=()=>end(0);setTimeout(()=>end(0),8000);v.src=url;return null}
const fmtS=x=>x>=60?Math.floor(x/60)+':'+String(Math.round(x%60)).padStart(2,'0'):(Math.round(x*10)/10)+' s';
function filmed(fl,goal){if(!fl.length)return '';const ds=fl.map(clipDur),known=ds.every(d=>d!==null),tot=ds.reduce((a,d)=>a+(d||0),0),ok=known&&tot>=goal,pct=Math.min(100,goal?tot/goal*100:100);
  return `<div class="ag-meter${ok?' ok':''}"><div class="ag-mtop"><b>🎞️ Filmed: ${known?fmtS(tot):'…'}</b><span>${fl.length} clip${fl.length===1?'':'s'} · ${known?(ok?'✓ enough for this scene':'about '+fmtS(Math.max(.1,goal-tot))+' more to go'):'checking…'}</span></div><div class="ag-bar"><i style="width:${pct}%"></i></div></div>`}
function filmSecs(s){const say=nWords(s.say)/2.5;return S.voice==='talking'?Math.max(2,Math.ceil(say+1)):Math.ceil(Math.max(s.secs||0,say,2)+2)}
// Footage helpers: the Media Vault (inside TapShopUGC only), and the in-page camera with the scene's line on screen:
// talking to camera shows what to say on the front camera; b-roll shows what to film on the back camera.
const hasVault=()=>typeof VaultPicker!=='undefined'&&VaultPicker.inTapShop;
const touch=()=>matchMedia('(pointer:coarse)').matches;
function camPrompt(i){const s=S.scenes[i]||{},talk=S.voice==='talking';
  return {facing:talk?'user':'environment',prompt:{label:(talk?'🗣️ Say':'🎥 Film')+` · scene ${i+1} of ${S.scenes.length}`,line:talk?(s.say||s.text||''):(s.shot||'Anything that shows: '+(s.text||s.say||'')),say:talk?'':(s.say||''),secs:filmSecs(s)}}}
function pickVault(i){VaultPicker.open({title:`Clip for scene ${i+1}`,kinds:['video'],onPick:async it=>{try{toast('Loading '+it.name+'…');addTo(i,[await VaultPicker.file(it)])}catch(e){toast(e.message)}if(!dlg.open)dlg.showModal()}})}
// Moving one clip to another scene with the menu next to it.
body.addEventListener('toggle',e=>{const f=e.target.dataset?.fold;if(f)UI[f]=e.target.open},true);
body.addEventListener('change',e=>{const m=e.target.closest?.('.ag-move');if(!m)return;const i=+m.dataset.i,j=+m.dataset.j,to=+m.value,l=(files.get(i)||[]).slice(),[f]=l.splice(j,1);
  if(!f||to===i)return;files.set(i,l);files.set(to,[...(files.get(to)||[]),f]);paint();status(`Moved to scene ${to+1}.`)});
// Phase 3: sort every added clip into the scene it fits best. The clip reader (CLIP, in video-broll.js's worker)
// scores three frames of each clip against every scene's shot description; when the creator talks in their clips,
// Whisper also listens to the first seconds and words shared with a scene's line add to its score. Then every
// scene gets its best clip first (best pairs first), and the rest go to their best scene, keeping their order.
const nrm=w=>String(w).toLowerCase().replace(/[^a-z0-9]/g,'');
async function clipLen(f){const v=document.createElement('video');v.preload='metadata';v.muted=true;const u=URL.createObjectURL(f);v.src=u;
  try{await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j;setTimeout(r,6000)});let d=v.duration;if(!Number.isFinite(d)){v.currentTime=1e9;await new Promise(r=>{v.ontimeupdate=r;setTimeout(r,3000)});d=v.duration}return {url:u,secs:Number.isFinite(d)&&d>0?d:3}}catch{return {url:u,secs:3}}}
async function clipSound(f){try{let b=await new OfflineAudioContext(1,1,16000).decodeAudioData(await f.arrayBuffer());const n=Math.min(b.length,Math.ceil(b.duration*16000)),oc=new OfflineAudioContext(1,Math.min(n,28*16000)||1,16000),s=oc.createBufferSource();s.buffer=b;s.connect(oc.destination);s.start();b=await oc.startRendering();return b.getChannelData(0).slice()}catch{return null}}
async function sortClips(){if(busy||!window.veClipReader)return;const R=veClipReader,all=[];for(const [i,l] of files)for(const f of l)all.push({f,from:i,order:all.length});if(all.length<2)return;
  busy=true;paint();const say=m=>status(m),dl=m=>say(`Downloading the clip reader (one time only)… ${Math.round(m.loaded/1e6)} of ${Math.round(m.total/1e6)} MB`),talk=S.voice==='talking';
  const labels=S.scenes.map(s=>String(s.shot||s.text||s.say||s.type).slice(0,120)),lines=S.scenes.map(s=>new Set(String(s.say||'').split(/\s+/).map(nrm).filter(w=>w.length>3)));
  try{for(let k=0;k<all.length;k++){const c=all[k];say(`✨ Watching clip ${k+1} of ${all.length}…`);const {url,secs}=await clipLen(c.f);
      try{const res=await R.see(await R.frames(url,secs),labels,dl);c.score=labels.map(l=>res.reduce((n,r)=>n+(r.find(x=>x.label===l)?.score||0),0)/res.length)}finally{URL.revokeObjectURL(url)}
      if(talk){say(`✨ Listening to clip ${k+1} of ${all.length}…`);const a=await clipSound(c.f);if(a&&a.length>8000){const r=await R.hear(a,dl),heard=new Set(String(r.text||'').split(/\s+/).map(nrm).filter(w=>w.length>3));
          lines.forEach((L,j)=>{let n=0;for(const w of heard)if(L.has(w))n++;c.score[j]+=L.size?1.5*n/L.size:0})}}}
    // Best pairs first, so every scene gets a clip while there are enough; then the rest to their best scene.
    const out=S.scenes.map(()=>[]),left=new Set(all),pairs=[];for(const c of all)c.score.forEach((v,j)=>pairs.push([v,c,j]));pairs.sort((a,b)=>b[0]-a[0]);
    for(const [,c,j] of pairs){if(!left.has(c)||out[j].length)continue;out[j].push(c);left.delete(c)}
    for(const c of left){const j=c.score.indexOf(Math.max(...c.score));out[j].push(c)}
    files.clear();out.forEach((l,j)=>{if(l.length)files.set(j,l.sort((a,b)=>a.order-b.order).map(c=>c.f))});
    const moved=all.filter(c=>out.findIndex(l=>l.includes(c))!==c.from).length;busy=false;paint();
    status(`✨ Sorted ${all.length} clips into ${out.filter(l=>l.length).length} scenes${moved?` (${moved} moved)`:''}. Check them, and move any with the menu next to it.`)}
  catch(e){console.warn(e);busy=false;paint();status('The clip reader couldn’t run here ('+(e.message||e)+'). Your clips stay where they are.')}}
// ---------- building ----------
const textSize=(s,W,H)=>{let f=.055,px=f*H,w=s.length*.6*px;if(w>W*.84)f=W*.84/(s.length*.6)/H;return Math.max(24,f*H*1280/W)};
// Each scene's start in the voiceover, from the words heard (w.s in seconds): the script's words are matched to the
// heard ones in order (longest common run), a scene starts at its first matched word, less the words before it that
// weren't caught. Scenes with no match sit between their neighbours by word count. Null when too little matched.
const norm=w=>String(w).toLowerCase().replace(/[^a-z0-9]/g,'');
function alignMarks(scenes,words,dur){const sw=[];scenes.forEach((s,k)=>String(s.say||'').split(/\s+/).map(norm).filter(Boolean).forEach((w,p)=>sw.push([w,k,p])));
  const hw=words.map(w=>norm(w.w)),n=hw.length,m=sw.length;if(!n||!m)return null;
  const L=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=hw[i]&&hw[i]===sw[j][0]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  if(L[0][0]<Math.max(2,m*.3))return null;
  const at=scenes.map(()=>null);let i=0,j=0;
  while(i<n&&j<m){if(hw[i]&&hw[i]===sw[j][0]){const [,k,p]=sw[j];if(at[k]==null)at[k]=Math.max(0,words[i].s-p*.32);i++;j++}else if(L[i+1][j]>=L[i][j+1])i++;else j++}
  const cnt=scenes.map(s=>String(s.say||'').split(/\s+/).filter(Boolean).length||1);at[0]=0;
  for(let k=1;k<at.length;k++)if(at[k]!=null)at[k]=Math.max(0,at[k]-.15);
  for(let k=1;k<at.length;k++){if(at[k]!=null)continue;let a=k-1,b=k;while(b<at.length&&at[b]==null)b++;
    const tb=b<at.length?at[b]:dur,wa=cnt.slice(a,b).reduce((x,y)=>x+y,0);let w=0;for(let q=a;q<k;q++)w+=cnt[q];at[k]=at[a]+(tb-at[a])*w/wa}
  for(let k=1;k<at.length;k++)at[k]=Math.min(Math.max(at[k],at[k-1]+.4),dur-.3);return at}
async function build(){if(busy||(typeof exporting!=='undefined'&&exporting))return;busy=true;paint();const say=m=>status(m);
  try{if(clips.length||graphicTracks.length||extraTracks.length){say('Saving your current video to Recent videos…');if(window.veNewProject)await veNewProject();else{clips=[];graphicTracks=[];extraTracks=[]}}
    const st=byId('veStart');if(st)st.hidden=true;
    const asp=PLATFORMS.find(p=>p[0]===S.brief.platform)?.[2]||'9:16';const sel=byId('aspect');if(sel){sel.value=asp;setAspect()}const W=canvas.width,H=canvas.height;
    // Load every clip first (talking clips set their scene's length).
    const A=new Map();if(S.footage!=='none'){let n=0,all=[...files.values()].flat().length;
      for(const [i,list] of files){if(i>=S.scenes.length)continue;const got=[];for(const f of list){say(`Loading clip ${++n} of ${all}…`);try{got.push(await loadAsset(f))}catch(e){toast(e.message)}}A.set(i,got)}}
    // When each scene starts and how long it lasts: the voiceover's real timing, the clips' own length when talking, else the plan.
    const talk=S.voice==='talking',voice=S.voice==='record'&&take;
    // Listen to the voiceover once: its words line each scene up with when it was really said (the prompter's
    // timer only says when the line was highlighted), and they become the captions later.
    let vw=null,marks=voice?take.marks:null;if(voice&&window.veClipWords){const a={id:uid(),name:'Voiceover',file:take.file,duration:take.dur};assets.push(a);
      try{vw=await veClipWords({assetId:a.id,in:0,out:take.dur},m=>say(m))}catch(e){console.warn('Listening skipped:',e)}finally{assets=assets.filter(x=>x!==a)}
      const al=vw&&alignMarks(S.scenes,vw,take.dur);if(al)marks=al}
    const spans=[];let cur=0;
    S.scenes.forEach((s,i)=>{let start,len;
      if(voice&&marks[i]!=null){start=marks[i];const nx=marks.slice(i+1).find(x=>x!=null);len=(nx??take.dur)-start}
      else if(talk&&(A.get(i)||[]).length){start=cur;len=A.get(i).reduce((n,a)=>n+a.duration,0)}
      else{start=voice?Math.max(cur,take.dur):cur;len=Math.max(1.5,s.secs)}
      start=Math.round(start*100)/100;len=Math.max(.5,Math.round(len*100)/100);spans.push([start,len]);cur=Math.max(cur,start+len)});
    // Clips: each scene's clips share its time, trimmed from the start or gently slowed if a bit short.
    let mv=0;S.scenes.forEach((s,i)=>{const list=A.get(i)||[];if(!list.length)return;const [start,len]=spans[i],piece=len/list.length;
      list.forEach((a,j)=>{const cl=makeClip(a),at=start+j*piece;cl.fit=asp==='16:9'?'contain':'cover';
        if(talk){cl.in=0;cl.out=a.duration}
        else{if(a.duration>=piece){const lead=a.duration>piece+.4?Math.min(.2,a.duration-piece):0;cl.in=lead;cl.out=lead+piece}
          else{cl.in=0;cl.out=a.duration;if(a.duration>=piece*.5)cl.speed=Math.max(.5,a.duration/piece)}
          cl.motion=mv++%2?'slowOut':'slowIn';cl.volume=voice?0:.5}
        cl.offset=talk?Math.round((start+list.slice(0,j).reduce((n,x)=>n+x.duration,0))*100)/100:Math.round(at*100)/100;clips.push(cl)})});
    // The voiceover: the voice everything else ducks under.
    if(voice){say('Adding your voiceover…');addTrack('audio');const t=extraTracks.at(-1);Object.assign(t,{name:'🎙️ Voiceover',duck:false,fadeIn:0,fadeOut:0,voiceover:true,offset:0});targetTrack=t.id;
      const beat=window.veAutoBeat;window.veAutoBeat=null;try{await loadTrackMedia(take.file)}finally{window.veAutoBeat=beat}t.offset=0}
    // Words on screen, animated, with their sound effect.
    say('Adding your graphics…');const brand=S.brand&&hasBrand(),fonts=brand&&typeof veBrandFonts==='function'?veBrandFonts():null,cols=brand&&typeof veBrandColors==='function'?veBrandColors():[];
    const placed=[],looks=chooseLooks();S.scenes.forEach((s,i)=>{const text=s.text.trim();if(!text)return;const [start,len]=spans[i],l=LOOK[s.type]||LOOK['Demo/Solution'],lk=TLOOKS[looks[i]][1];
      const base={name:s.type+': '+text.slice(0,18),x:50,y:l[2],animation:s.anim||l[0],offset:start,length:Math.max(.8,len)};
      if(lk.s){createGraphicTrack('shape');const g=graphicTracks.at(-1);
        Object.assign(g,base,{...lk.s,text:'',innerBold:true,innerFont:fonts?.heading||BOLD,points:null,outline:false,background:false,textEffect:'shadow'},
          brand&&cols.length?{color:cols[1]||cols[0],innerColor:cols[1]?cols[0]:'#ffffff'}:{});shapeFit(g,text,W,H);placed.push([g,s.sfx]);return}
      createGraphicTrack('text');const g=graphicTracks.at(-1);
      Object.assign(g,base,{text,size:textSize(text,W,H),bold:true,background:false,textEffect:'plain'},lk.t,
        brand&&cols.length?{color:cols[0],...(lk.t.boxColor?{boxColor:cols[1]||lk.t.boxColor}:{})}:{},fonts?{font:fonts.heading}:{});placed.push([g,s.sfx])});
    if(window.TapSFX)for(const [g,k] of placed)if(k)try{await TapSFX.add(k,{at:g.offset,forId:g.id,noSnap:1,quiet:1})}catch{}
    // Music for the whole video, dipping under the voice.
    const mk=musicKey(),len=total();if(mk&&window.veMakeBeat&&len>0){say('Making your music…');try{const file=await veMakeBeat(len,mk,{bare:1});addTrack('audio');const t=extraTracks.at(-1);
      t.name='🎵 '+(veMoods[mk]?.name||'Music');Object.assign(t,window.veMusicTrackMeta?veMusicTrackMeta(mk):{});targetTrack=t.id;await loadTrackMedia(file);t.volume=voice||talk?.6:.8}catch(e){console.warn('Music skipped:',e)}}
    byId('projectName').value='🪄 '+S.brief.product.slice(0,60);selected=-1;render();renderTracks();renderGraphicTracks();await seekTimeline(0);
    // Captions last, from the voiceover or the clips' own sound.
    let capNote='';if(S.voice!=='none'&&S.captions&&(voice||clips.length)){try{let s={};try{s=JSON.parse(localStorage.getItem('tapshop-captions')||'{}')}catch{}localStorage.setItem('tapshop-captions',JSON.stringify({...s,style:S.capStyle}))}catch{}
      try{if(voice&&window.veClipWords){const words=vw||[];
          capNote=words.length&&vePlaceCaptions(words.map(w=>({w:w.w,s:Math.round(w.s*100)/100,e:Math.round(w.e*100)/100})))?'':' We didn\'t hear any words for captions.'}
        else if(window.veAutoCaptions){say('Listening for captions…');capNote=await veAutoCaptions(say)?'':' We didn\'t hear any words for captions.'}}
      catch(e){console.warn('Captions skipped:',e);capNote=' Captions didn\'t work here; try ✨ Captions in the toolbar.'}
      renderGraphicTracks();draw()}
    S.built=true;save();status('Done!'+capNote);toast('🪄 Your video is ready! Press ▶ to watch it.'+capNote)}
  catch(e){console.error(e);status('Couldn\'t build the video: '+(e.message||e))}
  finally{busy=false;paint()}}

// ---------- events ----------
const secsOf=v=>Math.min(60,Math.max(1,Math.round((+v||1)*2)/2));
const totalLen=()=>{const t=S.scenes.reduce((a,s)=>a+(+s.secs||0),0);return `Total: <b>${t}s</b>${S.brief?.length?` (you picked ${S.brief.length}s)`:''}`};
function setK(k,v,i){if(k==='secs'){if(v===''||!(+v>0))return;v=secsOf(v);const t=document.getElementById('agTotal');if(i!=null&&S.scenes[i])S.scenes[i].secs=v;if(t)t.innerHTML=totalLen();save();return}if(k.startsWith('brief.'))S.brief[k.slice(6)]=v;else if(i!=null&&S.scenes[i])S.scenes[i][k]=v;else S[k]=v;
  if(k==='captions')paint();if(k==='music')stopMusic();save()}
const onField=e=>{const el=e.target;if(!el.dataset?.k)return;setK(el.dataset.k,el.type==='checkbox'?el.checked:el.value,el.dataset.i!=null?+el.dataset.i:null)};
body.addEventListener('input',onField);body.addEventListener('change',onField);
body.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||busy&&b.dataset.act!=='musicPlay')return;const v=b.dataset.v,i=+b.dataset.i;
  switch(b.dataset.act){
    case 'platform':S.brief.platform=v;break;case 'length':S.brief.length=+v;break;case 'story':S.story=v;break;case 'group':S.group=v;break;
    case 'mode':S.scriptMode=v;if(v==='none')S.voice='none';else if(S.voice==='none')S.voice='record';break;
    case 'write':writeScript();return;
    case 'voiceFx':editVoice();return;
    case 'secs':if(S.scenes[i])S.scenes[i].secs=secsOf((+S.scenes[i].secs||0)+(+v));break;
    case 'newHooks':editScript('hooks');return;
    case 'lineAI':lineEdit(i,v);return;
    case 'closeLine':S.sugg=null;break;
    case 'useLine':{const o=S.sugg?.options?.[+v],sc=S.scenes[i];if(o&&sc){S.lineUndo={i,say:sc.say,text:sc.text};sc.say=o.say;if(o.text)sc.text=o.text;if(i===0)S.hookOptions[0]=o.say;S.sugg=null;status(`Scene ${i+1} updated. ↩ puts your old line back.`)}}break;
    case 'undoLine':{const u=S.lineUndo,sc=S.scenes[i];if(u&&sc&&u.i===i){sc.say=u.say;sc.text=u.text;S.lineUndo=null;status('Old line back.')}}break;
    case 'ask':editScript('edit',v);return;
    case 'askGo':editScript('edit',(S.ask||'').trim());return;
    case 'undoAsk':if(S.prev){Object.assign(S,S.prev);S.prev=null;status('Back to how it was.')}break;case 'own':useOwn();return;
    case 'hook':S.hook=+v;if(S.scenes[0])S.scenes[0].say=S.hookOptions[+v]||S.scenes[0].say;break;
    case 'rmScene':S.scenes.splice(i,1);{const m=new Map();for(const [k,l] of files)if(k!==i)m.set(k>i?k-1:k,l);files.clear();for(const [k,l] of m)files.set(k,l)}break;
    case 'addScene':S.scenes.push({type:'Demo/Solution',secs:3,say:'',text:'',shot:'',anim:'',sfx:''});pickParts(false);break;
    case 'footage':S.footage=v;break;
    case 'sortClips':sortClips();return;
    case 'addAll':fileTarget=-1;fileIn.click();return;case 'add':fileTarget=i;fileIn.click();return;
    case 'vault':pickVault(i);return;
    // Reshoot one clip: the same camera with the scene's line on screen; the new take replaces this clip in place.
    case 'retake':{const j=+b.dataset.j;VideoCamera.open(list=>{const v=[...(list||[])].find(f=>/^video\//.test(f.type)||/\.(mp4|mov|webm|m4v)$/i.test(f.name));const l=(files.get(i)||[]).slice();
        if(!v||j>=l.length)return;l[j]=v;files.set(i,l);paint();status(`↺ New take is in scene ${i+1}.`)},toast,{only:'video',inApp:touch(),...camPrompt(i)});return}
    case 'filmLine':if(window.VideoCamera){VideoCamera.open(list=>addTo(i,list),toast,{only:'video',inApp:true,...camPrompt(i)});return}
    // falls through: no in-page camera here
    case 'film':if(window.VideoCamera&&!touch()){VideoCamera.open(list=>addTo(i,list),toast,{only:'video',...camPrompt(i)});return}toast(`🎬 Film about ${filmSecs(S.scenes[i]||{})} seconds for this scene.`);if(window.VideoCamera)VideoCamera.open(list=>addTo(i,list),toast,{only:'video'});else{fileTarget=i;fileIn.click()}return;
    case 'rmFile':{const l=(files.get(i)||[]).slice();l.splice(+b.dataset.j,1);files.set(i,l)}break;
    case 'voice':S.voice=v;break;case 'record':record();return;
    case 'pick':pickParts(true);S.music='auto';status('Picked for you. Change anything you like.');break;
    case 'sfxPlay':{const k=S.scenes[i]?.sfx;if(k&&window.TapSFX)TapSFX.play(k)}return;
    case 'musicPlay':playMusic();return;
    case 'watch':dlg.close();seekTimeline(0).then(()=>{try{if(!playing)togglePlay()}catch{}});return;
    case 'edit':dlg.close();return;
    case 'restart':S=fresh();files.clear();take=null;status('');break}
  save();paint()});
byId('agSteps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&!b.disabled)go(+b.dataset.step)});
nextBtn.onclick=()=>{if(S.step!==STEPS.length-1)return go(S.step+1);
  // A draft reopened after a reload has its words but not its clips or voice take, which live in memory only.
  if(!S.scenes.length){S.step=2;paint();return status('Your script is missing. Write or paste it first.')}
  if(S.voice==='record'&&!take){S.step=STEPS.findIndex(x=>x[0]==='voice');paint();return status('Tap 🎙️ Open the teleprompter to record your voiceover, or pick another option.')}
  build()};
backBtn.onclick=()=>go(S.step-1);
dlg.querySelector('.ag-x').onclick=()=>dlg.close();
dlg.addEventListener('close',()=>{stopMusic();save()});

window.veBuildMyVideo=function(){if(typeof exporting!=='undefined'&&exporting)return;
  if(S.built){S=fresh();files.clear();take=null}
  const st=byId('veStart');if(st&&!st.hidden){st.hidden=true;try{render();draw()}catch{}}
  status(S.step||S.brief.product?'Picked up where you left off.':'');paint();if(!dlg.open)dlg.showModal()};

// ---------- ways in ----------
{const bar=document.querySelector('.timebar');if(bar){const b=document.createElement('button');b.type='button';b.id='agButton';b.textContent='🪄 Build My Video';b.title='Build My Video With AI: a guided path from your product to a finished video';b.onclick=()=>window.veBuildMyVideo();
  const t=bar.querySelector('b');t?t.after(b):bar.prepend(b)}}
// A card at the top of the start screen's quick makers (video-broll.js builds that box).
function startCard(){const box=byId('vsQuick');if(!box||byId('vsAgent'))return;const b=document.createElement('button');b.type='button';b.id='vsAgent';b.className='vs-reviews';
  b.innerHTML='<b>🪄 Build My Video With AI</b><span>Your footage, your voice. AI helps put it together: a script for your product, guided filming, a voiceover with a teleprompter, animated words and sounds for each part, music and captions. Everything stays editable.</span><span class="ag-star">⭐ Must try: <em>no script or clips needed</em>. Follow your 🎬 shot list and film each scene with your script on screen.</span>';
  if(!byId('agStarCss')){const st=document.createElement('style');st.id='agStarCss';st.textContent='#vsAgent .ag-star{display:block;margin-top:8px;padding:7px 10px;border-radius:10px;background:#ec489933;font-size:13px;font-weight:600}#vsAgent .ag-star em{display:inline;font-style:normal;font-weight:800;color:#ff3ea5}';document.head.appendChild(st)}
  b.onclick=()=>window.veBuildMyVideo();const h=box.querySelector('.vs-qh');h?h.after(b):box.prepend(b)}
new MutationObserver(startCard).observe(document.body,{childList:true,subtree:true});startCard();
// video.html#agent (the Studio home's Build My Video banner) opens the maker straight away.
if(/(^|[#&])agent\b/.test(location.hash)){window.history.replaceState(null,'',location.pathname+location.search);setTimeout(()=>window.veBuildMyVideo?.(),0)}
// Dashboard → editor: tapshop:open-agent (the dashboard's "🪄 Build My Video With AI" button).
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin)return;const m=e.data;if(m&&m.version===1&&m.type==='tapshop:open-agent')window.veBuildMyVideo()});
})();
