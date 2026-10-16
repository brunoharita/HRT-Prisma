// Browser-only synthetic transport. Production components, no remote DB/provider.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import { ProfileReviewPage } from "../../web/src/pages/ProfileReviewPage";
import { ProfileDeltaPage } from "../../web/src/pages/ProfileDeltaPage";
import { ManualProfileStartPage } from "../../web/src/pages/ManualProfileStartPage";
import { ProfessionalAreas } from "../../web/src/components/ProfessionalAreas";
import { PeoplePage } from "../../web/src/pages/PeoplePage";
import { PersonFormPage } from "../../web/src/pages/PersonFormPage";
import { PersonWorkspacePage } from "../../web/src/pages/PersonWorkspacePage";
import { TokenRates } from "../../web/src/pages/TokenRates";
import { personIngestionService as service } from "../../web/src/infrastructure/supabase/personIngestionService";
import { profileFixture } from "../fixtures/personFlow";
import type { PersonWorkspaceSummary, ProfileReviewWorkspace, ProfileVersionView, StructuredDraft } from "../../web/src/domain/personIngestion";
import { professionalAreaService } from "../../web/src/infrastructure/supabase/professionalAreaService";
import "../../web/src/styles.css";
import "../../web/src/ui/foundation.css";
import { prismaTheme } from "../../web/src/ui/theme";
const areaOptions: import("../../web/src/infrastructure/supabase/professionalAreaService").ProfessionalArea[] = [{id:"area-tech",label:"Tecnologia",description:"Sistemas e infraestrutura",aliases:["TI"],version:1,scope:"global",organizationId:null,active:true},{id:"area-rh",label:"Recursos Humanos",description:"Gestão de pessoas",aliases:["RH","HRBP"],version:1,scope:"global",organizationId:null,active:true}];
professionalAreaService.load = async () => ({options:structuredClone(areaOptions),suggestion:[]});
professionalAreaService.save = async (org, area) => { const id=area.id ?? "area-local"; const row={...area,id,organizationId:org,scope:org ? "organization" as const : "global" as const,version:(area.version ?? 0)+1};const index=areaOptions.findIndex(a=>a.id===id);if(index>=0)areaOptions[index]=row;else areaOptions.push(row);return id;};
professionalAreaService.contributions = async () => [{id:"contribution-synthetic",status:"awaiting_human_review",original_proposal:{proposed_concept:{canonical_label:"Gestão de Pessoas",description:"Contribuição sintética"},aliases:["People"],origin:{concept_id:"area-local",concept_version:1}}}];
professionalAreaService.decide = async () => { document.body.dataset.areaDecision="recorded";return null; };

