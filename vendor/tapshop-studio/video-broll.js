// B-roll Video Maker (called the B-roll builder in older notes): drop in clips, pick a story template (Hook → Problem → Solution → Call to action, …),
// and the builder looks at and listens to each clip in the browser (CLIP for pictures and Whisper for
// speech, both via transformers.js from jsDelivr in a Web Worker; models download once from Hugging Face
// and the browser caches them), puts every clip in the part of the story it fits best, lets the creator
// fix the order, then builds the video: clips cut to the beat, words on screen for each part, and a beat
// made right here in the browser (WebAudio, so it's free to use) on its own audio track.
(()=>{
const LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
const $$=id=>document.getElementById(id);
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- what the picture AI looks for ----------
// [key, prompt for the AI, short name shown to the creator]
const LOOKS=[
  ['talk','a person talking to the camera','🗣 Talking to camera'],
  ['product','a close-up photo of a product','📦 Product close-up'],
  ['unbox','hands opening a package or box','🎁 Unboxing'],
  ['messy','a messy, dirty or cluttered place','😩 Messy / before'],
  ['clean','a clean, tidy and finished result','✨ Clean / after'],
  ['using','a person using a product with their hands','🙌 Using it'],
  ['happy','a smiling, happy person','😊 Happy'],
  ['upset','a frustrated or tired person','😣 Frustrated'],
  ['screen','a phone screen or a website','📱 Phone / screen'],
  ['food','food or a drink','🍽 Food / drink'],
  ['beauty','makeup, skincare or hair','💄 Beauty'],
  ['outside','an outdoor scene or a place','🌳 Outdoors'],
];

// ---------- story templates ----------
// look: what the part's pictures usually show (weights); say: words people usually say in that part.
const S=(id,label,text,look,say,o={})=>({id,label,text,look,say,...o});
const HOOK=S('hook','Hook','Wait… you NEED this 👀',{talk:1,product:.6,happy:.3},/\b(wait|stop|you need|obsessed|game ?changer|i found|nobody|pov|okay so|you guys|listen|this is|watch)\b/i,{y:22,box:'#ff3ea5',anim:'pop',textMax:3.5,beats:4});
const CTA=S('cta','Call to action','Link in bio 👇',{talk:.8,screen:.7,product:.5,happy:.3},/\b(link|bio|grab|get yours|get it|shop|buy|code|discount|check it out|click|order|follow|comment|tap)\b/i,{y:78,box:'#ffd84d',color:'#111111',anim:'bounce',beats:6});
const TEMPLATES=[
  {id:'pas',name:'Hook → Problem → Solution',tag:'The classic UGC ad',mood:'hook',parts:[HOOK,
    S('problem','Problem','The problem? 😩',{upset:1,messy:1,talk:.3},/\b(tired of|hate|struggl|problem|annoying|never works|always|messy|hard to|sick of|used to|ugh|frustrat|can'?t)\b/i,{y:20,box:'#111111',anim:'left',beats:6}),
    S('solution','Solution','Then I found this ✨',{using:1,product:.7,clean:.5,happy:.4},/\b(so i|tried|found|works|changed|now i|fixed|solves|love how|use it|just|this one|it's so)\b/i,{y:20,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'beforeafter',name:'Before → After',tag:'Show the glow-up',mood:'reveal',parts:[HOOK,
    S('before','Before','BEFORE',{messy:1,upset:.7},/\b(before|used to|was|look at this|look how)\b/i,{y:12,box:'#111111',anim:'left',beats:8}),
    S('after','After','AFTER ✨',{clean:1,happy:.6,product:.3},/\b(after|now|look at|wow|so much better|finally)\b/i,{y:12,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'reasons',name:'3 reasons I love it',tag:'Quick reasons people save',mood:'haul',parts:[S('hook','Hook','3 reasons I love this 💕',HOOK.look,HOOK.say,{...HOOK,text:'3 reasons I love this 💕'}),
    S('r1','Reason 1','Reason #1 💡',{using:1,product:.8,happy:.3},/\b(first|one|number one|reason one|1)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    S('r2','Reason 2','Reason #2 🙌',{using:.9,product:.8,clean:.3},/\b(second|two|also|plus|another|2)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    S('r3','Reason 3','Reason #3 😍',{happy:1,using:.6,clean:.5},/\b(third|three|finally|best part|last|3)\b/i,{y:18,box:'#7c3aed',anim:'pop',beats:6}),
    CTA]},
  {id:'unboxing',name:'Unboxing',tag:'First look at something new',mood:'unbox',parts:[S('hook','Hook','It’s finally here! 📦',HOOK.look,HOOK.say,{...HOOK,text:'It’s finally here! 📦'}),
    S('open','Unboxing','Let’s open it 🎁',{unbox:1.2,product:.4,using:.3},/\b(open|unbox|box|package|arrived|came|inside)\b/i,{y:18,box:'#111111',anim:'down',beats:8}),
    S('look','First look','First look 👀',{product:1.1,clean:.4},/\b(look|comes with|inside|feel|quality|size|color|colour)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'pop',beats:6}),
    S('fav','Favourite part','My favourite part 😍',{using:1,happy:.8},/\b(favou?rite|love|best|obsessed|amazing|so good)\b/i,{y:18,box:'#ff3ea5',anim:'pop',beats:6}),
    CTA]},
  {id:'howto',name:'How to use it',tag:'A quick step-by-step',mood:'tutorial',parts:[S('hook','Hook','Here’s how I use it 👇',HOOK.look,HOOK.say,{...HOOK,text:'Here’s how I use it 👇'}),
    S('s1','Step 1','Step 1 ☝️',{using:1,product:.6,unbox:.3},/\b(first|step one|start|open|take)\b/i,{y:18,box:'#111111',anim:'left',beats:6}),
    S('s2','Step 2','Step 2 ✌️',{using:1,product:.4},/\b(then|next|step two|after that|second)\b/i,{y:18,box:'#111111',anim:'left',beats:6}),
    S('s3','Step 3','Step 3 🤟',{using:.9,clean:.4},/\b(finally|last|step three|third|and then)\b/i,{y:18,box:'#111111',anim:'left',beats:6}),
    S('result','Result','The result 😍',{clean:1,happy:.8,product:.3},/\b(result|look at|done|that's it|and now|wow)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'myth',name:'Myth vs truth',tag:'Bust a common belief',mood:'tech',parts:[S('hook','Hook','You’ve been told this… 🤔',HOOK.look,HOOK.say,{...HOOK,text:'You’ve been told this… 🤔'}),
    S('myth','The myth','MYTH ❌',{upset:.8,messy:.6,talk:.5},/\b(myth|they say|people think|you've been told|everyone says|wrong|lie)\b/i,{y:16,box:'#e11d48',anim:'left',beats:6}),
    S('truth','The truth','TRUTH ✅',{talk:.6,product:.6,using:.5},/\b(truth|actually|in fact|really|the real|turns out)\b/i,{y:16,box:'#16a34a',anim:'pop',beats:6}),
    S('proof','The proof','Here’s the proof 👀',{using:1,clean:.7,product:.5,screen:.3},/\b(proof|look|see|show|results|watch)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'dayinlife',name:'Day in my life',tag:'Your day, with it in it',mood:'unbox',parts:[S('hook','Morning','A day in my life ☀️',{outside:.6,food:.5,happy:.5,talk:.3},/\b(morning|wake|day in|good morning|coffee)\b/i,{y:16,box:'#ff3ea5',anim:'pop',textMax:3.5,beats:6}),
    S('use','Using it','How it fits in my day ✨',{using:1,product:.6,beauty:.3,food:.3},/\b(use|using|routine|every day|daily|part of)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'fade',beats:8}),
    S('moment','The moment','My favourite moment 💛',{happy:1,outside:.5,food:.4},/\b(love|favou?rite|best|moment|feel)\b/i,{y:18,box:'#111111',anim:'fade',beats:8}),
    S('night','Wrap-up','Would recommend 💯',{talk:.8,happy:.5,product:.4},/\b(night|end of|recommend|would|wrap)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'fade',beats:6}),
    CTA]},
  {id:'versus',name:'This vs that',tag:'Old way vs new way',mood:'fitness',parts:[S('hook','Hook','Stop doing it the old way 🛑',HOOK.look,HOOK.say,{...HOOK,text:'Stop doing it the old way 🛑'}),
    S('old','The old way','The old way 😩',{messy:1,upset:.8},/\b(old|used to|before|instead of|normal|regular|other)\b/i,{y:16,box:'#111111',anim:'left',beats:6}),
    S('new','The new way','The new way 😎',{using:1,product:.7,clean:.6},/\b(new|now|this|instead|switch|upgrade)\b/i,{y:16,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    S('why','Why it wins','Why it wins 🏆',{happy:.8,clean:.7,product:.5,talk:.3},/\b(because|why|better|faster|easier|cheaper|saves|wins)\b/i,{y:16,box:'#ff3ea5',anim:'pop',beats:6}),
    CTA]},
  {id:'pov',name:'POV / storytime',tag:'Tell it like a story',mood:'story',parts:[S('hook','The hook','POV: you finally found it 🫠',{talk:.8,upset:.4,happy:.3},/\b(pov|storytime|so this happened|let me tell|story)\b/i,{y:22,box:'#111111',anim:'fade',textMax:3.5,beats:6}),
    S('moment','The moment','It all started when… 👀',{upset:.7,messy:.6,talk:.5,outside:.3},/\b(so|then|when|started|one day|happened)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'fade',beats:8}),
    S('twist','The twist','Then THIS happened 😳',{happy:.7,product:.6,unbox:.4},/\b(but|then|suddenly|turns out|twist|until)\b/i,{y:18,box:'#ff3ea5',anim:'pop',beats:6}),
    S('product','The product','This is what changed it ✨',{product:1,using:.8},/\b(this|product|changed|found|it's called)\b/i,{y:18,box:'#ffffff',color:'#111111',anim:'pop',beats:8}),
    CTA]},
  {id:'honest',name:'Honest review',tag:'The good, the bad, the verdict',mood:'story',parts:[S('hook','Hook','My honest review 📝',HOOK.look,HOOK.say,{...HOOK,text:'My honest review 📝'}),
    S('good','The good','The good 👍',{happy:1,using:.7,clean:.5},/\b(love|good|great|like|amazing|pros?)\b/i,{y:16,box:'#16a34a',anim:'pop',beats:6}),
    S('bad','The not-so-good','The not-so-good 👎',{upset:.8,talk:.5,product:.3},/\b(but|don't|not|wish|only thing|cons?|downside|bad)\b/i,{y:16,box:'#e11d48',anim:'left',beats:6}),
    S('verdict','The verdict','The verdict ⭐⭐⭐⭐⭐',{talk:.8,product:.6,happy:.5},/\b(overall|verdict|worth|would|recommend|rating|out of)\b/i,{y:16,box:'#ffd84d',color:'#111111',anim:'bounce',beats:6}),
    CTA]},
];

// ---------- free beats, made in the browser ----------
// ▶ Listen plays 10 seconds of the chosen beat; it stops when the mood changes, it's tapped again or the dialog closes.
let preview=null;
function stopListen(){if(preview){preview.pause();URL.revokeObjectURL(preview.src);preview=null}let b=document.getElementById('brListen');if(b){b.textContent='▶ Listen';b.disabled=false}}
async function listen(){let b=document.getElementById('brListen');if(preview){stopListen();return}if(!mood){toast('Pick some music first.');return}if(mood==='auto'){toast('We’ll choose the music after looking at your clips. Pick a style here to hear it.');return}
  b.disabled=true;b.textContent='…';try{let f=await makeBeat(10,mood);preview=new Audio(URL.createObjectURL(f));preview.onended=stopListen;await preview.play();b.textContent='■ Stop';b.disabled=false}catch(e){stopListen();toast('Couldn’t play the music here.')}}
const MOODS={
  bright:{name:'Bright pop',bpm:104,chords:[[60,'maj'],[67,'maj'],[69,'min'],[65,'maj']],kick:[0,8,10],snare:[4,12],hats:2,arp:2,pad:1300},
  upbeat:{name:'Upbeat dance',bpm:122,chords:[[62,'min'],[58,'maj'],[65,'maj'],[60,'maj']],kick:[0,4,8,12],snare:[4,12],hats:2,open:[2,6,10,14],arp:1,pad:1600},
  chill:{name:'Chill lo-fi',bpm:86,chords:[[57,'min7'],[53,'maj7'],[60,'maj7'],[55,'maj']],kick:[0,7,10],snare:[8],hats:2,swing:.12,arp:4,pad:850},
  // Optional fields (missing = the original sound): bass saw|sub|pluck|none, bassPat (steps), lead triangle|square|sine|bell,
  // arpDown, clap/rim (steps), roll (hat steps split in three), hats 0 = none, drums false = no drums, padType, padVol, chordBars, boom (long kick).
  // lead can also be piano or guitar (a plucked string). Every style's tune is in MEL below.
  trap:{name:'Trap bounce',bpm:140,chords:[[57,'min'],[53,'maj'],[60,'maj'],[55,'maj']],kick:[0,7,10],snare:[8],clap:[8],hats:1,roll:[6,14],bass:'sub',bassPat:[0,7,10],boom:1,arp:4,lead:'bell',pad:900,padVol:.6},
  rnb:{name:'Smooth R&B',bpm:72,chords:[[62,'m9'],[67,'dom7'],[60,'maj7'],[57,'m9']],kick:[0,7,10],snare:[8],rim:[4,14],hats:2,swing:.1,bass:'sub',bassPat:[0,7,10],arp:4,lead:'sine',pad:1000,padType:'sine',padVol:1.2},
  acoustic:{name:'Happy acoustic',bpm:110,chords:[[60,'add9'],[67,'maj'],[69,'min'],[65,'add9']],kick:[0,8],clap:[4,12],snare:[],hats:4,bass:'pluck',arp:1,lead:'triangle',pad:900,padType:'sine'},
  tropical:{name:'Tropical house',bpm:108,chords:[[64,'min7'],[60,'maj7'],[67,'maj'],[62,'maj']],kick:[0,4,8,12],snare:[],clap:[4,12],open:[2,6,10,14],hats:4,bass:'pluck',bassPat:[2,6,10,14],arp:2,lead:'bell',pad:1400},
  inspire:{name:'Inspiring corporate',bpm:116,chords:[[60,'add9'],[64,'min'],[65,'add9'],[67,'sus4']],kick:[0,8],snare:[4,12],hats:2,arp:1,lead:'sine',pad:1500},
  epic:{name:'Epic cinematic',bpm:90,chords:[[57,'min'],[53,'maj'],[48,'maj'],[55,'maj']],kick:[0,3,10],snare:[8],hats:0,boom:1,bass:'saw',bassPat:[0,8],arp:2,lead:'square',pad:1800,padVol:1.8,chordBars:2},
  dreamy:{name:'Dreamy ambient',bpm:70,chords:[[60,'maj7'],[57,'m9'],[65,'maj7'],[67,'sus2']],drums:false,bass:'sub',bassPat:[0],arp:4,lead:'bell',pad:1100,padType:'sine',padVol:1.5,chordBars:2},
  funk:{name:'Funky groove',bpm:112,chords:[[62,'m9'],[67,'dom7']],kick:[0,3,8,11],snare:[4,12],hats:2,open:[6,14],bass:'pluck',bassPat:[0,3,6,8,10,11,14],arp:4,lead:'square',pad:1300},
  synthwave:{name:'Retro synthwave',bpm:100,chords:[[57,'min'],[53,'maj'],[60,'maj'],[55,'maj']],kick:[0,8],snare:[4,12],hats:2,bass:'saw',bassPat:[0,2,4,6,8,10,12,14],arp:1,lead:'square',pad:2000},
  boombap:{name:'Boom bap hip-hop',bpm:90,chords:[[57,'min7'],[62,'min7']],kick:[0,7,10],snare:[4,12],hats:2,swing:.14,bass:'sub',bassPat:[0,7,10],arp:8,lead:'triangle',pad:800},
  afro:{name:'Afrobeats',bpm:104,chords:[[61,'min7'],[66,'maj7'],[68,'maj'],[64,'maj']],kick:[0,6,10],snare:[],rim:[3,7,11,14],clap:[4,12],hats:2,open:[14],bass:'pluck',bassPat:[0,6,10,13],arp:2,lead:'bell',pad:1200},
  reggaeton:{name:'Reggaeton',bpm:96,chords:[[57,'min'],[53,'maj'],[60,'maj'],[55,'maj']],kick:[0,4,8,12],snare:[3,6,11,14],hats:4,bass:'sub',bassPat:[0,3,8,11],arp:4,lead:'square',pad:1200},
  dnb:{name:'Drum & bass rush',bpm:172,chords:[[57,'min'],[53,'maj'],[55,'maj'],[52,'min']],kick:[0,10],snare:[4,12],hats:2,bass:'sub',bassPat:[0,10],arp:4,lead:'sine',pad:1500,chordBars:2},
  futurebass:{name:'Future bass',bpm:150,chords:[[65,'add9'],[69,'min7'],[67,'sus4'],[64,'min7']],kick:[0,10],snare:[8],clap:[8],hats:2,roll:[14],bass:'sub',bassPat:[0,10],arp:2,lead:'bell',pad:2600,padVol:1.5},
  jazz:{name:'Jazzy café',bpm:92,chords:[[62,'min7'],[67,'dom7'],[60,'maj7'],[57,'dom7']],kick:[0,10],snare:[],rim:[4,12],hats:2,swing:.16,bass:'pluck',bassPat:[0,4,8,12],arp:4,lead:'sine',pad:900,padType:'sine',padVol:1.6},
  hype:{name:'Hype sports',bpm:128,chords:[[57,'pow'],[53,'pow'],[55,'pow'],[52,'pow']],kick:[0,4,8,12],snare:[4,12],clap:[4,12],hats:2,open:[2,6,10,14],bass:'saw',bassPat:[0,2,4,6,8,10,12,14],arp:2,lead:'square',pad:2200},
  playful:{name:'Cute & playful',bpm:120,chords:[[60,'maj'],[65,'maj'],[67,'maj'],[60,'maj']],kick:[0,8],snare:[],clap:[4,12],hats:4,bass:'pluck',bassPat:[0,4,8,12],arp:2,lead:'square',pad:1000,padType:'sine'},
  dark:{name:'Dark & moody',bpm:80,chords:[[57,'min'],[56,'maj'],[53,'maj'],[52,'pow']],kick:[0,10],snare:[8],hats:4,boom:1,bass:'sub',bassPat:[0,10],arp:8,lead:'sine',pad:600,padVol:1.4,chordBars:2},
  holiday:{name:'Holiday sparkle',bpm:110,chords:[[60,'maj'],[64,'min'],[65,'maj'],[67,'dom7']],kick:[0,8],snare:[4,12],hats:2,open:[6,14],bass:'pluck',arp:1,lead:'bell',pad:1400},
  piano:{name:'Gentle piano',bpm:76,chords:[[60,'maj7'],[57,'min7'],[65,'maj7'],[67,'sus4']],kick:[0,10],snare:[],rim:[8],hats:4,bass:'sub',bassPat:[0,8],arp:4,lead:'piano',pad:700,padType:'sine',padVol:.8},
  guitar:{name:'Campfire guitar',bpm:96,chords:[[67,'maj'],[64,'min'],[60,'maj'],[62,'maj']],kick:[0,8],snare:[4,12],hats:4,bass:'pluck',bassPat:[0,6,8,14],arp:2,lead:'guitar',pad:800,padType:'sine',padVol:.6},
  bossa:{name:'Bossa nova',bpm:126,chords:[[62,'min7'],[67,'dom7'],[60,'maj7'],[60,'maj7']],kick:[0,3,8,11],snare:[],rim:[0,3,6,10,13],hats:2,bass:'pluck',bassPat:[0,3,8,11],arp:4,lead:'guitar',pad:900,padType:'sine',padVol:1.1},
  gospel:{name:'Soulful gospel',bpm:72,chords:[[53,'maj7'],[57,'min7'],[58,'maj7'],[60,'dom7']],kick:[0,10],snare:[8],clap:[8],hats:2,swing:.12,bass:'sub',bassPat:[0,7,10],arp:4,lead:'piano',pad:1000,padType:'sine',padVol:1.3},
  kids:{name:'Kids cartoon',bpm:132,chords:[[60,'maj'],[67,'maj'],[65,'maj'],[67,'maj']],kick:[0,8],snare:[],clap:[4,12],hats:4,bass:'pluck',bassPat:[0,4,8,12],arp:4,lead:'bell',pad:1200,padType:'sine'},
  workout:{name:'Workout pump',bpm:132,chords:[[62,'min'],[58,'maj'],[60,'maj'],[57,'min']],kick:[0,4,8,12],clap:[4,12],snare:[],hats:2,open:[2,6,10,14],bass:'saw',bassPat:[2,6,10,14],arp:2,lead:'square',pad:1700},
  // For creators (UGC, TikTok Shop, reviews, ads): every one keeps a dip around 1.8 kHz (fx.mid) so a voice sits on top.
  // fx: noFade, comp 'tight', mid (dB), lp, bright (dB), padHP, padAtt, chorus, wobble {rate,cents}, crackle, reverb {sec,mix},
  // delay {dotted,fb,mix}, pump (0-1), rise, split (Before & After drop), pan (tune left/right), wide, sat (bass drive).
  // Leads marimba|kalimba|chime|rhodes|pluck; stab (steps) + stabType 'lead'; tick, shaker (steps); bassNotes (per bassPat hit);
  // arpPat (like a tune, chord notes); melOrder, melOct, melAmp, arpAmp, fromStart (no intro bar), vol.
  hook:{name:'Scroll-stopper hook',bpm:134,chords:[[59,'min'],[55,'maj'],[62,'maj'],[54,'min']],kick:[0,4,7,8,12],snare:[4,12],clap:[4,12],hats:1,open:[14],bass:'saw',bassPat:[0,3,6,8,11,14],bassNotes:[0,0,12,0,0,7],stab:[0,3,6,10],lead:'square',arp:0,pad:1200,padVol:.5,fromStart:1,melOrder:[0,1,0,1],vol:.52,fx:{noFade:1,comp:'tight',mid:4}},
  unbox:{name:'Cozy unboxing',bpm:78,chords:[[58,'maj9'],[62,'min7'],[63,'maj7'],[65,'dom9']],kick:[0,3,10],snare:[8],hats:2,swing:.14,bass:'sub',bassPat:[0,6,10],bassNotes:[0,7,0],lead:'rhodes',stab:[0,7],stabType:'lead',pad:900,padType:'sine',padVol:.7,melAmp:.9,vol:.6,fx:{mid:4,lp:3000,wobble:{rate:.5,cents:14},crackle:1,reverb:{sec:1.2,mix:.18}}},
  tech:{name:'Tech review',bpm:114,chords:[[61,'min7'],[57,'maj7'],[64,'sus2'],[59,'dom7']],kick:[0,8,11],snare:[],rim:[4,12],hats:2,bass:'pluck',bassPat:[0,6,8,14],bassNotes:[0,0,0,-2],lead:'marimba',arpPat:'0 . 1 0 . 2 . 1 0 . 1 . 2 . 3 .'.split(' '),arpAmp:.55,pad:1500,padType:'sine',padVol:.8,melOrder:[0,1,1,0],fx:{mid:4,delay:{dotted:1,fb:.35,mix:.3},padHP:450}},
  flash:{name:'Flash sale',bpm:154,chords:[[65,'min'],[63,'maj'],[61,'maj'],[60,'dom7']],kick:[0,4,8,12],snare:[],clap:[4,12],hats:0,tick:[0,2,4,6,8,10,12,14],bass:'saw',bassPat:[0,2,3,4,6,7,8,10,11,12,14,15],bassNotes:[0,0,12,0,0,12,0,0,12,0,7,12],lead:'square',arp:0,pad:1800,padVol:.55,melOrder:[0,0,1,1],fx:{mid:4,pump:.55,bright:4,rise:1}},
  luxe:{name:'Luxury glow',bpm:68,chords:[[61,'maj9'],[54,'maj7'],[58,'m9'],[63,'7sus4']],chordBars:2,drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'chime',arpPat:'0 . . . . . . . 3 . . . . . . .'.split(' '),arpAmp:.5,pad:1500,padVol:1.3,melOct:24,melAmp:.8,vol:.65,fx:{mid:4,chorus:1,padAtt:1.6,reverb:{sec:3.5,mix:.35}}},
  reveal:{name:'Before & after reveal',bpm:106,chords:[[55,'maj'],[59,'min'],[60,'maj'],[62,'sus4']],kick:[0,6,8],snare:[4,12],hats:2,open:[14],bass:'pluck',bassPat:[0,3,8,11],bassNotes:[0,12,0,7],lead:'piano',arp:2,pad:1600,melOrder:[0,1,0,1],fx:{mid:4,split:.4}},
  haul:{name:'Shop haul try-on',bpm:124,chords:[[57,'maj'],[54,'min7'],[62,'maj'],[64,'dom7']],kick:[0,8],snare:[],clap:[4,10,12],rim:[3,7,14],hats:2,bass:'pluck',bassPat:[0,3,6,8,10,13],bassNotes:[0,12,0,0,12,7],lead:'pluck',arp:2,arpAmp:.65,pad:1400,padVol:.6,fx:{mid:4,wide:.65}},
  story:{name:'Honest storytime',bpm:84,chords:[[62,'maj'],[54,'min'],[55,'maj'],[64,'min7']],kick:[0,10],snare:[],rim:[8],hats:0,shaker:[2,6,10,14],bass:'sub',bassPat:[0,10],bassNotes:[0,7],lead:'guitar',arpPat:'0 . 2 . 1 . 3 . 0 . 2 . 1 . 2 .'.split(' '),arpAmp:.6,pad:800,padType:'sine',padVol:.4,melAmp:.9,fx:{mid:4,lp:5000,reverb:{sec:.45,mix:.07}}},
  fitness:{name:'Fitness power',bpm:94,chords:[[55,'min'],[63,'maj7'],[65,'7sus4'],[62,'dom7']],kick:[0,6,8,11],snare:[4,12],clap:[4,12],hats:2,open:[10],bass:'sub',bassPat:[0,6,8,11],bassNotes:[0,0,0,-2],boom:1,stab:[0,3,14],lead:'square',arp:0,pad:1100,padVol:.5,vol:.28,fx:{mid:4,sat:3,comp:'tight'}},
  tutorial:{name:'Step-by-step tutorial',bpm:102,chords:[[53,'maj'],[62,'min'],[58,'6'],[60,'sus4']],kick:[0,8],snare:[],rim:[4],clap:[12],hats:4,bass:'pluck',bassPat:[0,8,12],bassNotes:[0,7,12],lead:'kalimba',arp:0,pad:1200,padType:'sine',padVol:.7,fx:{mid:4,pan:.5}},
  // Lifestyle, home, fashion and beauty (batch 1). Same creator rules: fx.mid keeps a dip around 1.8 kHz for the voice.
  // Extra fields here: melLead / stabLead (a different sound for the tune or the stabs), leads felt|glock|pizz|bow, snap (steps),
  // fx.hp (high-pass), warm (low-mid dB), tape (gentle drive), swell (slow volume swells), autopan (leads drift left/right), metal (808 hats), short, delay.steps.
  desk:{name:'Clean girl desk setup',bpm:88,chords:[[56,'maj9'],[58,'add9'],[60,'min7'],[65,'m9']],kick:[0,10],snare:[],rim:[8],hats:4,bass:'sub',bassPat:[0,10],bassNotes:[0,7],lead:'rhodes',stab:[0,6,11],stabType:'lead',melLead:'bell',melOct:24,melAmp:.8,pad:900,padType:'sine',padVol:.5,vol:.6,fx:{mid:4,lp:3600,chorus:1,reverb:{sec:1.6,mix:.22}}},
  rainy:{name:'Cozy rainy night',bpm:64,chords:[[64,'m9'],[60,'maj7'],[67,'maj7'],[59,'7sus4']],drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'felt',arpPat:'0 . . . 2 . . . 1 . . . 3 . . .'.split(' '),arpAmp:.45,pad:700,padType:'sine',padVol:.9,vol:0.58,fx:{mid:4,lp:1900,crackle:1,wobble:{rate:.8,cents:9},reverb:{sec:3,mix:.3},padAtt:1}},
  kitchen:{name:'Quick recipe kitchen',bpm:118,chords:[[62,'maj'],[60,'maj'],[67,'maj'],[62,'7sus4']],kick:[0,8,10],snare:[],snap:[4,12,15],hats:0,shaker:[2,6,10,14],bass:'pluck',bassPat:[0,6,8,13],bassNotes:[0,7,0,5],lead:'kalimba',arpPat:'0 . 2 1 . 2 . 0 . 2 1 . 3 . 2 .'.split(' '),arpAmp:.6,pad:1100,padType:'sine',padVol:.4,fx:{mid:4,pan:.55,short:1,wide:.5}},
  tidy:{name:'Satisfying restock',bpm:98,chords:[[66,'min7'],[59,'dom9'],[62,'maj7'],[61,'7sus4']],kick:[0,8],snare:[],rim:[6,14],hats:2,bass:'sub',bassPat:[0,8,11],bassNotes:[0,0,7],lead:'marimba',arpPat:'0 1 2 1 3 1 2 1 0 1 2 1 3 2 1 2'.split(' '),arpAmp:.42,pad:1300,padType:'sine',padVol:.5,melAmp:.9,melOrder:[0,1,0,0],vol:0.95,fx:{mid:4,hp:170,padHP:600,delay:{dotted:1,fb:.3,mix:.24}}},
  pet:{name:'Cute pet moment',bpm:130,chords:[[60,'6'],[62,'min7'],[64,'min7'],[65,'maj']],kick:[],snare:[],snap:[4,12],rim:[10],hats:0,bass:'none',lead:'pizz',arpPat:'0 . . 2 . . 1 . 3 . . 1 . 2 . .'.split(' '),arpAmp:.6,pad:1200,padType:'triangle',padVol:.5,fromStart:1,vol:2.1,fx:{mid:4,hp:220}},
  toy:{name:'Kid-friendly toy',bpm:138,chords:[[64,'maj'],[69,'maj'],[61,'min'],[71,'maj']],kick:[0,8],snare:[],clap:[4,12],hats:4,swing:.22,bass:'pluck',bassPat:[0,4,8,12],bassNotes:[0,7,0,7],lead:'glock',arp:0,pad:1500,padType:'triangle',padVol:.45,melOct:24,melAmp:.85,fx:{mid:4,wide:.6,bright:3}},
  coffee:{name:'Coffee bar pour',bpm:82,chords:[[63,'m9'],[68,'dom9'],[61,'maj9'],[60,'m11']],kick:[0,6,10],snare:[4,12],hats:2,swing:.16,bass:'sub',bassPat:[0,6,10],bassNotes:[0,0,5],lead:'rhodes',stab:[2,9],stabType:'lead',melLead:'sine',melAmp:.75,pad:1000,padType:'sine',padVol:.6,vol:0.5,fx:{mid:4,tape:1.8,chorus:1,warm:2}},
  plant:{name:'Plant care patio',bpm:74,chords:[[57,'add9'],[55,'maj'],[62,'sus2'],[57,'sus4']],kick:[0],snare:[],shaker:[4,12],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'guitar',arpPat:'0 . . 1 . . 2 . . . 3 . . 1 . .'.split(' '),arpAmp:.55,melOct:24,melAmp:.7,pad:1000,padType:'sine',padVol:.6,fx:{mid:4,reverb:{sec:2.4,mix:.28},swell:.35,padAtt:1.2}},
  scrub:{name:'Deep clean timelapse',bpm:160,chords:[[61,'min'],[64,'maj'],[66,'maj'],[68,'min']],kick:[0,4,8,12],snare:[],clap:[4,12],hats:2,open:[14],bass:'saw',bassPat:[0,3,6,8,11,14],bassNotes:[0,12,0,0,12,0],lead:'pluck',arpPat:'0 1 2 3 2 1 0 1 2 . 2 . 3 . 4 .'.split(' '),arpAmp:.55,pad:1600,padVol:.45,fromStart:1,vol:0.45,fx:{mid:4,comp:'tight'}},
  apartment:{name:'Minimal apartment tour',bpm:66,chords:[[59,'maj7'],[61,'add9'],[64,'maj7'],[56,'m9']],chordBars:2,drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'sine',arp:0,pad:1600,padVol:.9,melAmp:.8,vol:.65,fx:{mid:4,padAtt:1.4,delay:{steps:4,fb:.5,mix:.38}}},
  sneaker:{name:'Sneaker drop',bpm:93,chords:[[56,'min'],[57,'maj'],[56,'min'],[52,'maj']],kick:[0,3,10],snare:[4,12],hats:1,roll:[7,15],open:[11],bass:'sub',bassPat:[0,3,10],bassNotes:[0,0,-2],boom:1,lead:'square',arp:0,pad:900,padVol:.4,vol:.3,fx:{mid:4,sat:4,comp:'tight',metal:1}},
  thrift:{name:'Thrift flip DIY',bpm:136,chords:[[58,'maj'],[62,'min'],[63,'maj'],[60,'min7']],kick:[0,7,8],snare:[4,12],hats:2,bass:'pluck',bassPat:[0,2,4,7,8,10,12,14],bassNotes:[0,12,7,5,0,12,7,4],lead:'square',arp:0,pad:1300,padVol:.5,vol:0.47,fx:{mid:4,wobble:{rate:4.8,cents:11},chorus:1,warm:3}},
  jewelry:{name:'Jewelry close-up',bpm:60,chords:[[54,'maj7'],[56,'add9'],[54,'maj9'],[56,'sus2']],chordBars:2,drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'chime',arpPat:'. . 4 . . . . . . . 3 . . . . .'.split(' '),arpAmp:.45,melOct:24,melAmp:.7,pad:900,padType:'sine',padVol:1.3,vol:.7,fx:{mid:4,reverb:{sec:5,mix:.4},autopan:.8,padAtt:2}},
  grwm:{name:'GRWM night out',bpm:123,chords:[[60,'m9'],[56,'maj7'],[63,'maj9'],[55,'7sus4']],kick:[0,4,8,12],snare:[],clap:[4,12],hats:0,open:[2,6,10,14],bass:'saw',bassPat:[2,6,10,14],bassNotes:[0,12,0,12],stab:[3,11],lead:'rhodes',arp:0,melLead:'sine',melAmp:.8,pad:1700,padVol:.45,fx:{mid:4,pump:.4,bright:3}},
  silk:{name:'Silky hair slow-mo',bpm:62,chords:[[62,'maj9'],[66,'min7'],[67,'maj9'],[69,'7sus4']],chordBars:2,drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'bow',arp:0,pad:1500,padVol:1.1,melAmp:.9,vol:.6,fx:{mid:4,chorus:1,padAtt:2,reverb:{sec:2.6,mix:.3}}},
  // Style comparisons, tech, gaming and productivity (batch 2). New here: resp + respLead (an answering tune, panned opposite the
  // tune by fx.call), build (ticks speed up for 3 bars, then an impact bar with the beat), layers {bass,drums,stab,arp,mel: first bar},
  // lead glass (FM), fx.lfoLp {lo,hi,rate} (slow filter sweeps), bassBP (band-passed bass), reverb.gate, delay.ping.
  dupes:{name:'Dupe vs high-end',bpm:105,chords:[[55,'min7'],[60,'dom7'],[58,'maj7'],[62,'min7']],kick:[0,7,10],snare:[4,12],hats:2,bass:'pluck',bassPat:[0,7,10],bassNotes:[0,0,7],lead:'pluck',melLead:'square',respLead:'kalimba',arp:0,pad:1200,padType:'sine',padVol:.5,fx:{mid:4,call:.7}},
  capsule:{name:'Capsule wardrobe packing',bpm:111,chords:[[65,'add9'],[67,'maj'],[69,'min7'],[60,'sus2']],kick:[0,8],snare:[4,12],hats:2,shaker:[3,11],bass:'pluck',bassPat:[0,8,11],bassNotes:[0,0,7],lead:'guitar',stab:[0,3,6,8,11,14],stabType:'lead',arp:0,melLead:'triangle',melAmp:.8,pad:1100,padType:'sine',padVol:.35,fx:{mid:4,reverb:{sec:.9,mix:.14}}},
  perfume:{name:'Perfume editorial',bpm:58,chords:[[61,'min'],[62,'maj7'],[61,'m9'],[57,'maj7']],drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0,8],bassNotes:[0,-5],lead:'chime',arpPat:'. . . . . . 4 . . . . . . . . .'.split(' '),arpAmp:.5,melOct:24,melAmp:.7,pad:1100,padType:'sawtooth',padVol:.7,vol:.7,fx:{mid:4,lfoLp:{lo:500,hi:2600,rate:.06},reverb:{sec:4.5,mix:.4},padAtt:1.5}},
  athleisure:{name:'Activewear try-on',bpm:117,chords:[[64,'min7'],[69,'dom7'],[62,'maj'],[67,'maj7']],kick:[0,5,8,13],snare:[4,12],hats:2,open:[6],bass:'saw',bassPat:[0,3,5,8,11,13],bassNotes:[0,0,12,0,7,12],lead:'square',arp:0,pad:1300,padVol:.4,vol:.48,fx:{mid:6,comp:'tight'}},
  shades:{name:'Sunglasses summer',bpm:101,chords:[[56,'dom9'],[54,'maj7'],[61,'add9'],[63,'min7']],kick:[0,10],snare:[4,12],hats:2,swing:.1,open:[14],bass:'pluck',bassPat:[0,3,10],bassNotes:[0,7,12],lead:'triangle',stab:[2,7,12],arp:0,pad:1400,padVol:.7,fx:{mid:4,tape:1.6,chorus:1,delay:{dotted:1,fb:.3,mix:.2}}},
  rgb:{name:'RGB gaming setup',bpm:142,chords:[[59,'min'],[55,'maj'],[60,'maj'],[57,'maj']],kick:[0,8],snare:[4,12],hats:2,bass:'saw',bassPat:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],bassNotes:[0,0,12,0,0,12,0,7,0,0,12,0,0,12,7,12],lead:'pluck',arpPat:'0 2 4 2 1 3 4 3 0 2 4 2 3 4 5 4'.split(' '),arpAmp:.4,melLead:'glass',pad:1600,padVol:.4,vol:.5,fx:{mid:4,sat:2.5,wide:.75,delay:{steps:3,fb:.35,mix:.25,ping:1}}},
  saas:{name:'AI tool walkthrough',bpm:115,chords:[[57,'maj7'],[59,'add9'],[61,'min7'],[54,'m9']],kick:[0,8],snare:[],rim:[4,12],hats:4,bass:'sub',bassPat:[0,8,14],bassNotes:[0,0,7],lead:'marimba',arpPat:'0 . 2 . 1 . 3 . 0 . 2 . 4 . 3 .'.split(' '),arpAmp:.45,melLead:'sine',melAmp:.8,pad:1400,padType:'sine',padVol:.4,fx:{mid:7}},
  notion:{name:'Notion study beat',bpm:79,chords:[[61,'maj7'],[58,'m9'],[63,'min7'],[56,'dom9']],kick:[0,9],snare:[4,12],hats:2,swing:.12,bass:'sub',bassPat:[0,9],bassNotes:[0,7],lead:'felt',stab:[0,10],stabType:'lead',melAmp:.7,pad:800,padType:'sine',padVol:.5,vol:.6,fx:{mid:4,lp:2200,crackle:.6}},
  droptest:{name:'Drop test impact',bpm:127,chords:[[62,'min'],[62,'min'],[58,'maj'],[57,'dom7']],build:1,kick:[0,3,8,11],snare:[4,12],hats:2,boom:1,bass:'sub',bassPat:[0,3,8,11],bassNotes:[0,0,-2,0],lead:'square',arp:0,pad:1000,padVol:.45,fromStart:1,vol:.5,fx:{mid:4,reverb:{sec:.25,mix:.18,gate:1}}},
  smarthome:{name:'Smart home future',bpm:109,chords:[[66,'min'],[62,'maj7'],[64,'add9'],[61,'7sus4']],kick:[0,8],snare:[],clap:[12],hats:2,bass:'pluck',bassPat:[0,4,8,12],bassNotes:[0,0,0,0],lead:'glass',arpPat:'0 1 2 . 0 1 2 . 3 2 1 . 3 2 1 .'.split(' '),arpAmp:.45,pad:1500,padType:'sine',padVol:.5,fx:{mid:4,delay:{steps:2,fb:.25,mix:.2},reverb:{sec:1.2,mix:.15}}},
  wfh:{name:'Work from home gear',bpm:119,chords:[[60,'add9'],[64,'min7'],[57,'min7'],[65,'maj9']],kick:[0,8,10],snare:[],clap:[4,12],hats:2,bass:'pluck',bassPat:[0,6,8,14],bassNotes:[0,7,0,5],lead:'pluck',arp:0,pad:1500,padType:'sine',padVol:.4,melAmp:1,fx:{mid:4,bright:3}},
  filmmaker:{name:'Camera gear cinematic',bpm:71,chords:[[57,'min'],[53,'maj7'],[60,'maj'],[52,'7sus4']],kick:[0],snare:[8],hats:0,boom:1,bass:'sub',bassPat:[0,8],bassNotes:[0,0],lead:'bow',arp:0,pad:1400,padVol:1,vol:.6,fx:{mid:4,lfoLp:{lo:700,hi:3200,rate:.05},reverb:{sec:3.2,mix:.32},padAtt:1.6}},
  subbox:{name:'Subscription box reveal',bpm:113,chords:[[63,'maj'],[67,'min'],[68,'maj'],[70,'maj']],layers:{bass:1,drums:2,stab:3,mel:3},kick:[0,8,11],snare:[4,12],hats:2,bass:'pluck',bassPat:[0,3,8,11],bassNotes:[0,12,0,7],lead:'marimba',arpPat:'0 . 1 2 . 1 . 0 3 . 1 2 . 1 . 2'.split(' '),arpAmp:.6,stab:[6,14],stabType:'lead',stabLead:'glock',fromStart:1,pad:1500,padType:'sine',padVol:.35,fx:{mid:4,wide:.6}},
  hustle:{name:'Side hustle groove',bpm:89,chords:[[58,'m9'],[63,'dom9'],[58,'m11'],[65,'7sus4']],kick:[0,7,10],snare:[4,12],hats:2,swing:.08,bass:'pluck',bassPat:[0,3,6,7,10,14],bassNotes:[0,3,5,7,10,12],lead:'rhodes',arp:0,melLead:'sine',melAmp:.8,pad:1000,padType:'sine',padVol:.5,vol:.55,fx:{mid:4,warm:1.5,reverb:{sec:.7,mix:.12}}},
  scam:{name:'Scam warning',bpm:145,chords:[[53,'min'],[54,'maj'],[59,'pow'],[52,'maj']],kick:[0,8],snare:[],hats:0,tick:[1,3,5,7,9,11,13,15],bass:'saw',bassPat:[0,2,4,6,8,10,12,14],bassNotes:[0,0,0,0,0,0,1,0],lead:'square',arp:0,pad:900,padVol:.4,fromStart:1,vol:1.2,fx:{mid:4,bassBP:520,delay:{steps:1,fb:.18,mix:.15}}},
  // Sales, reviews and storytelling (batch 3). New here: leads quirk (bends into each note, wobbles), musicbox, stacc (short strings),
  // fx.center (every melodic part in the middle), ending + endChord (the last 2.6 s is one bright final chord ringing out).
  deinfluence:{name:'De-influencing honest',bpm:87,chords:[[55,'min'],[62,'min'],[63,'maj'],[65,'maj']],kick:[0,8],snare:[],rim:[4,12],hats:0,bass:'pluck',bassPat:[0,4,6,8,12],bassNotes:[0,0,7,0,5],lead:'sine',arp:0,pad:900,padType:'sine',padVol:.3,melAmp:.8,vol:.75,fx:{mid:4}},
  viral:{name:'Viral product reality check',bpm:103,chords:[[61,'min7'],[66,'dom7'],[61,'m6'],[64,'maj7']],kick:[0,7,10],snare:[4,12],hats:2,bass:'pluck',bassPat:[0,7,10,13],bassNotes:[0,0,7,10],lead:'quirk',arp:0,pad:1200,padType:'sine',padVol:.45,melOrder:[0,1,0,1],fx:{mid:4,wobble:{rate:.4,cents:8},delay:{steps:2,fb:.28,mix:.22}}},
  giftguide:{name:'Holiday gift guide',bpm:125,chords:[[65,'maj'],[62,'min7'],[70,'maj'],[72,'dom7']],kick:[0,8],snare:[],clap:[4,12],hats:0,shaker:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],bass:'pluck',bassPat:[0,3,8,11],bassNotes:[0,7,0,7],lead:'glock',arpPat:'4 . 3 . 2 . 3 . 4 . . . 2 . . .'.split(' '),arpAmp:.4,melLead:'bell',melOct:24,melAmp:.9,pad:1600,padVol:.45,vol:.48,fx:{mid:4,bright:4,comp:'tight',reverb:{sec:1.8,mix:.2}}},
  smallbiz:{name:'Small business packing',bpm:97,chords:[[57,'maj'],[64,'maj'],[66,'min7'],[62,'maj9']],kick:[0,10],snare:[4,12],hats:4,shaker:[2,6,10,14],bass:'sub',bassPat:[0,10],bassNotes:[0,7],lead:'guitar',stab:[0,6,10],stabType:'lead',arp:0,melLead:'piano',melAmp:.75,pad:1100,padType:'sine',padVol:.4,vol:0.53,fx:{mid:4,tape:1.5,reverb:{sec:2,mix:.18}}},
  testimonial:{name:'5-star testimonial',bpm:75,chords:[[63,'maj9'],[58,'maj'],[60,'min7'],[56,'maj7']],kick:[0,8],snare:[],rim:[12],hats:0,bass:'sub',bassPat:[0,8],bassNotes:[0,0],lead:'piano',stab:[0,4,8,12],stabType:'lead',arp:0,melAmp:.8,pad:1000,padType:'sine',padVol:.5,vol:.55,fx:{mid:4,chorus:1,reverb:{sec:1,mix:.16}}},
  travel:{name:'Travel essentials',bpm:121,chords:[[59,'maj'],[57,'maj'],[64,'add9'],[59,'sus4']],kick:[0,6,8],snare:[4,12],hats:2,open:[14],bass:'saw',bassPat:[0,6,8,14],bassNotes:[0,0,0,12],lead:'pluck',arpPat:'0 . 1 2 . 1 2 . 3 . 2 1 . 2 . .'.split(' '),arpAmp:.5,melLead:'triangle',pad:1700,padVol:.4,fx:{mid:4,bright:3,delay:{dotted:1,fb:.32,mix:.24}}},
  car:{name:'Car detailing',bpm:99,chords:[[63,'min'],[59,'maj'],[61,'maj'],[58,'maj']],kick:[0,6,9],snare:[4,12],hats:2,open:[15],bass:'sub',bassPat:[0,6,9,14],bassNotes:[0,0,5,7],boom:1,lead:'square',arp:0,pad:1000,padVol:.4,vol:.3,fx:{mid:4,sat:3.5,comp:'tight',metal:1,reverb:{sec:.4,mix:.08}}},
  booktok:{name:'BookTok cozy reading',bpm:67,chords:[[67,'maj7'],[69,'add9'],[64,'m9'],[62,'6']],drums:false,kick:[],snare:[],hats:0,bass:'sub',bassPat:[0],bassNotes:[0],lead:'musicbox',arp:0,melOct:24,melAmp:.85,pad:1100,padType:'sine',padVol:1,vol:.6,fx:{mid:4,lp:3200,wobble:{rate:.7,cents:10},reverb:{sec:3,mix:.32},padAtt:1}},
  mistakes:{name:'3 mistakes myth-buster',bpm:131,chords:[[64,'min'],[60,'maj'],[59,'dom7'],[64,'min']],kick:[0,8],snare:[4,12],hats:2,bass:'saw',bassPat:[0,4,8,12],bassNotes:[0,0,0,0],lead:'stacc',arpPat:'0 . 0 . 2 . 0 . 1 . 1 . 2 . 3 .'.split(' '),arpAmp:.6,melLead:'stacc',pad:1300,padVol:.35,fromStart:1,vol:0.5,fx:{mid:4,center:1,comp:'tight'}},
  finale:{name:'Link in bio finale',bpm:107,chords:[[65,'maj9'],[67,'sus4'],[64,'min7'],[67,'dom7']],ending:1,endChord:[60,'add9'],endLead:'piano',layers:{bass:1,drums:2,mel:2},kick:[0,8],snare:[4,12],hats:2,bass:'pluck',bassPat:[0,8,11],bassNotes:[0,0,7],lead:'piano',stab:[0,8],stabType:'lead',arp:0,melLead:'bell',melOct:24,melAmp:.85,pad:1500,padVol:.6,fromStart:1,vol:0.72,fx:{mid:4,reverb:{sec:2.2,mix:.22}}},
};
// Each style's own tune: two one-bar phrases, played A A B A. 16 steps a bar: a number is a note of the chord
// playing at the time (0 = root, 1 = next chord note up…, past the top goes up an octave, negative goes down),
// "-" holds the note, "." is a rest. Using chord notes keeps every tune in tune with any chords.
const MEL={
  bright:['2 . 2 . 1 - 0 . 1 . 2 - - - . .','3 . 2 . 1 . 2 - 1 - 0 - - - . .'],
  upbeat:['0 . 0 2 . 0 1 . 2 . 3 - 2 . 1 .','3 - 2 . 3 - 4 . 3 . 2 . 1 - . .'],
  chill:['2 - - 1 . . 0 - - . . . 1 - 0 .','3 - - 2 . 1 - . 0 - - - . . . .'],
  trap:['0 . 0 . 2 . . 1 . . 0 . -1 - . .','3 . 2 . 3 . . 2 . . 1 . 0 - . .'],
  rnb:['. . 2 - 3 - 2 1 - - 0 - . . . .','. 4 - 3 2 - 1 - 2 - - - . . . .'],
  acoustic:['0 1 2 - 2 - 1 0 1 - 2 - 0 - . .','3 - 2 1 2 - 1 0 1 - 0 - - - . .'],
  tropical:['. . 2 . 2 . 3 . . 2 . 1 . . 0 .','. . 3 . 3 . 4 . . 3 . 2 . 1 . .'],
  inspire:['0 - 1 - 2 - - - 3 - 2 - 1 - - -','2 - 3 - 4 - - - 3 - - - 2 - - -'],
  epic:['0 - - - 1 - - - 2 - - - 1 - 0 -','3 - - - 2 - - - 4 - - - 3 - - -'],
  dreamy:['3 - - - - - 2 - - - - - 1 - - -','4 - - - - - 3 - - - 2 - - - - -'],
  funk:['0 . 0 2 . 0 . 3 . 0 2 . 1 . 0 .','. 3 . 2 . 3 4 . 3 . 2 . 0 . . .'],
  synthwave:['2 - - 3 - - 4 - 3 - 2 - 1 - - -','4 - - 3 - - 2 - 3 - - - 1 - - -'],
  boombap:['. . 2 . . 1 . . 0 - . . -1 . . .','. . 3 . . 2 . 1 . . 0 - . . . .'],
  afro:['0 . 1 . . 2 . 1 . 0 . . 2 . 1 .','3 . 2 . . 3 . 2 . 1 . . 0 . . .'],
  reggaeton:['2 . . 2 . . 1 . 2 . . 2 . . 3 .','3 . . 2 . . 1 . 0 . . 1 . . 2 .'],
  dnb:['3 - - - 2 - - - 4 - - - 3 - 2 -','4 - 3 - 2 - - - 1 - - - 2 - - -'],
  futurebass:['2 . 3 . 4 - . 3 . 2 . 3 - - . .','4 . 3 . 4 . 5 - - . 4 . 3 - . .'],
  jazz:['. 2 3 4 - 3 2 . 1 - 0 - . . . .','4 - 3 . 2 1 . 2 - - 3 - . . . .'],
  hype:['0 . 0 . 3 . 0 . 2 . 0 . 1 . 0 .','3 . 3 . 2 . 2 . 1 . 1 . 0 - - -'],
  playful:['0 2 4 . 2 . 0 . 1 3 5 . 3 . 1 .','4 . 3 . 2 . 1 . 0 . 2 . 0 - . .'],
  dark:['0 - - - . . 1 - - . . . 0 - -1 -','2 - - - . . 1 - - - 0 - - - . .'],
  holiday:['0 - 2 - 4 - 3 2 1 - - - 2 - . .','4 - 3 - 2 - 1 0 1 - 2 - 0 - - -'],
  workout:['0 . 0 . 0 . 2 . 0 . 0 . 3 . 2 .','3 . 3 . 2 . 2 . 4 . 3 . 2 . 1 .'],
  piano:['2 - - 1 0 - - - 1 - 2 - 3 - - -','4 - 3 - 2 - - 1 - - 0 - - - . .'],
  guitar:['0 . 1 . 2 - 2 . 1 . 0 - . . 1 .','2 . 3 . 2 - 1 . 0 . 1 - - - . .'],
  bossa:['2 . . 3 . . 2 . 1 - . 0 . . . .','. 3 . . 4 . 3 . . 2 - - . . . .'],
  gospel:['0 - 1 2 - - 3 - 2 - - - 1 - 0 -','3 - 4 - 3 2 - - 1 - 2 - - - . .'],
  kids:['0 . 2 . 4 . 2 . 3 . 1 . 2 - . .','4 . 4 . 3 . 3 . 2 . 1 . 0 - . .'],
  hook:['0 0 . 2 . 0 3 . 2 . 0 . 4 - 3 .','4 . 3 . 2 . 3 4 . 3 2 . 0 - . .'],
  unbox:['. . 2 - - 1 . 3 - - - 2 . . . .','. 4 - 3 - - 2 . 1 - - - . . . .'],
  tech:['0 . . 2 . . 1 . . . 3 . 2 . . .','3 . . 1 . . 2 . . . 0 - - - . .'],
  flash:['0 . 0 . 1 . 2 . 0 . 0 . 3 . 2 .','2 . 2 . 3 . 4 . 3 . 2 . 1 . 0 .'],
  luxe:['4 - - - - - - - 3 - - - - - - -','2 - - - - - - - 1 - - - 0 - - -'],
  reveal:['0 - 1 - 2 - 1 . 3 - - - 2 - . .','2 - 3 - 4 - 3 . 5 - 4 - 3 - . .'],
  haul:['. 0 . 2 1 . 0 . . 3 . 2 . 1 0 .','. 2 . 3 4 . 3 . 2 . 1 . 2 - . .'],
  story:['. . . . 2 - 1 - 0 - - - . . . .','. . . . 3 - 2 - 1 - 2 - 0 - - -'],
  fitness:['0 . . 0 . . 2 . 0 . . 3 . 2 . .','0 . . 0 . . 4 . 3 . . 2 . 1 . .'],
  tutorial:['0 . 1 . 2 . 1 . 0 . 2 . 1 - . .','2 . 3 . 4 . 3 . 2 . 1 . 0 - . .'],
  desk:['. . 4 . . 3 . . 2 - - . . . . .','. . 3 . . 4 . . 5 - - - 4 . . .'],
  rainy:['2 - - - 1 - - - 0 - - - - - - -','3 - - - 2 - - 1 - - - - . . . .'],
  kitchen:['0 . 0 2 . 1 . . 3 . 2 . 1 . . .','4 . 3 . 4 . 2 . . 1 . 0 . . . .'],
  tidy:['. . . . 3 - - - . . . . 2 - 1 -','. . . . 4 - - - . . . . 3 - - -'],
  pet:['0 . 2 . 4 . . . 3 . 1 . . . . .','2 . 3 . 5 . 4 . 2 . . 0 . . . .'],
  toy:['0 . 1 . 2 . 0 . 2 . 3 . 4 - . .','4 . 3 . 2 . 3 . 1 . 2 . 0 - . .'],
  coffee:['. . . 3 - 2 . . 1 - - . 0 . . .','. . . 4 - 3 . 2 - . 1 - - - . .'],
  plant:['3 - - - . . 2 - - - . . 1 - - -','4 - - - . . 3 - - 2 - - - - . .'],
  scrub:['0 0 . 2 . 2 . 3 . 3 . 2 0 . . .','4 . 4 . 3 . 3 . 2 . 2 . 1 . 0 .'],
  apartment:['3 - - - - - - - . . . . . . . .','. . . . 2 - - - - - - - . . . .'],
  sneaker:['0 . . . . . 0 . 2 . . . 1 . . .','. . 0 . . . 3 . . . 2 . 0 . . .'],
  thrift:['. 2 . 2 . 3 . 1 . . . 2 . 0 . .','. 3 . 4 . 3 . 2 . 1 . . 2 - . .'],
  jewelry:['4 - - - - - - - - - - - 3 - - -','5 - - - - - - - 4 - - - - - - -'],
  grwm:['. . 0 . . 2 . . . 1 . . 0 - . .','. . 3 . . 2 . . . 4 . . 3 - . .'],
  silk:['2 - - - - - - - 3 - - - 1 - - -','4 - - - - - 3 - - - - - 2 - - -'],
  dupes:['0 . 2 . 1 - . . . . . . . . . .','3 . 2 . 4 - . . . . . . . . . .'],
  capsule:['. . 2 . 3 . 4 - . . 3 . 2 - . .','. . 4 . 3 . 2 . 1 . 2 - - - . .'],
  perfume:['. . . . 4 - - - - - 3 - - - - -','. . . . 2 - - - 1 - - - - - - -'],
  athleisure:['0 . . 2 . . 0 . 3 . . 2 . . . .','0 . . 4 . . 3 . 2 . . 1 . . . .'],
  shades:['. 2 - 3 . 4 - - . 3 . 2 - - . .','. 4 - 5 . 4 - 3 - - 2 . . . . .'],
  rgb:['4 - - . 3 - - . 2 - - . 3 - - -','5 - - . 4 - - . 6 - - . 4 - - -'],
  saas:['. . . . 2 - . . . . . . 3 - . .','. . . . 4 - . . 3 - . . 2 - . .'],
  notion:['. . . . 3 - 2 - . . . . 1 - - -','. . . . 2 - 3 - 4 - - - . . . .'],
  droptest:['0 . . 0 . . 0 . . . 2 . 1 . . .','3 . . 3 . . 2 . . . 1 . 0 . . .'],
  smarthome:['4 . . . 3 . . . 2 . 3 . 4 - - -','5 . . . 4 . . . 3 . 2 . 3 - - -'],
  wfh:['0 . 1 . 2 . . 4 . . 3 . 2 . . .','2 . 3 . 4 . . 5 . 4 . 3 . 2 . .'],
  filmmaker:['0 - - - - - 1 - - - 2 - - - - -','4 - - - 3 - - - - - 1 - - - - -'],
  subbox:['0 . 2 . 4 . 2 . 3 - - . . . . .','4 . 5 . 6 . 4 . 3 - 2 - . . . .'],
  hustle:['. . 3 . . 2 . . . 4 - 3 . . . .','. . 2 . . 3 . . . 1 - 0 . . . .'],
  scam:['0 . . . 1 . . . 0 . . . . . . .','0 . . . 3 . . . 2 . . . . . . .'],
  deinfluence:['. . 0 . . . . . 2 . . 1 . . . .','. . 3 . . . . . 2 . . 0 . . . .'],
  viral:['0 . . 2 . 1 . . . 3 . . 2 . . .','. . 1 . 2 . 3 . . 4 - . 3 . . .'],
  giftguide:['2 . 4 . 5 . 4 . 3 - 2 - . . . .','4 . 5 . 6 . 5 . 4 . 3 . 2 - . .'],
  smallbiz:['. . 0 . 1 . 2 - - . 4 . 3 . 2 .','. . 3 . 4 . 5 - - . 4 . 2 - - -'],
  testimonial:['. . 1 - 2 - . . 4 - - - 3 . . .','. . 3 - 2 - . . 1 - - - 0 - - -'],
  travel:['0 . 2 . . 3 . 4 . . 2 . 3 . . .','4 . 3 . . 2 . 3 . . 4 . 5 - . .'],
  car:['. . . . 0 . . 1 . . . . 2 . . .','. . . . 3 . . 2 . . . . 0 . . .'],
  booktok:['4 . 3 . 2 . 3 . 4 - - - . . . .','5 . 4 . 3 . 2 . 1 - - - . . . .'],
  mistakes:['0 . . . 0 . . . 3 . 2 . 1 . . .','2 . . . 2 . . . 3 . 4 . 3 . . .'],
  finale:['. . 0 . 1 . 2 - . . 3 . 4 - - -','. . 4 . 3 . 4 - . . 5 . 6 - - -'],
};
for(const k in MEL)if(MOODS[k])MOODS[k].mel=MEL[k].map(p=>p.split(' '));
// Answering tunes (call and response): the second half of each bar answers the first, panned the other way.
MOODS.dupes.resp=['. . . . . . . . 4 . 3 . 2 - . .','. . . . . . . . 2 . 3 . 0 - . .'].map(p=>p.split(' '));
// The creator tracks (UGC, TikTok Shop, reviews, ads) get their own group in the music menus.
const CREATOR=['hook','unbox','tech','flash','luxe','reveal','haul','story','fitness','tutorial'];
const STORY=['deinfluence','viral','giftguide','smallbiz','testimonial','travel','car','booktok','mistakes','finale'];
const TECH=['dupes','capsule','perfume','athleisure','shades','rgb','saas','notion','droptest','smarthome','wfh','filmmaker','subbox','hustle','scam'];
const LIFE=['desk','rainy','kitchen','tidy','pet','toy','coffee','plant','scrub','apartment','sneaker','thrift','jewelry','grwm','silk'];
Object.entries({hook:'grab them in 2 seconds',unbox:'unboxing, morning routine',tech:'gadget and app reviews',flash:'sales, deals, last chance',luxe:'skincare, beauty, luxury',
  reveal:'quiet “before”, big “after” drop',haul:'hauls and try-ons',story:'storytime, real talk',fitness:'gym, supplements, energy',tutorial:'how-to, step by step',
  desk:'aesthetic desk, clean girl',rainy:'self-care night, rainy day',kitchen:'kitchen gadgets, quick recipes',tidy:'organizing, restocks, ASMR',pet:'pet products, cute moments',toy:'parenting hacks, toys',
  coffee:'coffee bar, drink pours',plant:'plants, garden, patio',scrub:'cleaning hacks, timelapses',apartment:'apartment and room tours',sneaker:'streetwear, sneaker drops',thrift:'thrift flips, DIY',
  jewelry:'jewelry and watches',grwm:'get ready with me, nights out',silk:'haircare, slow-mo',
  dupes:'dupe vs high-end comparisons',capsule:'capsule wardrobe, packing',perfume:'fragrance and perfume',athleisure:'activewear try-ons',shades:'sunglasses, summer, vacation',rgb:'gaming setups, RGB',
  saas:'AI tools, app walkthroughs',notion:'productivity, Notion tours',droptest:'phone cases, EDC, drop tests',smarthome:'smart home, gadgets',wfh:'work from home gear',filmmaker:'camera gear, filmmaking',
  subbox:'app unboxing, subscription boxes',hustle:'side hustles, money tips',scam:'scam warnings, security tips',
  deinfluence:'honest reviews, de-influencing',viral:'viral product reality checks',giftguide:'gift guides, Black Friday hauls',smallbiz:'small business, packing orders',testimonial:'customer testimonials, 5-star reviews',
  travel:'travel essentials, airport hacks',car:'car detailing, auto accessories',booktok:'BookTok, Kindle, cozy reading',mistakes:'myth-busting, “3 mistakes”',finale:'the ending: “link in bio”'}).forEach(([k,v])=>{if(MOODS[k])MOODS[k].for=v});
// Music menus in groups: creator tracks, lifestyle tracks, then everything else.
const GROUPS=()=>[['🛍️ For creators',CREATOR],['🏡 Lifestyle, home, fashion & beauty',LIFE],['💻 Style, tech, gaming & productivity',TECH],['⭐ Sales, reviews & storytelling',STORY],['🎵 More styles',Object.keys(MOODS).filter(k=>!CREATOR.includes(k)&&!LIFE.includes(k)&&!TECH.includes(k)&&!STORY.includes(k))]];
const moodOpts=sel=>{const o=k=>`<option value="${k}"${k===sel?' selected':''}>🎵 ${enc(MOODS[k].name)} · ${MOODS[k].bpm} BPM</option>`;
  return GROUPS().map(([l,ks])=>`<optgroup label="${l}">${ks.filter(k=>MOODS[k]).map(o).join('')}</optgroup>`).join('')};
const TONES={maj:[0,4,7],min:[0,3,7],min7:[0,3,7,10],maj7:[0,4,7,11],m9:[0,3,7,10,14],dom7:[0,4,7,10],add9:[0,4,7,14],sus2:[0,2,7],sus4:[0,5,7],pow:[0,7,12],maj9:[0,4,7,11,14],dom9:[0,4,7,10,14],m6:[0,3,7,9],6:[0,4,7,9],m11:[0,3,7,10,17],'7sus4':[0,5,7,10]};
const hz=m=>440*Math.pow(2,(m-69)/12);
async function makeBeat(seconds,moodKey,opt={}){
  const M=MOODS[moodKey]||MOODS.bright,F=M.fx||{},SR=44100,len=Math.max(1,seconds),oc=new OfflineAudioContext(2,Math.ceil((len+.05)*SR),SR);
  const step=60/M.bpm/4,barLen=16*step,master=oc.createGain(),comp=oc.createDynamicsCompressor();
  // Whole-mix effects, only for styles that ask (F = M.fx): a dip around 1.8 kHz so a voice sits on top (mid), low-pass (lp),
  // the Before & After filter sweep (split), a bright top (bright) and tight compression (comp).
  let tail=master;const chain=n=>{tail.connect(n);tail=n};
  if(F.mid){const q=oc.createBiquadFilter();q.type='peaking';q.frequency.value=1800;q.Q.value=.8;q.gain.value=-F.mid;chain(q)}
  let sweep=null;if(F.lp||F.split){sweep=oc.createBiquadFilter();sweep.type='lowpass';sweep.frequency.value=F.lp||18000;sweep.Q.value=F.split?1.4:.5;chain(sweep)}
  if(F.bright){const q=oc.createBiquadFilter();q.type='highshelf';q.frequency.value=6000;q.gain.value=F.bright;chain(q)}
  if(F.lfoLp){const q=oc.createBiquadFilter(),o=oc.createOscillator(),d=oc.createGain(),{lo,hi,rate}=F.lfoLp;q.type='lowpass';q.Q.value=1.1;q.frequency.value=(lo+hi)/2;o.frequency.value=rate||.07;d.gain.value=(hi-lo)/2;o.connect(d);d.connect(q.frequency);o.start(0);o.stop(len+.05);chain(q)}
  if(F.hp){const q=oc.createBiquadFilter();q.type='highpass';q.frequency.value=F.hp;q.Q.value=.6;chain(q)}
  if(F.warm){const q=oc.createBiquadFilter();q.type='peaking';q.frequency.value=380;q.Q.value=.7;q.gain.value=F.warm;chain(q)}
  if(F.tape){const w=oc.createWaveShaper(),c=new Float32Array(1024),k=F.tape;for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}w.curve=c;const g=oc.createGain();g.gain.value=1.1/k;chain(w);chain(g)}
  if(F.swell){const g=oc.createGain(),o=oc.createOscillator(),d=oc.createGain();g.gain.value=1-F.swell/2;o.frequency.value=.11;d.gain.value=F.swell/2;o.connect(d);d.connect(g.gain);o.start(0);o.stop(len+.05);chain(g)}
  chain(comp);comp.connect(oc.destination);
  if(F.comp==='tight'){comp.threshold.value=-18;comp.knee.value=6;comp.ratio.value=8;comp.attack.value=.002;comp.release.value=.1}
  // opt.bare: no fade-in/out baked in (only 5 ms against clicks): a track made for the timeline fades with its own fadeIn/fadeOut instead.
  const vol=M.vol||.55;master.gain.setValueAtTime(0,0);if(opt.bare){master.gain.linearRampToValueAtTime(vol,.005);master.gain.setValueAtTime(vol,Math.max(.006,len-.02));master.gain.linearRampToValueAtTime(0,len)}
  else{master.gain.linearRampToValueAtTime(vol,F.noFade?.004:.3);master.gain.setValueAtTime(vol,Math.max(.31,len-1.8));master.gain.linearRampToValueAtTime(0,len)}
  const noise=oc.createBuffer(1,SR,SR),nd=noise.getChannelData(0);for(let i=0;i<SR;i++)nd[i]=Math.random()*2-1;
  // Music goes to bus (which pumps on the kick when F.pump), drums straight to master; reverb and dotted delay are sends.
  const bus=F.pump?oc.createGain():master;if(F.pump)bus.connect(master);
  let verb=null;if(F.reverb){const c=oc.createConvolver(),n=Math.ceil(F.reverb.sec*SR),ir=oc.createBuffer(2,n,SR);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(F.reverb.gate?(i<n*.85?.6:0):Math.pow(1-i/n,3))}
    c.buffer=ir;verb=oc.createGain();verb.gain.value=F.reverb.mix;verb.connect(c);c.connect(bus)}
  let dly=null;if(F.delay){const d=oc.createDelay(2),fb=oc.createGain(),lo=oc.createBiquadFilter(),mix=oc.createGain(),p=oc.createStereoPanner?oc.createStereoPanner():oc.createGain();
    d.delayTime.value=Math.min(1.9,step*(F.delay.steps||(F.delay.dotted?3:2)));fb.gain.value=F.delay.fb;lo.type='lowpass';lo.frequency.value=3500;mix.gain.value=F.delay.mix;if(p.pan)p.pan.value=-.35;
    dly=oc.createGain();dly.connect(d);d.connect(lo);lo.connect(fb);fb.connect(d);lo.connect(mix);mix.connect(p);p.connect(bus);
    if(F.delay.ping&&oc.createStereoPanner){const d2=oc.createDelay(2),p2=oc.createStereoPanner(),m2=oc.createGain();d2.delayTime.value=d.delayTime.value;p.pan.value=-.8;p2.pan.value=.8;m2.gain.value=F.delay.mix;lo.connect(d2);d2.connect(m2);m2.connect(p2);p2.connect(bus)}}
  let apan=null;if(F.autopan&&oc.createStereoPanner){apan=oc.createStereoPanner();const o=oc.createOscillator(),d=oc.createGain();o.frequency.value=.09;d.gain.value=F.autopan;o.connect(d);d.connect(apan.pan);o.start(0);o.stop(len+.05);apan.connect(bus)}
  const out=(node,pan=0,kind)=>{if(F.center&&kind!=='d')pan=0;let n=node;if(pan&&oc.createStereoPanner){let p=oc.createStereoPanner();p.pan.value=pan;node.connect(p);n=p}
    if(kind==='d'){n.connect(master);return}n.connect(kind==='l'&&apan?apan:bus);if(verb)n.connect(verb);if(dly&&kind==='l')n.connect(dly)};
  const outD=(node,pan=0)=>out(node,pan,'d');
  const lfo=(rate,depth)=>{const o=oc.createOscillator(),g=oc.createGain();o.frequency.value=rate;g.gain.value=depth;o.connect(g);o.start(0);o.stop(len+.05);return g};
  const wobL=F.wobble?lfo(F.wobble.rate||.55,F.wobble.cents||12):null,wob=o=>{if(wobL)wobL.connect(o.detune)};
  const chor=F.chorus?[lfo(.31,8),lfo(.31,-8)]:null;
  let shaper=null;if(F.sat){shaper=oc.createWaveShaper();const c=new Float32Array(1024),k=F.sat;for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}shaper.curve=c;const sg=oc.createGain();sg.gain.value=1.2/k;shaper.connect(sg);out(sg)}
  const outB=g=>{if(shaper)g.connect(shaper);else out(g)};
  const env=(g,t,peak,att,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+att+dec)};
  // A noise swell (risers before a drop or every 4 bars) and a soft crash.
  const riser=(t,d,v,dest)=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;s.loop=true;f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(700,t);f.frequency.exponentialRampToValueAtTime(7000,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+d);g.gain.linearRampToValueAtTime(0,t+d+.03);s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+d+.05)};
  const crash=(t,dest)=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;s.loop=true;f.type='highpass';f.frequency.value=5000;env(g,t,.12,.002,1.4);s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+1.5)};
  const kick=t=>{let o=oc.createOscillator(),g=oc.createGain(),d=M.boom?.7:.35;o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(M.boom?40:45,t+.12);env(g,t,.9,.003,d);o.connect(g);outD(g);o.start(t);o.stop(t+d+.05);
    if(F.pump){const b=bus.gain;b.setValueAtTime(1,t);b.linearRampToValueAtTime(1-F.pump,t+.012);b.linearRampToValueAtTime(1,t+step*3)}};
  const clap=t=>{for(let k=0;k<3;k++){let u=t+k*.011,s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=1500;f.Q.value=.9;env(g,u,k===2?.4:.22,.001,k===2?.16:.02);s.connect(f);f.connect(g);outD(g,F.wide?(k-1)*.3:0);s.start(u,Math.random()*.5);s.stop(u+.2)}};
  const rim=t=>{let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain();o.type='square';o.frequency.value=1700;f.type='highpass';f.frequency.value=900;env(g,t,.09,.001,.03);o.connect(f);f.connect(g);outD(g,-.2);o.start(t);o.stop(t+.05)};
  const snare=t=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=1300;env(g,t,.32,.002,.18);s.connect(f);f.connect(g);outD(g);s.start(t,Math.random()*.5);s.stop(t+.22);
    let o=oc.createOscillator(),g2=oc.createGain();o.type='triangle';o.frequency.value=190;env(g2,t,.18,.002,.09);o.connect(g2);outD(g2);o.start(t);o.stop(t+.12)};
  const hat=(t,open)=>{if(F.metal)return metal(t,open);let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=7500;env(g,t,open?.09:.07,.001,open?.22:.045);s.connect(f);f.connect(g);outD(g,.25);s.start(t,Math.random()*.5);s.stop(t+(open?.26:.06))};
  // 808-style metallic hat: six square waves at clashing pitches, high-passed.
  const metal=(t,open)=>{let f=oc.createBiquadFilter(),h=oc.createBiquadFilter(),g=oc.createGain(),d=open?.25:.05;f.type='bandpass';f.frequency.value=10000;h.type='highpass';h.frequency.value=7000;env(g,t,open?.06:.05,.001,d);f.connect(h);h.connect(g);outD(g,.25);
    for(const r of [205.3,304.4,369.6,522.7,540,800]){let o=oc.createOscillator();o.type='square';o.frequency.value=r*1.7;o.connect(f);o.start(t);o.stop(t+d+.02)}};
  // Finger snap: a tight crack of noise.
  const snap=t=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=2900;f.Q.value=2.2;env(g,t,.42,.0008,.035);s.connect(f);f.connect(g);outD(g,-.15);s.start(t,Math.random()*.5);s.stop(t+.06)};
  // Ticking clock (tick-tock) and a soft shaker.
  const tick=(t,hi)=>{let o=oc.createOscillator(),g=oc.createGain();o.type='sine';o.frequency.value=hi?2900:2100;env(g,t,hi?.07:.05,.0005,.022);o.connect(g);outD(g,hi?.35:-.35);o.start(t);o.stop(t+.04)};
  const shaker=t=>{let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=6000;f.Q.value=1.2;env(g,t,.06,.012,.05);s.connect(f);f.connect(g);outD(g,.4);s.start(t,Math.random()*.5);s.stop(t+.08)};
  const bass=(t,m,d)=>{if(M.bass==='sub'){let o=oc.createOscillator(),g=oc.createGain();o.type='sine';o.frequency.setValueAtTime(hz(m+12),t);o.frequency.exponentialRampToValueAtTime(hz(m),t+.06);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.01);g.gain.setValueAtTime(.3,t+d*.6);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);outB(g);o.start(t);o.stop(t+d+.02);return}
    let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain();o.type=M.bass==='pluck'?'square':'sawtooth';o.frequency.value=hz(m);if(F.bassBP){f.type='bandpass';f.frequency.value=F.bassBP;f.Q.value=4}else{f.type='lowpass';f.frequency.value=M.bass==='pluck'?600:380}if(M.bass==='pluck')d=Math.min(d,.22);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.28,t+.01);g.gain.setValueAtTime(.28,t+d*.7);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(f);f.connect(g);outB(g);o.start(t);o.stop(t+d+.02)};
  // Pads: padHP takes out the low-mids under a voice, padAtt gives slow velvety swells, chorus splits them wide left/right with a slow wobble.
  const pad=(t,notes,d)=>{const pv=.045*(M.padVol||1),att=F.padAtt?Math.min(F.padAtt,d*.45):.35,rel=F.padAtt?Math.min(F.padAtt,d*.45):.3;
    for(const [pan,dets,ci] of chor?[[-.7,[-9,-3],0],[.7,[3,9],1]]:[[0,[-7,7]]]){let f=oc.createBiquadFilter(),g=oc.createGain(),head=f;f.type='lowpass';f.frequency.value=M.pad;
      if(F.padHP){head=oc.createBiquadFilter();head.type='highpass';head.frequency.value=F.padHP;head.connect(f)}
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(pv,t+att);g.gain.setValueAtTime(pv,t+d-rel);g.gain.exponentialRampToValueAtTime(0.0001,t+d);f.connect(g);out(g,pan);
      for(let m of notes)for(let det of dets){let o=oc.createOscillator();o.type=M.padType||'sawtooth';o.frequency.value=hz(m);o.detune.value=det;if(chor)chor[ci].connect(o.detune);wob(o);o.connect(head);o.start(t);o.stop(t+d+.05)}}};
  // One note in the style's lead sound. amp scales it (the arpeggio plays softer under a tune); d = how long it's held.
  const strings=new Map(),string=(m,dur)=>{const k=m+':'+dur;if(strings.has(k))return strings.get(k);const n=Math.round(SR/hz(m)),len=Math.ceil(dur*SR),b=oc.createBuffer(1,len,SR),x=b.getChannelData(0),ring=new Float32Array(n);
    for(let i=0;i<n;i++)ring[i]=Math.random()*2-1;for(let i=0;i<len;i++){const j=i%n,v=ring[j];x[i]=v;ring[j]=.996*.5*(v+ring[(j+1)%n])}strings.set(k,b);return b};
  const partials=(t,m,pan,amp,list,att=.002)=>{for(const [r,v,dd] of list){let o=oc.createOscillator(),g=oc.createGain();o.type='sine';o.frequency.value=hz(m)*r;wob(o);env(g,t,v*amp,att,dd);o.connect(g);out(g,pan,'l');o.start(t);o.stop(t+att+dd+.05)}};
  const pluck=(t,m,pan,amp=1,d=0,L=M.lead)=>{if(L==='bell'){for(const [r,v,dc] of [[1,.06,.5],[3.5,.018,.18]]){let o=oc.createOscillator(),g=oc.createGain(),dd=Math.max(dc,d*(r===1?1:.4));o.type='sine';o.frequency.value=hz(m)*r;env(g,t,v*amp,.002,dd);o.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.05)}return}
    if(L==='marimba')return partials(t,m,pan,amp,[[1,.1,.42],[3.93,.025,.07],[9.2,.006,.02]]);
    if(L==='glass'){const f0=hz(m),dd=Math.min(1.4,.5+d),c=oc.createOscillator(),md=oc.createOscillator(),mg=oc.createGain(),g=oc.createGain();c.type=md.type='sine';c.frequency.value=f0;md.frequency.value=f0*3.5;
      mg.gain.setValueAtTime(f0*.9,t);mg.gain.exponentialRampToValueAtTime(f0*.05,t+.25);md.connect(mg);mg.connect(c.frequency);env(g,t,.06*amp,.003,dd);c.connect(g);out(g,pan,'l');c.start(t);md.start(t);c.stop(t+dd+.05);md.stop(t+dd+.05);return}
    if(L==='quirk'){let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain(),v=oc.createOscillator(),vd=oc.createGain(),dd=Math.max(.2,d);o.type='square';o.frequency.setValueAtTime(hz(m+1.5),t);o.frequency.exponentialRampToValueAtTime(hz(m),t+.07);
      v.frequency.value=5.5;vd.gain.setValueAtTime(0,t);vd.gain.linearRampToValueAtTime(18,t+dd);v.connect(vd);vd.connect(o.detune);f.type='lowpass';f.frequency.value=2200;env(g,t,.045*amp,.004,dd);o.connect(f);f.connect(g);out(g,pan,'l');o.start(t);v.start(t);o.stop(t+dd+.05);v.stop(t+dd+.05);return}
    if(L==='musicbox')return partials(t,m,pan,amp,[[1,.075,Math.max(1,d)],[3.98,.02,.25],[6.2,.008,.08]],.001);
    if(L==='stacc'){let f=oc.createBiquadFilter(),g=oc.createGain(),dd=.09;f.type='lowpass';f.Q.value=1.5;f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(900,t+dd);env(g,t,.05*amp,.002,dd);f.connect(g);out(g,pan,'l');
      for(const det of [-6,6]){let o=oc.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+dd+.05)}return}
    if(L==='felt')return partials(t,m,pan,amp,[[1,.09,Math.min(2.4,.9+d)],[2,.016,.7],[3,.005,.3]],.018);
    if(L==='glock')return partials(t,m,pan,amp,[[1,.075,Math.max(.7,d)],[2.76,.026,.3],[5.4,.012,.11]],.001);
    if(L==='pizz'){let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain(),dd=.2;o.type='triangle';o.frequency.setValueAtTime(hz(m-3),t);o.frequency.exponentialRampToValueAtTime(hz(m),t+.05);f.type='lowpass';f.frequency.value=2600;
      env(g,t,.2*amp,.002,dd);o.connect(f);f.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.05);return}
    if(L==='bow'){const dd=Math.max(.6,d),f=oc.createBiquadFilter(),g=oc.createGain();f.type='lowpass';f.frequency.value=1700;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.03*amp,t+.28);g.gain.setValueAtTime(.03*amp,t+dd);g.gain.exponentialRampToValueAtTime(0.0001,t+dd+.5);f.connect(g);out(g,pan,'l');
      for(const det of [-8,8]){let o=oc.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det;wob(o);if(chor)chor[det<0?0:1].connect(o.detune);o.connect(f);o.start(t);o.stop(t+dd+.55)}return}
    if(L==='kalimba')return partials(t,m,pan,amp,[[1,.085,F.short?.22:Math.max(.8,d)],[5.95,.014,.06],[11.8,.004,.015]]);
    if(L==='chime')return partials(t,m,pan,amp,[[1,.05,2.4],[2.76,.016,1.2],[5.4,.006,.5]],.02);
    if(L==='rhodes'){const f0=hz(m),dd=Math.min(2.2,.8+d),c=oc.createOscillator(),md=oc.createOscillator(),mg=oc.createGain(),g=oc.createGain();c.type=md.type='sine';c.frequency.value=f0;md.frequency.value=f0;
      mg.gain.setValueAtTime(f0*1.3,t);mg.gain.exponentialRampToValueAtTime(f0*.08,t+.5);md.connect(mg);mg.connect(c.frequency);wob(c);env(g,t,.075*amp,.005,dd);c.connect(g);out(g,pan,'l');c.start(t);md.start(t);c.stop(t+dd+.05);md.stop(t+dd+.05);
      partials(t,m,pan,amp,[[7,.006,.09]]);return}
    if(L==='pluck'){let o=oc.createOscillator(),f=oc.createBiquadFilter(),g=oc.createGain(),dd=Math.min(.16,.08+d*.3);o.type='sawtooth';o.frequency.value=hz(m);f.type='lowpass';f.Q.value=3;f.frequency.setValueAtTime(4200,t);f.frequency.exponentialRampToValueAtTime(500,t+dd);
      env(g,t,.06*amp,.002,dd);o.connect(f);f.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.05);return}
    if(L==='piano'){const dd=Math.min(2.2,.5+d*1.2);for(const [r,v] of [[1,.07],[2,.03],[3,.014],[4,.007]]){let o=oc.createOscillator(),g=oc.createGain();o.type='sine';o.frequency.value=hz(m)*r;o.detune.value=r*1.5;env(g,t,v*amp,.004,dd/r**.5);o.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.05)}return}
    if(L==='guitar'){const dd=Math.round(Math.min(2,.7+d)*10)/10,s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=string(m,dd);f.type='lowpass';f.frequency.value=3200;g.gain.value=.22*amp;s.connect(f);f.connect(g);out(g,pan,'l');s.start(t);return}
    let o=oc.createOscillator(),g=oc.createGain();o.type=L==='square'?'square':L==='sine'?'sine':'triangle';if(L==='square'){const dd=Math.max(.18,d);env(g,t,.035*amp,.004,dd);o.frequency.value=hz(m);o.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.06);return}const dd=Math.max(.26,d);o.frequency.value=hz(m);env(g,t,.075*amp,.004,dd);o.connect(g);out(g,pan,'l');o.start(t);o.stop(t+dd+.06)};
  // Chord stabs: in the lead sound (stabType 'lead') or a short bold synth hit.
  const stab=(t,notes)=>{if(M.stabType==='lead'){notes.forEach((m,i)=>pluck(t+i*.012,m+12,(i%2?-.25:.25),.5,step*2,M.stabLead||M.lead));return}
    let f=oc.createBiquadFilter(),g=oc.createGain();f.type='lowpass';f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(700,t+.15);env(g,t,.05,.003,.16);f.connect(g);out(g);
    for(const m of notes)for(const det of [-10,10]){let o=oc.createOscillator();o.type='sawtooth';o.frequency.value=hz(m+12);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+.22)}};
  if(F.crackle){const n=2*SR,b=oc.createBuffer(1,n,SR),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=(Math.random()<.0007?(Math.random()*2-1)*.8:0)+(Math.random()*2-1)*.01;
    let s=oc.createBufferSource(),f=oc.createBiquadFilter(),g=oc.createGain();s.buffer=b;s.loop=true;f.type='highpass';f.frequency.value=900;g.gain.value=.22*F.crackle;s.connect(f);f.connect(g);g.connect(master);s.start(0);s.stop(len)}
  // Before & After: the first few bars are only pads and the tune behind a closed filter, then it opens wide at the drop.
  const dropBar=F.split?(opt.dropAt>0?Math.max(1,Math.round(opt.dropAt/barLen)):Math.max(1,Math.min(4,Math.round(len*F.split/barLen)))):0,dropT=dropBar*barLen;
  if(F.split&&dropT<len){sweep.frequency.setValueAtTime(320,0);sweep.frequency.exponentialRampToValueAtTime(1500,Math.max(.1,dropT-.03));sweep.frequency.exponentialRampToValueAtTime(18000,dropT+.3);
    riser(Math.max(0,dropT-barLen),Math.min(barLen,dropT),.06,comp);crash(dropT,comp)}
  const endT=M.ending&&len>5?len-2.6:Infinity;
  if(endT<Infinity){const [r,q]=M.endChord,tn=TONES[q].map(x=>r+x);pad(endT,tn,2.6);tn.forEach((m,i)=>pluck(endT+i*.02,m+12,i%2?-.2:.2,.8,1.6,M.endLead||M.lead));crash(endT,bus);kick(endT)}
  const cb=M.chordBars||1,drums=M.drums!==false,order=M.melOrder||[0,0,1,0],mo=M.melOct??12;let side=0;
  for(let bar=0;bar*barLen<len;bar++){let t0=bar*barLen,[root,q]=M.chords[Math.floor(bar/cb)%M.chords.length],tones=TONES[q].map(x=>root+x),L=tones.length,full=bar>=dropBar,early=bar>0||!drums||M.fromStart,lay=k=>!M.layers||bar>=(M.layers[k]||0),cyc=bar%4,hit=!M.build||(cyc===0&&bar>0);
    if(M.build&&cyc===0&&bar>0)crash(t0,bus);if(M.build&&cyc===3)riser(t0,barLen,.05,bus);
    if(t0>=endT)break;
    if(bar%cb===0)pad(t0,tones,Math.min(barLen*cb,endT-t0+.25));
    if(F.rise&&bar%4===3&&full)riser(t0,barLen,.035,bus);
    for(let s=0;s<16;s++){let t=t0+s*step+(M.swing&&s%2?M.swing*step*2:0);if(t>=len||t>=endT)break;
      if(M.build&&!(cyc===0&&bar>0)&&s%[4,2,1,1][cyc]===0)tick(t,s%4===0);
      if(drums&&full&&lay('drums')&&hit){if(M.kick.includes(s))kick(t);if(M.snare.includes(s))snare(t);if(M.clap?.includes(s))clap(t);if(M.rim?.includes(s))rim(t);if(M.shaker?.includes(s))shaker(t);if(M.snap?.includes(s))snap(t);if(M.tick?.includes(s))tick(t,s%4===0);
        if(M.hats>0&&s%M.hats===0){if(M.roll?.includes(s))for(let k=0;k<3;k++)hat(t+k*step/3,false);else hat(t,false)}if(M.open?.includes(s))hat(t,true)}
      if(M.stab?.includes(s)&&full&&lay('stab'))stab(t,tones);
      if(M.bass!=='none'&&full&&lay('bass')){if(M.bassPat){const bi=M.bassPat.indexOf(s);if(bi>=0){let nx=M.bassPat[bi+1]??16;bass(t,root-24+(M.bassNotes?M.bassNotes[bi]:s===14&&M.bass!=='sub'?7:0),step*(nx-s)*.95)}}
        else if(s%4===0||(s%4===3&&M.bpm>100))bass(t,root-24+(s===14?7:0),step*(s%4===0?2.6:.9))}
      const arpAmp=M.arpAmp||(M.mel?.45:1);
      if(M.arpPat){const tok=M.arpPat[s];if(early&&lay('arp')&&tok!=='.'){const k=+tok;pluck(t,tones[k%L]+12*Math.floor(k/L)+12,F.wide?(k%2?-F.wide:F.wide):(k%2?-.3:.3),arpAmp)}}
      else if(s%M.arp===0&&early){let k=(s/M.arp)%(L+1);pluck(t,tones[k%L]+12+(k>=L?12:0),F.wide?(k%2?-F.wide:F.wide):(k%2?-.3:.3),arpAmp)}
      // The tune: from the second bar (the first is an intro; fromStart = straight away), phrases A A B A unless melOrder says otherwise.
      if(M.resp&&(bar>0||M.fromStart)){const ph=M.resp[bar%M.resp.length],tok=ph[s];if(tok!=null&&tok!=='.'&&tok!=='-'){let v=+tok,hold=1;while(ph[s+hold]==='-')hold++;pluck(t,tones[((v%L)+L)%L]+12*Math.floor(v/L)+mo,F.call||.6,M.melAmp||1.15,hold*step,M.respLead||M.lead)}}
      if(M.mel&&lay('mel')&&(bar>0||M.fromStart)){const ph=M.mel[order[bar%order.length]],tok=ph[s];if(tok!=null&&tok!=='.'&&tok!=='-'){let v=+tok,hold=1;while(ph[s+hold]==='-')hold++;const note=tones[((v%L)+L)%L]+12*Math.floor(v/L)+mo;pluck(t,note,F.call?-F.call:F.pan?(side++%2?-F.pan:F.pan):0,M.melAmp||1.15,hold*step,M.melLead||M.lead)}}}}
  const buf=await oc.startRendering();return new File([wav(buf)],`TapShopUGC beat · ${M.name} ${M.bpm} BPM.wav`,{type:'audio/wav'})}

