import {useState} from "react";
import {createRoot} from "react-dom/client";
import {ConfigProvider} from "antd";
import ptBR from "antd/locale/pt_BR";
import {HomeFilled,TeamOutlined,CarryOutFilled,BulbFilled,SettingFilled} from "@ant-design/icons";
import {HomePage} from "../../../web/src/pages/HomePage";
import {PeoplePage} from "../../../web/src/pages/PeoplePage";
import {VacanciesPage,VacancyEditorPage} from "../../../web/src/pages/VacancyPages";
import {KnowledgePage} from "../../../web/src/pages/KnowledgePage";
import {SettingsPage} from "../../../web/src/pages/SettingsPage";
import {PrismaAppShell} from "../../../web/src/ui/PrismaAppShell";
import {PrismaViewStateProvider} from "../../../web/src/ui/PrismaNavigation";
import {prismaTheme} from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const membership={organizationId:"org-fixture",organizationName:"Empresa sintética",role:"super_admin",status:"active"} as never;
const repository={loadHomeSummary:async()=>({peopleCount:24,structuredProfilesCount:18,openVacanciesCount:6,knowledgeSources:[]})} as never;
const navigationItems=[{path:"/",label:"Início",icon:<HomeFilled/>},{path:"/profiles",label:"Pessoas",icon:<TeamOutlined/>},{path:"/vacancies",label:"Posições",icon:<CarryOutFilled/>},{path:"/knowledge",label:"Conhecimento",icon:<BulbFilled/>},{path:"/settings",label:"Configurações",icon:<SettingFilled/>}];
function Harness(){
 const initial=new URLSearchParams(location.search).get("page")??"/";
 const [path,setPath]=useState(initial);
 const props={activeMembership:membership,onNavigate:setPath};
 const content=path==="/profiles"?<PeoplePage {...props} repository={repository}/>:path==="/vacancies"?<VacanciesPage {...props}/>:path==="/vacancies/new"?<VacancyEditorPage {...props}/>:path==="/knowledge"?<KnowledgePage activeMembership={membership} profile="super_admin"/>:path==="/settings"?<SettingsPage organizationId="org-fixture"/>:<HomePage {...props} repository={repository}/>;
 return <ConfigProvider theme={prismaTheme} locale={ptBR}><PrismaViewStateProvider scope="org-fixture"><PrismaAppShell navigationItems={navigationItems} selectedPath={path} memberships={[membership]} activeMembership={membership} profileName="Operador sintético" profileSubtitle="Administrador" onNavigate={setPath} onOrganizationChange={()=>undefined} onSignOut={()=>undefined}>{content}</PrismaAppShell></PrismaViewStateProvider></ConfigProvider>;
}
createRoot(document.getElementById("app")!).render(<Harness/>);