const params = new URLSearchParams(location.search), state = params.get("state") ?? "full";
const membership = { organizationId: "synthetic-org", organizationName: "Empresa exemplo", groupId: null, groupName: null, role: params.get("role") === "member" ? "member" as const : "recruiter" as const };
const empty: StructuredDraft = profileFixture({ identity: { fullName: "Pessoa manual sintética" }, contact: { city: null, state: null, phone: null, email: null, linkedin: null }, professionalTitle: null, experiences: [], competencies: [] });
const full: StructuredDraft = profileFixture({
  identity: { fullName: "Pessoa manual sintética" },
  experiences: [{ id: "experience_manual0001", source: "human", organization: "Empresa exemplo", role: "Analista", period: "2020 - 2024", description: "Atividades declaradas", evidenceText: "", page: null }],
  languages: ["Português", "Inglês intermediário"], toolsAndTechnologies: ["SQL", "Planilhas"], professionalContexts: ["Varejo"],
  customSections: [{ id: "manual_projects", name: "Projetos", format: "list", source: "human", items: [{ id: "item_manual0001", value: "Projeto exemplo" }] }],
});
let draft = structuredClone(state === "empty" || state === "partial" ? empty : full);
const qa = { calls: [] as string[], saved: null as StructuredDraft | null, personSaved: null as unknown, publications: 0, navigation: "" };
(window as unknown as { qa: typeof qa }).qa = qa;
let review: ProfileReviewWorkspace = {
  id: "review-synthetic", personId: "person-synthetic", personName: draft.identity.fullName!, personPrivateContact: { phone: null, email: state === "empty" || state === "partial" ? null : "lia.fixture@example.invalid" },
  sourceKind: params.get("view") === "baseline" ? "profile" : "manual", sourceProfileId: state === "update" || params.get("view") === "baseline" ? "profile-synthetic" : null, sourceProfileVersion: state === "update" ? 1 : null,
  documentId: null, documentName: null, documentVersion: null, documentPageCount: 0, documentStoragePath: null, documentSourceType: null, processingAttemptId: null,
  state: "draft", lockVersion: 1, requiresContractUpgrade: false, extractedData: structuredClone(draft), reviewedData: structuredClone(draft), baseProfileVersion: state === "update" ? 1 : null,
  approvedProfileId: null, approvedAt: null, pages: [], revisions: [], changes: [], adaptationEvents: [], originalEvidence: [], spatialRegions: [], evidenceLinks: [], evidenceRefinements: [], evidenceEvents: [], fieldProvenance: {},
};
const versions: ProfileVersionView[] = state === "update" || params.get("view") === "baseline" ? [{ id: "profile-synthetic", profileVersion: 1, profileData: structuredClone(full), sourceDocumentId: null, processingAttemptId: null, reviewStatus: "approved", approvedByAuthUserId: "synthetic-actor", approvedAt: "2026-10-14T12:00:00Z", createdAt: "2026-10-14T12:00:00Z", supersededAt: null, manualEntry: true }] : [];
const person: PersonWorkspaceSummary = { id: "person-synthetic", organizationId: membership.organizationId, fullName: "Pessoa manual sintética", lifecycle: "candidate", operationalStatus: "active", archivedAt: null, mergedIntoPersonId: null, profileState: versions.length ? "generated" : "not_generated", latestSourceType: null, latestSourceAt: null, updatedAt: "2026-10-15T12:00:00Z", currentProfile: versions.length ? { id: "profile-synthetic", profileVersion: 1, sourceDocumentId: null, approvedAt: "2026-10-14T12:00:00Z", createdAt: "2026-10-14T12:00:00Z" } : null, latestDocument: null, documentCount: 0, pendingReviewCount: 0, isActiveEmployee: true, privateData: { fullName: "Pessoa manual sintética", email: "manual@example.invalid", phoneCountryIso2: "BR", phoneCountryLabel: "Brasil", phoneCountryCode: "+55", phoneNationalNumber: "11987654321", phoneE164: "+5511987654321", birthDate: null, city: "Cidade exemplo", countryCode: "BR", notes: "Observação privada sintética" } };
const wait = async () => { if (state === "loading") await new Promise(resolve => setTimeout(resolve, 1500)); if (state === "error") throw Error("Falha sintética recuperável. O rascunho permanece preservado."); };
service.loadProfileReview = async () => { qa.calls.push("load-review"); await wait(); return structuredClone(review); };
service.saveProfileReview = async (_org, _id, lock, value) => { qa.calls.push("save-review"); if(state === "save-error") throw Error("Falha sintética de salvamento; rascunho preservado."); qa.saved = structuredClone(value); review = { ...review, reviewedData: structuredClone(value), lockVersion: lock + 1 }; return lock + 1; };
service.synchronizeProfileReviewContract = service.saveProfileReview;
service.listProfileVersions = async () => structuredClone(versions);
service.publishProfileReview = async () => { qa.calls.push("publish"); qa.publications++; return { profileId: "published-synthetic", profileVersion: versions.length + 1 }; };
service.loadWorkspace = async () => { await wait(); return { person: structuredClone(person), documents: [], selectedDocument: null, pages: [], draft: null, manualReviews: [{ id: review.id, state: "draft", createdAt: "2026-10-15T12:00:00Z" }] }; };
service.employeeHistory = async () => [{ id: 1, actorAuthUserId: "synthetic-actor", createdAt: "2026-10-15T12:00:00Z", current: true }];
service.savePerson = async (_org, _id, value) => { qa.calls.push("save-person"); qa.personSaved = value; return person.id; };
service.findManualDuplicates = async () => { qa.calls.push("duplicates"); if(state === "scope") await new Promise(resolve => setTimeout(resolve,2500)); if (state === "error") throw Error("Falha na consulta de duplicidade. Tente novamente."); return ["duplicate","scope"].includes(state) ? [{ personId: "person-existing", fullName: "Pessoa existente sintética", email: "manual@example.invalid", phone: null, reasons: ["same_email"], strong: true }] : []; };
service.startManualProfile = async (_org, _person, identity) => { qa.calls.push("start-manual"); if (identity.fullName) { draft = structuredClone(empty); draft.identity.fullName = identity.fullName; draft.contact.email = identity.email || null; draft.contact.phone = identity.phone || null; review = { ...review, extractedData: structuredClone(draft), reviewedData: structuredClone(draft) }; } return { personId: person.id, reviewId: review.id }; };
service.listPeople = async () => { await wait(); return [person, { ...person, id: "person-no", fullName: "Pessoa não confirmada", isActiveEmployee: false }, { ...person, id: "person-legacy", fullName: "Pessoa legado", isActiveEmployee: undefined }]; };

