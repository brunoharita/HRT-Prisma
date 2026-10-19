type PlatformUserUpsertInput = Record<string, unknown>;
export const groupId='00000000-0000-4000-8000-000000000100',companyId='00000000-0000-4000-8000-000000000110';
const company={id:companyId,name:'Empresa inicial',groupId,groupName:'HRT Solutions'};
const group={id:groupId,name:'HRT Solutions',organizations:[company]};
const operator={id:'actor',authUserId:'actor',fullName:'Operador sintético',username:'fixture.super',email:'fixture@example.invalid',status:'active',profile:'super_admin',groupId:null,groupName:null,mustChangePassword:false};
const scenario=()=>new URLSearchParams(location.search).get('fail');
const firstAccess=()=>new URLSearchParams(location.search).get('firstAccess');
export const platformUsersService={
 completeFirstAccess:async()=>{(window as any).__firstAccessCompleted=true;},
 loadBootstrapData:async()=>({currentOperator:operator,groups:[group],users:[]}),
 loadOwnerContext:async(id:string)=>{if(scenario()==='context'||id!==groupId)throw Error('Contexto indisponível. Volte ao grupo.');return {contract:'owner-onboarding-1.0.0',username:'hrtsolutions.owner',profile:'owner',group:{id:groupId,name:group.name},company:{id:companyId,name:company.name}};},
 loadUser:async()=>({id:'edit-user',authUserId:'edit-auth',fullName:'Usuário sintético',username:'fixture.member',email:'fixture@example.invalid',phoneCountryIso2:'BR',phoneNationalNumber:'11999999999',profile:'member',status:firstAccess()??'active',groupId,groupName:group.name,allowedOrganizations:[company]}),
 createUser:async(input:PlatformUserUpsertInput)=>{(window as any).__submitted={action:'generic',input};},
 createOwner:async(id:string,input:PlatformUserUpsertInput)=>{if(scenario()==='create')throw Error('Falha sintética; rascunho preservado.');(window as any).__submitted={action:'owner',groupId:id,input};},
 updateUser:async(_id:string,input:PlatformUserUpsertInput)=>{(window as any).__submitted={action:'update',input};},
};
export const organizationAdministrationService={workspace:async()=>({contract:'organization-administration-1.0.0',isSuper:true,groups:[{id:groupId,name:group.name,status:'draft',plan:'professional',companyLimit:1,companyCount:1,activeCount:0,primaryOrganizationId:companyId,revision:1,owner:null,companies:[{id:companyId,name:company.name,status:'draft',users:0}]}]})};
