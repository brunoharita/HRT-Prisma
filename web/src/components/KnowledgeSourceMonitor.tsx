import {useEffect, useRef, useState} from "react";
import {Alert, Button, Drawer, Skeleton, Steps, Tag, Typography} from "antd";
import {ClockCircleOutlined, SyncOutlined} from "@ant-design/icons";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import {PrismaCard} from "../ui/PrismaCard";
import {prismaRepository} from "../infrastructure/supabase/prismaRepository";
import type {KnowledgeSourceHealth, KnowledgeSourceMonitorStatus, PrismaDataRepository} from "../domain/prismaData";

export function KnowledgeSourceMonitor({organizationId, onGovernance, onRefresh, repository=prismaRepository}: {
  organizationId:string;
  onGovernance:(sourceId?:string)=>void;
  onRefresh:()=>void;
  repository?:PrismaDataRepository;
}) {
  const [sources,setSources]=useState<KnowledgeSourceHealth[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [retry,setRetry]=useState(0);
  const [checkingSourceId,setCheckingSourceId]=useState<string|null>(null);
  const [resolutionSource,setResolutionSource]=useState<KnowledgeSourceHealth|null>(null);
  const generation=useRef(0), loadedOrganization=useRef<string|null>(null);
  useLoadingFeedback({"Consultando monitoramento das fontes…":loading,"Verificando base de conhecimento…":checkingSourceId});
  useEffect(()=>{
    const current=++generation.current;
    if(loadedOrganization.current!==organizationId){setSources([]);setResolutionSource(null);}
    setLoading(true);setError(null);setCheckingSourceId(null);
    void repository.loadHomeSummary(organizationId).then(data=>{
      if(generation.current===current){setSources(data.knowledgeSources);loadedOrganization.current=organizationId;}
    }).catch(()=>{
      if(generation.current===current)setError("Não foi possível consultar o monitoramento das fontes.");
    }).finally(()=>{if(generation.current===current)setLoading(false);});
    return ()=>{generation.current++;};
  },[organizationId,repository,retry]);
  async function checkSource(id:string){
    const current=generation.current;
    setCheckingSourceId(id);setError(null);
    try{
      await repository.checkKnowledgeSource(id);
      if(generation.current!==current)return;
      const data=await repository.loadHomeSummary(organizationId);
      if(generation.current!==current)return;
      setSources(data.knowledgeSources);onRefresh();
    }catch{
      if(generation.current===current)setError("Não foi possível checar esta base. O estado anterior foi preservado.");
    }finally{if(generation.current===current)setCheckingSourceId(null);}
  }
  return <>
    {error?<Alert type="error" showIcon title={error} action={<Button loading={loading} onClick={()=>setRetry(n=>n+1)}>Consultar monitoramento</Button>}/>:null}
    {loading&&!sources.length?<Skeleton active/>:null}
    {loadedOrganization.current===organizationId?<KnowledgeSourcesCard sources={sources} canManage checkingSourceId={checkingSourceId} onResolve={setResolutionSource} onCheck={checkSource}/>:null}
    <SourceResolutionDrawer source={loadedOrganization.current===organizationId?resolutionSource:null} onClose={()=>setResolutionSource(null)} onNavigate={()=>{const sourceId=resolutionSource?.id;setResolutionSource(null);onGovernance(sourceId);}}/>
  </>;
}

function KnowledgeSourcesCard({
  sources,
  canManage,
  checkingSourceId,
  onCheck,
  onResolve,
}: {
  sources: KnowledgeSourceHealth[];
  canManage: boolean;
  checkingSourceId: string | null;
  onCheck: (sourceId: string) => Promise<void>;
  onResolve: (source: KnowledgeSourceHealth) => void;
}) {
  return (
    <PrismaCard
      className="prisma-knowledge-health-card"
      title={<span className="prisma-knowledge-health-title"><SyncOutlined /> Bases de conhecimento</span>}
    >
      <Typography.Paragraph className="prisma-knowledge-health-intro" type="secondary">
        Referências profissionais verificadas mensalmente, no primeiro dia às 01:00, no horário de São Paulo.
      </Typography.Paragraph>
      <div className="prisma-knowledge-health-grid">
        {sources.map((source) => {
          const status = describeMonitorStatus(source.status);
          return (
            <article className="prisma-knowledge-source" key={source.id}>
              <div className="prisma-knowledge-source__heading">
                <div>
                  <strong>{source.name}</strong>
                  <small>{source.published ? "Versão publicada" : "Versão detectada"}</small>
                </div>
                <Tag color={status.color}>{status.label}</Tag>
              </div>
              <Typography.Text className="prisma-knowledge-source__version">
                {source.version ?? "Versão ainda não identificada"}
              </Typography.Text>
              <dl>
                <div><dt>Data da versão</dt><dd>{formatReleaseDate(source.releaseDate)}</dd></div>
                {source.published && source.detectedVersion && source.detectedVersion !== source.version ? (
                  <div><dt>Nova versão detectada</dt><dd>{source.detectedVersion} · {formatReleaseDate(source.detectedReleaseDate)}</dd></div>
                ) : null}
                <div><dt><ClockCircleOutlined /> Última checagem</dt><dd>{formatCheckedAt(source.lastCheckedAt)}</dd></div>
              </dl>
              {source.status === "action_required" ? (
                <Alert
                  className="prisma-knowledge-source__action"
                  description={describeRequiredAction(source)}
                  message="O que falta fazer"
                  showIcon
                  type="warning"
                />
              ) : null}
              {source.status !== "current" ? <Button block onClick={() => onResolve(source)} type="primary">Resolver pendências</Button> : null}
              {canManage ? <Button block disabled={Boolean(checkingSourceId && checkingSourceId !== source.id)} loading={checkingSourceId === source.id} onClick={() => void onCheck(source.id)} size="small">Checar agora</Button> : null}
            </article>
          );
        })}
      </div>
    </PrismaCard>
  );
}

function SourceResolutionDrawer({
  source,
  onClose,
  onNavigate,
}: {
  source: KnowledgeSourceHealth | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const plan = source ? buildResolutionPlan(source) : null;
  return <Drawer rootClassName="prisma-content-standard" open={Boolean(source)} onClose={onClose} title={plan?.title ?? "Resolver pendências"} width={560}>
    {plan ? <>
      <Alert showIcon type={plan.tone} message={plan.summary} />
      <Typography.Title level={5} style={{ marginTop: 24 }}>O que o Prisma fará</Typography.Title>
      <Steps direction="vertical" size="small" items={plan.steps.map((step) => ({ title: step }))} />
      <Alert style={{ marginTop: 20 }} type="info" showIcon message="Decisão necessária" description={plan.humanDecision} />
      {plan.canOpenGovernance ? <Button block onClick={() => { onClose(); onNavigate("/knowledge"); }} style={{ marginTop: 20 }} type="primary">Revisar versão da fonte</Button> : null}
    </> : null}
  </Drawer>;
}

function buildResolutionPlan(source: KnowledgeSourceHealth): {
  title: string;
  summary: string;
  steps: string[];
  humanDecision: string;
  tone: "info" | "warning" | "error";
  canOpenGovernance: boolean;
} {
  const version = source.detectedVersion ?? source.version ?? "a versão encontrada";
  if (source.pendingPublication) return {
    title: `Resolver pendências · ${source.name}`,
    summary: `A versão ${version} já foi preparada e comparada com a versão atual.`,
    steps: ["Abrir a Governança", "Revisar o que mudou", "Confirmar a publicação da nova versão"],
    humanDecision: "A publicação altera a base global usada pelo Prisma e precisa da aprovação de um Super Admin.",
    tone: "warning",
    canOpenGovernance: true,
  };
  if (source.status === "temporary_failure") return {
    title: `Tentar novamente · ${source.name}`,
    summary: "A fonte não respondeu corretamente nesta tentativa.",
    steps: ["Repetir a consulta à fonte oficial", "Registrar o novo resultado", "Manter a versão atual se a fonte continuar indisponível"],
    humanDecision: "Nenhuma decisão de publicação é necessária enquanto a consulta não for concluída.",
    tone: "error",
    canOpenGovernance: false,
  };
  if (source.status === "validation_failed") return {
    title: `Revisar validação · ${source.name}`,
    summary: "A fonte respondeu, mas o conteúdo não passou pela validação esperada.",
    steps: ["Consultar novamente a fonte oficial", "Identificar o que não pôde ser validado", "Preparar uma nova tentativa quando o conteúdo estiver íntegro"],
    humanDecision: "A versão atual continua protegida; nenhuma publicação será feita com conteúdo não validado.",
    tone: "error",
    canOpenGovernance: true,
  };
  return {
    title: `Preparar atualização · ${source.name}`,
    summary: `A versão ${version} foi encontrada, mas ainda não está pronta para uso no Prisma.`,
    steps: ["Obter o pacote oficial", "Validar estrutura, origem e licença", "Comparar com a versão atual", "Enviar para revisão humana"],
    humanDecision: "Depois da preparação, um Super Admin revisará as diferenças antes da publicação.",
    tone: "info",
    canOpenGovernance: true,
  };
}

function describeRequiredAction(source: KnowledgeSourceHealth): string {
  if (source.pendingPublication) {
    return `A versão ${source.detectedVersion ?? source.version ?? "detectada"} já foi preparada e comparada. Falta revisar e aprovar a publicação em Governança.`;
  }
  if (!source.published) {
    return `A versão ${source.detectedVersion ?? source.version ?? "detectada"} foi encontrada, mas ainda precisa ser preparada, validada e aprovada antes de ser usada pelo Prisma.`;
  }
  return "Foi identificada uma diferença em relação à versão publicada. Revise a nova versão antes de substituir a atual.";
}

function describeMonitorStatus(status: KnowledgeSourceMonitorStatus): { label: string; color: string } {
  if (status === "current") return { label: "Atualizada", color: "success" };
  if (status === "update_available") return { label: "Nova versão disponível", color: "processing" };
  if (status === "action_required") return { label: "Aguardando ação humana", color: "warning" };
  if (status === "temporary_failure") return { label: "Falha temporária", color: "error" };
  if (status === "validation_failed") return { label: "Validação rejeitada", color: "error" };
  return { label: "Ainda não verificada", color: "default" };
}

function formatReleaseDate(value: string | null): string {
  if (!value) return "Não informada pela fonte";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatCheckedAt(value: string | null): string {
  if (!value) return "Aguardando primeira checagem";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
