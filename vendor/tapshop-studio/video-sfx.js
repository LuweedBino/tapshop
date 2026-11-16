// Sound effects: 50 short one-shot sounds made on the device (no audio files), for cuts, text pop-ups and ads.
// Each effect is a function (ctx, out, t) that builds its sound on any audio context (live or offline), starting at time t,
// and returns how long it lasts. Everything goes through a limiter (veLimiter in video.js) so nothing clips.
// TapSFX.play(key) plays one now, TapSFX.file(key) makes a WAV, TapSFX.add(key) puts it on the timeline at the playhead.
(()=>{
const bufs=new WeakMap();
// White and pink noise (pink = softer, fuller hiss, Paul Kellet's filter), 1 s each, made once per context.
const noise=(ctx,pink)=>{let m=bufs.get(ctx);if(!m)bufs.set(ctx,m={});const k=pink?'p':'w';if(m[k])return m[k];
  const SR=ctx.sampleRate,b=ctx.createBuffer(1,SR,SR),d=b.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<SR;i++){const w=Math.random()*2-1;if(!pink){d[i]=w;continue}
    b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
  return m[k]=b};
const env=(g,t,peak,att,dec)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(0.0001,t+att+dec)};
const pan=(ctx,v,to)=>{if(!ctx.createStereoPanner)return to;const p=ctx.createStereoPanner();p.pan.value=v;p.connect(to);return p};
const src=(ctx,t,d,pink)=>{const s=ctx.createBufferSource();s.buffer=noise(ctx,pink);s.loop=true;s.start(t,Math.random()*.5);s.stop(t+d+.02);return s};
const osc=(ctx,type,f,t,d)=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+d+.02);return o};
const drive=(ctx,k,to)=>{const w=ctx.createWaveShaper(),c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}w.curve=c;w.connect(to);return w};
// A bell-ish tone: sine partials [ratio, level, decay].
const bell=(ctx,out,t,f,amp,parts)=>{for(const [r,v,dc] of parts){const o=osc(ctx,'sine',f*r,t,dc+.01),g=ctx.createGain();env(g,t,v*amp,.002,dc);o.connect(g);g.connect(out)}};

