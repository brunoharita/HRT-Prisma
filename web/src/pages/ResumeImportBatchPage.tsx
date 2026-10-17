import {useEffect,useRef,useState,type ReactNode} from "react";
import {Alert,Button,Empty,Modal,Space,Tabs,Tag,Upload} from "antd";
import {CloudUploadOutlined,FilePdfOutlined,PlusOutlined} from "@ant-design/icons";
import {extractResumeIdentity} from "../../../src/domain/resumeIdentity";
import {validateAndProcessPdf,type PdfProcessingProgress,type ResumeIntakeResolutionResult,type PersonIngestionWorkspace} from "../domain/personIngestion";
import {RESUME_BATCH_LIMIT,runSerialResumeBatch,type PreparedBatchResume,type ResumeBatchItem} from "../domain/resumeBatch";
import {parserIaEnabled,prepareParserIa} from "../infrastructure/parserIaClient";
import {parserIaIdentity} from "../domain/parserIa";
import {personIngestionService} from "../infrastructure/supabase/personIngestionService";
import type {OrganizationMembership} from "../shared/access";
import {useUnsavedChanges,useViewState} from "../ui/PrismaNavigation";
import {useParserReadiness} from "../ui/useParserReadiness";
import {parserReadinessBlocksImport,parserReadinessTitles} from "../domain/parserReadiness";
import {useLoadingFeedback} from "../ui/PrismaLoadingFeedback";
import {useRecentWork} from "../ui/useRecentWork";
import {PrismaPage,PrismaPageHeader} from "../ui/PrismaPage";
import {PrismaCard} from "../ui/PrismaCard";
import {TokenUsageHint} from "../ui/TokenUsageHint";
import "../ui/uxEvolution.css";

