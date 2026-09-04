import { useState, type ReactNode } from "react";
import {
  BankOutlined,
  BookOutlined,
  BulbOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Button, Space, Tag, Typography } from "antd";
import {
  EDUCATION_LEVEL_LABELS,
  EDUCATION_QUALIFICATION_LABELS,
  EDUCATION_STATUS_LABELS,
} from "../../../../src/domain/educationClassification";
import type { PrismaProfileView } from "../../domain/canonicalProfile";
import { profileHasPublishedContent } from "../../domain/canonicalProfile";

interface CanonicalProfileViewProps {
  profile: PrismaProfileView;
  compact?: boolean;
  showHeader?: boolean;
  onShowEvidence?: (section: "about" | "experience" | "education" | "competencies" | "credentials" | "other") => void;
}

export function CanonicalProfileView({ profile, compact = false, showHeader = true, onShowEvidence }: CanonicalProfileViewProps) {
  if (!profileHasPublishedContent(profile)) {
    return <div className="prisma-canonical-empty"><FileTextOutlined /><strong>Ainda não há informações profissionais publicadas neste Perfil.</strong></div>;
  }
  return (
    <article className={`prisma-canonical-profile${compact ? " is-compact" : ""}`}>
      {showHeader ? <ProfileHeader profile={profile} /> : null}
      <div className="prisma-canonical-profile__content">
        {profile.about ? <CanonicalSection action={evidenceAction(onShowEvidence, "about")} className="prisma-canonical-about" icon={<FileTextOutlined />} title="Sobre">
          {profile.about.areasOfExpertise.length ? <LabeledTags label="Áreas de atuação" values={profile.about.areasOfExpertise} /> : null}
          {profile.about.summary ? <Typography.Paragraph>{profile.about.summary}</Typography.Paragraph> : null}
          {profile.about.professionalObjective ? <div className="prisma-canonical-subsection"><Typography.Text strong>Objetivo profissional</Typography.Text><Typography.Paragraph>{profile.about.professionalObjective}</Typography.Paragraph></div> : null}
          {profile.about.keyResults.length ? <div className="prisma-canonical-results"><Typography.Text strong><TrophyOutlined /> Principais resultados</Typography.Text><ul>{profile.about.keyResults.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        </CanonicalSection> : null}

        {profile.experiences.length ? <CanonicalSection action={evidenceAction(onShowEvidence, "experience")} icon={<BankOutlined />} title="Experiência profissional">
          <div className="prisma-canonical-timeline">
            {profile.experiences.map((item) => <article className="prisma-canonical-experience" key={item.id}>
              <span className="prisma-canonical-timeline__dot" aria-hidden="true" />
              <div className="prisma-canonical-record__heading"><div><Typography.Title level={4}>{item.role || "Experiência profissional"}</Typography.Title>{item.organization ? <Typography.Text>{item.organization}</Typography.Text> : null}</div>{item.period ? <time>{item.period}</time> : null}</div>
              {item.description || item.evidenceText ? <Typography.Paragraph>{item.description || item.evidenceText}</Typography.Paragraph> : null}
            </article>)}
          </div>
        </CanonicalSection> : null}

        {profile.education.length ? <CanonicalSection action={evidenceAction(onShowEvidence, "education")} icon={<BookOutlined />} title="Formação">
          <div className="prisma-canonical-education-grid">
            {profile.education.map((item) => <article className="prisma-canonical-education" key={item.id}>
              <div className="prisma-canonical-education__icon"><BookOutlined /></div>
              <div><Typography.Title level={4}>{item.course || "Formação"}</Typography.Title>{item.institution ? <Typography.Text>{item.institution}</Typography.Text> : null}
                <Space size={[6, 6]} wrap>
                  {item.period ? <span className="prisma-canonical-meta">{item.period}</span> : null}
                  {item.level && item.level !== "unknown" ? <Tag>{EDUCATION_LEVEL_LABELS[item.level]}</Tag> : null}
                  {item.qualification && item.qualification !== "unknown" ? <Tag>{EDUCATION_QUALIFICATION_LABELS[item.qualification]}</Tag> : null}
                  {item.status && item.status !== "unknown" ? <Tag color="green">{EDUCATION_STATUS_LABELS[item.status]}</Tag> : null}
                </Space>
              </div>
            </article>)}
          </div>
        </CanonicalSection> : null}

        {profile.competencyGroups.length ? <CanonicalSection action={evidenceAction(onShowEvidence, "competencies")} icon={<BulbOutlined />} title="Competências">
          <div className="prisma-canonical-competency-groups">{profile.competencyGroups.map((group) => <CompetencyGroup group={group} key={group.key} />)}</div>
        </CanonicalSection> : null}

        {profile.credentials ? <CanonicalSection action={evidenceAction(onShowEvidence, "credentials")} icon={<SafetyCertificateOutlined />} title="Credenciais">
          <div className="prisma-canonical-credentials">
            {profile.credentials.certifications.length ? <section><Typography.Title level={4}>Certificações</Typography.Title><ul>{profile.credentials.certifications.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
            {profile.credentials.languages.length ? <section><Typography.Title level={4}>Idiomas</Typography.Title><div className="prisma-canonical-languages">{profile.credentials.languages.map((item) => <div key={`${item.language}:${item.level ?? ""}`}><strong>{item.language}</strong>{item.level ? <span>{item.level}</span> : <span>Nível não informado</span>}</div>)}</div></section> : null}
          </div>
        </CanonicalSection> : null}

        {profile.customSections.length ? <CanonicalSection action={evidenceAction(onShowEvidence, "other")} icon={<BookOutlined />} title="Outros">
          <div className="prisma-canonical-custom-grid">{profile.customSections.map((section) => <section key={section.id}><Typography.Title level={4}>{section.name}</Typography.Title>{section.format === "list" ? <ul>{section.items.map((item) => <li key={item.id}>{item.value}</li>)}</ul> : <Typography.Paragraph>{section.items.map((item) => item.value).join("\n")}</Typography.Paragraph>}</section>)}</div>
        </CanonicalSection> : null}
      </div>
    </article>
  );
}

function ProfileHeader({ profile }: { profile: PrismaProfileView }) {
  const identity = profile.identity;
  return <header className="prisma-canonical-header"><div className="prisma-canonical-avatar" aria-hidden="true">{initials(identity.fullName)}</div><div className="prisma-canonical-header__copy"><div className="prisma-canonical-header__title"><Typography.Title level={1}>{identity.fullName}</Typography.Title>{profile.version?.current ? <Tag color="green">Perfil vigente</Tag> : profile.version ? <Tag>Versão v{profile.version.number}</Tag> : null}</div>{identity.professionalTitle ? <Typography.Paragraph>{identity.professionalTitle}</Typography.Paragraph> : null}<Space className="prisma-canonical-header__meta" size={[12, 8]} wrap>{identity.location ? <span><EnvironmentOutlined /> {identity.location}</span> : null}{identity.lifecycleLabel ? <span>{identity.lifecycleLabel}</span> : null}{identity.operationalStatusLabel ? <Tag color={identity.operationalStatusLabel === "Ativo" ? "green" : "default"}>{identity.operationalStatusLabel}</Tag> : null}</Space></div></header>;
}

function CanonicalSection({ action, children, className = "", icon, title }: { action?: ReactNode; children: ReactNode; className?: string; icon: ReactNode; title: string }) {
  return <section className={`prisma-canonical-section ${className}`}><header><div><span>{icon}</span><Typography.Title level={2}>{title}</Typography.Title></div>{action}</header>{children}</section>;
}

function LabeledTags({ label, values }: { label: string; values: string[] }) {
  return <div className="prisma-canonical-labeled-tags"><Typography.Text strong>{label}</Typography.Text><Space size={[6, 6]} wrap>{values.map((value) => <Tag color="blue" key={value}>{value}</Tag>)}</Space></div>;
}

function CompetencyGroup({ group }: { group: PrismaProfileView["competencyGroups"][number] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? group.values : group.values.slice(0, 8);
  return <section><Typography.Text strong>{group.label}</Typography.Text><div className="prisma-canonical-tags">{visible.map((value) => <Tag key={`${group.key}:${value.label}`} title={value.originalTerm ? `Termo no documento: ${value.originalTerm}` : undefined}>{value.label}</Tag>)}{group.values.length > visible.length ? <Button onClick={() => setExpanded(true)} size="small" type="link">+{group.values.length - visible.length} ver todas</Button> : expanded && group.values.length > 8 ? <Button onClick={() => setExpanded(false)} size="small" type="link">Recolher</Button> : null}</div></section>;
}

function evidenceAction(handler: CanonicalProfileViewProps["onShowEvidence"], section: Parameters<NonNullable<CanonicalProfileViewProps["onShowEvidence"]>>[0]): ReactNode | undefined {
  return handler ? <Button icon={<EyeOutlined />} onClick={() => handler(section)} size="small" type="text">Ver evidências</Button> : undefined;
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "").join("");
}
