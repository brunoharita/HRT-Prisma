// Real discovery page with synthetic services. No production database or AI.
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { VacancyComparePage, VacancyPeoplePage } from "../../../web/src/pages/VacancyPages";
import { vacancyService } from "../../../web/src/infrastructure/supabase/vacancyService";
import { PrismaViewStateProvider } from "../../../web/src/ui/PrismaNavigation";
import { PrismaLoadingFeedback } from "../../../web/src/ui/PrismaLoadingFeedback";
import { prismaTheme } from "../../../web/src/ui/theme";
import { vacancy, matches, fixture } from "../position-follow-up/fixture";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const scenario = new URLSearchParams(location.search).get("state");
vacancy.title = scenario === "long" ? "Desenvolvedor backend de integrações distribuídas e plataformas de dados corporativos" : "Desenvolvedor backend";
const match = matches[0]!;
match.discoveryGroup = "main_area";
match.positionRelation.evidence = match.trajectoryAssessment.evidence;
if (scenario === "confirmed" || scenario === "dismissed") match.positionDecision = scenario;
if (scenario === "no-evidence") match.positionRelation.evidence = [];
if (scenario === "pending") match.semanticAssessment = { status: "pending" } as never;
if (scenario === "review") match.semanticFallback = { status: "indeterminate", reasonCode: "READINGS_DISAGREE" };
if (scenario === "compare") { match.positionDecision = "confirmed"; matches[1]!.positionDecision = "dismissed"; }
const calls: { name: string; decision?: string }[] = [];
const state = { calls, fail: false, hold: false, delay: 180, navigations: fixture.navigations };
Object.assign(window, { __relationFixture: state });
async function operation(name: string, decision?: string) {
  calls.push({ name, ...(decision ? { decision } : {}) });
  while (state.hold) await new Promise(resolve => setTimeout(resolve, 30));
  await new Promise(resolve => setTimeout(resolve, state.delay));
  if (state.fail) throw new Error("Falha sintética ao registrar a relação.");
}
vacancyService.load = async () => vacancy;
vacancyService.findPeople = async () => ({ matches: [match], analyzedProfileCount: 1, publishedProfileCount: 1, queriedProfileRecordCount: 1, expectedProfileRecordCount: 1, complete: true, unclassifiedRequirementCount: 0, unavailablePeople: [] });
vacancyService.recordPositionRelationDecision = async (_vacancy, _match, decision) => { await operation("decision", decision); match.positionDecision = decision; };
vacancyService.loadPeopleByIds = async () => { await operation("refresh"); return scenario === "compare" ? structuredClone(matches.slice(0, 2)) : [structuredClone(match)]; };
vacancyService.proposePositionRelationToKnowledge = async () => { await operation("curation"); };
const props = { activeMembership: { organizationId: vacancy.organizationId, organizationName: "Empresa exemplo", role: "recruiter" as const, groupId: null, groupName: null }, vacancyId: vacancy.id!, onNavigate: (path: string) => fixture.navigations.push(path) };
createRoot(document.getElementById("root")!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaViewStateProvider scope="synthetic-relation"><PrismaLoadingFeedback />{scenario === "compare" ? <VacancyComparePage {...props} personIds={[match.candidate.personId, matches[1]!.candidate.personId]} /> : <VacancyPeoplePage {...props} />}</PrismaViewStateProvider></ConfigProvider>);
