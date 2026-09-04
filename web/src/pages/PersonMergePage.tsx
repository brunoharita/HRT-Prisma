import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined, CheckCircleOutlined, FileTextOutlined, SafetyCertificateOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Modal, Radio, Select, Skeleton, Tag, Typography } from "antd";
import type { PersonIngestionWorkspace, PersonWorkspaceSummary, ProfileVersionView } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PersonMergePageProps { activeMembership: OrganizationMembership; personId: string; onNavigate: (path: string) => void; }
type ContactKey = "email" | "phone_e164" | "birth_date";
type Choice = "source" | "target";

export function PersonMergePage({ activeMembership, personId, onNavigate }: PersonMergePageProps) {
  const [source, setSource] = useState<PersonIngestionWorkspace | null>(null);
  const [sourceVersions, setSourceVersions] = useState<ProfileVersionView[]>([]);
  const [candidates, setCandidates] = useState<PersonWorkspaceSummary[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [target, setTarget] = useState<PersonIngestionWorkspace | null>(null);
  const [targetVersions, setTargetVersions] = useState<ProfileVersionView[]>([]);
  const [choices, setChoices] = useState<Partial<Record<ContactKey, Choice>>>({});
  const [profileChoice, setProfileChoice] = useState<Choice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    void Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, personId),
      personIngestionService.listProfileVersions(activeMembership.organizationId, personId),
      personIngestionService.listPeople(activeMembership.organizationId, "", true),
    ]).then(([workspace, versions, people]) => {
      if (!current) return;
      if (!workspace || workspace.person.operationalStatus !== "active") throw new Error("Esta Pessoa não está disponível para mesclagem.");
      setSource(workspace);
      setSourceVersions(versions);
      setCandidates(people.filter((person) => person.id !== personId && person.operationalStatus === "active"));
    }).catch((caught: unknown) => { if (current) setError(messageOf(caught)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, personId]);

  useEffect(() => {
    let current = true;
    setTarget(null); setTargetVersions([]); setChoices({}); setProfileChoice(null);
    if (!targetId) return () => { current = false; };
    setBusy(true); setError(null);
    void Promise.all([
      personIngestionService.loadWorkspace(activeMembership.organizationId, targetId),
      personIngestionService.listProfileVersions(activeMembership.organizationId, targetId),
    ]).then(([workspace, versions]) => {
      if (!current) return;
      if (!workspace) throw new Error("A Pessoa principal já não está disponível.");
      setTarget(workspace); setTargetVersions(versions);
    }).catch((caught: unknown) => { if (current) setError(messageOf(caught)); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, targetId]);

  const conflicts = useMemo(() => source && target ? contactConflicts(source, target) : [], [source, target]);
  const bothHaveProfiles = Boolean(source?.person.currentProfile && target?.person.currentProfile);
  const ready = Boolean(target && conflicts.every((item) => choices[item.key]) && (!bothHaveProfiles || profileChoice));

  function confirmMerge() {
    if (!source || !target || !ready) return;
    Modal.confirm({
      title: `Mesclar ${source.person.fullName} em ${target.person.fullName}?`,
      width: 680,
      content: <div className="prisma-merge-confirm"><Alert showIcon title={`${target.person.fullName} será o cadastro principal.`} type="info" /><p>Documentos, versões históricas e rastreabilidade serão preservados. O cadastro absorvido sairá da lista principal, mas continuará acessível pelo histórico.</p><p>Nenhum texto de Perfil será combinado automaticamente.</p></div>,
      okText: "Mesclar Pessoas", cancelText: "Cancelar", icon: <TeamOutlined />,
      onOk: async () => {
        setBusy(true); setError(null);
        try {
          const primaryId = await personIngestionService.mergePeople(activeMembership.organizationId, source.person.id, target.person.id, choices as Record<string, Choice>, profileChoice ?? "automatic");
          window.sessionStorage.setItem(`prisma.people-merged.${primaryId}`, `${source.person.fullName} foi incorporado a este cadastro. Documentos e histórico foram preservados.`);
          onNavigate(`/profiles/${primaryId}`);
        } catch (caught) { setError(messageOf(caught)); setBusy(false); }
      },
    });
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 12 }} /></PrismaPage>;
  return <PrismaPage className="prisma-m53-page prisma-person-merge-page">
    <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate(`/profiles/${personId}`)} type="text">Voltar para a Central da Pessoa</Button>
    <PrismaPageHeader title="Mesclar Pessoas" description="Unifique cadastros duplicados com escolhas explícitas e preservação integral do histórico." />
    {error ? <Alert closable onClose={() => setError(null)} showIcon title={error} type="error" /> : null}
    {source ? <>
      <PrismaCard className="prisma-merge-target-picker">
        <div><Typography.Title level={3}>Escolha o cadastro principal</Typography.Title><Typography.Paragraph>O cadastro atual será absorvido pela Pessoa escolhida abaixo.</Typography.Paragraph></div>
        <Select aria-label="Cadastro principal" filterOption={(input, option) => String(option?.label ?? "").toLocaleLowerCase("pt-BR").includes(input.toLocaleLowerCase("pt-BR"))} loading={busy} onChange={setTargetId} options={candidates.map((person) => ({ value: person.id, label: `${person.fullName}${person.privateData.email ? ` · ${person.privateData.email}` : ""}` }))} placeholder="Procure a Pessoa que deve permanecer" showSearch value={targetId} />
      </PrismaCard>
      {target ? <>
        <div className="prisma-merge-people-grid"><PersonMergeCard label="Cadastro absorvido" person={source} versions={sourceVersions} /><PersonMergeCard label="Cadastro principal" person={target} versions={targetVersions} primary /></div>
        {conflicts.length ? <PrismaCard className="prisma-merge-conflicts" title="Escolha somente os dados que entram em conflito"><div>{conflicts.map((conflict) => <section key={conflict.key}><strong>{conflict.label}</strong><Radio.Group onChange={(event) => setChoices((current) => ({ ...current, [conflict.key]: event.target.value as Choice }))} value={choices[conflict.key]}><Radio.Button value="source">{conflict.source}</Radio.Button><Radio.Button value="target">{conflict.target}</Radio.Button></Radio.Group></section>)}</div></PrismaCard> : <Alert showIcon title="Os dados de contato não têm conflitos e serão incorporados automaticamente." type="success" />}
        {bothHaveProfiles ? <PrismaCard className="prisma-merge-profile-choice" title="Qual Perfil vigente deve permanecer como base?"><Typography.Paragraph>Os dois Perfis continuam no histórico, mas apenas um pode ser o Perfil vigente. O Prisma não mistura conteúdos automaticamente.</Typography.Paragraph><Radio.Group onChange={(event) => setProfileChoice(event.target.value as Choice)} value={profileChoice}><Radio.Button value="source">Perfil v{source.person.currentProfile?.profileVersion} de {source.person.fullName}</Radio.Button><Radio.Button value="target">Perfil v{target.person.currentProfile?.profileVersion} de {target.person.fullName}</Radio.Button></Radio.Group></PrismaCard> : null}
        <div className="prisma-merge-footer"><div><CheckCircleOutlined /><span>Documentos, extrações, evidências e versões históricas serão preservados.</span></div><Button disabled={!ready} loading={busy} onClick={confirmMerge} type="primary">Mesclar Pessoas</Button></div>
      </> : <PrismaCard><Empty description="Escolha o cadastro principal para comparar as informações." /></PrismaCard>}
    </> : null}
  </PrismaPage>;
}

