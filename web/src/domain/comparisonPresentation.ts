import type { VacancyCandidateMatch } from "./vacancy.js";

type Requirement = VacancyCandidateMatch["requirements"][number];
export function requirementComparisonSignature(value:Requirement|undefined):string {
  if(!value)return "unavailable";
  return JSON.stringify({status:value.status,explanation:value.explanation,evidence:value.evidence.map(e=>[e.label,e.source,e.sourceId??null,e.fieldPath??null,e.sourceVersion??null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
}
export function buildManagerComparisonSummary(title:string,matches:readonly VacancyCandidateMatch[]):string {
  const lines=[`Resumo para o gestor · ${title}`,"Consulta das evidências publicadas, sem recomendação de contratação ou escolha automática."];
  for(const match of matches){
    lines.push("",match.candidate.fullName,`Perfil publicado v${match.candidate.profileVersion} · ${match.candidate.publishedAt}`);
    if(match.semanticAssessment&&match.semanticAssessment.status!=="complete")lines.push("Análise contextual pendente ou incompleta. Não atribuir prioridade por esta pendência.");
    if(match.stableResult&&match.stableResult.state!=="current")lines.push("O resultado requer atualização ou conferência de sua versão.");
    for(const item of match.requirements){
      lines.push(`• ${item.requirement.label}: ${item.explanation||"Informação não disponível nesta consulta."}`);
      for(const e of item.evidence)lines.push(`  Fonte: ${e.source} · ${e.label}${e.fieldPath?` · Campo: ${e.fieldPath}`:""}${e.sourceVersion?` · Versão: ${e.sourceVersion}`:""}`);
      if(item.status!=="met")lines.push(`  Para aprofundar: quais experiências ou exemplos podem esclarecer ${item.requirement.label}?`);
    }
  }
  lines.push("","A ausência de evidência não indica incapacidade. A decisão e a avaliação complementar são humanas.");
  return lines.join("\n");
}
