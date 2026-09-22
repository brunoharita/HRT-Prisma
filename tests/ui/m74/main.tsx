import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, Switch } from "antd";
import ptBR from "antd/locale/pt_BR";
import { HomeOutlined, TeamOutlined, ReadOutlined } from "@ant-design/icons";
import { PersonProfessionalEvidenceMap } from "../../../web/src/components/profile/PersonProfessionalEvidenceMap";
import { CanonicalProfileHeader } from "../../../web/src/components/profile/CanonicalProfileView";
import { m72Fixture } from "../../fixtures/m72PersonEvidence";
import { competencyKey, type CompetencyCurationAdapter } from "../../../web/src/domain/profileCompetencyCuration";
import type { PrismaProfileView } from "../../../web/src/domain/canonicalProfile";
import { PrismaAppShell } from "../../../web/src/ui/PrismaAppShell";
import { prismaTheme } from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";

const labels = ["Transformação operacional", "Excelência operacional", "Business Process Management (BPM)", "Business Process Model and Notation (BPMN)", "As-Is/To-Be", "Operating model", "Melhoria contínua", "Plan-Do-Check-Act (PDCA)", "Governança", "Project Management Office (PMO)"];
const initial = m72Fixture();
initial.normalization.declaredCount = 43;
initial.normalization.items = Array.from({ length: 59 }, (_, index) => {
  const normalizedTerm = index === 14 ? labels[3]! : labels[index - 10] ?? `Competência sintética ${index + 1}`;
  return { originalIndex: index, originalTerm: index === 13 ? "BPM/BPMN" : index === 14 ? "BPMN" : normalizedTerm,
    sourceText: index === 13 || index === 14 ? "BPMN" : normalizedTerm, normalizedTerm,
    searchTerms: [normalizedTerm, ...(index === 13 || index === 14 ? ["BPMN"] : [])], state: "unresolved" as const,
    reason: "Ainda sem associação segura na Knowledge." };
});
initial.normalization.coverage = { totalItemCount: 59, associatedItemCount: 0, uniqueConceptCount: 0, pendingItemCount: 59, uniquePendingTermCount: 58 };
initial.issues = initial.normalization.items.map((item) => ({ code: "unresolved", observedTerm: item.normalizedTerm, explanation: item.reason }));
const profile: PrismaProfileView = {
  identity: { fullName: "Ana Carolina Ribeiro", professionalTitle: "Especialista em processos", location: "São Paulo, SP", lifecycleLabel: "Perfil vigente", operationalStatusLabel: "Ativo" },
  about: null, experiences: [], education: [], competencyGroups: [], credentials: { certifications: [], languages: [] }, customSections: [],
  version: { profileId: initial.profile.id, number: 1, publishedAt: initial.profile.publishedAt, current: true },
};
const membership = { organizationId: "org-fixture", organizationName: "Empresa sintética", groupId: null, groupName: null, role: "owner" as const };
function Harness() {
  const current = useRef(initial);
  const [fail, setFail] = useState(false);
  const failRef = useRef(false); failRef.current = fail;
  const adapter = useMemo<CompetencyCurationAdapter>(() => ({ canUseGlobal: false,
    async loadSubgroups() { return [{ id: "subgroup-hard", code: "H3", label: "Processos e métodos", macroGroupCode: "hard" as const, scope: "global" as const, organizationId: null, definition: "Competências técnicas aplicadas a processos e métodos.", classificationQuestion: "O conceito descreve um processo ou método técnico?", examples: ["BPMN"] }]; },
    async refresh() { return structuredClone(current.current); },
     async search() { return [{ id: "concept-bpmn", canonicalLabel: "Business Process Model and Notation", conceptType: "methodology", scope: "global", aliases: ["BPMN"], description: "Notação para representar processos de negócio.", sourceName: "Fonte sintética", sourceVersion: "1.0", externalId: null, externalUri: null, method: "alias", matchedTerm: "BPMN", matchClass: "official_alias", aliasAuthority: "official_source", references: [{ source: "Fonte sintética", sourceVersion: "1.0", externalId: null, externalUri: null, mappingType: "exact", nativeType: "methodology", provenance: {} }] }]; },
     async suggestDescription() { return "Definição sintética para validação visual."; },
     async save(decision) {
      if (failRef.current) throw new Error("Falha sintética de gravação. Sua edição foi preservada.");
      const next = structuredClone(current.current);
      if (decision.action === "alias") {
        const item = next.normalization.items.find((value) => competencyKey(value) === competencyKey(decision.item))!;
        item.state = "resolved";
        const association = structuredClone(next.associations[0]!);
        association.id = `curated:${item.originalIndex}`;
        association.concept = { ...association.concept, id: "concept-bpmn", label: "Business Process Model and Notation", type: "methodology" };
        association.nature = "declared";
        association.observedTerm = item.originalTerm;
        association.evidence = { ...association.evidence, id: association.id, title: item.normalizedTerm, quote: item.sourceText };
        next.associations.push(association);
        next.issues = next.normalization.items.filter((value) => value.state !== "resolved").map((value) => ({ code: "unresolved", observedTerm: value.normalizedTerm, explanation: value.reason }));
      }
     current.current = next;
      return { projection: next, outcome: decision.action };
    },
    async loadEvidenceSources() { return []; },
    async linkEvidence() { return structuredClone(current.current); },
  }), []);
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaAppShell navigationItems={[{ path: "/", label: "Início", icon: <HomeOutlined /> }, { path: "/profiles", label: "Pessoas", icon: <TeamOutlined /> }, { path: "/knowledge", label: "Knowledge", icon: <ReadOutlined /> }]} selectedPath="/profiles" memberships={[membership]} activeMembership={membership} profileName="Operadora sintética" profileSubtitle="Admin" onNavigate={() => undefined} onOrganizationChange={() => undefined} onSignOut={() => undefined}>
    <div className="prisma-profile-page"><label><Switch checked={fail} onChange={setFail} /> Simular falha de gravação (somente fixture)</label><CanonicalProfileHeader profile={profile} /><PersonProfessionalEvidenceMap profile={profile} projection={initial} projectionError={null} onOpenSource={() => undefined} curation={adapter} /></div>
  </PrismaAppShell></ConfigProvider>;
}
createRoot(document.getElementById("app")!).render(<Harness />);
