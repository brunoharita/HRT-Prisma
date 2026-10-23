import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-trajectory-activity",publicDir:"../../web/public",plugins:[{name:"test-only-component-exports",enforce:"pre",transform(code,id){
  if(id.replaceAll("\\","/").endsWith("/web/src/infrastructure/supabase/client.ts"))return "export const supabase = {};";
  if(id.replaceAll("\\","/").endsWith("/web/src/pages/VacancyPages.tsx"))return code+"\nexport {CandidateMatchCard, MatchDrawer};\n";
}},react()],server:{host:"127.0.0.1",port:5711,strictPort:true,fs:{allow:["../.."]}}});
