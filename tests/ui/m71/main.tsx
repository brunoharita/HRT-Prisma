import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, Input, Select, Button, Space, Alert, Typography } from "antd";
import ptBR from "antd/locale/pt_BR";
import { PositionTaxonomyPanel } from "../../../web/src/components/PositionTaxonomyPanel";
import { positionTaxonomyService } from "../../../web/src/infrastructure/supabase/positionTaxonomyService";
import { emptyVacancyDraft } from "../../../web/src/domain/vacancy";
import { m71Fixture, m71Complement } from "../../fixtures/m71Taxonomy";
import {knowledgeService} from "../../../web/src/infrastructure/supabase/knowledgeService";
import "../../../web/src/styles.css";
let scenario = "resolved";
const params=new URLSearchParams(location.search),ragScenario=params.get("rag"),ragCalls:{kind:string;context?:unknown}[]=[],ragStates=new Map<string,any>();
Object.assign(window,{__positionRag:{calls:ragCalls,states:ragStates}});
const stock={id:"stock",label:"Gestor de Estoque",description:"Controla recebimento, armazenagem, inventário e expedição.",scope:"global",version:1,sources:[{name:"ESCO",version:"fixture"}]};
const unrelated=["Planificador de produção na indústria do couro/Planificadora de produção na indústria do couro","Representante comercial","Representante comercial autônomo"].map((label,i)=>({...stock,id:"unrelated-"+i,label,aliases:[]}));
function ragRow(id:string,title:string){const original={contract:"occupational-rag-1.0.0",input_hash:"a".repeat(64),proposed_concept:{canonical_label:title,concept_type:"occupation",description:"Coordena processos de estoque, inventário e expedição."},aliases:[],rationale:"Atividades de inventário e armazenagem sustentam esta referência para revisão humana.",unresolved_questions:[],candidate_concepts:ragScenario==="new"?[]:[{...stock,aliases:[]},...unrelated],rag:{decision:ragScenario==="new"?"new_concept":"alias",target_id:ragScenario==="new"?"":"stock",related_ids:["unrelated-1"],evidence:[{source_id:"context",quote:"Controlar inventário."}],method:"lexical-expansion-semantic-reranking"}};return {id,title,status:ragScenario==="queued"?"research_queued":ragScenario==="failed"?"failed":"awaiting_human_review",errorCode:null,context:{contract:"occupational-rag-1.0.0",responsibilities:"Controlar inventário.",origin:{kind:"manual"},input_hash:"a".repeat(64)},proposal:ragScenario==="queued"||ragScenario==="failed"?null:{id:"proposal",status:"awaiting_human_review",original,edited:null,model:"synthetic",decidedAt:null},globalContribution:null};}
positionTaxonomyService.requestRecognition=async(org,draft)=>{ragCalls.push({kind:"request",context:{org,...draft}});if(ragScenario==="exact")return null;if(ragScenario==="request-error"&&ragCalls.filter(c=>c.kind==="request").length===1)throw Error("Falha sintética no reconhecimento");if(ragScenario==="late")await new Promise(resolve=>Object.assign(window,{__resolvePositionRag:resolve}));const id=JSON.stringify([org,draft.title,draft.mission,draft.responsibilities]);if(!ragStates.has(id))ragStates.set(id,ragRow(id,draft.title));return id;};
positionTaxonomyService.recognition=async(_org,id)=>{ragCalls.push({kind:"read"});const review=ragStates.get(id);if(!review)throw Error("Contexto sintético não encontrado");return {review,candidates:review.proposal&&(ragScenario!=="new"||review.status==="approved")?[review.status==="approved"&&ragScenario==="new"?{...stock,id:"new-occupation",label:review.title,scope:"organization",sources:[]}:stock,...(review.status==="approved"?[]:unrelated)]:[]} as never;};
knowledgeService.loadOccupationalReviews=async()=>{throw Error("Embedded review must read its exact Inbox, not a fifty-row list");};
knowledgeService.approveOccupationalProposal=async(id,_hash,edited)=>{ragCalls.push({kind:"approve"});const row=[...ragStates.values()].find(r=>r.proposal?.id===id);row.status="approved";row.proposal.status="approved";row.proposal.edited={...row.proposal.original,proposed_concept:{...row.proposal.original.proposed_concept,description:edited.description},approved_related_ids:[]};return {};};
knowledgeService.retryOccupationalRecognition=async(id)=>{ragCalls.push({kind:"retry"});const row=ragStates.get(id);Object.assign(row,ragRow(id,row.title),{status:"awaiting_human_review",proposal:ragRow(id,row.title).proposal??ragRow(id,row.title).proposal});if(row.proposal)row.proposal.original.rag.search_prompt_version="occupational-search-1.0.1";if(!row.proposal){const normal=ragRow(id,row.title);normal.status="awaiting_human_review";normal.proposal={id:"proposal",status:"awaiting_human_review",original:{contract:"occupational-rag-1.0.0",input_hash:"a".repeat(64),proposed_concept:{canonical_label:row.title,concept_type:"occupation",description:"Controle de estoque"},aliases:[],candidate_concepts:[],unresolved_questions:[],rationale:"Revisão manual disponível.",rag:{decision:"insufficient",target_id:"",related_ids:[],evidence:[],method:"fixture"}},edited:null,model:"none",decidedAt:null} as never;Object.assign(row,normal);}};
positionTaxonomyService.preview = async (organizationId, title, conceptId, decision, complements, signal) => {
  await new Promise(resolve => setTimeout(resolve, scenario === "loading" ? 3000 : 200));
  if (signal?.aborted) throw new Error("aborted");
  if (scenario === "error") throw new Error("synthetic recovery");
  const state = decision === "cleared" ? "unresolved" : decision === "human" ? "resolved" : scenario === "ambiguous" ? "ambiguous" : scenario === "unresolved" ? "unresolved" : "resolved";
  const base = m71Fixture({ organizationId, originalTitle: title, state, decision,
    method: decision === "cleared" ? "human_removal" : decision === "human" ? "human_selection" : state === "resolved" ? "approved_exact_alias" : "no_safe_match",
    actorId: decision === "automatic" ? null : "synthetic-actor", complements: complements.length ? [m71Complement] : [] });
  if (state !== "resolved") return { ...base, concept: null, references: [], items: [],
    candidates: state === "ambiguous" ? [{ id: "occupation-fixture", label: "Software Developers", scope: "global", description: "Fixture oficial versionada" }, { id: "org-alternative", label: "Ocupação interna sintética", scope: "organization", description: "Fixture de ambiguidade" }] : [] };
  if(ragScenario&&conceptId)return {...base,concept:{...base.concept!,id:conceptId,label:conceptId==="stock"?stock.label:"Nova referência aprovada",scope:conceptId==="stock"?"global":"organization",organizationId:conceptId==="stock"?null:organizationId},references:[],items:[]};
  return conceptId === "org-alternative" ? { ...base, concept: { ...base.concept!, id: conceptId, label: "Ocupação interna sintética", scope: "organization", organizationId }, references: [], items: [] } : base;
};
positionTaxonomyService.search = async (_org, query, kind) => {ragCalls.push({kind:"search"});if(params.get("searchError")==="1"&&ragCalls.filter(c=>c.kind==="search").length===1)throw Error("Falha sintética da busca");return { total: 1, items: kind === "complement" ? [{ id: m71Complement.conceptId, label: m71Complement.label, scope: "organization", description: "Fixture reutilizável" }] : [{ id: "occupation-fixture", label: "Software Developers", scope: "global", description: "Busca sintética: " + query }] };};
positionTaxonomyService.createComplement = async () => m71Complement.conceptId;
positionTaxonomyService.history = async () => [{ version: 2, snapshot: m71Fixture({ decision: "human", method: "human_selection", actorId: "synthetic-actor" }) }, { version: 1, snapshot: null }];
function Harness() {
 const [mode,setMode] = useState("resolved"); const [revision,setRevision] = useState(0);
 const [draft,setDraft] = useState({ ...emptyVacancyDraft(), title: ragScenario?"Gerente de Estoque":"Desenvolvedor de software", mission:"Controlar inventário.",responsibilities:["Organizar armazenagem."], id: "position-fixture" });
 Object.assign(window,{__positionDraft:draft,__changePositionTitle:(title:string)=>setDraft(d=>({...d,title,taxonomy:null})),__clearPosition:()=>setDraft(d=>({...d,referenceConceptId:null,taxonomyDecision:"cleared",taxonomy:null}))});
 const [editable,setEditable] = useState(true);
 return <ConfigProvider locale={ptBR}><main style={{ maxWidth: 1180, margin: "0 auto", padding: 20 }}>
 <Alert title="QA M7.1 · dados e serviços sintéticos · sem escrita remota" type="info" />
 <Typography.Title level={1}>Posição: {draft.title}</Typography.Title>
 <Space wrap><Select aria-label="Cenário de teste" value={mode} options={["resolved","ambiguous","unresolved","error","loading"].map(value=>({value,label:value}))} onChange={value=>{scenario=value;setMode(value);setRevision(v=>v+1);setDraft(d=>({...d,taxonomy:null,taxonomyDecision:"automatic",referenceConceptId:null}));}} />
 <Button onClick={()=>setEditable(v=>!v)}>{editable?"Ver versão salva":"Editar fixture"}</Button></Space>
 <label style={{display:"block",marginTop:16}}>Título da Posição<Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value,taxonomy:null,taxonomyDecision:"automatic"}))}/></label>
 <PositionTaxonomyPanel key={revision} draft={draft} membership={{organizationId:"org-fixture",organizationName:"Empresa sintética",groupId:null,groupName:null,role:"owner"}} {...(editable?{onChange:setDraft}:{onEdit:()=>setEditable(true)})} />
 <section aria-label="Requisitos escolhidos"><h2>Requisitos escolhidos: {draft.requirements.length}</h2><ul>{draft.requirements.map(r=><li key={r.stableId}>{r.label} · {r.importance}</li>)}</ul></section>
 </main></ConfigProvider>;
}
createRoot(document.getElementById("app")!).render(<Harness/>);
