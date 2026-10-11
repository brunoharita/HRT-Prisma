import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {execFileSync} from "node:child_process";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-readable-records",publicDir:false,plugins:[{name:"readable-records-synthetic",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/");
 if(file.endsWith("/infrastructure/supabase/positionTaxonomyService.ts"))return 'import {taxonomyService} from "../../../../tests/ui/readable-records/fixture";export const positionTaxonomyService=taxonomyService;';
 if(file.endsWith("/infrastructure/supabase/competencyVerificationService.ts"))return 'import {verificationService} from "../../../../tests/ui/readable-records/fixture";export const competencyVerificationService=verificationService;';
 if(file.endsWith("/infrastructure/supabase/personIngestionService.ts"))return 'import {ingestion} from "../../../../tests/ui/readable-records/fixture";export const personIngestionService=ingestion;';
 if(file.endsWith("/infrastructure/supabase/client.ts"))return 'export const supabase={rpc:async()=>({data:null,error:null})};';
 if(process.env.PRISMA_RECORD_BASELINE==="1"&&["PositionTaxonomyPanel.tsx","FollowUpHistory.tsx","CompetencyVerificationPage.tsx"].some(name=>file.endsWith('/'+name)))return execFileSync('git',['show','e606ca5ca787fcc4d899206d8da6affb99580c25:'+file.slice(file.indexOf('/web/src/')+1)],{encoding:'utf8'});
}},react()],server:{host:"127.0.0.1",port:5791,strictPort:true,fs:{allow:["../.."]}}});
