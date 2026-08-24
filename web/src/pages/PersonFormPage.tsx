import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Select, Skeleton, Space, Typography } from "antd";
import type { PersonEditorValue, PersonWorkspaceSummary } from "../domain/personIngestion";
import { personIngestionService } from "../infrastructure/supabase/personIngestionService";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";
import { ProfileStateTag } from "./PeoplePage";

interface PersonFormPageProps {
  activeMembership: OrganizationMembership;
  personId?: string;
  onNavigate: (path: string) => void;
}

const COUNTRY_OPTIONS = [
  { value: "BR|Brasil|+55", label: "+55 Brasil" },
  { value: "US|Estados Unidos|+1", label: "+1 Estados Unidos" },
  { value: "PT|Portugal|+351", label: "+351 Portugal" },
  { value: "GB|Reino Unido|+44", label: "+44 Reino Unido" },
  { value: "JP|Japão|+81", label: "+81 Japão" },
];

const EMPTY_PERSON: PersonEditorValue = {
  fullName: "",
  email: "",
  phoneCountryIso2: "BR",
  phoneCountryLabel: "Brasil",
  phoneCountryCode: "+55",
  phoneNationalNumber: "",
  phoneE164: "",
  birthDate: null,
  city: "",
  countryCode: "BR",
  notes: "",
};

export function PersonFormPage({ activeMembership, personId, onNavigate }: PersonFormPageProps) {
  const [form] = Form.useForm<PersonEditorValue & { phoneCountry: string }>();
  const [person, setPerson] = useState<PersonWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(personId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) {
      form.setFieldsValue({ ...EMPTY_PERSON, phoneCountry: "BR|Brasil|+55" });
      return;
    }
    let current = true;
    setLoading(true);
    void personIngestionService.loadWorkspace(activeMembership.organizationId, personId)
      .then((workspace) => {
        if (!current) return;
        if (!workspace) throw new Error("Pessoa não encontrada nesta empresa.");
        setPerson(workspace.person);
        const value = workspace.person.privateData;
        form.setFieldsValue({ ...value, phoneCountry: `${value.phoneCountryIso2}|${value.phoneCountryLabel}|${value.phoneCountryCode}` });
      })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a Pessoa."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeMembership.organizationId, form, personId]);

  async function handleSave(values: PersonEditorValue & { phoneCountry: string }) {
    setSaving(true);
    setError(null);
    try {
      const [phoneCountryIso2, phoneCountryLabel, phoneCountryCode] = values.phoneCountry.split("|");
      const digits = values.phoneNationalNumber.replace(/\D/g, "");
      const normalizedCountryCode = phoneCountryCode ?? "+55";
      const savedId = await personIngestionService.savePerson(activeMembership.organizationId, personId ?? null, {
        ...values,
        phoneCountryIso2: phoneCountryIso2 ?? "BR",
        phoneCountryLabel: phoneCountryLabel ?? "Brasil",
        phoneCountryCode: normalizedCountryCode,
        phoneNationalNumber: values.phoneNationalNumber.trim(),
        phoneE164: digits ? `${normalizedCountryCode}${digits}` : "",
      });
      onNavigate(`/profiles/${savedId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a Pessoa.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PrismaPage><Skeleton active paragraph={{ rows: 10 }} /></PrismaPage>;

  return (
    <PrismaPage className="prisma-m2b-page">
      <PrismaPageHeader
        title={personId ? "Editar Pessoa" : "Nova Pessoa"}
        description="Informe os dados básicos da Pessoa. Este cadastro não cria usuário, senha ou acesso ao Prisma."
        actions={<Button icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()} type="primary">Salvar</Button>}
      />
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <div className="prisma-person-form-layout">
        <PrismaCard className="prisma-person-form-card">
          <Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")} type="text">Voltar para Pessoas</Button>
          <Typography.Title level={4}>Dados básicos</Typography.Title>
          <Form form={form} layout="vertical" onFinish={(values) => void handleSave(values)} requiredMark="optional">
            <Form.Item label="Nome completo" name="fullName" rules={[{ required: true, whitespace: true, message: "Informe o nome completo." }]}>
              <Input autoComplete="name" placeholder="Nome completo da Pessoa" />
            </Form.Item>
            <Form.Item label="E-mail" name="email" rules={[{ type: "email", message: "Informe um e-mail válido." }]}>
              <Input autoComplete="email" placeholder="pessoa@exemplo.com" />
            </Form.Item>
            <div className="prisma-form-grid-two">
              <Form.Item label="Celular" name="phoneCountry">
                <Select options={COUNTRY_OPTIONS} showSearch optionFilterProp="label" />
              </Form.Item>
              <Form.Item label="Número" name="phoneNationalNumber">
                <Input autoComplete="tel-national" placeholder="(11) 99999-9999" />
              </Form.Item>
            </div>
            <div className="prisma-form-grid-two">
              <Form.Item label="Data de nascimento" name="birthDate">
                <Input type="date" />
              </Form.Item>
              <Form.Item label="Cidade" name="city"><Input placeholder="Cidade" /></Form.Item>
            </div>
            <Form.Item label="País" name="countryCode">
              <Select showSearch options={[
                { value: "BR", label: "Brasil" },
                { value: "US", label: "Estados Unidos" },
                { value: "PT", label: "Portugal" },
                { value: "GB", label: "Reino Unido" },
                { value: "JP", label: "Japão" },
              ]} />
            </Form.Item>
            <Form.Item label="Observações" name="notes" extra="Observações não são promovidas automaticamente a fatos ou evidências.">
              <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="Informações adicionais opcionais" />
            </Form.Item>
          </Form>
        </PrismaCard>
        <PrismaCard className="prisma-person-summary-card">
          <Typography.Title level={4}>Resumo</Typography.Title>
          <SummaryRow label="Origem" value={describeSource(person?.latestSourceType ?? null)} />
          <SummaryRow label="Última atualização" value={person ? formatDate(person.updatedAt) : "A definir"} />
          <SummaryRow label="Status" value={<ProfileStateTag state={person?.profileState ?? "not_generated"} />} />
          <SummaryRow label="Perfil Prisma" value={describeProfile(person?.profileState ?? "not_generated")} />
          <Alert
            message="Usuário e Pessoa são registros distintos"
            description="Salvar esta Pessoa não cria login, username, senha, membership ou permissão."
            showIcon
            type="info"
          />
        </PrismaCard>
      </div>
      <Space className="prisma-page-bottom-actions">
        <Button onClick={() => onNavigate("/profiles")}>Cancelar</Button>
        <Button icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()} type="primary">Salvar Pessoa</Button>
      </Space>
    </PrismaPage>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="prisma-summary-row"><span>{label}</span><strong>{value}</strong></div>;
}

function describeSource(source: PersonWorkspaceSummary["latestSourceType"]): string {
  if (source === "manual_text") return "Texto manual";
  if (source === "resume_pdf") return "Currículo PDF";
  return "A definir";
}

function describeProfile(state: PersonWorkspaceSummary["profileState"]): string {
  if (state === "generated") return "Gerado";
  if (state === "building") return "Em construção";
  if (state === "requires_attention") return "Requer atenção";
  if (state === "processing_failed") return "Falha de processamento";
  return "Não gerado";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
