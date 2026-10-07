import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-stable-score",publicDir:"../../web/public",plugins:[{name:"synthetic-stable-transport",enforce:"pre",transform(_code,id){
 const file=id.replaceAll("\\","/");
 if(file.endsWith("/infrastructure/supabase/client.ts"))return 'export {transport as supabase} from "../../../../tests/ui/stable-score/fixture";';
 if(file.endsWith("/infrastructure/supabase/profileDiscoveryService.ts"))return 'export {loadPublishedProfileCandidateCollection,loadPublishedProfileCandidates} from "../../../../tests/ui/stable-score/fixture";';
}},react()],server:{host:"127.0.0.1",port:5695,strictPort:true,fs:{allow:["../.."]}}});
