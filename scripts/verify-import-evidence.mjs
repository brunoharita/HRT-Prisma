// Disposable LOCAL PostgreSQL verification. No network, provider, secret or real resume.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { structureParserIa, parserIaMethodVersion } from "../dist/web/src/domain/parserIa.js";
import { attachFieldEvidence } from "../dist/web/src/domain/adaptiveResumeExtraction.js";
import { importEvidenceIssue } from "../dist/web/src/domain/importEvidencePersistence.js";
import { prepareImportText } from "../dist/web/src/domain/importTextUnicode.js";
import { reviewPeriodProblem } from "../dist/web/src/domain/reviewPeriodFormat.js";
import { reviewPeriodFormats } from "../dist/tests/fixtures/reviewPeriodFormats.js";

const port = process.argv[2] ?? "55479";
if (!/^55[0-9]{3}$/.test(port)) throw Error("Disposable QA port required");
const database = process.argv[3] ?? "import_evidence_v202";
if (!/^import_evidence_v202(?:_final)?$/.test(database)) throw Error("Disposable QA database required");
const entries = [
  ["identity.fullName", "Synthetic Person"], ["contact.city", "Curitiba"], ["contact.state", "PR"],
  ["contact.email", "synthetic@example.invalid"], ["contact.phone", "+55 41 99999-0000"], ["contact.linkedin", "https://linkedin.com/in/synthetic"],
  ["professionalTitle", "Synthetic Analyst"], ["summary", "Declared summary"], ["professionalObjective", "Declared objective"],
  ...["areasOfExpertise", "competencies", "languages", "certifications", "toolsAndTechnologies", "professionalContexts"].map((path) => [`${path}.0`, `Declared ${path}`]),
  ["keyResults.KPI.value", "Declared result"],
  ["experiences.X.role", "Synthetic Analyst"], ["experiences.X.organization", "Synthetic Organization"], ["experiences.X.period", "2020 - 2022"], ["experiences.X.description", "Declared description"],
  ["education.X.course", "Curso de Excel"], ["education.X.institution", "Synthetic Institution"], ["education.X.period", "2019"], ["education.X.description", "Declared course"],
  ["customSections.X.name", "Declared Projects"], ["customSections.X.items.0", "Declared project"],
  [`customSections.${"A".repeat(64)}.name`, "Declared Additional Information"], [`customSections.${"A".repeat(64)}.items.0`, "Declared information"],
];
const pages = [{ pageNumber: 1, text: entries.map((entry) => entry[1]).join("\n"), origin: "native_pdf", usefulCharacterCount: 900, method: "pdfjs", methodVersion: "synthetic", layoutLines: entries.map((entry, i) => ({ text: entry[1], x: 0.1, y: 0.01 + i * 0.025, width: 0.5, height: 0.02, fontSize: 10, emphasis: "regular" })) }];
const result = structureParserIa({ status: "complete", facts: entries.map(([path, value], i) => ({ path, value, sources: [`p1l${i + 1}`] })), uncertainties: [] }, pages, { sourceSha256: "a".repeat(64), organizationId: "synthetic", provenance: { model: "synthetic", promptSha256: "b".repeat(64), responseId: "synthetic", inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 } });
const rawAttached = attachFieldEvidence(pages, result.fieldEvidence);
rawAttached[0].text += '\n\0\uD800';
rawAttached[0].layoutLines.push({ ...rawAttached[0].layoutLines[0], text: '\0', y: 0.9 });
if (importEvidenceIssue(rawAttached, result.draft)?.reason !== 'unicode_invalid') throw Error('Unicode raw payload was not detected');
const prepared = prepareImportText(rawAttached, result.draft);
const attached = prepared.pages;
if (importEvidenceIssue(attached, prepared.draft)) throw Error("Synthetic fixture failed preflight");
const payload = attached.map((page) => ({ page_number: page.pageNumber, text_content: page.text, origin: page.origin, useful_character_count: page.usefulCharacterCount, method: page.method, method_version: page.methodVersion, layout_blocks: page.layoutLines, field_evidence: page.fieldEvidence }));
const directory = resolve("tmp/import-evidence-v202-qa");
await mkdir(directory, { recursive: true });
const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'`;
if (process.argv[4] && !["--publication", "--formats"].includes(process.argv[4])) throw Error("Unknown local verification scenario");
const verificationSource = process.argv[4] ? "supabase/qa/custom_section_publication_verification.sql" : "supabase/qa/import_evidence_v202_verification.sql";
let sql = (await readFile(verificationSource, "utf8"))
  .replaceAll(":'draft'", literal(prepared.draft)).replaceAll(":'pages'", literal(payload))
  .replaceAll(":evidence_count", String(result.fieldEvidence.length)).replaceAll(":'method'", `'${parserIaMethodVersion(result)}'`);
