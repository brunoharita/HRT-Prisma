import React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { BankOutlined, CheckSquareOutlined, HomeOutlined, ReadOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { CanonicalProfileHeader } from "../../../web/src/components/profile/CanonicalProfileView";
import { PersonProfessionalEvidenceMap } from "../../../web/src/components/profile/PersonProfessionalEvidenceMap";
import type { PrismaProfileView } from "../../../web/src/domain/canonicalProfile";
import type { ProfessionalEvidenceAssociation, ProfessionalEvidenceProjection } from "../../../web/src/domain/personProfessionalEvidence";
import { POSITION_TAXONOMY_CONTRACT, type ProfessionalConceptType } from "../../../web/src/domain/positionTaxonomy";
import { COMPETENCY_TAXONOMY_CONTRACT } from "../../../web/src/domain/competencyTaxonomy";
import { PrismaAppShell } from "../../../web/src/ui/PrismaAppShell";
import { prismaTheme } from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";

const profile: PrismaProfileView = {
  identity: { fullName: "Ana Carolina Ribeiro", professionalTitle: "Desenvolvedora de Software Sênior", location: "São Paulo, SP · Remoto", lifecycleLabel: "Perfil profissional", operationalStatusLabel: "Ativo" },
  about: { summary: "Profissional de tecnologia com experiência em desenvolvimento de software, arquitetura de sistemas e soluções em nuvem. Atua na construção de produtos escaláveis e na colaboração com produto e dados.", professionalObjective: null, areasOfExpertise: ["Software Engineering", "Back-end", "Arquitetura de sistemas"], keyResults: [] },
  experiences: [{ id: "exp-1", source: "document", organization: "TechNova", role: "Desenvolvedora de Software Sênior", period: "2021 — atual", description: "Desenvolvimento de APIs e plataformas de pagamentos.", evidenceText: "Java e Spring Boot", page: 2, originalText: "Experiência sintética" }],
  education: [], competencyGroups: [],
  credentials: { certifications: ["AWS Certified Developer Associate"], languages: [{ language: "Inglês", level: "Avançado" }] },
  customSections: [], version: { profileId: "profile-fixture", number: 3, publishedAt: "2026-09-18T12:00:00Z", current: true },
};

const concepts: Array<[string, string, ProfessionalConceptType, "declared" | "contextual" | "demonstrated"]> = [
  ["java", "Java", "technology", "demonstrated"], ["spring", "Spring Boot", "technology", "declared"], ["api", "APIs REST", "skill", "contextual"],
  ["micro", "Arquitetura de microsserviços", "knowledge", "contextual"], ["aws", "AWS", "technology", "demonstrated"], ["integration", "Integração de sistemas", "skill", "declared"],
  ["sql", "SQL", "technology", "demonstrated"], ["modeling", "Modelagem de dados", "knowledge", "contextual"], ["analytics", "Análise de dados", "skill", "declared"],
  ["scrum", "Metodologias ágeis", "methodology", "contextual"], ["improvement", "Melhoria contínua", "methodology", "declared"],
  ["leadership", "Liderança técnica", "competency", "contextual"], ["team", "Trabalho em equipe", "skill", "demonstrated"],
  ["cert", "AWS Certified Developer Associate", "certification", "declared"], ["docker", "Docker", "technology", "contextual"],
];

const associations: ProfessionalEvidenceAssociation[] = concepts.map(([id, label, type, nature], index) => ({
  id: `${nature}:${id}`, nature,
  concept: { id: `concept-${id}`, label, type, scope: "global", version: 1 }, observedTerm: label,
  evidence: {
    id: `evidence-${id}`, title: index === 0 ? "API de pagamentos em Java" : index === 4 ? "AWS Certified Developer Associate" : label,
    fact: index === 0 ? "Desenvolvimento de uma API de pagamentos utilizando Java e Spring Boot." : `${label} consta no Perfil publicado.`,
    quote: index < 6 ? `Trecho sintético rastreável sobre ${label}.` : null, recordedAt: `2026-0${Math.min(9, (index % 8) + 1)}-18T12:00:00Z`,
    source: { kind: nature === "demonstrated" ? "demonstrated_evidence" : "document", label: nature === "demonstrated" ? "Verificação de Competências" : "CV_AnaCarolinaRibeiro.pdf", documentId: nature === "demonstrated" ? null : "document-fixture", filename: nature === "demonstrated" ? null : "CV_AnaCarolinaRibeiro.pdf", pageNumber: nature === "demonstrated" ? null : 2, fieldPath: nature === "demonstrated" ? null : "competencies", reviewId: nature === "demonstrated" ? null : "review-fixture", evidenceLinkId: nature === "demonstrated" ? null : `link-${id}`, spatialRegionId: nature === "demonstrated" ? null : `region-${id}` },
  },
  explanation: { method: nature === "contextual" ? "Relação contextual versionada e separada da declaração." : nature === "demonstrated" ? "Resultado direto M5.1 associado ao conceito publicado." : "Termo explícito associado por alias aprovado.", methodVersion: nature === "demonstrated" ? "demonstrated-evidence-1.0.0" : "knowledge-normalization-2.0.0", taxonomyVersion: COMPETENCY_TAXONOMY_CONTRACT, knowledgeGlobalVersion: 4, knowledgeOrganizationVersion: null, sourceName: "O*NET", sourceVersion: "31.0", humanDecision: nature === "declared" ? "Perfil aprovado por operadora autorizada." : null },
  verification: nature === "demonstrated" ? { status: "active", qualifiesAsVerified: true, demonstratedLevel: "intermediate", validUntil: "2027-09-18T12:00:00Z", evaluationVersion: "m51b-assessment-evaluation-1.0.0", integrityRuleVersion: "m51b-integrity-ruleset-1.0.0" } : null,
}));

const projection: ProfessionalEvidenceProjection = { contractVersion: "person-professional-evidence-3.1.0", taxonomyVersions: { occupation: POSITION_TAXONOMY_CONTRACT, competency: COMPETENCY_TAXONOMY_CONTRACT }, organizationId: "org-fixture", personId: "person-fixture", profile: { id: "profile-fixture", version: 3, publishedAt: "2026-09-18T12:00:00Z", inferenceVersion: "professional-profile-inference-1.0.0" }, normalization: { status: "complete", declaredCount: 8, methodVersion: "declared-competency-normalization-1.0.0", errorCode: null, latestAttempt: { runId: "run-fixture", status: "complete", errorCode: null, completedAt: "2026-09-18T12:01:00Z", usedAsBasis: true }, coverage: { totalItemCount: 1, associatedItemCount: 0, uniqueConceptCount: 8, pendingItemCount: 1, uniquePendingTermCount: 1 }, items: [{ originalIndex: 7, originalTerm: "Arquitetura", sourceText: "Arquitetura", normalizedTerm: "Arquitetura", searchTerms: ["Arquitetura", "Architecture"], state: "ambiguous", reason: "Mais de um conceito publicado pode corresponder ao termo." }] }, associations, issues: [{ code: "ambiguous", observedTerm: "Arquitetura", explanation: "Seleção humana necessária." }] };
const membership = { organizationId: "org-fixture", organizationName: "HRT Tecnologia", groupId: null, groupName: null, role: "owner" as const };
const navigationItems = [{ path: "/", label: "Home", icon: <HomeOutlined /> }, { path: "/profiles", label: "Pessoas", icon: <TeamOutlined /> }, { path: "/positions", label: "Posições", icon: <BankOutlined /> }, { path: "/verifications", label: "Verificações", icon: <CheckSquareOutlined /> }, { path: "/knowledge", label: "Knowledge", icon: <ReadOutlined /> }, { path: "/settings", label: "Configurações", icon: <SettingOutlined /> }];

function Harness() {
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaAppShell navigationItems={navigationItems} selectedPath="/profiles" memberships={[membership]} activeMembership={membership} profileName="Carla Mendes" profileSubtitle="HRT" onNavigate={() => undefined} onOrganizationChange={() => undefined} onSignOut={() => undefined}>
    <main style={{ maxWidth: 1240, margin: "0 auto" }}><CanonicalProfileHeader profile={profile} /><PersonProfessionalEvidenceMap profile={profile} projection={projection} projectionError={null} onOpenSource={() => undefined} /></main>
  </PrismaAppShell></ConfigProvider>;
}

createRoot(document.getElementById("app")!).render(<Harness />);
