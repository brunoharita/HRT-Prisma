export type TokenFunction = "position_assessment_items" | "parser_ia" | "profile_synthesis" | "assessment_activity_analysis";
export const tokenFunctionLabels: Record<TokenFunction,string> = {position_assessment_items:"Questões de avaliação",parser_ia:"Leitura de currículos",profile_synthesis:"Síntese de perfis",assessment_activity_analysis:"Análise da atividade da avaliação"};
export const formatTokens = (value:number) => new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(value);
export const formatTokenPrice = (cents:number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export interface TokenQuote {contract:"prisma-token-quote-1.0.0";organizationId:string;id:string;functionName:TokenFunction;quantity:number;tokensPerUnit:number;amount:number;available:number;expiresAt:string;}
export interface TokenPackage {id:string;name:string;tokens:number;priceCents:number;validityMonths:number;active?:boolean;effectiveAt?:string;}
export interface TokenRate {id:string;functionName:TokenFunction;tokensPerUnit:number;effectiveAt:string;}
export interface TokenAccount {organizationId:string;monthlyTokens:number;pendingMonthlyTokens:number|null;pendingCycleDay:number|null;currentPeriod:string;nextPeriod:string;cycleAnchor:string;active:boolean;name?:string;available?:number;}
export interface TokenLot {id:string;organizationId:string;source:"monthly"|"additional"|"bonus"|"refund";total:number;remaining:number;available:number;expiresAt:string;}
export interface TokenMovement {id:number;organizationId:string;kind:string;amount:number;actorId:string|null;actorName?:string|null;functionName:TokenFunction|null;referenceId:string|null;reason:string|null;createdAt:string;}
export interface TokenReservation {id:string;organizationId:string;functionName:TokenFunction;actorId:string|null;amount:number;status:"reserved"|"charged"|"released";createdAt:string;completedAt:string|null;}
export interface TokenOrder {id:string;organizationId:string;organizationName?:string;packageName:string;tokens:number;priceCents:number;validityMonths:number;status:string;reason:string|null;createdAt:string;offerExpiresAt:string;releasedAt:string|null;}
export interface TokenOverview {contract:"prisma-tokens-1.0.0";organizationId:string;manager:boolean;account:TokenAccount;available:number;consumedPeriod:number;reservedTotal:number;lots:TokenLot[];rates:TokenRate[];packages:TokenPackage[];orders:TokenOrder[];reservations:TokenReservation[];movements:TokenMovement[];}
export interface TokenPlatform {contract:"prisma-tokens-1.0.0";packages:TokenPackage[];rates:TokenRate[];companies:TokenAccount[];orders:TokenOrder[];reservations:TokenReservation[];movements:TokenMovement[];technicalCosts:{estimatedUsd:number|null;unknownEvents:number};}
export const tokenOrderLabels:Record<string,string>={requested:"Solicitado",awaiting_payment:"Aguardando pagamento",released:"Liberado",cancelled:"Cancelado",refused:"Recusado"};
export function quoteUsable(quote:TokenQuote|null,organizationId:string,quantity:number,now=Date.now()):boolean {return !!quote&&quote.organizationId===organizationId&&quote.quantity===quantity&&Number.isFinite(Date.parse(quote.expiresAt))&&Date.parse(quote.expiresAt)>now;}

