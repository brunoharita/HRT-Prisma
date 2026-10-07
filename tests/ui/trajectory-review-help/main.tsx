import {createRoot} from "react-dom/client";
import {ConfigProvider} from "antd";
import ptBR from "antd/locale/pt_BR";
import {TrajectoryConflictReview} from "../../../web/src/components/TrajectoryConflictReview";
import type {VacancyCandidateMatch,VacancyDetail} from "../../../web/src/domain/vacancy";
import {fixture,scenario} from "./fixture";
import {prismaTheme} from "../../../web/src/ui/theme";
import "antd/dist/reset.css";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";

const vacancy={organizationId:"synthetic-org",versionId:"synthetic-position",title:"Desenvolvedor backend"} as VacancyDetail;
const match={candidate:{profileId:"synthetic-profile",profileVersion:1,fullName:"Pessoa de demonstração"},score:{inputFingerprint:"synthetic-input",referenceDate:"2026-10-07"},semanticFallback:{status:"indeterminate",reasonCode:"READINGS_DISAGREE"}} as unknown as VacancyCandidateMatch;
createRoot(document.getElementById("root")!).render(<ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{padding:24}}><h1>Pessoas por Posição</h1><p>Cálculo anterior preservado para demonstração.</p><TrajectoryConflictReview vacancy={vacancy} match={match} canReview={scenario!=="unauthorized"} onResolved={()=>{fixture.resolved++;}}/></main></ConfigProvider>);
