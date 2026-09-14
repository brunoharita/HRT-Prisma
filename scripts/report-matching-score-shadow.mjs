import {
  buildMatchingScoreShadowReport,
  emptyVacancyDraft,
  matchVacancyCandidate,
  newVacancyRequirement,
} from "../dist/web/src/domain/vacancy.js";

const need = {
  ...emptyVacancyDraft(),
  id: "fixture-marketing",
  organizationId: "fixture-organization",
  versionId: "fixture-marketing-v1",
  version: 1,
  title: "Analista de Marketing",
  area: "Marketing",
  requirements: [required("Campanhas"), required("CRM")],
  jobRoleName: "Analista de Marketing",
  occupantName: null,
  createdAt: "2026-09-13T12:00:00Z",
  updatedAt: "2026-09-13T12:00:00Z",
};

const matches = [
  fixture("beatriz-marketing", "Assistente de Marketing", ["Campanhas"]),
  fixture("gerente-marketing", "Gerente de Marketing", ["Campanhas", "CRM"]),
  fixture("tecnologia-mencao-marketing", "Analista de Sistemas", [], "Integração técnica com plataforma de marketing digital."),
  fixture("perfil-curto-aderente", "Analista de Marketing", ["Campanhas", "CRM"]),
].map((candidate) => matchVacancyCandidate(need, candidate));

const report = {
  contractVersion: "matching-score-shadow-report-1.0.0",
  generatedFrom: "synthetic-fixtures",
  matchingVersion: matches[0]?.score.matchingContractVersion ?? null,
  scoreVersion: matches[0]?.score.scoreContractVersion ?? null,
  rows: buildMatchingScoreShadowReport(matches),
};

console.log(JSON.stringify(report, null, 2));

function required(label) {
  return { ...newVacancyRequirement(label, "competency"), importance: "required", importanceConfirmed: true };
}

function fixture(personId, role, competencies, description = "Atuação profissional em Marketing.") {
  return {
    personId,
    fullName: "Pessoa sintética",
    lifecycle: "candidate",
    operationalStatus: "active",
    location: null,
    profileId: `profile-${personId}`,
    profileVersion: 1,
    publishedAt: "2026-09-13T12:00:00Z",
    profileData: {
      identity: { fullName: "Pessoa sintética" },
      contact: { city: null, state: null, phone: null, email: null, linkedin: null },
      professionalTitle: role,
      areasOfExpertise: role.includes("Marketing") ? ["Marketing"] : [],
      professionalObjective: null,
      summary: null,
      keyResults: [],
      experiences: [{ id: `experience-${personId}`, source: "human", role, organization: "Empresa sintética", period: "2024 - atual", description, evidenceText: role, page: 1 }],
      education: [],
      certifications: [],
      languages: [],
      competencies,
      customSections: [],
      uncertainties: [],
      notIdentified: [],
    },
    knowledge: [],
  };
}