const FX={
  // 1. Pink noise through a band-pass that sweeps up fast, moving left to right, fading out smoothly.
  swoosh(ctx,out,t){const s=src(ctx,t,.5,true),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=pan(ctx,-.6,out);f.type='bandpass';f.Q.value=1.2;
    f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(7000,t+.42);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.14);g.gain.exponentialRampToValueAtTime(0.0001,t+.5);
    if(p.pan){p.pan.setValueAtTime(-.6,t);p.pan.linearRampToValueAtTime(.6,t+.45)}s.connect(f);f.connect(g);g.connect(p);return .5},
  // 2. Sine bending up from 200 to 600 Hz in 80 ms, dry.
  pop(ctx,out,t){const o=osc(ctx,'sine',200,t,.15),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(600,t+.08);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.75,t+.006);g.gain.setValueAtTime(.75,t+.05);g.gain.exponentialRampToValueAtTime(0.0001,t+.15);o.connect(g);g.connect(out);return .15},
  // 3. A metal "ka" then two bright FM bells, shimmering as they ring out.
  cash(ctx,out,t){const k=src(ctx,t,.04),kf=ctx.createBiquadFilter(),kg=ctx.createGain();kf.type='highpass';kf.frequency.value=3500;env(kg,t,.35,.001,.035);k.connect(kf);kf.connect(kg);kg.connect(out);
    const sh=ctx.createGain(),lfo=osc(ctx,'sine',11,t,.8),ld=ctx.createGain();sh.gain.value=.85;ld.gain.value=.15;lfo.connect(ld);ld.connect(sh.gain);sh.connect(out);
    [[2093,.05,-.3],[2637,.13,.3]].forEach(([f,dt,pn])=>{const u=t+dt,c=osc(ctx,'sine',f,u,.65),m=osc(ctx,'sine',f*1.41,u,.65),mg=ctx.createGain(),g=ctx.createGain();
      mg.gain.setValueAtTime(f*2.2,u);mg.gain.exponentialRampToValueAtTime(f*.15,u+.4);m.connect(mg);mg.connect(c.frequency);env(g,u,.32,.002,.62);c.connect(g);g.connect(pan(ctx,pn,sh));
      bell(ctx,pan(ctx,pn,sh),u,f,1,[[2.76,.06,.25],[5.4,.03,.12]])});return .8},
  // 4. Two very short bursts of crisp high-passed noise, 60 ms apart.
  shutter(ctx,out,t){[[0,5200,.8,.018],[.06,3600,.6,.03]].forEach(([dt,hp,v,d])=>{const u=t+dt,s=src(ctx,u,d+.01),f=ctx.createBiquadFilter(),b=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=hp;b.type='peaking';b.frequency.value=hp*1.3;b.gain.value=6;
    env(g,u,v,.0008,d);s.connect(f);f.connect(b);b.connect(g);g.connect(out)});return .2},
  // 5. A quick rising run of high bells with a ping-pong stereo echo.
  sparkle(ctx,out,t){const wet=ctx.createGain(),dl=ctx.createDelay(1),dr=ctx.createDelay(1),fb=ctx.createGain(),pl=pan(ctx,-.8,out),pr=pan(ctx,.8,out),fade=ctx.createGain();
    dl.delayTime.value=.09;dr.delayTime.value=.14;fb.gain.value=.38;wet.gain.value=.5;fade.gain.setValueAtTime(1,t);fade.gain.setValueAtTime(1,t+.75);fade.gain.linearRampToValueAtTime(0,t+1);
    wet.connect(dl);dl.connect(dr);dr.connect(fb);fb.connect(dl);dl.connect(fade);dr.connect(fade);fade.connect(pl);fade.connect(pr);
    [1047,1319,1568,1760,2093,2637,3136,3520].forEach((f,i)=>{const u=t+i*.045,g=ctx.createGain();g.gain.value=1;g.connect(out);g.connect(wet);bell(ctx,g,u,f,.55+i*.04,[[1,.22,.32],[2.76,.07,.14]])});return 1},
  // 6. A heavy sine diving from 120 to 35 Hz, lightly driven so phones can still hear it.
  drop(ctx,out,t){const o=osc(ctx,'sine',120,t,.9),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,2.2,lv);lv.gain.value=.85;lv.connect(out);o.frequency.exponentialRampToValueAtTime(35,t+.55);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.95,t+.008);g.gain.setValueAtTime(.95,t+.3);g.gain.exponentialRampToValueAtTime(0.0001,t+.9);o.connect(g);g.connect(w);
    const c=osc(ctx,'triangle',900,t,.03),cg=ctx.createGain();c.frequency.exponentialRampToValueAtTime(120,t+.025);env(cg,t,.35,.001,.025);c.connect(cg);cg.connect(out);return .9},
  // 7. A tiny dry wooden knock.
  click(ctx,out,t){const s=src(ctx,t,.03),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1700;f.Q.value=9;env(g,t,1.6,.0006,.025);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',1050,t,.05),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(820,t+.03);env(og,t,.35,.0008,.04);o.connect(og);og.connect(out);return .05},
  // 8. Two low buzzes, each two saws a little out of tune with each other.
  buzz(ctx,out,t){[0,.19].forEach(dt=>{const u=t+dt,f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.value=1400;f.Q.value=2;g.gain.setValueAtTime(0.0001,u);g.gain.exponentialRampToValueAtTime(.32,u+.008);g.gain.setValueAtTime(.32,u+.12);g.gain.exponentialRampToValueAtTime(0.0001,u+.15);
    f.connect(g);g.connect(out);for(const fr of [98,104])osc(ctx,'sawtooth',fr,u,.16).connect(f)});return .35},
  // 9. Two warm notes a major third apart, half marimba, half bell.
  ding(ctx,out,t){[[1047,0,-.15],[1319,.09,.15]].forEach(([f,dt,p])=>bell(ctx,pan(ctx,p,out),t+dt,f,1,[[1,.32,.5],[4,.06,.05],[2.76,.07,.28],[5.4,.02,.1]]));return .6},
  // 10. A synth tone and noise sweeping up faster and louder, then cut right at the end.
  riser(ctx,out,t){const d=1.2,o=osc(ctx,'sawtooth',180,t,d),o2=osc(ctx,'sawtooth',181.5,t,d),f=ctx.createBiquadFilter(),g=ctx.createGain(),n=src(ctx,t,d),nf=ctx.createBiquadFilter(),ng=ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(1500,t+d);o2.frequency.exponentialRampToValueAtTime(1512,t+d);f.type='lowpass';f.Q.value=4;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(7000,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+d-.02);g.gain.linearRampToValueAtTime(0,t+d);o.connect(f);o2.connect(f);f.connect(g);g.connect(out);
    nf.type='bandpass';nf.Q.value=1.4;nf.frequency.setValueAtTime(500,t);nf.frequency.exponentialRampToValueAtTime(9000,t+d);ng.gain.setValueAtTime(0.0001,t);ng.gain.exponentialRampToValueAtTime(.55,t+d-.02);ng.gain.linearRampToValueAtTime(0,t+d);n.connect(nf);nf.connect(ng);ng.connect(out);return d},
  // 11. A gritty record scratch: a quick push forward, then a long pull down.
  scratch(ctx,out,t){const o=osc(ctx,'sawtooth',300,t,.3),n=src(ctx,t,.3),nf=ctx.createBiquadFilter(),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,4,lv);lv.gain.value=.45;lv.connect(out);
    o.frequency.exponentialRampToValueAtTime(1300,t+.06);o.frequency.exponentialRampToValueAtTime(90,t+.28);nf.type='bandpass';nf.Q.value=3;nf.frequency.setValueAtTime(900,t);nf.frequency.exponentialRampToValueAtTime(3500,t+.06);nf.frequency.exponentialRampToValueAtTime(300,t+.28);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.8,t+.01);g.gain.setValueAtTime(.8,t+.2);g.gain.exponentialRampToValueAtTime(0.0001,t+.3);o.connect(g);n.connect(nf);nf.connect(g);g.connect(w);return .3},
  // 12. A short noise swoosh that lands on a tight thud.
  whoosh(ctx,out,t){const s=src(ctx,t,.22,true),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.Q.value=1;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(4500,t+.18);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.7,t+.17);g.gain.exponentialRampToValueAtTime(0.0001,t+.22);s.connect(f);f.connect(g);g.connect(out);
    const u=t+.17,o=osc(ctx,'sine',170,u,.23),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(55,u+.12);env(og,u,.9,.003,.2);o.connect(og);og.connect(out);
    const k=src(ctx,u,.03),kf=ctx.createBiquadFilter(),kg=ctx.createGain();kf.type='lowpass';kf.frequency.value=2500;env(kg,u,.35,.001,.025);k.connect(kf);kf.connect(kg);kg.connect(out);return .4},
  // 13. A trailer boom: a driven sine diving from 90 to 30 Hz under a burst of dark noise.
  impact(ctx,out,t){const o=osc(ctx,'sine',90,t,1.4),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,3,lv);lv.gain.value=.8;lv.connect(out);o.frequency.exponentialRampToValueAtTime(30,t+1.1);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(1,t+.005);g.gain.exponentialRampToValueAtTime(0.0001,t+1.4);o.connect(g);g.connect(w);
    const n=src(ctx,t,.7,true),nf=ctx.createBiquadFilter(),ng=ctx.createGain();nf.type='lowpass';nf.frequency.setValueAtTime(1800,t);nf.frequency.exponentialRampToValueAtTime(150,t+.6);env(ng,t,.9,.002,.65);n.connect(nf);nf.connect(ng);ng.connect(out);return 1.4},
  // 14. Two heartbeats, each a "lub" and a softer "dub".
  heartbeat(ctx,out,t){[[0,1],[.2,.65],[.8,1],[1,.65]].forEach(([dt,v])=>{const u=t+dt,o=osc(ctx,'sine',75,u,.25),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(42,u+.15);env(g,u,v,.006,.2);o.connect(g);g.connect(out)});return 1.25},
  // 15. A few uneven keyboard taps: a crisp click with a little low "thock" each.
  typing(ctx,out,t){[0,.09,.16,.27,.33,.45,.52].forEach((dt,i)=>{const u=t+dt,s=src(ctx,u,.025),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=2600+((i*733)%1400);f.Q.value=4;env(g,u,.9,.0005,.02);s.connect(f);f.connect(g);g.connect(pan(ctx,((i*37)%9-4)/10,out));
    const o=osc(ctx,'sine',190,u,.04),og=ctx.createGain();env(og,u,.22,.001,.03);o.connect(og);og.connect(out)});return .6},
  // 16. A soft two-note phone notification.
  notify(ctx,out,t){[[880,0],[1320,.12]].forEach(([f,dt])=>{const u=t+dt,o=osc(ctx,'triangle',f,u,.32),g=ctx.createGain();env(g,u,.35,.004,.28);o.connect(g);g.connect(out);bell(ctx,out,u,f,1,[[2,.06,.15]])});return .45},
  // 17. A cartoon spring: a sine sliding up with a wobble that settles.
  boing(ctx,out,t){const o=osc(ctx,'sine',120,t,.7),l=osc(ctx,'sine',17,t,.7),lg=ctx.createGain(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(380,t+.5);lg.gain.setValueAtTime(70,t);lg.gain.exponentialRampToValueAtTime(2,t+.65);l.connect(lg);lg.connect(o.frequency);
    env(g,t,.8,.004,.65);o.connect(g);g.connect(out);return .7},
  // 18. Choppy digital blips at random-sounding pitches, with crackle.
  glitch(ctx,out,t){const P=[1480,220,880,330,1760,440,1240,260,990,620];P.forEach((f,i)=>{const u=t+i*.035,o=osc(ctx,i%3?'square':'sawtooth',f,u,.03),g=ctx.createGain();g.gain.setValueAtTime(.16,u);g.gain.setValueAtTime(0,u+.028);o.connect(g);g.connect(pan(ctx,i%2?.5:-.5,out))});
    const n=src(ctx,t,.38),nf=ctx.createBiquadFilter(),ng=ctx.createGain();nf.type='highpass';nf.frequency.value=4000;for(let i=0;i<10;i++){ng.gain.setValueAtTime(i%2?0:.25,t+i*.038)}ng.gain.setValueAtTime(0,t+.38);n.connect(nf);nf.connect(ng);ng.connect(out);return .4},
  // 19. A harp running up a pentatonic scale, each string ringing on.
  harp(ctx,out,t){[523,587,659,784,880,1047,1175,1319,1568,1760].forEach((f,i)=>{const u=t+i*.05,o=osc(ctx,'triangle',f,u,.9),g=ctx.createGain();env(g,u,.22,.003,.85);o.connect(g);g.connect(pan(ctx,-.6+i*.13,out));bell(ctx,out,u,f,1,[[2,.05,.4]])});return 1.4},
  // 20. A classic game coin: two quick square notes.
  coin(ctx,out,t){const o=osc(ctx,'square',988,t,.42),f=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.setValueAtTime(1319,t+.08);f.type='lowpass';f.frequency.value=5000;g.gain.setValueAtTime(.18,t);g.gain.setValueAtTime(.18,t+.1);g.gain.exponentialRampToValueAtTime(0.0001,t+.42);o.connect(f);f.connect(g);g.connect(out);return .42},
  // 21. A clock: tick, tock, tick, tock.
  tick(ctx,out,t){[0,.25,.5,.75].forEach((dt,i)=>{const u=t+dt,s=src(ctx,u,.025),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=i%2?2400:4200;f.Q.value=6;env(g,u,1.2,.0005,.02);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',i%2?1300:1900,u,.04),og=ctx.createGain();env(og,u,.18,.001,.03);o.connect(og);og.connect(out)});return .8},
  // 22. A sci-fi zap: a bright saw diving down through a closing filter.
  zap(ctx,out,t){const o=osc(ctx,'sawtooth',2400,t,.25),f=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(150,t+.22);f.type='lowpass';f.frequency.setValueAtTime(6000,t);f.frequency.exponentialRampToValueAtTime(800,t+.22);env(g,t,.35,.002,.22);o.connect(f);f.connect(g);g.connect(out);return .25},
  // 23. A very short, airy flick to the side.
  swipe(ctx,out,t){const s=src(ctx,t,.15),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=pan(ctx,-.4,out);f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(9000,t+.12);env(g,t,.7,.03,.11);
    if(p.pan)p.pan.linearRampToValueAtTime(.5,t+.13);s.connect(f);f.connect(g);g.connect(p);return .15},
  // ---- 24–50 ----
  // A crowd clapping: many tiny filtered noise claps, swelling in and dying away.
  applause(ctx,out,t){const D=1.5;for(let i=0;i<70;i++){const u=t+Math.random()*D*.9,s=src(ctx,u,.03),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=900+Math.random()*1600;f.Q.value=1.2;
    env(g,u,Math.max(.01,.3*Math.min(1,(u-t)/.15+.2)*Math.min(1,(t+D-u)/.4)),.001,.025);s.connect(f);f.connect(g);g.connect(pan(ctx,Math.random()*1.6-.8,out))}return D},
  // A snare roll getting louder, then a hit.
  drumroll(ctx,out,t){const D=1.1;for(let u=t;u<t+D;u+=.045){const s=src(ctx,u,.05),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1900;f.Q.value=.7;env(g,u,.12+.4*(u-t)/D,.001,.045);s.connect(f);f.connect(g);g.connect(out)}
    const u=t+D,s=src(ctx,u,.45),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=3000;env(g,u,.7,.002,.42);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',130,u,.3),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(60,u+.25);env(og,u,.8,.002,.28);o.connect(og);og.connect(out);return D+.45},
  // Ba-dum-tss: two toms and a cymbal.
  rimshot(ctx,out,t){[[0,170],[.17,120]].forEach(([dt,f])=>{const u=t+dt,o=osc(ctx,'sine',f,u,.22),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(f*.6,u+.18);env(g,u,.85,.003,.2);o.connect(g);g.connect(out)});
    const u=t+.42,s=src(ctx,u,.6),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=6000;env(g,u,.55,.002,.58);s.connect(f);f.connect(g);g.connect(out);return 1.05},
  // A soft, heavy thud.
  thud(ctx,out,t){const o=osc(ctx,'sine',95,t,.32),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(40,t+.25);env(g,t,1,.002,.3);o.connect(g);g.connect(out);
    const s=src(ctx,t,.06),f=ctx.createBiquadFilter(),sg=ctx.createGain();f.type='lowpass';f.frequency.value=700;env(sg,t,.45,.001,.05);s.connect(f);f.connect(sg);sg.connect(out);return .32},
  // Wind chimes: a few high bells, scattered.
  chime(ctx,out,t){[2093,2637,3136,2349,2794,3520].forEach((f,i)=>bell(ctx,pan(ctx,i%2?.5:-.5,out),t+i*.11+(i%3)*.02,f,1,[[1,.18,.9],[2.76,.05,.4]]));return 1.5},
  // A video-game level up: a quick square arpeggio and a held top note.
  levelup(ctx,out,t){const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;lp.connect(out);[523,659,784,1047,1319].forEach((f,i)=>{const u=t+i*.06,o=osc(ctx,'square',f,u,.12),g=ctx.createGain();env(g,u,.16,.002,.1);o.connect(g);g.connect(lp)});
    const u=t+.3,o=osc(ctx,'square',1568,u,.45),g=ctx.createGain();env(g,u,.16,.003,.42);o.connect(g);g.connect(lp);return .75},
  // Sad trombone: three falling notes and a long wobbly one.
  wahwah(ctx,out,t){[[392,0,.32],[370,.36,.32],[349,.72,.32],[330,1.08,.75]].forEach(([fr,dt,d],i)=>{const u=t+dt,o=osc(ctx,'sawtooth',fr,u,d),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.Q.value=3;
    f.frequency.setValueAtTime(300,u);f.frequency.linearRampToValueAtTime(1400,u+d*.4);f.frequency.linearRampToValueAtTime(400,u+d);
    if(i===3){const l=osc(ctx,'sine',6,u,d),lg=ctx.createGain();lg.gain.value=9;l.connect(lg);lg.connect(o.frequency)}g.gain.setValueAtTime(0.0001,u);g.gain.exponentialRampToValueAtTime(.3,u+.03);g.gain.setValueAtTime(.3,u+d-.08);g.gain.exponentialRampToValueAtTime(0.0001,u+d);o.connect(f);f.connect(g);g.connect(out)});return 1.85},
  // A two-tone alarm.
  alarm(ctx,out,t){const o=osc(ctx,'square',880,t,.85),f=ctx.createBiquadFilter(),g=ctx.createGain();for(let i=0;i<4;i++)o.frequency.setValueAtTime(i%2?660:880,t+i*.2);f.type='lowpass';f.frequency.value=3000;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.01);g.gain.setValueAtTime(.14,t+.75);g.gain.exponentialRampToValueAtTime(0.0001,t+.85);o.connect(f);f.connect(g);g.connect(out);return .85},
  // A handful of bubbles rising.
  bubbles(ctx,out,t){[[0,420],[.07,610],[.15,380],[.21,720],[.3,520],[.38,860],[.47,470],[.55,940]].forEach(([dt,f],i)=>{const u=t+dt,o=osc(ctx,'sine',f,u,.07),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(f*2,u+.05);env(g,u,.4,.003,.05);o.connect(g);g.connect(pan(ctx,i%2?.4:-.4,out))});return .65},
  // A splash of water.
  splash(ctx,out,t){const s=src(ctx,t,.65,true),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.setValueAtTime(4000,t);f.frequency.exponentialRampToValueAtTime(700,t+.55);env(g,t,.9,.006,.6);s.connect(f);f.connect(g);g.connect(out);
    [.12,.2,.31].forEach((dt,i)=>{const u=t+dt,o=osc(ctx,'sine',500+i*170,u,.06),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime((500+i*170)*1.8,u+.05);env(og,u,.18,.003,.05);o.connect(og);og.connect(out)});return .7},
  // Knock knock knock on a wooden door.
  knock(ctx,out,t){[0,.16,.32].forEach(dt=>{const u=t+dt,s=src(ctx,u,.06),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=650;f.Q.value=3;env(g,u,1.4,.001,.05);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',190,u,.1),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(120,u+.08);env(og,u,.55,.002,.08);o.connect(og);og.connect(out)});return .45},
  // A short riser for quick cuts.
  riseup(ctx,out,t){const d=.6,n=src(ctx,t,d),f=ctx.createBiquadFilter(),g=ctx.createGain(),o=osc(ctx,'sawtooth',300,t,d),of=ctx.createBiquadFilter(),og=ctx.createGain();f.type='bandpass';f.Q.value=1.3;f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(9000,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.6,t+d-.02);g.gain.linearRampToValueAtTime(0,t+d);n.connect(f);f.connect(g);g.connect(out);
    o.frequency.exponentialRampToValueAtTime(1800,t+d);of.type='lowpass';of.frequency.value=3000;og.gain.setValueAtTime(0.0001,t);og.gain.exponentialRampToValueAtTime(.12,t+d-.02);og.gain.linearRampToValueAtTime(0,t+d);o.connect(of);of.connect(og);og.connect(out);return d},
  // Power down: a tone sinking and dulling.
  powerdown(ctx,out,t){const o=osc(ctx,'sawtooth',900,t,.85),f=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(50,t+.8);f.type='lowpass';f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(250,t+.8);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.01);g.gain.setValueAtTime(.3,t+.55);g.gain.exponentialRampToValueAtTime(0.0001,t+.85);o.connect(f);f.connect(g);g.connect(out);return .85},
  // Power up: a fluttering square sweeping up.
  powerup(ctx,out,t){const o=osc(ctx,'square',200,t,.55),l=osc(ctx,'square',22,t,.55),lg=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(1600,t+.5);lg.gain.value=.5;
    f.type='lowpass';f.frequency.value=4000;g.gain.value=.5;l.connect(lg);lg.connect(g.gain);const v=ctx.createGain();env(v,t,.3,.01,.52);o.connect(f);f.connect(g);g.connect(v);v.connect(out);return .55},
  // Fairy dust: quick random high bells over a soft shimmer.
  fairy(ctx,out,t){[3520,2794,4186,3136,4699,2637,3951,3322,4434,2960,5274,3729,4978,3136].forEach((f,i)=>bell(ctx,pan(ctx,((i*7)%11)/5.5-1,out),t+i*.06,f,1,[[1,.11,.3]]));
    const s=src(ctx,t,1,true),hp=ctx.createBiquadFilter(),g=ctx.createGain();hp.type='highpass';hp.frequency.value=7000;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.2,t+.3);g.gain.exponentialRampToValueAtTime(0.0001,t+1);s.connect(hp);hp.connect(g);g.connect(out);return 1.1},
  // A big low gong.
  gong(ctx,out,t){bell(ctx,out,t,110,1,[[1,.5,2.2],[1.48,.25,1.6],[2.1,.2,1.2],[2.76,.12,.9],[3.9,.06,.6]]);const s=src(ctx,t,.1),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.value=1200;env(g,t,.3,.002,.08);s.connect(f);f.connect(g);g.connect(out);return 2.3},
  // A little shop-door bell.
  shopbell(ctx,out,t){[[1568,0],[1976,.14],[1568,.3]].forEach(([f,dt],i)=>bell(ctx,pan(ctx,i?.3:-.3,out),t+dt,f,1,[[1,.28,.8],[2.76,.08,.35],[5.4,.03,.15]]));return 1.15},
  // A receipt printer.
  printer(ctx,out,t){for(let i=0;i<6;i++){const u=t+i*.1,o=osc(ctx,'square',70,u,.08),s=src(ctx,u,.08),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1100;f.Q.value=2;g.gain.setValueAtTime(.18,u);g.gain.setValueAtTime(0,u+.075);
    o.connect(g);s.connect(f);f.connect(g);g.connect(out)}return .62},
  // A finger snap.
  snap(ctx,out,t){const s=src(ctx,t,.04),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=2300;f.Q.value=2;env(g,t,1.3,.0005,.03);s.connect(f);f.connect(g);g.connect(out);
    const o=osc(ctx,'sine',1100,t,.04),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(600,t+.03);env(og,t,.2,.001,.03);o.connect(og);og.connect(out);return .15},
  // One hand clap.
  clap(ctx,out,t){[[0,.8,.015],[.011,.7,.015],[.022,.6,.015],[.033,.5,.14]].forEach(([dt,v,d])=>{const u=t+dt,s=src(ctx,u,d+.01),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1200;f.Q.value=1;env(g,u,v,.001,d);s.connect(f);f.connect(g);g.connect(out)});return .2},
  // Ta-da: a short brassy chord, then a long one.
  tada(ctx,out,t){[[0,.12],[.16,.8]].forEach(([dt,d])=>{const u=t+dt,f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.setValueAtTime(600,u);f.frequency.exponentialRampToValueAtTime(3500,u+.12);
    g.gain.setValueAtTime(0.0001,u);g.gain.exponentialRampToValueAtTime(.1,u+.02);g.gain.setValueAtTime(.1,u+d*.6);g.gain.exponentialRampToValueAtTime(0.0001,u+d);f.connect(g);g.connect(out);
    for(const fr of [523,659,784,1047])for(const dtn of [-4,4]){const o=osc(ctx,'sawtooth',fr,u,d);o.detune.value=dtn;o.connect(f)}});return 1},
  // A tense sting: close notes swelling up, then cut.
  tension(ctx,out,t){const d=1.2,f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.setValueAtTime(700,t);f.frequency.exponentialRampToValueAtTime(2600,t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+d-.03);g.gain.linearRampToValueAtTime(0,t+d);
    f.connect(g);g.connect(out);for(const fr of [220,233,330,349])osc(ctx,'sawtooth',fr,t,d).connect(f);return d},
  // A whip crack.
  whip(ctx,out,t){const s=src(ctx,t,.2),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(1000,t);f.frequency.exponentialRampToValueAtTime(8000,t+.08);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.6,t+.07);g.gain.exponentialRampToValueAtTime(0.0001,t+.18);
    s.connect(f);f.connect(g);g.connect(out);const c=src(ctx,t+.075,.02),cf=ctx.createBiquadFilter(),cg=ctx.createGain();cf.type='highpass';cf.frequency.value=2500;env(cg,t+.075,1.2,.0005,.015);c.connect(cf);cf.connect(cg);cg.connect(out);return .2},
  // A tiny app blip.
  blip(ctx,out,t){[[1200,0],[1800,.05]].forEach(([f,dt])=>{const u=t+dt,o=osc(ctx,'sine',f,u,.07),g=ctx.createGain();env(g,u,.4,.002,.06);o.connect(g);g.connect(out)});return .15},
  // A page turning.
  pageturn(ctx,out,t){const s=src(ctx,t,.38,true),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=pan(ctx,.5,out);f.type='bandpass';f.frequency.value=2500;f.Q.value=.8;g.gain.setValueAtTime(0.0001,t);
    for(let i=1;i<14;i++)g.gain.setValueAtTime((.2+.5*Math.sin(Math.PI*i/14))*(i%2?1:.55),t+i*.025);g.gain.exponentialRampToValueAtTime(0.0001,t+.38);if(p.pan)p.pan.linearRampToValueAtTime(-.5,t+.35);s.connect(f);f.connect(g);g.connect(p);return .4},
  // A deep 808-style bass hit.
  bass(ctx,out,t){const o=osc(ctx,'sine',70,t,1),g=ctx.createGain(),lv=ctx.createGain(),w=drive(ctx,2,lv);lv.gain.value=.9;lv.connect(out);o.frequency.exponentialRampToValueAtTime(48,t+.3);env(g,t,1,.003,.95);o.connect(g);g.connect(w);return 1},
  // A tape rewind.
  rewind(ctx,out,t){const o=osc(ctx,'sawtooth',200,t,.6),l=osc(ctx,'sine',12,t,.6),lg=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(1400,t+.55);lg.gain.value=60;l.connect(lg);lg.connect(o.frequency);
    f.type='lowpass';f.frequency.value=2500;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.05);g.gain.setValueAtTime(.25,t+.5);g.gain.exponentialRampToValueAtTime(0.0001,t+.6);o.connect(f);f.connect(g);g.connect(out);
    const n=src(ctx,t,.6),nf=ctx.createBiquadFilter(),ng=ctx.createGain();nf.type='highpass';nf.frequency.value=3000;env(ng,t,.15,.05,.55);n.connect(nf);nf.connect(ng);ng.connect(out);return .6}};

const LIST=[['swoosh','💨','Swoosh','B-roll cuts and swipes'],['pop','🫧','Bubble pop','captions and stickers popping in'],['cash','💰','Cha-ching','price drops and deals'],
  ['shutter','📸','Camera shutter','product snapshots'],['sparkle','✨','Magic sparkle','glow-ups and “after” reveals'],['drop','💥','Bass drop','big hook moments'],
  ['click','👆','Button tap','“Link in bio” and “Shop now” taps'],['buzz','❌','Error buzz','“Don’t buy this…” moments'],['ding','✅','Success ding','pro tips and fixed problems'],
  ['riser','📈','Riser','building up right into a cut'],['scratch','💿','Record scratch','“Wait a minute…” freeze frames'],['whoosh','👊','Whoosh hit','fast, snappy TikTok cuts'],
  ['impact','🎬','Cinematic boom','trailers and big reveals'],['heartbeat','💓','Heartbeat','suspense and “wait for it…”'],['typing','⌨️','Typing','texts, emails and DM screenshots'],
  ['notify','🔔','Phone ping','“you got a message” moments'],['boing','🤪','Boing','funny fails and bounces'],['glitch','📺','Glitch','tech, transitions and “error” jokes'],
  ['harp','🪄','Dreamy harp','flashbacks and daydreams'],['coin','🪙','Coin','deals, savings and rewards'],['tick','⏰','Clock tick','countdowns and “limited time”'],
  ['zap','⚡','Zap','energy, speed and power-ups'],['swipe','👉','Quick swipe','next item, next slide'],
  ['applause','👏','Applause','wins, results and “you did it”'],['drumroll','🥁','Drumroll','big reveals and “the winner is…”'],['rimshot','😂','Ba-dum-tss','jokes and puns'],
  ['thud','🪨','Soft thud','text or products landing'],['chime','🎐','Wind chimes','calm, cozy and self-care moments'],['levelup','🎮','Level up','upgrades and new skills'],
  ['wahwah','📯','Sad trombone','fails and “don’t do this”'],['alarm','🚨','Alarm','warnings and “stop scrolling”'],['bubbles','🧼','Bubbles','skincare, drinks and cleaning'],
  ['splash','💦','Splash','water, drinks and refreshing moments'],['knock','🚪','Knock knock','“guess what” and surprises'],['riseup','⤴️','Short riser','quick build into a cut'],
  ['powerdown','🔌','Power down','“it stopped working” moments'],['powerup','🔋','Power up','energy boosts and charging'],['fairy','🧚','Fairy dust','magic, glow and transformations'],
  ['gong','🏯','Gong','dramatic announcements'],['shopbell','🛎️','Shop bell','new arrivals and “we’re open”'],['printer','🧾','Receipt print','orders, receipts and totals'],
  ['snap','🫰','Finger snap','quick changes and outfit swaps'],['clap','🙌','Single clap','“let’s go” and starting'],['tada','🎉','Ta-da!','big reveals and results'],
  ['tension','😬','Tension sting','cliffhangers and “but then…”'],['whip','🪢','Whip crack','fast cuts and “boom”'],['blip','📱','App blip','app taps and screen recordings'],
  ['pageturn','📖','Page turn','books, guides and next steps'],['bass','🔊','Bass hit','heavy beat drops and big moments'],['rewind','⏪','Rewind','flashbacks and “let me explain”']];

const wav=buf=>{const ch=buf.numberOfChannels,n=buf.length,v=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
  const d=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(o,x<0?x*0x8000:x*0x7fff,true);o+=2}return v.buffer};

// Level for each effect, so they all land about as loud as each other (the limiter catches anything over).
// Effects sit behind the voice: no ducking (they're short and rarely land on a word), a lower track volume, and every
// render is "pushed back" (see render) and evened out to the same loudness, so no effect jumps out more than another.
const SFX_MIX={volume:.7};
// Spaces: a little room sound around each effect, like it was played in a studio, a room or a hall, or a soft echo.
const SPACES=[['dry','Dry (no echo)'],['studio','Studio'],['room','Room'],['hall','Concert hall'],['echo','Echo']];
const SPACE={studio:{len:.45,pre:.008,wet:.3,damp:.55},room:{len:.9,pre:.015,wet:.38,damp:.45},hall:{len:2.4,pre:.03,wet:.45,damp:.3}};
const defSpace=()=>{try{const v=localStorage.getItem('tapshop-sfx-space');return SPACES.some(x=>x[0]===v)?v:'room'}catch{return 'room'}};
const setDefSpace=v=>{try{localStorage.setItem('tapshop-sfx-space',v)}catch{}};
// A made-up room echo: stereo noise dying away by 60 dB, getting darker as it fades, with a few early reflections.
const irCache=new Map();
const ir=(ctx,k)=>{const sp=SPACE[k],SR=ctx.sampleRate,id=k+SR;let d=irCache.get(id);if(!d){const n=Math.ceil(sp.len*SR);d=[0,1].map(c=>{const a=new Float32Array(n);let lp=0;
    for(let i=0;i<n;i++){const x=i/n,co=Math.min(.97,sp.damp*.4+.85*x);lp=lp*co+(Math.random()*2-1)*(1-co);a[i]=lp*Math.pow(.001,x)}
    for(const [ms,v] of [[7,.5],[13,.35],[21,.28],[34,.2],[47,.15]]){const j=Math.round((ms+c*3)*SR/1000);if(j<n)a[j]+=v*(c?-1:1)}return a});irCache.set(id,d)}
  const b=ctx.createBuffer(2,d[0].length,SR);b.copyToChannel(d[0],0);b.copyToChannel(d[1],1);return b};
const tailOf=k=>SPACE[k]?SPACE[k].len+SPACE[k].pre:k==='echo'?1.3:0;
// Thin out the low rumble and the 2–5 kHz "presence" a voice lives in, soften the very top, then add the space.
function backChain(ctx,out,k){const hp=ctx.createBiquadFilter(),pk=ctx.createBiquadFilter(),hs=ctx.createBiquadFilter(),dry=ctx.createGain();
  hp.type='highpass';hp.frequency.value=110;pk.type='peaking';pk.frequency.value=3200;pk.Q.value=.8;pk.gain.value=-5;hs.type='highshelf';hs.frequency.value=7500;hs.gain.value=-4;
  hp.connect(pk);pk.connect(hs);hs.connect(dry);dry.connect(out);const sp=SPACE[k];
  if(sp){dry.gain.value=1-sp.wet*.4;const pre=ctx.createDelay(.1),cv=ctx.createConvolver(),wet=ctx.createGain();pre.delayTime.value=sp.pre;cv.buffer=ir(ctx,k);wet.gain.value=sp.wet;hs.connect(pre);pre.connect(cv);cv.connect(wet);wet.connect(out)}
  else if(k==='echo'){const l=ctx.createDelay(1),r=ctx.createDelay(1),fb=ctx.createGain(),lp=ctx.createBiquadFilter(),wet=ctx.createGain();l.delayTime.value=.19;r.delayTime.value=.29;fb.gain.value=.35;lp.type='lowpass';lp.frequency.value=2800;wet.gain.value=.4;
    hs.connect(l);l.connect(lp);lp.connect(r);r.connect(fb);fb.connect(l);l.connect(pan(ctx,-.7,wet));r.connect(pan(ctx,.7,wet));wet.connect(out)}
  return hp}
// Same loudness for every effect: the loudest 100 ms is brought to one level (peaks kept under 0.8).
const TARGET=.09;
function even(o){const SR=o.sampleRate,ch=[0,1].map(c=>o.getChannelData(c)),w=Math.round(SR*.1);let best=0,peak=0,acc=0;const sq=i=>(ch[0][i]**2+ch[1][i]**2)/2;
  for(let i=0;i<o.length;i++){acc+=sq(i);if(i>=w)acc-=sq(i-w);best=Math.max(best,acc/Math.min(i+1,w));peak=Math.max(peak,Math.abs(ch[0][i]),Math.abs(ch[1][i]))}
  const g=Math.min(TARGET/Math.sqrt(best||1e-9),.8/(peak||1e-9));for(const a of ch)for(let i=0;i<a.length;i++)a[i]*=g;return o}
const LEVEL={swoosh:5.5,pop:1.2,cash:2.1,shutter:1,sparkle:2,drop:1,click:13,buzz:1.2,ding:2,riser:1.15,scratch:1.6,whoosh:.95};
const leveled=(ctx,out,key)=>{const g=ctx.createGain();g.gain.value=LEVEL[key]||1;g.connect(out);return g};
let live=null,liveOut=null;
window.TapSFX={list:LIST,fx:FX,
  // Play one now: on the editor's own sound (through its limiter) when it's running, else on a small context of our own.
  // Play one now, exactly as it will sound on the timeline (same render, at the effects' track volume).
  spaces:SPACES,defaultSpace:defSpace,setDefaultSpace:setDefSpace,
  async play(key,space){if(!FX[key])return;let ctx,out;
    if(typeof audioCtx!=='undefined'&&audioCtx&&veSpk){ctx=audioCtx;out=veSpk}else{live=live||new (window.AudioContext||window.webkitAudioContext)();liveOut=liveOut||veLimiter(live,live.destination);ctx=live;out=liveOut}
    ctx.resume?.();const b=await this.render(key,space),s=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=SFX_MIX.volume;s.buffer=b;s.connect(g);g.connect(out);s.start(ctx.currentTime+.02);return b.duration},
  _cache:new Map(),
  async render(key,space){const k=space||defSpace(),id=key+'|'+k,hit=this._cache.get(id);if(hit)return hit;const f=FX[key],SR=44100,tail=tailOf(k),oc=new OfflineAudioContext(2,Math.ceil((2.6+tail)*SR),SR);
    const d=f(oc,leveled(oc,backChain(oc,oc.destination,k),key),0);const b=await oc.startRendering(),n=Math.min(b.length,Math.ceil(Math.max(d+tail+.03,.15)*SR)),o=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:SR});
    for(let c=0;c<2;c++){const a=b.getChannelData(c).slice(0,n),fade=Math.round(SR*.05);for(let i=0;i<fade&&i<n;i++)a[n-1-i]*=i/fade;o.copyToChannel(a,c)}
    even(o);this._cache.set(id,o);return o},
  async file(key,space){const it=LIST.find(x=>x[0]===key);return new File([wav(await this.render(key,space))],`TapShop sound · ${it?it[2]:key}.wav`,{type:'audio/wav'})},
  // Put one on the timeline (at the playhead unless o.at), on a "Sound effects" row (all effects share it when they don't overlap). Undo-able.
  // o.forId ties it to a strip: it then starts when that strip starts (plus o.rel seconds) and goes away with it.
  async add(key,o={}){if(exporting)return;const it=LIST.find(x=>x[0]===key);if(!it)return;const at=+(o.at??playhead).toFixed(2);if(!o.noSnap)snapshot();addTrack('audio');const t=extraTracks.at(-1);
    const space=o.space||defSpace();Object.assign(t,{name:it[1]+' '+it[2],lane:'sfx',offset:at,sfxKey:key,sfxSpace:space},o.forId?{sfxFor:o.forId,sfxKey:key,sfxAt:+(o.rel||0).toFixed(2)}:{});targetTrack=t.id;await loadTrackMedia(await this.file(key,space));
    if(!t.media){if(o.noSnap)deleteTrack(t.id);else undo();return false}t.offset=at;
    Object.assign(t,{volume:SFX_MIX.volume,duck:false});renderTracks();await seekTimeline(playhead);window.recordRecent?.('sfx-'+key);if(!o.quiet)toast(`${it[2]} added at ${at.toFixed(1)} s. Drag it to move it.`);return true}};

