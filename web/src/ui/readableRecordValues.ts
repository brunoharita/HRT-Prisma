import {labelAssessmentDimension} from "../domain/competencyVerificationData.js";
/** Presentation only. Unknown keys/values remain visible without inferred meaning. */
export const recordFieldLabels: Record<string, string> = {
  id:"Identificador",label:"Nome",name:"Nome",description:"Descrição",scope:"Abrangência",source:"Fonte",sourceId:"Identificador da fonte",
  version:"Versão",sourceVersion:"Versão da fonte",conceptVersion:"Versão do conceito",contractVersion:"Versão do contrato",
  conceptId:"Identificador do conceito",mappingId:"Identificador da ligação",snapshotId:"Identificador do registro de origem",
  organizationId:"Identificador da empresa",positionVersionId:"Identificador da definição",previousVersionId:"Identificador da versão anterior",
  externalId:"Código na fonte",externalUri:"Endereço na fonte",conceptType:"Categoria",mappingType:"Tipo de correspondência",
  method:"Método",recordedAt:"Data do registro",createdAt:"Data de criação",decisionRecordedAt:"Data da decisão",
  actorId:"Identificador do operador",actorAuthUserId:"Identificador do operador",savedBy:"Registrado por",actor:"Operador",
  provenance:"Origem do registro",origins:"Origens",reference:"Referência",references:"Referências",reconciliations:"Conciliações",
  attributes:"Informações da fonte",relationType:"Relação na fonte",relationId:"Identificador da relação",relationVersion:"Versão da relação",
  source_row:"Linha no arquivo de origem",source_file:"Arquivo de origem",content_hash:"Identificador de integridade do conteúdo",
  originalTitle:"Nome informado pela empresa",normalizedTerm:"Termo utilizado na busca",concept:"Conceito profissional",state:"Situação",
  decision:"Decisão registrada",matchedTerms:"Termos utilizados na correspondência",items:"Itens",complements:"Itens complementares",candidates:"Interpretações consideradas",
  minimumCorrectPercentage:"Percentual mínimo de acertos",requiredDimensions:"Dimensões exigidas",dimension:"Dimensão",dimensions:"Dimensões",
  documentary_evidence:"Evidência documental",demonstrated_evidence:"Evidência demonstrada",matching_requirement:"Requisito considerado na análise",
  evidence:"Evidências",evidenceSnapshot:"Evidências preservadas",fieldPath:"Campo de origem",requirementId:"Identificador do requisito",
  status:"Situação",stage:"Etapa",details:"Informações do acompanhamento",nextAction:"Próxima ação",assignee:"Identificador do responsável",
  dueDate:"Prazo",notes:"Anotações",interview:"Entrevista",at:"Data e hora",timezone:"Fuso horário",participants:"Participantes",
  outcome:"Resultado",rationale:"Justificativa",reason:"Motivo",revision:"Revisão",entryId:"Identificador do acompanhamento",
  anterior:"Anterior",registrado:"Registrado",previousValue:"Valor anterior",reviewedValue:"Valor revisado",relevance:"Relevância na fonte",
  measurements:"Medidas da fonte",scaleId:"Escala da fonte",rawValue:"Valor original",changeSetId:"Identificador da alteração",
  role:"Cargo",organization:"Empresa",period:"Período",institution:"Instituição",course:"Curso",level:"Nível",qualification:"Qualificação",evidenceText:"Texto da evidência",page:"Página",
};
const fieldValues: Record<string, Record<string,string>> = {
  scope:{global:"Base Prisma",organization:"Empresa"},
  decision:{automatic:"Associação automática",human:"Seleção humana",cleared:"Associação desfeita"},
  relationType:{is_a:"É um tipo de",related:"Relacionada",broader:"Mais ampla",narrower:"Mais específica"},
  mappingType:{exact:"Correspondência exata",close:"Correspondência aproximada",related:"Referência relacionada",broader:"Referência mais ampla",narrower:"Referência mais específica"},
  conceptType:{occupation:"Família ou ocupação",skill:"Habilidade",competency:"Competência",knowledge:"Conhecimento",technology:"Tecnologia ou ferramenta",methodology:"Método ou prática",certification:"Certificação"},
  state:{resolved:"Associação resolvida",ambiguous:"Requer seleção",unresolved:"Referência não resolvida"},
  status:{active:"Em andamento",closed:"Encerrado",scheduled:"Agendada",cancelled:"Cancelada",historical_unrecorded:"Sem registro nesta versão histórica"},
  outcome:{advance:"Avançar",hold:"Manter em análise",reject:"Não avançar"},
  method:{published_mapping:"Ligação publicada na fonte",organization_knowledge:"Conhecimento da empresa",approved_exact_alias:"Correspondência com termo ou alias aprovado",human_selection:"Seleção humana",human_removal:"Associação desfeita por pessoa",no_safe_match:"Sem correspondência segura"},
  documentary_evidence:{available:"Disponível",unavailable:"Indisponível"},
};
export function recordFieldLabel(key:string):string {
  return recordFieldLabels[key]??key.replace(/([a-z0-9])([A-Z])/g,"$1 $2").replace(/[_-]+/g," ").replace(/^./,c=>c.toLocaleUpperCase("pt-BR"));
}
export function recordTextLabel(value:unknown):string {
  if(Array.isArray(value))return value.length?value.map(recordTextLabel).join("; "):"Nenhum item registrado";
  if(value!==null&&typeof value==="object")return Object.entries(value).map(([key,item])=>`${recordFieldLabel(key)}: ${item!==null&&typeof item==="object"?recordTextLabel(item):recordScalarLabel(item,key)}`).join(" · ")||"Nenhum campo registrado";
  return recordScalarLabel(value);
}
export function recordScalarLabel(value:unknown,field?:string):string {
  if(value===null||value===undefined)return "Não informado";
  if(value==="")return "Texto vazio";
  if(typeof value==="boolean")return value?"Sim":"Não";
  if(typeof value==="number")return new Intl.NumberFormat("pt-BR",{maximumSignificantDigits:21}).format(value);
  if(typeof value==="string"){
    if(["requiredDimensions","correctionDimensions","dimension"].includes(field??"")&&["query_modeling","performance","troubleshooting","fundamentals","security","architecture"].includes(value))return labelAssessmentDimension(value);
    return fieldValues[field??""]?.[value]??value;
  }
  return "Formato de valor indisponível";
}
