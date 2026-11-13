// Photo Lab files: the start screen, opening photos (device, camera, Media Vault, paste,
// drag and drop), export, Save to Vault, Sell this, auto-save in this browser, and the menus.

// ---- Opening
function loadImage(file){return new Promise((res,rej)=>{let u=URL.createObjectURL(file),im=new Image();im.onload=()=>{res(im);setTimeout(()=>URL.revokeObjectURL(u),1000)};im.onerror=()=>{URL.revokeObjectURL(u);rej(Error('That file could not be opened as a picture.'))};im.src=u})}
function baseName(n){return String(n||'Image').replace(/\.[a-z0-9]{2,5}$/i,'').slice(0,80)||'Image'}
async function openFile(file){if(!file)return;try{busy(true,'Opening…');let im=await loadImage(file);docFromImage(im,baseName(file.name))}catch(e){toast(e.message)}finally{busy(false)}}
async function addAsLayers(files){if(!files||!files.length)return;if(!doc)return openFile(files[0]);for(const f of files){try{let im=await loadImage(f),[w,h]=fitSize(im.width,im.height),s=Math.min(1,doc.w/w,doc.h/h);w=Math.round(w*s);h=Math.round(h*s);let l=newLayer(baseName(f.name),w,h);g2(l.canvas).drawImage(im,0,0,w,h);l.x=Math.round((doc.w-w)/2);l.y=Math.round((doc.h-h)/2);addLayer(l,'Open as layer')}catch(e){toast(e.message)}}}
$('fileIn').onchange=e=>{openFile(e.target.files[0]);e.target.value=''};
$('camIn').onchange=e=>{let f=e.target.files[0];e.target.value='';if(!f)return;if(doc&&$('start').hidden)addAsLayers([f]);else openFile(f)};
$('layerIn').onchange=e=>{addAsLayers([...e.target.files]);e.target.value=''};
stage.addEventListener('dragover',e=>{e.preventDefault()});
stage.addEventListener('drop',e=>{e.preventDefault();let fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'));if(!fs.length)return;if(doc)addAsLayers(fs);else openFile(fs[0])});
document.addEventListener('paste',e=>{if(e.target.closest&&e.target.closest('input,textarea'))return;let f=[...(e.clipboardData||{}).files||[]].find(f=>f.type.startsWith('image/'));if(!f)return;e.preventDefault();loadImage(f).then(im=>{let c=mk(im.width,im.height);g2(c).drawImage(im,0,0);if(doc&&$('start').hidden)pasteCanvas(c);else docFromImage(c,'Pasted image')}).catch(err=>toast(err.message))});
function openVaultPicker(){if(!VaultPicker.inTapShop)return toast('The Media Vault works inside your TapShop dashboard.');VaultPicker.open({title:'Open from your Media Vault',kinds:['image'],accept:i=>!/svg/.test(i.contentType),onPick:importVaultItem})}
// Called by the picker and by the dashboard's "Use in Studio" (tapshop:vault-import).
async function importVaultItem(item){
  if(item.kind!=='image')return toast('Photo Lab opens pictures. Use the Video Editor for videos.');
  let file;try{busy(true,'Loading '+item.name+'…');file=await VaultPicker.file(item)}catch(e){busy(false);return toast(e.message)}busy(false);
  if(doc&&$('start').hidden){let c=await choose('Open '+item.name,[['new','Open as a new image'],['layer','Add as a layer on this image']]);if(!c)return;if(c==='layer')return addAsLayers([file])}
  openFile(file);
}

// ---- Output
function outName(){return (doc&&doc.name||'Image').replace(/[^\w .-]/g,'').trim().slice(0,80)||'Image'}
function canvasBlob(c,type='image/png',q){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('The picture could not be made — try a smaller size.')),type,q))}
function exportCanvas(fmt,scale){let f=flattened();if(fmt!=='image/png'){let o=mk(f.width,f.height),g=g2(o);g.fillStyle='#fff';g.fillRect(0,0,o.width,o.height);g.drawImage(f,0,0);f=o}return scale&&scale!==1?scaledCopy(f,scale):f}
function download(blob,name){let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function openExport(){if(!doc)return;openDialog({title:'Export image',modal:true,okText:'Download',fields:[{key:'name',type:'text',label:'File name',value:outName()},{key:'fmt',type:'select',label:'Format',value:'image/png',options:[['image/png','PNG (keeps see-through parts)'],['image/jpeg','JPEG (smaller, for photos)'],['image/webp','WebP (smallest)']]},{key:'q',type:'range',label:'Quality (JPEG and WebP)',min:40,max:100,value:90,unit:'%'},{key:'s',type:'range',label:'Size',min:10,max:200,value:100,unit:'%'},{key:'note',type:'note',label:'JPEG has no see-through parts; they become white.'}],
  ok:v=>later(async()=>{let c=exportCanvas(v.fmt,v.s/100),b=await canvasBlob(c,v.fmt,v.q/100),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[v.fmt];if(b.type!==v.fmt&&v.fmt==='image/webp'){ext='png';toast('This browser can’t make WebP, so it saved a PNG.')}download(b,(v.name||outName()).replace(/[^\w .-]/g,'')+'.'+ext)},'Exporting…')})}
async function sendToVault(sell){if(!doc)return;if(!inTapShop)return toast('Saving to the Media Vault works inside your TapShop dashboard.');
  await later(async()=>{let b=await canvasBlob(flattened());window.parent.postMessage({type:'tapshop:vault-save',version:1,items:[{blob:b,name:outName()+'.png',source:'design'}],sell:!!sell},location.origin)},'Preparing…')}
$('exportBtn').onclick=openExport;$('vaultBtn').onclick=()=>sendToVault(false);$('sellBtn').onclick=()=>sendToVault(true);
if(!inTapShop){$('vaultBtn').hidden=true;$('sellBtn').hidden=true;$('openVault').hidden=true}

// ---- Auto-save: the current image (layers as PNGs) in IndexedDB, per creator like the Video Editor.
function scope(){try{localStorage.setItem('tapshop-scope-probe','1');let k=Object.keys(localStorage).find(k=>/^studio:.+:tapshop-scope-probe$/.test(k));return k?k.slice(7,-':tapshop-scope-probe'.length):'local'}catch{return 'local'}}
let dbp=null;
function db(){return dbp||(dbp=new Promise((res,rej)=>{let r=indexedDB.open('tapshop-photo-'+scope(),1);r.onupgradeneeded=()=>r.result.createObjectStore('docs',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
async function idb(mode,fn){let d=await db();return new Promise((res,rej)=>{let t=d.transaction('docs',mode),s=t.objectStore('docs'),r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})}
let saveT=0,saving=false,lastSaved=-1;
onChange.push(()=>{clearTimeout(saveT);saveT=setTimeout(autosave,2500)});
async function autosave(){
  if(!doc||saving||stroke)return;let mark=hpos+':'+hist.length+':'+doc.name;if(mark===lastSaved)return;saving=true;
  try{let layers=[];for(const l of doc.layers)layers.push({name:l.name,x:l.x,y:l.y,visible:l.visible,opacity:l.opacity,blend:l.blend,lockAlpha:l.lockAlpha,text:l.text,blob:await canvasBlob(l.canvas)});
    let s=Math.min(1,240/Math.max(doc.w,doc.h)),thumb=await canvasBlob(scaledCopy(flattened(),s),'image/jpeg',.7);
    await idb('readwrite',st=>st.put({id:'current',name:doc.name,w:doc.w,h:doc.h,active:doc.active,layers,thumb,at:Date.now()}));lastSaved=mark}
  catch(e){console.warn('Photo Lab auto-save failed',e)}finally{saving=false}
}
async function loadSaved(){try{return await idb('readonly',st=>st.get('current'))}catch{return null}}
async function resume(rec){await later(async()=>{makeDoc(rec.w,rec.h,rec.name);for(const L of rec.layers){let bm=await createImageBitmap(L.blob),l=newLayer(L.name,bm.width,bm.height,L.x,L.y);g2(l.canvas).drawImage(bm,0,0);Object.assign(l,{visible:L.visible,opacity:L.opacity,blend:L.blend,lockAlpha:!!L.lockAlpha,text:L.text||null});doc.layers.push(l)}doc.active=clamp(rec.active|0,0,doc.layers.length-1);opened('Reopen image')},'Opening…')}

function renameImage(){openDialog({title:'Rename image',fields:[{key:'n',type:'text',label:'Name',value:doc.name}],ok:v=>{doc.name=(v.n||'Untitled image').slice(0,80);$('docName').value=doc.name;onChange.forEach(f=>f())}})}

// ---- Start screen
const SIZES=[['Instagram post',1080,1080],['Instagram portrait',1080,1350],['Story / Reel / TikTok',1080,1920],['YouTube thumbnail',1280,720],['Facebook post',1200,630],['Pinterest pin',1000,1500],['Product photo',2000,2000],['HD wallpaper',1920,1080]];
function showStart(){
  let box=$('sizes');box.innerHTML='';for(const [n,w,h] of SIZES){let b=document.createElement('button');b.innerHTML=`${esc(n)}<small>${w} × ${h}</small>`;b.onclick=()=>startDoc(w,h,$('cfill').value,n);box.appendChild(b)}
  $('startClose').hidden=!doc;$('start').hidden=false;
  loadSaved().then(r=>{if(r&&r.layers&&r.layers.length&&!doc){$('resume').hidden=false;$('resumeName').textContent=' — '+r.name;$('resumeBtn').onclick=()=>resume(r)}else $('resume').hidden=true});
}
$('openDevice').onclick=()=>$('fileIn').click();$('openCamera').onclick=()=>$('camIn').click();$('openVault').onclick=openVaultPicker;
$('customBtn').onclick=()=>startDoc(clamp(+$('cw').value||1080,1,MAX_SIDE),clamp(+$('ch').value||1080,1,MAX_SIDE),$('cfill').value,'Untitled image');
$('startClose').onclick=()=>{$('start').hidden=true;render()};

// ---- Menus
MENUS={
 File:[['New image…',showStart,'Ctrl+N',false],['Open a photo…',()=>$('fileIn').click(),'Ctrl+O',false],['Open from Media Vault…',openVaultPicker,'',false],['Take a photo…',()=>$('camIn').click(),'',false],['Open as layers…',()=>$('layerIn').click()],['Rename image…',renameImage],'-',['Export as PNG / JPEG / WebP…',openExport,'Ctrl+E'],['Save to Media Vault',()=>sendToVault(false)],['Sell this on my store',()=>sendToVault(true)],'-',['Back to Studio',()=>location.href='index.html','',false]],
 Edit:[['Undo',undo,'Ctrl+Z'],['Redo',redo,'Ctrl+Y'],'-',['Cut',cutSel,'Ctrl+X'],['Copy',()=>copySel(false),'Ctrl+C'],['Copy what you see (all layers)',()=>copySel(true),'Ctrl+Shift+C'],['Paste as new layer',pasteClip,'Ctrl+V'],['Clear',()=>clearSel(),'Delete'],'-',['Fill with foreground colour',()=>fillSel('fg'),'Ctrl+,'],['Fill with background colour',()=>fillSel('bg'),'Ctrl+.'],['Stroke selection…',strokeSel]],
 Select:[['All',selectAll,'Ctrl+A'],['None',selectNone,'Ctrl+Shift+A'],['Invert',selectInvert,'Ctrl+I'],'-',['Feather (soften edges)…',featherSel],['Grow…',()=>growSel(1)],['Shrink…',()=>growSel(-1)],['Border…',borderSel],'-',['Select by colour (tool)',()=>setTool('bycolor')],['Magic wand (tool)',()=>setTool('wand')],['From layer’s see-through parts',alphaToSel],'-',['Copy selection to new layer',()=>floatSelection(false)],['Cut selection to new layer',()=>floatSelection(true)]],
 Image:[['Canvas size…',canvasSize],['Scale image…',scaleImage],'-',['Crop (tool)',()=>setTool('crop')],['Crop to selection',cropToSelection],['Crop to content',cropToContent],'-',['Flip sideways',()=>flipImage(true)],['Flip upside down',()=>flipImage(false)],['Rotate 90° right',()=>rotateImage(90)],['Rotate 90° left',()=>rotateImage(-90)],['Rotate 180°',()=>rotateImage(180)],['Rotate by angle…',rotateArbitrary],'-',['Merge visible layers',mergeVisible],['Flatten image',flattenImage]],
 Layer:[['New layer…',newLayerDialog,'Ctrl+Shift+N'],['Duplicate layer',duplicateLayer,'Ctrl+D'],['Delete layer',deleteLayer],['Merge down',mergeDown],'-',['Raise',()=>moveLayer(1)],['Lower',()=>moveLayer(-1)],['Bring to top',()=>moveLayer('top')],['Send to bottom',()=>moveLayer('bottom')],'-',['Transform (tool)',()=>setTool('transform')],['Scale layer…',scaleLayer],['Flip layer sideways',()=>flipLayer(true)],['Flip layer upside down',()=>flipLayer(false)],['Rotate layer 90° right',()=>rotateLayer(90)],['Rotate layer 90° left',()=>rotateLayer(-90)],['Rotate layer by angle…',rotateLayerDialog],'-',['Layer to image size',layerToImageSize],['Rename layer…',()=>renameLayer(layer())]],
 Colours:['#Light and colour',['Brightness and contrast…',brightnessContrast],['Exposure…',exposure],['Levels…',levels],['Curves…',curves],['Hue and saturation…',hueSaturation],['Vibrance…',vibrance],['Temperature and tint…',temperature],['Colour balance…',colorBalance],['Colourise…',colorize],'#Auto',['Stretch contrast',()=>autoLevels(false)],['White balance',()=>autoLevels(true)],'#Effects',['Desaturate (black and white)…',desaturate],['Sepia…',sepia],['Invert colours',invertColors],['Threshold…',threshold],['Posterise…',posterize],['Colour to transparent…',colorToAlpha]],
 Filters:['#Blur',['Gaussian blur…',gaussianBlur],['Motion blur…',motionBlur],['Pixelate…',pixelize],'#Enhance',['Sharpen (unsharp mask)…',unsharp],['Soft glow…',softGlow],'#Distort',['Waves and ripples…',waves],['Whirl and pinch…',whirl],'#Edges and texture',['Emboss…',emboss],['Edge detect / sketch…',edgeDetect],['Add noise / grain…',addNoise],'#Light and shadow',['Vignette…',vignette],['Drop shadow…',dropShadow],['Outline…',outline],['Old photo…',oldPhoto]],
 View:[['Zoom in',()=>zoomAt(1.25),'+'],['Zoom out',()=>zoomAt(.8),'−'],['Fit in window',fitView,'Ctrl+Shift+J'],['Actual size (100%)',()=>zoomTo(1),'1'],['200%',()=>zoomTo(2)],'-',['Show layers',()=>showTab('layers')],['Show history',()=>showTab('hist')],['Show tool options',()=>showTab('opts')]],
};

// ---- Start
buildMenubar();buildToolbox();
let startTool='brush';try{let t=localStorage.getItem('tapshop-photo-tool');if(TOOLS.some(x=>x.id===t))startTool=t}catch{}
setTool(startTool);changed();showStart();
window.addEventListener('beforeunload',()=>{if(doc)autosave()});