function PersonMergeCard({ label, person, versions, primary = false }: { label: string; person: PersonIngestionWorkspace; versions: ProfileVersionView[]; primary?: boolean }) {
  const title = versions.find((version) => !version.supersededAt)?.profileData.professionalTitle;
  return <PrismaCard className={`prisma-merge-person-card${primary ? " is-primary" : ""}`}><header><span className="prisma-person-avatar">{initials(person.person.fullName)}</span><div><Tag color={primary ? "purple" : "default"}>{label}</Tag><Typography.Title level={3}>{person.person.fullName}</Typography.Title><span>{title ?? "Sem título profissional informado"}</span></div></header><dl><div><dt><FileTextOutlined /> Documentos</dt><dd>{person.person.documentCount}</dd></div><div><dt><SafetyCertificateOutlined /> Versões do Perfil</dt><dd>{versions.length}</dd></div><div><dt>E-mail</dt><dd>{person.person.privateData.email || "Não informado"}</dd></div><div><dt>Telefone</dt><dd>{person.person.privateData.phoneE164 || "Não informado"}</dd></div></dl></PrismaCard>;
}

function contactConflicts(source: PersonIngestionWorkspace, target: PersonIngestionWorkspace): Array<{ key: ContactKey; label: string; source: string; target: string }> {
  const pairs: Array<{ key: ContactKey; label: string; source: string; target: string }> = [
    { key: "email", label: "E-mail", source: source.person.privateData.email, target: target.person.privateData.email },
    { key: "phone_e164", label: "Telefone", source: source.person.privateData.phoneE164, target: target.person.privateData.phoneE164 },
    { key: "birth_date", label: "Data de nascimento", source: source.person.privateData.birthDate ?? "", target: target.person.privateData.birthDate ?? "" },
  ];
  return pairs.filter((item) => item.source && item.target && item.source !== item.target);
}
function initials(value: string): string { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""); }
function messageOf(value: unknown): string { return value instanceof Error ? value.message : "Não foi possível concluir esta ação."; }
