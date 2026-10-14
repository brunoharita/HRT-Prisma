import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Radio, Select, Skeleton } from "antd";
import type { FollowUpData } from "../domain/positionFollowUp";
import { SELECTION_OUTCOME_CONTRACT } from "../domain/selectionOutcome";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";

export function CloseSelectionProcessModal({organizationId,vacancyId,processId,onCancel,onClosed}:{organizationId:string;vacancyId:string;processId:string;onCancel:()=>void;onClosed:(data:FollowUpData)=>void}) {
  const [data,setData]=useState<FollowUpData|null>(null),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
  const [outcome,setOutcome]=useState<"selected"|"none"|null>(null),[personId,setPersonId]=useState<string|null>(null);
  const lock=useRef(false),generation=useRef(0);
  useEffect(()=>{
    const current=++generation.current;setLoading(true);setData(null);setError(null);
    void positionFollowUpService.load(organizationId,vacancyId,processId).then(result=>{
      if(current!==generation.current)return;
      if(result.process?.id!==processId)throw Error("Não foi possível confirmar este processo. Atualize a consulta.");
      if(result.process.status==="closed"){onClosed(result);return;}
      if(!["active"].includes(result.process.status)||result.process.isCurrent!==true)throw Error("Este processo não está em andamento. Atualize a consulta.");
      setData(result);
    }).catch(e=>{if(current===generation.current)setError(e instanceof Error?e.message:"Não foi possível consultar os participantes.");}).finally(()=>{if(current===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  },[organizationId,vacancyId,processId,retry]);
  const valid=Boolean(data?.process&&outcome&&(outcome==="none"||data.entries.some(e=>e.personId===personId)));
  async function close(){
    if(lock.current||!valid||!data?.process)return;lock.current=true;setPending(true);setError(null);const current=generation.current;
    try {
      const payload={contract:SELECTION_OUTCOME_CONTRACT,outcome,...(outcome==="selected"?{selectedPersonId:personId}:{})};
      const result=await positionFollowUpService.mutate(organizationId,vacancyId,"close_process",null,data.process.revision,payload,processId);
      if(current===generation.current)onClosed(result);
    }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:"Não foi possível encerrar o processo.");}
    finally{lock.current=false;if(current===generation.current)setPending(false);}
  }
  return <Modal open title="Encerrar processo seletivo" okText="Encerrar processo" cancelText="Cancelar" confirmLoading={pending} okButtonProps={{disabled:loading||!valid}} cancelButtonProps={{disabled:pending}} closable={!pending} maskClosable={false} onCancel={()=>{if(!pending)onCancel();}} onOk={()=>void close()}>
    <p>Escolha o resultado final. As avaliações, decisões e o histórico serão preservados.</p>
    {data?.process?<p><strong>{data.process.name}</strong></p>:null}
    {error?<Alert showIcon type="error" title={error} action={<Button disabled={pending} onClick={()=>setRetry(n=>n+1)}>Atualizar participantes</Button>}/>:null}
    {loading?<Skeleton active paragraph={{rows:2}}/>:<><Radio.Group aria-label="Resultado do encerramento" value={outcome} disabled={pending||!data} onChange={e=>setOutcome(e.target.value)} options={[{value:"selected",label:"Escolher uma Pessoa participante",disabled:!data?.entries.length},{value:"none",label:"Encerrar sem escolher ninguém"}]}/>
    {outcome==="selected"?<div style={{marginTop:16}}><label htmlFor="selection-close-person">Pessoa escolhida</label><Select id="selection-close-person" aria-label="Pessoa escolhida" style={{width:"100%"}} showSearch optionFilterProp="label" placeholder="Selecione uma Pessoa" disabled={pending} value={personId} onChange={setPersonId} options={(data?.entries??[]).map(e=>({value:e.personId,label:e.fullName}))}/></div>:null}
    {outcome?<p>{outcome==="selected"?"Os demais participantes serão registrados como não escolhidos neste processo.":"Nenhum participante será escolhido neste processo."}</p>:null}</>}
    <small>A ocupação da Posição permanece a mesma.</small>
  </Modal>;
}
