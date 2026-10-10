// Real page/components, deterministic synthetic data. No external calls, AI or real database.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { VacancyComparePage, VacancyPeoplePage } from "../../../web/src/pages/VacancyPages";
import { vacancyService } from "../../../web/src/infrastructure/supabase/vacancyService";
import { positionFollowUpService } from "../../../web/src/infrastructure/supabase/positionFollowUpService";
import { PrismaViewStateProvider } from "../../../web/src/ui/PrismaNavigation";
import { PrismaLoadingFeedback } from "../../../web/src/ui/PrismaLoadingFeedback";
import { prismaTheme } from "../../../web/src/ui/theme";
import { newVacancyRequirement } from "../../../web/src/domain/vacancy";
import { vacancy, matches, fixture, uuid } from "../position-follow-up/fixture";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const scenario = new URLSearchParams(location.search).get("state") ?? "normal";
vacancy.title = scenario === "long" ? "Desenvolvedor backend de integrações distribuídas e plataformas de dados corporativos" : "Desenvolvedor backend";
vacancy.requirements = ["Abap", "SAP", "Desenvolvimento de APIs REST", "Segurança de aplicações", "RabbitMQ", "Kafka", "Azure", "Docker", "Node.js", "Java", "AWS", "Python", "Kubernetes"].map((label, i) => ({ ...newVacancyRequirement(label), stableId: uuid(200 + i), importance: "required", categoryConfirmed: true, importanceConfirmed: true }));
const match = matches[0]!;
match.candidate.fullName = scenario === "long" ? "Diego Reis de Albuquerque e Vasconcelos e Silva" : "Diego Reis";
match.candidate.location = "Bauru";
match.candidate.profileData.professionalTitle = scenario === "long" ? "Especialista em desenvolvimento e integração de sistemas corporativos e plataformas distribuídas" : "Perfil profissional";
match.discoveryGroup = "main_area";
match.positionRelation.evidence = match.trajectoryAssessment.evidence;
match.requirements = vacancy.requirements.map((requirement, i) => ({ requirement, status: i < 2 ? "met" : "no_evidence", evidence: [], explanation: i < 2 ? "Evidência publicada no Perfil." : "Nenhuma evidência encontrada no Perfil publicado.", relatedSignal: null }));
Object.assign(match.score, { score: 62, coveragePercent: 62, referenceDate: "2026-10-07" });
match.stableResult = { state: "current", evaluationId: uuid(400), calculatedAt: "2026-10-07T12:00:00Z" };
match.detailedStatus = "ready";
match.trajectoryAssessment.explanation = "Atuação direta no núcleo de trabalho da Posição, com evidência publicada, inclusive histórica, sem presumir senioridade.";
match.areaRelation.explanation = "Atuação profissional relacionada ao núcleo da Posição, sustentada por experiência publicada.";
match.positionRelation.explanation = match.trajectoryAssessment.explanation;
match.reasons = [match.trajectoryAssessment.explanation];
for (let i = 1; i < 3; i++) { matches[i]!.candidate.fullName = `Pessoa exemplo ${i}`; matches[i]!.discoveryGroup = "main_area"; matches[i]!.score.score = null; }
if (scenario === "confirmed" || scenario === "dismissed") match.positionDecision = scenario;
if (scenario === "no-evidence") match.positionRelation.evidence = [];
if (scenario === "pending") match.semanticAssessment = { status: "pending" } as never;
if (scenario === "review") match.semanticFallback = { status: "indeterminate", reasonCode: "READINGS_DISAGREE" };
if (scenario === "contextual") match.discoveryGroup = "contextual_signals";
if (scenario === "missing") { match.candidate.profileData.professionalTitle = ""; match.score.score = null; }
fixture.data.entries = fixture.data.entries.slice(0, 1);
fixture.data.process!.isCurrent = true;
if (["empty", "archived"].includes(scenario)) { fixture.data.entries = []; fixture.data.process = scenario === "empty" ? null : { ...fixture.data.process!, id: uuid(505) }; }
if (scenario === "closed") fixture.data.process!.status = "closed";
const state = { calls: [] as { name: string; args?: unknown }[], fail: scenario === "failure", hold: scenario === "loading", mutateFail: false, decisionFail: false, navigations: [] as string[], switchScope: (_organization: string, _vacancy: string) => {}, remount: () => {} };
Object.assign(window, { __peopleFixture: state });
vacancyService.load = async () => vacancy;
vacancyService.findPeople = async () => ({ matches: structuredClone(matches.slice(0, 3)), analyzedProfileCount: 3, publishedProfileCount: 3, queriedProfileRecordCount: 3, expectedProfileRecordCount: 3, complete: true, unclassifiedRequirementCount: 0, unavailablePeople: [] });
vacancyService.recordPositionRelationDecision = async (_v, _m, decision) => { state.calls.push({ name: "decision", args: decision }); await new Promise(r => setTimeout(r, 180)); if (state.decisionFail) throw Error("Falha sintética na relação."); match.positionDecision = decision; };
vacancyService.loadPeopleByIds = async (_org, _v, _ids, _force, _signal, recalculate) => { state.calls.push({ name: recalculate ? "recalculate" : "refresh" }); return structuredClone(scenario === "compare" ? matches.slice(0, 2) : [match]); };
vacancyService.recordEvaluation = async () => { state.calls.push({ name: "evaluate" }); return uuid(400); };
vacancyService.proposePositionRelationToKnowledge = async () => { state.calls.push({ name: "curation" }); };
positionFollowUpService.load = async (organization, position) => {
  state.calls.push({ name: "load-follow-up", args: { organization, position } });
  const result = organization === vacancy.organizationId && position === vacancy.id ? structuredClone(fixture.data) : { ...structuredClone(fixture.data), entries: [] };
  while (state.hold) await new Promise(r => setTimeout(r, 30));
  await new Promise(r => setTimeout(r, 80));
  if (state.fail) throw Error("Falha sintética na consulta de acompanhamento.");
  return result;
};
positionFollowUpService.mutate = async (...args) => {
  state.calls.push({ name: "add-follow-up", args }); await new Promise(r => setTimeout(r, 180));
  if (state.mutateFail) throw Error("Falha sintética na inclusão.");
  if (!fixture.data.process) fixture.data.process = { id: uuid(5), name: "Acompanhamento 1", status: "active", revision: 1, isCurrent: true };
  const entry = { ...fixture.data.entries[0]!, personId: args[3]! };
  fixture.data.entries.push(entry);
  return structuredClone(fixture.data);
};
function App() {
  const [scope, setScope] = useState({ organization: vacancy.organizationId, position: vacancy.id! }), [key, setKey] = useState(0);
  state.switchScope = (organization, position) => setScope({ organization, position }); state.remount = () => setKey(x => x + 1);
  const props = { activeMembership: { organizationId: scope.organization, organizationName: "Empresa exemplo", role: scenario === "member" ? "member" as const : "recruiter" as const, groupId: null, groupName: null }, vacancyId: scope.position, onNavigate: (path: string) => state.navigations.push(path) };
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaViewStateProvider scope="synthetic-compact"><PrismaLoadingFeedback />{scenario === "compare" ? <VacancyComparePage {...props} personIds={[match.candidate.personId, matches[1]!.candidate.personId]} /> : <VacancyPeoplePage key={key} {...props} />}</PrismaViewStateProvider></ConfigProvider>;
}
createRoot(document.getElementById("root")!).render(<App />);
