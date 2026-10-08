import { useState } from "react";
import { Alert, Button, Space } from "antd";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";

export function AddToPositionFollowUp({organizationId,vacancyId,personId,profileId,positionId,onNavigate}:{organizationId:string;vacancyId:string;personId:string;profileId:string;positionId:string;onNavigate:(path:string)=>void}){
  const [pending,setPending]=useState(false),[added,setAdded]=useState(false),[error,setError]=useState<string|null>(null);
  useLoadingFeedback({"Adicionando Pessoa à avaliação…":pending});
  async function add(){if(pending)return;setPending(true);setError(null);try{await positionFollowUpService.mutate(organizationId,vacancyId,"add",personId,null,{profileId,positionId});setAdded(true);}catch(e){setError(e instanceof Error?e.message:"Não foi possível adicionar a Pessoa.");}finally{setPending(false);}}
  return <Space orientation="vertical"><Button loading={pending} disabled={added} onClick={()=>void add()}>{added?"Pessoa adicionada à avaliação":"Adicionar à avaliação"}</Button>{added?<Button type="link" onClick={()=>onNavigate(`/vacancies/${vacancyId}/follow-up/${personId}`)}>Abrir acompanhamento</Button>:null}{error?<Alert type="error" showIcon title={error} />:null}</Space>;
}
