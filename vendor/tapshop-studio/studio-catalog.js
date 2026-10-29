// Shapes, stickers and word stickers shared by the design studio (index.html) and the video
// editor (video.html). Shapes are SVG paths in a 100×100 box; `ar` is their natural width/height.
function studioPoly(n,rot=-90,inner=null){let pts=[],k=inner?2*n:n;for(let j=0;j<k;j++){let a=(rot+j*360/k)*Math.PI/180,rad=inner&&j%2?48*inner:48;pts.push((50+rad*Math.cos(a)).toFixed(1)+' '+(50+rad*Math.sin(a)).toFixed(1))}return 'M'+pts.join(' L')+' Z'}
const studioCirc=(cx,cy,rr)=>`M${cx-rr} ${cy} A${rr} ${rr} 0 1 0 ${cx+rr} ${cy} A${rr} ${rr} 0 1 0 ${cx-rr} ${cy} Z`;
const STUDIO_SHAPES=[
 {group:'Basic',id:'rect',icon:'▢',label:'Rectangle',d:'M8 8 H92 V92 H8 Z'},
 {group:'Basic',id:'circle',icon:'○',label:'Circle',d:studioCirc(50,50,46)},
 {group:'Basic',id:'triangle',icon:'△',label:'Triangle',d:'M50 4 L96 92 L4 92 Z',lock:true},
 {group:'Basic',id:'diamond',icon:'◇',label:'Diamond',d:'M50 2 L98 50 L50 98 L2 50 Z',lock:true},
 {group:'Basic',id:'pentagon',icon:'⬠',label:'Pentagon',d:studioPoly(5),lock:true},
 {group:'Basic',id:'hexagon',icon:'⬡',label:'Hexagon',d:studioPoly(6,0),lock:true},
 {group:'Basic',id:'octagon',icon:'⯃',label:'Octagon',d:studioPoly(8,22.5),lock:true},
 {group:'Basic',id:'half',icon:'◓',label:'Half circle',d:'M0 100 A50 100 0 0 1 100 100 Z',ar:2},
 {group:'Basic',id:'ring',icon:'◎',label:'Ring',d:studioCirc(50,50,48)+' '+studioCirc(50,50,28),lock:true},
 {group:'Basic',id:'pill',icon:'⬭',label:'Pill / button',d:'M19 0 H81 A19 50 0 0 1 81 100 H19 A19 50 0 0 1 19 0 Z',ar:2.6},
 {group:'Stars & badges',id:'star',icon:'★',label:'Star',d:studioPoly(5,-90,.42),lock:true},
 {group:'Stars & badges',id:'sparkle',icon:'✦',label:'Sparkle',d:'M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z',lock:true},
 {group:'Stars & badges',id:'burst',icon:'✺',label:'Burst',d:studioPoly(12,-90,.72),lock:true},
 {group:'Stars & badges',id:'seal',icon:'❂',label:'Seal',d:studioPoly(24,-90,.9),lock:true},
 {group:'Stars & badges',id:'banner',icon:'🎗',label:'Banner',d:'M0 18 H100 L88 50 L100 82 H0 L12 50 Z',ar:3},
 {group:'Stars & badges',id:'tag',icon:'🏷',label:'Price tag',d:'M2 50 L26 12 H98 V88 H26 Z '+studioCirc(28,50,7),ar:1.8},
 {group:'Stars & badges',id:'heart',icon:'♥',label:'Heart',d:'M50 94 C20 72 2 54 2 31 C2 14 15 3 29 3 C39 3 46 9 50 17 C54 9 61 3 71 3 C85 3 98 14 98 31 C98 54 80 72 50 94 Z',lock:true},
 {group:'Chat bubbles',id:'speech',icon:'💬',label:'Speech bubble',d:'M12 4 H88 Q98 4 98 14 V58 Q98 68 88 68 H42 L18 94 L24 68 H12 Q2 68 2 58 V14 Q2 4 12 4 Z',ar:1.3},
 {group:'Chat bubbles',id:'speechR',icon:'🗨',label:'Reply bubble',d:'M12 4 H88 Q98 4 98 14 V58 Q98 68 88 68 H76 L82 94 L58 68 H12 Q2 68 2 58 V14 Q2 4 12 4 Z',ar:1.3},
 {group:'Chat bubbles',id:'chat',icon:'🗪',label:'Round bubble',d:'M50 4 C76 4 98 20 98 40 C98 60 76 76 50 76 C44 76 38 75 33 73 L10 94 L17 68 C8 61 2 51 2 40 C2 20 24 4 50 4 Z',ar:1.2},
 {group:'Chat bubbles',id:'thought',icon:'💭',label:'Thought bubble',d:'M26 64 C10 64 2 52 7 42 C1 31 11 18 25 21 C28 8 45 2 56 11 C64 2 82 5 86 18 C98 21 101 36 93 44 C99 56 89 67 76 64 C70 72 54 73 47 66 C40 71 30 70 26 64 Z '+studioCirc(24,80,7)+' '+studioCirc(11,93,4.5),ar:1.25},
 {group:'Chat bubbles',id:'shout',icon:'🗯',label:'Shout bubble',d:'M50 2 L58 18 L76 6 L74 26 L96 22 L84 40 L100 52 L80 60 L90 80 L68 74 L64 96 L50 80 L36 96 L32 74 L10 82 L20 60 L0 50 L16 40 L4 22 L26 26 L24 6 L42 18 Z',lock:true},
 {group:'Arrows & lines',id:'arrow',icon:'➜',label:'Arrow',d:'M2 34 H60 V10 L98 50 L60 90 V66 H2 Z',ar:1.8},
 {group:'Arrows & lines',id:'arrow2',icon:'⇔',label:'Two-way arrow',d:'M2 50 L28 14 V34 H72 V14 L98 50 L72 86 V66 H28 V86 Z',ar:2},
 {group:'Arrows & lines',id:'chevron',icon:'❯',label:'Chevron',d:'M10 0 H50 L90 50 L50 100 H10 L50 50 Z',lock:true},
 {group:'Arrows & lines',id:'curve',icon:'⤴',label:'Curved arrow',d:'M8 96 C8 50 30 26 62 24 V4 L96 36 L62 68 V46 C42 48 28 64 28 96 Z',lock:true},
 {group:'Arrows & lines',id:'line',icon:'━',label:'Line',d:'M0 0 H100 V100 H0 Z',ar:16,lock:false},
 {group:'Symbols',id:'check',icon:'✓',label:'Check mark',d:'M4 54 L20 38 L40 58 L80 14 L96 30 L40 90 Z',lock:true},
 {group:'Symbols',id:'cross',icon:'✕',label:'Cross',d:'M18 4 L50 36 L82 4 L96 18 L64 50 L96 82 L82 96 L50 64 L18 96 L4 82 L36 50 L4 18 Z',lock:true},
 {group:'Symbols',id:'plus',icon:'＋',label:'Plus',d:'M38 4 H62 V38 H96 V62 H62 V96 H38 V62 H4 V38 H38 Z',lock:true},
 {group:'Symbols',id:'pin',icon:'📍',label:'Location pin',d:'M50 98 C50 98 14 60 14 36 C14 16 30 2 50 2 C70 2 86 16 86 36 C86 60 50 98 50 98 Z '+studioCirc(50,36,14),ar:.8},
 {group:'Symbols',id:'bolt',icon:'⚡',label:'Lightning',d:'M60 2 L14 56 H46 L38 98 L86 40 H54 Z',ar:.75},
 {group:'Symbols',id:'moon',icon:'☾',label:'Moon',d:'M62 4 A46 46 0 1 0 96 66 A38 38 0 1 1 62 4 Z',lock:true},
 {group:'Symbols',id:'drop',icon:'💧',label:'Drop',d:'M50 2 C50 2 14 46 14 66 C14 86 30 98 50 98 C70 98 86 86 86 66 C86 46 50 2 50 2 Z',ar:.75},
 {group:'Symbols',id:'cloud',icon:'☁',label:'Cloud',d:'M24 80 C8 80 0 66 6 54 C0 42 12 28 26 32 C28 16 46 8 58 18 C66 8 86 12 88 28 C100 32 102 50 92 58 C98 70 88 82 74 80 Z',ar:1.4},
 {group:'Symbols',id:'play',icon:'▶',label:'Play button',d:studioCirc(50,50,48)+' M38 28 L74 50 L38 72 Z',lock:true},
 {group:'Symbols',id:'sun',icon:'☀',label:'Sun',d:studioPoly(12,-90,.78),lock:true},
];
const STUDIO_SHAPE_BY_ID=Object.fromEntries(STUDIO_SHAPES.map(x=>[x.id,x]));
const STUDIO_TEXT_BOX={speech:[.08,.06,.92,.66],speechR:[.08,.06,.92,.66],chat:[.12,.1,.88,.7],thought:[.14,.12,.86,.6],shout:[.26,.28,.74,.72],banner:[.15,.22,.85,.78],tag:[.38,.16,.94,.84],pill:[.12,.12,.88,.88],star:[.32,.38,.68,.72],sparkle:[.3,.3,.7,.7],burst:[.22,.22,.78,.78],seal:[.18,.18,.82,.82],heart:[.2,.14,.8,.62],triangle:[.3,.5,.7,.88],arrow:[.06,.36,.6,.64],arrow2:[.3,.36,.7,.64],pin:[.3,.22,.7,.5],cloud:[.16,.3,.84,.76],play:[.6,.6,.6,.6],circle:[.15,.15,.85,.85],ring:[.3,.3,.7,.7],half:[.15,.5,.85,.95],octagon:[.15,.15,.85,.85],hexagon:[.14,.2,.86,.8],pentagon:[.2,.3,.8,.8],diamond:[.25,.25,.75,.75]};
const STUDIO_EMOJI_FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const STUDIO_STICKER_SETS={
 'Faces':'😀 grin|😂 laughing|🤣 rolling|😍 heart eyes|🥰 in love|😘 kiss|😎 cool|🤩 star struck|🥳 party|😜 silly|🤔 thinking|😴 sleepy|😱 scream|😭 crying|😡 angry|🤯 mind blown|🥺 pleading|😇 angel|🤗 hug|🙄 eye roll|😬 grimace|🤫 shh|🤑 money|🤠 cowboy|👻 ghost|💀 skull|🤖 robot|👽 alien|💩 poo|😺 happy cat',
 'Hearts & love':'❤️ red heart|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart|💖 sparkling heart|💕 two hearts|💘 cupid|💝 heart gift|💔 broken heart|❣️ heart mark|💋 kiss mark|💌 love letter|🌹 rose|💐 bouquet',
 'Hands':'👍 thumbs up|👎 thumbs down|👏 clap|🙌 hooray|👋 wave|✌️ peace|🤞 fingers crossed|👌 ok|🤙 call me|💪 strong|🙏 thank you|👉 point right|👈 point left|👆 point up|👇 point down|☝️ one|✍️ writing|🤝 deal|👀 eyes|🫶 heart hands',
 'Party':'🎉 party popper|🎊 confetti|🎈 balloon|🎁 gift|🎂 cake|🍾 bubbly|🥂 cheers|🎆 fireworks|✨ sparkles|🌟 glowing star|⭐ star|🏆 trophy|🥇 gold medal|🎀 bow|🪅 piñata|🎵 note|🎶 music|🎤 mic',
 'Food & drink':'🍕 pizza|🍔 burger|🍟 fries|🌮 taco|🍣 sushi|🍩 donut|🍪 cookie|🧁 cupcake|🍦 ice cream|🍫 chocolate|🍓 strawberry|🍉 watermelon|🍑 peach|🥑 avocado|🍋 lemon|🍒 cherries|☕ coffee|🧋 bubble tea|🍹 cocktail|🍺 beer',
 'Nature':'☀️ sun|🌈 rainbow|⚡ zap|🔥 fire|❄️ snow|🌙 moon|☁️ cloud|🌧️ rain|🌊 wave|🌸 blossom|🌻 sunflower|🌷 tulip|🌴 palm tree|🍀 lucky clover|🍁 leaf|🌵 cactus|🌍 earth|💧 drop',
 'Animals':'🐶 dog|🐱 cat|🦊 fox|🐻 bear|🐼 panda|🐨 koala|🐯 tiger|🦁 lion|🐸 frog|🐵 monkey|🦄 unicorn|🐝 bee|🦋 butterfly|🐢 turtle|🐙 octopus|🦈 shark|🐬 dolphin|🦜 parrot|🐧 penguin|🐣 chick',
 'Things':'📱 phone|💻 laptop|📸 camera|🎥 movie camera|🎧 headphones|🎮 game|💡 idea|📌 pin|📍 location|🔔 bell|📢 announce|📣 megaphone|🛍️ shopping|🛒 cart|💰 money bag|💵 cash|💳 card|💎 gem|👑 crown|🕶️ shades|👗 dress|👟 sneaker|💄 lipstick|⏰ alarm|📅 calendar|📦 package|🔑 key|🚀 rocket|✈️ plane|🚗 car',
 'Signs':'✅ check|❌ no|⚠️ warning|❗ important|❓ question|💯 hundred|🆕 new|🆓 free|🔝 top|🔴 red dot|🟢 green dot|➡️ arrow|⬆️ up|🔄 again|♻️ recycle|💬 chat|💭 thought|🗯️ shout|💥 boom|💫 dizzy|🎯 target|☮️ peace sign'};