// ---- A sound effect on a text box or sticker: a "🔊 Sound effect" menu in its editing menu (timeline and preview pop-up).
// The sound is its own audio track (sfxFor = the strip's id, sfxKey = which sound) that always starts with the strip.
const linked=id=>extraTracks.filter(t=>t.sfxFor===id);
const canSfx=t=>t&&(t.type==='text'||t.type==='shape');
window.veSfxPick=async function(id,key){if(exporting)return;const g=graphicTracks.find(x=>x.id===id);if(!g)return;pause();snapshot();
  for(const t of linked(id))deleteTrack(t.id);
  if(key){const ok=await TapSFX.add(key,{at:g.offset,forId:id,noSnap:1,quiet:1});const it=LIST.find(x=>x[0]===key);if(ok!==false)toast(`${it[2]} plays when “${(g.text||g.name||'this').toString().slice(0,24)}” appears.`)}
  else{renderTracks();toast('Sound effect removed.')}
  expandedStrip=id;renderGraphicTracks()};
// A sound effect's own track menu swaps the sound in place: same time, volume and ducking, still tied to its text
// or sticker, whose 🔊 menu reads this track's sfxKey, so both always show the same sound.
window.veSfxSwapMenu=t=>`<label class="sfx-swap">🔊 Sound effect<select onchange="veSfxSwap('${t.id}',this.value)">${t.sfxKey?'':'<option value="">Pick a sound…</option>'}${LIST.map(([k,e,n])=>`<option value="${k}"${k===t.sfxKey?' selected':''}>${e} ${n}</option>`).join('')}</select></label><button type="button" onclick="const v=this.previousElementSibling.querySelector('select').value;v?TapSFX.play(v,'${t.sfxSpace||'dry'}'):toast('Pick a sound first.')" aria-label="Listen to the sound effect">▶</button>${t.sfxKey?`<label class="sfx-swap">🏛️ Space<select onchange="veSfxSwap('${t.id}','${t.sfxKey}',this.value)">${SPACES.map(([k,n])=>`<option value="${k}"${k===(t.sfxSpace||'dry')?' selected':''}>${n}</option>`).join('')}</select></label>`:''}`;
window.veSfxSwap=async function(id,key,space){if(exporting)return;const t=extraTracks.find(x=>x.id===id),it=LIST.find(x=>x[0]===key);if(!t||!it)return;pause();snapshot();
  const sp=space||t.sfxSpace||defSpace();if(space)setDefSpace(space);
  const keep={offset:t.offset,speed:t.speed,volume:t.volume},was=t.file;targetTrack=t.id;await loadTrackMedia(await TapSFX.file(key,sp));
  if(t.file===was){undo();return}Object.assign(t,keep,{sfxKey:key,sfxSpace:sp,name:it[1]+' '+it[2]});expandedStrip=t.id;renderTracks();renderGraphicTracks();await seekTimeline(playhead);
  const g=t.sfxFor&&graphicTracks.find(x=>x.id===t.sfxFor);toast(space?`${it[2]} now sounds like: ${SPACES.find(x=>x[0]===sp)[1]}.`:`${it[2]} now plays here${g?` with “${(g.text||g.name||'').toString().slice(0,24)}”`:''}.`)};
