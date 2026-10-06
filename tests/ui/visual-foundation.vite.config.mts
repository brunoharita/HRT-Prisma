import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-visual-v211",publicDir:"../../web/public",plugins:[{name:"visual-synthetic-services",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/");
 const fixture='"../../../../tests/ui/visual-foundation/fixture"';
 if(file.endsWith("/infrastructure/supabase/personIngestionService.ts"))return `import {visualIngestion} from ${fixture};export const personIngestionService=visualIngestion;`;
 if(file.endsWith("/infrastructure/supabase/knowledgeService.ts"))return `import {visualKnowledge} from ${fixture};export const knowledgeService=visualKnowledge;`;
 if(file.endsWith("/infrastructure/supabase/vacancyService.ts"))return `import {visualVacancy} from ${fixture};export const vacancyService=visualVacancy;export const workspaceOrganizationId=()=>"org-fixture";`;
 if(file.endsWith("/infrastructure/supabase/client.ts"))return `export const supabase={rpc:async()=>({data:null,error:null})};`;
}},react()],server:{host:"127.0.0.1",port:5587,strictPort:true,fs:{allow:["../.."]}}});
