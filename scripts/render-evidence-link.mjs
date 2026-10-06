import {writeFile,mkdir} from 'node:fs/promises';
const targets=await(await fetch('http://127.0.0.1:5591/json/list')).json();const target=targets.find(x=>x.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;const pending=new Map();socket.onmessage=event=>{const value=JSON.parse(event.data);const p=pending.get(value.id);if(p){pending.delete(value.id);value.error?p.reject(Error(value.error.message)):p.resolve(value.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const value=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result?.value;
await send('Page.enable');await mkdir('tmp/evidence-v209-render',{recursive:true});
for(const width of [1416,390])for(const scenario of ['single','multiple','remove','failure','credential']){
await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:`http://127.0.0.1:5586/evidence-link.html?case=${scenario}`});
let captured=false;for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,200));if(await value("document.body.dataset.qaCapture==='ready'")){const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`tmp/evidence-v209-render/${scenario}-${width}.png`,Buffer.from(image.data,'base64'));await value("document.body.dataset.qaCapture='done'");captured=true;}if(await value('window.__QA_EVIDENCE_DONE===true'))break;}
const report=await value('window.__QA_EVIDENCE_REPORT');console.log(JSON.stringify(report));if(!captured||!report?.pass)throw Error(`Flow failed ${scenario}/${width}`);
}socket.close();