// Keep each tied sound at its strip's start; drop it when the strip is gone. Runs before every redraw of the strips.
let syncing=false;const syncLinks=()=>{if(syncing)return false;syncing=true;try{let gone=extraTracks.filter(t=>t.sfxFor&&!graphicTracks.some(g=>g.id===t.sfxFor));
  for(const t of extraTracks)if(t.sfxFor){const g=graphicTracks.find(g=>g.id===t.sfxFor);const want=+(g?g.offset+(t.sfxAt||0):0).toFixed(3);if(g&&Math.abs(t.offset-want)>1e-3)t.offset=want}
  if(gone.length){for(const t of gone)deleteTrack(t.id);return true}return false}finally{syncing=false}};
{const base=decorateStrips;decorateStrips=function(){if(syncLinks())return;base()}}
const sfxMenu=g=>{const cur=linked(g.id).find(t=>!t.sfxAt)?.sfxKey||'';return `<div class="sfx-pick"><label>🔊 Sound effect<select onchange="veSfxPick('${g.id}',this.value)"><option value="">None</option>${LIST.map(([k,e,n])=>`<option value="${k}"${k===cur?' selected':''}>${e} ${n}</option>`).join('')}</select></label><button type="button" onclick="const v=this.previousElementSibling.querySelector('select').value;v?TapSFX.play(v):toast('Pick a sound first.')" aria-label="Listen to the sound effect">▶</button><small>Plays when it appears and moves with it.</small></div>`};
{const base=renderGraphicTracks;renderGraphicTracks=function(){base();for(const g of graphicTracks){if(!canSfx(g))continue;const box=document.querySelector(`#graphicTracks .strip-row[data-trackid="${g.id}"] .strip-options`);
  if(!box||box.querySelector('.sfx-pick'))continue;box.insertAdjacentHTML('afterbegin',sfxMenu(g))}}}

