type Pending = {resolve:(value:unknown)=>void;reject:(reason:Error)=>void};
const pending:Pending[]=[];
export const request=()=>new Promise((resolve,reject)=>pending.push({resolve,reject}));
export const service=new Proxy({}, {get:(_target,key)=>key==="then"?undefined:key==="auth"?service:request});
export const client=new Proxy(service,{get:(target,key)=>key==="auth"?{getClaims:request,onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),signOut:request}:Reflect.get(target,key)});
Object.assign(window,{__loadingFixture:{pending,fail:()=>{pending.splice(0).forEach(p=>p.reject(new Error("Falha sintética de consulta")));}}});
