import type {SelectionProcess} from "../../../web/src/domain/selectionProcess.js";
export const id=(n:number)=>`26000000-0000-0000-0000-${String(n).padStart(12,"0")}`;
export const org=id(1);
const row=(n:number,title:string,candidates:number,status:"active"|"closed",occupancy:"vacant"|"occupied",sequence=1):SelectionProcess=>({organizationId:org,id:id(n),vacancyId:id(100+n),title,name:`Processo ${String(sequence).padStart(2,"0")}`,sequence,status,occupancy,isCurrent:true,revision:1,createdAt:"2026-10-14T12:00:00Z",candidates,stages:{awaiting_evaluation:4,awaiting_interview:3,interview_scheduled:2,awaiting_decision:2,decision_recorded:1,closed:0}});
export const processes=[row(2,"Desenvolvedor backend",12,"active","vacant"),row(3,"Analista financeiro",8,"active","vacant",2),row(4,"Assistente administrativo",10,"closed","occupied")];
export const fixture={calls:[] as {name:string;args:Record<string,any>}[],processes,fail:false,hold:false,role:"recruiter",navigations:[] as string[]};
Object.assign(window,{__selectionFixture:fixture});
export const transport={async rpc(name:string,args:Record<string,any>){
 fixture.calls.push({name,args});while(fixture.hold)await new Promise(r=>setTimeout(r,20));await new Promise(r=>setTimeout(r,40));
 if(fixture.fail)return {data:null,error:{code:"50000",message:"Synthetic failure"}};
 if(name==="get_selection_process_workspace"){
  const selected=args.p_selected_process_id?processes.find(p=>p.id===args.p_selected_process_id):null;
  if(args.p_selected_process_id&&!selected)return {data:null,error:{code:"42501",message:"Not found"}};
  const rows=processes.filter(p=>(!args.p_vacancy_id||p.vacancyId===args.p_vacancy_id)&&(args.p_status==="all"||p.status===args.p_status)&&(!args.p_search||(p.title+" "+p.name).toLowerCase().includes(args.p_search.toLowerCase())));
  return {data:{contract:"selection-process-management-1.0.0",organizationId:args.p_organization_id,processes:rows,selected,total:rows.length,pageSize:50,counts:{active:processes.filter(p=>p.status==="active").length,closed:processes.filter(p=>p.status==="closed").length}},error:null};
 }
 if(name==="get_selection_process_positions")return {data:{contract:"selection-process-management-1.0.0",organizationId:org,positions:[{organizationId:org,id:id(8),title:"Analista de qualidade",processId:null,revision:null}],total:1,pageSize:50},error:null};
 if(name==="start_position_selection_process"){
  let p=processes.find(p=>p.vacancyId===args.p_vacancy_id);
  if(!p){p=row(8,"Analista de qualidade",0,"active","vacant");p.vacancyId=args.p_vacancy_id;p.stages={};processes.push(p);}
  return {data:{contract:"position-follow-up-1.0.0",process:{id:p.id,name:p.name,status:p.status,revision:1,isCurrent:true,sequence:1},entries:[],history:[],operators:[]},error:null};
 }
 const p=processes.find(p=>p.id===args.p_process_id);
 if(name==="mutate_position_follow_up_process"&&p){p.status=args.p_action==="close_process"?"closed":"active";p.revision++;return {data:{contract:"position-follow-up-1.0.0",process:p,entries:[],history:[],operators:[]},error:null};}
 if(name==="get_position_follow_up_process")return {data:{contract:"position-follow-up-1.0.0",process:p,entries:[],operators:[],history:[{id:id(30),entryId:null,action:"start_process",actor:"Pessoa operadora",at:"2026-10-14T12:00:00Z",before:null,after:{}}]},error:null};
 return {data:null,error:{code:"50000",message:"Unexpected RPC "+name}};
}};
