import {workspace,ingestion} from "../person-unified/fixture.js";
export const visualIngestion={...ingestion,listPeople:async()=>[workspace.person]};
export const visualKnowledge={
 loadDashboard:async()=>({sources:[],concepts:[],inbox:[],proposals:[],impacts:[],settings:{allowExternalKnowledgeEnrichment:false,reinterpretationPolicy:"manual"}}),
 listCompetencyMacroGroups:async()=>[{code:"hard",label:"Competências técnicas",definition:"Conhecimentos e práticas profissionais.",sortOrder:1},{code:"soft",label:"Competências comportamentais",definition:"Práticas e relações no trabalho.",sortOrder:2}],
 listCompetencySubgroups:async()=>[],
};
export const visualVacancy={list:async()=>[],listRoleTemplates:async()=>[],listOccupants:async()=>[]};