if (process.argv[4] === "--formats") {
  const textLiteral = (value) => value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
  const parity = reviewPeriodFormats.map(([value, expected]) => {
    if (reviewPeriodProblem(value) !== expected) throw Error(`Unexpected TS diagnostic for ${value}`);
    const reason = expected === "invalid_date" ? "review_period_invalid_date" : expected === "reversed" ? "review_period_reversed" : null;
    return `select s202_assert(private.review_period_format_error(${textLiteral(value)}) is not distinct from ${textLiteral(reason)},'TS/SQL parity: ${value?.replaceAll("'", "''") ?? "null"}');`;
  }).join("\n");
  const helper = `create function public.s203_period_reject(command text,reason text,field text) returns void language plpgsql as $$
declare detail text; begin
  begin execute command; exception when others then
    get stacked diagnostics detail=pg_exception_detail;
    if sqlstate='22023' and detail::jsonb->>'contract'='operation-feedback-2.0.0' and detail::jsonb->>'reason'=reason and detail::jsonb->>'fieldPath'=field then raise notice 'PASS: actionable % (%)',reason,field; return; end if;
    raise exception 'Unexpected format rejection %: % / %',sqlstate,sqlerrm,detail;
  end;
  raise exception 'Expected format rejection';
end $$;`;
  const privateTargets = `
select public.s203_period_reject('select private.assert_review_period_formats(''{"education":[{"id":"education_valid123","period":"2019"},{"id":"education_second12","period":"2024 - 2020"}]}''::jsonb)','review_period_reversed','education.education_second12.period');
select public.s203_period_reject('select private.assert_review_period_formats(''{"experiences":[{"id":"experience_valid123","period":"2019"},{"id":"experience_valid456","period":"2020"},{"id":"experience_legacy00000002abcdefgh","period":"2024-02-30"}]}''::jsonb)','review_period_invalid_date','experiences.2.period');
select s202_assert(not has_function_privilege('anon','private.review_period_format_error(text)','execute') and not has_function_privilege('authenticated','private.assert_review_period_formats(jsonb)','execute'),'format helpers stay private');
`;
  sql = sql.replace("set local role authenticated;", () => `${parity}\n${helper}\n${privateTargets}\nset local role authenticated;`);
  const intakeMarker = "    select * into intake from public.start_resume_intake";
  sql = sql.replace(intakeMarker, () => `    if i=1 then d:=jsonb_set(d,'{experiences,0,period}',to_jsonb('31/02/2024'::text)); end if;\n${intakeMarker}`);
  const publishMarker = "    select * into published from public.publish_profile_review";
  const formatChecks = await readFile("supabase/qa/review_period_format_checks.sql", "utf8");
  sql = sql.replace(publishMarker, () => `${formatChecks}\n${publishMarker}`);
}
const path = resolve(directory, "verification.sql");
await writeFile(path, sql);
const command = process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin/psql.exe" : "psql";
const verification = spawnSync(command, ["-X", "-h", "127.0.0.1", "-p", port, "-U", "prisma_v202_qa", "-d", database, "-v", "ON_ERROR_STOP=1", "-f", path], { stdio: "inherit", windowsHide: true, timeout: 60000 });
if (verification.error) throw verification.error;
process.exitCode = verification.status ?? 1;
