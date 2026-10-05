import {mkdir,writeFile} from 'node:fs/promises';
import {generateSynthesis} from './profile-synthesis-worker.mjs';
import {loadParserSecret} from './parser-ia-service.mjs';
import {cases} from '../tests/fixtures/profileSynthesis.mjs';
// Exactly three synthetic calls. Never import or publish a real Person.
const config={openaiKey:await loadParserSecret(),model:'gpt-5.6-luna'};
await mkdir('tmp/profile-synthesis-benchmark',{recursive:true});
for(const fixture of cases){const started=Date.now();try{const r=await generateSynthesis(fixture.sources,config);await writeFile(`tmp/profile-synthesis-benchmark/${fixture.id}.json`,JSON.stringify(r,null,2));console.log(JSON.stringify({case:fixture.id,status:'generated',durationMs:Date.now()-started,model:r.model,inputTokens:r.inputTokens,outputTokens:r.outputTokens}));}catch{console.error(JSON.stringify({case:fixture.id,status:'failed'}));process.exitCode=1;}}
