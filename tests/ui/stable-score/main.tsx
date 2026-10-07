import {useState} from "react";
import {createRoot} from "react-dom/client";
import {ConfigProvider,Button} from "antd";
import ptBR from "antd/locale/pt_BR";
import {VacancyPeoplePage,VacancyComparePage} from "../../../web/src/pages/VacancyPages";
import {vacancyService} from "../../../web/src/infrastructure/supabase/vacancyService";
import {PrismaViewStateProvider} from "../../../web/src/ui/PrismaNavigation";
import {prismaTheme} from "../../../web/src/ui/theme";
import {PrismaLoadingFeedback} from "../../../web/src/ui/PrismaLoadingFeedback";
import {vacancy,candidates,review,scenario} from "./fixture";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
vacancyService.load=async()=>vacancy;
Object.assign(vacancyService,review);
const membership={organizationId:vacancy.organizationId,role:scenario==="member"?"member":"recruiter"} as never;
function App(){const [key,setKey]=useState(0),[compare,setCompare]=useState(false);return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaViewStateProvider scope="synthetic"><PrismaLoadingFeedback/><Button onClick={()=>setKey(k=>k+1)}>Reabrir tela</Button><Button onClick={()=>setCompare(c=>!c)}>Alternar comparação</Button>{compare?<VacancyComparePage key={key} activeMembership={membership} vacancyId={vacancy.id!} personIds={[candidates[0]!.personId,candidates[1]!.personId]} onNavigate={()=>{}}/>:<VacancyPeoplePage key={key} activeMembership={membership} vacancyId={vacancy.id!} onNavigate={()=>{}}/>}</PrismaViewStateProvider></ConfigProvider>;}
createRoot(document.getElementById("root")!).render(<App/>);
