import { followUpColumns } from "./positionFollowUp.js";
export const SELECTION_PROCESS_CONTRACT = "selection-process-management-1.0.0";
export interface SelectionProcess {
 organizationId:string; id:string; vacancyId:string; title:string; name:string; sequence:number;
 status:"active"|"closed"; revision:number; isCurrent:boolean; occupancy:"vacant"|"occupied"|null;
 createdAt:string; candidates:number; stages:Record<string,number>;
}
export interface SelectionWorkspace {
 contract:typeof SELECTION_PROCESS_CONTRACT; organizationId:string; processes:SelectionProcess[];
 selected:SelectionProcess|null; total:number; pageSize:number; counts:{active:number;closed:number};
}
export interface SelectionPosition {organizationId:string;id:string;title:string;processId:string|null;revision:number|null;}
export const processPath = (process:Pick<SelectionProcess,"id">) => `/selection-processes/${process.id}`;
export const processFollowUpPath = (process:Pick<SelectionProcess,"id"|"vacancyId">) => `/vacancies/${process.vacancyId}/follow-up/processes/${process.id}`;
export const processStageRows = (process:SelectionProcess) => [...followUpColumns.map(c=>({...c,count:process.stages[c.key]??0})),...(process.stages.closed?[{key:"closed",title:"Concluídos",count:process.stages.closed}]:[])];
export const processOccupancy = (occupancy:SelectionProcess["occupancy"]) => occupancy==="vacant"?"Posição desocupada":occupancy==="occupied"?"Posição ocupada":"Ocupação não informada";