const STUDIO_STICKERS=Object.entries(STUDIO_STICKER_SETS).flatMap(([group,list])=>list.split('|').map(x=>{let k=x.indexOf(' ');return {group,emoji:x.slice(0,k),label:x.slice(k+1)}}));
const STUDIO_WORD_STICKERS=[['burst','SALE','#ff2d55','#ffffff','Impact'],['burst','NEW','#ffcc00','#222222','Impact'],['seal','50% OFF','#ff3b30','#ffffff','Impact'],['pill','SHOP NOW','#111111','#ffffff','Arial',1],['pill','LINK IN BIO','#9b6cf0','#ffffff','Arial',1],
 ['pill','SWIPE UP ⬆','#00c2a8','#ffffff','Arial',1],['pill','FOLLOW','#e1306c','#ffffff','Arial',1],['pill','SUBSCRIBE','#ff0000','#ffffff','Arial',1],['banner','LIMITED TIME','#ff9500','#ffffff','Impact'],['banner','BEST SELLER','#1c1c1e','#ffd60a','Impact'],
 ['tag','$9.99','#34c759','#ffffff','Arial',1],['tag','FREE','#007aff','#ffffff','Impact'],['speech','OMG!','#ffffff','#111111','Impact',0,1],['shout','WOW!','#ffcc00','#ff2d55','Impact'],['shout','BOOM!','#ff3b30','#ffffff','Impact'],
 ['chat','Thank you!','#ff9ff3','#3b0d2c','Trebuchet MS',1],['thought','Hmm…','#ffffff','#333333','Georgia',0,1],['star','HOT','#ff3b30','#ffffff','Impact'],['pill','● LIVE','#ff3b30','#ffffff','Arial',1],['pill','COMING SOON','#222222','#ffffff','Arial',1],
 ['banner','GIVEAWAY','#af52de','#ffffff','Impact'],['seal','SOLD OUT','#8e8e93','#ffffff','Impact'],['pill','NEW DROP','#000000','#ffffff','Impact'],['heart','LOVE','#ff2d55','#ffffff','Impact'],['burst','YAY!','#34c759','#ffffff','Impact'],
 ['speech','Hi!','#4cd964','#ffffff','Trebuchet MS',1],['pill','TAP HERE 👆','#ffcc00','#111111','Arial',1],['banner','THANK YOU','#ff6b6b','#ffffff','Impact'],['seal','100%','#5856d6','#ffffff','Impact'],['pill','BOOK NOW','#0a84ff','#ffffff','Arial',1]];
