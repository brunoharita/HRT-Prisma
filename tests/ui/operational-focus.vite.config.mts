import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-operational-focus",publicDir:"../../web/public",plugins:[{name:"operational-focus-synthetic-services",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/"),fixture='"../../../../tests/ui/operational-focus/fixture"';
 const services:Record<string,string>={personIngestionService:"ingestion",knowledgeService:"knowledge",prismaRepository:"repository",competencyVerificationService:"verification",assessmentItemGovernanceService:"bank"};
 for(const [module,stub] of Object.entries(services))if(file.endsWith(`/infrastructure/supabase/${module}.ts`))return `import {${stub}} from ${fixture};export const ${module}=${stub};`;
 if(file.endsWith("/infrastructure/supabase/client.ts"))return 'export const supabase={rpc:async()=>({data:null,error:null})};';
}},react()],server:{host:"127.0.0.1",port:5780,strictPort:true,fs:{allow:["../.."]}}});
