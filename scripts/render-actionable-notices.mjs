import {writeFile,mkdir} from 'node:fs/promises';
const targets=await(await fetch('http://127.0.0.1:5593/json/list')).json();const target=targets.find(x=>x.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;const pending=new Map();socket.onmessage=event=>{const v=JSON.parse(event.data);const p=pending.get(v.id);if(p){pending.delete(v.id);v.error?p.reject(Error(v.error.message)):p.resolve(v.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const value=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result?.value;
await send('Page.enable');await mkdir('tmp/notices-v2010-render',{recursive:true});const results=[];
const scenarios=process.argv.slice(2).length?process.argv.slice(2):['save','error','global','readonly','focus'];
for(const width of [1416,390])for(const scenario of scenarios){
await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:`http://127.0.0.1:5592/actionable-notices.html?case=${scenario}`});
for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,150));if(await value("document.body.dataset.qaCapture==='ready'")){const img=await send('Page.captureScreenshot',{format:'png'});await writeFile(`tmp/notices-v2010-render/${scenario}-${width}.png`,Buffer.from(img.data,'base64'));await value("document.body.dataset.qaCapture='done'");}if(await value('window.__QA_NOTICE_DONE===true'))break;}
const report=await value('window.__QA_NOTICE_REPORT');results.push(report);console.log(JSON.stringify(report));if(!report?.pass){await writeFile('tmp/notices-v2010-results.json',JSON.stringify(results,null,2));throw Error(`Flow failed ${scenario}/${width}`);}}
await writeFile('tmp/notices-v2010-results.json',JSON.stringify(results,null,2));socket.close();