function wav(buf){const ch=buf.numberOfChannels,n=buf.length,out=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)out.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');out.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,ch,true);out.setUint32(24,buf.sampleRate,true);out.setUint32(28,buf.sampleRate*ch*2,true);out.setUint16(32,ch*2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*ch*2,true);
  const data=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){let v=Math.max(-1,Math.min(1,data[c][i]));out.setInt16(o,v<0?v*0x8000:v*0x7fff,true);o+=2}
  return out.buffer}

// ---------- the AI that looks and listens (in a worker, so the page stays smooth) ----------
const WORKER=`let see=null,hear=null;
self.onmessage=async e=>{const m=e.data;try{
  const T=await import('${LIB}');T.env.allowLocalModels=false;
  const prog=p=>{if(p.status==='progress'&&p.total)self.postMessage({type:'dl',file:p.file,loaded:p.loaded,total:p.total})};
  if(m.task==='see'){
    if(!see)see=await T.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8',progress_callback:prog});
    const out=[];for(const img of m.images)out.push(await see(img,m.labels));self.postMessage({type:'done',id:m.id,result:out});
  }else{
    if(!hear){let err;for(const model of ['onnx-community/whisper-tiny_timestamped','Xenova/whisper-tiny']){try{hear=await T.pipeline('automatic-speech-recognition',model,{dtype:'q8',progress_callback:prog});break}catch(x){err=x}}if(!hear)throw err}
    const r=await hear(m.audio,{return_timestamps:true});self.postMessage({type:'done',id:m.id,result:{text:r.text||'',chunks:(r.chunks||[]).map(c=>({text:c.text,ts:c.timestamp}))}});
  }}catch(x){self.postMessage({type:'error',id:m.id,message:String(x&&x.message||x)})}};`;
