import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSanitizedResearchRequest, createKnowledgeInboxFingerprint, resolveKnowledgeTerm,
  validateKnowledgeProposal, validateResearchRequestHasNoPii, type KnowledgeCatalog } from "../src/domain/knowledge.js";
import { CboKnowledgeSourceAdapter, EscoKnowledgeSourceAdapter, OnetKnowledgeSourceAdapter, checksumSnapshotContent } from "../src/knowledge/sourceAdapters.js";

const catalog: KnowledgeCatalog = {
  globalVersion: 3, organizationVersion: 2,
  concepts: [
    { id: "global-power-bi", organizationId: null, scope: "global", conceptType: "technology", canonicalLabel: "Microsoft Power BI", description: "Global", version: 1, status: "approved" },
    { id: "org-power-bi", organizationId: "tenant-a", scope: "organization", conceptType: "technology", canonicalLabel: "Power BI Corporativo", description: "Overlay", version: 1, status: "approved" },
    { id: "global-pm", organizationId: null, scope: "global", conceptType: "occupation", canonicalLabel: "Gerente de Projetos", description: "Global", version: 1, status: "approved" },
    { id: "global-pm-method", organizationId: null, scope: "global", conceptType: "methodology", canonicalLabel: "Project Management", description: "Method", version: 1, status: "approved" },
  ],
  terms: [
    { id: "t1", conceptId: "global-power-bi", organizationId: null, scope: "global", text: "Microsoft PBI", normalizedText: "microsoft pbi", language: "pt-BR", status: "approved", ambiguous: false },
    { id: "t2", conceptId: "org-power-bi", organizationId: "tenant-a", scope: "organization", text: "Microsoft PBI", normalizedText: "microsoft pbi", language: "pt-BR", status: "approved", ambiguous: false },
    { id: "t3", conceptId: "global-pm", organizationId: null, scope: "global", text: "PM", normalizedText: "pm", language: "en", status: "approved", ambiguous: true },
    { id: "t4", conceptId: "global-pm-method", organizationId: null, scope: "global", text: "PM", normalizedText: "pm", language: "en", status: "approved", ambiguous: true },
  ],
};

test("organization Knowledge overlays Global without mutating it", () => {
  const tenantA = resolveKnowledgeTerm("Microsoft PBI", "tenant-a", catalog);
  const tenantB = resolveKnowledgeTerm("Microsoft PBI", "tenant-b", catalog);
  assert.equal(tenantA.concept?.id, "org-power-bi");
  assert.equal(tenantA.state, "resolved");
  assert.equal(tenantA.method, "organization_exact");
  assert.equal(tenantB.concept?.id, "global-power-bi");
  assert.equal(catalog.concepts[0]?.canonicalLabel, "Microsoft Power BI");
});

test("ambiguous alias never becomes an arbitrary match and unknown term is fingerprinted", () => {
  const ambiguous = resolveKnowledgeTerm("PM", "tenant-a", catalog);
  const unresolved = resolveKnowledgeTerm("Nova Tecnologia Interna", "tenant-a", catalog);
  assert.equal(ambiguous.state, "ambiguous");
  assert.equal(ambiguous.concept, null);
  assert.equal(unresolved.state, "unresolved");
  assert.equal(createKnowledgeInboxFingerprint({ normalizedTerm: unresolved.normalizedSearchTerm, language: "pt-BR", scope: "organization", organizationId: "tenant-a" }).length, 64);
});

test("research payload contains only a sanitized concept and blocks PII", () => {
  const request = buildSanitizedResearchRequest({ term: "Databricks Unity Catalog", language: "pt-BR", scope: "global" });
  const payload = JSON.stringify(request);
  validateResearchRequestHasNoPii(payload, ["Marina Pessoa", "marina@example.com", "+5514999999999"]);
  assert.deepEqual(Object.keys(request).sort(), ["language", "scope", "term"]);
  assert.throws(() => validateResearchRequestHasNoPii(JSON.stringify({ ...request, person_id: "private-id" }), []), /pii_outbound_blocked/);
});

test("proposal source policy accepts one official source and rejects insufficient secondary evidence", () => {
  const base = { observedTerm: "Power BI", proposedConcept: { canonicalLabel: "Microsoft Power BI", conceptType: "technology" as const, description: "Plataforma de BI." }, aliases: ["Power BI"], proposedRelations: [], rationale: "Documentação oficial.", unresolvedQuestions: [] };
  assert.doesNotThrow(() => validateKnowledgeProposal({ ...base, sources: [{ url: "https://learn.microsoft.com/power-bi/", title: "Power BI", publisher: "Microsoft", sourceClass: "official_vendor_documentation", retrievedAt: "2026-08-26T00:00:00Z" }] }, new Set(["learn.microsoft.com"])));
  assert.throws(() => validateKnowledgeProposal({ ...base, sources: [{ url: "https://blocked.example/power-bi", title: "Power BI", publisher: "Unknown", sourceClass: "secondary_recognized_source", retrievedAt: "2026-08-26T00:00:00Z" }] }, new Set(["learn.microsoft.com"])), /two_independent_secondary_sources_required/);
});

