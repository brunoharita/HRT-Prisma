import {supabase} from "./client";
import {SELF_ACCOUNT_CONTRACT,type SelfAccount,type SelfAccountInput} from "../../domain/selfAccount";
async function call(action:string,input:object={}){
 const {data,error}=await supabase.functions.invoke("operator-self-service",{body:{contract:SELF_ACCOUNT_CONTRACT,action,input},signal:AbortSignal.timeout(45000)});
 if(error){let passwordOutcome:string|undefined;let message="Não foi possível acessar seu cadastro. Tente novamente.";try{const detail=await (error as any).context?.json();if(typeof detail?.error==="string")message=detail.error;if(["changed","unknown"].includes(detail?.passwordOutcome))passwordOutcome=detail.passwordOutcome;}catch{/* Keep safe message for network failure. */}throw Object.assign(Error(message),{passwordOutcome});}
 return data;
}
function account(v:any):SelfAccount{if(v?.contract!==SELF_ACCOUNT_CONTRACT||typeof v.revision!=="string"||typeof v.username!=="string"||!Array.isArray(v.companies))throw Error("Resposta de cadastro incompatível. Atualize a página.");return v as SelfAccount;}
export const selfAccountService={
 read:async()=>account(await call("read")),
 save:async(input:SelfAccountInput)=>account(await call("save",input)),
 requestEmail:async(email:string,currentPassword:string)=>account(await call("request_email",{email,currentPassword})),
 confirmEmail:async(id:string,code:string)=>account(await call("confirm_email",{id,code})),
 cancelEmail:async(id:string)=>account(await call("cancel_email",{id})),
 password:async(currentPassword:string,password:string,confirmation:string)=>{await call("password",{currentPassword,password,confirmation});},
};