let worker=null,askN=0;
function ask(msg,onDl,transfer){return new Promise((res,rej)=>{if(!worker)worker=new Worker(URL.createObjectURL(new Blob([WORKER],{type:'text/javascript'})),{type:'module'});
  const id=++askN;worker.onmessage=e=>{let m=e.data;if(m.type==='dl')onDl?.(m);else if(m.id!==id)return;else if(m.type==='done')res(m.result);else rej(Error(m.message))};
  worker.onerror=e=>rej(Error(e.message||'The clip reader could not start.'));worker.postMessage({...msg,id},transfer||[])})}
function stopWorker(){worker?.terminate();worker=null}
// The same clip reader for other makers (Build My Video sorts clips into scenes with it): see(images, labels) →
// per image a list of {label, score}; hear(audio 16 kHz mono) → {text, chunks}; frames(url, seconds) → 3 small JPEGs.
window.veClipReader={see:(images,labels,onDl)=>ask({task:'see',images,labels},onDl),hear:(audio,onDl)=>ask({task:'hear',audio},onDl,[audio.buffer]),
  frames:(url,secs)=>frames({asset:{url,name:'clip'},in:0,out:secs}),stop:stopWorker};

// Three small pictures from inside the clip (a separate <video>, so the editor's own players aren't moved).
async function frames(src){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=src.asset.url;
  await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=()=>j(Error('Can’t read '+src.asset.name))});
  const out=[],len=src.out-src.in;for(const f of [.2,.5,.8]){await new Promise(r=>{let t=setTimeout(r,3000);v.onseeked=()=>{clearTimeout(t);r()};v.currentTime=src.in+len*f});
    let s=Math.min(1,320/Math.max(v.videoWidth||320,v.videoHeight||320)),c=document.createElement('canvas');c.width=Math.max(1,Math.round((v.videoWidth||320)*s));c.height=Math.max(1,Math.round((v.videoHeight||180)*s));
    c.getContext('2d').drawImage(v,0,0,c.width,c.height);out.push(c.toDataURL('image/jpeg',.82))}
  v.removeAttribute('src');v.load();return out}