// The 🔊 Sound FX button (after 🎵 Audio on the timeline bar) and its list.
const open=()=>{if(exporting)return;pause();let d=document.getElementById('sfxDialog');
  if(!d){d=document.createElement('dialog');d.id='sfxDialog';d.className='closable';document.body.appendChild(d)}
  d.innerHTML=`<button type="button" class="dialog-x" aria-label="Close" title="Close">×</button><h2>🔊 Sound effects</h2><p class="sub">Made on your device, free to use anywhere. Press ▶ to hear one, then <b>Add</b> to drop it at the playhead (${playhead.toFixed(1)} s).</p>
  <label class="sfx-space">🏛️ Space: how far back the effects sound<select id="sfxSpace">${SPACES.map(([k,n])=>`<option value="${k}"${k===defSpace()?' selected':''}>${n}</option>`).join('')}</select></label>
  <div class="sfx-list">${LIST.map(([k,e,n,u])=>`<div class="sfx-row"><button type="button" class="sfx-play" data-p="${k}" aria-label="Listen to ${n}">▶</button><span><b>${e} ${n}</b><small>${u}</small></span><button type="button" class="primary" data-a="${k}">Add</button></div>`).join('')}</div>`;
  d.querySelector('.dialog-x').onclick=()=>d.close();d.querySelector('#sfxSpace').onchange=e=>setDefSpace(e.target.value);
  d.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{try{TapSFX.play(b.dataset.p)}catch(e){toast('Couldn’t play it here.')}});
  d.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{d.querySelectorAll('button').forEach(x=>x.disabled=true);try{if(await TapSFX.add(b.dataset.a)!==false)d.close()}catch(e){toast('Couldn’t add it: '+(e.message||e))}finally{d.querySelectorAll('button').forEach(x=>x.disabled=false)}});
  d.showModal()};
