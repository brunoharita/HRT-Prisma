import test from 'node:test';
import assert from 'node:assert/strict';
import {readProfileSynthesisResult,readProfileSynthesisView,PROFILE_SYNTHESIS_QUESTIONS,preserveProfileSynthesisSections,explainSynthesisSection} from '../../dist/src/domain/profileSynthesis.js';
import {providerRequest,generateSynthesis,runOnce} from '../../scripts/profile-synthesis-worker.mjs';
import {sources,result} from '../fixtures/profileSynthesis.mjs';
test('eight deep axes and grounded compact result',()=>{ assert.equal(PROFILE_SYNTHESIS_QUESTIONS.length,8); assert.deepEqual(readProfileSynthesisResult(result,sources),result); });
test('malformed Unicode rejected before PostgreSQL while valid Unicode preserved',()=>{const x=structuredClone(result);x.overview[0].text='Atuação \ud800';assert.throws(()=>readProfileSynthesisResult(x,sources));x.overview[0].text='Atuação financeira ✅';assert.equal(readProfileSynthesisResult(x,sources).overview[0].text,x.overview[0].text);});
for(const [name,mutate] of [
 ['missing field',x=>delete x.overview],['unknown source',x=>x.overview[0].sourceIds=['invented']],['reordered axis',x=>x.answers.reverse()],['extra field',x=>x.score=99],['invalid nature',x=>x.overview[0].nature='verified'],['null nature',x=>x.overview[0].nature=null],['duplicate reference',x=>x.overview[0].sourceIds.push(x.overview[0].sourceIds[0])],['too long',x=>x.overview[0].text='word '.repeat(121)],['partial without gap',x=>x.answers[0].missingInformation=[]],['insufficient with invention',x=>x.answers[0].status='insufficient'],['too many questions',x=>x.clarifications.push(...x.clarifications)],['unsupported verification',x=>x.overview[0].text='Competência verificada por Assessment.'],['control character',x=>x.overview[0].text='bad\u0000text']
])test(`reject ${name}`,()=>{const x=structuredClone(result);mutate(x);assert.throws(()=>readProfileSynthesisResult(x,sources));});
test('common read excludes body and preserves labeled prior result with its own references',()=>{const refs=sources.map(({text,...x})=>x);const raw={organizationId:'a',personId:'p',profileId:'v',profileVersion:1,state:'queued',analysisId:null,generatedAt:null,model:null,result:null,previous:{analysisId:'old',profileVersion:1,generatedAt:'2026-10-04T12:00:00Z',result,sources:refs},sources:refs,errorCode:null,basisHash:'a'.repeat(64)};assert.equal(readProfileSynthesisView(raw,'a','p').previous.analysisId,'old');assert.throws(()=>readProfileSynthesisView(raw,'b','p'));});
test('request uses stable strict schema without tools, identities or stored provider response',()=>{const r=providerRequest([{...sources[0],text:'Contato qa@example.invalid (11) 99999-0000'}],'gpt-5.6-luna');assert.equal(r.store,false);assert.equal(r.tools,undefined);assert.equal(r.text.format.strict,true);assert(!r.input[0].content[0].text.includes('qa@example.invalid'));assert(!r.input[0].content[0].text.includes('99999'));assert.throws(()=>providerRequest([{...sources[0],text:'x'.repeat(19000)}],'gpt-5.6-luna'));});
const config={supabaseUrl:'https://fixture.supabase.co',publishableKey:'public-key',workerSecret:'secret'.repeat(12),openaiKey:'private-key',model:'gpt-5.6-luna'};
const response={status:'completed',model:config.model,usage:{input_tokens:100,output_tokens:200},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]};
test('provider parser accepts grounded output and rejects incomplete/refusal/unknown model',async()=>{assert.deepEqual((await generateSynthesis(sources,config,async()=>Response.json(response))).result,preserveProfileSynthesisSections(result,sources));for(const raw of [{...response,status:'incomplete'},{...response,model:'unapproved'}, {...response,output:[{type:'message',content:[{type:'refusal'}]}]}])await assert.rejects(generateSynthesis(sources,config,async()=>Response.json(raw)));});
test('one claim, one call, one completion; no PII or secret in operational result',async()=>{const calls=[];const state=await runOnce(config,async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(url.includes('claim_'))return Response.json({id:'job',lease:'lease',model:config.model,sources});if(url.includes('complete_'))return new Response(null,{status:204});return Response.json(response);});assert.equal(calls.length,3);assert.equal(state.state,'complete');assert(!JSON.stringify(state).includes('secret'));assert.equal(calls[2].body.p_result.contractVersion,'profile-synthesis-1.1.0');});
test('empty queue makes zero provider calls; transient failure completed with fixed code',async()=>{let calls=0;assert.equal((await runOnce(config,async()=>{calls++;return Response.json(null);})).state,'idle');assert.equal(calls,1);const bodies=[];await runOnce(config,async(url,options)=>{if(url.includes('claim_'))return Response.json({id:'job',lease:'lease',model:config.model,sources});if(url.includes('complete_')){bodies.push(JSON.parse(options.body));return new Response(null,{status:204});}return new Response('private error content',{status:429});});assert.equal(bodies[0].p_error,'RATE_LIMITED');assert.equal(bodies[0].p_result,null);});

