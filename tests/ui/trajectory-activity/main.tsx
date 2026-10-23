import {createRoot} from "react-dom/client";
import {useState} from "react";
import {ConfigProvider} from "antd";
// Exports are injected only by the fixture's Vite transform.
// @ts-expect-error test-only exports
import {CandidateMatchCard,MatchDrawer} from "../../../web/src/pages/VacancyPages";
import {emptyVacancyDraft,matchVacancyCandidate,newVacancyRequirement,type VacancyDetail} from "../../../web/src/domain/vacancy";
import type {PublishedProfileCandidate} from "../../../web/src/domain/profileDiscovery";
import {prismaTheme} from "../../../web/src/ui/theme";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const vacancy:VacancyDetail={...emptyVacancyDraft(),id:"v",versionId:"v1",version:1,organizationId:"o",title:"Gerente de Estoque",area:"Estoque",experiencePolicy:"required",createdAt:"",updatedAt:"",jobRoleName:"",occupantName:null,
  responsibilities:["Gestão de estoque"],requirements:[{...newVacancyRequirement("Gestão de pessoas"),importance:"required",importanceConfirmed:true}]};
const scenario=new URLSearchParams(location.search).get("case")??"related";
const candidate:PublishedProfileCandidate={personId:"person",profileId:"p1",profileVersion:1,fullName:"Pessoa sintética",lifecycle:"candidate",operationalStatus:"active",location:null,publishedAt:"",knowledge:[],
  profileData:{identity:{fullName:"Pessoa sintética"},contact:{email:null,phone:null,linkedin:null,city:null,state:null},professionalTitle:"Coordenador de Planejamento e Controle",summary:null,professionalObjective:null,keyResults:[],areasOfExpertise:[],
    experiences:[{id:"e1",role:"Coordenador de Planejamento e Controle",description:scenario==="related"?"Coordenação de planejamento e controle de estoque com inventários periódicos.":scenario==="uncertain"?"Atuação integrada com estoque e outras áreas.":"Utilizei SAP na emissão de notas fiscais.",organization:"Empresa sintética",period:"01/01/2020 - 31/12/2025",evidenceText:"",source:"human",page:null}],
    education:[],competencies:scenario==="contextual"?["SAP"]:[],languages:[],certifications:[],customSections:[],uncertainties:[],notIdentified:[]}};
const match=matchVacancyCandidate(vacancy,candidate,null,[],[],"2026-10-23");
const events:string[]=[];Object.assign(window,{__trajectoryActivity:{events,group:match.discoveryGroup}});
function App(){const[open,setOpen]=useState(false);const[selected,setSelected]=useState(false);return <ConfigProvider theme={prismaTheme}><main className="prisma-page" style={{padding:16}}><h1>Pessoas para Gerente de Estoque</h1><CandidateMatchCard match={match} vacancy={vacancy} initiallyExpanded canReview deciding={false} selected={selected} onToggle={()=>{events.push("compare");setSelected(!selected);}} onNavigate={(path:string)=>events.push(path)} onEvaluate={()=>setOpen(true)} onDecision={(value:string)=>events.push(value)} onRecalculate={()=>events.push("recalculate")}/><MatchDrawer match={match} vacancy={vacancy} open={open} evaluationId={null} onClose={()=>setOpen(false)} onNavigate={(path:string)=>events.push(path)}/></main></ConfigProvider>;}
createRoot(document.getElementById("root")!).render(<App/>);
