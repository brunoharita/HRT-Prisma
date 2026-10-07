import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {execFileSync} from "node:child_process";
const baseline=process.env.PRISMA_REVIEW_HELP_BASELINE==="1";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-trajectory-help-v213",publicDir:"../../web/public",plugins:[{name:"synthetic-review-service",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/");
 if(baseline)for(const path of ["web/src/components/TrajectoryConflictReview.tsx","web/src/styles.css"])
  if(file.endsWith("/"+path))return execFileSync("git",["show","98830fd42f5671ccc2a91140b839976a9fb284e8:"+path],{encoding:"utf8"});
 if(id.replaceAll("\\","/").endsWith("/infrastructure/supabase/vacancyService.ts"))return 'export {vacancyService} from "../../../../tests/ui/trajectory-review-help/fixture";';
}},react()],server:{host:"127.0.0.1",port:baseline?5694:5693,strictPort:true,fs:{allow:["../.."]}}});
