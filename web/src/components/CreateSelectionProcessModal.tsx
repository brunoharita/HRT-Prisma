import { useEffect, useRef, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Pagination, Radio, Skeleton } from "antd";
import type { SelectionPosition } from "../domain/selectionProcess";
import { selectionProcessService } from "../infrastructure/supabase/selectionProcessService";
import { positionFollowUpService } from "../infrastructure/supabase/positionFollowUpService";
export function CreateSelectionProcessModal({organizationId,vacancyId,onClose,onCreated}:{organizationId:string;vacancyId?:string;onClose:()=>void;onCreated:(id:string)=>void}){
 const [positions,setPositions]=useState<SelectionPosition[]>([]),[total,setTotal]=useState(0),[search,setSearch]=useState(""),[page,setPage]=useState(1),[selected,setSelected]=useState<string|undefined>(vacancyId);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 const request=useRef(crypto.randomUUID()),lock=useRef(false);
 useEffect(()=>{let current=true;setLoading(true);setError(null);const timer=setTimeout(()=>void selectionProcessService.positions(organizationId,search,(page-1)*50).then(d=>{if(current){setPositions(d.positions);setTotal(d.total);}}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);}),180);return()=>{current=false;clearTimeout(timer);};},[organizationId,search,page,retry]);
 const chosen=positions.find(p=>p.id===selected);
 async function create(){if(!chosen||lock.current||loading||error)return;lock.current=true;setSaving(true);setError(null);try{
  const result=await positionFollowUpService.start(organizationId,chosen.id,chosen.processId,chosen.revision,request.current);
  if(!result.process)throw Error("O processo criado não foi confirmado.");onCreated(result.process.id);
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível criar o processo.");}finally{lock.current=false;setSaving(false);}}
 return <Modal rootClassName="prisma-content-standard prisma-reading" open title="Novo processo seletivo" onCancel={()=>{if(!saving)onClose();}} footer={<><Button disabled={saving} onClick={onClose}>Cancelar</Button><Button type="primary" loading={saving} disabled={!chosen||loading||Boolean(error)} onClick={()=>void create()}>Criar processo seletivo</Button></>}>
 <p>Escolha uma Posição desocupada e sem processo em andamento. O novo processo começa sem candidatos.</p>
 <Input aria-label="Buscar Posição desocupada" placeholder="Buscar Posição" value={search} disabled={saving} onChange={e=>{setSearch(e.target.value);setPage(1);setSelected(undefined);request.current=crypto.randomUUID();}}/>
 {error?<Alert showIcon type="error" title={error} action={<Button disabled={saving} onClick={()=>setRetry(n=>n+1)}>Atualizar Posições</Button>}/>:null}
 {loading?<Skeleton active paragraph={{rows:3}}/>:positions.length?<Radio.Group aria-label="Posição do novo processo" value={selected} disabled={saving} onChange={e=>{setSelected(e.target.value);request.current=crypto.randomUUID();}} className="sp-position-options">{positions.map(p=><Radio key={p.id} value={p.id}>{p.title}</Radio>)}</Radio.Group>:<Empty description="Nenhuma Posição desocupada e sem processo ativo disponível."/>}
 {total>50?<Pagination size="small" current={page} pageSize={50} total={total} showSizeChanger={false} onChange={p=>{setPage(p);setSelected(undefined);}}/>:null}
 </Modal>;
}