// The clip's sound at 16 kHz mono, at most the first 28 seconds.
async function sound(src){let buf;try{buf=await new OfflineAudioContext(1,1,16000).decodeAudioData(await src.asset.file.arrayBuffer())}catch{return null}
  if(buf.sampleRate!==16000){let oc=new OfflineAudioContext(1,Math.ceil(buf.duration*16000),16000),s=oc.createBufferSource();s.buffer=buf;s.connect(oc.destination);s.start();buf=await oc.startRendering()}
  let a=Math.floor(src.in*16000),b=Math.min(buf.length,Math.ceil(Math.min(src.out,src.in+28)*16000)),mono=new Float32Array(Math.max(0,b-a));
  for(let ch=0;ch<buf.numberOfChannels;ch++){let d=buf.getChannelData(ch);for(let i=0;i<mono.length;i++)mono[i]+=d[a+i]/buf.numberOfChannels}
  let e=0;for(let i=0;i<mono.length;i+=8)e+=mono[i]*mono[i];return e/(mono.length/8||1)>1e-5?mono:null}

// ---------- matching clips to parts ----------
function scores(clip,tp){const n=tp.parts.length;return tp.parts.map((p,j)=>{let wsum=0,v=0;for(const [k,w] of Object.entries(p.look)){let i=LOOKS.findIndex(x=>x[0]===k);if(i<0)continue;v+=w*(clip.seen?.[i]||0);wsum+=w}
  let s=wsum?v/wsum*LOOKS.length/3:0;if(clip.words&&p.say.test(clip.words))s+=.35;if(clip.talking&&(p.id==='hook'||p.id==='cta'))s+=.12;
  // A small nudge towards the order the clips were added, so close calls keep the creator's order.
  s-=.12*Math.abs((clip.n/Math.max(1,clip.of-1))-(j/Math.max(1,n-1)));return s})}