function Harness() {
  const [route, setRoute] = useState(params.get("view") ?? "editor");
  const [selectedMembership,setSelectedMembership] = useState(membership);
  const navigate = (path: string) => { qa.navigation = path; if (path.endsWith("/delta")) setRoute("delta"); else if (path.includes("/reviews/")) setRoute("editor"); else setRoute("navigated"); };
  let content: React.ReactNode;
  if (route === "knowledge") content = <ProfessionalAreas organizationId={membership.organizationId} global={params.get("global") === "yes"} canEdit={true} />;
  else if (route === "start") content = <ManualProfileStartPage activeMembership={selectedMembership} onNavigate={navigate} />;
  else if (route === "people") content = <PeoplePage activeMembership={membership} repository={{} as never} onNavigate={navigate} />;
  else if (route === "person") content = <PersonFormPage activeMembership={membership} personId={person.id} onNavigate={navigate} />;
  else if (route === "workspace") content = <PersonWorkspacePage activeMembership={membership} personId={person.id} onNavigate={navigate} />;
  else if (route === "delta") content = <ProfileDeltaPage activeMembership={membership} personId={person.id} reviewId={review.id} onNavigate={navigate} />;
  else if (route === "rates") content = <TokenRates rates={[
    { id: "old", functionName: "parser_ia", tokensPerUnit: 10001, effectiveAt: "2026-01-01T00:00:00Z" },
    { id: "current", functionName: "parser_ia", tokensPerUnit: 14785, effectiveAt: "2026-10-01T00:00:00Z" },
    { id: "future", functionName: "parser_ia", tokensPerUnit: 19019, effectiveAt: "2099-01-01T00:00:00Z" },
    { id: "synthesis", functionName: "profile_synthesis", tokensPerUnit: 6193, effectiveAt: "2026-10-01T00:00:00Z" },
  ]} />;
  else if (route === "navigated") content = <p>Navegação realizada: {qa.navigation}</p>;
  else content = <ProfileReviewPage activeMembership={membership} personId={person.id} reviewId={review.id} onNavigate={navigate} />;
  return <ConfigProvider theme={prismaTheme}><main style={{ padding: 16, minWidth: 0 }}>{state === "scope" ? <button onClick={() => setSelectedMembership({...membership,organizationId:"synthetic-other-org"})}>Trocar empresa sintética</button> : null}{content}</main></ConfigProvider>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
