import { OwnerLifecycleControls } from "./OwnerLifecycleControls";
import { useEffect, useRef, useState } from "react";
import { ApartmentOutlined, ArrowDownOutlined, ArrowUpOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from "antd";
import { organizationAdministrationService as service } from "../infrastructure/supabase/organizationAdministrationService";
import { companyStatusLabels, organizationPlans, planCompanyLimitValid, planLabels, type ManagedCompany, type ManagedCompanyUser, type ManagedGroup, type OrganizationAdminWorkspace, type OrganizationPlan } from "../domain/organizationAdministration";
import { describePlatformAccessProfile, type PlatformAccessProfile } from "../shared/platformUsers";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { PrismaCard } from "../ui/PrismaCard";
import { useLoadingFeedback } from "../ui/PrismaLoadingFeedback";
import { confirmPrismaNavigation, useUnsavedChanges } from "../ui/PrismaNavigation";
import "./OrganizationsPage.css";
import { organizationTimestamp, sortOrganizations, type OrganizationSort, type OrganizationSortDirection } from "../domain/organizationSorting";
import { ownerOnboardingPath } from "../domain/ownerOnboarding";
type Editor = { kind: "group" | "company" | "new-company" | "new-group"; group?: ManagedGroup; company?: ManagedCompany };
export function OrganizationsPage({ profile, onNavigate, onChanged }: { profile: PlatformAccessProfile; onNavigate: (path: string) => void; onChanged: () => Promise<void> }) {
  const [workspace, setWorkspace] = useState<OrganizationAdminWorkspace | null>(null);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState<OrganizationSort>("name");
  const [direction, setDirection] = useState<OrganizationSortDirection>("asc");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dirty, setDirty] = useState(false);
  const markSaved = useUnsavedChanges(dirty);
  const [links, setLinks] = useState<{ group: ManagedGroup; company: ManagedCompany; users: ManagedCompanyUser[] } | null>(null);
  const [form] = Form.useForm();
  const scope = useRef(0);
  const lock = useRef(false);
  useLoadingFeedback({ "Carregando empresas…": loading, "Salvando administração…": busy });
  async function load() {
    const request = ++scope.current;setLoading(true);
    try { const data = await service.workspace();if (request === scope.current) { setWorkspace(data);setError(null);return data; } }
    catch (reason) { if (request === scope.current) setError(reason instanceof Error ? reason.message : "Não foi possível consultar as empresas."); }
    finally { if (request === scope.current) setLoading(false); }
    return null;
  }
  useEffect(() => { void load();return () => { scope.current++; }; }, []);
  function open(next: Editor) {
    setError(null);setDirty(false);markSaved();setEditor(next);form.resetFields();
    form.setFieldsValue(next.kind === "group" ? { name: next.group?.name, status: next.group?.configuredStatus ?? next.group?.status, plan: next.group?.plan, companyLimit: next.group?.companyLimit } : next.kind === "company" ? { name: next.company?.name, status: next.company?.status } : {});
  }
  async function closeEditor() {
    if (busy || !await confirmPrismaNavigation()) return;
    setDirty(false);markSaved();setEditor(null);
  }
  async function mutate(action: Parameters<typeof service.run>[0], group: ManagedGroup | undefined, company: ManagedCompany | undefined, input: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;setBusy(true);setError(null);const request = scope.current;
    try {
      await service.run(action, group?.id ?? null, company?.id ?? null, { ...input, ...(group ? { revision: group.revision } : {}) });
      if (request !== scope.current) return;
      setDirty(false);markSaved();setEditor(null);setLinks(null);setNotice("Alteração registrada.");await load();await onChanged();
    } catch (reason) { if (request === scope.current) setError(reason instanceof Error ? reason.message : "Não foi possível salvar. Os dados confirmados foram preservados."); }
    finally { lock.current = false;setBusy(false); }
  }
  async function openLinks(group: ManagedGroup, company: ManagedCompany) {
    setError(null);setLoading(true);const request = scope.current;
    try { const users = await service.links(group.id, company.id, group.revision);if (request === scope.current) setLinks({ group, company, users }); }
    catch (reason) { if (request === scope.current) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os vínculos."); }
    finally { if (request === scope.current) setLoading(false); }
  }
  const isSuper = workspace?.isSuper ?? profile === "super_admin";
  const canManageGroup = isSuper || profile === "owner";
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const groups = sortOrganizations(workspace?.groups.filter(g => !query || g.name.toLocaleLowerCase("pt-BR").includes(query) || g.companies.some(c => c.name.toLocaleLowerCase("pt-BR").includes(query))) ?? [], sort, direction);
  const expanded = expandedGroup === null ? null : groups.find(g => g.id === expandedGroup)?.id ?? workspace?.groups.find(g => groups.some(visible => visible.id === g.id))?.id;
  function sortDate(record: ManagedGroup | ManagedCompany) {
    if (sort === "name") return null;
    const timestamp = organizationTimestamp(record[sort]);
    return <span className="prisma-organization-sort-date">{sort === "createdAt" ? "Criação" : "Atualização"}: {timestamp === null ? "Data não disponível" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(timestamp)}</span>;
  }
  return <PrismaPage>
    <PrismaPageHeader icon={<ApartmentOutlined />} title="Grupos e empresas" description="Administre empresas e acessos dentro da sua responsabilidade." actions={<Space wrap><Button disabled={loading || busy} onClick={() => void load()}>Atualizar</Button><Button onClick={() => onNavigate("/users")}>Usuários</Button>{isSuper ? <Button type="primary" icon={<PlusOutlined />} onClick={() => open({ kind: "new-group" })}>Novo grupo</Button> : null}</Space>} />
    {error ? <Alert type="error" showIcon title={error} action={<Button disabled={loading || busy} onClick={() => void load()}>Atualizar consulta</Button>} /> : null}
    {notice ? <Alert type="success" showIcon title={notice} closable onClose={() => setNotice(null)} /> : null}
    <PrismaCard className="prisma-organization-toolbar"><div className="prisma-organization-toolbar-fields"><Input.Search aria-label="Buscar grupos e empresas" placeholder="Buscar grupo ou empresa" value={search} onChange={e => { setSearch(e.target.value);setExpandedGroup(undefined); }} allowClear /><div className="prisma-organization-sort"><label htmlFor="organization-sort">Ordenar por</label><select id="organization-sort" aria-label="Ordenar por" value={sort} onChange={event => setSort(event.target.value as OrganizationSort)}><option value="name">Nome</option><option value="createdAt">Data de criação</option><option value="updatedAt">Data de atualização</option></select><Button aria-label={direction === "asc" ? "Ordem crescente" : "Ordem decrescente"} title={sort === "name" ? direction === "asc" ? "A–Z" : "Z–A" : direction === "asc" ? "Mais antigas primeiro" : "Mais recentes primeiro"} icon={direction === "asc" ? <ArrowUpOutlined /> : <ArrowDownOutlined />} onClick={() => setDirection(direction === "asc" ? "desc" : "asc")} /></div></div></PrismaCard>
    {!loading && groups.length === 0 ? <Empty description="Nenhuma empresa disponível neste escopo." /> : null}
    <div className="prisma-organization-groups">
    {groups.map(group => <details className="prisma-organization-group" key={group.id} open={expanded === group.id}>
      <summary aria-expanded={expanded === group.id} onClick={event => { event.preventDefault();setExpandedGroup(expanded === group.id ? null : group.id); }}>
        <span className="prisma-organization-summary-label"><DownOutlined className="prisma-organization-chevron" aria-hidden="true" /><span className="prisma-organization-summary-main"><strong>{group.name}</strong><span>{planLabels[group.plan]} · {group.companyCount}/{group.companyLimit} empresas · {group.activeCount} ativas</span>{sortDate(group)}</span></span>
        <Tag color={group.status === "active" ? "green" : "default"}>{group.status === "active" ? "Ativo" : group.status === "inactive" ? "Inativo" : "Em preparação"}</Tag>
      </summary>
      <div className="prisma-organization-body">
      <div className="prisma-organization-actions">{canManageGroup ? <Button disabled={busy} onClick={() => open({ kind: "group", group })}>Administrar grupo</Button> : null}<Button disabled={busy || group.status !== "active" || group.owner?.status !== "active" || group.companyCount >= group.companyLimit} icon={<PlusOutlined />} onClick={() => open({ kind: "new-company", group })}>Nova empresa</Button></div>
      <div className="prisma-organization-metadata"><span>Owner: <strong>{group.owner?.name ?? "Não definido"}</strong>{group.owner?.username ? ` (${group.owner.username})` : ""}{group.owner && group.owner.status !== "active" ? group.owner.status === "inactive" ? " · inativo" : group.owner.status === "blocked" ? " · bloqueado" : " · primeiro acesso pendente" : ""}</span><span>Plano: <strong>{planLabels[group.plan]}</strong></span><span>Empresas cadastradas: <strong>{group.companyCount} de {group.companyLimit}</strong> · {group.activeCount} ativas</span></div>
      {group.status === "draft" ? <div className="prisma-organization-next"><div><strong>{!group.owner ? "Próximo passo: cadastrar Owner." : group.owner.status !== "active" ? "Próximo passo: ativar o Owner." : "Grupo em preparação"}</strong><p>Com o Owner ativo, o grupo e a primeira empresa em preparação serão ativados automaticamente. Se houver primeiro acesso pendente, a ativação aguardará sua conclusão.</p></div>{isSuper && !group.owner ? <Button type="primary" onClick={() => onNavigate(ownerOnboardingPath(group.id))}>Cadastrar Owner</Button> : null}</div> : null}
      {group.ownerSuspended ? <Alert type="warning" showIcon title={group.status === "draft" ? "Aguardando Owner ativo" : "Operação suspensa por ausência de Owner ativo"} description={group.ownerSuspensionReason ?? "Restabeleça um Owner ativo para liberar a operação, respeitando as demais restrições do grupo e das empresas."} /> : null}
      {isSuper && group.owner?.id ? <OwnerLifecycleControls group={group} onChanged={async () => {setNotice("Alteração do Owner registrada.");await load();await onChanged();}} /> : null}
      {group.companyCount >= group.companyLimit ? <p className="prisma-organization-capacity">Limite configurado atingido. Consulte o responsável pelo plano para incluir outra empresa.</p> : null}
      <Table<ManagedCompany> className="prisma-organization-companies" rowKey="id" size="small" pagination={false} dataSource={sortOrganizations(group.companies, sort, direction)} columns={[
        { title: "Empresa", dataIndex: "name", width: "34%", render: (name, c) => <div><Space wrap><strong>{name}</strong>{c.id === group.primaryOrganizationId ? <Tag>Principal</Tag> : null}</Space>{sortDate(c)}</div> },
        { title: "Situação", dataIndex: "status", width: "21%", render: (status: ManagedCompany["status"]) => <Tag color={status === "active" ? "green" : "default"}>{companyStatusLabels[status]}</Tag> },
        { title: "Usuários ativos", dataIndex: "users", width: "17%", render: count => <><span className="prisma-organization-mobile-label">Usuários ativos: </span>{count}</> },
        { title: "Ações", width: "28%", render: (_, company) => <Space wrap><Button disabled={busy} onClick={() => open({ kind: "company", group, company })}>Editar</Button><Button disabled={busy} onClick={() => void openLinks(group, company)}>Acessos</Button></Space> },
      ]} />
      </div>
    </details>)}
    </div>
    <Typography.Paragraph type="secondary">As empresas mantêm dados e Tokens próprios. O plano não concede acesso a outras empresas. Valores de assinatura e distribuição adicional de recursos estão em definição.</Typography.Paragraph>
    <Modal open={editor !== null} title={editor?.kind === "new-group" ? "Novo grupo" : editor?.kind === "new-company" ? "Nova empresa" : editor?.kind === "group" ? "Administrar grupo" : "Editar empresa"} destroyOnHidden onCancel={() => void closeEditor()} footer={null} closable={!busy} maskClosable={!busy}>
      {error ? <Alert type="error" title={error} action={<Button disabled={busy} onClick={() => form.submit()}>Tentar salvar novamente</Button>} /> : null}
      <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)} onFinish={input => editor && void mutate(editor.kind === "new-group" ? "create_group" : editor.kind === "new-company" ? "create_company" : editor.kind === "group" ? "configure_group" : "configure_company", editor.group, editor.company, input)}>
        <Form.Item name="name" label={editor?.kind === "group" || editor?.kind === "new-group" ? "Nome do grupo" : "Nome da empresa"} rules={[{ required: true, whitespace: true, min: 2, max: 120, message: "Informe de 2 a 120 caracteres." }]}><Input autoComplete="off" /></Form.Item>
        {editor?.kind === "new-group" ? <Form.Item name="companyName" label="Primeira empresa" rules={[{ required: true, whitespace: true, min: 2, max: 120 }]}><Input /></Form.Item> : null}
        {editor?.kind === "group" || editor?.kind === "company" ? <Form.Item name="status" label="Situação" rules={[{ required: true }]}><Select options={Object.entries(companyStatusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item> : null}
        {editor?.kind === "group" ? <><Form.Item name="plan" label="Plano" rules={[{ required: true }]}><Select disabled={!isSuper} options={organizationPlans.map(value => ({ value, label: planLabels[value] }))} onChange={value => { if (value === "essential" || value === "essential_plus") form.setFieldValue("companyLimit", 1); }} /></Form.Item><Form.Item name="companyLimit" label="Limite de empresas do grupo" dependencies={["plan"]} rules={[{ required: true }, { validator: async (_, value) => { if (!planCompanyLimitValid(form.getFieldValue("plan") as OrganizationPlan, value)) throw Error("Essential/Plus:1; Professional:até5; Enterprise:quantidade contratada."); } }]}><InputNumber min={1} max={100000} precision={0} disabled={!isSuper} style={{ width: "100%" }} /></Form.Item><Typography.Paragraph type="secondary">Alterar a configuração não cobra nem confirma contratação. Tokens e histórico permanecem por empresa.</Typography.Paragraph></> : null}
        <Space><Button disabled={busy} onClick={() => void closeEditor()}>Cancelar</Button><Button type="primary" htmlType="submit" loading={busy}>Salvar</Button></Space>
      </Form>
    </Modal>
    <Drawer open={links !== null} title={links ? `Acessos · ${links.company.name}` : "Acessos"} width={620} onClose={() => !busy && setLinks(null)} destroyOnHidden>
      {error ? <Alert type="error" title={error} action={<Button disabled={busy} onClick={() => links && void openLinks(links.group, links.company)}>Atualizar vínculos</Button>} /> : null}
      <Typography.Paragraph>Somente usuários ativos deste grupo. Alterações valem para esta empresa. Para novos usuários ou mudança de perfil, use o cadastro de Usuários.</Typography.Paragraph>
      <Button onClick={() => onNavigate("/users/new")}>Cadastrar usuário</Button>
      <Table<ManagedCompanyUser> rowKey="id" size="small" scroll={{ x: 510 }} dataSource={links?.users ?? []} columns={[
        { title: "Usuário", dataIndex: "name" }, { title: "Perfil", dataIndex: "profile", render: p => describePlatformAccessProfile(p) },
        { title: "Vínculo", render: (_, user) => <Space direction="vertical"><Tag>{user.linked ? user.isDefault ? "Empresa padrão" : "Vinculado" : "Sem vínculo"}</Tag><Button disabled={busy || !user.canEdit} onClick={() => links && Modal.confirm({ title: user.linked ? "Remover acesso desta empresa?" : "Vincular a esta empresa?", content: user.name, okText: "Confirmar", cancelText: "Cancelar", onOk: () => mutate("save_link", links.group, links.company, { userId: user.id, linked: !user.linked }) })}>{user.linked ? "Remover vínculo" : "Vincular"}</Button>{user.linked && !user.isDefault ? <Button disabled={busy || !user.canEdit} onClick={() => links && void mutate("save_link", links.group, links.company, { userId: user.id, linked: true, isDefault: true })}>Definir como padrão</Button> : null}</Space> },
      ]} />
    </Drawer>
  </PrismaPage>;
}