function arrange(list,tp){const n=tp.parts.length,parts=tp.parts.map(()=>[]),sc=list.map(c=>scores(c,tp)),used=new Set(),filled=new Set();
  const pairs=[];sc.forEach((row,i)=>row.forEach((s,j)=>pairs.push([s,i,j])));pairs.sort((a,b)=>b[0]-a[0]);
  for(const [,i,j] of pairs){if(used.has(i)||filled.has(j))continue;parts[j].push(list[i]);used.add(i);filled.add(j);if(filled.size===n||used.size===list.length)break}
  list.forEach((c,i)=>{if(used.has(i))return;let j=sc[i].indexOf(Math.max(...sc[i]));parts[j].push(c)});
  parts.forEach(p=>p.sort((a,b)=>a.n-b.n));return parts}

// ---------- the dialog ----------
const dlg=document.createElement('dialog');dlg.id='brDialog';dlg.className='closable';document.body.appendChild(dlg);
const st=document.createElement('style');st.textContent=`
#brDialog{width:min(720px,calc(100vw - 20px));max-height:calc(100dvh - 20px)}
#brDialog h3{margin:16px 0 6px;font-size:14px}
.br-tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.br-tpl{text-align:left;padding:10px 12px!important;border-radius:12px!important;white-space:normal;line-height:1.3}
.br-tpl b{display:block;font-size:13px}.br-tpl small{display:block;font-size:11px;opacity:.7;margin-top:3px}.br-tpl .br-flow{display:block;font-size:10px;opacity:.6;margin-top:5px}
.br-tpl.on{outline:2px solid #ff3ea5;outline-offset:1px}
.br-add{display:flex;flex-wrap:wrap;gap:6px}
.br-clips{display:flex;gap:8px;overflow-x:auto;padding:8px 0 4px;min-height:24px}
.br-clip{position:relative;flex:none;width:112px;font-size:10px;line-height:1.25}
.br-clip img{display:block;width:112px;height:63px;object-fit:cover;border-radius:8px;background:#0003}
.br-clip .x{position:absolute;top:3px;right:3px;width:22px;height:22px;padding:0!important;border-radius:50%!important;font-size:13px;line-height:1;display:grid;place-items:center}
.br-clip .nm{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;font-weight:600}
.br-clip .tag{display:block;opacity:.75;margin-top:2px}.br-clip .said{display:block;font-style:italic;opacity:.65;margin-top:2px;max-height:2.6em;overflow:hidden}
.br-clip select{width:100%;margin-top:4px;font-size:11px;padding:3px 4px}
.br-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.br-caps{display:flex;gap:10px;align-items:flex-start;margin:12px 0 4px;padding:10px 12px;border:1px solid var(--ts-border,#8a7aa855);border-radius:12px;cursor:pointer}
.br-sec{margin:14px 0;padding:14px;border:1px solid var(--ts-border,#8a7aa855);border-radius:16px;background:#8881}
#brDialog .br-sec>h3{display:flex;align-items:center;gap:10px;margin:0 0 12px;font-size:16px}
.br-n{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#ff3ea5;color:#fff;font-size:14px;font-weight:800}
.br-sub{margin:-6px 0 10px}
.br-helpers{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px}
.br-helpers .br-caps{margin:0;align-items:center;background:#8881}
.br-helpers .br-caps:has(input:checked){border-color:#ff3ea5;background:#ff3ea514}
.br-helpers .br-caps input{appearance:none;-webkit-appearance:none;order:2;margin:0 0 0 auto;width:40px;height:24px;border-radius:99px;background:#8886;position:relative;cursor:pointer;transition:background .2s}
.br-helpers .br-caps input::before{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0005;transition:transform .2s}
.br-helpers .br-caps input:checked{background:#ff3ea5}
.br-helpers .br-caps input:checked::before{transform:translateX(16px)}
.br-note{font-size:12px;margin:8px 2px}.br-caps input{width:20px;height:20px;margin:2px 0 0;flex:none;accent-color:#ff3ea5}.br-caps b{display:block;font-size:13px}.br-caps small{display:block;font-size:12px;opacity:.75;margin-top:2px}#brListen{grid-column:1/-1;justify-self:end}.br-row label{display:flex;flex-direction:column;gap:4px;font-size:12px}
.br-sec{border:1px solid var(--ts-border,#8883);border-radius:12px;padding:10px;margin:8px 0}
.br-sec-h{display:flex;align-items:center;gap:8px}.br-sec-h b{font-size:13px;white-space:nowrap}.br-sec-h input{flex:1;min-width:0;font-size:13px;padding:6px 8px}
.br-sec .br-empty{font-size:11px;opacity:.6;padding:6px 0}
#brWork progress{width:100%}
.br-mo{margin:10px 0 2px;padding:10px 12px;border:1px solid var(--ts-border,#8a7aa855);border-radius:12px;font-size:12px;line-height:1.4}.br-mo p{margin:4px 0}
.br-mo.check{border-color:#f5b301;background:#f5b30112}.br-mo.locked{border-color:#22c55e;background:#22c55e14}
.br-mo-h{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline}.br-mo-h b{font-size:13px}.br-mo-h span{opacity:.8}
.br-mo.check .br-mo-h b{color:#b77d00}html.ts-dark .br-mo.check .br-mo-h b{color:#f5b301}.br-mo.locked .br-mo-h b{color:#16a34a}
.br-mo-note{opacity:.75}.br-mo-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.br-mo select{margin-top:6px;width:100%;font-size:12px}
.br-pv{margin:8px 0;padding:8px;border-radius:12px;background:#000}.br-pv video{display:block;width:100%;max-height:42vh;border-radius:8px;background:#000}.br-pv p{color:#fff;margin:6px 2px 0}
.br-fast{margin:8px 0}`;document.head.appendChild(st);

