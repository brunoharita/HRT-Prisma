import { BankOutlined, BookOutlined, BulbOutlined, SafetyCertificateOutlined, TrophyOutlined } from "@ant-design/icons";
import { Empty, Space, Tag, Typography } from "antd";
import type { StructuredDraft } from "../../domain/personIngestion";

export function StructuredProfileView({ profile, compact = false }: { profile: StructuredDraft; compact?: boolean }) {
  const hasContent = Boolean(profile.professionalTitle || profile.summary || profile.professionalObjective
    || profile.experiences.length || profile.education.length || profile.competencies.length
    || profile.certifications.length || profile.languages.length || profile.keyResults.length || profile.customSections.length);
  if (!hasContent) return <Empty description="Esta versão não possui conteúdo profissional publicado." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <div className={`prisma-structured-profile${compact ? " is-compact" : ""}`}>
      <section className="prisma-profile-intro">
        {profile.professionalTitle ? <Typography.Title level={4}>{profile.professionalTitle}</Typography.Title> : null}
        {profile.areasOfExpertise.length ? <Space size={[6, 6]} wrap>{profile.areasOfExpertise.map((value) => <Tag color="blue" key={value}>{value}</Tag>)}</Space> : null}
        {profile.summary ? <div><Typography.Text strong>Resumo profissional</Typography.Text><Typography.Paragraph>{profile.summary}</Typography.Paragraph></div> : null}
        {profile.professionalObjective ? <div><Typography.Text strong>Objetivo profissional</Typography.Text><Typography.Paragraph>{profile.professionalObjective}</Typography.Paragraph></div> : null}
      </section>
      {profile.keyResults.length ? <ProfileSection icon={<TrophyOutlined />} title="Principais resultados"><ul>{profile.keyResults.map((item) => <li key={item.id}>{item.value}</li>)}</ul></ProfileSection> : null}
      {profile.experiences.length ? <ProfileSection icon={<BankOutlined />} title="Experiências profissionais">{profile.experiences.map((item) => <article className="prisma-profile-record" key={item.id}><div><Typography.Text strong>{item.role || "Cargo não informado"}</Typography.Text>{item.period ? <span>{item.period}</span> : null}</div><Typography.Text type="secondary">{item.organization || "Organização não informada"}</Typography.Text>{item.description || item.evidenceText ? <Typography.Paragraph>{item.description || item.evidenceText}</Typography.Paragraph> : null}</article>)}</ProfileSection> : null}
      {profile.education.length ? <ProfileSection icon={<BookOutlined />} title="Formação">{profile.education.map((item) => <article className="prisma-profile-record" key={item.id}><div><Typography.Text strong>{item.course || "Curso não informado"}</Typography.Text>{item.period ? <span>{item.period}</span> : null}</div><Typography.Text type="secondary">{item.institution || "Instituição não informada"}</Typography.Text>{item.description ? <Typography.Paragraph>{item.description}</Typography.Paragraph> : null}</article>)}</ProfileSection> : null}
      {profile.competencies.length ? <ProfileSection icon={<BulbOutlined />} title="Competências"><Space size={[6, 6]} wrap>{profile.competencies.map((value) => <Tag key={value}>{value}</Tag>)}</Space></ProfileSection> : null}
      {profile.certifications.length || profile.languages.length ? <ProfileSection icon={<SafetyCertificateOutlined />} title="Certificações e idiomas"><Space direction="vertical" size={8}>{profile.certifications.length ? <div><Typography.Text strong>Certificações: </Typography.Text>{profile.certifications.join(" · ")}</div> : null}{profile.languages.length ? <div><Typography.Text strong>Idiomas: </Typography.Text>{profile.languages.join(" · ")}</div> : null}</Space></ProfileSection> : null}
      {profile.customSections.map((section) => <ProfileSection icon={<BookOutlined />} key={section.id} title={section.name}>{section.format === "list" ? <ul>{section.items.map((item) => <li key={item.id}>{item.value}</li>)}</ul> : <Typography.Paragraph>{section.items.map((item) => item.value).join("\n")}</Typography.Paragraph>}</ProfileSection>)}
    </div>
  );
}

function ProfileSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="prisma-profile-section"><header>{icon}<Typography.Title level={5}>{title}</Typography.Title></header>{children}</section>;
}
