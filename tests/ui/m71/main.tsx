import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, Input, Select, Button, Space, Alert, Typography } from "antd";
import ptBR from "antd/locale/pt_BR";
import { PositionTaxonomyPanel } from "../../../web/src/components/PositionTaxonomyPanel";
import { positionTaxonomyService } from "../../../web/src/infrastructure/supabase/positionTaxonomyService";
import { emptyVacancyDraft } from "../../../web/src/domain/vacancy";
import { m71Fixture, m71Complement } from "../../fixtures/m71Taxonomy";
import "../../../web/src/styles.css";
let scenario = "resolved";
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
  return conceptId === "org-alternative" ? { ...base, concept: { ...base.concept!, id: conceptId, label: "Ocupação interna sintética", scope: "organization", organizationId }, references: [], items: [] } : base;
};
positionTaxonomyService.search = async (_org, query, kind) => ({ total: 1, items: kind === "complement" ? [{ id: m71Complement.conceptId, label: m71Complement.label, scope: "organization", description: "Fixture reutilizável" }] : [{ id: "occupation-fixture", label: "Software Developers", scope: "global", description: "Busca sintética: " + query }] });
positionTaxonomyService.createComplement = async () => m71Complement.conceptId;
positionTaxonomyService.history = async () => [{ version: 2, snapshot: m71Fixture({ decision: "human", method: "human_selection", actorId: "synthetic-actor" }) }, { version: 1, snapshot: null }];
function Harness() {
 const [mode,setMode] = useState("resolved"); const [revision,setRevision] = useState(0);
 const [draft,setDraft] = useState({ ...emptyVacancyDraft(), title: "Desenvolvedor de software", id: "position-fixture" });
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
