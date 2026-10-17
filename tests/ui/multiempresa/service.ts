import { ORGANIZATION_ADMIN_CONTRACT as contract, type ManagedGroup, type ManagedCompanyUser } from "../../../web/src/domain/organizationAdministration.js";
const params=new URLSearchParams(location.search),profile=params.get("profile")??"super_admin";
const groups:ManagedGroup[]=[{id:"group-a",name:"Grupo Horizonte",status:"active",plan:"professional",companyLimit:3,activeCount:2,companyCount:2,primaryOrganizationId:"company-a",revision:1,termsStatus:"provisional",owner:{name:"Owner sintético",status:"active"},companies:[{id:"company-a",name:"Empresa Horizonte",status:"active",groupId:"group-a",users:3},...(profile==="recruiter"?[]:[{id:"company-b",name:"Empresa Aurora",status:"active" as const,groupId:"group-a",users:2}])]},...(profile==="super_admin"?[{id:"group-b",name:"Grupo Independente",status:"draft" as const,plan:"professional" as const,companyLimit:1,activeCount:0,companyCount:1,primaryOrganizationId:"company-c",revision:1,termsStatus:"provisional" as const,owner:null,companies:[{id:"company-c",name:"Primeira empresa",status:"draft" as const,groupId:"group-b",users:0}]}]:[])];
// Same illustrative records as the approved visual proposal; no production data.
if(params.has("visual"))groups.splice(0,groups.length,...[
 {id:"group-a",name:"Grupo principal",status:"active",plan:"professional",companyLimit:2,activeCount:2,companyCount:2,primaryOrganizationId:"company-a",revision:1,termsStatus:"provisional",owner:{name:"[QA M2-C] owner",status:"active"},companies:[{id:"company-a",name:"Prisma",status:"active",groupId:"group-a",users:5},{id:"company-b",name:"Prisma QA Beta",status:"active",groupId:"group-a",users:2}]},
 ...[{id:"group-b",name:"HRT Solutions",company:"HRT Solutions"},{id:"group-c",name:"VCI Brasil",company:"VCI - Bauru"}].map(g=>({id:g.id,name:g.name,status:"draft" as const,plan:"professional" as const,companyLimit:1,activeCount:0,companyCount:1,primaryOrganizationId:g.id+"-company",revision:1,termsStatus:"provisional" as const,owner:null,companies:[{id:g.id+"-company",name:g.company,status:"draft" as const,groupId:g.id,users:0}]}))
] satisfies ManagedGroup[]);
if(params.has("sorting"))groups.forEach((group,index)=>{
 group.createdAt=["2026-01-10T12:00:00Z","2026-03-10T12:00:00Z","2026-02-10T12:00:00Z"][index]??null;
 group.updatedAt=["2026-03-10T12:00:00Z","2026-01-10T12:00:00Z","2026-02-10T12:00:00Z"][index]??null;
 group.companies.forEach((company,i)=>{company.createdAt=i?"2026-01-10T12:00:00Z":"2026-02-10T12:00:00Z";company.updatedAt=i?"2026-03-10T12:00:00Z":"2026-02-10T12:00:00Z";});
});
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
