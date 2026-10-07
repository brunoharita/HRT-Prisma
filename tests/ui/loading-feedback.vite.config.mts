import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-loading-v216",publicDir:"../../web/public",plugins:[{name:"loading-synthetic-services",enforce:"pre",transform(code,id){
 const file=id.replaceAll("\\","/");
 if(!file.includes("/web/src/infrastructure/supabase/"))return;
 if(file.endsWith("database.types.ts"))return;
 if(file.endsWith("/client.ts"))return 'export {client as supabase} from "../../../../tests/ui/loading-feedback/fixture";';
 const names=[...code.matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map(m=>m[1]);
 if(!names.length)return;
 return 'import {service,request} from "../../../../tests/ui/loading-feedback/fixture";'+names.map(name=>`export const ${name}=${name==="profileCompetencyCurationService"||name==="profileSynthesisService"?'()=>service':/Service$/.test(name)||name==="prismaRepository"||name==="supabase"?'service':'request'};`).join('');
}},react()],server:{host:"127.0.0.1",port:5696,strictPort:true,fs:{allow:["../.."]}}});