window.openSoundFX=open;
const bar=document.querySelector('.timebar'),audio=bar&&[...bar.querySelectorAll('button')].find(b=>/Audio/.test(b.textContent));
if(bar){const b=document.createElement('button');b.type='button';b.id='sfxButton';b.textContent='🔊 Sound FX';b.title='Add a sound effect at the playhead';b.onclick=open;audio?audio.after(b):bar.appendChild(b)}
const st=document.createElement('style');st.textContent=`#sfxDialog{width:min(520px,94vw)}.sfx-list{display:flex;flex-direction:column;gap:6px;max-height:min(62vh,560px);overflow:auto;margin:10px 0}
.sfx-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid var(--ts-border,#8884);border-radius:12px}.sfx-row span{flex:1;min-width:0}.sfx-row b,.sfx-row small{display:block}.sfx-row small{opacity:.65;font-size:12px}
.sfx-pick{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 8px;margin:0 0 10px;padding:8px;border:1px dashed #ff3ea566;border-radius:10px}.sfx-pick label{flex:1;min-width:170px}.sfx-pick select{width:100%}.sfx-pick button{width:40px;height:36px;padding:0!important;flex:none}.sfx-pick small{flex-basis:100%;opacity:.65;font-size:11px}
.sfx-space{display:block;margin:8px 0 0;font-size:13px}.sfx-space select{display:block;width:100%;margin-top:4px}
.sfx-play{width:40px;height:40px;padding:0!important;border-radius:50%!important;flex:none}`;document.head.appendChild(st);
})();

