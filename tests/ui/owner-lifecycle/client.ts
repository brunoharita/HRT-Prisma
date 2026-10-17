const group=(id:string,name:string,status:string,ownerStatus:string,configuredStatus=status)=>({id,name,status,configuredStatus,ownerSuspended:ownerStatus!=='active',ownerSuspensionReason:ownerStatus!=='active'?'Aguardando Owner ativo.':null,plan:'professional',companyLimit:5,companyCount:2,activeCount:1,primaryOrganizationId:id+'-1',revision:1,termsStatus:'provisional',owner:{id:id+'-owner',name:'Owner '+name,username:id+'.owner',status:ownerStatus},companies:[{id:id+'-1',groupId:id,name:'Empresa inicial',status:status==='draft'?'draft':'active',users:2},{id:id+'-2',groupId:id,name:'Empresa inativa',status:'inactive',users:0}]});
const groups=[group('group-a','Grupo A','active','active'),group('group-b','Grupo B','draft','pending_first_access'),group('group-c','Grupo C','inactive','inactive')];
(window as any).__calls=[];
export const supabase={rpc:async(name:string,input:any)=>{
 if(name==='organization_administration')return {data:{contract:input.p_contract,isSuper:new URLSearchParams(location.search).get('profile')!=='recruiter',groups:structuredClone(groups)},error:null};
 if(name==='group_owner_lifecycle_v307'){
  const g=groups.find(g=>g.id===input.p_group)!;
  if(input.p_action==='candidates')return {data:{contract:input.p_contract,candidates:[{id:g.id+'-candidate',name:'Novo responsável',username:'candidate.user',profile:'recruiter'}]},error:null};
  (window as any).__calls.push(structuredClone(input));
  if(new URLSearchParams(location.search).get('fail')==='stale')return {data:null,error:{code:'40001',message:'Stale'}};
  if(input.p_action==='deactivate'){g.owner.status='inactive';g.ownerSuspended=true;g.ownerSuspensionReason=input.p_reason;if(g.status==='active')g.status='inactive';}
  if(input.p_action==='reactivate'){g.owner.status='active';g.ownerSuspended=false;g.ownerSuspensionReason=null;g.status=g.configuredStatus;}
  if(input.p_action==='replace'){g.owner={id:input.p_target_owner,name:'Novo responsável',username:'candidate.user',status:'active'};g.ownerSuspended=false;g.ownerSuspensionReason=null;g.status=g.configuredStatus;}
  g.revision++;return {data:{contract:input.p_contract,ok:true},error:null};
 }
 throw Error('Unexpected fixture RPC '+name);
}};
