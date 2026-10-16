import {workspace,ingestion} from "../person-unified/fixture.js";
export const visualIngestion={...ingestion,listPeople:async()=>[workspace.person]};
export const visualKnowledge={
 loadDashboard:async()=>({sources:[],concepts:[],inbox:[],proposals:[],impacts:[],settings:{allowExternalKnowledgeEnrichment:false,reinterpretationPolicy:"manual"}}),
 listCompetencyMacroGroups:async()=>[{code:"hard",label:"Competências técnicas",definition:"Conhecimentos e práticas profissionais.",sortOrder:1},{code:"soft",label:"Competências comportamentais",definition:"Práticas e relações no trabalho.",sortOrder:2}],
 listCompetencySubgroups:async()=>[],
};
export const visualVacancy={list:async()=>new URLSearchParams(location.search).get("fixture")==="visual-standard"?[
 {id:"position-synthetic",title:"Analista de operações e desenvolvimento de processos",area:"Operações",location:"São Paulo, SP",employmentType:"CLT",occupancy:"vacant",occupantName:null,definitionVersion:3,updatedAt:"2026-10-01T12:00:00Z"},
 {id:"position-occupied",title:"Gerente de tecnologia",area:"Tecnologia",location:"Bauru, SP",employmentType:"CLT",occupancy:"occupied",occupantName:"Pessoa sintética",definitionVersion:2,updatedAt:"2026-10-01T12:00:00Z"},
]:[],listRoleTemplates:async()=>[],listOccupants:async()=>[]};