for (const [name,raw,reason] of [
 ['truncated',{...response,status:'incomplete'},'OUTPUT_INCOMPLETE'],
 ['refusal',{...response,output:[{type:'message',content:[{type:'refusal',refusal:'private'}]}]},'REFUSAL'],
 ['model',{...response,model:'unapproved'},'MODEL_MISMATCH'],
 ['json',{...response,output:[{type:'message',content:[{type:'output_text',text:'private broken json'}]}]},'JSON_INVALID'],

]) test(`diagnostic ${name} preserves metrics without response body`,async()=>{
 let failure; try {await generateSynthesis(sources,config,async()=>Response.json(raw));}catch(cause){failure=cause;}
 assert.equal(failure.diagnostic.reason,reason);assert.equal(failure.inputTokens,100);assert.equal(failure.outputTokens,200);
 assert(!JSON.stringify(failure).includes('private'));if(reason==='WORD_LIMIT'){assert.equal(failure.diagnostic.section,'overview');assert.equal(failure.diagnostic.observed,121);}
});
test('rejected result completes attempt with diagnosis and actual token usage',async()=>{
 let completion;const raw={...response,status:'incomplete'};
 const state=await runOnce(config,async(url,o)=>{if(url.includes('claim_'))return Response.json({id:'job',lease:'lease',model:config.model,sources});if(url.includes('complete_')){completion=JSON.parse(o.body);return Response.json({state:'failed',errorCode:'RESPONSE_INVALID',diagnostic:completion.p_diagnostic});}return Response.json(raw);});
 assert.equal(completion.p_input_tokens,100);assert.equal(completion.p_output_tokens,200);assert.equal(completion.p_diagnostic.reason,'OUTPUT_INCOMPLETE');assert.equal(state.jobId,'job');assert.equal(state.state,'failed');
});
test('database rejection is returned as failed, never falsely logged complete',async()=>{
 const state=await runOnce(config,async(url)=>url.includes('claim_')?Response.json({id:'job',lease:'lease',model:config.model,sources}):url.includes('complete_')?Response.json({state:'failed',errorCode:'RESPONSE_INVALID',diagnostic:{stage:'persistence',reason:'DATABASE_CONTRACT'}}):Response.json(response));assert.equal(state.state,'failed');assert.equal(state.diagnostic.reason,'DATABASE_CONTRACT');
});
test('109 long source identifiers and sparse content retain strict provenance',async()=>{
 const rich=Array.from({length:109},(_,i)=>({...sources[0],id:`experience_${String(i).padStart(3,'0')}_${'x'.repeat(51)}`,text:'Atividades profissionais publicadas '.repeat(4)}));
 const grounded=structuredClone(result);for(const s of [...grounded.overview,...grounded.answers.flatMap(a=>a.statements),...grounded.clarifications])s.sourceIds=[rich[0].id];
 assert(Buffer.byteLength(providerRequest(rich,config.model).input[0].content[0].text)<48000);
 assert.deepEqual((await generateSynthesis(rich,config,async()=>Response.json({...response,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(grounded)}]}]}))).result,preserveProfileSynthesisSections(grounded,rich));
});
test('bad source detected before provider and no raw exception data exposed',async()=>{
 let calls=0;await assert.rejects(generateSynthesis([{...sources[0],text:'bad\u0000private'}],config,async()=>{calls++;throw Error('private');}),e=>e.diagnostic.stage==='input'&&e.diagnostic.reason==='SOURCE_INVALID');assert.equal(calls,0);
 await assert.rejects(generateSynthesis(sources,config,async()=>{throw Error('private connection details');}),e=>e.diagnostic.reason==='REQUEST_INTERRUPTED'&&!JSON.stringify(e).includes('private'));
});

test('invalid date does not conceal valid answers and optional diagnostic metadata minimized',()=>{
 const raw={organizationId:'a',personId:'p',profileId:'v',profileVersion:1,state:'complete',analysisId:'id',generatedAt:'invalid',model:'gpt-5.6-luna',result,previous:null,sources:sources.map(({text,...x})=>x),errorCode:null,basisHash:'a'.repeat(64)};
 assert.equal(readProfileSynthesisView(raw,'a','p').generatedAt,null);raw.generatedAt='2026-10-04T12:00:00Z';
 raw.diagnostic={version:'synthesis-diagnostic-1.0.0',stage:'contract',reason:'WORD_LIMIT',section:'personal contents',secret:'never retain',observed:121};
 const value=readProfileSynthesisView(raw,'a','p');assert.equal(value.diagnostic.reason,'WORD_LIMIT');assert.equal(value.diagnostic.section,undefined);assert(!JSON.stringify(value.diagnostic).includes('secret'));
});

