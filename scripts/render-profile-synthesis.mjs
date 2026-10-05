import {writeFile,mkdir} from 'node:fs/promises';
let surfaces;
for(let i=0;i<40;i++){try{surfaces=await(await fetch('http://127.0.0.1:5590/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
if(!surfaces)throw Error('QA browser startup timeout');
const target=surfaces.find(x=>x.type==='page');
if(!target)throw Error('QA headless browser unavailable');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;const pending=new Map();
socket.onmessage=event=>{const value=JSON.parse(event.data);if(value.id){const p=pending.get(value.id);if(p){pending.delete(value.id);value.error?p.reject(Error(value.error.message)):p.resolve(value.result);}}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
await send('Page.enable');
await mkdir('tmp/profile-synthesis-render',{recursive:true});
for(const width of [1416,390])for(const scenario of ['summary','source','pending','failed','previous','insufficient']){
 await send('Emulation.setDeviceMetricsOverride',{width,height:1060,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:`http://127.0.0.1:5585/profile-synthesis.html?case=${scenario}`});
 let complete=false;
 for(let i=0;i<60;i++) {await new Promise(r=>setTimeout(r,250));const state=await send('Runtime.evaluate',{expression:`location.search === '?case=${scenario}' && window.__QA_SYNTHESIS_DONE === true`,returnByValue:true});if(state.result?.value){complete=true;break;}}
 if(!complete)throw Error(`Fixture timeout ${width}/${scenario}`);
 await send('Runtime.evaluate',{expression:'window.scrollTo(0,0)'});
 const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(`tmp/profile-synthesis-render/${scenario}-${width}.png`,Buffer.from(capture.data,'base64'));
 console.log(`Rendered ${scenario} ${width}`);
}
socket.close();
