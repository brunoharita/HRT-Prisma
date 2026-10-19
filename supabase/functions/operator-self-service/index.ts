import {createClient} from "npm:@supabase/supabase-js@2.112.3";
import {handleSelfAccount} from "./handler.ts";
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,redirect:"error",signal:AbortSignal.timeout(20000)})}};
function key(modern:string,legacy:string){const value=Deno.env.get(modern);return value?JSON.parse(value).default:Deno.env.get(legacy)!;}
Deno.serve(request=>{
 const url=Deno.env.get("SUPABASE_URL")!,publishable=key("SUPABASE_PUBLISHABLE_KEYS","SUPABASE_ANON_KEY");
 return handleSelfAccount(request,{user:createClient(url,publishable,options),server:createClient(url,key("SUPABASE_SECRET_KEYS","SUPABASE_SERVICE_ROLE_KEY"),options),passwordClient:()=>createClient(url,publishable,options)});
});