let tp=TEMPLATES[0],mood='auto',shape='9:16',items=[],parts=null,texts={},busy=false,stopped=false,autoStory=true,picked='';let fast=false;
// Auto captions (✨ Captions without its dialog) after building, remembered on this device; on unless turned off.
let autoCaps=(()=>{try{return localStorage.getItem('tapshop-broll-captions')!=='off'}catch{return true}})();
// Tidy talking clips: cut pauses over half a second and um/uh, using the captions engine's word times. On unless turned off.
let autoTidy=(()=>{try{return localStorage.getItem('tapshop-broll-tidy')!=='off'}catch{return true}})();
// Movement: zooms, pans, cut effects and small bumps on the beat (clip motion/intro/pulse in video.js). On unless turned off.
// Cloud AI (Groq, see video-captions.js veCloudWords): more accurate words, keeps "um"s so they can be cut, and finds
// fumbles and retakes. Only offered when config.js switches it on; falls back to the on-device AI on any problem.
// Clean sound (video-cleansound.js): fan/AC noise out, record start/stop clicks muted. On unless turned off.
let autoClean=(()=>{try{return localStorage.getItem('tapshop-broll-clean')!=='off'}catch{return true}})();
let autoCloud=(()=>{try{return localStorage.getItem('tapshop-broll-cloud')!=='off'}catch{return true}})();
let autoMove=(()=>{try{return localStorage.getItem('tapshop-broll-motion')!=='off'}catch{return true}})();
let autoSfx=(()=>{try{return localStorage.getItem('tapshop-broll-sfx')!=='off'}catch{return true}})();
const shapes=()=>[...($$('aspect')?.options||[])].map(o=>[o.value,o.textContent]);
// From the start screen the chosen platform has already set the shape; otherwise UGC defaults to vertical.
function open(fromStart){if(exporting)return;stopped=false;parts=null;let a=$$('aspect')?.value;shape=(fromStart===true||clips.length)&&['9:16','1:1','4:5','16:9'].includes(a)?a:'9:16';if(!items.length&&clips.length)useTimeline(true);step1();dlg.showModal()}
function close(){stopped=true;if(busy)stopWorker();busy=false;dlg.close()}
dlg.addEventListener('cancel',e=>{e.preventDefault();close()});

function step1(){const flow=t=>t.parts.map(p=>p.label).join(' → ');
  dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎞️ B-roll Video Maker</h2>
  <p class="sub">Add your clips and we do the rest: we watch and listen to each clip, pick the story and music, use the best moment of each clip, write words on screen from what you say, and cut it all to the beat with movement.</p>
  <section class="br-sec"><h3><span class="br-n">1</span>Pick a story</h3><div class="br-tpls"><button type="button" class="br-tpl br-auto${autoStory?' on':''}" data-t="auto"><b>✨ Pick for me</b><small>We look at your clips and choose the best story</small><span class="br-flow">Works best with ✨ Sort my clips</span></button>${TEMPLATES.map(t=>`<button type="button" class="br-tpl${!autoStory&&t===tp?' on':''}" data-t="${t.id}"><b>${enc(t.name)}</b><small>${enc(t.tag)}</small><span class="br-flow">${enc(flow(t))}</span></button>`).join('')}</div>
</section>
  <section class="br-sec"><h3><span class="br-n">2</span>Add your clips <small class="sub">(${items.length})</small></h3>
  <div class="br-add"><button type="button" class="primary" id="brChoose">📹 Choose clips</button>${typeof VaultPicker!=='undefined'&&VaultPicker.inTapShop?'<button type="button" id="brVault">⛁ From Media Vault</button>':''}${clips.length?`<button type="button" id="brTimeline">🎬 Use my timeline clips (${clips.length})</button>`:''}<input type="file" id="brFiles" accept="video/*" multiple hidden></div>
  <div class="br-clips">${items.length?items.map((c,i)=>`<div class="br-clip"><img alt="" src="${c.asset.thumb}"><button type="button" class="x" data-x="${i}" aria-label="Remove ${enc(c.asset.name)}">×</button><span class="nm">${enc(c.asset.name)}</span><span class="tag">${(c.out-c.in).toFixed(1)}s</span></div>`).join(''):'<p class="sub" style="margin:0">No clips yet. Add 3 or more for the best result.</p>'}</div>
</section>
  <section class="br-sec"><h3><span class="br-n">3</span>Look and sound</h3><div class="br-row"><label>Video shape<select id="brShape">${shapes().map(([v,l])=>`<option value="${enc(v)}"${v===shape?' selected':''}>${enc(l)}</option>`).join('')}</select></label>
  <label>Music<select id="brMood"><option value="auto"${mood==='auto'?' selected':''}>✨ Pick for me</option>${moodOpts(mood)}<option value=""${mood?'':' selected'}>No music</option></select></label><button type="button" id="brListen" title="Hear a few seconds of this music">▶ Listen</button></div></section>
  <section class="br-sec"><h3><span class="br-n">4</span>Smart edits</h3><p class="sub br-sub">We do these for you while we build. Turn off any you don't want.</p><div class="br-helpers">
  <label class="br-caps"><input type="checkbox" id="brCaps"${autoCaps?' checked':''}> <span><b>✨ Add captions when someone talks</b><small>We write the words people say on screen, like the ✨ Captions tool.</small></span></label>
  <label class="br-caps"><input type="checkbox" id="brTidy"${autoTidy?' checked':''}> <span><b>✂️ Cut pauses and “um”s</b><small>We remove long pauses and “um” / “uh” from talking clips, so they flow.</small></span></label>
  <label class="br-caps"><input type="checkbox" id="brClean"${autoClean?' checked':''}> <span><b>🔇 Clean up the sound</b><small>We take out steady background noise like a fan or AC, and the click when you start and stop recording.</small></span></label>
  ${window.veCloudOn?.()?`<label class="br-caps"><input type="checkbox" id="brCloud"${autoCloud?' checked':''}> <span><b>☁️ Use cloud AI (more accurate)</b><small>Better captions, and it also cuts fumbles and retakes. The sound of your talking clips is sent to Groq’s AI to be written down. Turn off to keep everything on this device.</small></span></label>`:''}
  <label class="br-caps"><input type="checkbox" id="brMove"${autoMove?' checked':''}> <span><b>🎬 Add slow, smooth zooms</b><small>A slow, gentle zoom on each clip so still shots feel alive. Cuts still land on the beat.</small></span></label>
  <label class="br-caps"><input type="checkbox" id="brSfx"${autoSfx?' checked':''}> <span><b>🔊 Add sound effects</b><small>A sound as each line of words pops up: a whoosh on the hook, a ding on the fix, a sparkle on the “after”, a tap on “link in bio”.</small></span></label>
  </div></section>
  <p class="sub br-note">The first time, your browser downloads the clip reader (a one-time download, about 130 MB). After that it’s saved. Phones are slower than computers.</p>
  <div class="row"><button type="button" id="brCancel">Cancel</button><button type="button" id="brSkip"${items.length?'':' disabled'}>Keep my order</button><button type="button" class="primary" id="brGo"${items.length?'':' disabled'}>✨ Sort my clips</button></div>`;
  dlg.querySelector('.dialog-x').onclick=dlg.querySelector('#brCancel').onclick=close;
  dlg.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{if(b.dataset.t==='auto')autoStory=true;else{autoStory=false;tp=TEMPLATES.find(t=>t.id===b.dataset.t);if(mood!=='auto')mood=tp.mood}step1()});
  dlg.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.x,1);step1()});
  const fi=dlg.querySelector('#brFiles');dlg.querySelector('#brChoose').onclick=()=>fi.click();fi.onchange=()=>{addFiles([...fi.files]);fi.value=''};
  dlg.querySelector('#brVault')?.addEventListener('click',()=>VaultPicker.open({title:'Pick a clip',kinds:['video'],onPick:async it=>{try{toast('Loading '+it.name+'…');await addFiles([await VaultPicker.file(it)])}catch(e){toast(e.message)}if(!dlg.open)dlg.showModal()}}));
  dlg.querySelector('#brTimeline')?.addEventListener('click',()=>{useTimeline();step1()});
  dlg.querySelector('#brShape').onchange=e=>shape=e.target.value;dlg.querySelector('#brMood').onchange=e=>{mood=e.target.value;stopListen()};dlg.querySelector('#brListen').onclick=listen;dlg.querySelector('#brCaps').onchange=e=>{autoCaps=e.target.checked;try{localStorage.setItem('tapshop-broll-captions',autoCaps?'on':'off')}catch{}};dlg.querySelector('#brTidy').onchange=e=>{autoTidy=e.target.checked;try{localStorage.setItem('tapshop-broll-tidy',autoTidy?'on':'off')}catch{}};dlg.querySelector('#brClean').onchange=e=>{autoClean=e.target.checked;try{localStorage.setItem('tapshop-broll-clean',autoClean?'on':'off')}catch{}};dlg.querySelector('#brCloud')&&(dlg.querySelector('#brCloud').onchange=e=>{autoCloud=e.target.checked;try{localStorage.setItem('tapshop-broll-cloud',autoCloud?'on':'off')}catch{}});dlg.querySelector('#brMove').onchange=e=>{autoMove=e.target.checked;try{localStorage.setItem('tapshop-broll-motion',autoMove?'on':'off')}catch{}};dlg.querySelector('#brSfx').onchange=e=>{autoSfx=e.target.checked;try{localStorage.setItem('tapshop-broll-sfx',autoSfx?'on':'off')}catch{}};if(!dlg._stopsMusic){dlg._stopsMusic=1;dlg.addEventListener('close',stopListen)}
  dlg.querySelector('#brGo').onclick=analyse;dlg.querySelector('#brSkip').onclick=()=>{number();choose(false);step3('Kept your order.'+pickedNote()+' Move any clip with the menu under it.')}}
async function addFiles(files){let got=0;for(const f of files){if(!/^video\//.test(f.type)&&!/\.(mp4|mov|webm|m4v)$/i.test(f.name))continue;try{toast('Loading '+f.name+'…');let a=await loadAsset(f);items.push({asset:a,in:0,out:a.duration});got++}catch(e){toast(e.message)}}if(got&&dlg.open)step1()}
function useTimeline(quiet){let seen=new Set(items.map(c=>c.key));for(const c of clips){let a=asset(c);if(!a)continue;let key=c.id;if(seen.has(key))continue;items.push({asset:a,in:c.in,out:c.out,key,...(c.locked?{lock:{in:c.in,out:c.out,px:c.px||0,fx:c.lockFx}}:{})})}if(!quiet)toast('Your timeline clips are in.')}
const number=()=>items.forEach((c,i)=>{c.n=i;c.of=items.length});

async function analyse(){number();busy=true;stopped=false;
  dlg.innerHTML=`<h2>✨ Sorting your clips…</h2><p class="sub">We’re watching and listening to each clip. Nothing is uploaded; it all happens on this device.</p>
  <div id="brWork"><progress id="brProg" max="1" value="0"></progress><p class="sub" id="brStatus" aria-live="polite">Getting ready…</p></div>
  <div class="row"><button type="button" id="brStop">Cancel</button><button type="button" id="brKeep">Skip, keep my order</button></div>`;
  const status=s=>{let el=$$('brStatus');if(el)el.textContent=s},prog=v=>{let el=$$('brProg');if(el)el.value=v};
  const dl=m=>status(`Downloading the clip reader (one time only)… ${Math.round(m.loaded/1e6)} of ${Math.round(m.total/1e6)} MB`);
  dlg.querySelector('#brStop').onclick=()=>{stopped=true;stopWorker();busy=false;step1()};
  dlg.querySelector('#brKeep').onclick=()=>{stopped=true;stopWorker();busy=false;choose(false);step3('Kept your order.'+pickedNote()+' Move any clip with the menu under it.')};
  let failed=null;const labels=LOOKS.map(x=>x[1]);
  try{for(let i=0;i<items.length;i++){if(stopped)return;let c=items[i];
      status(`Watching clip ${i+1} of ${items.length}: ${c.asset.name}`);prog(i/items.length);
      let res=await ask({task:'see',images:await frames(c),labels},dl);if(stopped)return;
      c.seen=LOOKS.map(([,p])=>res.reduce((n,r)=>n+(r.find(x=>x.label===p)?.score||0),0)/res.length);
      status(`Listening to clip ${i+1} of ${items.length}…`);prog((i+.5)/items.length);
      let audio=await sound(c);if(stopped)return;
      if(audio){let r=await ask({task:'hear',audio},dl,[audio.buffer]);if(stopped)return;let text=String(r.text||'').trim(),ts=r.chunks.map(x=>x.ts).filter(t=>t&&Number.isFinite(t[0]));
        c.words=text;c.talking=text.split(/\s+/).filter(w=>/[a-z]/i.test(w)).length>=4;if(ts.length){c.speech=[ts[0][0],Math.max(...ts.map(t=>Number.isFinite(t[1])?t[1]:t[0]+1))]}}
      prog((i+1)/items.length)}}
  catch(x){failed=x}
  // Long clips: hear all of it and find its moments (the captions engine, separate from the clip reader above).
  let mNote='';const long=items.filter(c=>c.out-c.in>LONG_CLIP);
  if(!stopped&&long.length&&typeof window.veClipWords==='function'){for(let i=0;i<long.length;i++){if(stopped)return;status(`Finding the moments in clip ${i+1} of ${long.length}…`);
      try{await findMoments(long[i],m=>status(m))}catch(e){console.warn('Moments skipped:',e);mNote=' We couldn’t look for moments inside your long clips this time.';break}}
    const found=long.filter(c=>c.pick).length;if(found)mNote=` We found a moment to use in ${found} long clip${found>1?'s':''}: play it and lock it if it’s right.`}
  busy=false;if(stopped)return;
  choose(!failed);
  step3((failed?'We couldn’t run the clip reader ('+(failed.message||failed)+'). Check your internet connection for the first download. Your clips are in your order; move any clip with the menu under it.':'Here’s where we think each clip fits.'+pickedNote()+' Not right? Move a clip with the menu under it.')+mNote)}

// ---------- picking the story and the music ----------
// The story whose parts best fit the clips (picture + words), with a pull towards using every part and not
// having more parts than clips. Without the clip reader we go by how many clips there are.
function bestStory(){let best=null,top=-1e9;for(const T of TEMPLATES){const P=arrange(items,T);let fit=0,said=0;
    P.forEach((list,j)=>list.forEach(c=>{fit+=scores(c,T)[j];if(c.words&&T.parts[j].say.test(c.words))said++}));
    const filled=P.filter(x=>x.length).length/T.parts.length,sc=fit/items.length+.6*filled+.08*said-.15*Math.max(0,T.parts.length-items.length);
    if(sc>top){top=sc;best=T}}return best}
const BY_COUNT={2:'beforeafter',3:'pas',4:'pas',5:'reasons'};
// Music that suits what the clips mostly show; talky videos get calmer beats so the voice stays clear.
// Mostly the For creators tracks, which leave room in the middle for a voice.
const LOOK_MOOD={talk:'story',product:'haul',unbox:'unbox',messy:'reveal',clean:'tidy',using:'tutorial',happy:'haul',upset:'hook',screen:'tech',food:'kitchen',beauty:'luxe',outside:'plant'};
function bestMood(){const seen=items.filter(c=>c.seen);if(!seen.length)return tp.mood;
  const sum=LOOKS.map((_,i)=>seen.reduce((n,c)=>n+c.seen[i],0)),talky=items.filter(c=>c.talking).length/items.length;
  const order=sum.map((v,i)=>[v,LOOKS[i][0]]).sort((a,b)=>b[0]-a[0]);let key=order[0][1];if(key==='talk')key=order[1][1];
  let m=LOOK_MOOD[key]||tp.mood;if(talky>=.5&&MOODS[m]&&MOODS[m].bpm>=125)m='story';return m}
function choose(read){picked='';number();
  if(autoStory){tp=read?bestStory():TEMPLATES.find(t=>t.id===BY_COUNT[items.length])||TEMPLATES[0];picked='story'}
  parts=arrange(items,tp);if(mood==='auto'){mood=read?bestMood():tp.mood;picked+=' music'}}
const pickedNote=()=>{let a=[];if(/story/.test(picked))a.push(`the “${tp.name}” story`);if(/music/.test(picked)&&MOODS[mood])a.push(`${MOODS[mood].name} music`);return a.length?` We picked ${a.join(' and ')} for you.`:''};

// ---------- words on screen from what was said ----------
// A part's words come from what its talking clips say: a sentence with the part's usual words (any sentence
// for the hook, preferring a question or exclamation), with opening fillers removed, kept short, plus the
// template's emoji. Typed words always win; parts with no talking keep the template's words.
const sentences=t=>String(t||'').replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.split(' ').length>=2);
const LEAD=/^((um+|uh+|so|okay|ok|well|like|and|but|yeah|hey|alright|you guys|guys)[,.!]?\s+)+/i;
function shorten(x,max=42){x=x.replace(LEAD,'').replace(/\b(um+|uh+)[,.]?\s*/gi,'').replace(/[.]+$/,'').trim();if(!x)return '';x=x[0].toUpperCase()+x.slice(1);
  if(x.length<=max)return x;let c=x.slice(0,max);c=c.slice(0,Math.max(c.lastIndexOf(' '),20)).replace(/[,;:\-–]+$/,'');return c+'…'}
function suggest(j){const p=tp.parts[j],talk=(parts?.[j]||[]).filter(c=>c.talking&&c.words);if(!talk.length)return null;const ss=talk.flatMap(c=>sentences(c.words));if(!ss.length)return null;
  const pick=ss.find(x=>p.say.test(x))||(p.id==='hook'?(ss.find(x=>/[?!]/.test(x))||ss[0]):null);if(!pick)return null;const t=shorten(pick);if(!t)return null;
  const emo=(p.text.match(/(\p{Extended_Pictographic}\uFE0F?)\s*$/u)||[])[1];return t+(emo?' '+emo:'')}
const partText=j=>{const p=tp.parts[j],k=tp.id+p.id;return texts[k]??suggest(j)??p.text};

function step3(note){const opts=j=>tp.parts.map((p,k)=>`<option value="${k}"${k===j?' selected':''}>Move to: ${enc(p.label)}</option>`).join('');
  const tag=c=>{if(!c.seen)return '';let i=c.seen.indexOf(Math.max(...c.seen));return enc(LOOKS[i][2])+(c.talking&&LOOKS[i][0]!=='talk'?' · 🗣':'')};
  dlg.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎞️ ${enc(tp.name)}</h2><p class="sub">${enc(note)}</p>
  ${tp.parts.some((p,j)=>texts[tp.id+p.id]==null&&suggest(j))?'<p class="sub">✍️ Some words on screen were written from what you said. Change them any time.</p>':''}
  <div class="br-row" style="margin-bottom:6px"><label>Music<select id="brMood3">${moodOpts(mood)}<option value=""${mood?'':' selected'}>No music</option></select></label></div>
  <label class="br-caps br-fast"><input type="checkbox" id="brFast"${fast?' checked':''}> <span><b>⚡ Faster edit</b><small>Shorter b-roll shots and long clips cut to their moment. Locked moments stay exactly as they are.</small></span></label>
  <div class="br-pv" id="brPv" hidden><video playsinline preload="auto"></video><p class="sub" id="brPvLbl" aria-live="polite"></p></div>
  ${tp.parts.map((p,j)=>`<div class="br-sec"><div class="br-sec-h"><b>${j+1}. ${enc(p.label)}</b><input type="text" data-tx="${p.id}" value="${enc(partText(j))}" aria-label="Words on screen for ${enc(p.label)}" placeholder="Words on screen (leave empty for none)"></div>
    <div class="br-clips">${parts[j].length?parts[j].map(c=>`<div class="br-clip"><img alt="" src="${c.asset.thumb}"><span class="nm">${enc(c.asset.name)}</span><span class="tag">${tag(c)}</span>${c.words?`<span class="said">“${enc(c.words.slice(0,70))}${c.words.length>70?'…':''}”</span>`:''}<select data-mv="${c.n}" aria-label="Move ${enc(c.asset.name)}">${opts(j)}</select></div>`).join(''):'<p class="br-empty">No clip here. This part will be skipped.</p>'}</div>${parts[j].map(momentRow).join('')}</div>`).join('')}
  <div class="row"><button type="button" id="brBack">← Back</button><button type="button" class="primary" id="brBuild">🎬 Build my video</button></div>`;
  dlg.querySelector('.dialog-x').onclick=close;dlg.querySelector('#brBack').onclick=step1;
  dlg.querySelectorAll('[data-tx]').forEach(el=>el.oninput=()=>texts[tp.id+el.dataset.tx]=el.value);
  dlg.querySelectorAll('[data-mv]').forEach(sel=>sel.onchange=()=>{let c=items.find(x=>x.n===+sel.dataset.mv);parts.forEach(p=>{let k=p.indexOf(c);if(k>=0)p.splice(k,1)});parts[+sel.value].push(c);parts[+sel.value].sort((a,b)=>a.n-b.n);step3(note)});
  dlg.querySelector('#brMood3').onchange=e=>{mood=e.target.value};dlg.querySelector('#brBuild').onclick=build;
  dlg.querySelector('#brFast').onchange=e=>{fast=e.target.checked};
  const byN=n=>items.find(x=>x.n===+n);
  dlg.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{const c=byN(b.dataset.play),r=c.lock||c.pick;if(r)playRange(c,r)});
  dlg.querySelectorAll('[data-lock]').forEach(b=>b.onclick=()=>{const c=byN(b.dataset.lock),m=c.pick;if(!m)return;c.lock={in:m.in,out:m.out,fx:m.fx,text:m.text};stopPreview();step3(note)});
  dlg.querySelectorAll('[data-unlock]').forEach(b=>b.onclick=()=>{const c=byN(b.dataset.unlock);delete c.lock;stopPreview();step3(note)});
  dlg.querySelectorAll('[data-alt]').forEach(sel=>sel.onchange=()=>{const c=byN(sel.dataset.alt);c.pick=sel.value===''?null:c.moments[+sel.value];c.whole=sel.value==='';step3(note)});
  dlg.querySelectorAll('[data-find]').forEach(b=>b.onclick=async()=>{const c=byN(b.dataset.find);b.disabled=true;
    try{await findMoments(c,m=>b.textContent=m);step3(note)}catch(e){b.disabled=false;b.textContent='We couldn’t listen to this clip here ('+(e.message||e)+').'}})}
