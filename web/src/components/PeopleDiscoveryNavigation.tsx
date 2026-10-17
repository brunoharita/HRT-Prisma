import { useEffect, useState } from "react";
import { Alert, Button, Empty, Modal, Select } from "antd";
import { vacancyService } from "../infrastructure/supabase/vacancyService";
import type { OrganizationMembership } from "../shared/access";
import "../ui/uxEvolution.css";

/** Existing destinations, with explicit choice of the Position before contextual discovery. */
export function PeopleDiscoveryNavigation({active,activeMembership,onNavigate,contextualOnly=false,personIds}:{contextualOnly?:boolean;personIds?:[string,string];active:"base"|"search";activeMembership:OrganizationMembership;onNavigate:(path:string)=>void}) {
  const [open,setOpen]=useState(false),[options,setOptions]=useState<{value:string;label:string}[]>([]),[selected,setSelected]=useState<string>(),[loading,setLoading]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{if(!open||activeMembership.role==="member")return;let current=true;setLoading(true);setError(false);setSelected(undefined);setOptions([]);
    void vacancyService.list(activeMembership.organizationId).then(items=>{if(current)setOptions(items.map(v=>({value:v.id,label:v.title})));}).catch(()=>{if(current)setError(true);}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[open,activeMembership.organizationId,activeMembership.role,retry]);
  if(contextualOnly&&activeMembership.role==="member")return null;
  return <>{contextualOnly?<Button onClick={()=>setOpen(true)}>Consultar para uma Posição</Button>:<nav className="prisma-discovery-nav" aria-label="Caminhos para encontrar pessoas">
    <button type="button" aria-current={active==="base"?"page":undefined} onClick={()=>onNavigate("/profiles")}>Sua base de pessoas</button>
    <button type="button" aria-current={active==="search"?"page":undefined} onClick={()=>onNavigate("/profiles/search")}>Encontrar profissionais</button>
    {activeMembership.role!=="member"?<button type="button" onClick={()=>setOpen(true)}>Para uma Posição</button>:null}
  </nav>}<Modal rootClassName="prisma-v310 prisma-content-standard prisma-reading" title="Encontrar pessoas para uma Posição" open={open} onCancel={()=>setOpen(false)} okText="Encontrar pessoas" okButtonProps={{disabled:!selected||loading||error}} onOk={()=>{if(selected){setOpen(false);onNavigate(personIds?`/vacancies/${selected}/compare/${personIds.join("/")}`:`/vacancies/${selected}/people`);}}}>
    <p>Escolha a necessidade para consultar os Perfis e suas evidências no contexto correto.</p>
    {error?<Alert type="error" showIcon title="Não foi possível consultar as Posições." action={<Button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</Button>}/>:<Select aria-label="Posição para encontrar pessoas" style={{width:"100%"}} loading={loading} showSearch optionFilterProp="label" placeholder="Selecione uma Posição" value={selected} options={options} onChange={setSelected} notFoundContent={loading?"Carregando…":<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhuma Posição disponível nesta empresa."/>}/>}
  </Modal></>;
}
