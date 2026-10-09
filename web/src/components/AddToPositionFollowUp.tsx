import { useState } from "react";
import { Alert, Button, Space } from "antd";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";

export function AddToPositionFollowUp({organizationId,vacancyId,personId,profileId,positionId,onNavigate}:{organizationId:string;vacancyId:string;personId:string;profileId:string;positionId:string;onNavigate:(path:string)=>void}){
  const [pending,setPending]=useState(false),[added,setAdded]=useState(false),[error,setError]=useState<string|null>(null);
  useLoadingFeedback({"Adicionando Pessoa ao acompanhamento…":pending});
  async function add(){if(pending)return;setPending(true);setError(null);try{await positionFollowUpService.mutate(organizationId,vacancyId,"add",personId,null,{profileId,positionId});setAdded(true);}catch(e){setError(e instanceof Error?e.message:"Não foi possível adicionar a Pessoa.");}finally{setPending(false);}}
  return <Space className="prisma-add-to-evaluation" orientation="vertical"><Button type={added?"default":"primary"} icon={added?<CheckOutlined aria-hidden="true"/>:<PlusOutlined aria-hidden="true"/>} loading={pending} disabled={added} onClick={()=>void add()}>{added?"Pessoa adicionada ao acompanhamento":"Adicionar ao acompanhamento"}</Button>{added?<Button type="link" onClick={()=>onNavigate(`/vacancies/${vacancyId}/follow-up/${personId}`)}>Abrir acompanhamento</Button>:null}{error?<Alert type="error" showIcon title={error} action={<Button loading={pending} onClick={()=>void add()}>Tentar novamente</Button>} />:null}</Space>;
}
