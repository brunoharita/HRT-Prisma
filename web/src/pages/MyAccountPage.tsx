import {useEffect,useState} from "react";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import {focusNoticeFields} from "../ui/noticeActions";
import {Alert,Button,Form,Input,Modal,Select,Space,Spin} from "antd";
import {UserOutlined,CheckOutlined} from "@ant-design/icons";
import {PrismaCard} from "../ui/PrismaCard";
import {PrismaPage,PrismaPageHeader} from "../ui/PrismaPage";
import {useUnsavedChanges,confirmPrismaNavigation} from "../ui/PrismaNavigation";
import {selfAccountService} from "../infrastructure/supabase/selfAccountService";
import type {SelfAccount,SelfAccountInput} from "../domain/selfAccount";
import {COUNTRY_PHONE_OPTIONS,describePlatformAccessProfile,describePlatformUserStatus,normalizeUsername,validateUsername,buildPasswordRequirementState,PASSWORD_MIN_LENGTH,normalizePhoneInput} from "../shared/platformUsers";
import "./UserFormPage.css";
import "./MyAccountPage.css";

export function MyAccountPage({onNavigate,onChanged,onPasswordChanged}:{onNavigate:(path:string)=>void;onChanged:()=>Promise<void>;onPasswordChanged:(confirmed?:boolean)=>Promise<void>}){
 const [form]=Form.useForm<SelfAccountInput>(),[emailForm]=Form.useForm(),[codeForm]=Form.useForm(),[passwordForm]=Form.useForm();
 const [account,setAccount]=useState<SelfAccount|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState<string|null>(null),[info,setInfo]=useState<string|null>(null),[modal,setModal]=useState<"email"|"password"|null>(null);
 const markSaved=useUnsavedChanges(dirty);
 useLoadingFeedback({"Carregando seu cadastro…":loading,"Atualizando seu cadastro…":busy});
 const password=Form.useWatch("password",passwordForm)??"",confirmation=Form.useWatch("confirmation",passwordForm)??"";
 const rules=buildPasswordRequirementState(password,confirmation,account?.username??"");
 function accept(a:SelfAccount,resetBasic=true){setAccount(a);if(resetBasic){form.setFieldsValue({...a,phoneCountryIso2:a.phoneCountryIso2??"BR",phoneNationalNumber:a.phoneNationalNumber??""});setDirty(false);markSaved();}}
 useEffect(()=>{let active=true;void selfAccountService.read().then(a=>{if(active)accept(a);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function refreshShared(){try{await onChanged();}catch{setError("Os dados foram salvos, mas a identificação na tela não foi atualizada. Recarregue a página.");}}
 async function run(work:()=>Promise<void>){setBusy(true);setError(null);setInfo(null);try{await work();}catch(e){if(e instanceof Error&&["changed","unknown"].includes((e as any).passwordOutcome)){close();await onPasswordChanged((e as any).passwordOutcome==="changed");}else setError(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setBusy(false);}}
 function close(){if(modal==="password")passwordForm.resetFields();if(modal==="email"){emailForm.resetFields();if(account?.pendingEmail)codeForm.resetFields();}setModal(null);setError(null);}
 async function save(v:SelfAccountInput){if(!account)return;await run(async()=>{const old=account.username;accept(await selfAccountService.save({...v,revision:account.revision}));setInfo(old===v.username?"Cadastro atualizado.":`Cadastro atualizado. No próximo acesso, use o username ${normalizeUsername(v.username)}.`);await refreshShared();});}
 async function requestEmail(v:{email:string;currentPassword:string}){await run(async()=>{
  try{accept(await selfAccountService.requestEmail(v.email,v.currentPassword),false);emailForm.resetFields();setInfo("Confirmação aceita pelo serviço de envio. Informe o código recebido no novo e-mail.");}
  catch(e){emailForm.resetFields(["currentPassword"]);try{accept(await selfAccountService.read(),false);}catch{/* Keep current account and original error. */}throw e;}
 });}
 const pending=account?.pendingEmail;
 const securityGuard=dirty?<Alert type="info" showIcon title="Salve ou descarte as alterações dos dados básicos antes de alterar e-mail ou senha."/>:null;
 return <PrismaPage className="prisma-user-form prisma-my-account"><PrismaPageHeader icon={<UserOutlined/>} title="Meu cadastro" description="Atualize seus dados de acesso e contato." actions={<Space><Button disabled={busy} onClick={()=>onNavigate("/")}>Cancelar</Button><Button type="primary" htmlType="submit" form="self-account-basic" loading={busy} disabled={!account||!dirty||loading}>Salvar alterações</Button></Space>}/>
 {error?<Alert className="prisma-shell-alert" type="error" showIcon title={error} action={<Button disabled={busy} onClick={()=>void run(async()=>{if(await confirmPrismaNavigation())accept(await selfAccountService.read());})}>Recarregar cadastro</Button>}/>:null}
 {info?<Alert className="prisma-shell-alert" type="success" showIcon title={info}/>:null}
 {loading?<Spin description="Carregando seu cadastro…"><div style={{minHeight:160}}/></Spin>:account?<>
 <Form<SelfAccountInput> id="self-account-basic" form={form} className="prisma-user-form" layout="vertical" requiredMark={false} onValuesChange={()=>setDirty(true)} onFinish={v=>void save(v)} disabled={busy}>
 <PrismaCard className="prisma-user-form-card"><section className="prisma-user-form-section"><h2>Dados básicos</h2><div className="prisma-self-account-grid">
 <Form.Item label="Nome completo *" name="fullName" rules={[{required:true,whitespace:true,min:2,max:160,message:"Informe o nome completo, de 2 a 160 caracteres."}]}><Input autoComplete="name"/></Form.Item>
 <Form.Item label="Nome de usuário *" name="username" normalize={normalizeUsername} extra={account.profile==="owner"?"O username do Owner é definido automaticamente na criação.":"Este é o identificador usado no login."} rules={[{validator:async(_,v)=>{const message=validateUsername(String(v??""));if(message)throw Error(message);}}]}><Input disabled={account.profile==="owner"} autoComplete="username"/></Form.Item>
 <Form.Item label="E-mail atual"><Input aria-label="E-mail atual" value={account.email} disabled/></Form.Item>
 <Form.Item label="País do celular *" name="phoneCountryIso2" rules={[{required:true}]}><Select options={COUNTRY_PHONE_OPTIONS.map(c=>({value:c.iso2,label:`${c.callingCode} ${c.label}`}))}/></Form.Item>
 <Form.Item label="Celular *" name="phoneNationalNumber" dependencies={["phoneCountryIso2"]} rules={[{validator:async(_,v)=>{const result=normalizePhoneInput(form.getFieldValue("phoneCountryIso2"),String(v??""));if(result.error)throw Error(result.error);}}]}><Input autoComplete="tel-national" inputMode="tel"/></Form.Item>
 </div></section></PrismaCard></Form>
 <PrismaCard className="prisma-user-form-card"><section className="prisma-user-form-section"><h2>Acesso e permissões</h2><p>Estas informações são definidas pela administração.</p><Form layout="vertical" disabled><div className="prisma-self-account-grid">
 <Form.Item label="Perfil de acesso"><Input aria-label="Perfil de acesso" disabled value={describePlatformAccessProfile(account.profile)}/></Form.Item><Form.Item label="Status"><Input aria-label="Status" disabled value={describePlatformUserStatus(account.status)}/></Form.Item><Form.Item label="Grupo"><Input aria-label="Grupo" disabled value={account.profile==="super_admin"?"Todos os grupos":account.groupName??"Não definido"}/></Form.Item><Form.Item label="Empresas permitidas"><Select aria-label="Empresas permitidas" mode="multiple" disabled value={account.profile==="super_admin"?["Todas as empresas"]:account.companies} options={(account.profile==="super_admin"?["Todas as empresas"]:account.companies).map(n=>({label:n,value:n}))}/></Form.Item>
 </div></Form></section></PrismaCard>
 <PrismaCard className="prisma-user-form-card"><section className="prisma-user-form-section"><h2>Segurança e contato</h2>{securityGuard}<p>A troca de e-mail ou senha exige sua senha atual. O novo e-mail só passa a receber a recuperação de acesso depois da confirmação.</p>
 {pending?<Alert type={pending.sendState==="failed"?"warning":"info"} showIcon title={`Alteração de e-mail pendente: ${pending.email}`} description="Seu e-mail atual continua válido até a confirmação. O código expira em 15 minutos."/>:null}
 <Space wrap style={{marginTop:16}}><Button disabled={dirty||busy} onClick={()=>setModal("email")}>{pending?"Confirmar ou reenviar código":"Alterar e-mail"}</Button><Button disabled={dirty||busy} onClick={()=>setModal("password")}>Trocar senha</Button></Space>
 </section></PrismaCard>
 <Modal title={modal==="password"?"Trocar senha":"Alterar e-mail"} open={!!modal} onCancel={()=>{if(!busy)close();}} mask={{closable:!busy}} closable={!busy} footer={null} rootClassName="prisma-content-standard prisma-reading prisma-user-form" destroyOnHidden>
 {error?<Alert type="error" showIcon title={error} style={{marginBottom:16}} action={<Button onClick={event=>focusNoticeFields(event.currentTarget)}>Ver campos do formulário</Button>}/>:null}
 {modal==="password"?<Form form={passwordForm} layout="vertical" onFinish={v=>void run(async()=>{await selfAccountService.password(v.currentPassword,v.password,v.confirmation);close();setInfo("Senha atualizada. Entre novamente com sua nova senha.");await onPasswordChanged();})}>
 <p>Ao atualizar a senha, suas sessões serão encerradas e será necessário entrar novamente.</p><Form.Item label="Senha atual" name="currentPassword" rules={[{required:true,message:"Informe a senha atual."}]}><Input.Password autoComplete="current-password"/></Form.Item><Form.Item label="Nova senha" name="password" rules={[{required:true,message:"Informe a nova senha."}]}><Input.Password autoComplete="new-password"/></Form.Item><Form.Item label="Confirmar nova senha" name="confirmation" rules={[{required:true,message:"Confirme a nova senha."}]}><Input.Password autoComplete="new-password"/></Form.Item>
 <div className="prisma-user-password-checklist is-standalone"><h3>Requisitos mínimos</h3><ul>{[[rules.minLength,`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`],[rules.uppercase,"Letra maiúscula"],[rules.lowercase,"Letra minúscula"],[rules.number,"Número"],[rules.symbol,"Caractere especial"],[rules.confirmationMatches,"As senhas coincidem"]].map(([ok,label])=><li key={String(label)} className={ok?"is-satisfied":"is-pending"}><span className="prisma-user-rule-icon" aria-hidden="true">{ok?<CheckOutlined/>:"•"}</span><span>{String(label)}</span><span className="prisma-user-rule-status">{ok?"Atendido":"Pendente"}</span></li>)}</ul></div><Button type="primary" htmlType="submit" loading={busy}>Atualizar senha</Button></Form>:<>
 {pending?<><p>Informe o código enviado para <strong>{pending.email}</strong>. Expira em {new Date(pending.expiresAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.</p><Form form={codeForm} layout="vertical" onFinish={v=>void run(async()=>{accept(await selfAccountService.confirmEmail(pending.id,v.code));close();setInfo("Novo e-mail confirmado e atualizado.");await refreshShared();})}><Form.Item label="Código de confirmação" name="code" rules={[{pattern:/^\d{8}$/,required:true,message:"Informe os oito dígitos do código."}]}><Input inputMode="numeric" autoComplete="one-time-code" maxLength={8}/></Form.Item><Space wrap><Button type="primary" htmlType="submit" loading={busy}>Confirmar e-mail</Button><Button disabled={busy} onClick={()=>void run(async()=>{accept(await selfAccountService.cancelEmail(pending.id));close();setInfo("Alteração cancelada. Seu e-mail atual foi mantido.");})}>Cancelar alteração de e-mail</Button></Space></Form><hr/><p>Não recebeu? Aguarde um minuto e solicite outro código. O código anterior será invalidado.</p></>:null}
 <Form form={emailForm} layout="vertical" onFinish={v=>void requestEmail(v)}><Form.Item name="email" label={pending?"Novo e-mail / reenviar código":"Novo e-mail"} rules={[{required:true,type:"email",message:"Informe um e-mail válido."}]}><Input autoComplete="email"/></Form.Item><Form.Item label="Senha atual" name="currentPassword" rules={[{required:true,message:"Informe a senha atual."}]}><Input.Password autoComplete="current-password"/></Form.Item><Button type={pending?"default":"primary"} htmlType="submit" loading={busy}>Enviar código</Button></Form>
 </>}
 </Modal></>:null}</PrismaPage>;
}
