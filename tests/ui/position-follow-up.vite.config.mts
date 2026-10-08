import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({root:"tests/ui",cacheDir:"../../tmp/vite-position-follow-up",publicDir:"../../web/public",plugins:[{name:"synthetic-follow-up-transport",enforce:"pre",transform(_code,id){
 if(id.replaceAll("\\","/").endsWith("/infrastructure/supabase/client.ts"))return 'export {transport as supabase} from "../../../../tests/ui/position-follow-up/fixture";';
}},react()],server:{host:"127.0.0.1",port:5697,strictPort:true,fs:{allow:["../.."]}}});
