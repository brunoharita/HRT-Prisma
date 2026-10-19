import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const module=(path,replace={})=>{let source=fs.readFileSync(path,'utf8');for(const [from,to] of Object.entries(replace))source=source.replaceAll(from,to);return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');};
const identity=module('supabase/functions/platform-users/operatorIdentity.ts'),shared=module('web/src/shared/platformUsers.ts');
const {handleSelfAccount,verificationHash}=await import(module('supabase/functions/operator-self-service/handler.ts',{'../platform-users/operatorIdentity.ts':identity,'../../../web/src/shared/platformUsers.ts':shared}));
const actor='00000000-0000-4000-8000-000000000043',session='00000000-0000-4000-8000-000000000143',rid='00000000-0000-4000-8000-000000000500',secret='Synthetic!783';
const token='header.'+Buffer.from(JSON.stringify({session_id:session})).toString('base64url')+'.signature';
function fixture({profile='member',email='auth+'+actor+'@users.prisma.invalid',wrongUser=false,provider='accepted',failAudit=false,authError=false,tokenValue=token}={}){
 const calls=[],deliveries=[],updates=[],reauth=[];let code;
 let account={contract:'operator-self-account-1.0.0',revision:'revision',fullName:'Sintético',username:'synthetic.member',email:'shared@example.invalid',profile,status:'active',groupName:'Grupo',companies:['Empresa'],pendingEmail:null};
 const server={auth:{admin:{getUserById:async id=>({data:{user:{id,email}}}),updateUserById:async(id,input)=>{updates.push({id,input});return {error:null};}}},rpc:async(name,args)=>{
  calls.push({name,args});if(name==='finish_operator_self_password_v313')return args.p_state==='changed'&&failAudit?{error:{message:'audit unavailable'}}:{data:null,error:null};if(name==='operator_access_email_configuration')return {data:'re_synthetic_private',error:null};
  const action=args.p_action,d=args.p_data;
  if(action==='read')return {data:structuredClone(account),error:null};
  if(action==='save'){account={...account,...d};return {data:{ok:true},error:null};}
  if(action==='security_begin')return {data:{id:rid},error:null};
  if(action==='security_finish'&&d.state==='changed'&&failAudit)return {error:{code:'P0001',message:'audit unavailable'}};
  if(action==='email_begin'){account.pendingEmail={id:d.id,email:d.email,expiresAt:'2026-10-19T00:00:00Z',createdAt:'2026-10-18T23:00:00Z',sendState:'preparing'};return {data:{id:d.id,email:d.email,username:account.username},error:null};}
  if(action==='email_receipt'){account.pendingEmail.sendState=d.state;return {data:{ok:true},error:null};}
  if(action==='email_confirm'){const valid=d.hash===await verificationHash(d.id,actor,code);if(valid){account.email=account.pendingEmail.email;account.pendingEmail=null;}return {data:{verified:valid,reason:'Código inválido.'},error:null};}
  return {data:{ok:true},error:null};
 }};
 const user={auth:{getUser:async()=>({data:{user:{id:actor}},error:authError})}};
 const passwordClient=()=>({auth:{signInWithPassword:async(input)=>{reauth.push(input);return input.password===secret?{data:{user:{id:wrongUser?rid:actor},session:{access_token:'temporary-private'}},error:null}:{data:{},error:{}};},signOut:async options=>{assert.equal(options.scope,'local');return {error:null};}}});
 const fetcher=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);deliveries.push(body);code=body.text.match(/Código: (\d{8})/)[1];assert.equal(options.headers['Idempotency-Key'],'operator-self-email/'+account.pendingEmail.id);if(provider==='timeout')throw Error('synthetic timeout');if(provider==='rejected')return Response.json({}, {status:422});return Response.json({id:'synthetic-receipt'});};
 const invoke=async(action,input={},extra={})=>handleSelfAccount(new Request('https://synthetic.invalid',{method:'POST',headers:{Authorization:'Bearer '+tokenValue,'Content-Type':'application/json'},body:JSON.stringify({contract:'operator-self-account-1.0.0',action,input,...extra})}),{user,server,passwordClient,fetcher});
 return {invoke,calls,deliveries,updates,reauth,get code(){return code;},get account(){return account;}};
}
test('all profiles read their own data without administration and spoofed target is rejected',async()=>{
 for(const profile of ['super_admin','owner','recruiter','member']){const f=fixture({profile});assert.equal((await f.invoke('read')).status,200);assert.ok(f.calls.every(c=>c.args.p_actor===actor&&c.args.p_session===session));assert.equal((await f.invoke('read',{}, {userId:rid})).status,400);}
});
test('save normalizes username and phone; rejects protected fields, Owner rename and invalid data',async()=>{
 const input={revision:'revision',fullName:' Nome válido ',username:' Renamed.Member ',phoneCountryIso2:'BR',phoneNationalNumber:'(11) 99999-9999'};const f=fixture();assert.equal((await f.invoke('save',input)).status,200);const call=f.calls.find(c=>c.args?.p_action==='save');assert.equal(call.args.p_data.username,'renamed.member');assert.equal(call.args.p_data.phoneE164,'+5511999999999');assert.equal(f.updates.length,0);
 for(const extra of [{profile:'super_admin'},{email:'bypass@example.invalid'},{userId:rid}])assert.equal((await f.invoke('save',{...input,...extra})).status,400);
 assert.equal((await fixture({profile:'owner'}).invoke('save',input)).status,403);assert.equal((await f.invoke('save',{...input,phoneNationalNumber:'1'})).status,400);assert.equal((await f.invoke('save',{...input,username:'admin'})).status,400);
});
test('wrong password and identity mismatch block e-mail and password changes before provider mutation',async()=>{
 for(const wrongUser of [false,true])for(const action of ['request_email','password']){const f=fixture({wrongUser});const r=await f.invoke(action,{...(action==='request_email'?{email:'new@example.invalid'}:{password:'Another!987',confirmation:'Another!987'}),currentPassword:wrongUser?secret:'wrong'});assert.equal(r.status,403);assert.equal(f.updates.length+f.deliveries.length,0);assert.equal(f.calls.find(c=>c.args?.p_action==='security_finish').args.p_data.state,'rejected');}
});
test('email proof changes contact only after a code, using shared-contact identity and idempotent existing transport',async()=>{
 const f=fixture();const r=await f.invoke('request_email',{email:'New@Example.invalid',currentPassword:secret});assert.equal(r.status,200);const body=await r.text();assert.ok(!body.includes(f.code)&&!body.includes(secret)&&!body.includes('re_synthetic'));assert.equal(f.account.email,'shared@example.invalid');assert.equal(f.deliveries[0].to[0],'new@example.invalid');assert.equal(f.updates.length,0);const claim=f.calls.find(c=>c.args?.p_action==='email_begin').args.p_data;assert.equal(claim.hash,await verificationHash(claim.id,actor,f.code));assert.equal(claim.hash.length,64);
 assert.equal((await f.invoke('confirm_email',{id:claim.id,code:f.code==='00000000'?'11111111':'00000000'})).status,400);assert.equal((await f.invoke('confirm_email',{id:claim.id,code:f.code})).status,200);assert.equal(f.account.email,'new@example.invalid');
});
test('legacy identity migrates to technical alias without resetting password before contact confirmation',async()=>{const f=fixture({email:'old@example.invalid'});assert.equal((await f.invoke('request_email',{email:'new@example.invalid',currentPassword:secret})).status,200);assert.deepEqual(f.updates[0],{id:actor,input:{email:'auth+'+actor+'@users.prisma.invalid',email_confirm:true}});assert.equal(f.account.email,'shared@example.invalid');});
test('mail failure or lost response retains old contact and records failed versus unknown without live retry',async()=>{
 for(const provider of ['rejected','timeout']){const f=fixture({provider});assert.equal((await f.invoke('request_email',{email:'new@example.invalid',currentPassword:secret})).status,502);assert.equal(f.account.email,'shared@example.invalid');assert.equal(f.deliveries.length,1);assert.equal(f.account.pendingEmail.sendState,provider==='rejected'?'failed':'unknown');}
});
test('eight-character password requirements enforced and current password reverified; no secret in RPC ledger',async()=>{
 const f=fixture();assert.equal((await f.invoke('password',{currentPassword:secret,password:'Ab1!567',confirmation:'Ab1!567'})).status,400);assert.equal(f.reauth.length,0);
 assert.equal((await f.invoke('password',{currentPassword:secret,password:'Ab1!5678',confirmation:'Ab1!5678'})).status,200);assert.deepEqual(f.updates[0],{id:actor,input:{password:'Ab1!5678'}});assert.ok(!JSON.stringify(f.calls).includes(secret)&&!JSON.stringify(f.calls).includes('Ab1!5678'));assert.equal(f.calls.at(-1).args.p_state,'changed');
});
test('failure of final audit does not falsely claim password was unchanged',async()=>{const f=fixture({failAudit:true});const r=await f.invoke('password',{currentPassword:secret,password:'Ab1!5678',confirmation:'Ab1!5678'});assert.equal(r.status,502);assert.match((await r.json()).error,/senha foi alterada/);assert.equal(f.calls.at(-1).args.p_state,'unknown');});

test("unauthenticated, malformed and oversized requests are denied before data RPC",async()=>{for(const options of [{authError:true},{tokenValue:"not-a-jwt"}]){const f=fixture(options);assert.equal((await f.invoke("read")).status,401);assert.equal(f.calls.length,0);}const f=fixture();assert.equal((await f.invoke("read",{large:"x".repeat(17000)})).status,413);assert.equal(f.calls.length,0);});
