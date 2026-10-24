import {createRoot} from "react-dom/client";
import {ConfigProvider} from "antd";
import ptBR from "antd/locale/pt_BR";
import {KnowledgePage} from "../../../web/src/pages/KnowledgePage";
import {knowledgeService} from "../../../web/src/infrastructure/supabase/knowledgeService";
import {professionalAreaService} from "../../../web/src/infrastructure/supabase/professionalAreaService";
import {prismaRepository} from "../../../web/src/infrastructure/supabase/prismaRepository";
import {prismaTheme} from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const params=new URLSearchParams(location.search),local=params.get("scope")==="local",state=params.get("state")??"data";
const writes:string[]=[];Object.assign(window,{__knowledgeWrites:writes});
const version={id:"source-version",externalVersion:"2026.1",publishedAt:"2026-10-10T12:00:00Z",counts:{concepts:120},importStatus:"completed",checksumSha256:"a".repeat(64)};
const concept=(scope:"global"|"organization")=>({id:scope,canonicalLabel:scope==="global"?"Planejamento estratégico":"Gestão de processos",conceptType:"competency",scope,status:"published",version:1,updatedAt:"2026-10-10",definition:"Organiza prioridades e acompanha resultados com base em informações verificáveis.",aliases:["Planejamento"],mappings:[],relations:[]});
const dashboard={sources:["CBO","ESCO","O*NET"].map(name=>({id:name,name,domain:"fonte.example.invalid",sourceClass:"official",method:"curated",license:"Uso de referência",status:"active",lastVerifiedAt:"2026-10-10",currentVersion:version,pendingVersion:null})),concepts:[concept("global"),concept("organization")],inbox:[{id:"term",originalTerm:"Planejamento integrado",occurrenceCount:3,observationCount:3,firstSeenAt:"2026-10-01",lastSeenAt:"2026-10-10",scope:"global",status:"pending",candidateConcepts:[]}],proposals:[{id:"proposal",inboxId:"term",observedTerm:"Planejamento",proposedConcept:{canonical_label:"Planejamento integrado",concept_type:"competency",description:"Contribuição com descrição e fontes preservadas.",subgroup_id:"strategy"},sources:[],candidateConcepts:[],originOrganizationId:"synthetic",organizationId:null,scope:"global",status:"approved",originalProposal:{}}],impacts:[{id:"impact",personId:"Pessoa sintética",profileId:"Perfil sintético",conceptId:"global",policy:"manual",status:"completed",createdAt:"2026-10-10"}],settings:{allowExternalKnowledgeEnrichment:false,reinterpretationPolicy:"manual"}};
const proposalDashboard={...dashboard,proposals:[
 { ...dashboard.proposals[0],id:"pending",status:"awaiting_human_review",proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Business Process Management (BPM)"},candidateConcepts:[{id:"candidate",canonical_label:"Business process management BPM software com identificação extensa "+"IdentificadorSemEspacos".repeat(5),match:"prefix"}],sources:[{url:"https://fonte.example.invalid/"+"referencia".repeat(14),publisher:"Fonte sintética",source_class:"official"}] },
 { ...dashboard.proposals[0],id:"occupation",status:"awaiting_human_review",originOrganizationId:null,proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Ocupação sintética",concept_type:"occupation"} },
 { ...dashboard.proposals[0],id:"legacy",status:"awaiting_human_review",scope:"organization",organizationId:"synthetic",proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Proposta legada sintética"} },
 { ...dashboard.proposals[0],id:"certification",status:"awaiting_human_review",proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Certificação sintética",concept_type:"certification"} },
 dashboard.proposals[0],
]};
const decisionDashboard={...proposalDashboard,proposals:[...proposalDashboard.proposals,
 {...dashboard.proposals[0],id:"unclassified",status:"awaiting_human_review",proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Sem classificação",subgroup_id:null}},
 {...dashboard.proposals[0],id:"rejected-history",status:"rejected",proposedConcept:{...dashboard.proposals[0].proposedConcept,canonical_label:"Rejeição histórica preservada"}},
]};
const decisions:{id:string;action:string;reason:string;subgroupId?:string|null}[]=[];Object.assign(window,{__knowledgeDecisions:decisions});
const classificationDashboard={...decisionDashboard,proposals:[
 {...dashboard.proposals[0],id:"governance",status:"awaiting_human_review",proposedConcept:{canonical_label:"Governança Corporativa",concept_type:"competency",description:"Governança e prestação de contas."}},
 {...dashboard.proposals[0],id:"transformation",publishedConceptId:"published",proposedConcept:{canonical_label:"Transformação operacional",concept_type:"competency",description:"Redesenho estrutural e integrado de processos, pessoas, dados e tecnologias de uma organização."},publishedClassification:{state:"published",subgroupId:"strategy",version:1}},
 {...dashboard.proposals[0],id:"missing",proposedConcept:{canonical_label:"Sem classificação publicada",concept_type:"competency"},publishedClassification:{state:"missing"}},
 {...dashboard.proposals[0],id:"unavailable",proposedConcept:{canonical_label:"Consulta indisponível",concept_type:"competency"},publishedClassification:{state:"unavailable"}},
 ...decisionDashboard.proposals.filter(p=>["rejected-history","occupation","certification"].includes(p.id)),
]};
knowledgeService.loadDashboard=async()=>{if(state==="error")throw Error("Falha sintética de consulta");return (state==="empty"?{...dashboard,sources:[],concepts:[],inbox:[],proposals:[],impacts:[]}:state==="proposals"?proposalDashboard:state==="decisions"?decisionDashboard:state==="classification"?classificationDashboard:dashboard) as never;};
knowledgeService.listCompetencyMacroGroups=async()=>state==="empty"?[]:[{code:"hard",label:"Competências técnicas",definition:"Conhecimentos profissionais",sortOrder:1},{code:"soft",label:"Competências comportamentais",definition:"Práticas de relacionamento",sortOrder:2}];
knowledgeService.listCompetencySubgroups=async()=>state==="empty"?[]:[{id:"strategy",code:"H4",macroGroupCode:"hard",label:"Estratégia e gestão",definition:"Definir prioridades e acompanhar os resultados.",classificationQuestion:"Qual é o contexto profissional?",examples:["Planejamento"],scope:"global",sortOrder:1}] as never;
professionalAreaService.load=async()=>({options:state==="empty"?[]:[{id:"area",label:"Recursos Humanos",description:"Gestão de pessoas e desenvolvimento organizacional.",aliases:["RH","HRBP"],active:true,version:1,scope:local?"organization":"global",organizationId:local?"synthetic":null}],suggestion:[]}) as never;
professionalAreaService.contributions=async()=>[];
prismaRepository.loadHomeSummary=async()=>({peopleCount:0,structuredProfilesCount:0,openVacanciesCount:0,knowledgeSources:state==="empty"?[]:[{id:"CBO",name:"CBO",status:"current",published:true,version:"2026.1",releaseDate:"2026-01-01",lastCheckedAt:"2026-10-10"}]}) as never;
for(const name of ["save","decide"] as const)professionalAreaService[name]=async()=>{writes.push(name);throw Error("Unexpected write");};
for(const name of ["research","researchGlobalContribution","approveProposal","decideGlobalContribution","saveSettings","dispatchReinterpretation","transitionLegacyProposal"] as const)knowledgeService[name]=async()=>{writes.push(name);throw Error("Unexpected write");};
if(state==="decisions"||state==="classification"){
 const decide=(id:string,action:string,reason:string,subgroupId?:string|null)=>{writes.push(action);decisions.push({id,action,reason,subgroupId});if(params.get("failDecision")==="1")throw Error("Falha sintética de decisão");const row=(state==="classification"?classificationDashboard:decisionDashboard).proposals.find(p=>p.id===id);if(row){row.status=action;if(state==="classification"&&action==="approved"&&subgroupId)Object.assign(row,{publishedClassification:{state:"published",subgroupId,version:1}});}return {} as never;};
 knowledgeService.approveProposal=async(id,subgroupId,reason)=>decide(id,"approved",reason,subgroupId);
 knowledgeService.decideGlobalContribution=async(id,action,reason)=>decide(id,action,reason);
}
createRoot(document.getElementById("app")!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><KnowledgePage profile={local?"owner":"super_admin"} activeMembership={{organizationId:"synthetic",organizationName:"Empresa sintética",groupId:null,groupName:null,role:local?"owner":"super_admin"}}/></ConfigProvider>);
