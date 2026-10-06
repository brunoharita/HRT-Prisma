import {writeFile,mkdir} from 'node:fs/promises';
const highlightRun=process.argv.includes('--cards-only');
const renderDirectory=highlightRun?'tmp/profile-summary-cards-v2012-render':'tmp/profile-synthesis-v208-render';
let surfaces;
for(let i=0;i<40;i++){try{surfaces=await(await fetch('http://127.0.0.1:5590/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
if(!surfaces)throw Error('QA browser startup timeout');
const target=surfaces.find(x=>x.type==='page' && x.url.startsWith('http://127.0.0.1:5585/')) ?? surfaces.find(x=>x.type==='page' && x.url==='about:blank');
if(!target)throw Error('QA headless browser unavailable');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;const pending=new Map();
socket.onmessage=event=>{const value=JSON.parse(event.data);if(value.id){const p=pending.get(value.id);if(p){pending.delete(value.id);value.error?p.reject(Error(value.error.message)):p.resolve(value.result);}}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
await send('Page.enable');
await mkdir(renderDirectory,{recursive:true});
for(const width of highlightRun?[1448,390]:[1416,390])for(const scenario of highlightRun?['cards-executive','cards-source','cards-failed','cards-render','source-switch','refresh','multiple-errors','long-content']:process.argv.includes('--focus-only')?['long-content','source-switch','keyboard']:process.argv.includes('--interaction-only')?['source','source-error','refresh','read-error','long-content','source-switch','keyboard','origin-error']:process.argv.includes('--query-only')?['query-only','pending','retry','read-error']:process.argv.includes('--refresh-only')?['refresh']:['summary','source','pending','failed','previous','insufficient','refresh','read-error','render-error','source-error','word-limit','retry','previous-failed','partial-reference','multiple-errors','empty-overview','section-render','query-only','overview-render','long-content','source-switch','keyboard','origin-error']){
 await send('Emulation.setDeviceMetricsOverride',{width,height:1060,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:`http://127.0.0.1:5585/profile-synthesis.html?case=${scenario}`});
 let complete=false;
 for(let i=0;i<80;i++) {await new Promise(r=>setTimeout(r,250));
  if(scenario==='keyboard') {const ready=await send('Runtime.evaluate',{expression:"document.body.dataset.keyboard==='pending'",returnByValue:true});if(ready.result?.value){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await new Promise(r=>setTimeout(r,400));const opened=await send('Runtime.evaluate',{expression:"Boolean(document.querySelector('.ant-drawer-open'))",returnByValue:true});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Runtime.evaluate',{expression:`document.body.dataset.keyboard='${opened.result?.value?'passed':'failed'}'`});}}
  const state=await send('Runtime.evaluate',{expression:`location.search === '?case=${scenario}' && window.__QA_SYNTHESIS_DONE === true`,returnByValue:true});if(state.result?.value){complete=true;break;}}
 if(!complete)throw Error(`Fixture timeout ${width}/${scenario}`);
 await send('Runtime.evaluate',{expression:'window.scrollTo(0,0)'});
 const capture=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(`${renderDirectory}/${scenario}-${width}.png`,Buffer.from(capture.data,'base64'));
 if(['summary','cards-executive','long-content'].includes(scenario)){const metrics=await send('Page.getLayoutMetrics');const full=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(metrics.cssContentSize.height),scale:1}});await writeFile(`${renderDirectory}/${scenario}-${width}-full.png`,Buffer.from(full.data,'base64'));}
 console.log(`Rendered ${scenario} ${width}`);
}
socket.close();
