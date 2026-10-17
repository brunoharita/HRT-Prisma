import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Space, Typography } from "antd";
import { organizationAdministrationService as service } from "../infrastructure/supabase/organizationAdministrationService";
import { type ManagedGroup, type OwnerCandidate, type OwnerLifecycleAction } from "../domain/organizationAdministration";
import { confirmPrismaNavigation, useUnsavedChanges } from "../ui/PrismaNavigation";

const titles: Record<OwnerLifecycleAction, string> = {replace: "Substituir Owner", deactivate: "Inativar Owner sem substituto", reactivate: "Reativar Owner"};
export function OwnerLifecycleControls({group, onChanged}: {group: ManagedGroup; onChanged: () => Promise<void>}) {
  const [action, setAction] = useState<OwnerLifecycleAction | null>(null);
  const [candidates, setCandidates] = useState<OwnerCandidate[]>([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [dirty, setDirty] = useState(false);
  const lock = useRef(false), request = useRef(0);
  const saved = useUnsavedChanges(dirty);
  const [form] = Form.useForm();
  async function open(next: OwnerLifecycleAction) {
    const token = ++request.current;setAction(next);setError(null);setDirty(false);saved();form.resetFields();setCandidates([]);
    if (next !== "replace") return;
    setLoading(true);
    try { const result = await service.ownerCandidates(group);if (token === request.current) setCandidates(result); }
    catch (reason) { if (token === request.current) setError(reason instanceof Error ? reason.message : "Não foi possível consultar os usuários elegíveis."); }
    finally { if (token === request.current) setLoading(false); }
  }
  async function close() {
    if (busy || !await confirmPrismaNavigation()) return;
    request.current++;setLoading(false);setDirty(false);saved();setAction(null);
  }
  async function submit(values: {reason: string; targetId?: string}) {
    if (!action || lock.current) return;
    lock.current = true;setBusy(true);setError(null);
    try {
      await service.ownerAction(action, group, values.reason.trim(), values.targetId);
      setDirty(false);saved();setAction(null);await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível alterar o Owner. Atualize a consulta."); }
    finally { lock.current = false;setBusy(false); }
  }
  if (!group.owner?.id) return null;
  return <>
    <Space wrap className="prisma-owner-actions">
      <Button disabled={busy} onClick={() => void open("replace")}>Substituir Owner</Button>
      {group.owner.status === "active" || group.owner.status === "pending_first_access" ? <Button danger disabled={busy} onClick={() => void open("deactivate")}>Inativar Owner</Button> : group.owner.status === "inactive" ? <Button disabled={busy} onClick={() => void open("reactivate")}>Reativar Owner</Button> : null}
    </Space>
    <Modal className="prisma-owner-modal" open={action !== null} title={action ? titles[action] : "Gestão de Owner"} footer={null} destroyOnHidden onCancel={() => void close()} closable={!busy} maskClosable={!busy}>
      <Typography.Paragraph>Grupo: <strong>{group.name}</strong><br />Owner atual: <strong>{group.owner.name}</strong> ({group.owner.username})</Typography.Paragraph>
      {action === "deactivate" ? <Alert type="warning" showIcon title="O grupo ficará sem Owner ativo" description="O Owner perderá o acesso, inclusive em sessões abertas. A operação dos Recruiters e usuários comuns deste grupo será suspensa. Empresas, vínculos, dados, saldos e histórico serão preservados. O Super Admin continuará com acesso." /> : action === "replace" ? <Typography.Paragraph>O usuário escolhido assumirá o perfil Owner e todas as empresas deste grupo. O Owner anterior ficará inativo; um bloqueio de segurança existente será preservado. O grupo continuará operando, respeitando suas demais restrições. Cada usuário manterá sua identidade, senha e histórico.</Typography.Paragraph> : <Typography.Paragraph>A reativação removerá somente a restrição por ausência de Owner ativo. Grupos ou empresas inativados por outros motivos continuarão inativos.{group.owner.status === "inactive" ? " Se o primeiro acesso estava pendente, ele continuará obrigatório antes da liberação do grupo." : ""}</Typography.Paragraph>}
      {error ? <Alert type="error" showIcon title={error} action={<Button disabled={busy} onClick={async () => {request.current++;setDirty(false);saved();setAction(null);await onChanged();}}>Atualizar grupo</Button>} /> : null}
      <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)} onFinish={values => void submit(values)} style={{marginTop: 16}}>
        {action === "replace" ? <><Form.Item name="targetId" label="Novo Owner" rules={[{required: true, message: "Escolha um usuário ativo deste grupo."}]}><Select loading={loading} disabled={busy || loading} placeholder="Selecione um usuário" options={candidates.map(c => ({value: c.id, label: `${c.name} (${c.username})`}))} /></Form.Item>{!loading && !error && candidates.length === 0 ? <Typography.Paragraph>Nenhum usuário ativo elegível neste grupo. Cadastre ou ative um usuário antes de substituí-lo.</Typography.Paragraph> : null}</> : null}
        <Form.Item name="reason" label="Motivo" rules={[{required: true, validator: async (_, value) => {if (typeof value !== "string" || value.trim().length < 5 || value.trim().length > 500) throw Error("Informe de 5 a 500 caracteres.");}}]}><Input.TextArea rows={3} maxLength={500} disabled={busy} /></Form.Item>
        <Space wrap><Button disabled={busy} onClick={() => void close()}>Cancelar</Button><Button type="primary" danger={action === "deactivate"} htmlType="submit" loading={busy} disabled={loading || (action === "replace" && candidates.length === 0)}>{action === "deactivate" ? "Confirmar inativação sem substituto" : action ? titles[action] : "Confirmar"}</Button></Space>
      </Form>
    </Modal>
  </>;
}
