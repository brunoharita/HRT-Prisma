import {randomInt} from 'node:crypto';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {createServer} from 'vite';
const dir='docs/qa/evidence/first-access-v313',checks=[];await mkdir(dir,{recursive:true});const check=(name,pass)=>{checks.push({name,pass});assert.ok(pass,name);};
const group='00000000-0000-4000-8000-000000000100',company='00000000-0000-4000-8000-000000000110',route=`/organizations/${group}/owner/new`,origin='http://127.0.0.1:5848';
const server=await createServer({configFile:'tests/ui/visual-foundation.vite.config.mts',cacheDir:'tmp/vite-owner-v301',server:{port:5848},plugins:[{name:'owner-fixture',enforce:'pre',configureServer(s){s.middlewares.use((req,_res,next)=>{if(/^\/(organizations\/[^/]+\/owner\/new|users\/new|users\/edit-user|change-password|sign-in)(\?|$)/.test(req.url??''))req.url='/owner-onboarding.html'+((req.url??'').includes('?')?'?'+req.url.split('?')[1]:'');next();});},transform(_code,id){if(id.replaceAll('\\','/').endsWith('/app/PrismaApplication.tsx')){const start=_code.indexOf('export function SignInPage('),end=_code.indexOf('function LoadingScreen()',start);return 'import {Form,Input,Button,Alert} from "antd";import {LockOutlined,UserOutlined} from "@ant-design/icons";import {PRISMA_RELEASE} from "../config/releaseRegistry";'+_code.slice(start,end);}if(id.replaceAll('\\','/').endsWith('/infrastructure/supabase/client.ts'))return 'export const supabase={auth:{updateUser:async({password})=>{window.__passwordUpdateLength=password.length;return {error:null};}}};';if(/\/infrastructure\/supabase\/(?:platformUsersService|organizationAdministrationService)\.ts$/.test(id.replaceAll('\\','/')))return 'export {platformUsersService,organizationAdministrationService} from "../../../../tests/ui/owner-onboarding/service";';}}]});await server.listen();
const {chromium}=createRequire(import.meta.url)(process.env.PRISMA_PLAYWRIGHT_PATH??'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.PRISMA_BROWSER_PATH});

try {
 for(const width of [1448,390,320]){
  const p=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/users/edit-user?firstAccess=pending_first_access');
  await p.getByText('O primeiro acesso permanece pendente até o usuário concluir a definição da senha.',{exact:true}).waitFor();
  check(width+' pending state shown honestly',await p.locator('.prisma-user-form-status').getByText('Pendente',{exact:true}).isVisible());
  check(width+' pending label is not truncated',await p.locator('.prisma-user-form-status .ant-segmented-item-label').first().evaluate(e=>e.scrollWidth<=e.clientWidth));
  await p.getByLabel('Nome completo *',{exact:true}).fill('Usuário sintético atualizado');
  await p.screenshot({path:dir+'/pending-edit-'+width+'.png',fullPage:true});
  check(width+' preserved compact viewport',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.getByRole('button',{name:'Salvar alterações',exact:true}).first().click();await p.waitForFunction(()=>window.__submitted);
  check(width+' edit submits enablement intent without concluding first access',await p.evaluate(()=>window.__submitted.input.fullName==='Usuário sintético atualizado'&&window.__submitted.input.groupId.endsWith('000100')&&window.__submitted.input.organizationIds[0].endsWith('000110')&&window.__submitted.input.status==='active'&&!window.__firstAccessCompleted&&!window.__passwordUpdateLength));
  await p.goto(origin+'/users/edit-user?firstAccess=pending_first_access');await p.locator('.prisma-user-form-status').getByText('Inativo',{exact:true}).click();
  await p.getByRole('button',{name:'Salvar alterações',exact:true}).first().click();await p.waitForFunction(()=>window.__submitted);
  check(width+' administrative disable intent is actually submitted',await p.evaluate(()=>window.__submitted.input.status==='inactive'&&!window.__firstAccessCompleted));
  await p.goto(origin+'/users/edit-user?firstAccess=blocked');await p.getByText('A edição do cadastro preserva o bloqueio de acesso.',{exact:true}).waitFor();
  check(width+' blocked status visibly disabled',await p.locator('.prisma-user-form-status input').evaluateAll(items=>items.length===2&&items.every(e=>e.disabled)));
  check(width+' blocked label visible',await p.locator('.prisma-user-form-status').getByText('Bloqueado',{exact:true}).isVisible());
  await p.goto(origin+'/users/edit-user?firstAccess=active');await p.getByLabel('Nome completo *',{exact:true}).waitFor();
  check(width+' active editing retains enabled status control',await p.locator('.prisma-user-form-status input').evaluateAll(items=>items.length===2&&items.every(e=>!e.disabled)));
  check(width+' no runtime errors',errors.length===0);await p.close();
 }
} finally {await browser.close();await server.close();await writeFile(dir+'/browser.json',JSON.stringify({checks,limits:'Real UserFormPage, synthetic transports only; database state verified separately; no email or AI'},null,2));}
console.log(JSON.stringify({checks:checks.length,pass:true}));
