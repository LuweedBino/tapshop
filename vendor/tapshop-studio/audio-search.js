// Smart search and discovery for AUDIO_LIBRARY (music + sound effects): typo-tolerant search with weighted fields,
// one-tap quick filters, pace (BPM) and length filters, "similar vibes", and favorites / recently used (kept on this device).
// Loaded after video-sfx.js (which builds AUDIO_LIBRARY). All functions are on window.
(()=>{
const lib=()=>window.AUDIO_LIBRARY||[];
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9#♯♭\s-]/g,' ');
const words=s=>norm(s).split(/[\s-]+/).filter(w=>w.length>1);
const STOP=new Set(['the','and','for','with','a','an','of','to','in','on','my','your','you','it','is','at','vs','or']);

// How well one typed word matches one word in a field: 1 = same word or a start of it ('skincar' → 'skincare'),
// 0.8 = inside it ('care' in 'skincare'), 0.7 = one typo for words of 5+ letters (two for 8+), 0 = no match.
function lev(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;let p=[...Array(b.length+1).keys()];
  for(let i=1;i<=a.length;i++){const c=[i];let lo=i;for(let j=1;j<=b.length;j++){c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));lo=Math.min(lo,c[j])}if(lo>max)return max+1;p=c}return p[b.length]}
function wordMatch(q,w){if(w===q||w.startsWith(q))return 1;if(q.length>=4&&w.includes(q))return .8;if(q.length<5)return 0;
  const max=q.length>=8?2:1;if(lev(q,w,max)<=max)return .7;if(w.length>q.length&&lev(q,w.slice(0,q.length),max)<=max)return .7;return 0}
const fieldMatch=(q,ws)=>ws.reduce((m,w)=>Math.max(m,wordMatch(q,w)),0);

const FIELDS=[['title',10],['useCases',6],['moods',5],['keywords',3],['category',3]];
const prep=new WeakMap(),fieldsOf=t=>{let f=prep.get(t);if(!f){f={};for(const [k] of FIELDS)f[k]=words([].concat(t[k]||[]).join(' '));prep.set(t,f)}return f};

// Pace and length.
const PACES=[{id:'slow',label:'Slow (< 90 BPM)',test:t=>t.bpm!=null&&t.bpm<90},{id:'medium',label:'Medium (90–120 BPM)',test:t=>t.bpm!=null&&t.bpm>=90&&t.bpm<=120},{id:'fast',label:'Fast (> 120 BPM)',test:t=>t.bpm!=null&&t.bpm>120}];
window.getPaceFilters=()=>PACES.map(({id,label})=>({id,label}));

// One-tap chips for creators. Each matches by type/flags or by words in its moods, uses, keywords and title.
const has=(t,re)=>re.test([t.title,...(t.moods||[]),...(t.useCases||[]),...(t.keywords||[]),t.category].join(' ').toLowerCase());
const QUICK=[
  {id:'music',label:'All music',emoji:'🎵',test:t=>t.type==='music'},
  {id:'sfx',label:'Sound effects',emoji:'🔊',test:t=>t.type==='sfx'},
  {id:'voice',label:'Voiceover safe',emoji:'🎙️',test:t=>t.voiceoverSafe===true},
  {id:'hooks',label:'2-second hooks',emoji:'⚡',test:t=>has(t,/urgent|hook|attention|scroll|punchy|impact|warning|scam|drop|hype/)},
  {id:'cozy',label:'Aesthetic & cozy',emoji:'☕',test:t=>t.type==='music'&&has(t,/lo-?fi|warm|calm|cozy|unbox|aesthetic|soft|dreamy|chill|smooth/)},
  {id:'energy',label:'High energy & sales',emoji:'🔥',test:t=>t.type==='music'&&(has(t,/upbeat|fast|sale|fitness|energ|hype|driving|gym|dance|exciting|black friday/)||t.bpm>=128)},
  {id:'story',label:'Cinematic & story',emoji:'🎬',test:t=>t.type==='music'&&has(t,/cinematic|suspense|emotional|dramatic|story|moody|mysterious|epic|tense|heartfelt|nostalgic/)}];
