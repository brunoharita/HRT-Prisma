import {useEffect,useState} from "react";
import {Alert,Button,Drawer,Skeleton,Statistic} from "antd";
import {HomeFilled,ApartmentOutlined,CheckCircleOutlined,FileAddOutlined,TeamOutlined} from "@ant-design/icons";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import type {HomeSummary,PrismaDataRepository} from "../domain/prismaData";
import type {OrganizationMembership} from "../shared/access";
import {PrismaCard} from "../ui/PrismaCard";
import {PrismaPage,PrismaPageHeader} from "../ui/PrismaPage";

interface HomePageProps {
  activeMembership:OrganizationMembership;
  repository:PrismaDataRepository;
  onNavigate:(path:string)=>void;
}
export function HomePage({activeMembership,repository,onNavigate}:HomePageProps) {
  const [summary,setSummary]=useState<HomeSummary|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  const [help,setHelp]=useState(false);
  useLoadingFeedback({"Carregando resumo inicial…":loading});
  useEffect(()=>{
    let current=true;
    setSummary(null);setError(null);setLoading(true);
    void repository.loadHomeSummary(activeMembership.organizationId)
      .then(data=>{if(current)setSummary(data);})
      .catch(()=>{if(current)setError("Não foi possível carregar o resumo da empresa.");})
      .finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[activeMembership.organizationId,repository,retry]);
  return <PrismaPage className="prisma-m81-home">
    <PrismaPageHeader icon={<HomeFilled/>} title="Olá!" description={`Bem-vindo ao Prisma · ${activeMembership.organizationName}`}
      actions={<Button onClick={()=>setHelp(true)}>Como o Prisma trabalha</Button>}/>
    {error?<Alert type="error" showIcon title={error} action={<Button onClick={()=>setRetry(n=>n+1)}>Atualizar consulta</Button>}/>:null}
    <section className="prisma-dashboard-grid" aria-label="Resumo da organização">
      {loading?[0,1,2].map(i=><PrismaCard key={i} className="prisma-status-card"><Skeleton active title={false} paragraph={{rows:2}}/></PrismaCard>):summary?<>
        <PrismaCard className="prisma-status-card"><Statistic prefix={<TeamOutlined/>} title="Pessoas" value={summary.peopleCount}/><p>Pessoas registradas na empresa ativa.</p></PrismaCard>
        <PrismaCard className="prisma-status-card"><Statistic prefix={<ApartmentOutlined/>} title="Posições" value={summary.openVacanciesCount}/><p>Posições abertas na empresa.</p></PrismaCard>
        <PrismaCard className="prisma-status-card"><Statistic prefix={<CheckCircleOutlined/>} title="Perfis aprovados" value={summary.structuredProfilesCount}/><p>Perfis estruturados disponíveis.</p></PrismaCard>
      </>:null}
    </section>
    {activeMembership.role!=="member"?<Button className="prisma-m81-home-import" icon={<FileAddOutlined/>} onClick={()=>onNavigate("/profiles/import")}>Importar currículo</Button>:null}
    <Drawer open={help} title="Como o Prisma trabalha" onClose={()=>setHelp(false)} size="large">
      <h3>Decisão humana</h3><p>O Prisma organiza evidências, mas não decide contratações.</p>
      <h3>Origem preservada</h3><p>Cada informação permanece vinculada à sua fonte e versão.</p>
      <h3>Dados protegidos</h3><p>O acesso respeita a empresa ativa e o papel de cada usuário.</p>
      <h3>Estrutura de competências</h3><p>As competências são organizadas por grupos. Consulte a definição de cada grupo ao classificar uma informação. Fontes e versões podem ser consultadas na área Conhecimento pelos administradores autorizados.</p>
    </Drawer>
  </PrismaPage>;
}
