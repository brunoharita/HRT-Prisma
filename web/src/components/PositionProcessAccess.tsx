import {useEffect,useState} from "react";
import {Alert,Button,Skeleton,Tag} from "antd";
import {selectionProcessService} from "../infrastructure/supabase/selectionProcessService";
import {processPath,type SelectionWorkspace} from "../domain/selectionProcess";
import {CreateSelectionProcessModal} from "./CreateSelectionProcessModal";
export function PositionProcessAccess({organizationId,vacancyId,occupancy,onNavigate}:{organizationId:string;vacancyId:string;occupancy:string;onNavigate:(path:string)=>void}){
 const [data,setData]=useState<SelectionWorkspace|null>(null),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0),[creating,setCreating]=useState(false);
 useEffect(()=>{let current=true;setData(null);setError(null);void selectionProcessService.load(organizationId,{vacancyId}).then(d=>{if(current)setData(d);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[organizationId,vacancyId,retry]);
 const active=data?.processes.find(p=>p.status==="active");
 return <><p>A Posição permanece cadastrada; cada seleção tem seus candidatos e histórico.</p>{error?<Alert showIcon type="warning" title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</Button>}/>:!data?<Skeleton active paragraph={{rows:1}}/>:active?<><Tag color="blue">Em andamento</Tag><Button block type="primary" onClick={()=>onNavigate(processPath(active))}>Abrir processo seletivo</Button></>:<><p>Sem processo ativo</p>{occupancy==="vacant"?<Button block type="primary" onClick={()=>setCreating(true)}>Criar processo seletivo</Button>:<p>A Posição precisa estar desocupada para iniciar um processo.</p>}</>}
 <Button block onClick={()=>onNavigate(`/selection-processes/position/${vacancyId}`)}>Ver processos e histórico</Button>
 {creating?<CreateSelectionProcessModal organizationId={organizationId} vacancyId={vacancyId} onClose={()=>setCreating(false)} onCreated={id=>onNavigate(`/selection-processes/${id}`)}/>:null}</>;
}
