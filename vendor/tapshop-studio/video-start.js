// Video Editor start screen: pick where the video is going (sets the frame shape), add videos and
// photos (device or Media Vault), optionally pick a short-video template, then open the editor with
// everything on the timeline. Videos go on the main timeline in the order picked; photos follow,
// 3 s each, as picture tracks (the same 'brand:logo' image tracks the brand kit uses).
// Anything that loads media from elsewhere (Vault "Use in Studio", projects) closes the screen.
(()=>{
const PLATFORMS=[
  {id:'tiktok',name:'TikTok',sub:'Tall · 9:16',aspect:'9:16'},
  {id:'shorts',name:'YouTube Shorts',sub:'Tall · 9:16',aspect:'9:16'},
  {id:'reels',name:'Instagram Reels',sub:'Tall · 9:16',aspect:'9:16'},
  {id:'stories',name:'Stories',sub:'Instagram · Facebook · 9:16',aspect:'9:16'},
  {id:'youtube',name:'YouTube video',sub:'Wide · 16:9',aspect:'16:9'},
  {id:'square',name:'Square post',sub:'1:1',aspect:'1:1'},
  {id:'feed',name:'Feed post',sub:'Instagram · Facebook · 4:5',aspect:'4:5'}];
// Text sizes are a fraction of the frame height so a template looks the same in every shape.
// at(D) gives [start, length] in seconds for a video D seconds long.
const W='#ffffff',K='#111111';
const TEMPLATES=[
  {id:'hook',cat:'hooks',name:'Hook',tag:'Grab attention in 2 seconds',dur:8,bg:'linear-gradient(160deg,#2b2b33,#0f0f13)',tracks:[
    {text:'Wait for it… 👀',y:44,h:.075,color:W,box:'#ff3b5c',anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    {text:'Watch till the end',y:82,h:.04,color:W,plate:true,anim:'fade',at:D=>[2.5,Math.max(.5,D-2.5)]}]},
  {id:'review',cat:'reviews',name:'Product review',tag:'Honest take + link in bio',dur:12,bg:'linear-gradient(160deg,#f6ead8,#e4cfb3)',tracks:[
    {text:'HONEST REVIEW',y:12,h:.05,color:K,box:'#ffd84d',anim:'down',at:D=>[0,D]},
    {text:'⭐⭐⭐⭐⭐',y:21,h:.04,color:W,anim:'pop',at:D=>[1,Math.max(.5,D-4)]},
    {text:'Link in bio ↓',y:80,h:.05,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'beforeafter',cat:'reviews',name:'Before & After',tag:'Show the glow-up',dur:8,bg:'linear-gradient(90deg,#8d8d96 50%,#e9d7ff 50%)',tracks:[
    {text:'BEFORE',y:10,h:.06,color:W,box:K,anim:'left',at:D=>[0,D/2]},
    {text:'AFTER ✨',y:10,h:.06,color:K,box:W,anim:'pop',at:D=>[D/2,D/2]}]},
  {id:'top3',cat:'howto',name:'Top 3 list',tag:'Quick tips people save',dur:12,bg:'linear-gradient(160deg,#5b21b6,#1e1b4b)',tracks:[
    {text:'3 things you\nneed to know',y:40,h:.055,color:W,box:'#7c3aed',anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    ...[1,2,3].map(n=>({text:n+' · Your tip here',y:82,h:.045,color:W,plate:true,anim:'left',at:D=>{let s=Math.min(2.5,D/4),l=(D-s)/3;return [s+(n-1)*l,l]}}))]},
  {id:'unboxing',cat:'product',name:'Unboxing',tag:'First impressions',dur:12,bg:'linear-gradient(160deg,#c7b299,#8a6f52)',tracks:[
    {text:'UNBOXING 📦',y:12,h:.06,color:W,box:K,anim:'zoomIn',at:D=>[0,Math.min(3,D)]},
    {text:'First impressions…',y:82,h:.04,color:W,plate:true,anim:'fade',at:D=>[Math.min(3,D/3),Math.max(.5,D-6)]},
    {text:'Worth it? 👇',y:45,h:.065,color:K,box:W,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'sale',cat:'promo',name:'Sale / Promo',tag:'Drive clicks fast',dur:8,bg:'linear-gradient(160deg,#ff5f6d,#ffc371)',tracks:[
    {text:'FLASH SALE ⚡',y:18,h:.06,color:K,box:'#ffd84d',anim:'pulse',at:D=>[0,D]},
    {text:'50% OFF',y:45,h:.11,color:W,box:'#ff3b5c',anim:'pop',at:D=>[Math.min(.6,D/4),D-Math.min(.6,D/4)]},
    {text:'Shop now · link in bio',y:82,h:.04,color:W,plate:true,anim:'slide',at:D=>[Math.min(1.5,D/3),D-Math.min(1.5,D/3)]}]},
  // ---- UGC templates ----
  {id:'stopscroll',cat:'hooks',name:'Stop scrolling',tag:'Freeze the thumb',dur:8,bg:'linear-gradient(160deg,#1f1f25,#3a0f1a)',tracks:[
    {text:'STOP SCROLLING ✋',y:44,h:.07,color:W,box:'#ff3b5c',anim:'shake',at:D=>[0,Math.min(2.5,D)]},
    {text:'You need to see this',y:82,h:.04,color:W,plate:true,anim:'fade',at:D=>[Math.min(2.5,D/3),D-Math.min(2.5,D/3)]}]},
  {id:'pov',cat:'hooks',name:'POV',tag:'Relatable opener',dur:8,bg:'linear-gradient(160deg,#a1c4fd,#c2e9fb)',tracks:[
    {text:'POV: you finally found\nthe perfect ___',y:16,h:.045,color:K,box:W,anim:'down',at:D=>[0,D]}]},
  {id:'secret',cat:'hooks',name:'Nobody talks about this',tag:'Curiosity hook',dur:10,bg:'linear-gradient(160deg,#141e30,#243b55)',tracks:[
    {text:'Nobody talks\nabout this 🤫',y:42,h:.065,color:K,box:'#ffd84d',anim:'pop',at:D=>[0,Math.min(3,D)]},
    {text:'Here’s why ↓',y:82,h:.045,color:W,plate:true,anim:'bounce',at:D=>[Math.min(3,D/3),D-Math.min(3,D/3)]}]},
  {id:'triedit',cat:'hooks',name:'I tried it',tag:'So they don’t have to',dur:12,bg:'linear-gradient(160deg,#fbc2eb,#a6c1ee)',tracks:[
    {text:'I tried it so you\ndon’t have to',y:14,h:.05,color:K,box:'#ffd84d',anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Verdict 👇',y:45,h:.07,color:W,box:K,anim:'pop',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'problemfix',cat:'product',name:'Problem → Solution',tag:'Classic UGC ad',dur:15,bg:'linear-gradient(180deg,#5b5b66 50%,#c9f2d9 50%)',tracks:[
    {text:'THE PROBLEM 😩',y:12,h:.055,color:W,box:K,anim:'left',at:D=>[0,D*.4]},
    {text:'THE FIX ✅',y:12,h:.055,color:K,box:'#7cf0a8',anim:'pop',at:D=>[D*.4,Math.max(.5,D*.6-3)]},
    {text:'Get yours · link in bio',y:82,h:.045,color:W,box:'#ff3b5c',anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'mademe',cat:'product',name:'Made me buy it',tag:'Viral find',dur:10,bg:'linear-gradient(160deg,#ff9a9e,#fecfef)',tracks:[
    {text:'The internet made\nme buy it 🛒',y:14,h:.05,color:W,box:K,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Worth the hype? 👀',y:80,h:.05,color:K,box:W,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'reasons',cat:'product',name:'3 reasons I love it',tag:'Feature list',dur:12,bg:'linear-gradient(160deg,#fff1eb,#ace0f9)',tracks:[
    {text:'3 reasons I love this',y:12,h:.05,color:K,box:W,anim:'pop',at:D=>[0,D]},
    ...[1,2,3].map(n=>({text:n+' · Reason here',y:82,h:.045,color:W,box:K,anim:'right',at:D=>{let s=Math.min(1.5,D/5),l=(D-s)/3;return [s+(n-1)*l,l]}}))]},
  {id:'demo',cat:'product',name:'How it works',tag:'Product demo in steps',dur:12,bg:'linear-gradient(160deg,#e0eafc,#cfdef3)',tracks:[
    {text:'HOW IT WORKS',y:12,h:.055,color:W,box:'#2563eb',anim:'down',at:D=>[0,D]},
    ...[1,2,3].map(n=>({text:'Step '+n,y:82,h:.05,color:K,box:W,anim:'pop',at:D=>{let s=Math.min(1.5,D/5),l=(D-s)/3;return [s+(n-1)*l,l]}}))]},
  {id:'grwm',cat:'lifestyle',name:'Get ready with me',tag:'GRWM featuring a product',dur:15,bg:'linear-gradient(160deg,#f8cdda,#1d2b64)',tracks:[
    {text:'GRWM ✨',y:12,h:.07,color:W,box:'#e11d74',anim:'pop',at:D=>[0,Math.min(4,D)]},
    {text:'using ___',y:21,h:.04,color:W,plate:true,anim:'fade',at:D=>[.6,Math.max(.5,Math.min(4,D)-.6)]},
    {text:'Products linked in bio',y:82,h:.04,color:W,plate:true,anim:'slide',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'haul',cat:'product',name:'Haul',tag:'Show what you got',dur:15,bg:'linear-gradient(160deg,#fceabb,#f8b500)',tracks:[
    {text:'MY HAUL 🛍️',y:12,h:.065,color:K,box:W,anim:'down',at:D=>[0,Math.min(3,D)]},
    ...[1,2,3].map(n=>({text:'Item '+n+' · $__',y:82,h:.045,color:W,box:K,anim:'left',at:D=>{let s=Math.min(3,D/5),l=(D-s-2.5)/3;return [s+(n-1)*l,Math.max(.5,l)]}})),
    {text:'Which one’s your fave?',y:45,h:.05,color:K,box:W,anim:'pop',at:D=>[Math.max(0,D-2.5),Math.min(2.5,D)]}]},
  {id:'musthaves',cat:'lifestyle',name:'Must-haves',tag:'Favourites list',dur:12,bg:'linear-gradient(160deg,#fdfbfb,#ebedee)',tracks:[
    {text:'My must-haves 💛',y:12,h:.06,color:K,box:'#ffd84d',anim:'pop',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Save this for later 📌',y:80,h:.045,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'versus',cat:'product',name:'Cheap vs Pricey',tag:'Side-by-side test',dur:10,bg:'linear-gradient(90deg,#d9f99d 50%,#e9d5ff 50%)',tracks:[
    {text:'$',x:25,y:12,h:.07,color:K,box:W,anim:'left',at:D=>[0,Math.max(.5,D-3)]},
    {text:'$$$',x:75,y:12,h:.07,color:W,box:K,anim:'right',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Can you tell\nthe difference?',y:45,h:.06,color:K,box:W,anim:'pop',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'testimonial',cat:'reviews',name:'Testimonial',tag:'A quote that sells',dur:10,bg:'linear-gradient(160deg,#232526,#414345)',tracks:[
    {text:'“I’m obsessed.”',y:42,h:.08,color:W,anim:'fade',at:D=>[0,D]},
    {text:'⭐⭐⭐⭐⭐',y:54,h:.04,color:W,anim:'pop',at:D=>[.8,Math.max(.5,D-.8)]},
    {text:'— Real customer',y:82,h:.04,color:W,plate:true,anim:'slide',at:D=>[1.5,Math.max(.5,D-1.5)]}]},
  {id:'rating',cat:'reviews',name:'My rating',tag:'Score at the end',dur:12,bg:'linear-gradient(160deg,#43cea2,#185a9d)',tracks:[
    {text:'Rating ___ out of 10',y:12,h:.05,color:K,box:W,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'9/10 ⭐',y:45,h:.11,color:K,box:'#ffd84d',anim:'elastic',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'results',cat:'reviews',name:'Day 1 vs Day 30',tag:'Show real results',dur:10,bg:'linear-gradient(90deg,#9ca3af 50%,#fde68a 50%)',tracks:[
    {text:'DAY 1',y:12,h:.065,color:W,box:K,anim:'left',at:D=>[0,D/2]},
    {text:'DAY 30 ✨',y:12,h:.065,color:K,box:W,anim:'pop',at:D=>[D/2,D/2]},
    {text:'Results may vary',y:92,h:.025,color:W,plate:true,anim:'none',at:D=>[D/2,D/2]}]},
  {id:'howto',cat:'howto',name:'How to in 3 steps',tag:'Quick tutorial',dur:15,bg:'linear-gradient(160deg,#0f2027,#2c5364)',tracks:[
    {text:'How to ___\nin 3 steps',y:40,h:.06,color:K,box:'#7cf0a8',anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    ...[1,2,3].map(n=>({text:'Step '+n+' · ___',y:82,h:.045,color:W,plate:true,anim:'left',at:D=>{let s=Math.min(2.5,D/4),l=(D-s)/3;return [s+(n-1)*l,l]}}))]},
  {id:'dayinlife',cat:'lifestyle',name:'Day in my life',tag:'Vlog-style timeline',dur:15,bg:'linear-gradient(160deg,#ffecd2,#fcb69f)',tracks:[
    {text:'A day in my life ☀️',y:12,h:.055,color:K,box:W,anim:'down',at:D=>[0,Math.min(3,D)]},
    ...['7:00 AM','12:30 PM','9:00 PM'].map((tm,n)=>({text:tm,x:24,y:88,h:.04,color:W,box:K,anim:'pop',at:D=>{let s=Math.min(3,D/5),l=(D-s)/3;return [s+n*l,l]}}))]},
  {id:'captions',cat:'lifestyle',name:'Talking head captions',tag:'Caption bar for talking videos',dur:12,bg:'linear-gradient(160deg,#3a3a44,#1a1a20)',tracks:[
    {text:'Your caption here',y:78,h:.045,color:K,box:W,anim:'none',at:D=>[0,Math.max(.5,D-2.5)]},
    {text:'Follow for part 2 👉',y:45,h:.05,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-2.5),Math.min(2.5,D)]}]},
  {id:'storytime',cat:'lifestyle',name:'Story time',tag:'Series opener',dur:12,bg:'linear-gradient(160deg,#c79081,#dfa579)',tracks:[
    {text:'Story time 🍵',y:12,h:.06,color:K,box:W,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Part 1',x:80,y:21,h:.035,color:W,box:K,anim:'fade',at:D=>[.5,Math.max(.5,D-3.5)]},
    {text:'Follow for part 2',y:80,h:.045,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'meetbrand',cat:'product',name:'Meet the brand',tag:'Intro a brand you love',dur:10,bg:'linear-gradient(160deg,#e0c3fc,#8ec5fc)',tracks:[
    {text:'Meet ___ 👋',y:40,h:.075,color:K,box:W,anim:'pop',at:D=>[0,Math.min(3,D)]},
    {text:'Made for ___',y:82,h:.045,color:W,plate:true,anim:'fade',at:D=>[Math.min(3,D/3),Math.max(.5,D-Math.min(3,D/3)-3)]},
    {text:'Link in bio ↓',y:82,h:.05,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'code',cat:'promo',name:'Discount code',tag:'Affiliate or promo code',dur:8,bg:'linear-gradient(160deg,#11998e,#38ef7d)',tracks:[
    {text:'USE MY CODE',y:30,h:.05,color:W,box:K,anim:'down',at:D=>[0,D]},
    {text:'SAVE20',y:45,h:.1,color:K,box:'#ffd84d',anim:'pop',at:D=>[.5,Math.max(.5,D-.5)]},
    {text:'for 20% off · link in bio',y:60,h:.04,color:W,plate:true,anim:'slide',at:D=>[1.2,Math.max(.5,D-1.2)]}]},
  {id:'giveaway',cat:'promo',name:'Giveaway',tag:'Grow your following',dur:10,bg:'linear-gradient(160deg,#f093fb,#f5576c)',tracks:[
    {text:'GIVEAWAY 🎁',y:14,h:.07,color:K,box:'#ffd84d',anim:'tada',at:D=>[0,D]},
    {text:'1 · Follow\n2 · Like\n3 · Tag a friend',y:48,h:.05,color:W,box:K,anim:'pop',at:D=>[1,Math.max(.5,D-1)]},
    {text:'Ends Friday!',y:82,h:.045,color:K,box:W,anim:'pulse',at:D=>[2,Math.max(.5,D-2)]}]},
  {id:'faq',cat:'howto',name:'You asked',tag:'Answer a common question',dur:12,bg:'linear-gradient(160deg,#4568dc,#b06ab3)',tracks:[
    {text:'You asked 🙋',y:42,h:.07,color:K,box:W,anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    {text:'Q: Does it really work?',y:14,h:.045,color:K,box:W,anim:'down',at:D=>[Math.min(2.5,D/3),D-Math.min(2.5,D/3)]},
    {text:'Here’s my honest answer',y:82,h:.04,color:W,plate:true,anim:'fade',at:D=>[Math.min(3.5,D/2),D-Math.min(3.5,D/2)]}]},
  // ---- More UGC templates ----
  {id:'dontbuy',cat:'hooks',name:'Don’t buy until…',tag:'Save them money',dur:10,bg:'linear-gradient(160deg,#200122,#6f0000)',tracks:[
    {text:'Don’t buy ___\nuntil you watch this',y:40,h:.055,color:W,box:'#ff3b5c',anim:'shake',at:D=>[0,Math.min(3,D)]},
    {text:'Here’s what I found 👇',y:82,h:.04,color:W,plate:true,anim:'fade',at:D=>[Math.min(3,D/3),D-Math.min(3,D/3)]}]},
  {id:'mistakes',cat:'hooks',name:'3 mistakes',tag:'Everyone makes these',dur:12,bg:'linear-gradient(160deg,#ee0979,#ff6a00)',tracks:[
    {text:'3 mistakes you’re\nmaking with ___',y:40,h:.055,color:K,box:W,anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    ...[1,2,3].map(n=>({text:'❌ Mistake '+n,y:82,h:.045,color:W,box:K,anim:'left',at:D=>{let s=Math.min(2.5,D/4),l=(D-s)/3;return [s+(n-1)*l,l]}}))]},
  {id:'hottake',cat:'hooks',name:'Hot take',tag:'Spark the comments',dur:8,bg:'linear-gradient(160deg,#f12711,#f5af19)',tracks:[
    {text:'HOT TAKE 🔥',y:16,h:.065,color:W,box:K,anim:'pop',at:D=>[0,D]},
    {text:'Agree or disagree? 👇',y:82,h:.045,color:K,box:W,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'wishknew',cat:'hooks',name:'Wish I knew sooner',tag:'Advice people save',dur:12,bg:'linear-gradient(160deg,#355c7d,#c06c84)',tracks:[
    {text:'Things I wish I knew\nbefore ___',y:16,h:.05,color:K,box:W,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Save this 📌',y:45,h:.065,color:W,box:K,anim:'pop',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'pricereveal',cat:'product',name:'Guess the price',tag:'Big reveal at the end',dur:10,bg:'linear-gradient(160deg,#bdc3c7,#2c3e50)',tracks:[
    {text:'Guess the price 🤔',y:14,h:.055,color:K,box:W,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Only $__!',y:45,h:.1,color:K,box:'#7cf0a8',anim:'elastic',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'giftidea',cat:'product',name:'Gift idea',tag:'Perfect present',dur:10,bg:'linear-gradient(160deg,#cb356b,#bd3f32)',tracks:[
    {text:'Gift idea for ___ 🎁',y:14,h:.05,color:K,box:W,anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'They’ll love it — link in bio',y:80,h:.04,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'inmybag',cat:'lifestyle',name:'What’s in my bag',tag:'Everyday carry',dur:15,bg:'linear-gradient(160deg,#d3cce3,#e9e4f0)',tracks:[
    {text:'What’s in my bag 👜',y:12,h:.055,color:W,box:K,anim:'down',at:D=>[0,Math.min(3,D)]},
    ...[1,2,3,4].map(n=>({text:'Item '+n,y:82,h:.045,color:K,box:W,anim:'pop',at:D=>{let s=Math.min(3,D/5),l=(D-s)/4;return [s+(n-1)*l,l]}}))]},
  {id:'worthit',cat:'reviews',name:'Worth it or not?',tag:'Yes or no verdict',dur:12,bg:'linear-gradient(160deg,#134e5e,#71b280)',tracks:[
    {text:'Is ___ worth it?',y:14,h:.055,color:K,box:'#ffd84d',anim:'down',at:D=>[0,Math.max(.5,D-3)]},
    {text:'✅ WORTH IT',y:45,h:.08,color:W,box:'#16a34a',anim:'elastic',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'proscons',cat:'reviews',name:'Pros & Cons',tag:'Fair and honest',dur:12,bg:'linear-gradient(90deg,#bbf7d0 50%,#fecaca 50%)',tracks:[
    {text:'PROS 👍',x:25,y:12,h:.055,color:W,box:'#16a34a',anim:'left',at:D=>[0,D/2]},
    {text:'CONS 👎',x:75,y:12,h:.055,color:W,box:'#dc2626',anim:'right',at:D=>[D/2,D/2]},
    {text:'Your point here',y:82,h:.045,color:K,box:W,anim:'fade',at:D=>[.5,Math.max(.5,D-.5)]}]},
  {id:'weeklater',cat:'reviews',name:'1 week later',tag:'Long-term update',dur:10,bg:'linear-gradient(160deg,#5f2c82,#49a09d)',tracks:[
    {text:'Using ___ for 1 week',y:14,h:.05,color:K,box:W,anim:'down',at:D=>[0,D/2]},
    {text:'Here’s the truth 👀',y:14,h:.055,color:W,box:K,anim:'pop',at:D=>[D/2,D/2]}]},
  {id:'reply',cat:'reviews',name:'Reply to a comment',tag:'Answer your audience',dur:10,bg:'linear-gradient(160deg,#3a3a44,#1a1a20)',tracks:[
    {text:'Replying to @___\n“Does it actually work?”',y:16,h:.04,color:K,box:W,anim:'pop',at:D=>[0,D]}]},
  {id:'recipe',cat:'howto',name:'Recipe',tag:'Ingredients to finished dish',dur:15,bg:'linear-gradient(160deg,#f7971e,#ffd200)',tracks:[
    {text:'Easy ___ recipe 🍳',y:12,h:.055,color:W,box:K,anim:'down',at:D=>[0,Math.min(3,D)]},
    ...[1,2,3].map(n=>({text:'Step '+n,y:82,h:.045,color:K,box:W,anim:'pop',at:D=>{let s=Math.min(3,D/5),l=(D-s-3)/3;return [s+(n-1)*l,Math.max(.5,l)]}})),
    {text:'Enjoy! 😋',y:45,h:.075,color:K,box:W,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'hack',cat:'howto',name:'Life hack',tag:'Quick win',dur:8,bg:'linear-gradient(160deg,#00b09b,#96c93d)',tracks:[
    {text:'You’ve been doing\nthis wrong 😳',y:40,h:.06,color:K,box:W,anim:'pop',at:D=>[0,Math.min(2.5,D)]},
    {text:'Try this instead ✅',y:82,h:.045,color:W,box:K,anim:'slide',at:D=>[Math.min(2.5,D/3),D-Math.min(2.5,D/3)]}]},
  {id:'routine',cat:'lifestyle',name:'AM / PM routine',tag:'Skincare or daily routine',dur:15,bg:'linear-gradient(90deg,#fde68a 50%,#1e1b4b 50%)',tracks:[
    {text:'☀️ AM routine',y:12,h:.055,color:K,box:W,anim:'left',at:D=>[0,D/2]},
    {text:'🌙 PM routine',y:12,h:.055,color:W,box:K,anim:'right',at:D=>[D/2,D/2]}]},
  {id:'ootd',cat:'lifestyle',name:'Outfit of the day',tag:'OOTD with links',dur:10,bg:'linear-gradient(160deg,#ffafbd,#ffc3a0)',tracks:[
    {text:'OOTD ✨',y:12,h:.08,color:K,box:W,anim:'pop',at:D=>[0,Math.max(.5,D-3)]},
    {text:'Top · ___\nShoes · ___',x:28,y:80,h:.035,color:W,box:K,anim:'left',at:D=>[1,Math.max(.5,D-4)]},
    {text:'Links in bio 🔗',y:80,h:.045,color:W,box:K,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'travel',cat:'lifestyle',name:'Travel diary',tag:'Places and moments',dur:15,bg:'linear-gradient(160deg,#2193b0,#6dd5ed)',tracks:[
    {text:'📍 ___',x:28,y:10,h:.045,color:K,box:W,anim:'left',at:D=>[0,D]},
    {text:'Day 1',y:82,h:.05,color:W,box:K,anim:'pop',at:D=>[.5,Math.max(.5,D-.5)]}]},
  {id:'lastchance',cat:'promo',name:'Last chance',tag:'Urgency that converts',dur:8,bg:'linear-gradient(160deg,#000000,#434343)',tracks:[
    {text:'LAST CHANCE ⏰',y:18,h:.065,color:K,box:'#ffd84d',anim:'shake',at:D=>[0,D]},
    {text:'Ends tonight',y:45,h:.08,color:W,box:'#ff3b5c',anim:'pulse',at:D=>[.6,Math.max(.5,D-.6)]},
    {text:'Link in bio ↓',y:82,h:.045,color:K,box:W,anim:'bounce',at:D=>[1.5,Math.max(.5,D-1.5)]}]},
  {id:'launch',cat:'promo',name:'New launch',tag:'Announce something new',dur:10,bg:'linear-gradient(160deg,#8e2de2,#4a00e0)',tracks:[
    {text:'IT’S HERE 🚀',y:40,h:.08,color:K,box:W,anim:'elastic',at:D=>[0,Math.min(3,D)]},
    {text:'Introducing ___',y:14,h:.05,color:W,box:K,anim:'down',at:D=>[Math.min(3,D/3),Math.max(.5,D-Math.min(3,D/3)-3)]},
    {text:'Shop now · link in bio',y:82,h:.045,color:K,box:W,anim:'bounce',at:D=>[Math.max(0,D-3),Math.min(3,D)]}]},
  {id:'freeship',cat:'promo',name:'Free shipping',tag:'Remove the last excuse',dur:8,bg:'linear-gradient(160deg,#56ab2f,#a8e063)',tracks:[
    {text:'FREE SHIPPING 📦',y:30,h:.065,color:W,box:K,anim:'pop',at:D=>[0,D]},
    {text:'Today only',y:45,h:.05,color:K,box:W,anim:'fade',at:D=>[.6,Math.max(.5,D-.6)]}]},
  {id:'bundle',cat:'promo',name:'Bundle deal',tag:'Buy more, save more',dur:8,bg:'linear-gradient(160deg,#ff9966,#ff5e62)',tracks:[
    {text:'BUY 2 GET 1 FREE',y:30,h:.06,color:K,box:'#ffd84d',anim:'pop',at:D=>[0,D]},
    {text:'Mix and match ✨',y:45,h:.045,color:W,box:K,anim:'fade',at:D=>[.8,Math.max(.5,D-.8)]},
    {text:'Link in bio',y:82,h:.045,color:K,box:W,anim:'bounce',at:D=>[1.5,Math.max(.5,D-1.5)]}]}];
const CATS=[['all','All'],['hooks','Hooks'],['product','Product'],['reviews','Reviews'],['howto','How-to'],['lifestyle','Lifestyle'],['promo','Promo']];
let tplCat='all';
const TIPS=[['⚡','Hook them fast','Put your best moment or a bold line in the first 2–3 seconds.'],
  ['⬇','Mind the edges','App buttons cover the bottom and right side. Keep words near the middle.'],
  ['💬','Add captions','Lots of people watch with the sound off.'],
  ['⏱','Shorter wins','Cut the slow parts. Most short videos work best under a minute.']];
const PHOTO_SECONDS=3;
let platform='tiktok',template=null,pending=[];
try{let p=localStorage.getItem('tapshop-video-platform');if(PLATFORMS.some(x=>x.id===p))platform=p}catch{}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isVideo=f=>f.type.startsWith('video/')||/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name);
const isImage=f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp|gif|heic|avif)$/i.test(f.name);

const css=`#veStart[hidden],#veStart [hidden]{display:none!important}
#veStart{position:fixed;inset:0;z-index:40;overflow:auto;background:var(--ts-bg,#fafafa);color:var(--ts-text,#171717);-webkit-overflow-scrolling:touch}
#veStart .vs-wrap{max-width:1040px;margin:0 auto;padding:16px 16px 120px}
#veStart .vs-top{display:flex;align-items:center;gap:10px;margin-bottom:18px}
#veStart .vs-top .sp{flex:1}
#veStart h1{font-size:clamp(26px,5vw,38px);line-height:1.1;margin:6px 0 6px;letter-spacing:-.03em}
#veStart .vs-lead{color:var(--ts-muted,#737373);font-size:15px;margin:0 0 22px;max-width:560px;line-height:1.5}
#veStart h2{font-size:17px;margin:28px 0 4px;letter-spacing:-.01em}
#veStart .vs-step{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ts-primary,#171717);color:var(--ts-on-primary,#fff);font-size:12px;margin-right:8px;vertical-align:2px}
#veStart .vs-help{color:var(--ts-muted,#737373);font-size:13px;margin:0 0 12px}
#veStart .vs-plats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
#veStart .vs-plat{display:flex;align-items:center;gap:12px;text-align:left;padding:12px;min-height:64px}
#veStart .vs-shape{flex:none;display:grid;place-items:center;width:30px;height:30px}
#veStart .vs-shape i{display:block;border:2px solid currentColor;border-radius:4px}
#veStart .vs-plat b{display:block;font-size:14px}
#veStart .vs-plat small{display:block;font-weight:500;font-size:11px;opacity:.7;margin-top:2px;color:inherit!important}
#veStart .vs-drop{border:2px dashed var(--ts-border-strong,#d4d4d4);border-radius:16px;background:var(--ts-surface,#fff);padding:22px 16px;text-align:center}
#veStart .vs-drop.over{border-color:var(--ts-primary,#171717);background:var(--ts-soft,#f5f5f5)}
#veStart .vs-drop .big{font-size:30px;line-height:1}
#veStart .vs-drop p{margin:8px 0 14px;color:var(--ts-muted,#737373);font-size:14px}
#veStart .vs-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#veStart .vs-row button{padding:10px 16px}
#veStart .vs-files{display:flex;gap:10px;overflow-x:auto;padding:14px 2px 4px}
#veStart .vs-file{position:relative;flex:none;width:84px}
#veStart .vs-file .th{width:84px;height:112px;border-radius:12px;overflow:hidden;background:var(--ts-soft,#f5f5f5);border:1px solid var(--ts-border,#e5e5e5)}
#veStart .vs-file .th img,#veStart .vs-file .th video{width:100%;height:100%;object-fit:cover;display:block}
#veStart .vs-file .n{position:absolute;top:6px;left:6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#000b;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
#veStart .vs-file .k{position:absolute;bottom:26px;left:6px;font-size:10px;font-weight:700;color:#fff;background:#000b;border-radius:6px;padding:1px 5px}
#veStart .vs-file .x{position:absolute;top:4px;right:4px;width:26px;height:26px;padding:0;border-radius:50%;font-size:15px;line-height:1;display:grid;place-items:center}
#veStart .vs-file small{display:block;font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#veStart .vs-tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
#veStart .vs-tpl{cursor:pointer;border:1px solid var(--ts-border,#e5e5e5);border-radius:16px;background:var(--ts-surface,#fff);padding:8px;outline:none;transition:border-color .15s}
#veStart .vs-tpl:hover{border-color:var(--ts-border-strong,#d4d4d4)}
#veStart .vs-tpl:focus-visible{box-shadow:0 0 0 3px color-mix(in srgb,var(--ts-primary,#171717) 25%,transparent)}
#veStart .vs-tpl[aria-pressed="true"]{border:2px solid var(--ts-primary,#171717);padding:7px}
#veStart .vs-ph{position:relative;aspect-ratio:9/16;border-radius:10px;overflow:hidden;container-type:size}
#veStart .vs-ph span{position:absolute;left:50%;transform:translate(-50%,-50%);white-space:pre;text-align:center;font-weight:800;line-height:1.15;padding:.18em .4em;border-radius:.25em;max-width:94%}
#veStart .vs-tpl b{display:block;font-size:14px;margin:8px 4px 0}
#veStart .vs-tpl small{display:block;font-size:12px;margin:2px 4px 4px;color:var(--ts-muted,#737373)}
#veStart .vs-tpl .ck{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:var(--ts-primary,#171717);color:var(--ts-on-primary,#fff);display:none;place-items:center;font-size:13px;font-weight:800}
#veStart .vs-tpl[aria-pressed="true"] .ck{display:grid}
#veStart .vs-cats{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;scrollbar-width:none}#veStart .vs-cats::-webkit-scrollbar{display:none}
#veStart .vs-cats button{flex:none;padding:8px 14px;border-radius:999px!important;font-size:13px}
#veStart .vs-cats button span{opacity:.55;font-weight:500;margin-left:2px}
#veStart .vs-more{display:flex;flex-wrap:wrap;gap:8px}
#veStart .vs-tips{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
#veStart .vs-tip{border:1px solid var(--ts-border,#e5e5e5);border-radius:16px;background:var(--ts-surface,#fff);padding:14px}
#veStart .vs-tip b{display:block;font-size:14px;margin:6px 0 4px}
#veStart .vs-tip p{margin:0;font-size:13px;line-height:1.45;color:var(--ts-muted,#737373)}
#veStart .vs-go{position:fixed;left:0;right:0;bottom:0;z-index:41;background:color-mix(in srgb,var(--ts-surface,#fff) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid var(--ts-border,#e5e5e5);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
#veStart .vs-go .in{max-width:1040px;margin:0 auto;display:flex;align-items:center;gap:12px}
#veStart .vs-go .sum{flex:1;min-width:0;font-size:13px;color:var(--ts-muted,#737373);line-height:1.35}
#veStart .vs-go .sum b{color:var(--ts-text,#171717)}
#veStart .vs-go .primary{padding:13px 22px;font-size:15px;white-space:nowrap}
@media(max-width:520px){#veStart .vs-plats{grid-template-columns:1fr 1fr}#veStart .vs-tpls{grid-template-columns:1fr 1fr}#veStart .vs-plat{padding:10px;gap:8px}}`;

function shapeBox(aspect){let [w,h]=aspect.split(':').map(Number),s=26/Math.max(w,h);return `<span class="vs-shape" aria-hidden="true"><i style="width:${Math.round(w*s)}px;height:${Math.round(h*s)}px"></i></span>`}
// Shrink a line of template text so it (plus its box padding) fits 90% of a frame W px wide and 720 px tall.
let measureCtx=null;
function fitH(t,W){measureCtx=measureCtx||document.createElement('canvas').getContext('2d');let px=t.h*720;measureCtx.font=`bold ${px}px system-ui`;let wide=Math.max(...t.text.split('\n').map(l=>measureCtx.measureText(l).width))+(t.box||t.plate?.56*px:0);return wide>.9*W?t.h*.9*W/wide:t.h}
function previewTrack(t){let st=`top:${t.y}%;left:${t.x||50}%;font-size:${(fitH(t,405)*100).toFixed(2)}cqh;color:${t.color};`;if(t.box)st+=`background:${t.box};`;else if(t.plate)st+='background:#000a;';else st+='text-shadow:0 1px 3px #0008;';return `<span style="${st}">${esc(t.text)}</span>`}
function previewFor(tp){let seen=new Set(),out='';for(let t of tp.tracks){let k=t.y+'|'+(t.x||50);if(seen.has(k))continue;seen.add(k);out+=previewTrack(t)}return out}

function build(){
  let style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  let el=document.createElement('div');el.id='veStart';el.setAttribute('role','region');el.setAttribute('aria-label','Start a new video');
  el.innerHTML=`<div class="vs-wrap">
  <div class="vs-top"><button type="button" onclick="location.href='index.html'">← Studio</button><span class="sp"></span><button type="button" id="vsBlank" title="Skip and open the editor">Open editor</button></div>
  <h1>Make a short video</h1>
  <p class="vs-lead">Pick where it's going, add your clips and photos, and choose a template if you'd like a head start. You can change anything later.</p>
  <h2><span class="vs-step">1</span>Where will you post it?</h2><p class="vs-help">This sets the shape of your video.</p>
  <div class="vs-plats" id="vsPlats"></div>
  <h2><span class="vs-step">2</span>Add your videos and photos</h2><p class="vs-help">They go on the timeline in this order: videos first, then photos (${PHOTO_SECONDS} seconds each).</p>
  <div class="vs-drop" id="vsDrop"><div class="big" aria-hidden="true">＋</div><p>Drop files here, or choose them</p><div class="vs-row"><button type="button" class="primary" id="vsPick">Choose from device</button><button type="button" id="vsVault">⛁ From Media Vault</button></div>
  <input type="file" id="vsInput" accept="video/*,image/*" multiple hidden></div>
  <div class="vs-files" id="vsFiles" hidden></div>
  <h2><span class="vs-step">3</span>Pick a template <span style="font-weight:500;color:var(--ts-muted,#737373);font-size:13px">(optional)</span></h2><p class="vs-help">Ready-made text and timing for short videos. Tap again to unselect.</p>
  <div class="vs-cats" id="vsCats" role="group" aria-label="Template type"></div>
  <div class="vs-tpls" id="vsTpls"></div>
  <h2>Pick up where you left off</h2><p class="vs-help">Saved projects need their original videos, so add those in step 2 first.</p>
  <div class="vs-more"><button type="button" id="vsVaultProject">⛁ Saved project from Vault</button><button type="button" id="vsFileProject">Open project file</button><button type="button" id="vsDemo">▶ Try a sample video</button></div>
  <h2>Quick tips</h2>
  <div class="vs-tips">${TIPS.map(([i,t,p])=>`<div class="vs-tip"><span aria-hidden="true">${i}</span><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join('')}</div>
  </div>
  <div class="vs-go"><div class="in"><div class="sum" id="vsSum" aria-live="polite"></div><button type="button" class="primary" id="vsGo">Start editing →</button></div></div>`;
  document.body.appendChild(el);
  const $$=id=>document.getElementById(id);
  $$('vsPlats').innerHTML=PLATFORMS.map(p=>`<button type="button" class="vs-plat" data-id="${p.id}" aria-pressed="false">${shapeBox(p.aspect)}<span><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span></button>`).join('');
  $$('vsPlats').onclick=e=>{let b=e.target.closest('.vs-plat');if(!b)return;platform=b.dataset.id;try{localStorage.setItem('tapshop-video-platform',platform)}catch{}sync()};
  $$('vsCats').innerHTML=CATS.map(([id,label])=>`<button type="button" data-cat="${id}">${label} <span>${id==='all'?TEMPLATES.length:TEMPLATES.filter(t=>t.cat===id).length}</span></button>`).join('');
  $$('vsCats').onclick=e=>{let b=e.target.closest('[data-cat]');if(!b)return;tplCat=b.dataset.cat;sync()};
  $$('vsTpls').innerHTML=TEMPLATES.map(t=>`<div class="vs-tpl" role="button" tabindex="0" aria-pressed="false" data-id="${t.id}" data-cat="${t.cat}"><div class="vs-ph" style="background:${t.bg}">${previewFor(t)}<span class="ck" aria-hidden="true">✓</span></div><b>${esc(t.name)}</b><small>${esc(t.tag)}</small></div>`).join('');
  const pickTpl=c=>{if(!c)return;template=template===c.dataset.id?null:c.dataset.id;sync()};
  $$('vsTpls').onclick=e=>pickTpl(e.target.closest('.vs-tpl'));
  $$('vsTpls').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickTpl(e.target.closest('.vs-tpl'))}};
  $$('vsPick').onclick=()=>$$('vsInput').click();
  $$('vsInput').onchange=function(){addFiles(this.files);this.value=''};
  let drop=$$('vsDrop');
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');addFiles(e.dataTransfer.files)};
  $$('vsVault').onclick=()=>{if(typeof VaultPicker==='undefined'){toast('Media Vault is only available inside TapShop.');return}VaultPicker.open({title:'Add from your Media Vault',kinds:['video','image'],onPick:async it=>{try{toast('Loading '+it.name+'…');addFiles([await VaultPicker.file(it)])}catch(e){toast(e.message)}}})};
  $$('vsFiles').onclick=e=>{let b=e.target.closest('.x');if(!b)return;let i=+b.dataset.i,[gone]=pending.splice(i,1);if(gone?.url)URL.revokeObjectURL(gone.url);sync()};
  $$('vsBlank').onclick=()=>{applyAspect();close()};
  $$('vsDemo').onclick=()=>{applyAspect();close();loadDemo()};
  $$('vsVaultProject').onclick=async()=>{await importPending();openVaultPicker(['project'])};
  $$('vsFileProject').onclick=async()=>{await importPending();$('restore').click()};
  $$('vsGo').onclick=start;
  sync();
}

function addFiles(list){let added=0,skipped=0;for(let f of [...(list||[])]){let kind=isVideo(f)?'video':isImage(f)?'image':null;if(!kind){skipped++;continue}pending.push({file:f,kind,url:URL.createObjectURL(f)});added++}
  if(skipped)toast(skipped===1?'That file isn’t a video or photo.':skipped+' files weren’t videos or photos.');sync();
  if(added){let box=document.getElementById('vsFiles');requestAnimationFrame(()=>box.scrollTo({left:box.scrollWidth,behavior:'smooth'}))}}
// Videos first, then photos, matching what the help text promises.
const ordered=()=>[...pending.filter(p=>p.kind==='video'),...pending.filter(p=>p.kind==='image')];

function sync(){
  const $$=id=>document.getElementById(id);
  document.querySelectorAll('#veStart .vs-plat').forEach(b=>{let on=b.dataset.id===platform;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  document.querySelectorAll('#veStart .vs-tpl').forEach(c=>{c.setAttribute('aria-pressed',String(c.dataset.id===template));c.hidden=tplCat!=='all'&&c.dataset.cat!==tplCat&&c.dataset.id!==template});
  document.querySelectorAll('#veStart .vs-cats button').forEach(b=>{let on=b.dataset.cat===tplCat;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  let files=$$('vsFiles'),list=ordered();files.hidden=!list.length;
  files.innerHTML=list.map(p=>{let i=pending.indexOf(p);return `<div class="vs-file"><div class="th">${p.kind==='video'?`<video src="${p.url}#t=0.5" muted playsinline preload="metadata"></video>`:`<img src="${p.url}" alt="">`}</div><span class="n">${list.indexOf(p)+1}</span><span class="k">${p.kind==='video'?'VIDEO':'PHOTO'}</span><button type="button" class="x" data-i="${i}" aria-label="Remove ${esc(p.file.name)}">×</button><small>${esc(p.file.name)}</small></div>`}).join('');
  let pl=PLATFORMS.find(p=>p.id===platform),tp=TEMPLATES.find(t=>t.id===template),v=pending.filter(p=>p.kind==='video').length,ph=pending.length-v;
  let what=[v&&(v+' video'+(v>1?'s':'')),ph&&(ph+' photo'+(ph>1?'s':''))].filter(Boolean).join(' + ')||'no files yet';
  $$('vsSum').innerHTML=`<b>${esc(pl.name)}</b> · ${esc(what)}${tp?` · <b>${esc(tp.name)}</b> template`:''}`;
}

function applyAspect(){let pl=PLATFORMS.find(p=>p.id===platform);$('aspect').value=pl.aspect;setAspect();let name=$('projectName');if(name&&/^Untitled video$/.test(name.value))name.value=pl.name+' video'}
function close(){let el=document.getElementById('veStart');if(el)el.hidden=true;try{render();draw()}catch{}}
function open(){let el=document.getElementById('veStart');if(el){el.hidden=false;sync()}}

function photoData(file){return new Promise((res,rej)=>{let url=URL.createObjectURL(file),im=new Image();im.onload=()=>{let s=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);let png=/png|gif|webp/i.test(file.type);res({src:c.toDataURL(png?'image/png':'image/jpeg',.88),ar:c.width/c.height})};im.onerror=()=>{URL.revokeObjectURL(url);rej(Error('Could not open '+file.name))};im.src=url})}
// Size a picture track so it covers the whole frame (shapeSize: height = size*W/1280*2).
function coverSize(ar){let W=canvas.width,H=canvas.height,h=Math.max(H,W/ar)*1.01;return h*1280/(2*W)}
const textSize=frac=>frac*canvas.height*1280/canvas.width;
const frameW=()=>canvas.width*720/canvas.height;

async function importPending(){
  let list=ordered();if(!list.length)return;pending=[];sync();
  let vids=list.filter(p=>p.kind==='video').map(p=>p.file),before=clips.length;
  if(vids.length){await importFiles(vids);let pl=PLATFORMS.find(p=>p.id===platform);if(pl.aspect!=='16:9')for(let c of clips.slice(before))c.fit='cover';render()}
  let at=total();
  for(let p of list.filter(p=>p.kind==='image')){try{let {src,ar}=await photoData(p.file);createGraphicTrack('shape');let t=graphicTracks.at(-1);Object.assign(t,{name:p.file.name.replace(/\.[^.]+$/,'')||'Photo',shape:'brand:logo',logoSrc:src,logoAR:ar,size:coverSize(ar),x:50,y:50,offset:at,length:PHOTO_SECONDS,animation:'none',background:false,outline:false});at+=PHOTO_SECONDS}catch(e){toast(e.message)}}
  list.forEach(p=>URL.revokeObjectURL(p.url));
  renderGraphicTracks();
}

function addTemplate(tp){
  let D=total()||tp.dur;
  for(let s of tp.tracks){let [offset,length]=s.at(D);createGraphicTrack('text');let t=graphicTracks.at(-1);
    Object.assign(t,{name:s.text.split('\n')[0].slice(0,24),text:s.text,color:s.color,size:textSize(fitH(s,frameW()*(s.x&&s.x!==50?.5:1))),x:s.x||50,y:s.y,bold:true,background:!!s.plate,animation:s.anim,offset:Math.round(offset*10)/10,length:Math.max(.5,Math.round(length*10)/10)});
    if(s.box)Object.assign(t,{boxColor:s.box,boxOpacity:1,boxPad:28,boxRadius:18})}
  renderGraphicTracks();
}

async function start(){
  let go=document.getElementById('vsGo');go.disabled=true;
  try{applyAspect();await importPending();let tp=TEMPLATES.find(t=>t.id===template);if(tp)addTemplate(tp);
    if($('projectName')&&tp)$('projectName').value=PLATFORMS.find(p=>p.id===platform).name+' · '+tp.name;
    template=null;close();await seekTimeline(0);
    toast(clips.length||graphicTracks.length?'Your video is ready to edit.':'Add a video with “＋ Video track” to get going.')}
  catch(e){toast(e.message)}finally{go.disabled=false}
}

// Media arriving from elsewhere (the dashboard's "Use in Studio", Vault picks, projects) means the
// person is already editing, so get the start screen out of the way.
const importFromVault=window.importVaultItem;window.importVaultItem=importVaultItem=function(...a){close();return importFromVault.apply(this,a)};
const restoreFromFile=restoreProject;restoreProject=function(...a){close();return restoreFromFile.apply(this,a)};

build();
window.veShowStart=open;
// A way back to this screen from the editor.
let back=document.createElement('button');back.type='button';back.textContent='⌂ Start';back.title='Back to the start screen';back.onclick=open;
document.querySelector('.top .brand')?.after(back);
})();