// ---- AUDIO_LIBRARY: every free sound in one list with its details, for menus, search and the makers.
// Music is made on the device to any length (durationSeconds is the default length play() uses); sound effects have a fixed length.
// play(seconds) starts it and returns {stop()}. Batch 1 (Lifestyle, Home, Fashion & Beauty) has full hand-written details.
(()=>{
const META={
  desk:['Fashion & Beauty',['soft','airy','aesthetic'],['clean girl routine','desk setup','stationery haul'],['clean girl','aesthetic','desk','rhodes','bells','minimal'],'A♭ Lydian'],
  rainy:['Home',['cozy','calm','dreamy'],['self-care night','rainy day vlog','candle and skincare'],['cozy','rain','self care','felt piano','lofi','night'],'E Aeolian'],
  kitchen:['Home',['playful','bouncy','upbeat'],['kitchen gadget demo','quick recipe','meal prep'],['kitchen','recipe','gadget','kalimba','snaps','food'],'D Mixolydian'],
  tidy:['Home',['satisfying','steady','focused'],['home organization','fridge restock','ASMR containers'],['restock','organize','asmr','marimba','satisfying','tidy'],'F♯ Dorian'],
  pet:['Lifestyle',['cute','whimsical','light'],['pet products','dog or cat moment','pet hauls'],['pet','dog','cat','cute','pizzicato','funny'],'C Ionian'],
  toy:['Lifestyle',['cheerful','innocent','bright'],['parenting hack','kid-friendly toy ad','family moments'],['kids','toy','parenting','glockenspiel','happy','family'],'E Ionian'],
  coffee:['Lifestyle',['smooth','laid-back','warm'],['coffee bar','aesthetic drink pour','café vlog'],['coffee','latte','neo soul','rhodes','chill','drink'],'E♭ Dorian'],
  plant:['Home',['organic','breezy','peaceful'],['plant care','gardening','patio makeover'],['plants','garden','patio','acoustic','harmonics','outdoor'],'A Mixolydian'],
  scrub:['Home',['energetic','bubbly','motivating'],['cleaning hack','deep scrub timelapse','sped-up chores'],['cleaning','scrub','timelapse','plucks','fast','motivation'],'C♯ Aeolian'],
  apartment:['Home',['modern','spacious','calm'],['apartment tour','room tour','minimalist home'],['apartment','room tour','minimal','ambient','architecture','delay'],'B Lydian'],
  sneaker:['Fashion & Beauty',['confident','gritty','cool'],['sneaker drop','streetwear haul','outfit check'],['sneakers','streetwear','hip hop','808','trap hats','drop'],'G♯ Phrygian'],
  thrift:['Fashion & Beauty',['quirky','creative','fun'],['thrift flip','DIY upcycle','sewing project'],['thrift','diy','upcycle','indie pop','bassline','vintage'],'B♭ Ionian'],
  jewelry:['Fashion & Beauty',['luxurious','delicate','glowing'],['jewelry close-up','watch reveal','unboxing a gift'],['jewelry','watch','luxury','chimes','drone','sparkle'],'F♯ Lydian'],
  grwm:['Fashion & Beauty',['glamorous','upbeat','stylish'],['get ready with me','night out','makeup routine'],['grwm','night out','house','makeup','party','dance'],'C Aeolian'],
  silk:['Fashion & Beauty',['silky','lush','elegant'],['haircare','slow-mo hair flip','blowout results'],['hair','haircare','slow motion','strings','lush','beauty'],'D Ionian'],
  dupes:['Fashion & Beauty',['clever','curious','playful'],['dupe vs high-end','side-by-side comparison','price check'],['dupe','comparison','versus','call and response','plucks','fashion'],'G Dorian',2],
  capsule:['Fashion & Beauty',['breezy','optimistic','fresh'],['capsule wardrobe','packing for a trip','outfit planning'],['capsule','packing','travel','acoustic','strum','wardrobe'],'F Lydian',2],
  perfume:['Fashion & Beauty',['dark','seductive','mysterious'],['fragrance review','perfume editorial','scent unboxing'],['perfume','fragrance','editorial','chimes','dark','luxury'],'C♯ Phrygian',2],
  athleisure:['Fashion & Beauty',['confident','modern','driving'],['activewear try-on','athleisure haul','gym outfit'],['activewear','athleisure','gym','synth bass','try on','fitness'],'E Dorian',2],
  shades:['Fashion & Beauty',['sunny','relaxed','retro'],['sunglasses','summer vacation','beach day'],['sunglasses','summer','vacation','retro','coastal','tape'],'A♭ Mixolydian',2],
  rgb:['Tech & Gaming',['futuristic','energetic','neon'],['desk gaming setup','RGB showcase','PC build'],['gaming','rgb','cyberpunk','arpeggio','setup','pc'],'B Aeolian',2],
  saas:['Tech & Gaming',['clean','smart','focused'],['AI tool walkthrough','SaaS app demo','screen recording'],['ai','saas','app','marimba','walkthrough','software'],'A Ionian',2],
  notion:['Productivity',['calm','focused','soft'],['Notion template tour','study with me','planner setup'],['notion','productivity','study','lofi','template','focus'],'D♭ Ionian',2],
  droptest:['Tech & Gaming',['tense','building','punchy'],['phone case drop test','EDC drop','durability test'],['drop test','phone case','edc','impact','build up','tension'],'D Aeolian',2],
  smarthome:['Tech & Gaming',['sleek','futuristic','precise'],['smart home','home automation','gadget tour'],['smart home','automation','sci-fi','glass','robotic','gadget'],'F♯ Aeolian',2],
  wfh:['Productivity',['uplifting','confident','modern'],['work from home gear','remote job setup','desk upgrade'],['wfh','remote work','office','corporate','indie','plucks'],'C Ionian',2],
  filmmaker:['Tech & Gaming',['cinematic','moody','dramatic'],['camera gear','filmmaking b-roll','lens review'],['camera','filmmaking','cinematic','b-roll','swells','moody'],'A Aeolian',2],
  subbox:['Tech & Gaming',['curious','building','upbeat'],['app unboxing','subscription box reveal','first look'],['subscription box','unboxing','reveal','marimba','layers','app'],'E♭ Ionian',2],
  hustle:['Productivity',['smooth','confident','smart'],['side hustle tip','passive income','money advice'],['side hustle','money','passive income','groove','bassline','business'],'B♭ Dorian',2],
  scam:['Tech & Gaming',['urgent','nervous','tense'],['scam warning hook','cybersecurity tip','do not buy'],['scam','warning','security','pulse','ticking','alert'],'F Phrygian',2],
  deinfluence:['Sales & Reviews',['serious','dry','honest'],['brutally honest review','de-influencing','don’t buy this'],['honest','review','de-influencing','bass pluck','dry','real talk'],'G Aeolian',3],
  viral:['Sales & Reviews',['skeptical','quirky','curious'],['viral product reality check','does it work','TikTok made me buy it'],['viral','reality check','skeptical','quirky','pitch bend','test'],'C♯ Dorian',3],
  giftguide:['Sales & Reviews',['festive','sparkling','upbeat'],['holiday gift guide','Black Friday haul','Christmas deals'],['holiday','gift guide','black friday','bells','christmas','sale'],'F Ionian',3],
  smallbiz:['Storytelling',['heartwarming','hopeful','proud'],['small business','packing orders','behind the scenes'],['small business','packing orders','bts','acoustic','hopeful','shop'],'A Ionian',3],
  testimonial:['Sales & Reviews',['sincere','warm','reassuring'],['customer testimonial','5-star review','before you buy'],['testimonial','5 star','review','piano','trust','customer'],'E♭ Ionian',3],
  travel:['Lifestyle',['adventurous','exciting','airy'],['travel essentials','airport hack','carry-on packing'],['travel','airport','essentials','plucks','adventure','trip'],'B Mixolydian',3],
  car:['Tech & Gaming',['powerful','sleek','gritty'],['car detailing','auto accessories','car cleaning'],['car','detailing','auto','808','metallic','garage'],'E♭ harmonic minor',3],
  booktok:['Storytelling',['dreamy','nostalgic','cozy'],['BookTok','Kindle setup','cozy reading'],['booktok','kindle','reading','music box','cozy','books'],'G Lydian',3],
  mistakes:['Storytelling',['authoritative','sharp','brisk'],['myth-busting','3 mistakes you’re making','tips list'],['mistakes','myth','tips','staccato','strings','facts'],'E harmonic minor',3],
  finale:['Sales & Reviews',['uplifting','resolving','confident'],['link in bio call-to-action','video ending','shop now outro'],['link in bio','cta','ending','outro','finale','shop now'],'C Ionian (ends on C)',3]};
const LEN={swoosh:.5,pop:.15,cash:.8,shutter:.2,sparkle:1,drop:.9,click:.05,buzz:.35,ding:.6,riser:1.2,scratch:.3,whoosh:.4,impact:1.4,heartbeat:1.25,typing:.6,notify:.45,boing:.7,glitch:.4,harp:1.4,coin:.42,tick:.8,zap:.25,swipe:.15,applause:1.5,drumroll:1.55,rimshot:1.05,thud:.32,chime:1.5,levelup:.75,wahwah:1.85,alarm:.85,bubbles:.65,splash:.7,knock:.45,riseup:.6,powerdown:.85,powerup:.55,fairy:1.1,gong:2.3,shopbell:1.15,printer:.62,snap:.15,clap:.2,tada:1,tension:1.2,whip:.2,blip:.15,pageturn:.4,bass:1,rewind:.6};
// Moods and uses for the styles that came before the batches (so search and filters can find them too).
const OLD={bright:[['happy','upbeat','pop'],['product demo','everyday vlog']],upbeat:[['upbeat','energetic','dance'],['hauls','fast edits']],chill:[['chill','calm','lofi'],['vlogs','aesthetic b-roll']],
  trap:[['hype','bold','urban'],['streetwear','hype edits']],rnb:[['smooth','warm','sensual'],['beauty','night routine']],acoustic:[['happy','warm','organic'],['lifestyle','family']],
  tropical:[['sunny','breezy','happy'],['travel','summer']],inspire:[['uplifting','hopeful','motivating'],['brand story','business']],epic:[['epic','dramatic','cinematic'],['big reveals','trailers']],
  dreamy:[['dreamy','soft','calm'],['beauty','slow-mo']],funk:[['funky','groovy','playful'],['fashion','dance']],synthwave:[['retro','neon','driving'],['tech','night drive']],
  boombap:[['nostalgic','laid-back','urban'],['storytelling','vlogs']],afro:[['joyful','groovy','warm'],['fashion','dance']],reggaeton:[['sexy','bouncy','party'],['fashion','summer']],
  dnb:[['fast','energetic','intense'],['sports','action']],futurebass:[['euphoric','bright','energetic'],['unboxing','reveals']],jazz:[['classy','smooth','warm'],['food','café']],
  hype:[['hype','aggressive','powerful'],['sales','sports']],playful:[['playful','silly','fun'],['funny clips','pets']],dark:[['dark','suspense','tense'],['mystery','horror']],
  holiday:[['festive','cheerful','cozy'],['holidays','gifts']],piano:[['emotional','gentle','calm'],['story','heartfelt']],guitar:[['warm','cozy','relaxed'],['outdoors','campfire']],
  bossa:[['smooth','sunny','relaxed'],['café','travel']],gospel:[['uplifting','soulful','warm'],['testimonials','inspiration']],kids:[['cheerful','silly','bright'],['kids','toys']],
  workout:[['energetic','driving','pumped'],['gym','fitness']],hook:[['urgent','punchy','attention-grabbing'],['hook','2-second hook']],unbox:[['cozy','warm','lofi'],['unboxing','morning routine']],
  tech:[['clean','focused','modern'],['tech review','gadgets']],flash:[['urgent','fast','exciting'],['flash sale','limited time']],luxe:[['luxurious','calm','elegant'],['skincare','luxury']],
  reveal:[['dramatic','uplifting','transforming'],['before and after','glow-up']],haul:[['playful','bouncy','upbeat'],['haul','try-on']],story:[['honest','warm','calm'],['storytime','real talk']],
  fitness:[['powerful','motivating','energetic'],['fitness','supplements']],tutorial:[['friendly','light','steady'],['tutorial','how-to']]};
let cur=null;const stop=()=>{try{cur?.pause()}catch{}cur=null};
const music=k=>{const m=veMoods[k],x=META[k],g=(window.veMusicGroups?veMusicGroups():[]).find(([,ks])=>ks.includes(k));
  return {id:k,title:m.name,type:'music',category:x?x[0]:g&&/creators/.test(g[0])?'Creators':'General',moods:x?x[1]:OLD[k]?OLD[k][0]:[],useCases:x?x[2]:[...new Set([...(m.for?m.for.split(/,\s*/):[]),...(OLD[k]?OLD[k][1]:[])])],
    keywords:x?x[3]:m.name.toLowerCase().split(/\W+/).filter(Boolean),bpm:m.bpm,mode:x?x[4]:undefined,batch:x?(x[5]||1):undefined,durationSeconds:30,anyLength:true,voiceoverSafe:!!(m.fx&&m.fx.mid),
    async play(seconds=10){stop();const a=new Audio(URL.createObjectURL(await veMakeBeat(seconds,k)));cur=a;await a.play();return {stop}},
    file(seconds=30){return veMakeBeat(seconds,k)}}};
const fx=([k,e,n,u])=>({id:'sfx-'+k,key:k,title:e+' '+n,type:'sfx',category:'Sound effects',moods:[],useCases:[u],keywords:[k,n.toLowerCase()],bpm:null,durationSeconds:LEN[k],voiceoverSafe:true,
  play(){TapSFX.play(k);return {stop(){}}},file(){return TapSFX.file(k)}});
const build=()=>window.veMoods?[...(window.veMusicGroups?veMusicGroups().flatMap(([,ks])=>ks):Object.keys(veMoods)).filter(k=>veMoods[k]).map(music),...TapSFX.list.map(fx)]:[];
window.AUDIO_LIBRARY=build();
// Search by words (title, moods, use cases, keywords): AUDIO_LIBRARY_SEARCH('cozy coffee').
window.AUDIO_LIBRARY_SEARCH=q=>{const w=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);return AUDIO_LIBRARY.map(t=>[t,w.filter(x=>[t.title,t.category,...t.moods,...t.useCases,...t.keywords].join(' ').toLowerCase().includes(x)).length]).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]).map(([t])=>t)};
})();
