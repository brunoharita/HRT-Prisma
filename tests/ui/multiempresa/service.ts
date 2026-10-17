import { ORGANIZATION_ADMIN_CONTRACT as contract, type ManagedGroup, type ManagedCompanyUser } from "../../../web/src/domain/organizationAdministration.js";
const params=new URLSearchParams(location.search),profile=params.get("profile")??"super_admin";
const groups:ManagedGroup[]=[{id:"group-a",name:"Grupo Horizonte",status:"active",plan:"professional",companyLimit:3,activeCount:2,companyCount:2,primaryOrganizationId:"company-a",revision:1,termsStatus:"provisional",owner:{name:"Owner sintético",status:"active"},companies:[{id:"company-a",name:"Empresa Horizonte",status:"active",groupId:"group-a",users:3},...(profile==="recruiter"?[]:[{id:"company-b",name:"Empresa Aurora",status:"active" as const,groupId:"group-a",users:2}])]},...(profile==="super_admin"?[{id:"group-b",name:"Grupo Independente",status:"draft" as const,plan:"professional" as const,companyLimit:1,activeCount:0,companyCount:1,primaryOrganizationId:"company-c",revision:1,termsStatus:"provisional" as const,owner:null,companies:[{id:"company-c",name:"Primeira empresa",status:"draft" as const,groupId:"group-b",users:0}]}]:[])];
const users:ManagedCompanyUser[]=[{id:"user-a",name:"Recruiter sintético",profile:"recruiter",linked:true,isDefault:true,canEdit:true},{id:"user-b",name:"Usuário comum sintético",profile:"member",linked:false,isDefault:false,canEdit:true}];
const host=window as unknown as {__calls:unknown[]};host.__calls=[];
export const organizationAdministrationService={
 async workspace(){return structuredClone({contract,isSuper:profile==="super_admin",groups});},
 async links(){return structuredClone(users);},
 async run(action:string,groupId:string|null=null,organizationId:string|null=null,input:Record<string,unknown>={}){
  host.__calls.push({action,groupId,organizationId,input});
  if(params.has("fail"))throw Error("Falha sintética. Os dados confirmados foram preservados.");
  const group=groups.find(g=>g.id===groupId);
  if(action==="create_company"&&group){group.companies.push({id:"new-company",name:String(input.name),groupId:group.id,status:"active",users:2});group.activeCount++;group.companyCount++;group.revision++;}
  if(action==="configure_group"&&group){Object.assign(group,input);group.revision++;}
  if(action==="configure_company"&&group){Object.assign(group.companies.find(c=>c.id===organizationId)!,input);group.revision++;}
  if(action==="save_link"){const user=users.find(u=>u.id===input.userId)!;user.linked=Boolean(input.linked);if(group)group.revision++;}
  return {contract,ok:true};
 },
};
