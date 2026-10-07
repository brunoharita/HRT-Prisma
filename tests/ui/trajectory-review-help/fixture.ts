import type {TrajectoryActivity, TrajectoryReviewChoice} from "../../../src/domain/semanticTrajectory.js";

const query=new URLSearchParams(location.search);
export const scenario=query.get("case")??"normal";
const text="Atuação em tecnologia, operações, processos e dados. A trajetória publicada inclui desenvolvimento de sistemas, análise de processos, projetos e coordenação de equipes. Em experiências posteriores, o trabalho passou a envolver planejamento de soluções digitais, organização de rotinas e acompanhamento de iniciativas de transformação. A declaração resume diferentes fases profissionais, mas não detalha a execução pessoal de cada atividade, as ferramentas utilizadas ou os resultados individuais em cada contexto. O trecho deve ser interpretado em relação ao trabalho pedido pela Posição, sem presumir especializações, proficiência ou senioridade. As evidências das experiências permanecem separadas desta apresentação geral e devem sustentar qualquer conclusão sobre atuação realizada.";
const pairs: [TrajectoryActivity,TrajectoryActivity][]=[["direct_function","equivalent_function"],["related_function","entry_potential"],["context","other"],["unclear","backend_execution"],["software_execution","software_analysis"],["software_leadership","software_context"]];
const item=(id:string,first:TrajectoryActivity,second:TrajectoryActivity,kind="declaration")=>({id,kind,fieldPath:kind==="experience"?"experiences.0":"summary",text,first:{activity:first,quote:text.slice(0,130)},second:{activity:second,quote:text.slice(0,130)}});
const conflicts=scenario==="categories"?[item("category",...pairs[Number(query.get("pair"))]!)]:[
 item("summary","related_function","context"),item("experience","direct_function","related_function","experience"),
];
export const fixture={loads:0,saves:[] as TrajectoryReviewChoice[][],refreshes:0,resolved:0};
Object.assign(window,{__trajectoryReviewFixture:fixture});
export const vacancyService={
 async loadTrajectoryReview(){fixture.loads++;if(scenario==="error")throw Error("Falha sintética ao carregar revisão.");
  if(scenario==="legacy")return {status:"review_unavailable",reasonCode:"PAIR_NOT_STORED",conflictCount:0,analysisId:"synthetic-analysis"};
  if(scenario==="excess")return {status:"review_unavailable",reasonCode:"TOO_MANY_CONFLICTS",conflictCount:6};
  return {status:"review_pending",analysisId:"synthetic-analysis",conflictCount:conflicts.length,conflicts};},
 async saveTrajectoryReview(_vacancy:unknown,_match:unknown,_analysis:string,choices:TrajectoryReviewChoice[]){fixture.saves.push(choices);return choices.some(x=>x.choice==="cannot_determine")?"indeterminate":"resolved";},
 async refreshLegacyTrajectoryReview(){fixture.refreshes++;return "indeterminate";},
};
