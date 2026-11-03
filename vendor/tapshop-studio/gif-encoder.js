// A small GIF maker for "Sell this" on animated designs. Frames are full RGBA arrays of one size.
// All frames share one 256-colour palette, picked by median cut from a sample of their pixels.
window.TapGif=(()=>{
const key=(d,i)=>(d[i]>>3)<<10|(d[i+1]>>3)<<5|d[i+2]>>3;
function palette(frames,w,h){let hist=new Uint32Array(32768),step=Math.max(1,frames.length>>5),seen=new Set();
  for(let f=0;f<frames.length;f+=step){let d=frames[f];if(seen.has(d))continue;seen.add(d);for(let i=0;i<w*h*4;i+=4*3)hist[key(d,i)]++}
  let all=[];for(let k=0;k<32768;k++)if(hist[k])all.push(k);
  const rgb=k=>[(k>>10&31)*8+4,(k>>5&31)*8+4,(k&31)*8+4];
  const range=b=>{let lo=[255,255,255],hi=[0,0,0];for(const k of b){let c=rgb(k);for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],c[i]);hi[i]=Math.max(hi[i],c[i])}}return hi.map((v,i)=>v-lo[i])};
  let boxes=all.length?[all]:[[0]];
  while(boxes.length<256){let best=-1,score=0,r=null;boxes.forEach((b,i)=>{if(b.length<2)return;let x=range(b),s=Math.max(...x)*Math.log2(b.length+1);if(s>score){score=s;best=i;r=x}});if(best<0)break;
    let axis=r.indexOf(Math.max(...r)),b=boxes[best].slice().sort((p,q)=>rgb(p)[axis]-rgb(q)[axis]),total=b.reduce((n,k)=>n+hist[k],0),sum=0,cut=1;for(let i=0;i<b.length-1;i++){sum+=hist[b[i]];if(sum*2>=total){cut=i+1;break}}boxes.splice(best,1,b.slice(0,cut),b.slice(cut))}
  return boxes.map(b=>{let n=0,t=[0,0,0];for(const k of b){let c=rgb(k),m=hist[k]||1;n+=m;for(let i=0;i<3;i++)t[i]+=c[i]*m}return t.map(v=>Math.round(v/n))})}
function nearest(pal){let map=new Int16Array(32768).fill(-1);return k=>{if(map[k]>=0)return map[k];let r=(k>>10&31)*8+4,g=(k>>5&31)*8+4,b=(k&31)*8+4,best=0,dist=1e9;for(let i=0;i<pal.length;i++){let p=pal[i],d=(p[0]-r)**2+(p[1]-g)**2+(p[2]-b)**2;if(d<dist){dist=d;best=i}}return map[k]=best}}
class Bytes{constructor(n){this.a=new Uint8Array(n);this.n=0}push(v){if(this.n===this.a.length){let b=new Uint8Array(this.n*2);b.set(this.a);this.a=b}this.a[this.n++]=v}word(v){this.push(v&255);this.push(v>>8&255)}done(){return this.a.subarray(0,this.n)}}
function lzw(px,out){const CLEAR=256,END=257;let size=9,next=258,table=new Map(),bits=0,count=0,block=new Uint8Array(255),len=0;
  const flushBlock=()=>{if(!len)return;out.push(len);for(let i=0;i<len;i++)out.push(block[i]);len=0};
  const emit=c=>{bits|=c<<count;count+=size;while(count>=8){block[len++]=bits&255;bits>>>=8;count-=8;if(len===255)flushBlock()}};
  out.push(8);emit(CLEAR);let cur=px[0];
  for(let i=1;i<px.length;i++){let p=px[i],k=cur<<8|p,hit=table.get(k);if(hit!==undefined){cur=hit;continue}emit(cur);
    if(next<4096){table.set(k,next);if(next===(1<<size)&&size<12)size++;next++}else{emit(CLEAR);table.clear();size=9;next=258}cur=p}
  emit(cur);emit(END);if(count>0){block[len++]=bits&255;if(len===255)flushBlock()}flushBlock();out.push(0)}
/** frames: RGBA arrays (the same array twice just holds a frame longer). delay: 1/100 s per frame. */
async function encode(frames,w,h,delay,onProgress){let pal=palette(frames,w,h),near=nearest(pal),out=new Bytes(1<<20),px=new Uint8Array(w*h);
  for(const c of 'GIF89a')out.push(c.charCodeAt(0));out.word(w);out.word(h);out.push(0xF7);out.push(0);out.push(0);
  for(let i=0;i<256;i++){let c=pal[i]||[0,0,0];out.push(c[0]);out.push(c[1]);out.push(c[2])}
  out.push(0x21);out.push(0xFF);out.push(11);for(const c of 'NETSCAPE2.0')out.push(c.charCodeAt(0));out.push(3);out.push(1);out.word(0);out.push(0);
  for(let f=0;f<frames.length;f++){let n=1;while(f+n<frames.length&&frames[f+n]===frames[f])n++;let d=frames[f];for(let i=0,j=0;i<px.length;i++,j+=4)px[i]=near(key(d,j));
    out.push(0x21);out.push(0xF9);out.push(4);out.push(4);out.word(delay*n);out.push(0);out.push(0);out.push(0x2C);out.word(0);out.word(0);out.word(w);out.word(h);out.push(0);lzw(px,out);f+=n-1;
    onProgress?.((f+1)/frames.length);await new Promise(r=>setTimeout(r))}
  out.push(0x3B);return new Blob([out.done()],{type:'image/gif'})}
return {encode};
})();
