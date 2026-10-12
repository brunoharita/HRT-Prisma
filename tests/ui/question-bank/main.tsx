import {createRoot} from "react-dom/client";
import {useState} from "react";
import {ConfigProvider,Button} from "antd";
import ptBR from "antd/locale/pt_BR";
import {AssessmentItemBankPage} from "../../../web/src/pages/AssessmentItemBankPage";
import {PrismaBackProvider,PrismaViewStateProvider} from "../../../web/src/ui/PrismaNavigation";
import {PrismaLoadingFeedback} from "../../../web/src/ui/PrismaLoadingFeedback";
import {prismaTheme} from "../../../web/src/ui/theme";
import "./fixture";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
function Harness(){const [org,setOrg]=useState("org-fixture"),role=new URLSearchParams(location.search).get("role")??"super_admin";return <ConfigProvider locale={ptBR} theme={prismaTheme}><PrismaViewStateProvider key={org} scope={org}><PrismaBackProvider value={{canGoBack:false,goingBack:false,goBack:async()=>false}}><main style={{padding:innerWidth<600?12:24,minHeight:"100vh",background:"#f5f7fb"}}><AssessmentItemBankPage activeMembership={{organizationId:org,organizationName:"Empresa sintética",role,groupId:null,groupName:null} as never}/><Button onClick={()=>setOrg(org==="org-fixture"?"other-org-fixture":"org-fixture")}>Trocar organização da fixture</Button></main><PrismaLoadingFeedback/></PrismaBackProvider></PrismaViewStateProvider></ConfigProvider>;}
createRoot(document.getElementById("app")!).render(<Harness/>);
