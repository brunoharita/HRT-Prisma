import {useState} from "react";import {createRoot} from "react-dom/client";
import {ConfigProvider} from "antd";import ptBR from "antd/locale/pt_BR";
import {TeamOutlined,UserOutlined,AppstoreOutlined} from "@ant-design/icons";
import {PositionFollowUpPage} from "../../../web/src/pages/PositionFollowUpPage";
import {VacancyPeoplePage} from "../../../web/src/pages/VacancyPages";
import {vacancyService} from "../../../web/src/infrastructure/supabase/vacancyService";
import {PrismaAppShell} from "../../../web/src/ui/PrismaAppShell";
import {PrismaViewStateProvider} from "../../../web/src/ui/PrismaNavigation";
import {PrismaLoadingFeedback} from "../../../web/src/ui/PrismaLoadingFeedback";
import {prismaTheme} from "../../../web/src/ui/theme";
import {vacancy,matches,fixture,scenario} from "./fixture";
import "antd/dist/reset.css";import "../../../web/src/styles.css";import "../../../web/src/ui/foundation.css";
vacancyService.load=async()=>vacancy;
vacancyService.findPeople=async()=>({matches,analyzedProfileCount:4,publishedProfileCount:4,queriedProfileRecordCount:4,expectedProfileRecordCount:4,complete:true,unclassifiedRequirementCount:0,unavailablePeople:[]}) as never;
const membership={organizationId:vacancy.organizationId,organizationName:"Empresa exemplo",role:scenario==="member"?"member":"recruiter",groupId:null,groupName:null} as const;
function App(){const [path,setPath]=useState(`/vacancies/${vacancy.id}/follow-up`);const person=path.split("/follow-up/")[1];const navigate=(path:string)=>{fixture.navigations.push(path);setPath(path);};return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaViewStateProvider scope="synthetic-v220"><PrismaLoadingFeedback/><PrismaAppShell activeMembership={membership} memberships={[membership]} navigationItems={[{path:"/",label:"Visão geral",icon:<AppstoreOutlined/>},{path:"/profiles",label:"Pessoas",icon:<UserOutlined/>},{path:"/vacancies",label:"Posições",icon:<TeamOutlined/>}]} selectedPath="/vacancies" profileName="Bruno" profileSubtitle="Recrutador" onNavigate={navigate} onOrganizationChange={()=>{}} onSignOut={()=>{}}>
 {path.endsWith("/people")?<VacancyPeoplePage activeMembership={membership} vacancyId={vacancy.id!} onNavigate={navigate}/>:<PositionFollowUpPage activeMembership={membership} vacancyId={vacancy.id!} {...(person?{personId:person}:{})} onNavigate={navigate}/>}
 </PrismaAppShell></PrismaViewStateProvider></ConfigProvider>;}
createRoot(document.getElementById("root")!).render(<App/>);