for (const target of ['overview','trajectory','competencies','education','clarifications']) test(`invalid reference in ${target} preserves all other sections`,()=>{
 const input=structuredClone(result);
 if(target==='overview')input.overview[0].sourceIds=['unknown-private'];
 else if(target==='clarifications')input.clarifications[0].sourceIds=['unknown-private'];
 else input.answers.find(x=>x.questionId===target).statements[0].sourceIds=['unknown-private'];
 const partial=preserveProfileSynthesisSections(input,sources);
 assert.equal(partial.answers.length,8);assert(partial.issues.some(x=>x.section===target && x.reason==='REFERENCES_INVALID'));
 assert(!JSON.stringify(partial).includes('unknown-private'));
 for(const answer of result.answers)if(answer.questionId!==target)assert.deepEqual(partial.answers.find(x=>x.questionId===answer.questionId).statements,answer.statements);
 assert.deepEqual(readProfileSynthesisResult(partial,sources),partial);
 assert.deepEqual(preserveProfileSynthesisSections(partial,sources),partial);
});
test('multiple failures preserve safe siblings, no invention or unsupported verification',()=>{
 const input=structuredClone(result);input.overview[0].sourceIds=['bad'];input.answers[0].statements[0].text='Unsafe\u0000private';input.answers[3].statements[0].text='Competência verificada por Assessment.';
 const partial=preserveProfileSynthesisSections(input,sources);assert.equal(partial.issues.length,3);assert.equal(partial.overview.length,2);assert.equal(partial.answers[1].statements.length,1);assert(!JSON.stringify(partial).includes('Unsafe'));assert(!JSON.stringify(partial).includes('Competência verificada'));
});
test('missing overview and one axis do not discard valid answers; unknown contract fails closed',()=>{
 const input=structuredClone(result);delete input.overview;input.answers=input.answers.filter(x=>x.questionId!=='education');const partial=preserveProfileSynthesisSections(input,sources);assert.equal(partial.overview.length,0);assert.equal(partial.answers.length,8);assert.equal(partial.answers[1].statements.length,1);assert(partial.issues.some(x=>x.section==='education'));
 assert.throws(()=>preserveProfileSynthesisSections({...input,contractVersion:'unknown'},sources));
});
test('closed source enums and limits cover statements and follow-up questions',()=>{
 const schema=providerRequest(sources,config.model).text.format.schema;
 for(const refs of [schema.properties.overview.items.properties.sourceIds,schema.properties.answers.items.properties.statements.items.properties.sourceIds,schema.properties.clarifications.items.properties.sourceIds]){assert.equal(refs.items.$ref,"#/$defs/sourceReference");assert.deepEqual(schema.$defs.sourceReference.enum,sources.map(x=>x.id));assert.equal(refs.minItems,1);assert.equal(refs.maxItems,5);}
});
test('partial worker result is completed once with tokens and valid units persisted',async()=>{
 const input=structuredClone(result);input.answers[3].statements[0].sourceIds=['bad'];let completion;
 const state=await runOnce(config,async(url,o)=>url.includes('claim_')?Response.json({id:'job',lease:'lease',model:config.model,sources}):url.includes('complete_')?(completion=JSON.parse(o.body),Response.json({state:'complete'})):Response.json({...response,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(input)}]}]}));
 assert.equal(state.state,'complete');assert.equal(completion.p_error,null);assert.equal(completion.p_result.answers[1].statements.length,1);assert.equal(completion.p_result.issues[0].section,'competencies');assert.equal(completion.p_output_tokens,200);
});
test('partial explanations contain no internal codes',()=>{for(const reason of ['REFERENCES_INVALID','TEXT_INVALID','WORD_LIMIT','UNSUPPORTED_VERIFICATION'])assert(!explainSynthesisSection(reason).includes(reason));});

test('one invalid source record or historical analysis cannot conceal valid current units',()=>{
 const raw={organizationId:'a',personId:'p',profileId:'v',profileVersion:1,state:'complete',analysisId:'id',generatedAt:'2026-10-04T12:00:00Z',model:'gpt-5.6-luna',result,previous:{bad:'optional'},sources:[...sources.map(({text,...x})=>x),{id:'private-invalid'}],errorCode:null,basisHash:'a'.repeat(64)};
 const view=readProfileSynthesisView(raw,'a','p');assert.equal(view.result.answers.length,8);assert.equal(view.previous,null);assert.equal(view.sources.length,sources.length);assert.equal(view.result.issues.length,0);
});