window.getQuickFilters=()=>QUICK.map(q=>({...q,count:lib().filter(q.test).length}));

// searchAudio(query, {type, filter, pace, voiceoverSafe, favorites, recent, minDuration, maxDuration, limit})
// → tracks, best first, each with ._score. An empty query keeps library order (filters still apply).
window.searchAudio=function(query='',o={}){
  const qs=words(query).filter(w=>!STOP.has(w)),quick=QUICK.find(q=>q.id===o.filter),pace=PACES.find(p=>p.id===o.pace),favs=o.favorites&&new Set(getFavorites()),rec=o.recent&&getRecent();
  let list=lib().filter(t=>(!o.type||t.type===o.type)&&(!quick||quick.test(t))&&(!pace||pace.test(t))&&(o.voiceoverSafe==null||!!t.voiceoverSafe===!!o.voiceoverSafe)&&(!favs||favs.has(t.id))&&(!rec||rec.includes(t.id))
    &&(o.minDuration==null||t.anyLength||t.durationSeconds>=o.minDuration)&&(o.maxDuration==null||t.anyLength||t.durationSeconds<=o.maxDuration));
  if(rec)list.sort((a,b)=>rec.indexOf(a.id)-rec.indexOf(b.id));
  if(!qs.length)return list.slice(0,o.limit||Infinity).map(t=>Object.assign(t,{_score:0}));
  const scored=[];for(const t of list){const f=fieldsOf(t);let score=0,hit=0;
    for(const q of qs){let got=0;for(const [k,w] of FIELDS){const m=fieldMatch(q,f[k]);if(m)got+=w*m}if(got){hit++;score+=got}}
    if(!hit)continue;if(hit===qs.length&&qs.length>1)score+=5;if(favs===undefined&&isFavorite(t.id))score+=1;scored.push(Object.assign(t,{_score:Math.round(score*10)/10}))}
  return scored.sort((a,b)=>b._score-a._score).slice(0,o.limit||Infinity)};

// Tracks that feel alike: shared moods (×3), shared use-case words (×2), close tempo (within 15 BPM), same category, same type only.
window.getSimilarTracks=function(trackId,limit=4){const a=lib().find(t=>t.id===trackId);if(!a)return [];
  const am=new Set(a.moods||[]),au=new Set(words((a.useCases||[]).join(' ')).filter(w=>!STOP.has(w)));
  return lib().filter(t=>t!==a&&t.type===a.type).map(t=>{let s=0;for(const m of t.moods||[])if(am.has(m))s+=3;for(const w of new Set(words((t.useCases||[]).join(' '))))if(au.has(w))s+=2;
    if(a.bpm!=null&&t.bpm!=null){const d=Math.abs(a.bpm-t.bpm);if(d<=15)s+=(16-d)/4}if(t.category===a.category)s+=1;return [t,s]})
    .filter(([,s])=>s>0).sort((x,y)=>y[1]-x[1]).slice(0,limit).map(([t])=>t)};

// Favorites and recently used, saved on this device.
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}},write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
window.getFavorites=()=>read('tapshop-audio-favs');
window.isFavorite=id=>getFavorites().includes(id);
window.toggleFavorite=id=>{const f=getFavorites(),on=!f.includes(id);write('tapshop-audio-favs',on?[...f,id]:f.filter(x=>x!==id));return on};
window.getRecent=()=>read('tapshop-audio-recent');
window.recordRecent=id=>{if(!id)return;write('tapshop-audio-recent',[id,...getRecent().filter(x=>x!==id)].slice(0,12))};
// The older simple search now uses this one.
window.AUDIO_LIBRARY_SEARCH=q=>searchAudio(q);
})();
