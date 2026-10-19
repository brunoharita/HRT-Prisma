import type {SelfAccount} from '../../../web/src/domain/selfAccount.js';
const role=new URLSearchParams(location.search).get('role')??'member';
export const account:SelfAccount={contract:'operator-self-account-1.0.0',revision:'synthetic-revision',fullName:'Operador Exemplo',username:role==='owner'?'grupoexemplo.owner':'operador.exemplo',email:'contato@example.invalid',phoneCountryIso2:'BR',phoneNationalNumber:'11999999999',profile:role as SelfAccount['profile'],status:'active',groupName:role==='super_admin'?null:'Grupo Exemplo',companies:role==='super_admin'?[]:['Empresa Exemplo','Outra Empresa'],pendingEmail:null};
export const selfAccountService={
 read:async()=>structuredClone(account),
 save:async(input:any)=>{if(input.username==='duplicado')throw Error('O username informado já está em uso.');Object.assign(account,input);return structuredClone(account);},
 requestEmail:async(email:string,currentPassword:string)=>{if(currentPassword!=='Synthetic!987')throw Error('A senha atual não confere.');account.pendingEmail={id:'00000000-0000-4000-8000-000000000500',email,expiresAt:new Date(Date.now()+900000).toISOString(),createdAt:new Date().toISOString(),sendState:'accepted'};return structuredClone(account);},
 confirmEmail:async(_id:string,code:string)=>{if(code!=='12345678')throw Error('Código inválido.');account.email=account.pendingEmail!.email;account.pendingEmail=null;return structuredClone(account);},
 cancelEmail:async()=>{account.pendingEmail=null;return structuredClone(account);},
 password:async(currentPassword:string)=>{if(currentPassword!=='Synthetic!987')throw Error('A senha atual não confere.');(window as any).__selfPasswordChanged=true;},
};
