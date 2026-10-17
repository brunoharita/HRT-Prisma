import type { TokenFunction, TokenRate } from "./prismaTokens.js";

export type TokenActivityEstimate = {state:"estimated";unit:number;amount:number;remaining:number;missing:number;effectiveAt:string}|{state:"unavailable"|"invalid_quantity"};
export function estimateTokenActivity(rates:readonly TokenRate[],functionName:TokenFunction,quantity:number|null,available:number,now=Date.now()):TokenActivityEstimate {
  if(quantity===null||!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)return {state:"invalid_quantity"};
  if(!Number.isFinite(now)||!Number.isSafeInteger(available)||available<0)return {state:"unavailable"};
  const current=rates.filter(rate=>rate.functionName===functionName&&Number.isFinite(Date.parse(rate.effectiveAt))&&Date.parse(rate.effectiveAt)<=now).sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt))[0];
  if(!current||!Number.isSafeInteger(current.tokensPerUnit)||current.tokensPerUnit<=0)return {state:"unavailable"};
  const amount=current.tokensPerUnit*quantity;
  if(!Number.isSafeInteger(amount))return {state:"unavailable"};
  return {state:"estimated",unit:current.tokensPerUnit,amount,remaining:Math.max(0,available-amount),missing:Math.max(0,amount-available),effectiveAt:current.effectiveAt};
}
