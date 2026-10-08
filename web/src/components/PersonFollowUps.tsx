import { useEffect, useState } from "react";
import { Alert, Button, Skeleton, Typography } from "antd";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { followUpStages } from "../domain/positionFollowUp";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { PrismaCard } from "../ui/PrismaCard";
const message=(error:unknown)=>error instanceof Error?error.message:"Não foi possível consultar os acompanhamentos.";

export function PersonFollowUps({organizationId,personId,onNavigate}:{organizationId:string;personId:string;onNavigate:(path:string)=>void}){
  const [links,setLinks]=useState<Awaited<ReturnType<typeof positionFollowUpService.forPerson>>>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  useLoadingFeedback({"Carregando acompanhamentos da Pessoa…":loading});
  useEffect(()=>{let current=true;setLoading(true);void positionFollowUpService.forPerson(organizationId,personId).then(r=>{if(current)setLinks(r);}).catch(e=>{if(current)setError(message(e));}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[organizationId,personId]);
  return <PrismaCard title="Acompanhamentos por Posição">{loading?<Skeleton active paragraph={{rows:2}} />:error?<Alert type="warning" title={error} />:links.length?links.map(link=><Button block key={link.vacancyId} type="link" style={{height:"auto",whiteSpace:"normal",textAlign:"left"}} onClick={()=>onNavigate(`/vacancies/${link.vacancyId}/follow-up/${personId}`)}>{link.title} · {followUpStages[link.stage]}{link.processStatus==="closed"?" · Processo encerrado":""}</Button>):<Typography.Text type="secondary">Nenhum acompanhamento nesta organização.</Typography.Text>}</PrismaCard>;
}
