import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Input, Space } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { OrganizationMembership } from "../shared/access";
import type { ResumeDuplicateCandidate } from "../domain/personIngestion";
import { personIngestionService as service } from "../infrastructure/supabase/personIngestionService";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaCard } from "../ui/PrismaCard";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { useUnsavedChanges } from "../ui/PrismaNavigation";

type Identity = { fullName: string; email: string; phone: string };
export function ManualProfileStartPage({ activeMembership, onNavigate }: { activeMembership: OrganizationMembership; onNavigate: (path: string) => void }) {
  const [form] = Form.useForm<Identity>();
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ResumeDuplicateCandidate[] | null>(null);
  const pending = useRef(false), operation = useRef(crypto.randomUUID());
  const currentOrganization = useRef(activeMembership.organizationId);
  currentOrganization.current = activeMembership.organizationId;
  useEffect(() => { form.resetFields(); setCandidates(null); setError(null); setDirty(false); setBusy(false); pending.current=false; operation.current=crypto.randomUUID(); }, [activeMembership.organizationId, form]);
  const markSaved = useUnsavedChanges(dirty);
  useLoadingFeedback({ "Verificando cadastro e preparando rascunho…": busy });
  async function start(confirmNew = false) {
    if (pending.current) return;
    const organizationId = activeMembership.organizationId;
    const values = await form.validateFields();
    if (currentOrganization.current !== organizationId) return;
    const identity = { fullName: values.fullName.trim(), email: (values.email ?? "").trim(), phone: (values.phone ?? "").trim() };
    pending.current = true; setBusy(true); setError(null);
    try {
      if (!confirmNew) {
        const matches = await service.findManualDuplicates(organizationId, identity);
        if (currentOrganization.current !== organizationId) return;
        setCandidates(matches);
        if (matches.length) return;
      }
      const result = await service.startManualProfile(organizationId, null, identity, confirmNew, operation.current);
      if (currentOrganization.current !== organizationId) return;
      setDirty(false); markSaved();
      onNavigate(`/profiles/${result.personId}/reviews/${result.reviewId}`);
    } catch (caught) { if (currentOrganization.current === organizationId) setError(caught instanceof Error ? caught.message : "Não foi possível preparar o rascunho."); }
    finally { if (currentOrganization.current === organizationId) { pending.current = false; setBusy(false); } }
  }
  return <PrismaPage className="prisma-manual-profile-start">
    <PrismaPageHeader icon={<EditOutlined />} title="Preencher manualmente" description="Identifique a Pessoa para verificar possíveis duplicidades. Depois, preencha as seções profissionais no editor. Você pode salvar um rascunho parcial e continuar depois, sem PDF ou consumo de Tokens Prisma." />
    <PrismaCard title="Identificação inicial">
      {error ? <Alert showIcon type="error" title={error} /> : null}
      <Form form={form} layout="vertical" requiredMark="optional" disabled={busy} onValuesChange={() => { setDirty(true); setCandidates(null); }} onFinish={() => void start()}>
        <Form.Item name="fullName" label="Nome completo" rules={[{ required: true, whitespace: true, min: 2, max: 160, message: "Informe o nome completo, de 2 a 160 caracteres." }]}><Input autoComplete="name" /></Form.Item>
        <Form.Item name="email" label="E-mail" rules={[{ type: "email", max: 254, message: "Informe um e-mail válido ou deixe vazio no rascunho." }]}><Input autoComplete="email" /></Form.Item>
        <Form.Item name="phone" label="Telefone" rules={[{ validator: (_, value: string | undefined) => !value || /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 10 && value.replace(/\D/g, "").length <= 15 ? Promise.resolve() : Promise.reject(new Error("Informe telefone com DDD ou deixe vazio no rascunho.")) }]}><Input autoComplete="tel" /></Form.Item>
        <Space wrap><Button htmlType="submit" loading={busy} type="primary">Verificar e abrir editor</Button><Button onClick={() => onNavigate("/profiles/import")}>Importar currículo PDF</Button><Button onClick={() => onNavigate("/profiles")}>Cancelar</Button></Space>
      </Form>
    </PrismaCard>
    {candidates?.length ? <PrismaCard title="Possíveis cadastros existentes">
      <Alert showIcon type="warning" title="Confira as correspondências antes de criar outra Pessoa." description="Você decide se é o mesmo cadastro. Nenhum vínculo ou mesclagem será feito automaticamente." />
      {candidates.map(candidate => <div className="prisma-summary-row" key={candidate.personId}><div><strong>{candidate.fullName}</strong><p>{candidate.email ?? candidate.phone ?? "Mesmo nome"}</p></div><Button disabled={busy} onClick={() => onNavigate(`/profiles/${candidate.personId}`)}>Abrir cadastro existente</Button></div>)}
      <Button loading={busy} onClick={() => void start(true)}>Conferi: criar outra Pessoa e abrir editor</Button>
    </PrismaCard> : null}
  </PrismaPage>;
}
