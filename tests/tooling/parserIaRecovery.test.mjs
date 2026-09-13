import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { readParserPdf } from '../../scripts/parser-ia-service.mjs';
import { structureParserIa } from '../../dist/web/src/domain/parserIa.js';
import * as pdfjs from 'pdfjs-dist';
import { validateReviewDraftForSave } from '../../dist/web/src/domain/reviewFieldLifecycle.js';

function sourcePdf(extra = '') {
  const content = `BT /F1 12 Tf 50 740 Td (Synthetic Person) Tj 0 -20 Td (Senior Analyst) Tj 0 -20 Td (Example Company) Tj 0 -20 Td (synthetic@example.com) Tj 0 -20 Td (www.linkedin.com/in/synthetic-profile) Tj 0 -20 Td (Responsible for reporting, process analysis and documented improvements to the existing operating procedures. ${'Documented project delivery. '.repeat(10)}${extra}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  return Buffer.from(pdf + `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

test('M5.7 recovers the same failed intake from original PDF and blocks mismatched sources before AI or persistence', { timeout: 30000 }, async () => {
  const oldEnv = { ...process.env }; const originalFetch = globalThis.fetch; const originalWindow = globalThis.window;
  const workerDescriptor = Object.getOwnPropertyDescriptor(pdfjs.GlobalWorkerOptions, 'workerSrc');
  const worker = import.meta.resolve('pdfjs-dist/build/pdf.worker.mjs');
  Object.defineProperty(pdfjs.GlobalWorkerOptions, 'workerSrc', { get: () => worker, set: () => {}, configurable: true });
  process.env.VITE_PARSER_IA_LOCAL = 'true'; process.env.VITE_SUPABASE_URL = 'https://synthetic.supabase.co'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'synthetic-key';
  const bytes = sourcePdf(); const checksum = createHash('sha256').update(bytes).digest('hex');
  const pages = await readParserPdf(bytes);
  const result = structureParserIa({ status: 'complete', facts: [
    { path: 'identity.fullName', value: 'Synthetic Person', sources: ['p1l1'] },
    { path: 'contact.email', value: 'synthetic@example.com', sources: ['p1l4'] },
    { path: 'contact.linkedin', value: 'www.linkedin.com/in/synthetic-profile', sources: ['p1l5'] },
    { path: 'experiences.a.role', value: 'Senior Analyst', sources: ['p1l2'] },
    { path: 'experiences.a.organization', value: 'Example Company', sources: ['p1l3'] },
  ], uncertainties: [] }, pages, { organizationId: 'org', sourceSha256: checksum, provenance: { model: 'gpt-5.6-luna', promptSha256: 'b'.repeat(64), responseId: 'resp_fake', inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 1 } });
  const pattern = new RegExp((await readFile('supabase/migrations/20260910104122_allow_ocr_spatial_field_evidence.sql', 'utf8')).match(/!~ '([^']+)'/)[1]);
  const vite = await createServer({ configFile: 'web/vite.config.ts', server: { middlewareMode: true, watch: null }, logLevel: 'silent' });
  globalThis.window = { location: { hostname: 'localhost', href: 'http://localhost:5555' }, setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
  let client; let aiCalls = 0; let download = bytes; let storagePath = 'org/source.pdf'; let version = 'pdfjs-5.4.296/parser-ia-spans-v1'; const mutations = [];
  try {
    const { personIngestionService: service } = await vite.ssrLoadModule('/src/infrastructure/supabase/personIngestionService.ts');
    client = (await vite.ssrLoadModule('/src/infrastructure/supabase/client.ts')).supabase;
    client.from = table => {
      const filters = {}; const builder = { select() { return builder; }, eq(key, value) { filters[key] = value; return builder; }, async single() {
        assert.equal(filters.organization_id, 'org');
        if (table === 'documents') { assert.equal(filters.person_id, 'person'); assert.equal(filters.id, 'doc'); }
        else { assert.equal(table, 'resume_intakes'); assert.equal(filters.resolved_person_id, 'person'); assert.equal(filters.resolved_document_id, 'doc'); assert.equal(filters.status, 'failed'); }
        return { error: null, data: table === 'documents'
          ? { id: 'doc', document_version: 1, storage_path: 'org/source.pdf', filename: 'resume.pdf', checksum_sha256: checksum, review_state: 'not_ready', status: 'failed', extraction_version: version }
          : { id: 'intake', resolved_person_id: 'person', resolved_document_id: 'doc', resolution_type: 'created_new_person', storage_path: storagePath, checksum_sha256: checksum } };
      } }; return builder;
    };
    client.storage.from = () => ({ download: async path => { assert.equal(path, 'org/source.pdf'); return { data: new Blob([download]), error: null }; } });
    client.rpc = async (name, args) => {
      mutations.push(name);
      if (name === 'persist_person_extraction') {
        assert.equal(args.p_person_id, 'person'); assert.equal(args.p_document_id, 'doc'); assert.equal(args.p_idempotency_key, 'resume-intake-extraction:intake');
        assert.equal(args.p_draft.experiences.length, 1);
        assert.equal(args.p_draft.contact.linkedin, 'https://www.linkedin.com/in/synthetic-profile');
        assert.deepEqual(validateReviewDraftForSave(args.p_draft), []);
        for (const page of args.p_pages) for (const evidence of page.field_evidence) assert.ok(pattern.test(evidence.fieldPath), evidence.fieldPath);
        return { data: [{ processing_attempt_id: 'attempt', structured: true }], error: null };
      }
      assert.equal(name, 'complete_resume_intake'); assert.equal(args.p_intake_id, 'intake'); return { data: 'ready_for_review', error: null };
    };
    globalThis.fetch = async (url, options) => { assert.equal(url, '/parser-ia-local/parse'); assert.equal(JSON.parse(options.body).sourceSha256, checksum); aiCalls++; return new Response(JSON.stringify({ pages, result, cached: true }), { status: 200 }); };
    await service.resumeFailedAiIntake('org', 'person', 'doc');
    assert.deepEqual(mutations, ['persist_person_extraction', 'complete_resume_intake']);
    assert.equal(aiCalls, 1);
    storagePath = 'other/source.pdf'; await assert.rejects(service.resumeFailedAiIntake('org', 'person', 'doc'), /origem/); storagePath = 'org/source.pdf';
    download = sourcePdf('Changed source'); await assert.rejects(service.resumeFailedAiIntake('org', 'person', 'doc'), /não corresponde/); download = bytes;
    version = 'unknown'; await assert.rejects(service.resumeFailedAiIntake('org', 'person', 'doc'), /não está disponível/);
    assert.equal(aiCalls, 1); assert.equal(mutations.length, 2);
  } finally {
    await client?.auth.stopAutoRefresh(); await vite.close(); globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    Object.defineProperty(pdfjs.GlobalWorkerOptions, 'workerSrc', workerDescriptor);
    for (const key of ['VITE_PARSER_IA_LOCAL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']) { if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; }
  }
});
