import { preserveProfileSynthesisSections } from "../../../src/domain/profileSynthesis";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { ProfileSynthesisSurface } from "../../../web/src/components/profile/ProfileSynthesisSurface";
import { CanonicalProfileHeader } from "../../../web/src/components/profile/CanonicalProfileView";
import { prismaTheme } from "../../../web/src/ui/theme";
import type { ProfileSynthesisView } from "../../../src/domain/profileSynthesis";
import type { PrismaProfileView } from "../../../web/src/domain/canonicalProfile";
import {buildPrismaProfileView} from "../../../web/src/domain/canonicalProfile";
import {prismaRepository} from "../../../web/src/infrastructure/supabase/prismaRepository";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
// @ts-expect-error The fixture is intentionally reused by the Node benchmark and browser.
import { sources, result } from "../../fixtures/profileSynthesis.mjs";
const scenario = new URLSearchParams(location.search).get("case") ?? "summary";
const resolvedSources=sources.map((x: Record<string,unknown>)=>({...x,documentId:'00000000-0000-4000-8000-000000000001'}));
declare global { interface Window { __QA_SYNTHESIS_DONE?: boolean; } }
let reads=0,requests=0,sourceReads=0,retries=0;
const view: ProfileSynthesisView={organizationId:'synthetic',personId:'synthetic',profileId:'synthetic',profileVersion:3,state:'complete',analysisId:'synthetic',generatedAt:'2026-10-04T15:00:00Z',model:'gpt-5.6-luna',result,previous:null,sources:sources.map(({text,...x}: {text:string})=>x),errorCode:null,basisHash:'a'.repeat(64)};
if(['pending','failed','cards-failed','insufficient','previous','refresh','word-limit','retry','previous-failed'].includes(scenario)){view.result=null;view.analysisId=null;view.state=scenario==='pending'?'not_requested':['previous','refresh'].includes(scenario)?'queued':['word-limit','retry','previous-failed','cards-failed'].includes(scenario)?'failed':scenario as 'failed'|'insufficient';if(['previous','refresh','previous-failed'].includes(scenario))view.previous={analysisId:'old',profileVersion:3,generatedAt:view.generatedAt!,result,sources:view.sources};}
if(view.state==='failed'){view.errorCode='RESPONSE_INVALID';view.attempts=1;view.jobId='00000000-0000-4000-8000-000000000005';view.canRetry=true;}
if(view.previous)view.previous.profileVersion=2;
if(['word-limit','retry','previous-failed'].includes(scenario))view.diagnostic={version:'synthesis-diagnostic-1.0.0',stage:'contract',reason:'WORD_LIMIT',section:'overview',observed:121,limit:120};
if(scenario==='render-error')view.generatedAt='invalid date';
if(scenario==='overview-render')view.result!.overview[0]!.text={} as unknown as string;
if(scenario==='long-content') {
 for(const answer of view.result!.answers)answer.statements.push(...[
  'O registro descreve a organização das informações profissionais e a colaboração nas rotinas da equipe, com participação no acompanhamento das entregas.',
  'As atividades relatadas permitem compreender o contexto de atuação, mas não estabelecem por si mesmas o grau de autonomia ou a responsabilidade pelas decisões.',
  'A leitura considera as informações disponíveis para esta seção e mantém explícitos os pontos que precisam ser aprofundados com a pessoa durante a conversa.'
 ].map(text=>({text,nature:'published_fact' as const,sourceIds:['experience.finance.description']})));
}
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
let profile:PrismaProfileView={identity:{fullName:'Marina Costa',professionalTitle:'Assistente de Departamento Financeiro',location:'Rio de Janeiro, RJ',lifecycleLabel:'Candidata',operationalStatusLabel:'Ativo'},about:{summary:'Resumo original preservado.',professionalObjective:null,areasOfExpertise:[],keyResults:[]},experiences:[{id:"experience_ui",role:"Assistente financeiro",organization:"Empresa sintética",period:"2020 - 2024",description:"Conciliação de extratos e relatórios publicados.",page:1}],education:[],competencyGroups:[],credentials:{certifications:[],languages:[]},customSections:[],version:{profileId:'synthetic',number:3,publishedAt:view.generatedAt!,current:true}};
if (scenario.startsWith('cards-')) {
 profile.identity.professionalTitle='Gestora de Operações';profile.identity.location='São Paulo, SP';
 profile.about!.areasOfExpertise=['Gestão de operações','Logística'];
 profile.experiences=[
  {id:'current',role:'Gerente de Operações',organization:'NovaVia Serviços',period:'Jan/2022 - Atual',description:'Gestão de operações e melhoria de processos, com acompanhamento de indicadores e liderança da equipe.',page:1},
  {id:'prior',role:'Coordenadora de Operações',organization:'Grupo Aurora',period:'Jan/2018 - Dez/2021',description:'Gestão de operações nas unidades de atendimento.',page:1},
  {id:'old',role:'Supervisora de Equipe',organization:'Rede Horizonte',period:'Jan/2015 - Dez/2017',description:'Atuação em Logística e distribuição.',page:1}
 ];
 profile.education=[{id:'edu',course:'Gestão de Projetos',institution:'Instituto Horizonte',period:'2019 - 2020',level:'postgraduate',qualification:'specialization',status:'completed',classificationOrigin:'human',page:1}];
 if (view.result) {
  view.result=structuredClone(result);
  view.result!.overview[0]!.text='Marina construiu sua trajetória em operações, com evolução da supervisão de equipes para coordenação e gerência. Os registros descrevem liderança, acompanhamento de indicadores e melhoria de processos em empresas de serviços.';
  view.result!.overview=view.result!.overview.slice(0,1);
  const sections=[
   'A trajetória passa pela supervisão de equipes, coordenação de operações e gerência na NovaVia Serviços. As experiências publicadas mostram continuidade na área operacional.',
   'Sua atuação reúne liderança de equipes, acompanhamento de indicadores e melhoria de processos. Os registros permitem compreender a contribuição para organizar a operação.',
   'O Perfil descreve trabalho em serviços, unidades de atendimento e distribuição. O tamanho das equipes e os limites de autonomia não foram detalhados.',
   'Gestão de operações aparece nas experiências de coordenação e gerência. Logística está relatada na experiência de supervisão, preservando o contexto de cada área.',
   'Os registros citam melhoria de processos e acompanhamento de indicadores, mas não informam resultados quantitativos. A ausência dessas medidas não significa ausência de contribuição.',
   'A pós-graduação em Gestão de Projetos foi concluída no Instituto Horizonte. A aplicação prática específica desse curso ainda não foi detalhada no Perfil.',
   'A experiência mais recente está em operações de serviços. O Perfil não informa uma intenção de mudança de área ou de posição.',
   'Uma conversa pode esclarecer o porte das operações, a autonomia das decisões e os resultados das iniciativas de melhoria. Essas informações complementariam o que já está publicado.'
  ];
  view.result!.answers.forEach((answer,i)=>{answer.statements=[{text:sections[i]!,nature:'published_fact',sourceIds:['experience.finance.description']}];answer.missingInformation=[];});
  view.result!.clarifications=view.result!.clarifications.slice(0,1).map(x=>({...x,text:'Qual foi uma melhoria de processo que você conduziu e qual resultado foi observado?'}));
 }
}
if(scenario.startsWith('education-')) {
 const loaded=await prismaRepository.loadPersonProfile('synthetic-org','synthetic-person','member');
 if(!loaded?.profile)throw Error('Synthetic published profile missing');
 profile=buildPrismaProfileView({fullName:loaded.person.fullName,profile:loaded.profile,version:{profileId:loaded.profile.id,number:loaded.profile.profileVersion,publishedAt:loaded.profile.approvedAt,current:true}});
}
createRoot(document.getElementById('app')!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{padding:24,maxWidth:1460,margin:'auto'}}><CanonicalProfileHeader profile={profile}/><nav className="prisma-m72-tabs" aria-label="Áreas do Perfil profissional"><button aria-current="page">Resumo</button><button>Competências</button><button>Evidências</button><button>Perfil completo</button></nav><ProfileSynthesisSurface originalSummary={profile.about.summary} publishedProfile={profile} adapter={adapter} onOriginal={()=>{document.body.dataset.original='opened';}} onOpenSource={()=>{if(scenario==='origin-error')throw Error('private origin content');document.body.dataset.origin='opened';}}/></main></ConfigProvider>);
setTimeout(async()=>{
 const checks:Record<string,boolean>={};
 const check=(name:string,pass:boolean)=>{checks[name]=pass;};
 const pause=(ms=120)=>new Promise(r=>setTimeout(r,ms));
 const reading=()=>document.querySelector('.prisma-synthesis-reading')?.textContent ?? '';
 const toggle=()=>[...document.querySelectorAll('button')].find(x=>x.textContent==='Mostrar fontes' || x.textContent==='Ocultar fontes');
 const enable=async()=>{if(toggle()?.getAttribute('aria-pressed')==='false')toggle()?.click();await pause();};
 const open=async(index=0)=>{await enable();const button=[...document.querySelectorAll<HTMLButtonElement>('button')].filter(x=>x.getAttribute('aria-label')?.startsWith('Consultar fonte'))[index];button?.click();await pause(380);return button;};
 const expectedTexts=view.result ? [...view.result.overview.map(x=>x.text),...view.result.answers.flatMap(x=>[...x.statements.map(s=>s.text),...x.missingInformation]),...view.result.clarifications.map(x=>x.text)].filter(x=>typeof x==='string') : [];
 if(view.result && scenario!=='read-error'){check('originsHiddenByDefault',!document.querySelector('.prisma-synthesis-origin-action'));check('noEagerSource',sourceReads===0);check('allSectionsInitiallyOpen',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);check('noCollapseOrDuplicateHighlights',!document.querySelector('.prisma-synthesis-highlights') && ![...document.querySelectorAll('button')].some(x=>x.textContent?.includes('Recolher análise')));if(!['section-render','overview-render'].includes(scenario))check('allStoredTextImmediatelyAvailable',expectedTexts.every(text=>reading().includes(text)));}
 if(view.previous)check('previousSnapshotVersionIdentified',document.querySelector('.prisma-synthesis-heading .prisma-synthesis-provenance')?.textContent?.includes('v2') ?? false);
 if(scenario==='refresh') {
  await open();check('oldSourceOpened',Boolean(document.querySelector('blockquote')));
  view.previous=null;view.state='complete';view.analysisId='new';view.result=structuredClone(result);view.result!.overview[0]!.text='Síntese atualizada com a nova base profissional.';
  await new Promise(r=>setTimeout(r,5200));
  check('oldSelectionClosed',!document.querySelector('.ant-drawer-open'));check('newSourceNotFetchedBeforeClick',sourceReads===1);check('currentAnalysisVisible',reading().includes('Síntese atualizada'));
  await open();check('currentSnapshotAfterClick',document.querySelector('blockquote')?.textContent==='Descrição profissional atualizada nesta base.');
 }
 else if(['source','source-error','origin-error'].includes(scenario)) { await enable();check('toggleDoesNotFetchOrGenerate',sourceReads===0 && requests===0 && retries===0);await open();if(scenario==='source-error'){check('sourceFailureExplicit',document.body.textContent!.includes('não gera outra análise'));check('analysisPreserved',expectedTexts.every(text=>reading().includes(text)));const retry=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Tentar novamente'));retry?.click();await pause();check('sourceOnlyRetry',sourceReads===2 && requests===0 && retries===0);}else check('sourceFetchedOnce',sourceReads===1);check('quotedSource',Boolean(document.querySelector('blockquote')));check('eightAxesRemainInReading',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);if(scenario==='origin-error'){[...document.querySelectorAll('button')].find(x=>x.textContent==='Abrir origem')?.click();await pause();check('originErrorLocal',document.body.textContent!.includes('Não foi possível abrir a origem') && expectedTexts.every(text=>reading().includes(text)));check('noPrivateMessage',!document.body.textContent!.includes('private origin'));} }
 else if(['long-content','source-switch','keyboard'].includes(scenario)){
  await enable();check('toggleDoesNotFetchOrGenerate',sourceReads===0 && requests===0 && retries===0);check('fullContentInSourceMode',expectedTexts.every(text=>reading().includes(text)));
  window.scrollTo(0,350);await pause();const beforeY=scrollY;const button=await open(scenario==='source-switch'?1:0);
  check('readingStillCompleteWithDrawer',expectedTexts.every(text=>reading().includes(text)));
  check('mobileFullWidthDesktopSidePanel',Math.abs(document.querySelector('.ant-drawer-content-wrapper')!.getBoundingClientRect().width-(innerWidth===390?390:420))<2);
  if(scenario==='source-switch'){
   const choices=[...document.querySelectorAll<HTMLButtonElement>('.prisma-synthesis-source-choices button')];choices[1]?.click();await pause();check('secondReferenceCorrect',document.querySelector('blockquote')?.textContent===resolvedSources.find((x: {id:string})=>x.id==='education.course')?.text);check('onlySelectedSourcesFetched',sourceReads===2);
   document.querySelector<HTMLButtonElement>('.prisma-synthesis-source-choices button')?.click();await pause();check('firstReferenceReusedFromCache',sourceReads===2 && document.querySelector('blockquote')?.textContent===resolvedSources[2]!.text);
  }
  document.querySelector<HTMLButtonElement>('button[aria-label="Fechar fontes"]')?.click();for(let i=0;i<30 && document.querySelector('.prisma-synthesis-source-drawer');i++)await pause(50);await pause();
  check('closeKeepsReadingAndScroll',expectedTexts.every(text=>reading().includes(text)) && Math.abs(scrollY-beforeY)<2);
  check('focusRestored',document.activeElement===button);check('triggerStillMounted',button?.isConnected ?? false);check('drawerClosed',!document.querySelector('.ant-drawer-open'));
  if(scenario==='keyboard') {button?.focus();document.body.dataset.keyboard='pending';for(let i=0;i<60 && document.body.dataset.keyboard==='pending';i++)await pause(100);await pause(400);check('keyboardEnterOpensSource',(document.body.dataset.keyboard as string)==='passed');check('keyboardEscapeClosesSource',!document.querySelector('.ant-drawer-open'));check('keyboardRestoresFocus',document.activeElement===button);}
  if(scenario==='long-content'){toggle()?.click();await pause();check('fullTextAfterHideSources',expectedTexts.every(text=>reading().includes(text)));check('originControlsRemoved',!document.querySelector('.prisma-synthesis-origin-action'));check('noClamping',![...document.querySelectorAll('.prisma-synthesis-statement p')].some(x=>getComputedStyle(x).overflow==='hidden' || parseInt(getComputedStyle(x).webkitLineClamp)>0));}
 }
 else if(scenario.startsWith('education-')) {
  const cards=[...document.querySelectorAll<HTMLElement>('.prisma-profile-highlight')];
  check('fourCardsVisible',cards.length===4);
  check('desktopRowMobileColumn',innerWidth>1200?cards.every(x=>Math.abs(x.getBoundingClientRect().top-cards[0]!.getBoundingClientRect().top)<1):cards.every((x,i)=>i===0||x.getBoundingClientRect().top>cards[i-1]!.getBoundingClientRect().top));
  check('realReadKeepsGoodSections',expectedTexts.every(text=>reading().includes(text)) && cards[1]?.textContent?.includes('Gerente de Operações')===true);
  check('reviewedOrExplicitOnly',scenario==='education-inferred'?!cards[2]?.textContent?.includes('Gestão de Negócios'):cards[2]?.textContent?.includes('MBA · Especialização')===true && cards[2]?.textContent?.includes('Gestão de Negócios')===true && cards[2]?.textContent?.includes('Gestão de Projetos')===true);
  check('noProviderOrFetchAdded',requests===0 && retries===0 && sourceReads===0);
  if(scenario==='education-reviewed'){await enable();document.querySelector<HTMLButtonElement>('.is-education .prisma-profile-highlight-source')?.click();await pause(400);check('educationSourcesPreserved',document.querySelector('.ant-drawer-open')?.textContent?.includes('Instituto Sintético')===true);}
 }
 else if(scenario==='cards-render') {
  check('onlyFaultedCardReplaced',document.querySelectorAll('.prisma-profile-highlight').length===4 && !document.querySelector('.prisma-profile-highlight.is-areas') && document.querySelectorAll('.prisma-profile-highlight.is-position,.prisma-profile-highlight.is-education,.prisma-profile-highlight.is-organizations').length===3);
  check('allGoodAnswersPreserved',expectedTexts.every(text=>reading().includes(text)));
  check('plainLocalRecovery',reading().includes('As demais informações continuam disponíveis.') && !reading().includes('synthetic-render-fault'));
  [...document.querySelectorAll('button')].find(x=>x.textContent==='Consultar Perfil completo')?.click();check('recoveryOpensApprovedProfile',document.body.dataset.original==='opened');
 }
 else if(scenario.startsWith('cards-')) {
  const cards=[...document.querySelectorAll<HTMLElement>('.prisma-profile-highlights > .prisma-profile-highlight')];
  check('fourCardsVisible',cards.length===4);
  check('desktopRowMobileColumn',cards.length===4 && (innerWidth>1200 ? cards.every(x=>Math.abs(x.getBoundingClientRect().top-cards[0]!.getBoundingClientRect().top)<1) : cards.every((x,i)=>i===0 || x.getBoundingClientRect().top>cards[i-1]!.getBoundingClientRect().top)));
  check('currentAndPreviousVisible',cards[1]?.textContent?.includes('Gerente de Operações')===true && cards[1]?.textContent?.includes('Posição anterior')===true && cards[1]?.textContent?.includes('Coordenadora de Operações')===true && cards[1]?.textContent?.includes('Grupo Aurora')===true && cards[1]?.textContent?.includes('Jan/2018 - Dez/2021')===true);
  check('areaDurationSeparate',cards[0]?.textContent?.includes('Gestão de operações')===true && cards[0]?.textContent?.includes('Atuação documentada: aproximadamente')===true && cards[0]?.textContent?.includes('Áreas gerais declaradas')===true);
  check('educationAndAllOrganizations',cards[2]?.textContent?.includes('Gestão de Projetos')===true && cards[2]?.textContent?.includes('Instituto Horizonte')===true && cards[3]?.textContent?.includes('3 organizações')===true && ['NovaVia Serviços','Grupo Aurora','Rede Horizonte'].every(x=>cards[3]?.textContent?.includes(x)));
  check('noOriginsByDefault',!document.querySelector('.prisma-profile-highlight-source'));
  check('noProviderOrFetchAdded',requests===0 && retries===0 && sourceReads===0);
  if(scenario==='cards-source') {
   await enable();document.querySelector<HTMLButtonElement>('.prisma-profile-highlight-source')?.click();await pause(400);
   check('cardOriginsFromPublishedSnapshot',document.querySelector('.ant-drawer-open')?.textContent?.includes('Perfil publicado vigente v3')===true && document.querySelector('.ant-drawer-open')?.textContent?.includes('NovaVia Serviços')===true);
   check('cardOriginNoFetch',sourceReads===0 && requests===0);toggle()?.click();await pause(400);check('hideClosesCardOrigin',!document.querySelector('.ant-drawer-open'));
  }
  if(scenario==='cards-failed')check('failurePreservesCardsAndPublishedSections',document.querySelectorAll('.prisma-synthesis-published-section').length===8 && document.body.textContent!.includes('Gestão de operações e melhoria de processos'));
 }
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
 else if(scenario==='overview-render'){check('overviewRenderFailureLocal',reading().includes('Não foi possível apresentar esta seção'));check('allOtherAnswersPreserved',view.result!.answers.flatMap(x=>x.statements).every(x=>reading().includes(x.text)));}
 else if(['read-error','word-limit','retry','failed','insufficient','pending'].includes(scenario)) {
  check('publishedSectionsPreserved',document.querySelectorAll('.prisma-synthesis-published-section').length===8);
  check('goodPublishedActivities',document.body.textContent!.includes('Conciliação de extratos e relatórios publicados.'));
  check('publishedOriginExplicit',document.body.textContent!.includes('Informações publicadas'));
  check('noTechnicalCodes',!document.body.textContent!.includes('WORD_LIMIT') && !document.body.textContent!.includes('RESPONSE_INVALID'));
  if(scenario==='retry'){const button=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Gerar leitura novamente'));button?.click();button?.click();await new Promise(r=>setTimeout(r,200));check('oneExplicitRetry',retries===1);}
 }
 else if(scenario==='previous-failed'){check('previousPreserved',document.body.textContent!.includes('rotinas financeiras'));check('eightAxes',document.querySelectorAll('.prisma-synthesis-axes > *').length===8);}
 else check('stateExplicit',document.body.textContent!.includes('síntese anterior'));
 check('queueRequestMatchesState',requests===(scenario==='query-only'?1:0));check('boundedReads',reads===(scenario==='query-only'?3:['refresh','retry'].includes(scenario)?2:1));check('noOverflow',document.documentElement.scrollWidth<=innerWidth);
 await fetch('/qa-synthesis-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,width:innerWidth,checks,pass:Object.values(checks).every(Boolean)})});
window.__QA_SYNTHESIS_DONE=true;
},800);
