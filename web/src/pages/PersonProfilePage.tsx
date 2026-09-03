import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, Button, Descriptions, Empty, Skeleton, Space, Tag, Timeline, Typography } from "antd";
import type { PersonProfileView, PrismaDataRepository } from "../domain/prismaData";
import { describeLifecycle } from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PersonProfilePageProps {
  activeMembership: OrganizationMembership;
  personId: string;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

export function PersonProfilePage({ activeMembership, personId, repository, onNavigate }: PersonProfilePageProps) {
  const [view, setView] = useState<PersonProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setView(null);
    setError(null);
    setLoading(true);
    void repository.loadPersonProfile(activeMembership.organizationId, personId, activeMembership.role)
      .then((result) => {
        if (current) setView(result);
      })
      .catch(() => {
        if (current) setError("O perfil não pôde ser consultado. Verifique seu acesso e tente novamente.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [activeMembership.organizationId, activeMembership.role, personId, repository]);

  return (
    <PrismaPage>
      <PrismaPageHeader
        title={view?.person.fullName ?? "Perfil profissional"}
        description={view ? describeLifecycle(view.person.lifecycle) : "Conhecimento estruturado, evidência e proveniência."}
        actions={<Button icon={<ArrowLeftOutlined />} onClick={() => onNavigate("/profiles")}>Voltar para Pessoas</Button>}
      />
      {loading ? <PrismaCard><Skeleton active paragraph={{ rows: 8 }} /></PrismaCard> : null}
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {!loading && !error && !view ? (
        <PrismaCard><Empty description="Pessoa inexistente ou indisponível para esta organização." image={Empty.PRESENTED_IMAGE_SIMPLE} /></PrismaCard>
      ) : null}
      {view ? <ProfileContent membership={activeMembership} view={view} /> : null}
    </PrismaPage>
  );
}

function ProfileContent({ membership, view }: { membership: OrganizationMembership; view: PersonProfileView }) {
  const profile = view.profile;
  return (
    <div className="prisma-profile-grid">
      <PrismaCard className="prisma-profile-overview" title="Identidade profissional">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Nome">{view.person.fullName}</Descriptions.Item>
          <Descriptions.Item label="Vínculo">{describeLifecycle(view.person.lifecycle)}</Descriptions.Item>
          <Descriptions.Item label="Organização">{membership.organizationName}</Descriptions.Item>
          <Descriptions.Item label="Perfil">{profile ? "Estruturado" : "Não identificado"}</Descriptions.Item>
        </Descriptions>
      </PrismaCard>

      <PrismaCard className="prisma-profile-private" title="Contato privado">
        {membership.role === "member" ? (
          <Alert icon={<LockOutlined />} message="Dados privados protegidos para este papel." showIcon type="info" />
        ) : view.privateContact ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="E-mail">{view.privateContact.email ?? "Não identificado"}</Descriptions.Item>
            <Descriptions.Item label="Telefone">{view.privateContact.phone ?? "Não identificado"}</Descriptions.Item>
            <Descriptions.Item label="Localização">{view.privateContact.location ?? "Não identificada"}</Descriptions.Item>
          </Descriptions>
        ) : <Typography.Text type="secondary">Nenhum contato privado persistido.</Typography.Text>}
      </PrismaCard>

      {!profile ? (
        <PrismaCard className="prisma-profile-wide">
          <Empty description="Não existe perfil estruturado válido para esta pessoa." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </PrismaCard>
      ) : (
        <>
          <ProfileSection title="Experiências">
            {profile.experiences.length ? <Timeline items={profile.experiences.map((experience) => ({
              children: <div><strong>{experience.role}</strong><p>{experience.organization} · {formatPeriod(experience.startDate, experience.endDate)}</p><span>{experience.description}</span></div>,
            }))} /> : <MissingBlock />}
          </ProfileSection>
          <ProfileSection title="Formação e certificações">
            <FactList values={[
              ...profile.education.map((item) => `${item.course} · ${item.institution}${item.status ? ` · ${item.status}` : ""}`),
              ...profile.certifications,
            ]} />
          </ProfileSection>
          <ProfileSection title="Idiomas e tecnologias">
            <TagList values={[
              ...profile.languages.map((item) => item.proficiency ? `${item.language} · ${item.proficiency}` : item.language),
              ...profile.toolsAndTechnologies,
            ]} />
          </ProfileSection>
          <ProfileSection title="Competências e contextos">
            {view.normalizedKnowledge.length ? <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {view.normalizedKnowledge.map((item) => <article key={item.observationId}>
                <Space wrap>
                  <Tag color={item.state === "resolved" ? "green" : item.state === "ambiguous" ? "gold" : "default"}>{item.state === "resolved" ? item.canonicalLabel : item.state === "ambiguous" ? "Ambíguo" : "Não resolvido"}</Tag>
                  <Typography.Text>Fonte no currículo: <strong>{item.originalTerm}</strong></Typography.Text>
                </Space>
                {item.sourceName ? <Typography.Text type="secondary"><small>{item.sourceName} {item.sourceVersion}{item.externalId ? ` · ${item.externalId}` : ""}</small></Typography.Text> : null}
              </article>)}
            </Space> : <TagList values={view.competencies.map((item) => `${item.name} · ${item.classification === "explicit" ? "explícita" : "inferida"}`)} />}
            {profile.professionalContexts.length ? <div style={{ marginTop: 12 }}><TagList values={profile.professionalContexts} /></div> : null}
          </ProfileSection>
          {profile.customSections.map((section) => (
            <ProfileSection key={section.id} title={section.name}>
              {section.format === "list"
                ? <FactList values={section.items.map((item) => item.value)} />
                : <Typography.Paragraph>{section.items[0]?.value}</Typography.Paragraph>}
            </ProfileSection>
          ))}
        </>
      )}

      <PrismaCard className="prisma-profile-wide" title="Evidências e proveniência">
        {view.evidence.length ? (
          <div className="prisma-evidence-list">
            {view.evidence.map((item) => (
              <article key={item.id}>
                <div><Tag>{item.kind}</Tag><small>Bloco {item.sourceBlock}{item.sourcePage ? ` · página ${item.sourcePage}` : ""}</small></div>
                <strong>{item.fact}</strong>
                <blockquote>{item.quotedText}</blockquote>
                <small>Extração {item.extractionVersion}</small>
              </article>
            ))}
          </div>
        ) : <MissingBlock />}
      </PrismaCard>

      <PrismaCard className="prisma-profile-wide" title="Inferências versionadas">
        {view.inferences.length ? (
          <div className="prisma-inference-list">
            {view.inferences.map((item) => (
              <article key={item.id}><Tag color="gold">{item.type}</Tag><strong>{item.value}</strong><p>{item.rationale}</p><small>Versão {item.inferenceVersion}</small></article>
            ))}
          </div>
        ) : <Typography.Text type="secondary">Nenhuma inferência persistida. Ausência não representa avaliação negativa.</Typography.Text>}
      </PrismaCard>

      {profile && (profile.uncertainties.length > 0 || profile.notIdentified.length > 0) ? (
        <PrismaCard className="prisma-profile-wide" title="Pendências da extração">
          <Space direction="vertical">
            <Typography.Text type="secondary">Registros diagnósticos da importação. Não constituem fatos do perfil nem avaliação negativa.</Typography.Text>
            <FactList values={profile.uncertainties.map((item) => `Pendente de interpretação: ${item}`)} />
            <TagList values={profile.notIdentified.map((item) => `Informação não localizada: ${item}`)} />
          </Space>
        </PrismaCard>
      ) : null}
    </div>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <PrismaCard className="prisma-profile-section" title={title}>{children}</PrismaCard>;
}

function FactList({ values }: { values: string[] }) {
  return values.length ? <ul className="prisma-fact-list">{values.map((value) => <li key={value}>{value}</li>)}</ul> : <MissingBlock />;
}

function TagList({ values }: { values: string[] }) {
  return values.length ? <Space size={[6, 8]} wrap>{values.map((value) => <Tag color="blue" key={value}>{value}</Tag>)}</Space> : <MissingBlock />;
}

function MissingBlock() {
  return <Typography.Text type="secondary">Nenhuma informação identificada neste bloco.</Typography.Text>;
}

function formatPeriod(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "Período não identificado";
  return `${startDate ?? "Início não identificado"} a ${endDate ?? "atual"}`;
}