// The rough-cut player: plays exactly one selection (source in → out, with its own sound) and stops there.
let pvRaf=0;
function stopPreview(){cancelAnimationFrame(pvRaf);const v=dlg.querySelector('#brPv video');if(v){v.pause()}}
function playRange(c,r){const box=dlg.querySelector('#brPv'),v=box.querySelector('video'),lbl=dlg.querySelector('#brPvLbl');stopPreview();box.hidden=false;
  if(v.dataset.src!==c.asset.url){v.src=c.asset.url;v.dataset.src=c.asset.url}v.muted=false;
  // Shown in the video's own shape, cropped where the build will crop it, so a tall video's framing can be checked too.
  const [aw,ah]=shape.split(':').map(Number),fx=r.fx??.5;let vis=1;
  const frameIt=()=>{vis=(aw/ah)/((v.videoWidth||16)/(v.videoHeight||9));v.style.aspectRatio=aw+'/'+ah;v.style.objectFit='cover';v.style.maxHeight='46vh';v.style.width='auto';v.style.maxWidth='100%';v.style.margin='0 auto';
    v.style.objectPosition=vis<1?Math.max(0,Math.min(100,(fx-vis/2)/(1-vis)*100)).toFixed(1)+'% 50%':'50% 50%'};
  const go=()=>{frameIt();v.currentTime=r.in;v.dataset.in=r.in;v.dataset.out=r.out;lbl.textContent=`▶ Playing ${fmtT(r.in)}–${fmtT(r.out)} of ${c.asset.name}${vis<1?`, framed for ${shape}`:''}`;
    v.onseeked=()=>{v.onseeked=null;v.play().catch(()=>{});const tick=()=>{if(v.currentTime>=r.out-.02){v.pause();v.dataset.stopped=v.currentTime;lbl.textContent=`Played ${fmtT(r.in)}–${fmtT(r.out)} of ${c.asset.name}. Tap ▶ to watch it again.`;return}pvRaf=requestAnimationFrame(tick)};tick()}};
  if(v.readyState>=1)go();else v.onloadedmetadata=()=>{v.onloadedmetadata=null;go()};box.scrollIntoView({block:'nearest'})}
// What the rough cut uses from a clip: locked (exact, never changed), a found moment ("check it" until locked),
// or a button to look for moments in a long clip. The line was heard; the picture is only described as movement.
function momentRow(c){const name=enc(c.asset.name),long=c.out-c.in>LONG_CLIP,len=r=>(r.out-r.in).toFixed(1)+' s';
  if(c.lock)return `<div class="br-mo locked"><div class="br-mo-h"><b>🔒 Locked</b> <span>${fmtT(c.lock.in)}–${fmtT(c.lock.out)} (${len(c.lock)}) of ${name}</span></div>
    ${c.lock.text?`<p>🗣 “${enc(c.lock.text)}”</p>`:''}<p class="br-mo-note">Used exactly like this, with its own sound, every time you build, even with ⚡ Faster edit or Keep my order.</p>
    <div class="br-mo-b"><button type="button" data-play="${c.n}">▶ Play</button><button type="button" data-unlock="${c.n}">Unlock</button></div></div>`;
  if(!long)return '';
  if(!c.moments)return `<div class="br-mo"><p>${name} is ${(c.out-c.in).toFixed(0)} s long. We can listen to all of it and find the moment worth using.</p><div class="br-mo-b"><button type="button" data-find="${c.n}">🔎 Find the moment</button></div></div>`;
  const alts=`<select data-alt="${c.n}" aria-label="Which part of ${name} to use">${c.moments.map((m,i)=>`<option value="${i}"${m===c.pick?' selected':''}>${fmtT(m.in)} “${enc(shorten(m.text,34))}”</option>`).join('')}<option value=""${c.pick?'':' selected'}>The whole clip</option></select>`;
  if(!c.pick)return `<div class="br-mo"><p>We heard ${name}, but no line clearly shows something happening, so the whole clip is used. Pick a moment if you like:</p>${alts}</div>`;
  const m=c.pick,act=m.act==='settles'?`Something moves right after the line and settles at ${fmtT(m.settle)}. We can’t tell <i>what</i> moved.`:m.act==='ongoing'?'Something is still moving when the selection ends. We can’t tell what it is.':'We didn’t see much movement after the line.';
  return `<div class="br-mo check"><div class="br-mo-h"><b>Check it</b> <span>${fmtT(m.in)}–${fmtT(m.out)} (${len(m)}) of ${name}</span></div>
    <p>✅ <b>Line heard:</b> “${enc(m.text)}” (from “${enc(m.first)}” to “${enc(m.last)}”, nothing cut off)</p>
    <p>👀 <b>Picture not confirmed:</b> ${act}${m.cutShort?' ⚠️ Your next sentence starts soon after, so the action may be cut short.':''}</p>
    <p class="br-mo-note">Play it. If you see the action finish, lock it so it never changes.</p>
    <div class="br-mo-b"><button type="button" data-play="${c.n}">▶ Play this moment</button><button type="button" class="primary" data-lock="${c.n}">🔒 Lock this moment</button></div>${alts}</div>`}

// ---------- the best moments ----------
// Up to 16 tiny frames across a clip: sharpness (edges), brightness, and how much the picture jumps between
// frames (shake or fast pans). c.q = [{t, s}], higher s = a nicer moment to show.
async function scan(c){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=c.asset.url;
  try{await new Promise((r,j)=>{let t=setTimeout(()=>j(Error('timeout')),8000);v.onloadeddata=()=>{clearTimeout(t);r()};v.onerror=()=>{clearTimeout(t);j(Error('read'))}});
    const len=c.out-c.in,N=Math.max(4,Math.min(16,Math.round(len/.5))),W=64,H=Math.max(16,Math.round(64*(v.videoHeight||9)/(v.videoWidth||16))),cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const g=cv.getContext('2d',{willReadFrequently:true}),raw=[];let prev=null;
    for(let i=0;i<N;i++){const t=c.in+len*(i+.5)/N;await new Promise(r=>{let to=setTimeout(r,2500);v.onseeked=()=>{clearTimeout(to);r()};v.currentTime=t});
      g.drawImage(v,0,0,W,H);const d=g.getImageData(0,0,W,H).data,y=new Float32Array(W*H);let mean=0;for(let k=0;k<W*H;k++){y[k]=.299*d[k*4]+.587*d[k*4+1]+.114*d[k*4+2];mean+=y[k]}mean/=W*H;
      let sharp=0;for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){const k=yy*W+xx;sharp+=Math.abs(4*y[k]-y[k-1]-y[k+1]-y[k-W]-y[k+W])}sharp/=(W-2)*(H-2);
      let jump=0;if(prev){for(let k=0;k<W*H;k++)jump+=Math.abs(y[k]-prev[k]);jump/=W*H}prev=y;raw.push({t,mean,sharp,jump})}
    const top=Math.max(1,...raw.map(r=>r.sharp));
    c.q=raw.map(r=>({t:r.t,s:r.sharp/top-(r.mean<45?(45-r.mean)/45:0)-(r.mean>235?.5:0)-Math.max(0,r.jump-20)/40}))}
  catch{c.q=null}finally{v.removeAttribute('src');v.load()}}
// The stretch of length L in [a, b] whose frames score best (start time).
function bestStart(c,a,b,L){if(!c.q?.length||b-a<=L+.05)return null;let best=a,top=-1e9;
  for(let x=a;x+L<=b+1e-6;x+=.1){const inn=c.q.filter(q=>q.t>=x&&q.t<=x+L);if(!inn.length)continue;const sc=inn.reduce((n,q)=>n+q.s,0)/inn.length;if(sc>top+1e-6){top=sc;best=x}}return best}

// ---------- moments: a line plus what happens right after it ----------
// A long talking clip (an intro, a demo, a reaction in one take) is heard from start to end with the captions engine
// (word times in the file's own seconds, the same words captions use later). Its sentences become candidate moments.
// For the best few, a short look at tiny frames from the line's start to 6 s after it (6 a second, 64 px wide, about
// 30–45 frames) finds movement after the line and where it settles, so the trim keeps the payoff, not just the words.
// The engine can only say that something moved, not what: a moment's picture stays "check it" until the creator
// plays it and locks it. c.moments = [{in, out, text, first, last, act, settle, fx, score}], c.pick = the one used.
const SHOW=/\b(here|this|these|that|look|see|watch|fits?|holds?|inside|goes|go|put|slide|slides|open|opens|check|now|just|pocket|zip|clip|press|pull|pour|tap|twist|fold|unfold|turn|it)\b/gi;
const LONG_CLIP=12;
async function motion(c,a,b){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=c.asset.url;const out=[];
  try{await new Promise((r,j)=>{let t=setTimeout(()=>j(Error('timeout')),8000);v.onloadeddata=()=>{clearTimeout(t);r()};v.onerror=()=>{clearTimeout(t);j(Error('read'))}});
    const W=64,H=Math.max(16,Math.round(64*(v.videoHeight||9)/(v.videoWidth||16))),cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d',{willReadFrequently:true});let prev=null;
    for(let t=a;t<=b+1e-6;t+=1/6){await new Promise(r=>{let to=setTimeout(r,2500);v.onseeked=()=>{clearTimeout(to);r()};v.currentTime=Math.min(t,c.asset.duration-.05)});
      g.drawImage(v,0,0,W,H);const d=g.getImageData(0,0,W,H).data,y=new Float32Array(W*H);for(let k=0;k<W*H;k++)y[k]=.299*d[k*4]+.587*d[k*4+1]+.114*d[k*4+2];
      let sum=0;const col=new Float32Array(W);if(prev)for(let k=0;k<W*H;k++){const q=Math.abs(y[k]-prev[k]);if(q>12){sum+=q;col[k%W]+=q}}
      out.push({t,d:prev?sum/(W*H):0,col});prev=y}}
  finally{v.removeAttribute('src');v.load()}return out}
function readAction(m,from){const ds=m.map(x=>x.d).sort((x,y)=>x-y),base=ds[Math.floor(ds.length/2)]||0,thr=Math.max(.6,base*2.5+.3);
  const on=m.filter(x=>x.t>=from-.2&&x.d>thr);if(!on.length)return {act:'none'};
  const end=on.at(-1).t,quiet=m.filter(x=>x.t>end);const settled=quiet.length&&quiet.at(-1).t-end>=.5;
  // Where it ends up: the first stretch of movement after the line starts (gaps under a third of a second allowed),
  // and its last third of a second, which is where the moving thing arrives (a phone sliding into a pocket, not the table
  // it left). fx = that spot, 0–1 across the source; a crop to a tall frame is centred on it (cropPan).
  const st=on[0].t;let runEnd=st;for(const x of on){if(x.t-runEnd>.34)break;runEnd=x.t}
  const tail=m.filter(x=>x.t>=runEnd-.3&&x.t<=runEnd+1e-6&&x.d>thr);let w=0,cx=0;
  for(const x of tail){const n=x.col.length;for(let i=0;i<n;i++){w+=x.col[i];cx+=x.col[i]*(i+.5)/n}}
  return {act:settled?'settles':'ongoing',start:st,settle:end,fx:w?Math.round(cx/w*1000)/1000:.5}}
