import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, ConfigProvider, Input } from "antd";
import ptBR from "antd/locale/pt_BR";
import { PrismaPage, PrismaPageHeader } from "../../../web/src/ui/PrismaPage";
import { PrismaBackProvider, PrismaViewStateProvider, usePrismaNavigation, usePrismaScreenState, usePrismaViewScreenState, useUnsavedChanges, useViewState } from "../../../web/src/ui/PrismaNavigation";
import { PrismaLoadingFeedback } from "../../../web/src/ui/PrismaLoadingFeedback";
import { prismaTheme } from "../../../web/src/ui/theme";
import { PersonFormPage } from "../../../web/src/pages/PersonFormPage";
import { ProcessAssessmentPage } from "../../../web/src/pages/ProcessAssessmentPage";
import { personIngestionService } from "../../../web/src/infrastructure/supabase/personIngestionService";
import { positionAssessmentService } from "../../../web/src/infrastructure/supabase/positionAssessmentService";
import { processAssessmentService } from "../../../web/src/infrastructure/supabase/processAssessmentService";
import { createDistributionSnapshot } from "../../../src/domain/positionAssessment";
import type { AssessmentWorkspace, PositionAssessment } from "../../../web/src/domain/positionAssessmentData";
import type {ProcessAssessmentWorkspace} from '../../../web/src/domain/processAssessmentData';
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
const calls: string[] = [];
const membership = { organizationId: "company-a", organizationName: "Empresa sintética", role: "recruiter", groupId: null, groupName: null } as const;
const workspace: AssessmentWorkspace = { contract: "position-assessment-1.0.0", organizationId: "company-a", personId: "a", personName: "Pessoa sintética", vacancyId: "p", positionVersionId: "v", positionTitle: "Posição sintética", email: "qa@example.invalid", requirements: [{ id: "r", label: "Requisito sintético", competencyKey: "qa" }], assessments: [], attempts: [] };
positionAssessmentService.load = async () => structuredClone(workspace);
positionAssessmentService.bank = async () => [];
positionAssessmentService.mutate = async (_org, _v, _p, action, a, payload: any) => {
  calls.push(action);
  const result: PositionAssessment = { id: "assessment", organization_id: "company-a", person_id: "a", vacancy_id: "p", position_version_id: "v", revision: (a?.revision ?? 0) + 1, status: "draft", requirements: workspace.requirements, config: { ...payload.config, distribution: createDistributionSnapshot(payload.config.quantity, payload.config.level) }, questions: [], created_at: "2026-10-10T12:00:00Z" };
  workspace.assessments = [result]; return result;
};
for (const name of ["generate", "send", "dispatch"] as const) (positionAssessmentService[name] as any) = async () => { calls.push(name); throw Error("Ação não esperada em teste de retorno"); };
const shared:ProcessAssessmentWorkspace={contract:'process-assessment-1.0.0',organizationId:'company-a',vacancyId:'p',positionVersionId:'v',positionTitle:'Posição sintética',process:{id:'cycle',name:'Acompanhamento 01',status:'active',revision:1,isCurrent:true},requirements:workspace.requirements,candidates:[{personId:'a',name:'Pessoa sintética',email:'qa@example.invalid',stage:'awaiting_evaluation',active:true}],assessment:null,attempts:[],legacy:[],reusable:[]};
processAssessmentService.load=async()=>structuredClone(shared);
processAssessmentService.bank=async()=>Array.from({length:20},(_,i)=>({organizationId:'company-a',id:`q${i}`,version:'fixture-1',requirementId:'r',competencyKey:'qa',difficulty:i<8?'easy':i<16?'medium':'hard',language:'pt-BR',stem:`Questão sintética ${i}`,options:['A','B','C','D','E'].map(id=>({id,label:id})),correctOptionId:'A',explanation:'Justificativa sintética',source:'bank',review:'approved',approvedBy:'actor',provenance:{method:'approved-item-bank',version:'fixture-1',authorId:'actor'}}));
processAssessmentService.mutate=async(_org,_v,action,a,payload:any={})=>{calls.push(action);const next:PositionAssessment=action==='configure'?{id:'shared',organization_id:'company-a',person_id:null,process_id:'cycle',vacancy_id:'p',position_version_id:'v',revision:1,status:'draft',requirements:workspace.requirements,config:{...payload.config,distribution:createDistributionSnapshot(payload.config.quantity,payload.config.level)},questions:[],created_at:'2026-10-10T12:00:00Z'}:{...a!,questions:payload.questions,revision:a!.revision+1};shared.assessment=next;return structuredClone(next);};
for(const name of ['generate','send','dispatch'] as const)(processAssessmentService[name]as any)=async()=>{calls.push(name);throw Error('Ação não esperada em teste de retorno');};
personIngestionService.loadWorkspace = async () => ({ person: { id: "a", fullName: "Pessoa sintética", updatedAt: "2026-10-10T12:00:00Z", profileState: "generated", latestSourceType: "resume_pdf", privateData: { fullName: "Pessoa sintética", email: "qa@example.invalid", phoneCountryIso2: "BR", phoneCountryLabel: "Brasil", phoneCountryCode: "+55", phoneNationalNumber: "", phoneE164: "", birthDate: null, city: "", countryCode: "BR", notes: "" } } } as any);

function Fixture() {
  const [scope, setScope] = useState("no-session:anonymous");
  const navigation = usePrismaNavigation(scope);
  useEffect(() => { const timer = setTimeout(() => setScope("session:user:recruiter:company-a"), 30); return () => clearTimeout(timer); }, []);
  useEffect(() => { Object.assign(window, { __navigationFixture: { navigate: navigation.navigate, scope: setScope, scopeValue: scope, calls } }); }, [navigation.navigate]);
  const navigate = (path: string) => { void navigation.navigate(path); };
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaLoadingFeedback /><PrismaViewStateProvider key={scope} scope={scope}><PrismaBackProvider key={navigation.pathname} value={navigation}><div className="prisma-main-content" style={{ padding: 16 }}>
    {/\/profiles\/a\/edit$/.test(navigation.pathname) ? <PersonFormPage activeMembership={membership} personId="a" onNavigate={navigate} /> : /\/assessment$/.test(navigation.pathname) ? <ProcessAssessmentPage activeMembership={membership} vacancyId="p" initialPersonId="a" onNavigate={navigate} /> : <Screen path={navigation.pathname} navigate={navigate} />}
  </div></PrismaBackProvider></PrismaViewStateProvider></ConfigProvider>;
}
function Screen({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [dirty, setDirty] = useState(false); useUnsavedChanges(dirty);
  const [filter, setFilter] = useViewState("filter", "", path);
  const [step, setStep] = usePrismaScreenState(0);
  const [tab, setTab] = usePrismaViewScreenState("tab", "Resumo", path);
  return <PrismaPage><PrismaPageHeader title={path} /><Input aria-label="Filtro preservado" value={filter} onChange={e => setFilter(e.target.value)} /><Input aria-label="Rascunho" onChange={() => setDirty(true)} /><Button onClick={() => navigate("/profiles")}>Ir para Pessoas</Button><Button onClick={() => navigate("/vacancies")}>Ir para Posições</Button><Button onClick={() => setTab(tab === "Resumo" ? "Documentos" : "Resumo")}>Alternar área</Button><p data-testid="tab">{tab}</p><Button onClick={() => setStep(step + 1)}>Próxima etapa</Button><p data-testid="step">Etapa {step}</p><div style={{ height: 1200 }} /><p>Final da página</p></PrismaPage>;
}
createRoot(document.getElementById("app")!).render(<Fixture />);
