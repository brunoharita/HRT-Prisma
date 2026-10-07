import {StrictMode,useState} from "react";
import {createRoot} from "react-dom/client";
import {ConfigProvider,Button,Input,Modal} from "antd";
import ptBR from "antd/locale/pt_BR";
import {PrismaLoadingFeedback,useLoadingFeedback,useLoadingTask} from "../../../web/src/ui/PrismaLoadingFeedback";
import {PrismaViewStateProvider} from "../../../web/src/ui/PrismaNavigation";
import {PrismaState} from "../../../web/src/ui/PrismaState";
import {prismaTheme} from "../../../web/src/ui/theme";
import {CompetencyGroupModal} from "../../../web/src/components/profile/CompetencyGroupModal";
import {service,request} from "./fixture";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";

const name=new URLSearchParams(location.search).get("page")??"Core";
const common={activeMembership:{organizationId:"10000000-0000-0000-0000-000000000001",organizationName:"Empresa sintética",role:"super_admin",status:"active"},repository:service,onNavigate:()=>{},personId:"10000000-0000-0000-0000-000000000002",documentId:"doc",reviewId:"review",vacancyId:"position",personIds:["a","b"],organizationId:"org",profile:"super_admin",mode:"edit",token:"synthetic",needId:"need",currentOperator:{username:"synthetic",profile:"super_admin"},onPasswordCompleted:async()=>{}};
function Core(){
 const first=useLoadingTask("Atualizando informações…"),second=useLoadingTask("Calculando resultado…");
 const [value,setValue]=useState("Rascunho preservado"),[show,setShow]=useState(false),[modal,setModal]=useState(false),[error,setError]=useState(false);
 const run=(activity:typeof first)=>void activity.run(request).catch(()=>setError(true));
 return <div className="prisma-page"><h1>Estado de carregamento</h1><p>Score salvo: 73/100</p><Input aria-label="Rascunho" value={value} onChange={e=>setValue(e.target.value)}/><Button onClick={()=>run(first)}>Atualizar</Button><Button onClick={()=>run(second)}>Calcular</Button><Button onClick={()=>setShow(!show)}>Alternar bloco</Button><Button onClick={()=>setModal(true)}>Abrir modal</Button>{show?<Block/>:null}<CompetencyGroupModal concept={modal?{id:"concept",label:"Competência sintética",scope:"organization"} as never:null} adapter={{loadSubgroups:request,canUseGlobal:true} as never} onClose={()=>setModal(false)} onProjection={()=>{}}/>{error?<p role="alert">Falha sintética; resultado anterior preservado.</p>:null}</div>;
}
function Block(){useLoadingFeedback({"Carregando bloco…":true});return <PrismaState kind="loading" compact title="Carregando bloco…"/>;}
const modules=import.meta.glob("../../../web/src/pages/*.tsx");
const file=/^(Vacancy|Vacancies)/.test(name)?"VacancyPages":name;
const module=name==="Core"?null:name==="PrismaApplication"?await import("../../../web/src/app/PrismaApplication"):await modules[`../../../web/src/pages/${file}.tsx`]!();
if(name==="PrismaApplication")history.replaceState({},"","/sign-in");
const Page=name==="Core"?Core:(module as Record<string,React.ComponentType<any>>)[name]!;
function Harness(){const [mounted,setMounted]=useState(true);return <StrictMode><ConfigProvider theme={prismaTheme} locale={ptBR}><PrismaViewStateProvider scope="synthetic-loading"><PrismaLoadingFeedback/><Button onClick={()=>setMounted(false)}>Desmontar tela</Button>{mounted?<Page {...common}/>:<p>Tela encerrada</p>}</PrismaViewStateProvider></ConfigProvider></StrictMode>;}
createRoot(document.getElementById("app")!).render(<Harness/>);
