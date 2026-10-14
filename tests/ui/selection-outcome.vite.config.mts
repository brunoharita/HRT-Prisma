import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {execFileSync} from "node:child_process";
export default defineConfig({root:"tests/ui",cacheDir:process.env.PRISMA_OUTCOME_BASELINE==="1"?"../../tmp/vite-selection-outcome-baseline":"../../tmp/vite-selection-outcome",publicDir:"../../web/public",plugins:[{name:"synthetic-outcome-services",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/"),fixture='"../../../../tests/ui/person-unified/fixture"';
 if(process.env.PRISMA_OUTCOME_BASELINE==="1")for(const path of ["web/src/pages/VacancyPages.tsx","web/src/components/AddToPositionFollowUp.tsx","web/src/pages/SelectionProcessesPage.tsx","web/src/pages/PositionFollowUpPage.tsx","web/src/pages/PersonWorkspacePage.tsx","web/src/components/PersonFollowUps.tsx"]){if(file.endsWith("/"+path))return execFileSync("git",["show","453747131f82d537ae1f2591b6d3e450cfb6fefb:"+path],{encoding:"utf8"});}
 if(file.endsWith("/infrastructure/supabase/personIngestionService.ts"))return _code+`\nimport {ingestion as syntheticIngestion} from ${fixture};Object.assign(personIngestionService,syntheticIngestion);`;
 if(file.endsWith("/infrastructure/supabase/profileSynthesisService.ts"))return `import {adapter} from ${fixture};export const profileSynthesisService=()=>adapter;`;
 if(file.endsWith("/infrastructure/supabase/profileCompetencyCurationService.ts"))return `import {curation} from ${fixture};export const profileCompetencyCurationService=()=>curation;`;
 if(file.endsWith("/infrastructure/supabase/client.ts"))return 'export const supabase={rpc:()=>{const reply=Promise.resolve({data:null,error:null});reply.abortSignal=()=>reply;return reply;}};';
}},react()],server:{host:"127.0.0.1",port:5713,strictPort:true,fs:{allow:["../.."]}}});
