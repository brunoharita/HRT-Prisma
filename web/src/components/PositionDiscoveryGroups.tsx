import type {ReactNode} from "react";
import {Button,Empty,Typography} from "antd";
import type {VacancyCandidateMatch,VacancyDetail} from "../domain/vacancy";
import {projectPositionPeople} from "../domain/positionPeopleDiscovery";
import {PrismaCard} from "../ui/PrismaCard";

export function PositionDiscoveryGroups({vacancy,matches,manualIds,pending,renderMatch,onManualSearch}:{vacancy:VacancyDetail;matches:VacancyCandidateMatch[];manualIds:ReadonlySet<string>;pending:boolean;renderMatch:(match:VacancyCandidateMatch,index:number)=>ReactNode;onManualSearch:()=>void}){
 const groups=projectPositionPeople(vacancy,matches,manualIds);
 const sections=[{key:"recommended" as const,title:"Pessoas com trajetória pertinente",description:"Maior Nota Prisma salva primeiro, inclusive provisória. Trajetórias diretas e relacionadas são ordenadas juntas; notas indisponíveis ficam ao final."},
  {key:"review" as const,title:"Relação profissional a verificar",description:"Há evidência profissional ligada à Posição, mas a relação ainda precisa de análise. Esta pendência não é uma conclusão de baixa relevância."},
  {key:"human" as const,title:"Pessoas incluídas por decisão humana",description:"Inclusão ou confirmação preservada. A recomendação automática ainda não possui sustentação profissional suficiente; a decisão permanece com o recrutador."}];
 if(!groups.recommended.length&&!groups.review.length&&!groups.human.length)return pending?<p role="status">Consultando relações profissionais. A lista será atualizada com os resultados disponíveis.</p>:<PrismaCard><Empty description="Nenhuma trajetória pertinente foi identificada para recomendar nesta consulta. Isso não significa incapacidade ou ausência de experiência."><Button onClick={onManualSearch}>Consultar Pessoas manualmente</Button></Empty></PrismaCard>;
 return <div className="prisma-vacancy-match-groups">{sections.map(section=>groups[section.key].length?<section key={section.key} className="prisma-vacancy-match-group" aria-label={section.title}><header><Typography.Title level={2}>{section.title}</Typography.Title><Typography.Text type="secondary">{section.description}</Typography.Text></header><div className="prisma-vacancy-match-list">{groups[section.key].map(renderMatch)}</div></section>:null)}</div>;
}
