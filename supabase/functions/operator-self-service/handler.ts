import {CONTACT_EMAIL,isTechnicalAuthEmail,readAuthIdentity,technicalAuthEmail} from "../platform-users/operatorIdentity.ts";
import {buildPasswordRequirementState,isPasswordPolicySatisfied,normalizePhoneInput,normalizeUsername,validateUsername} from "../../../web/src/shared/platformUsers.ts";

const contract="operator-self-account-1.0.0",uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
class AccountError extends Error {constructor(public status:number,message:string,public passwordOutcome?:"changed"|"unknown"){super(message);}}
const object=(v:unknown):Record<string,any>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,any>:{};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
async function boundedBody(request:Request){
 const reader=request.body?.getReader();if(!reader)throw new AccountError(400,"Solicitação vazia.");
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384){void reader.cancel();throw new AccountError(413,"Solicitação muito grande.");}chunks.push(part.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AccountError(400,"Solicitação inválida.");}
}
function exact(value:Record<string,any>,keys:string[]){if(Object.keys(value).some(k=>!keys.includes(k)))throw new AccountError(400,"A solicitação contém campos protegidos ou desconhecidos.");}
export async function verificationHash(id:string,actor:string,code:string){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${id}:${actor}:${code}`))),v=>v.toString(16).padStart(2,"0")).join("");}
function newCode(){const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]!>=4200000000);return String(a[0]!%100000000).padStart(8,"0");}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);

/** Clients are supplied by the entrypoint; tests inject transports, never real identities. */
export async function handleSelfAccount(request:Request,deps:{user:any;server:any;passwordClient:()=>any;fetcher?:typeof fetch}){
 if(request.method==="OPTIONS")return new Response("ok",{headers});
 if(request.method!=="POST")return reply(405,{error:"Método não permitido."});
 try{
  const token=request.headers.get("Authorization")?.replace(/^Bearer /i,"");
  if(!token||token.length>12000)throw new AccountError(401,"Entre novamente para acessar seu cadastro.");
  const {data:auth,error:authError}=await deps.user.auth.getUser(token);
  if(authError||!auth.user?.id)throw new AccountError(401,"Sua sessão expirou. Entre novamente.");
  // Decode only AFTER the Auth server has verified this exact JWT. The SQL boundary
  // also checks that its session still belongs to the verified identity.
  let session:string;try{session=JSON.parse(atob(token.split(".")[1]!.replace(/-/g,"+").replace(/_/g,"/"))).session_id;}catch{throw new AccountError(401,"Sessão inválida.");}
  if(!uuid.test(session!))throw new AccountError(401,"Sessão inválida.");
  const actor=auth.user.id;
  const rpc=async(action:string,data:Record<string,unknown>={})=>{
   const r=await deps.server.rpc("operator_self_account_v313",{p_actor:actor,p_session:session,p_action:action,p_data:data});
   if(r.error){const status=r.error.code==="23505"||r.error.code==="40001"?409:r.error.code==="42501"?403:r.error.code==="P0001"?429:400;throw new AccountError(status,r.error.message??"Não foi possível concluir a alteração.");}return r.data;
  };
  const body=object(await boundedBody(request));exact(body,["contract","action","input"]);
  if(body.contract!==contract)throw new AccountError(400,"Atualize a página para continuar.");
  const input=object(body.input),action=body.action;
  const account=await rpc("read");
  async function reauthenticate(purpose:"email"|"password"){
   if(typeof input.currentPassword!=="string"||!input.currentPassword||input.currentPassword.length>1024)throw new AccountError(400,"Informe a senha atual.");
   const attempt=await rpc("security_begin",{purpose});
   const identity=await readAuthIdentity(deps.server,actor),client=deps.passwordClient();
   let valid=false;
   try{const r=await client.auth.signInWithPassword({email:identity.email,password:input.currentPassword});valid=!r.error&&r.data.user?.id===actor&&!!r.data.session?.access_token;
   }finally{await client.auth.signOut({scope:"local"}).catch(()=>{});}
   await rpc("security_finish",{id:attempt.id,state:valid?"verified":"rejected"});
   if(!valid)throw new AccountError(403,"A senha atual não confere.");
   return {id:attempt.id,identity};
  }
  if(action==="read"){exact(input,[]);return reply(200,account);}
  if(action==="save"){
   exact(input,["revision","fullName","username","phoneCountryIso2","phoneNationalNumber"]);
   if(typeof input.fullName!=="string"||input.fullName.trim().length<2||input.fullName.trim().length>160)throw new AccountError(400,"Informe o nome completo, de 2 a 160 caracteres.");
   const username=normalizeUsername(String(input.username??"")),usernameError=validateUsername(username);
   if(usernameError)throw new AccountError(400,usernameError);
   if(account.profile==="owner"&&username!==account.username)throw new AccountError(403,"O username do Owner é definido na criação e não pode ser alterado.");
   const phone=normalizePhoneInput(String(input.phoneCountryIso2??""),String(input.phoneNationalNumber??""));
   if(!phone.value)throw new AccountError(400,phone.error!);
   await rpc("save",{revision:input.revision,fullName:input.fullName.trim(),username,phoneCountryIso2:phone.value.countryIso2,phoneCountryLabel:phone.value.countryLabel,phoneCountryCode:phone.value.callingCode,phoneNationalNumber:phone.value.nationalNumber,phoneE164:phone.value.e164});
   return reply(200,await rpc("read"));
  }
  if(action==="request_email"){
   exact(input,["email","currentPassword"]);
   const email=String(input.email??"").trim().toLowerCase();
   if(!CONTACT_EMAIL.test(email)||email.length>254||isTechnicalAuthEmail(email)||email.endsWith("@users.prisma.invalid")||email===account.email)throw new AccountError(400,"Informe outro e-mail válido.");
   const security=await reauthenticate("email");
   // Legacy aliases move monotonically to a unique technical Auth address; contact
   // remains unchanged until confirmation, preserving recovery and shared emails.
   if(!isTechnicalAuthEmail(security.identity.email!)){
    const r=await deps.server.auth.admin.updateUserById(actor,{email:technicalAuthEmail(actor),email_confirm:true});
    if(r.error)throw new AccountError(502,"Não foi possível preparar a alteração de contato.");
   }
   const {data:key,error:configError}=await deps.server.rpc("operator_access_email_configuration");
   if(configError||typeof key!=="string"||!key.startsWith("re_"))throw new AccountError(503,"O envio de confirmação está indisponível. Seu e-mail atual foi mantido.");
   const id=crypto.randomUUID(),code=newCode(),hash=await verificationHash(id,actor,code);
   const claim=await rpc("email_begin",{id,hash,email,securityId:security.id});
   let state="failed";
   try{
    state="unknown";
    const r=await (deps.fetcher??fetch)("https://api.resend.com/emails",{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`operator-self-email/${id}`},body:JSON.stringify({from:"Prisma <suporte@hrtsolutions.com.br>",to:[claim.email],subject:`Confirme seu novo e-mail no Prisma: ${claim.username}`,
     text:`Confirme seu novo e-mail no Prisma\n\nUsuário: ${claim.username}\nCódigo: ${code}\n\nInforme este código em Meu cadastro. Válido por 15 minutos e apenas para esta conta. Seu contato anterior continua válido até a confirmação. Se não solicitou, ignore. Suporte: suporte@hrtsolutions.com.br`,
     html:`<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirme seu novo e-mail</title></head><body style="font:16px Arial,sans-serif;color:#172b4d;background:#f4f6fa;padding:24px"><main style="max-width:560px;margin:auto;background:white;padding:24px"><h1 style="font-size:24px">Confirme seu novo e-mail</h1><p>Usuário: <strong>${escape(claim.username)}</strong></p><p>Informe o código em Meu cadastro no Prisma:</p><p style="font:32px monospace;letter-spacing:4px">${code}</p><p>Válido por 15 minutos e apenas para esta conta. Seu e-mail anterior continua válido até a confirmação.</p><p>Se não solicitou, ignore esta mensagem.</p><p>Suporte: <a href="mailto:suporte@hrtsolutions.com.br">suporte@hrtsolutions.com.br</a></p></main></body></html>`})});
    if(!r.ok){state=r.status>=400&&r.status<500&&![408,409,429].includes(r.status)?"failed":"unknown";throw Error("SEND_UNCONFIRMED");}
    const receipt=await r.json();if(typeof receipt.id!=="string"||!receipt.id||receipt.id.length>200)throw Error("RECEIPT_INVALID");
    await rpc("email_receipt",{id,state:"accepted",providerId:receipt.id});
   }catch{
    await rpc("email_receipt",{id,state,providerId:null}).catch(()=>{});
    throw new AccountError(502,"Não foi possível confirmar o envio. Seu e-mail atual foi mantido. Se o código chegar, você pode usá-lo; ou aguarde um minuto para solicitar outro.");
   }
   return reply(200,await rpc("read"));
  }
  if(action==="confirm_email"){
   exact(input,["id","code"]);
   if(!uuid.test(input.id??"")||typeof input.code!=="string"||!/^\d{8}$/.test(input.code))throw new AccountError(400,"Informe o código de oito dígitos.");
   const result=await rpc("email_confirm",{id:input.id,hash:await verificationHash(input.id,actor,input.code)});
   if(!result.verified)throw new AccountError(400,result.reason??"Código inválido.");
   return reply(200,await rpc("read"));
  }
  if(action==="cancel_email"){exact(input,["id"]);if(!uuid.test(input.id??""))throw new AccountError(400,"Solicitação inválida.");await rpc("email_cancel",{id:input.id});return reply(200,await rpc("read"));}
  if(action==="password"){
   exact(input,["currentPassword","password","confirmation"]);
   if(typeof input.password!=="string"||input.password.length>1024||typeof input.confirmation!=="string"||!isPasswordPolicySatisfied(buildPasswordRequirementState(input.password,input.confirmation,account.username)))throw new AccountError(400,"A nova senha deve atender a todos os requisitos e coincidir com a confirmação.");
   const security=await reauthenticate("password");let changed=false;
   try{
    const result=await deps.server.auth.admin.updateUserById(actor,{password:input.password});if(result.error)throw Error("PASSWORD_UPDATE_UNCONFIRMED");changed=true;
    const receipt=await deps.server.rpc("finish_operator_self_password_v313",{p_actor:actor,p_session:session,p_request:security.id,p_state:"changed"});
    if(receipt.error)throw Error("PASSWORD_AUDIT_UNAVAILABLE");
   }catch{
    await deps.server.rpc("finish_operator_self_password_v313",{p_actor:actor,p_session:session,p_request:security.id,p_state:"unknown"}).catch(()=>{});
    throw new AccountError(502,changed?"A senha foi alterada, mas o registro de confirmação ficou indisponível. Use a nova senha no próximo acesso.":"Não foi possível confirmar a alteração. Verifique o acesso antes de tentar novamente.",changed?"changed":"unknown");
   }
   return reply(200,{ok:true});
  }
  throw new AccountError(400,"Ação não suportada.");
 }catch(e){return reply(e instanceof AccountError?e.status:500,{error:e instanceof AccountError?e.message:"Não foi possível concluir a operação. Recarregue seu cadastro e tente novamente.",...(e instanceof AccountError&&e.passwordOutcome?{passwordOutcome:e.passwordOutcome}:{})});}
}