async function findMoments(c,say=()=>{}){const words=await veClipWords({assetId:c.asset.id,in:c.in,out:c.out},say);c.allWords=words;c.moments=[];
  if(!words.length)return c.moments;
  const sents=[];let cur=[];words.forEach((w,i)=>{cur.push(w);const nx=words[i+1];if(!nx||/[.!?]["”')]*$/.test(w.w)||nx.s-w.e>.7){sents.push(cur);cur=[]}});
  const real=sents.filter(ws=>!ws.every(junk));
  const cand=real.map(ws=>{const text=ws.map(w=>w.w).join(' ').replace(/\s+([,.!?])/g,'$1').trim();return {ws,text,score:(text.match(SHOW)||[]).length*.5+(/[.!?]["”')]*$/.test(text)?.2:0)}})
    .sort((x,y)=>y.score-x.score).slice(0,3);
  for(const k of cand){say('Looking at what happens after “'+shorten(k.text,30)+'”…');const first=k.ws[0],last=k.ws.at(-1);
    let m=[];try{m=await motion(c,Math.max(c.in,first.s),Math.min(c.out,last.e+6))}catch(e){console.warn('Moment scan skipped:',e)}
    const r=m.length?readAction(m,first.s):{act:'none'},i=sents.indexOf(k.ws),prev=sents[i-1]?.at(-1),next=sents[i+1]?.[0];
    let a=Math.max(c.in,first.s-.3,prev?prev.e+.05:-1),b=Math.max(last.e+.35,r.act==='settles'?r.settle+.5:r.act==='ongoing'?last.e+6:0);
    let short=false;if(next&&b>next.s-.08){b=Math.max(last.e+.25,next.s-.08);short=r.act!=='none'&&r.settle>b}
    b=Math.min(b,c.out,last.e+6.5);
    Object.assign(k,{in:Math.round(a*100)/100,out:Math.round(b*100)/100,first:first.w,last:last.w,act:r.act,settle:r.settle,fx:r.fx,cutShort:short,score:k.score+(r.act==='settles'?1.5:r.act==='ongoing'?.6:0)});
    delete k.ws;c.moments.push(k)}
  c.moments.sort((x,y)=>y.score-x.score);c.pick=c.moments[0]?.score>=1?c.moments[0]:null;return c.moments}
// Where a crop to a tall frame should look so the action stays in view: pan the cover-fitted picture towards the
// moment's movement (fx, 0–1 across the source), never past its edges.
// A crop to a tall frame is centred on the moment's action (fx, 0–1 across the source), never past the picture's edges.
function cropPan(c,fx){const v=c.asset.video,sw=v?.videoWidth||16,sh=v?.videoHeight||9,W=canvas.width,H=canvas.height;
  if(fx==null||shape==='16:9')return 0;const f=Math.max(W/sw,H/sh),vw=sw*f;if(vw<=W+1)return 0;
  const lim=(vw-W)/2,dx=Math.max(-lim,Math.min(lim,vw*(.5-fx)));return Math.round(dx/W*1000)/1000}
const fmtT=x=>{x=Math.max(0,x);const m=Math.floor(x/60);return m+':'+(x-m*60).toFixed(1).padStart(4,'0')};
// ---------- building the video ----------
// Talking clips keep everything that's said; other clips are cut to whole beats so cuts land on the music.
function cut(c,part,beat){let a=c.in,b=c.out;
  if(c.talking&&c.speech){a=Math.max(c.in,c.in+c.speech[0]-.15);b=Math.min(c.out,c.in+c.speech[1]+.35);if(b-a<.5){a=c.in;b=c.out}return [a,b]}
  if(!beat){const L=Math.min(6,b-a),x=bestStart(c,a,b,L);return x==null?[a,a+L]:[x,x+L]}const nb=part.beats||6;let n=Math.min(fast?Math.max(2,Math.round(nb/2)):nb,Math.floor((b-a)/beat));if(n<2)return [a,b];
  const L=n*beat,x=bestStart(c,a,b,L);if(x!=null)return [x,x+L];let start=Math.min(a+.2,b-L);return [Math.max(a,start),Math.max(a,start)+L]}
const textFrac=(s,W,H)=>{let f=.055,px=f*H,w=s.length*.6*px;return w>W*.84?W*.84/(s.length*.6)/H:f};
async function build(){if(exporting)return;const btn=dlg.querySelector('#brBuild');btn.disabled=true;btn.textContent='Building…';
  try{if(mood==='auto')mood=tp.mood;const used=parts.flat().map(c=>c.asset),M=MOODS[mood],beat=M?60/M.bpm:0,heard=parts.flat().some(c=>c.words!==undefined);
    // Find each non-talking clip's best moment before cutting it.
    const look=parts.flat().filter(c=>!c.talking&&!c.q);for(let i=0;i<look.length;i++){btn.textContent=`Finding the best moments (${i+1} of ${look.length})…`;await scan(look[i])}
    if(clips.length||graphicTracks.length||extraTracks.length){if(window.veNewProject)await veNewProject();else{clips=[];graphicTracks=[]}}
    for(const a of used)if(!assets.includes(a))assets.push(a);
    if(autoClean&&window.veCleanSound){const list=[...new Set(used)];for(let i=0;i<list.length;i++){btn.textContent=`Cleaning up the sound (${i+1} of ${list.length})…`;try{await veCleanSound(list[i],p=>btn.textContent=`Cleaning up the sound (${i+1} of ${list.length})… ${p}%`)}catch(e){console.warn('Sound clean-up skipped:',e)}}}
    $$('aspect').value=shape;setAspect();const W=canvas.width,H=canvas.height;
    // Listen to clips that talk (or all of them after Keep my order) for captions and tidying.
    const listen=(autoCaps||autoTidy)&&typeof window.veClipWords==='function',todo=parts.flat().filter(c=>c.talking||!heard);
    // Cloud AI first: all talking clips in one go. Any problem (off, daily limit, no internet) → on-device AI below.
    let cloud=null,cloudNote='';
    if(listen&&autoCloud&&todo.length&&window.veCloudOn?.()){btn.textContent='Cloud AI is listening…';
      try{const r=await veCloudWords(todo.map(c=>({assetId:c.asset.id,in:c.in,out:c.out})),m=>btn.textContent=m);cloud=new Map(todo.map((c,i)=>[c,r.words[i]]));if(r.left!=null)cloudNote=` Cloud AI videos left today: ${r.left}.`}
      catch(e){console.warn('Cloud AI skipped:',e);cloudNote=e.code==='limit'?' '+e.message+' We used the on-device AI instead.':e.code==='off'?'':' The cloud AI wasn’t available, so we used the on-device AI.'}}
    let t=0,talky=false,failed=false,listened=false,n=0,moveN=0,skipped=0;const spans=[],capWords=[];
    for(let j=0;j<tp.parts.length;j++){const p=tp.parts[j];if(!parts[j].length)continue;let s=t;
      for(const c of parts[j]){
        // A locked moment (or a found one the creator hasn't swapped for the whole clip) is used exactly: its own source
        // range and sound, no pause-cutting inside it (the silent action after a line is the payoff), no zoom.
        const range=c.lock||(!c.whole?c.pick:null);
        if(range){let words=c.allWords?c.allWords.filter(w=>w.e>range.in&&w.s<range.out):null;
          if(!words&&listen&&!failed){btn.textContent=`Listening to clip ${++n}…`;try{words=await veClipWords({assetId:c.asset.id,in:range.in,out:range.out},m=>btn.textContent=m);listened=true}catch(e){failed=true;console.warn('Speech engine unavailable:',e)}}
          if(words?.length)talky=true;
          let cl=makeClip(c.asset);Object.assign(cl,{in:range.in,out:range.out,fit:shape==='16:9'?'contain':'cover'});
          if(c.lock){cl.locked=true;if(range.fx!=null)cl.lockFx=range.fx}
          const px=cropPan(c,range.fx);if(px)cl.px=px;else if(c.lock?.px)cl.px=c.lock.px;
          clips.push(cl);
          if(words)for(const w of words)capWords.push({w:w.w,s:Math.round((t+Math.max(0,w.s-range.in))*100)/100,e:Math.round((t+Math.min(range.out,w.e)-range.in)*100)/100});
          t+=range.out-range.in;continue}
        let [a,b]=cut(c,p,beat),segs=[[a,b]],words=null;
        if(listen&&!failed&&todo.includes(c)){btn.textContent=`Listening to clip ${++n} of ${todo.length}…`;
          try{words=cloud?.get(c)||await veClipWords({assetId:c.asset.id,in:c.in,out:c.out},m=>btn.textContent=m);listened=true;
            if(words.length>=4){talky=true;a=Math.max(c.in,words[0].s-.15);b=Math.min(c.out,words.at(-1).e+.35);segs=[[a,b]]}
            if(autoTidy&&words.length&&!words.est)segs=tidy(words,a,b)}
          catch(e){failed=true;console.warn('Speech engine unavailable:',e)}}
        // A throwaway take (only "um", "ok", "alright"… or words the cloud AI marked as a mistake) is left out
        // completely, as long as the video still has other clips.
        if(autoTidy&&words?.length&&!words.est&&words.every(junk)&&parts.flat().length>1){skipped++;continue}
        if(c.talking)talky=true;
        segs.forEach(([x,y],si)=>{let cl=makeClip(c.asset);Object.assign(cl,{in:x,out:y,fit:shape==='16:9'?'contain':'cover'});
          if(autoMove){const speaking=(words&&words.length>=4)||c.talking;
            // Calm: one very slow zoom per clip, in then out on the next. Talking jump cuts switch to a slight close-up so they look on purpose.
            cl.motion=speaking?(segs.length>1&&si%2?'closeSoft':''):(moveN++%2?'slowOut':'slowIn')}
          clips.push(cl);
          if(words)for(const w of words)if(w.e>x&&w.s<y&&!(autoTidy&&!words.est&&(w.drop||FILLER.test(String(w.w).replace(/[^a-z]/gi,'')))))capWords.push({w:w.w,s:Math.round((t+Math.max(0,w.s-x))*100)/100,e:Math.round((t+Math.min(y,w.e)-x)*100)/100});
          t+=y-x})}
      if(t>s)spans.push([p,s,t-s,j])}
    btn.textContent='Building…';
    for(const [p,s,len,j] of spans){let text=String(partText(j)).trim();if(!text)continue;createGraphicTrack('text');let g=graphicTracks.at(-1);
      Object.assign(g,{name:p.label+': '+text.slice(0,18),text,color:p.color||'#ffffff',size:textFrac(text,W,H)*H*1280/W,x:50,y:p.y,bold:true,background:false,animation:p.anim,offset:Math.round(s*10)/10,length:Math.max(.8,Math.round(Math.min(len,p.textMax||len)*10)/10),boxColor:p.box,boxOpacity:1,boxPad:26,boxRadius:18,_part:p.id})}
    if(M&&t>0){btn.textContent='Making your music…';const after=spans.find(([p])=>p.id==='after');let file=await makeBeat(t,mood,{dropAt:after?after[1]:0,bare:1});addTrack('audio');let tr=extraTracks.at(-1);tr.name='🎵 '+M.name+' beat';Object.assign(tr,musicTrackMeta(mood));targetTrack=tr.id;await loadTrackMedia(file);tr.volume=.6;renderTracks()}
    if(autoSfx&&window.TapSFX){btn.textContent='Adding sound effects…';const words=graphicTracks.filter(g=>g._part);
      for(const g of words){const key=partSfx(g._part,tp.id);delete g._part;if(key)try{await TapSFX.add(key,{at:g.offset,forId:g.id,noSnap:1,quiet:1})}catch{}}
      renderTracks()}
    for(const g of graphicTracks)delete g._part;
    for(const c of clips)if(asset(c)?.cleanFile)c.clean=true;
    $$('projectName').value='B-roll · '+tp.name;selected=-1;render();renderTracks();renderGraphicTracks();await seekTimeline(0);
    items=[];parts=null;dlg.close();
    let capped=autoCaps&&!failed?vePlaceCaptions(capWords):0;
    toast((failed?'Your video is ready! Captions and pause-cutting didn’t work here, but you can try ✨ Captions in the toolbar.':capped?`Your video is ready, with captions (${capped} words)! Press ▶ to watch it.`:autoCaps&&listened?'Your video is ready! We didn’t hear any talking, so there are no captions. Press ▶ to watch it.':'Your video is ready! Press ▶ to watch it.')+(skipped?` We left out ${skipped} clip${skipped>1?'s':''} with only “um”, “ok” or a fumble.`:'')+cloudNote)}
  catch(e){toast('Couldn’t build the video: '+(e.message||e));btn.disabled=false;btn.textContent='🎬 Build my video'}}

// Split a talking stretch [a, b] into the parts worth keeping: drop um/uh, fumbles the cloud AI marked (w.drop) and pauses over half a second,
// leaving a little air around each word so cuts don't clip them.
// Which sound effect goes with each kind of story part (see video-sfx.js). The hook hits harder on the punchy stories.
const partSfx=(id,story)=>id==='hook'?(/^(pas|versus|myth)$/.test(story)?'drop':story==='pov'?'scratch':'whoosh'):/^(problem|old|myth|bad)$/.test(id)?'buzz':id==='after'?'sparkle':
  /^(solution|new|truth|good|result|proof|verdict|why|fav)$/.test(id)?'ding':/^(look|product)$/.test(id)?'shutter':id==='twist'?'scratch':id==='cta'?'click':/^(before|night)$/.test(id)?'swoosh':'pop';
const FILLER=/^(u+m+|u+h+|uhm+|e+r+m*|a+h+|h+m+|m+h*m+)$/i;
// Words that mean nothing on their own: a clip with only these (and fillers) is a throwaway take.
const EMPTY=/^(ok(ay)?|k|alright|all|right|so|yeah|yep|yes|cool|and|well|mhm|uh-?huh|go|action|cut|again|one|more|time|sorry|wait|hold|on)$/i;
const junk=w=>{const k=String(w.w).toLowerCase().replace(/[^a-z-]/g,'');return w.drop||!k||FILLER.test(k)||EMPTY.test(k)};
function tidy(words,a,b){const ws=words.filter(w=>w.e>a&&w.s<b),isF=w=>w.drop||FILLER.test(String(w.w).replace(/[^a-z]/gi,'')),kept=ws.filter(w=>!isF(w));
  if(!kept.length)return [[a,b]];const out=[];let start=Math.max(a,kept[0].s-.12);
  for(let i=0;i<kept.length-1;i++){const cur=kept[i],nx=kept[i+1],gap=nx.s-cur.e,ums=ws.filter(w=>isF(w)&&w.s>=cur.e-.05&&w.e<=nx.s+.05);
    if(gap>.5||(ums.length&&gap>.2)){const end=Math.min(nx.s,cur.e+.12,ums.length?ums[0].s:Infinity);out.push([start,end]);start=Math.max(end,nx.s-.1,ums.length?ums.at(-1).e:-Infinity)}}
  out.push([start,Math.min(b,kept.at(-1).e+.3)]);const good=out.filter(([x,y])=>y-x>.15);return good.length?good:[[a,b]]}

// ---------- ways in ----------
// The timeline's music settings for a style: its tempo (beat markers and snapping), fade-in (none for styles that start at full
// energy), 1.5 s fade-out, and auto-ducking under speech.
const musicTrackMeta=k=>{const M=MOODS[k];return M?{bpm:M.bpm,fadeIn:M.fx?.noFade?0:.3,fadeOut:1.5,duck:true,duckAmt:.85,volume:.6,musicKey:k}:{}};
window.veMusicTrackMeta=musicTrackMeta;
window.openBroll=open;window.veBrollState=()=>({items,parts,tp,fast});window.veMakeBeat=makeBeat;window.veMoods=MOODS;window.veCreatorMoods=CREATOR;window.veMusicGroups=GROUPS;
// Free music for any audio track: pick a style, hear 10 seconds, then it's made as long as the video
// (at least 15 s, at most 5 minutes) and put on that track.
window.openFreeMusic=function(trackId){if(exporting)return;pause();let d=$$('fmDialog');
  if(!d){d=document.createElement('dialog');d.id='fmDialog';d.className='closable';document.body.appendChild(d);d.addEventListener('close',()=>{fmAudio?.pause();fmAudio=null})}
  const len=Math.min(300,Math.max(15,Math.ceil(total()||0))),S=window.searchAudio?1:0;
  // Search, one-tap filters and pace (audio-search.js); with none of them set, the list is grouped as before.
  const pills=S?[...getQuickFilters().filter(q=>q.id!=='sfx'&&q.id!=='music'),{id:'fav',emoji:'★',label:'Favorites'},{id:'recent',emoji:'🕘',label:'Recent'}]:[];
  let q='',pill='',pace='',like='';
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🎵 Free music</h2><p class="sub">Made on your device, free to use anywhere. Press ▶ to hear a style, then <b>Use</b> to put it on this track (${len} seconds${total()>=15&&total()<=300?', the length of your video':''}).</p>
  ${S?`<div class="fm-find"><input type="search" class="fm-q" placeholder="Search: cozy coffee, hook, gym, skincare…" aria-label="Search music"><select class="fm-pace" aria-label="Pace"><option value="">Any pace</option>${getPaceFilters().map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></div>
  <div class="fm-pills">${pills.map(p=>`<button type="button" data-pill="${p.id}">${p.emoji} ${p.label}</button>`).join('')}</div>`:''}
  <div class="fm-list"></div><p class="sub" id="fmStatus" aria-live="polite"></p>`;
  const list=d.querySelector('.fm-list'),say=s=>d.querySelector('#fmStatus').textContent=s;
  const row=k=>{const m=MOODS[k],fav=S&&isFavorite(k);return `<div class="fm-row"><button type="button" class="fm-play" data-p="${k}" aria-label="Listen to ${enc(m.name)}">▶</button><span><b>${enc(m.name)}</b><small>${m.bpm} BPM${m.for?' · '+enc(m.for):''}</small></span>${S?`<button type="button" class="fm-ic${fav?' on':''}" data-f="${k}" aria-label="${fav?'Remove from':'Add to'} favorites" title="Favorite">${fav?'★':'☆'}</button><button type="button" class="fm-ic" data-s="${k}" aria-label="Similar to ${enc(m.name)}" title="Similar vibes">≈</button>`:''}<button type="button" class="primary" data-u="${k}">Use</button></div>`};
  const draw=()=>{fmAudio?.pause();fmAudio=null;d.querySelectorAll('[data-pill]').forEach(b=>b.classList.toggle('on',b.dataset.pill===pill));
    if(like){const sim=getSimilarTracks(like,6).map(t=>t.id).filter(k=>MOODS[k]);list.innerHTML=`<div class="fm-h">≈ Similar to ${enc(MOODS[like].name)} <button type="button" class="fm-back" data-back>← All music</button></div>${[like,...sim].map(row).join('')}`;return}
    if(S&&(q.trim()||pill||pace)){const hits=searchAudio(q,{type:'music',filter:pill==='fav'||pill==='recent'?'':pill,pace,favorites:pill==='fav',recent:pill==='recent'}).map(t=>t.id).filter(k=>MOODS[k]);
      list.innerHTML=`<div class="fm-h">${hits.length?hits.length+' match'+(hits.length>1?'es':''):'Nothing matches yet. Try fewer words.'}</div>${hits.map(row).join('')}`;return}
    list.innerHTML=GROUPS().flatMap(([l,ks],gi)=>ks.filter(k=>MOODS[k]).map((k,i)=>(i?'':`<div class="fm-h">${gi?l:'🛍️ Made for creators · your voice stays clear on top'}</div>`)+row(k))).join('')};
  draw();
  d.querySelector('.dialog-x').onclick=()=>d.close();
  if(S){let tm;d.querySelector('.fm-q').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{q=e.target.value;like='';draw()},150)};d.querySelector('.fm-pace').onchange=e=>{pace=e.target.value;like='';draw()};
    d.querySelectorAll('[data-pill]').forEach(b=>b.onclick=()=>{pill=pill===b.dataset.pill?'':b.dataset.pill;like='';draw()})
    // The pill row scrolls sideways: by touch, a mouse wheel (up/down turns into left/right), or by dragging with the mouse.
    const row=d.querySelector('.fm-pills'),edge=()=>row.classList.toggle('end',row.scrollLeft+row.clientWidth>=row.scrollWidth-4);edge();row.addEventListener('scroll',edge,{passive:true});
    row.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&row.scrollWidth>row.clientWidth){row.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
    let dx=null,moved=false;row.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;dx=[e.clientX,row.scrollLeft];moved=false});
    addEventListener('pointermove',e=>{if(!dx)return;const m=e.clientX-dx[0];if(Math.abs(m)>4){moved=true;row.classList.add('drag')}row.scrollLeft=dx[1]-m});
    addEventListener('pointerup',()=>{dx=null;setTimeout(()=>row.classList.remove('drag'))});
    row.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false}},true)}
  list.onclick=async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.back!==undefined){like='';draw();return}
    if(b.dataset.f){const on=toggleFavorite(b.dataset.f);b.classList.toggle('on',on);b.textContent=on?'★':'☆';b.setAttribute('aria-label',(on?'Remove from':'Add to')+' favorites');if(pill==='fav'&&!on)draw();return}
    if(b.dataset.s){like=b.dataset.s;draw();list.scrollTop=0;return}
    if(b.dataset.p){const was=b.textContent==='■';fmAudio?.pause();fmAudio=null;d.querySelectorAll('[data-p]').forEach(x=>x.textContent='▶');if(was)return;
      b.textContent='…';try{const a=new Audio(URL.createObjectURL(await makeBeat(10,b.dataset.p)));fmAudio=a;a.onended=()=>b.textContent='▶';await a.play();b.textContent='■'}catch{b.textContent='▶';say('Couldn’t play it here.')}return}
    if(b.dataset.u){const k=b.dataset.u;fmAudio?.pause();d.querySelectorAll('button').forEach(x=>x.disabled=true);say(`Making your ${MOODS[k].name} music…`);
      try{const f=await makeBeat(len,k,{bare:1});targetTrack=trackId;{const t0=extraTracks.find(x=>x.id===trackId);if(t0){for(const x of ['fadeIn','fadeOut','duck','duckAmt','bpm','musicKey'])delete t0[x];Object.assign(t0,musicTrackMeta(k))}}await loadTrackMedia(f);const t=extraTracks.find(x=>x.id===trackId);if(t)t.name='🎵 '+MOODS[k].name+' beat';window.recordRecent?.(k);renderTracks();d.close();toast(`${MOODS[k].name} music added.`)}
      catch(e){say('Couldn’t make the music: '+(e.message||e))}finally{d.querySelectorAll('button').forEach(x=>x.disabled=false)}}};
  d.showModal()};
let fmAudio=null;
{const st=document.createElement('style');st.textContent=`#fmDialog{width:min(520px,94vw)}.fm-list{display:flex;flex-direction:column;gap:6px;max-height:min(60vh,520px);overflow:auto;margin:10px 0}
.fm-h{font-weight:700;font-size:13px;margin:8px 2px 2px;color:#ff3ea5}.fm-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid var(--ts-border,#8884);border-radius:12px}.fm-row span{flex:1;min-width:0}.fm-row b,.fm-row small{display:block}.fm-row small{opacity:.65;font-size:12px}
.fm-find{display:flex;gap:8px;margin-top:10px}.fm-find .fm-q{flex:1;min-width:0}.fm-find .fm-pace{flex:none;max-width:42%}
.fm-pills{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;padding:8px 0 6px;scrollbar-width:thin;scrollbar-color:#ff3ea566 transparent;cursor:grab;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}.fm-pills.end{-webkit-mask-image:none;mask-image:none}.fm-pills::-webkit-scrollbar{height:5px}.fm-pills::-webkit-scrollbar-thumb{background:#ff3ea566;border-radius:9px}.fm-pills.drag{cursor:grabbing;user-select:none}.fm-pills button{flex:none;border-radius:999px!important;padding:5px 11px!important;font-size:12.5px;white-space:nowrap}.fm-pills button.on{background:#ff3ea5!important;color:#fff!important;border-color:#ff3ea5!important}
.fm-ic{width:30px;height:30px;padding:0!important;border-radius:50%!important;flex:none;font-size:16px}.fm-ic.on{color:#ffb800}.fm-back{float:right;font-size:12px;padding:2px 10px!important}
.fm-play{width:40px;height:40px;padding:0!important;border-radius:50%!important;flex:none}`;document.head.appendChild(st)}
{let g=[...document.querySelectorAll('.timebar button')].find(b=>/Review|Graphics/.test(b.textContent)),b=document.createElement('button');b.type='button';b.textContent='🎞️ B-roll Video';b.title='Build a video from your clips with a story template and free music';b.onclick=()=>open();if(g)g.after(b);else document.querySelector('.timebar')?.appendChild(b)}
// The two quick makers (this one and ⭐ Reviews) sit together at the top of the start screen, right under
// its intro and above Recent videos. Other scripts add things after the intro later, so keep them in place.
function startButton(){let start=$$('veStart'),lead=start?.querySelector('.vs-lead');if(!lead)return;
  let box=$$('vsQuick');if(!box){box=document.createElement('div');box.id='vsQuick';box.className='vs-quick'}
  if(!box.querySelector('.vs-qh')){let h=document.createElement('div');h.className='vs-qh';h.innerHTML='<h2>Quick Video Makers</h2><p class="vs-help">Pick one and it builds the video for you.</p>';box.prepend(h)}
  if(!$$('vsBroll')){let b=document.createElement('button');b.type='button';b.id='vsBroll';b.className='vs-reviews';
    b.innerHTML='<b>🎞️ B-roll Video Maker</b><span>Drop in your raw b-roll clips and get a finished, ready-to-post video: auto captions, a hook and call to action, free music, best moments picked, cuts on the beat and gentle zooms. Little or no editing needed.</span>';
    b.onclick=()=>{let go=$$('vsGo');if(go)go.click();let el=$$('veStart');if(el)el.hidden=true;setTimeout(()=>open(true),60)};box.appendChild(b)}
  let rv=$$('vsReviews');if(rv&&rv.parentElement!==box)box.appendChild(rv);
  if(lead.nextElementSibling!==box)lead.after(box)}
new MutationObserver(startButton).observe(document.body,{childList:true,subtree:true});startButton();
})();
