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
const STEPS=[['about','About'],['story','Story'],['script','Script'],['footage','Footage'],['voice','Voice'],['parts','Graphics'],['build','Build']];
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
const LOOK={Hook:['pop','whoosh',30],Problem:['shake','buzz',22],Agitate:['wobble','scratch',22],'Demo/Solution':['slide','ding',22],'Social Proof':['bounce','sparkle',22],CTA:['elastic','click',72]};
const CAPS=[['pop','Word pop'],['karaoke','Karaoke'],['classic','Classic'],['boxed','Bold box'],['bounce','Bounce'],['reveal','Type on'],['neon','Neon'],['highlight','Highlight']];

const fresh=()=>({step:0,max:0,brief:{product:'',benefits:'',audience:'',platform:'tiktok',length:30,tone:'Casual & Authentic'},
  story:'AUTO',group:'',scriptMode:'ai',ownLines:'',title:'',hookOptions:[],hook:0,scenes:[],
  footage:'clips',voice:'record',captions:true,capStyle:'pop',brand:true,music:'auto',built:false});
let S=(()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');return d&&d.brief?{...fresh(),...d}:fresh()}catch{return fresh()}})();
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
.ag-body h3{margin:6px 0 4px;font-size:17px}.ag-help{margin:0 0 10px;font-size:13px;opacity:.75}
.ag-body label.ag-f{display:block;margin:10px 0;font-size:13px;font-weight:600}
.ag-body label.ag-f input,.ag-body label.ag-f textarea,.ag-body label.ag-f select{display:block;width:100%;margin-top:4px;font-weight:400}
.ag-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 10px}
.ag-card{text-align:left!important;padding:10px 12px!important;border-radius:12px!important;line-height:1.3}
.ag-card b{display:block;font-size:14px}.ag-card small{display:block;opacity:.7;font-size:12px;font-weight:400;margin-top:2px}
.ag-card.on{border-color:#ff3ea5!important;box-shadow:inset 0 0 0 1px #ff3ea5;background:#ff3ea51a!important}
.ag-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.ag-chips button{border-radius:999px!important;padding:5px 12px!important;font-size:13px}
.ag-chips button.on{background:#ff3ea5!important;color:#fff!important;border-color:#ff3ea5!important}
.ag-g{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:12px 0 0}
.ag-scene{border:1px solid #8885;border-radius:12px;padding:10px 12px;margin:8px 0}
.ag-scene.next{border-color:#ff3ea5;box-shadow:inset 0 0 0 1px #ff3ea5}
.ag-tag{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#ff3ea5}
.ag-tag button{font-size:12px;padding:2px 8px!important;text-transform:none;letter-spacing:0}
.ag-scene input,.ag-scene textarea,.ag-scene select{width:100%;margin-top:4px}
.ag-scene .ag-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:6px}.ag-scene .ag-row>label{flex:1 1 140px;font-size:12px}
.ag-shot{font-size:13px;opacity:.85;margin:4px 0}
.ag-files{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ag-file{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid #8886;border-radius:999px;padding:3px 4px 3px 10px;max-width:100%}
.ag-file span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}.ag-file button{width:24px;height:24px;padding:0!important;border-radius:50%!important;font-size:13px}
.ag-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
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
script(){const m=S.scriptMode;let h=`<h3>Your script</h3><p class="ag-help">What you'll say in each scene.</p>
  <div class="ag-cards">${card('mode','ai',m==='ai','✨ Write it for me','AI writes it from your product')}${card('mode','own',m==='own','I have my own','Paste your lines')}${card('mode','none',m==='none','No talking','Words on screen only')}</div>`;
  if(m==='own')h+=`<label class="ag-f">One line per scene. The first is your hook, the last your call to action.<textarea data-k="ownLines" rows="6" placeholder="Stop scrolling if your shakes are chalky.&#10;Mine always were…&#10;Then I found this bottle.&#10;Tap the orange cart.">${esc(S.ownLines)}</textarea></label><div class="ag-btns"><button type="button" class="primary" data-act="own">Use my lines</button></div>`;
  else h+=`<div class="ag-btns"><button type="button" class="primary" data-act="write" ${busy?'disabled':''}>${busy?'Writing…':S.scenes.length?'↻ Write a new one':'✨ Write my script'}</button></div>`;
  if(S.hookOptions.length>1)h+=`<div class="ag-g">Pick your hook</div><div class="ag-chips">${S.hookOptions.map((o,i)=>chip('hook',i,S.hook===i,`${i?String.fromCharCode(64+i):'Original'}: ${esc(o.slice(0,60))}${o.length>60?'…':''}`)).join('')}</div>`;
  if(S.scenes.length)h+=`<div class="ag-g">${esc(S.title||'Your scenes')}</div><p class="ag-help">✏️ Tap any line to change it · <b>✕ Remove</b> deletes a scene · <b>＋ Add a scene</b> at the bottom adds one.</p>`+S.scenes.map((s,i)=>`<div class="ag-scene"><div class="ag-tag"><span>${i+1} · ${esc(s.type)} · ${s.secs}s</span><button type="button" data-act="rmScene" data-i="${i}" aria-label="Remove scene ${i+1}">✕ Remove</button></div>
    ${m==='none'?'':`<label>What you say<textarea data-k="say" data-i="${i}" rows="2">${esc(s.say)}</textarea></label>`}
    <label>Words on screen<input data-k="text" data-i="${i}" maxlength="120" value="${esc(s.text)}"></label></div>`).join('')+`<div class="ag-btns"><button type="button" data-act="addScene">＋ Add a scene</button></div>`;
  return h},
footage(){const f=S.footage;let h=`<h3>Your footage</h3><p class="ag-help">Add clips you have, or film each shot now. You can mix both.</p>
  <div class="ag-cards">${card('footage','clips',f==='clips','🎥 Clips','Upload or film, scene by scene')}${card('footage','none',f==='none','🎨 No footage','Text and graphics only')}</div>`;
  if(f==='none')return h+`<p class="ag-help">Your video will be words, graphics, music and your voice on a plain background. You can add clips later in the editor.</p>`;
  const nextI=S.scenes.findIndex((s,i)=>!(files.get(i)||[]).length);
  h+=`<div class="ag-btns"><button type="button" data-act="addAll">📁 Add all my clips at once</button></div>`;
  h+=S.scenes.map((s,i)=>{const fl=files.get(i)||[];return `<div class="ag-scene${i===nextI?' next':''}"><div class="ag-tag"><span>${i+1} · ${esc(s.type)}${i===nextI?' · next to film':''}</span></div>
    <p class="ag-shot">🎬 <b>Film:</b> ${esc(s.shot||'Anything that shows: '+(s.text||s.say))}</p>
    ${fl.length?`<div class="ag-files">${fl.map((x,j)=>`<span class="ag-file"><span>${esc(x.name)}</span><button type="button" data-act="rmFile" data-i="${i}" data-j="${j}" aria-label="Remove">✕</button></span>`).join('')}</div>`:''}
    <div class="ag-btns"><button type="button" data-act="add" data-i="${i}">📁 Add clip</button><button type="button" data-act="film" data-i="${i}">📷 Film it</button></div></div>`}).join('');
  return h},
voice(){const v=S.voice,none=S.scriptMode==='none';let h=`<h3>Voice + captions</h3><p class="ag-help">${none?'You picked no talking, so music and words on screen carry the video.':'How will people hear your script?'}</p>
  <div class="ag-cards">${card('voice','record',v==='record','🎙️ Record a voiceover','With a teleprompter')}${card('voice','talking',v==='talking','🗣️ I\'m talking in my clips','Use the sound from my clips')}${card('voice','none',v==='none','🔇 No voice','Music and text only')}</div>`;
  if(v==='record')h+=take?`<p class="ag-help">✓ Voiceover ready (${take.dur.toFixed(1)} s). Scenes will line up with when you said them.</p><audio controls src="${esc(take.url)}" style="width:100%"></audio><div class="ag-btns"><button type="button" data-act="record">↺ Record again</button></div>`
    :`<div class="ag-btns"><button type="button" class="primary" data-act="record">🎙️ Open the teleprompter</button></div>`;
  if(v!=='none')h+=`<label class="ag-check"><input type="checkbox" data-k="captions" ${S.captions?'checked':''}> ✨ Auto captions</label>${S.captions?`<label class="ag-f">Caption style<select data-k="capStyle">${opts(CAPS,S.capStyle)}</select></label>`:''}`;
  return h},
parts(){const sx=[['','None'],...sfxList().map(([k,e,n])=>[k,e+' '+n])],an=anims(),groups=window.veMusicGroups?veMusicGroups():[];
  const music=[['auto','✨ Pick for me'],['','No music'],...groups.flatMap(([l,ks])=>ks.filter(k=>window.veMoods?.[k]).map(k=>[k,l.split(' ')[0]+' '+veMoods[k].name]))];
  return `<h3>Graphics + sounds</h3><p class="ag-help">For each part: the words, how they animate and the sound they make. Change anything later in the editor.</p>
  <div class="ag-btns"><button type="button" data-act="pick">✨ Pick for me</button></div>
  ${hasBrand()?`<label class="ag-check"><input type="checkbox" data-k="brand" ${S.brand?'checked':''}> ★ Use my brand kit (fonts and colours)</label>`:''}
  ${S.scenes.map((s,i)=>`<div class="ag-scene"><div class="ag-tag"><span>${i+1} · ${esc(s.type)}</span></div>
    <label>Words on screen<input data-k="text" data-i="${i}" maxlength="120" value="${esc(s.text)}" placeholder="Leave empty for no text"></label>
    <div class="ag-row"><label>Animation<select data-k="anim" data-i="${i}">${opts(an,s.anim||'fade')}</select></label>
    <label>Sound effect<select data-k="sfx" data-i="${i}">${opts(sx,s.sfx)}</select></label><button type="button" data-act="sfxPlay" data-i="${i}" aria-label="Play sound">▶</button></div></div>`).join('')}
  <div class="ag-g">Music</div><div class="ag-row" style="display:flex;gap:8px;align-items:center"><select data-k="music" style="flex:1">${opts(music,S.music)}</select><button type="button" data-act="musicPlay" aria-label="Listen">▶ Listen</button></div>`},
build(){if(S.built)return `<div class="ag-done"><b>🎉 Your video is ready!</b><p class="ag-help">It's in the editor now: every clip, word, sound and caption can still be changed.</p>
  <div class="ag-btns" style="justify-content:center"><button type="button" class="primary" data-act="watch">▶ Watch it</button><button type="button" data-act="edit">✏️ Edit it</button><button type="button" data-act="restart">🪄 Make another</button></div></div>`;
  const n=[...files.values()].reduce((a,l)=>a+l.length,0),st=STORIES.find(s=>s[0]===S.story);
  return `<h3>Ready to build</h3><p class="ag-help">Here's what goes into your video:</p><ul class="ag-sum">
  <li><b>${esc(S.brief.product)}</b> · ${esc(PLATFORMS.find(p=>p[0]===S.brief.platform)?.[1]||'')} · ${S.brief.length} s</li>
  <li>Story: ${esc(st?st[2]:S.story)} · ${S.scenes.length} scenes</li>
  <li>Footage: ${S.footage==='none'?'none, text and graphics only':n+' clip'+(n===1?'':'s')}</li>
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
  if(k==='voice'&&S.voice==='record'&&!take)return 'Record your voiceover first, or pick another option.';
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
function record(){if(!window.veVoiceover){status('The voiceover recorder isn\'t available here.');return}
  veVoiceover({scenes:S.scenes.map(s=>({sectionType:s.type,durationSeconds:s.secs,voiceoverLine:s.say,onScreenText:''}))},
    {onTake:t=>{if(take?.url)URL.revokeObjectURL(take.url);take={...t,url:URL.createObjectURL(t.file)};paint();status('Voiceover saved for this video.')}})}

// ---------- music preview ----------
function stopMusic(){try{musicPlayer?.stop()}catch{}musicPlayer=null}
async function playMusic(){if(musicPlayer){stopMusic();return}const k=musicKey();const item=k&&window.AUDIO_LIBRARY?.find(x=>x.id===k);
  if(!item){status(k?'Can\'t preview this one.':'No music picked.');return}status('Playing a preview… tap ▶ again to stop.');try{musicPlayer=await item.play(10)}catch{status('Couldn\'t play the preview.')}}
function musicKey(){if(S.music!=='auto')return S.music;const st=STORIES.find(s=>s[0]===S.story);let k=st&&st[4]!=='auto'?st[4]:(S.voice==='none'?'hook':'story');
  return window.veMoods?.[k]?k:(window.veCreatorMoods?Object.keys(veCreatorMoods)[0]:Object.keys(window.veMoods||{})[0])||''}

// ---------- building ----------
const textSize=(s,W,H)=>{let f=.055,px=f*H,w=s.length*.6*px;if(w>W*.84)f=W*.84/(s.length*.6)/H;return Math.max(24,f*H*1280/W)};
async function build(){if(busy||(typeof exporting!=='undefined'&&exporting))return;busy=true;paint();const say=m=>status(m);
  try{if(clips.length||graphicTracks.length||extraTracks.length){say('Saving your current video to Recent videos…');if(window.veNewProject)await veNewProject();else{clips=[];graphicTracks=[];extraTracks=[]}}
    const st=byId('veStart');if(st)st.hidden=true;
    const asp=PLATFORMS.find(p=>p[0]===S.brief.platform)?.[2]||'9:16';const sel=byId('aspect');if(sel){sel.value=asp;setAspect()}const W=canvas.width,H=canvas.height;
    // Load every clip first (talking clips set their scene's length).
    const A=new Map();if(S.footage!=='none'){let n=0,all=[...files.values()].flat().length;
      for(const [i,list] of files){if(i>=S.scenes.length)continue;const got=[];for(const f of list){say(`Loading clip ${++n} of ${all}…`);try{got.push(await loadAsset(f))}catch(e){toast(e.message)}}A.set(i,got)}}
    // When each scene starts and how long it lasts: the voiceover's real timing, the clips' own length when talking, else the plan.
    const spans=[];let cur=0;const talk=S.voice==='talking',voice=S.voice==='record'&&take;
    S.scenes.forEach((s,i)=>{let start,len;
      if(voice&&take.marks[i]!=null){start=take.marks[i];const nx=take.marks.slice(i+1).find(x=>x!=null);len=(nx??take.dur)-start}
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
    const placed=[];S.scenes.forEach((s,i)=>{const text=s.text.trim();if(!text)return;const [start,len]=spans[i],l=LOOK[s.type]||LOOK['Demo/Solution'];
      createGraphicTrack('text');const g=graphicTracks.at(-1);
      Object.assign(g,{name:s.type+': '+text.slice(0,18),text,color:cols[0]||'#ffffff',size:textSize(text,W,H),x:50,y:l[2],bold:true,background:false,animation:s.anim||l[0],
        offset:start,length:Math.max(.8,len),boxColor:cols[1]||'#000000',boxOpacity:cols[1]?1:.55,boxPad:24,boxRadius:16},fonts?{font:fonts.heading}:{});placed.push([g,s.sfx])});
    if(window.TapSFX)for(const [g,k] of placed)if(k)try{await TapSFX.add(k,{at:g.offset,forId:g.id,noSnap:1,quiet:1})}catch{}
    // Music for the whole video, dipping under the voice.
    const mk=musicKey(),len=total();if(mk&&window.veMakeBeat&&len>0){say('Making your music…');try{const file=await veMakeBeat(len,mk,{bare:1});addTrack('audio');const t=extraTracks.at(-1);
      t.name='🎵 '+(veMoods[mk]?.name||'Music');Object.assign(t,window.veMusicTrackMeta?veMusicTrackMeta(mk):{});targetTrack=t.id;await loadTrackMedia(file);t.volume=voice||talk?.6:.8}catch(e){console.warn('Music skipped:',e)}}
    byId('projectName').value='🪄 '+S.brief.product.slice(0,60);selected=-1;render();renderTracks();renderGraphicTracks();await seekTimeline(0);
    // Captions last, from the voiceover or the clips' own sound.
    let capNote='';if(S.voice!=='none'&&S.captions&&(voice||clips.length)){try{let s={};try{s=JSON.parse(localStorage.getItem('tapshop-captions')||'{}')}catch{}localStorage.setItem('tapshop-captions',JSON.stringify({...s,style:S.capStyle}))}catch{}
      try{if(voice&&window.veClipWords){const a={id:uid(),name:'Voiceover',file:take.file,duration:take.dur};assets.push(a);let words;
          try{words=await veClipWords({assetId:a.id,in:0,out:take.dur},m=>say(m))}finally{assets=assets.filter(x=>x!==a)}
          capNote=words.length&&vePlaceCaptions(words.map(w=>({w:w.w,s:Math.round(w.s*100)/100,e:Math.round(w.e*100)/100})))?'':' We didn\'t hear any words for captions.'}
        else if(window.veAutoCaptions){say('Listening for captions…');capNote=await veAutoCaptions(say)?'':' We didn\'t hear any words for captions.'}}
      catch(e){console.warn('Captions skipped:',e);capNote=' Captions didn\'t work here; try ✨ Captions in the toolbar.'}
      renderGraphicTracks();draw()}
    S.built=true;save();status('Done!'+capNote);toast('🪄 Your video is ready! Press ▶ to watch it.'+capNote)}
  catch(e){console.error(e);status('Couldn\'t build the video: '+(e.message||e))}
  finally{busy=false;paint()}}

// ---------- events ----------
function setK(k,v,i){if(k.startsWith('brief.'))S.brief[k.slice(6)]=v;else if(i!=null&&S.scenes[i])S.scenes[i][k]=v;else S[k]=v;
  if(k==='captions')paint();if(k==='music')stopMusic();save()}
const onField=e=>{const el=e.target;if(!el.dataset?.k)return;setK(el.dataset.k,el.type==='checkbox'?el.checked:el.value,el.dataset.i!=null?+el.dataset.i:null)};
body.addEventListener('input',onField);body.addEventListener('change',onField);
body.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||busy&&b.dataset.act!=='musicPlay')return;const v=b.dataset.v,i=+b.dataset.i;
  switch(b.dataset.act){
    case 'platform':S.brief.platform=v;break;case 'length':S.brief.length=+v;break;case 'story':S.story=v;break;case 'group':S.group=v;break;
    case 'mode':S.scriptMode=v;if(v==='none')S.voice='none';else if(S.voice==='none')S.voice='record';break;
    case 'write':writeScript();return;case 'own':useOwn();return;
    case 'hook':S.hook=+v;if(S.scenes[0])S.scenes[0].say=S.hookOptions[+v]||S.scenes[0].say;break;
    case 'rmScene':S.scenes.splice(i,1);{const m=new Map();for(const [k,l] of files)if(k!==i)m.set(k>i?k-1:k,l);files.clear();for(const [k,l] of m)files.set(k,l)}break;
    case 'addScene':S.scenes.push({type:'Demo/Solution',secs:3,say:'',text:'',shot:'',anim:'',sfx:''});pickParts(false);break;
    case 'footage':S.footage=v;break;
    case 'addAll':fileTarget=-1;fileIn.click();return;case 'add':fileTarget=i;fileIn.click();return;
    case 'film':if(window.VideoCamera)VideoCamera.open(list=>addTo(i,list),toast,{only:'video'});else{fileTarget=i;fileIn.click()}return;
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
  if(S.voice==='record'&&!take){S.step=4;paint();return status('Record your voiceover first, or pick another option.')}
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
  b.innerHTML='<b>🪄 Build My Video With AI</b><span>Your footage, your voice. AI helps put it together: a script for your product, guided filming, a voiceover with a teleprompter, animated words and sounds for each part, music and captions. Everything stays editable.</span>';
  b.onclick=()=>window.veBuildMyVideo();const h=box.querySelector('.vs-qh');h?h.after(b):box.prepend(b)}
new MutationObserver(startCard).observe(document.body,{childList:true,subtree:true});startCard();
// Dashboard → editor: tapshop:open-agent (the dashboard's "🪄 Build My Video With AI" button).
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin)return;const m=e.data;if(m&&m.version===1&&m.type==='tapshop:open-agent')window.veBuildMyVideo()});
})();