test("migration implements versioned global and tenant Knowledge with fail-closed RLS and no embeddings", async () => {
  const sql = await readFile("supabase/migrations/20260826201154_m4_knowledge_foundation.sql", "utf8");
  for (const table of ["knowledge_sources", "knowledge_source_versions", "knowledge_concepts", "knowledge_terms", "knowledge_relations", "knowledge_external_mappings", "knowledge_inbox", "knowledge_research_runs", "knowledge_proposals", "organization_knowledge_settings", "knowledge_reinterpretation_impacts", "knowledge_reinterpretation_jobs"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /allow_external_knowledge_enrichment boolean not null default false/i);
  assert.match(sql, /reinterpretation_policy[^\n]+default 'off'/i);
  assert.match(sql, /array\['super_admin', 'owner', 'admin'\]/i);
  assert.doesNotMatch(sql, /create extension[^;]*(vector|embedding)|vector\s*\(/i);
});

test("Knowledge hardening covers foreign-key paths and avoids overlapping settings reads", async () => {
  const sql = await readFile("supabase/migrations/20260826205033_m4_knowledge_indexes_rls.sql", "utf8");
  assert.match(sql, /knowledge_terms_concept_idx/i);
  assert.match(sql, /knowledge_impacts_profile_fk_idx/i);
  assert.match(sql, /knowledge_jobs_person_fk_idx/i);
  assert.match(sql, /drop policy organization_knowledge_settings_manage/i);
  assert.match(sql, /create policy organization_knowledge_settings_insert/i);
  assert.match(sql, /create policy organization_knowledge_settings_update/i);
  assert.match(sql, /create policy organization_knowledge_settings_delete/i);
  assert.doesNotMatch(sql, /for all to authenticated/i);
});

test("CBO, ESCO and O*NET adapters validate checksum and stage canonical source records", () => {
  const inputs = [
    { adapter: new CboKnowledgeSourceAdapter(), name: "CBO2002-Ocupacao.csv", version: "CBO 2002", content: "CODIGO;TITULO;DESCRICAO\n2521-05;Administrador;Administra operações" },
    { adapter: new EscoKnowledgeSourceAdapter(), name: "esco-classification.csv", version: "v1.2.1", content: "conceptUri,preferredLabel,conceptType,description\nhttps://data.europa.eu/esco/occupation/1,Data analyst,occupation,Analyses data" },
    { adapter: new OnetKnowledgeSourceAdapter(), name: "Occupation Data.csv", version: "31.0", content: "O*NET-SOC Code,Title,Description\n15-2051.00,Data Scientists,Develop analytical methods" },
  ];
  for (const input of inputs) {
    const snapshot = { externalVersion: input.version, releaseDate: null, retrievedAt: "2026-08-26T00:00:00Z", files: [{ name: input.name, content: input.content, checksumSha256: checksumSnapshotContent(input.content) }] };
    const staged = input.adapter.stage(snapshot);
    assert.equal(staged.length, 1);
    assert.equal(staged[0]?.provenance.externalVersion, input.version);
  }
  const invalidContent = "CODIGO;TITULO\n1;Teste";
  assert.throws(() => new CboKnowledgeSourceAdapter().stage({ externalVersion: "x", releaseDate: null, retrievedAt: "2026-08-26T00:00:00Z", files: [{ name: "ocup.csv", content: invalidContent, checksumSha256: "0".repeat(64) }] }), /snapshot_checksum_mismatch/);
});

test("Knowledge Agent contract is server-side, structured, allowlisted and never auto-publishes", async () => {
  const [agent, page] = await Promise.all([
    readFile("supabase/functions/knowledge-agent/index.ts", "utf8"),
    readFile("web/src/pages/KnowledgePage.tsx", "utf8"),
  ]);
  assert.match(agent, /KNOWLEDGE_AGENT_ENABLED/);
  assert.match(agent, /filters: \{ allowed_domains: allowedDomains \}/);
  assert.match(agent, /type: "json_schema"/);
  assert.match(agent, /store: false/);
  assert.match(agent, /max_output_tokens: 2_000/);
  assert.match(agent, /rejectObviousPii\(sanitizedTerm\)/);
  assert.match(agent, /Provider returned no verifiable web citation/);
  assert.match(agent, /source\.source_class !== trustedSource\.source_class/);
  assert.doesNotMatch(agent, /approve_knowledge_proposal/);
  assert.match(page, /Knowledge da empresa/);
  assert.match(page, /Base Prisma/);
  assert.match(page, /Sem topbar|Conhecimento/);
});
