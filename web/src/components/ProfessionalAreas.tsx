import { useEffect, useState } from "react";
import { Alert, Button, Empty, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { professionalAreaService, type AreaContribution, type ProfessionalArea } from "../infrastructure/supabase/professionalAreaService";

export function ProfessionalAreas({ organizationId, global, canEdit }: { organizationId: string | null; global: boolean; canEdit: boolean }) {
  const [areas, setAreas] = useState<ProfessionalArea[]>([]);
  const [contributions, setContributions] = useState<AreaContribution[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Partial<ProfessionalArea> | null>(null);
  const [review, setReview] = useState<AreaContribution | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [form] = Form.useForm();
  async function load() {
    setLoading(true); setError(null);
    try {
      const [data, pending] = await Promise.all([professionalAreaService.load(global ? null : organizationId), global ? professionalAreaService.contributions() : Promise.resolve([])]);
      setAreas(data.options); setContributions(pending);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar áreas."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [organizationId, global]);
  function edit(area: Partial<ProfessionalArea>) {
    setReview(null); setEditor(area); form.setFieldsValue({ label: area.label ?? "", description: area.description ?? "", aliases: area.aliases ?? [], active: area.active ?? true });
  }
  function curate(p: AreaContribution) {
    setEditor(null); setReview(p); setTarget(null); setReason("");
    form.setFieldsValue({ label: p.original_proposal.proposed_concept.canonical_label, description: p.original_proposal.proposed_concept.description, aliases: p.original_proposal.aliases ?? [], active: true });
  }
  async function decide(decision: "approved" | "rejected" | "deferred") {
    if (!review) return;
    try {
      const value = decision === "approved" && !target ? await form.validateFields() : form.getFieldsValue();
      setLoading(true); await professionalAreaService.decide(review.id, decision, target, value.label ?? "", value.description ?? "", value.aliases ?? [], reason);
      setReview(null); message.success(decision === "approved" ? "Contribuição aprovada na base global. Origem local preservada." : "Decisão registrada. Área local preservada."); await load();
    } catch (e) { if (e instanceof Error) setError(e.message); }
    finally { setLoading(false); }
  }
  return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
    <Typography.Paragraph>Macroáreas usadas na classificação dos perfis e nos filtros de Pessoas. Os termos associados ajudam a reconhecer diferentes formas de descrever a mesma área.</Typography.Paragraph>
    {error ? <Alert type="error" showIcon title={error} action={<Button onClick={() => void load()}>Tentar novamente</Button>} /> : null}
    <Space wrap><Input.Search aria-label="Buscar áreas profissionais" placeholder="Buscar nome ou termo associado" value={search} onChange={e => setSearch(e.target.value)} allowClear />
      {canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={() => edit({})}>Nova área {global ? "global" : "da empresa"}</Button> : null}
      <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Atualizar áreas</Button></Space>
    {!global ? <Typography.Text type="secondary">Áreas da empresa ficam disponíveis imediatamente e são enviadas à curadoria global. Uma decisão global preserva o cadastro local.</Typography.Text> : null}
    <Table rowKey="id" size="small" loading={loading} scroll={{ x: 720 }} dataSource={areas.filter(a => `${a.label} ${a.aliases.join(" ")}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))} columns={[
      { title: "Área profissional", dataIndex: "label", render: (value, a) => <><strong>{value}</strong><div><Typography.Text type="secondary">{a.description}</Typography.Text></div></> },
      { title: "Termos associados", dataIndex: "aliases", render: (aliases: string[]) => aliases.length ? <Space wrap>{aliases.map(a => <Tag key={a}>{a}</Tag>)}</Space> : "—" },
      { title: "Base", render: (_, a) => <Tag color={a.scope === "global" ? "blue" : "purple"}>{a.scope === "global" ? "Global" : "Empresa"}</Tag> },
      { title: "Situação", render: (_, a) => <><Tag color={a.active ? "green" : "default"}>{a.active ? "Ativa" : "Inativa"}</Tag><small>v{a.version}</small></> },
      { title: "Ação", render: (_, a) => canEdit && (global ? a.scope === "global" : a.scope === "organization") ? <Button onClick={() => edit(a)}>Editar</Button> : <Typography.Text type="secondary">Consulta</Typography.Text> },
    ]} />
    {global ? <><Typography.Title level={5}>Contribuições das empresas</Typography.Title><Table rowKey="id" size="small" scroll={{ x: 550 }} dataSource={contributions} locale={{ emptyText: <Empty description="Nenhuma contribuição de área." /> }} columns={[
      { title: "Área proposta", render: (_, p) => p.original_proposal.proposed_concept.canonical_label },
      { title: "Situação", render: (_, p) => ({awaiting_human_review:"Aguardando curadoria",approved:"Aprovada",rejected:"Rejeitada",deferred:"Somente local"}[p.status] ?? p.status) },
      { title: "Ação", render: (_, p) => p.status === "awaiting_human_review" ? <Button onClick={() => curate(p)}>Revisar contribuição</Button> : "Decisão registrada" },
    ]} /></> : null}
    <Modal rootClassName="prisma-content-standard" open={Boolean(editor || review)} title={review ? "Curadoria global da área" : editor?.id ? "Editar área profissional" : "Cadastrar área profissional"} onCancel={() => { setEditor(null); setReview(null); }} footer={review ? <Space wrap>
      <Button disabled={reason.trim().length < 5} loading={loading} onClick={() => void decide("deferred")}>Manter somente local</Button>
      <Button danger disabled={reason.trim().length < 5} loading={loading} onClick={() => void decide("rejected")}>Rejeitar</Button>
      <Button type="primary" disabled={reason.trim().length < 5} loading={loading} onClick={() => void decide("approved")}>{target ? "Associar à área global" : "Aprovar na base global"}</Button>
    </Space> : undefined} okText="Salvar área" cancelText="Cancelar" confirmLoading={loading} onOk={async () => {
      try { const value = await form.validateFields(); setLoading(true); await professionalAreaService.save(global ? null : organizationId, { ...value, id: editor?.id, version: editor?.version }); setEditor(null); message.success("Área salva."); await load(); }
      catch (e) { if (e instanceof Error) setError(e.message); } finally { setLoading(false); }
    }}>
      {review ? <Form layout="vertical"><Form.Item label="Publicar como"><Select aria-label="Destino da contribuição" allowClear placeholder="Criar uma nova área global" value={target ?? undefined} onChange={v => setTarget(v ?? null)} showSearch optionFilterProp="label" options={areas.filter(a => a.scope === "global" && a.active).map(a => ({ value:a.id,label:a.label }))} /></Form.Item></Form> : null}
      <Form form={form} layout="vertical" disabled={Boolean(review && target)}>
        <Form.Item name="label" label="Nome da área" rules={[{required:true,min:2,max:120}]}><Input maxLength={120} /></Form.Item>
        <Form.Item name="description" label="Descrição" extra="Explique quais atuações pertencem a esta área."><Input.TextArea maxLength={2000} autoSize={{minRows:2,maxRows:5}} /></Form.Item>
        <Form.Item name="aliases" label="Termos associados" extra="Exemplo: RH, HRBP, Talent Acquisition."><Select mode="tags" tokenSeparators={[";",","]} open={false} /></Form.Item>
        {!review ? <Form.Item name="active" label="Área ativa" valuePropName="checked"><Switch /></Form.Item> : null}
      </Form>
      {review ? <Form layout="vertical"><Form.Item label="Motivo da decisão"><Input.TextArea aria-label="Motivo da decisão de área" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} /></Form.Item></Form> : null}
    </Modal>
  </Space>;
}
