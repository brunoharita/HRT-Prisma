import {useCallback,useEffect,useRef,useState} from "react";
import {Alert,Button,Drawer,List,Space,Tag,Typography} from "antd";
import type {VacancyDraft} from "../domain/vacancy";
import type {TaxonomyCandidate} from "../domain/positionTaxonomy";
import type {PositionOccupationalRecognition as Recognition} from "../domain/positionOccupationalRecognition";
import {positionTaxonomyService} from "../infrastructure/supabase/positionTaxonomyService";
import {knowledgeService} from "../infrastructure/supabase/knowledgeService";
import {OccupationalRagPanel} from "./OccupationalRagPanel";
import {OCCUPATIONAL_SEARCH_VERSION} from "../../../src/domain/occupationalRag";

const statusLabels:Record<string,string>={research_queued:"Na fila",researching:"Reconhecendo",awaiting_human_review:"Revisão pendente",approved:"Aprovado na empresa",failed:"Reconhecimento indisponível",deferred:"Mantido pendente"};
const pending=(status:string|undefined)=>status==="research_queued"||status==="researching";
export function PositionOccupationalRecognition({open,organizationId,draft,onChoose}:{open:boolean;organizationId:string;draft:VacancyDraft;onChoose:(candidate:TaxonomyCandidate)=>void}){
 const [inboxId,setInboxId]=useState<string|null>(null),[result,setResult]=useState<Recognition|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[exact,setExact]=useState(false),[reviewOpen,setReviewOpen]=useState(false),[pollStopped,setPollStopped]=useState(false);
 const active=useRef(false),revision=useRef(0),inFlight=useRef(false),polls=useRef(0);
 useEffect(()=>{active.current=open;if(!open){setBusy(false);setReviewOpen(false);}return()=>{active.current=false;revision.current++;};},[open]);
 const refresh=useCallback(async(id:string)=>{
  const ticket=++revision.current;
  try{const data=await positionTaxonomyService.recognition(organizationId,id);if(active.current&&ticket===revision.current){setResult(data);setError(null);}}
  catch(e){if(active.current&&ticket===revision.current)setError(e instanceof Error?e.message:"Não foi possível atualizar o reconhecimento.");}
 },[organizationId]);
 useEffect(()=>{
  if(!open||!inboxId||!pending(result?.review.status)||pollStopped)return;
  const timer=window.setInterval(()=>{if(++polls.current>96){setPollStopped(true);window.clearInterval(timer);return;}void refresh(inboxId);},5000);
  return()=>window.clearInterval(timer);
 },[open,inboxId,result?.review.status,pollStopped,refresh]);
 async function request(){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError(null);const ticket=++revision.current;
  try{const id=await positionTaxonomyService.requestRecognition(organizationId,draft);if(!active.current||ticket!==revision.current)return;
   setInboxId(id);setExact(id===null);polls.current=0;setPollStopped(false);if(id)await refresh(id);
  }catch(e){if(active.current&&ticket===revision.current)setError(e instanceof Error?e.message:"Não foi possível solicitar o reconhecimento.");}
  finally{inFlight.current=false;if(active.current)setBusy(false);}
 }
 if(!open)return null;
 const row=result?.review,payload=row?.proposal?.status==="approved"&&row.proposal.edited?row.proposal.edited as NonNullable<typeof row.proposal>["original"]:row?.proposal?.original;
 return <section className="prisma-position-recognition" aria-label="Reconhecimento com IA">
  <Typography.Title level={5}>Reconhecer pelo contexto</Typography.Title>
  <Typography.Paragraph>Use título, missão e responsabilidades para buscar referências com IA. Sua associação atual permanece até você confirmar outra referência.</Typography.Paragraph>
  <Space wrap><Button loading={busy} disabled={!draft.title.trim()} onClick={()=>inboxId?void refresh(inboxId):void request()}>{inboxId?"Atualizar reconhecimento":"Reconhecer com IA"}</Button>{row?<Tag>{statusLabels[row.status]??"Aguardando análise"}</Tag>:null}</Space>
  {error?<Alert type="error" showIcon title={error} action={<Button onClick={()=>inboxId?void refresh(inboxId):void request()}>Tentar reconhecimento novamente</Button>}/>:null}
  {exact?<Alert type="info" showIcon title="Já existe correspondência aprovada para este título" description="Nenhuma nova pesquisa ou proposta foi criada. Você pode localizar e confirmar a referência pela busca abaixo."/>:null}
  {row?<>
   {pending(row.status)?<Typography.Paragraph role="status">O reconhecimento está em segundo plano. Você pode continuar pela busca manual.{pollStopped?" Use Atualizar reconhecimento para consultar o resultado.":" O resultado será atualizado automaticamente."}</Typography.Paragraph>:null}
   {row.status==="failed"?<Alert type="warning" showIcon title="O reconhecimento não foi concluído" description="Sua associação e o preenchimento permanecem preservados." action={<Button disabled={busy} onClick={async()=>{setBusy(true);try{await knowledgeService.retryOccupationalRecognition(row.id);polls.current=0;setPollStopped(false);await refresh(row.id);}catch(e){if(active.current)setError(e instanceof Error?e.message:"Não foi possível retomar o reconhecimento.");}finally{if(active.current)setBusy(false);}}}>Retomar reconhecimento</Button>}/>:null}
   {payload?<><Typography.Paragraph>{payload.rationale}</Typography.Paragraph>{payload.unresolved_questions.map(q=><Typography.Paragraph type="secondary" key={q}>{q}</Typography.Paragraph>)}<Typography.Text type="secondary">Referências para análise. Similaridade e funções relacionadas não estabelecem equivalência.</Typography.Text></>:null}
   <List dataSource={result?.candidates??[]} locale={{emptyText:pending(row.status)?"Aguardando referências do reconhecimento.":"Nenhuma referência aprovada elegível disponível. A ausência não comprova que a função inexiste."}} renderItem={candidate=><List.Item><div><Typography.Text strong>{candidate.label}</Typography.Text><div><Tag>{candidate.scope==="organization"?"Knowledge da empresa":"Base oficial publicada"}</Tag><Typography.Text type="secondary">v{candidate.version}</Typography.Text></div><Typography.Paragraph>{candidate.description}</Typography.Paragraph><Typography.Paragraph type="secondary">{candidate.sources.map(s=>`${s.name} · ${s.version}`).join("; ")||"Conhecimento aprovado na empresa"}</Typography.Paragraph><Button disabled={draft.referenceConceptId===candidate.id} onClick={()=>onChoose(candidate)}>{draft.referenceConceptId===candidate.id?"Associação atual":"Usar nesta Posição"}</Button></div></List.Item>}/>
   {row.proposal?<Button onClick={()=>setReviewOpen(true)}>{row.proposal.status==="awaiting_human_review"?"Revisar proposta na empresa":"Consultar revisão na empresa"}</Button>:null}
   {row.proposal?.status==="awaiting_human_review"&&!row.proposal.edited&&payload?.rag.search_prompt_version!==OCCUPATIONAL_SEARCH_VERSION?<Button loading={busy} onClick={async()=>{setBusy(true);try{await knowledgeService.retryOccupationalRecognition(row.id);polls.current=0;setPollStopped(false);await refresh(row.id);}catch(e){if(active.current)setError(e instanceof Error?e.message:"Não foi possível refazer o reconhecimento.");}finally{if(active.current)setBusy(false);}}}>Refazer reconhecimento</Button>:null}
   <Typography.Paragraph type="secondary">A aprovação na Knowledge e a associação nesta Posição são decisões distintas. A Posição só registra a mudança ao salvar.</Typography.Paragraph>
  </>:null}
  <Drawer open={reviewOpen&&open} onClose={()=>setReviewOpen(false)} size={1100} title="Revisão do cargo na Knowledge da empresa" destroyOnHidden className="prisma-position-recognition-review">
   {reviewOpen&&inboxId?<OccupationalRagPanel organizationId={organizationId} initialInboxId={inboxId} initialStage={1} onChanged={()=>{void refresh(inboxId);setReviewOpen(false);}}/>:null}
  </Drawer>
 </section>;
}
