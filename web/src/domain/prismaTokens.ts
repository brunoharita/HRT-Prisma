export type TokenFunction = "position_assessment_items" | "parser_ia" | "profile_synthesis" | "assessment_activity_analysis";
export const tokenFunctionLabels: Record<TokenFunction,string> = {position_assessment_items:"Questões de avaliação",parser_ia:"Leitura de currículos",profile_synthesis:"Síntese de perfis",assessment_activity_analysis:"Análise da atividade da avaliação"};
export const formatTokens = (value:number) => new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(value);
export const formatTokenPrice = (cents:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export interface TokenQuote {contract:"prisma-token-quote-1.0.0";organizationId:string;id:string;functionName:TokenFunction;quantity:number;tokensPerUnit:number;amount:number;available:number;expiresAt:string;}
export interface TokenPackage {id:string;name:string;tokens:number;priceCents:number;validityDays:30;active?:boolean;effectiveAt?:string;}
export interface TokenRate {id:string;functionName:TokenFunction;tokensPerUnit:number;effectiveAt:string;createdAt?:string;}
export interface TokenAccount {organizationId:string;monthlyTokens:number;pendingMonthlyTokens:number|null;pendingCycleDay:number|null;currentPeriod:string;nextPeriod:string;cycleAnchor:string;createdAt:string;policyVersion:"prisma-token-policy-2.0.0";active:boolean;name?:string;available?:number;}
export interface TokenLot {id:string;organizationId:string;source:"monthly"|"additional"|"bonus"|"refund";total:number;remaining:number;available:number;expiresAt:string;acquiredAt:string;name:string;}
export interface TokenMovement {id:number;organizationId:string;kind:string;amount:number;actorId:string|null;actorName?:string|null;functionName:TokenFunction|null;referenceId:string|null;reason:string|null;createdAt:string;quantity:number|null;operationId:string|null;sources:{lotId:string;source:TokenLot["source"];amount:number;expiresAt:string}[];assessmentContext:{assessmentId:string;vacancyId:string;processId:string|null;personId:string|null}|null;}
export interface TokenReservation {id:string;organizationId:string;functionName:TokenFunction;actorId:string|null;amount:number;status:"reserved"|"charged"|"released";createdAt:string;completedAt:string|null;}
export interface TokenOrder {id:string;organizationId:string;organizationName?:string;packageName:string;tokens:number;priceCents:number;validityDays:30;status:string;reason:string|null;createdAt:string;offerExpiresAt:string;releasedAt:string|null;}
export interface TokenOverview {contract:"prisma-tokens-2.0.0";organizationId:string;manager:boolean;account:TokenAccount;available:number;consumedPeriod:number;reservedTotal:number;lots:TokenLot[];planning:TokenPlanningData|null;rates:TokenRate[];packages:TokenPackage[];orders:TokenOrder[];reservations:TokenReservation[];movements:TokenMovement[];}
export interface TokenPlatform {contract:"prisma-tokens-2.0.0";packages:TokenPackage[];rates:TokenRate[];companies:TokenAccount[];orders:TokenOrder[];reservations:TokenReservation[];movements:TokenMovement[];technicalCosts:{estimatedUsd:number|null;unknownEvents:number};}
export const tokenOrderLabels:Record<string,string>={requested:"Solicitado",awaiting_payment:"Aguardando pagamento",released:"Liberado",cancelled:"Cancelado",refused:"Recusado"};
export function quoteUsable(quote:TokenQuote|null,organizationId:string,quantity:number,now=Date.now()):boolean {return !!quote&&quote.organizationId===organizationId&&quote.quantity===quantity&&Number.isFinite(Date.parse(quote.expiresAt))&&Date.parse(quote.expiresAt)>now;}


export interface TokenPlanningData {
 method:"prisma-token-planning-1.0.0";asOf:string;observedSince:string;timezone:"America/Sao_Paulo";
 renewalAt:string;windowStart7:string;windowStart30:string;dailyConsumption:{day:string;tokens:number}[];
}
export interface TokenPlanning {
 status:"estimated"|"insufficient_history"|"no_recent_use"|"suspended"|"unavailable";
 average:number|null;dailyReference:number|null;exhaustedAt:string|null;sufficientUntilRenewal:boolean|null;daysRemaining:number|null;
}
/** Constant recent rate, exact lot priority and expiry events. Advisory only; never invokes AI or reserves credit. */
export function calculateTokenPlanning(overview:Pick<TokenOverview,"lots"|"planning"|"account">,window:7|30=7):TokenPlanning {
 const result:TokenPlanning={status:"unavailable",average:null,dailyReference:null,exhaustedAt:null,sufficientUntilRenewal:null,daysRemaining:null};
 const p=overview.planning;
 if(!p||p.method!=="prisma-token-planning-1.0.0"||p.timezone!=="America/Sao_Paulo")return result;
 const now=Date.parse(p.asOf),renewal=Date.parse(p.renewalAt),start=Date.parse(window===7?p.windowStart7:p.windowStart30),observed=Date.parse(p.observedSince);
 if(![now,renewal,start,observed].every(Number.isFinite)||renewal<=now||observed>now)return result;
 const days=(renewal-now)/86400000;
 result.daysRemaining=days;
 if(overview.lots.some(l=>!Number.isSafeInteger(l.available)||l.available<0||!Number.isFinite(Date.parse(l.expiresAt))))return result;
 const lots=overview.lots.filter(l=>l.available>0&&Date.parse(l.expiresAt)>now).map(l=>({source:l.source,remaining:l.available,expires:Date.parse(l.expiresAt),id:l.id}));
 result.dailyReference=Math.floor(lots.filter(l=>l.source==="monthly").reduce((n,l)=>n+l.remaining,0)/days);
 if(!overview.account.active)return {...result,status:"suspended"};
 const rows=p.dailyConsumption?.slice(-window);
 if(observed>start||!rows||rows.length!==window)return {...result,status:"insufficient_history"};
 for(let i=0;i<rows.length;i++){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(rows[i]!.day)||!Number.isSafeInteger(rows[i]!.tokens)||rows[i]!.tokens<0)return result;
  if(i&&Date.parse(rows[i]!.day)-Date.parse(rows[i-1]!.day)!==86400000)return result;
 }
 const localDay=new Intl.DateTimeFormat("sv-SE",{timeZone:p.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));
 if(Date.parse(localDay)-Date.parse(rows.at(-1)!.day)!==86400000)return result;
 result.average=rows.reduce((n,d)=>n+d.tokens,0)/window;
 if(result.average===0)return {...result,status:"no_recent_use"};
 result.status="estimated";
 const rate=result.average/86400000;
 let cursor=now;
 // Each iteration exhausts a lot, reaches an expiration, or reaches renewal.
 for(let i=0;i<lots.length*3+3;i++){
  const live=lots.filter(l=>l.expires>cursor&&l.remaining>1e-7).sort((a,b)=>(a.source==="monthly"?0:1)-(b.source==="monthly"?0:1)||a.expires-b.expires||a.id.localeCompare(b.id));
  if(cursor>=renewal)return {...result,sufficientUntilRenewal:true};
  const lot=live[0];
  if(!lot)return {...result,sufficientUntilRenewal:false,exhaustedAt:new Date(cursor).toISOString()};
  const next=Math.min(renewal,...live.map(l=>l.expires)),emptyAt=cursor+lot.remaining/rate;
  if(emptyAt<next){cursor=emptyAt;lot.remaining=0;}else{lot.remaining=Math.max(0,lot.remaining-rate*(next-cursor));cursor=next;}
 }
 return {...result,status:"unavailable",average:null};
}

export function tokenAssessmentPath(context:TokenMovement["assessmentContext"]):string|null {
 if(!context?.vacancyId)return null;
 const base="/vacancies/"+encodeURIComponent(context.vacancyId)+"/follow-up";
 if(context.processId)return base+"/processes/"+encodeURIComponent(context.processId)+"/assessment";
 if(context.personId)return base+"/"+encodeURIComponent(context.personId)+"/assessment";
 return null;
}
