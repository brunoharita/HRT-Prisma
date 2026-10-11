import {useEffect,useState} from "react";
import {Button} from "antd";
import {getTokenQuote,subscribeTokenQuote} from "../infrastructure/supabase/prismaTokensService";
import {formatTokens,type TokenQuote,type TokenFunction} from "../domain/prismaTokens";
import {useLoadingFeedback} from "./PrismaLoadingFeedback";
export function useTokenQuote(organizationId:string,fn:TokenFunction,quantity:number,enabled=true){
 const [quote,setQuote]=useState<TokenQuote|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setQuote(null);setError(null);if(!enabled||quantity<1){setLoading(false);return;}
 const unsubscribe=subscribeTokenQuote(organizationId,fn,quantity,q=>{if(active)setQuote(q);});setLoading(true);void getTokenQuote(organizationId,fn,quantity,revision>0).then(q=>{if(active)setQuote(q);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Consumo indisponível.");}).finally(()=>{if(active)setLoading(false);});
 return()=>{active=false;unsubscribe();};},[organizationId,fn,quantity,enabled,revision]);
 return {quote,error,loading,refresh:()=>setRevision(n=>n+1)};
}
export function TokenUsageHint({organizationId,functionName,quantity=1}: {organizationId:string;functionName:TokenFunction;quantity?:number}){
 const state=useTokenQuote(organizationId,functionName,quantity);
 useLoadingFeedback({"Consultando consumo de IA…":state.loading});
 return <p className="prisma-token-hint" role="status">{state.loading?"Consultando consumo…":state.error??(state.quote?"Consumo por utilização de IA: "+formatTokens(state.quote.amount)+" Tokens Prisma. Reutilizar conteúdo existente não consome novamente.":"Consumo indisponível.")} <Button type="link" size="small" onClick={state.refresh}>Atualizar consumo</Button></p>;
}

