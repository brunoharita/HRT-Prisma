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
let reads=0,requests=0,sourceReads=0;
const view: ProfileSynthesisView={organizationId:'synthetic',personId:'synthetic',profileId:'synthetic',profileVersion:3,state:'complete',analysisId:'synthetic',generatedAt:'2026-10-04T15:00:00Z',model:'gpt-5.6-luna',result,previous:null,sources:sources.map(({text,...x}: {text:string})=>x),errorCode:null,basisHash:'a'.repeat(64)};
if(['pending','failed','insufficient','previous','refresh'].includes(scenario)){view.result=null;view.analysisId=null;view.state=scenario==='pending'?'not_requested':['previous','refresh'].includes(scenario)?'queued':scenario as 'failed'|'insufficient';if(['previous','refresh'].includes(scenario))view.previous={analysisId:'old',profileVersion:3,generatedAt:view.generatedAt!,result,sources:view.sources};}
const adapter={load:async()=>{reads++;return structuredClone(view);},request:async()=>{requests++;view.state="queued";return structuredClone(view);},source:async (analysis:string,id:string)=>{sourceReads++;const source=resolvedSources.find((x: {id:string})=>x.id===id);return analysis==='new' && source?{...source,text:'Descrição profissional atualizada nesta base.'}:source;}};
const profile:PrismaProfileView={identity:{fullName:'Marina Costa',professionalTitle:'Assistente de Departamento Financeiro',location:'Rio de Janeiro, RJ',lifecycleLabel:'Candidata',operationalStatusLabel:'Ativo'},about:{summary:'Resumo original preservado.',professionalObjective:null,areasOfExpertise:[],keyResults:[]},experiences:[],education:[],competencyGroups:[],credentials:{certifications:[],languages:[]},customSections:[],version:{profileId:'synthetic',number:3,publishedAt:view.generatedAt!,current:true}};
createRoot(document.getElementById('app')!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{padding:24,maxWidth:1460,margin:'auto'}}><CanonicalProfileHeader profile={profile}/><nav className="prisma-m72-tabs" aria-label="Áreas do Perfil profissional"><button aria-current="page">Resumo</button><button>Competências</button><button>Evidências</button><button>Perfil completo</button></nav><ProfileSynthesisSurface adapter={adapter} onOriginal={()=>{document.body.dataset.original='opened';}} onOpenSource={()=>{document.body.dataset.origin='opened';}}/></main></ConfigProvider>);
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
 else if(scenario==='source') { const button=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')?.startsWith('Consultar fonte'));button?.click();await new Promise(r=>setTimeout(r,200));check('sourceFetchedOnce',sourceReads===1);check('quotedSource',Boolean(document.querySelector('blockquote'))); }
 else if(scenario==='summary'){check('narrative',document.body.textContent!.includes('rotinas financeiras'));check('noEagerSource',sourceReads===0);const explore=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Explorar análise'));explore?.click();await new Promise(r=>setTimeout(r,100));check('eightAxes',document.querySelectorAll('.prisma-synthesis-axes .ant-collapse-item').length===8);explore?.click();}
 else check('stateExplicit',document.body.textContent!.includes(scenario==='failed'?'Síntese não concluída':scenario==='insufficient'?'Precisamos de informações':scenario==='previous'?'síntese anterior':'Preparando a síntese'));
 check('queueRequestMatchesState',requests===(scenario==='pending'?1:0));check('boundedReads',reads===(scenario==='refresh'?2:1));check('noOverflow',document.documentElement.scrollWidth<=innerWidth);
 await fetch('/qa-synthesis-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,width:innerWidth,checks,pass:Object.values(checks).every(Boolean)})});
window.__QA_SYNTHESIS_DONE=true;
},800);