interface Props {activeMembership:OrganizationMembership;onNavigate:(path:string)=>void;intakeKey:(org:string,checksum:string)=>string;renderSingle:(item:ResumeBatchItem,onResolved:(resolved:ResumeIntakeResolutionResult,analysis:PersonIngestionWorkspace)=>void,onReturn:()=>void,onPrepared:(prepared:PreparedBatchResume)=>void)=>ReactNode;}
const labels={waiting:"Aguardando início",reading:"Leitura em andamento",identity:"Conferir identificação",ready:"Pronto para revisar",published:"Publicado",failed:"Não foi possível concluir"};
const colors={waiting:"default",reading:"processing",identity:"gold",ready:"green",published:"green",failed:"red"};
export function ResumeImportBatchPage({activeMembership,onNavigate,intakeKey,renderSingle}:Props) {
  const [items,setItems]=useViewState<ResumeBatchItem[]>("resumeBatch",[],"/profiles/import"),[selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState("files"),[running,setRunning]=useState(false),[checking,setChecking]=useState(false),[error,setError]=useState<string|null>(null),[progress,setProgress]=useState<PdfProcessingProgress|null>(null),[guide,setGuide]=useState(false);
  const lock=useRef(false),mounted=useRef(false),pause=useRef(false);
  const {readiness,refresh}=useParserReadiness(activeMembership.organizationId,!running&&!selected&&activeMembership.role!=="member");
  useLoadingFeedback({"Processando fila de currículos…":running||checking});
  useRecentWork({path:"/profiles/import",title:"Importação de currículos",detail:"Arquivos e revisões desta sessão"});
  useUnsavedChanges(running||checking||items.some(i=>i.status==="waiting"));
  useEffect(()=>{mounted.current=true;setItems(list=>list.map(i=>i.status==="reading"?{...i,status:"waiting"}:i));return()=>{mounted.current=false;pause.current=true;};},[]);
  // Returning from a review reads authoritative document state, never marks publication optimistically.
  useEffect(()=>{let active=true;
    for(const item of items){const intake=item.prepared?.intake;if(intake?.kind!=="resolved"||!["ready","published"].includes(item.status))continue;
      void personIngestionService.loadWorkspace(activeMembership.organizationId,intake.personId,intake.documentId).then(workspace=>{if(!active||!workspace)return;const document=workspace.selectedDocument;const status=document?.reviewState==="approved"?"published":"ready";setItems(list=>list.map(i=>i.id===item.id?{...i,status}:i));}).catch(()=>{/* Row remains explicitly ready for review; opening it rechecks access/state. */});
    }
    return()=>{active=false;};
  },[selected,activeMembership.organizationId]);
  const update=(id:string,patch:Partial<ResumeBatchItem>)=>setItems(list=>list.map(i=>i.id===id?{...i,...patch}:i));
  const active=()=>mounted.current;
  async function start(onlyId?:string){
    if(lock.current||activeMembership.role==="member")return;
    if(!parserIaEnabled()){setError("O Parser IA não está disponível. A importação não foi iniciada.");return;}
    const queue=items.filter(i=>onlyId?i.id===onlyId&&i.status==="failed":i.status==="waiting");
    if(!queue.length)return;
    lock.current=true;pause.current=false;setChecking(true);setError(null);
    const known=new Map(items.flatMap(i=>i.prepared?[[i.prepared.processed.sha256,i.prepared] as const]:[]));
    try{
      const checked=await refresh();if(!active()||pause.current)return;
      if(parserReadinessBlocksImport(checked)){setError("O serviço não está disponível para iniciar. Os arquivos foram mantidos.");return;}
      setChecking(false);setRunning(true);
      await runSerialResumeBatch(queue,async item=>{
        update(item.id,{status:"reading",error:undefined});setProgress(null);
        const native=await validateAndProcessPdf(item.file,p=>{if(active())setProgress(p);},{nativeOnlyForParserIa:true});
        if(!active())throw Error("IMPORT_CONTEXT_CHANGED");
        const cached=known.get(native.sha256);if(cached)return cached;
        const processed=await prepareParserIa(native,activeMembership.organizationId);
        if(!active())throw Error("IMPORT_CONTEXT_CHANGED");
        const identity=processed.parserIa?parserIaIdentity(processed.parserIa):extractResumeIdentity(processed.pages);
        const intake=await personIngestionService.beginResumeIntake(activeMembership.organizationId,processed,identity,intakeKey(activeMembership.organizationId,processed.sha256));
        const prepared={processed,identity,intake};known.set(processed.sha256,prepared);return prepared;
      },active,(item,prepared)=>update(item.id,{status:prepared.intake.kind==="resolved"?"ready":"identity",prepared,error:undefined}),
      (item,caught)=>update(item.id,{status:"failed",error:caught instanceof Error?caught.message:"Não foi possível ler este arquivo. Substitua o PDF ou tente novamente."}),()=>!pause.current);
    }catch(caught){if(active())setError(caught instanceof Error?caught.message:"Não foi possível iniciar a fila. Tente novamente.");}
    finally{lock.current=false;if(mounted.current){setItems(list=>list.map(i=>i.status==="reading"?{...i,status:"waiting"}:i));setRunning(false);setChecking(false);setProgress(null);}}
  }
  if(activeMembership.role==="member")return <Alert type="warning" showIcon title="A importação é disponível somente para operadores autorizados."/>;
  const busy=running||checking;
  const selectedItem=items.find(i=>i.id===selected);
  if(selectedItem?.prepared)return <div className="prisma-v310">{renderSingle(selectedItem,(resolved,analysis)=>{setItems(list=>list.map(item=>item.prepared?.intake.intakeId===resolved.intakeId?{...item,prepared:{...item.prepared!,intake:resolved},status:analysis.selectedDocument?.reviewState==="approved"?"published":"ready"}:item));},()=>setSelected(null),prepared=>setItems(list=>list.map(item=>item.prepared?.intake.intakeId===prepared.intake.intakeId?{...item,prepared,status:prepared.intake.kind==="resolved"?"ready":"identity"}:item)))}</div>;
  const waiting=items.filter(i=>i.status==="waiting"),ready=items.filter(i=>i.status==="ready"),attention=items.filter(i=>i.status==="failed"||i.status==="identity");
  const next=items.find(i=>i.status==="ready")??items.find(i=>i.status==="identity");
  function addFiles(files:File[]){if(lock.current)return;const room=RESUME_BATCH_LIMIT-items.length;if(files.length>room)setError(`O lote aceita até ${RESUME_BATCH_LIMIT} arquivos. Os arquivos excedentes não foram adicionados.`);setItems(list=>[...list,...files.slice(0,room).map(file=>({id:crypto.randomUUID(),file,status:"waiting" as const}))]);}
  return <PrismaPage className="prisma-v310 prisma-resume-batch prisma-content-standard prisma-reading">
    <PrismaPageHeader icon={<FilePdfOutlined/>} title="Importar currículos" description="Acompanhe cada arquivo e revise antes de publicar." actions={<Upload accept="application/pdf,.pdf" multiple showUploadList={false} disabled={busy||items.length>=RESUME_BATCH_LIMIT} beforeUpload={(_file,files)=>{if(_file.uid===files[0]?.uid)addFiles(files);return Upload.LIST_IGNORE;}}><Button icon={<PlusOutlined/>} disabled={busy||items.length>=RESUME_BATCH_LIMIT}>Adicionar arquivos</Button></Upload>}/>
    <Tabs activeKey={tab} onChange={setTab} items={[{key:"files",label:"Arquivos"},{key:"integrations",label:"Integrações"}]}/>
    {error?<Alert type="error" showIcon title={error} action={<Button disabled={busy} onClick={()=>{setTab("files");void refresh();}}>Conferir arquivos e serviço</Button>} closable onClose={()=>setError(null)}/>:null}
    {tab==="files"?<>
      <div className="prisma-import-summary"><div><strong>{items.length} arquivos</strong><span>Neste lote da sessão</span></div><div><strong>{ready.length} para revisar</strong><span>Leitura concluída</span></div><div><strong>{attention.length} precisam de atenção</strong><span>Identificação ou arquivo</span></div></div>
      {!items.length?<PrismaCard><Upload.Dragger accept="application/pdf,.pdf" multiple showUploadList={false} beforeUpload={(_file,files)=>{if(_file.uid===files[0]?.uid)addFiles(files);return Upload.LIST_IGNORE;}}><p className="ant-upload-drag-icon"><CloudUploadOutlined/></p><p className="ant-upload-text">Arraste os currículos ou selecione arquivos</p><p>Até {RESUME_BATCH_LIMIT} PDFs por lote · 15 MB por arquivo</p><Button type="primary">Selecionar arquivos</Button></Upload.Dragger></PrismaCard>:<PrismaCard title="Arquivos do lote" extra={next?<Button type="primary" disabled={busy} onClick={()=>setSelected(next.id)}>Revisar próximo</Button>:undefined}>
        <p>Os arquivos são tratados individualmente na {activeMembership.organizationName}.</p>
        {items.map(item=><article key={item.id} className="prisma-import-file"><FilePdfOutlined/><div><strong>{item.prepared?.identity.fullName??item.file.name}</strong><small>{item.file.name} · {(item.file.size/1048576).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB</small>{item.error?<p>{item.error}</p>:null}{item.status==="reading"&&progress?<small role="status">{progress.message}</small>:null}</div><Tag color={colors[item.status]}>{labels[item.status]}</Tag><Space wrap>
          {item.prepared?<Button type="link" disabled={busy} onClick={()=>setSelected(item.id)}>{item.status==="identity"?"Conferir":item.status==="published"?"Consultar":"Revisar"}</Button>:null}
          {item.status==="failed"?<Button disabled={busy} onClick={()=>void start(item.id)}>Tentar novamente</Button>:null}
          {["failed","waiting"].includes(item.status)?<Button disabled={busy} onClick={()=>setItems(list=>list.filter(i=>i.id!==item.id))}>{item.status==="failed"?"Retirar e substituir":"Retirar"}</Button>:null}
        </Space></article>)}
        <div className="prisma-import-actions">{running?<Button onClick={()=>{pause.current=true;}}>Pausar após o arquivo atual</Button>:null}{waiting.length?<Button type="primary" loading={busy} disabled={parserReadinessBlocksImport(readiness)} onClick={()=>void start()}>Iniciar leitura ({waiting.length})</Button>:null}{items.length&&!busy?<Button onClick={()=>Modal.confirm({title:"Encerrar este lote?",content:"Os arquivos recebidos no servidor, as Pessoas e as revisões continuam preservados. A fila desta sessão será limpa.",okText:"Encerrar lote",cancelText:"Continuar no lote",onOk:()=>setItems([])})}>Encerrar lote</Button>:null}</div>
      </PrismaCard>}
      {!running?<Alert type={readiness.state==="available"?"success":"info"} showIcon title={parserReadinessTitles[readiness.state]} action={<Button onClick={()=>void refresh()}>Verificar disponibilidade</Button>}/>:null}
      {parserIaEnabled()?<TokenUsageHint organizationId={activeMembership.organizationId} functionName="parser_ia"/>:null}
      <p>A leitura é iniciada por você e pode consumir Tokens Prisma por arquivo. Os PDFs serão enviados ao serviço de IA já utilizado pelo Prisma. Nenhum Perfil é publicado automaticamente.</p>
      <p>A fila fica nesta sessão e empresa. Ao sair durante a leitura, o próximo arquivo aguarda seu retorno. Os arquivos já recebidos e revisões ficam preservados no servidor; após recarregar a página, consulte Pessoas e suas revisões.</p>
      <Button type="link" onClick={()=>onNavigate("/profiles")}>Consultar Pessoas e revisões</Button>
    </>:<PrismaCard title="Trazer dados do sistema atual"><p>Os currículos em PDF exportados pelo seu sistema podem ser enviados pela aba Arquivos. A identificação, as correspondências e o conteúdo serão conferidos antes da publicação.</p><div className="prisma-integrations-row"><div><h3>Arquivos exportados pelo sistema atual</h3><p>Para dados tabulares, a origem e o formato precisam ser definidos antes do mapeamento.</p></div><Button onClick={()=>setGuide(true)}>Preparar integração</Button></div><div className="prisma-integrations-row"><div><h3>Conexão por API</h3><p>Disponibilização depende da definição da origem, escopo e permissões.</p></div><Tag>Conexão futura</Tag></div><Button type="primary" onClick={()=>setTab("files")}>Importar currículos em PDF</Button></PrismaCard>}
    <Modal title="Preparar integração de dados" open={guide} onCancel={()=>setGuide(false)} footer={<Button onClick={()=>setGuide(false)}>Concluir</Button>}><ol><li><strong>Definir a origem:</strong> identifique o sistema e a exportação autorizada.</li><li><strong>Conferir os campos:</strong> identificação, conteúdo profissional e empresa de destino, preservando a origem.</li><li><strong>Revisar a entrada:</strong> confira correspondências e documentos antes da publicação.</li></ol><p>Arquivos tabulares e conexões por API ainda não estão habilitados. Nenhum dado ou credencial é enviado por esta preparação.</p></Modal>
  </PrismaPage>;
}
