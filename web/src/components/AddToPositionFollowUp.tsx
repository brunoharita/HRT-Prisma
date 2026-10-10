import { useState } from "react";
import { Alert, Button, Space } from "antd";
import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import type { FollowUpData } from "../domain/positionFollowUp";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";

export function AddToPositionFollowUp({organizationId,vacancyId,personId,profileId,positionId,onNavigate,data,confirmed,onAdded}:{organizationId:string;vacancyId:string;personId:string;profileId:string;positionId:string;onNavigate:(path:string)=>void;data:FollowUpData|null;confirmed:boolean;onAdded:(data:FollowUpData)=>void}){
  const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);
  const added=Boolean(data?.process && data.process.isCurrent !== false && data.entries.some(entry=>entry.personId===personId));
  const canAdd=confirmed && !added && data?.process?.status!=="closed";
  useLoadingFeedback({"Adicionando Pessoa ao acompanhamento…":pending});
  async function add(){if(pending||!canAdd)return;setPending(true);setError(null);try{const result=await positionFollowUpService.mutate(organizationId,vacancyId,"add",personId,null,{profileId,positionId},data?.process?.id);onAdded(result);}catch(e){setError(e instanceof Error?e.message:"Não foi possível adicionar a Pessoa.");}finally{setPending(false);}}
  return <Space className="prisma-add-to-evaluation" orientation="vertical"><Button type="primary" icon={added?<ArrowRightOutlined aria-hidden="true"/>:<PlusOutlined aria-hidden="true"/>} loading={pending} disabled={pending||(!added&&!canAdd)} onClick={()=>added&&data?.process?onNavigate(`/vacancies/${vacancyId}/follow-up/processes/${data.process.id}/${personId}`):void add()}>{added?"Abrir acompanhamento":confirmed?"Adicionar ao acompanhamento":"Consultar acompanhamento…"}</Button>{!added&&data?.process?.status==="closed"?<small>Processo atual encerrado</small>:null}{error?<Alert type="error" showIcon title={error} action={<Button loading={pending} onClick={()=>void add()}>Tentar novamente</Button>} />:null}</Space>;
}
