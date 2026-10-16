// Reuse existing browser suites against isolated Vite ports. Only fixture URLs
// and evidence destinations are substituted; product assertions stay intact.
import {createServer} from "vite";
import {spawn} from "node:child_process";
import {mkdir,readFile,writeFile,unlink} from "node:fs/promises";
import {resolve} from "node:path";
const dir="docs/qa/evidence/visual-standard-v280/preservation",servers=new Map(),results=[];
const runtime="C:/Users/Bruno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright";
const browser="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const portMap={5717:5820,5697:5821,5706:5822,5587:5823,5785:5824,5711:5825,5715:5826};
const configs=[
 ["web/vite.config.ts",5820,"manual"],
 ["tests/ui/position-follow-up.vite.config.mts",5821],
 ["tests/ui/selection-processes.vite.config.mts",5822],
 ["tests/ui/visual-foundation.vite.config.mts",5823],
 ["tests/ui/question-bank.vite.config.mts",5824],
 ["tests/ui/tokens-prisma.vite.config.mts",5825],
 ["web/vite.config.ts",5826,"people"],
];
const jobs=[
 ["scripts/test-manual-profile-browser.mjs","manual"],
 ["tests/tooling/positionFollowUp.browser.mjs","followup"],
 ["tests/tooling/operationalFocusFollowUp.browser.mjs","followup-details"],
 ["tests/tooling/navigationDefaults.browser.mjs","navigation"],
 ["tests/tooling/knowledgeCohesion.browser.mjs","knowledge"],
 ["tests/tooling/questionBank.browser.mjs","bank"],
 ["tests/tooling/questionBankStates.browser.mjs","bank-states"],
 ["tests/tooling/tokensCalendarStates.browser.mjs","tokens-states"],
 ["tests/tooling/tokensCalendar.browser.mjs","tokens"],
 ["tests/tooling/peopleTypography.browser.mjs","people"],
 ["tests/tooling/peopleColumns.browser.mjs","people-columns"],
];
const filter=process.env.PRISMA_PRESERVATION_JOBS?.split(",");
const required={manual:[5820],followup:[5821],"followup-details":[5821],navigation:[5822,5823],knowledge:[5823],bank:[5824],"bank-states":[5824],"tokens-states":[5825],tokens:[5825],people:[5826],"people-columns":[5826]};
await mkdir(dir,{recursive:true});
try{
 for(const [file,name]of jobs.filter(([,name])=>!filter||filter.includes(name))){
  for(const [port,server]of servers)if(!required[name].includes(port)){await server.close();servers.delete(port);}
  for(const [config,port,mode]of configs.filter(([,port])=>required[name].includes(port)&&!servers.has(port))){
   const plugins=mode?[{name:"isolated-client",enforce:"pre",transform(_code,id){if(id.replaceAll("\\","/").endsWith("/infrastructure/supabase/client.ts"))return 'export const supabase={};';}}]:[];
   const server=await createServer({configFile:config,...(mode==="people"?{root:process.cwd()}:{}),cacheDir:"tmp/vite-v280-preservation-"+port,plugins,server:{host:"127.0.0.1",port,strictPort:true},logLevel:"error"});await server.listen();servers.set(port,server);
  }
  let source=await readFile(file,"utf8");
  for(const [oldPort,port]of Object.entries(portMap))source=source.replaceAll(oldPort,String(port));
  source=source.replace(/docs\/qa\/evidence\/[\w/-]+/g,dir+"/"+name);
  // The knowledge assertion uses fixed origins; port substitution also updates its allowlist.
  const temporary=resolve(file.replace(/[^/]+$/,".v280-"+name+".mjs"));
  await writeFile(temporary,source);console.log("START",name,new Date().toISOString());const started=Date.now();
  const log=await new Promise(resolve=>{let output="";const child=spawn(process.execPath,[temporary,...(name==="manual"?["--review-only"]:[])],{windowsHide:true,env:{...process.env,PRISMA_PLAYWRIGHT_PATH:runtime,PRISMA_BROWSER_PATH:browser,PRISMA_MANUAL_QA_URL:"http://127.0.0.1:5820"}});child.stdout.on("data",b=>output+=b);child.stderr.on("data",b=>output+=b);child.on("close",code=>resolve({code,output}));});
  await writeFile(dir+"/"+name+".log",log.output);await unlink(temporary);results.push({name,source:file,exitCode:log.code,seconds:(Date.now()-started)/1000});const previous=filter?JSON.parse(await readFile(dir+"/runs.json","utf8").catch(()=>"[]")):[];await writeFile(dir+"/runs.json",JSON.stringify([...previous.filter(x=>!results.some(y=>y.name===x.name)),...results],null,2));console.log("END",name,log.code,results.at(-1).seconds);
  if(log.code!==0){console.error(log.output.slice(-2200));process.exitCode=1;}
 }
}finally{for(const server of servers.values())await server.close();}
