import { preserveProfileSynthesisSections } from "../../../src/domain/profileSynthesis";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { ProfileSynthesisSurface } from "../../../web/src/components/profile/ProfileSynthesisSurface";
import { CanonicalProfileHeader } from "../../../web/src/components/profile/CanonicalProfileView";
import { prismaTheme } from "../../../web/src/ui/theme";
import type { ProfileSynthesisView } from "../../../src/domain/profileSynthesis";
import type { PrismaProfileView } from "../../../web/src/domain/canonicalProfile";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
// @ts-expect-error The fixture is intentionally reused by the Node benchmark and browser.
import { sources, result } from "../../fixtures/profileSynthesis.mjs";
const scenario = new URLSearchParams(location.search).get("case") ?? "summary";
const resolvedSources=sources.map((x: Record<string,unknown>)=>({...x,documentId:'00000000-0000-4000-8000-000000000001'}));
declare global { interface Window { __QA_SYNTHESIS_DONE?: boolean; } }
let reads=0,requests=0,sourceReads=0,retries=0;
const view: ProfileSynthesisView={organizationId:'synthetic',personId:'synthetic',profileId:'synthetic',profileVersion:3,state:'complete',analysisId:'synthetic',generatedAt:'2026-10-04T15:00:00Z',model:'gpt-5.6-luna',result,previous:null,sources:sources.map(({text,...x}: {text:string})=>x),errorCode:null,basisHash:'a'.repeat(64)};
if(['pending','failed','insufficient','previous','refresh','word-limit','retry','previous-failed'].includes(scenario)){view.result=null;view.analysisId=null;view.state=scenario==='pending'?'not_requested':['previous','refresh'].includes(scenario)?'queued':['word-limit','retry','previous-failed'].includes(scenario)?'failed':scenario as 'failed'|'insufficient';if(['previous','refresh','previous-failed'].includes(scenario))view.previous={analysisId:'old',profileVersion:3,generatedAt:view.generatedAt!,result,sources:view.sources};}
if(view.state==='failed'){view.errorCode='RESPONSE_INVALID';view.attempts=1;view.jobId='00000000-0000-4000-8000-000000000005';view.canRetry=true;}
if(['word-limit','retry','previous-failed'].includes(scenario))view.diagnostic={version:'synthesis-diagnostic-1.0.0',stage:'contract',reason:'WORD_LIMIT',section:'overview',observed:121,limit:120};
if(scenario==='render-error')view.generatedAt='invalid date';
if(scenario==='query-only'){view.state='not_requested';view.result=null;view.analysisId=null;}
if(['partial-reference','multiple-errors','empty-overview','section-render'].includes(scenario)) {
 const raw=structuredClone(result);
 if(scenario==='empty-overview')raw.overview=[];
 else raw.answers[3]!.statements[0]!.sourceIds=['invalid-reference'];
 if(scenario==='multiple-errors'){raw.overview[0]!.sourceIds=['another-invalid'];raw.answers[5]!.statements[0]!.text='Invalid\u0000private';}
 view.result=preserveProfileSynthesisSections(raw,resolvedSources);
 if(scenario==='section-render')view.result.answers[3]!.statements=[{text:{} as unknown as string,nature:'published_fact',sourceIds:[resolvedSources[0]!.id]}];
}
const adapter={load:async()=>{reads++;if(scenario==='read-error' || scenario==='query-only' && reads===1)throw Error('private transport content');return structuredClone(view);},retry:async()=>{retries++;view.state='queued';view.canRetry=false;return structuredClone(view);},request:async()=>{requests++;view.state="queued";return structuredClone(view);},source:async (analysis:string,id:string)=>{sourceReads++;if(scenario==='source-error' && sourceReads===1)throw Error('private source contents');const source=resolvedSources.find((x: {id:string})=>x.id===id);return analysis==='new' && source?{...source,text:'Descrição profissional atualizada nesta base.'}:source;}};
const profile:PrismaProfileView={identity:{fullName:'Marina Costa',professionalTitle:'Assistente de Departamento Financeiro',location:'Rio de Janeiro, RJ',lifecycleLabel:'Candidata',operationalStatusLabel:'Ativo'},about:{summary:'Resumo original preservado.',professionalObjective:null,areasOfExpertise:[],keyResults:[]},experiences:[{id:"experience_ui",role:"Assistente financeiro",organization:"Empresa sintética",period:"2020 - 2024",description:"Conciliação de extratos e relatórios publicados.",page:1}],education:[],competencyGroups:[],credentials:{certifications:[],languages:[]},customSections:[],version:{profileId:'synthetic',number:3,publishedAt:view.generatedAt!,current:true}};
createRoot(document.getElementById('app')!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{padding:24,maxWidth:1460,margin:'auto'}}><CanonicalProfileHeader profile={profile}/><nav className="prisma-m72-tabs" aria-label="Áreas do Perfil profissional"><button aria-current="page">Resumo</button><button>Competências</button><button>Evidências</button><button>Perfil completo</button></nav><ProfileSynthesisSurface originalSummary={profile.about.summary} publishedProfile={profile} adapter={adapter} onOriginal={()=>{document.body.dataset.original='opened';}} onOpenSource={()=>{document.body.dataset.origin='opened';}}/></main></ConfigProvider>);
setTimeout(async()=>{
 const checks:Record<string,boolean>={};
 const check=(name:string,pass:boolean)=>{checks[name]=pass;};
 if(scenario==='refresh') {
  const open=()=>[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')?.startsWith('Consultar fonte'))?.click();
  open();await new Promise(r=>setTimeout(r,200));check('oldSourceOpened',Boolean(document.querySelector('blockquote')));
  view.previous=null;view.state='complete';view.analysisId='new';view.result=structuredClone(result);view.result!.overview[0]!.text='Síntese atualizada com a nova base profissional.';
  await new Promise(r=>setTimeout(r,5200));
  check('oldSelectionClosed',!document.querySelector('.prisma-synthesis-detail'));check('newSourceNotFetchedBeforeClick',sourceReads===1);check('currentAnalysisVisible',document.body.textContent!.includes('Síntese atualizada'));
  open();await new Promise(r=>setTimeout(r,200));check('currentSnapshotAfterClick',document.querySelector('blockquote')?.textContent==='Descrição profissional atualizada nesta base.');
 }
 else if(['source','source-error'].includes(scenario)) { const button=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')?.startsWith('Consultar fonte'));button?.click();await new Promise(r=>setTimeout(r,200));if(scenario==='source-error'){check('sourceFailureExplicit',document.body.textContent!.includes('não gera outra análise'));check('analysisPreserved',document.body.textContent!.includes('Leitura profissional'));const retry=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Tentar novamente'));retry?.click();await new Promise(r=>setTimeout(r,200));check('sourceOnlyRetry',sourceReads===2 && requests===0 && retries===0);}else check('sourceFetchedOnce',sourceReads===1);check('quotedSource',Boolean(document.querySelector('blockquote'))); }
 else if(scenario==='summary'){check('narrative',document.body.textContent!.includes('rotinas financeiras'));check('noEagerSource',sourceReads===0);check('eightAxes',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);}
 else if(scenario==='query-only'){check('initialReadFailure',document.body.textContent!.includes('Não foi possível consultar'));const query=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Atualizar consulta'));query?.click();await new Promise(r=>setTimeout(r,200));check('refreshNeverRequestsAnalysis',requests===0 && reads===2 && document.querySelectorAll('.prisma-synthesis-published-section').length===8);const generate=[...document.querySelectorAll('button')].find(x=>x.textContent==='Gerar síntese');generate?.click();await new Promise(r=>setTimeout(r,200));check('explicitGenerationOnly',requests===1 && reads===3);check('queuedAfterExplicitAction',document.body.textContent!.includes('leitura da IA está sendo preparada'));}
 else if(['partial-reference','multiple-errors','empty-overview','section-render'].includes(scenario)) {
  check('allEightSections',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);
  check('goodActivitiesPreserved',document.body.textContent!.includes('consolidação de relatórios mensais'));
  check('goodObjectivePreserved',document.body.textContent!.includes('ampliar a experiência em controles'));
  check('noUnsafeContent',!document.body.textContent!.includes('Invalid') && !document.body.textContent!.includes('invalid-reference'));
  check('localReason',document.body.textContent!.includes(scenario==='section-render'?'Não foi possível apresentar esta seção':'não pôde ser ligada') || scenario==='empty-overview' && document.body.textContent!.includes('Ainda não foi possível preparar'));
  check('noTechnicalCodes',!document.body.textContent!.includes('REFERENCES_INVALID') && !document.body.textContent!.includes('RESPONSE_INVALID'));
 }
 else if(scenario==='render-error'){check('invalidDateDoesNotHideAnswers',document.body.textContent!.includes('rotinas financeiras'));check('eightAxes',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);}
 else if(['read-error','word-limit','retry','failed','insufficient','pending'].includes(scenario)) {
  check('publishedSectionsPreserved',document.querySelectorAll('.prisma-synthesis-published-section').length===8);
  check('goodPublishedActivities',document.body.textContent!.includes('Conciliação de extratos e relatórios publicados.'));
  check('publishedOriginExplicit',document.body.textContent!.includes('Informações publicadas'));
  check('noTechnicalCodes',!document.body.textContent!.includes('WORD_LIMIT') && !document.body.textContent!.includes('RESPONSE_INVALID'));
  if(scenario==='retry'){const button=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Gerar leitura novamente'));button?.click();button?.click();await new Promise(r=>setTimeout(r,200));check('oneExplicitRetry',retries===1);}
 }
 else if(scenario==='previous-failed'){check('previousPreserved',document.body.textContent!.includes('rotinas financeiras'));check('eightAxes',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);}
 else check('stateExplicit',document.body.textContent!.includes('síntese anterior'));
 check('queueRequestMatchesState',requests===(['pending','query-only'].includes(scenario)?1:0));check('boundedReads',reads===(scenario==='query-only'?3:['refresh','retry'].includes(scenario)?2:1));check('noOverflow',document.documentElement.scrollWidth<=innerWidth);
 await fetch('/qa-synthesis-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,width:innerWidth,checks,pass:Object.values(checks).every(Boolean)})});
window.__QA_SYNTHESIS_DONE=true;
},800);
