import {supabase} from "./client";
import type {TokenFunction,TokenQuote,TokenOverview,TokenPlatform} from "../../domain/prismaTokens";
function camelize(v:unknown):unknown {
 if(Array.isArray(v))return v.map(camelize);
 if(v&&typeof v==="object")return Object.fromEntries(Object.entries(v).map(([k,x])=>[k.replace(/_([a-z0-9])/g,(_,c:string)=>c.toUpperCase()),camelize(x)]));
 return v;
}
export function tokenOperationError(message:string):string {
 const fixed:Record<string,string>={PT_INSUFFICIENT_BALANCE:"Saldo insuficiente de Tokens Prisma. Consulte o administrador da empresa.",PT_QUOTE_EXPIRED:"A previsão de consumo expirou. Atualize os valores antes de confirmar.",PT_QUOTE_REQUIRED:"Atualize a previsão de consumo antes de iniciar a IA.",PT_ACCESS_DENIED:"Você não tem permissão para esta operação.",PT_ACCOUNT_DISABLED:"O uso de Tokens Prisma desta empresa está suspenso. Consulte o administrador.",PT_OFFER_EXPIRED:"A oferta expirou. Solicite um pacote com as condições atuais.",PT_PAYMENT_CONFIRMATION_REQUIRED:"Confirme o pagamento verificado e informe sua referência.",PT_OPERATION_CONFLICT:"Este pedido já possui outras condições. Atualize para consultar o estado.",PT_SETTLEMENT_CONFLICT:"A operação já foi conciliada. Atualize o histórico.",PT_REASON_REQUIRED:"Informe uma justificativa válida para esta movimentação.",PT_RECONCILIATION_NOT_READY:"A reserva ainda não está disponível para conciliação."};
 if(message==="PT_RATE_UNAVAILABLE")return "A tarifa desta função ainda não está configurada. Consulte o administrador da plataforma.";
 return fixed[message]??"Não foi possível confirmar a operação. Seus dados foram preservados. Atualize antes de tentar novamente.";
}
export async function tokenRpc<T>(action:string,organizationId:string|null=null,data:object={}):Promise<T> {
 const result=await supabase.rpc("prisma_tokens" as never,{p_action:action,p_organization_id:organizationId,p_data:data} as never).abortSignal(AbortSignal.timeout(20000));
 if(result.error)throw Error(tokenOperationError(result.error.message));
 return camelize(result.data) as T;
}
const quotes=new Map<string,TokenQuote>(),pendingQuotes=new Map<string,Promise<TokenQuote>>(),quoteListeners=new Map<string,Set<(quote:TokenQuote)=>void>>();const key=(org:string,fn:TokenFunction,n:number)=>org+":"+fn+":"+n;
export function subscribeTokenQuote(org:string,fn:TokenFunction,quantity:number,callback:(quote:TokenQuote)=>void){const id=key(org,fn,quantity),listeners=quoteListeners.get(id)??new Set();listeners.add(callback);quoteListeners.set(id,listeners);return()=>{listeners.delete(callback);if(!listeners.size)quoteListeners.delete(id);};}
export async function getTokenQuote(org:string,fn:TokenFunction,quantity:number,fresh=false):Promise<TokenQuote>{
 const id=key(org,fn,quantity),cached=quotes.get(id);
 if(!fresh&&cached&&Date.parse(cached.expiresAt)>Date.now())return cached;
 if(pendingQuotes.has(id))return pendingQuotes.get(id)!;
 const task=(async()=>{const q=await tokenRpc<TokenQuote>("quote",org,{functionName:fn,quantity});
 if(q?.contract!=="prisma-token-quote-1.0.0"||q.organizationId!==org||q.functionName!==fn||q.quantity!==quantity||![q.amount,q.available,q.tokensPerUnit].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error("Previsão de consumo incompatível.");
 quotes.set(id,q);for(const callback of quoteListeners.get(id)??[])callback(q);return q;})();pendingQuotes.set(id,task);try{return await task;}finally{if(pendingQuotes.get(id)===task)pendingQuotes.delete(id);}
}
export async function takeTokenQuote(org:string,fn:TokenFunction,quantity:number,confirmedQuote?:TokenQuote|null):Promise<TokenQuote>{
 const id=key(org,fn,quantity),q=confirmedQuote??quotes.get(id);
 if(!q||q.organizationId!==org||q.functionName!==fn||q.quantity!==quantity||Date.parse(q.expiresAt)<=Date.now())throw Error("Atualize a previsão de consumo antes de iniciar a IA.");
 if(quotes.get(id)?.id===q.id)quotes.delete(id);return q;
}
export const prismaTokensService={
 async overview(org:string){const v=await tokenRpc<TokenOverview>("overview",org);if(v?.contract!=="prisma-tokens-2.0.0"||v.organizationId!==org||!Number.isSafeInteger(v.available)||v.available<0||!Array.isArray(v.movements)||!Array.isArray(v.reservations)||!Array.isArray(v.rates)||!Array.isArray(v.lots)||v.account?.policyVersion!=="prisma-token-policy-2.0.0"||v.lots.some(l=>![l.available,l.remaining,l.total].every(n=>Number.isSafeInteger(n)&&n>=0)||l.available>l.remaining||l.remaining>l.total||!Number.isFinite(Date.parse(l.expiresAt)))||v.lots.reduce((n,l)=>n+l.available,0)!==v.available)throw Error("Saldo indisponível. Atualize a consulta.");return v;},
 async platform(){const v=await tokenRpc<TokenPlatform>("platform");if(v?.contract!=="prisma-tokens-2.0.0"||!Array.isArray(v.companies)||!Array.isArray(v.packages))throw Error("Gestão indisponível. Atualize a consulta.");return v;},
 mutate:tokenRpc,
};

