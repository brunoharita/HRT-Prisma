import { useState } from "react";
import { classifyEducationRecord } from "../../../src/domain/educationClassification";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { StructuredReviewPanel } from "../../../web/src/components/review/StructuredReviewPanel";
import { normalizeReviewDraft, reviewDraftFormatWarnings, validateReviewDraftForSave } from "../../../web/src/domain/reviewFieldLifecycle";
import type { ProfileReviewWorkspace, StructuredDraft } from "../../../web/src/domain/personIngestion";
import { prismaTheme } from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const confirmationScenario = new URLSearchParams(location.search).get("case") === "confirmation";
const initial: StructuredDraft = {
  identity: { fullName: "Pessoa sintética" }, contact: { phone: "(11) 99999-0000 / (21) 99999-0000", email: "qa@example.invalid", linkedin: null, city: null, state: null },
  professionalTitle: "Analista", professionalObjective: null, summary: null, areasOfExpertise: [], keyResults: [],
  experiences: ["2019–2023", "31/02/2024", "Durante o curso"].map((period, i) => ({ id: `experience_synthetic${i}`, source: "extracted", role: "Analista", organization: "Organização sintética", period, description: null, evidenceText: period, page: 1 })),
  education: ["2019", "2024 - 2020", "2024-02-30"].map((period, i) => ({ id: `education_synthetic${i}`, source: "extracted", course: "Curso sintético", institution: "Instituição sintética", period, evidenceText: period, page: 1, level: i === 2 ? "secondary" : "complementary" })),
  certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
};
if (confirmationScenario) initial.education = initial.education.map((item, index) => ({ ...item, ...classifyEducationRecord({ course: "Ensino Médio", status: "Concluído", period: "2004" }), period: "2004", classificationOrigin: index === 2 ? "inferred" : "explicit", classificationReviewed: index === 1 }));
const workspace: ProfileReviewWorkspace = {
  id: "synthetic", personId: "synthetic", personName: "Pessoa sintética", personPrivateContact: { phone: null, email: null }, sourceKind: "document", sourceProfileId: null, sourceProfileVersion: null,
  documentId: "synthetic", documentName: "Sintético.pdf", documentVersion: 1, documentPageCount: 1, documentStoragePath: null, documentSourceType: "resume_pdf", processingAttemptId: "synthetic", state: "draft", lockVersion: 1, requiresContractUpgrade: false,
  extractedData: structuredClone(initial), reviewedData: structuredClone(initial), baseProfileVersion: null, approvedProfileId: null, approvedAt: null,
  pages: [], revisions: [], changes: [], adaptationEvents: [], originalEvidence: [], spatialRegions: [], evidenceLinks: [], evidenceRefinements: [], evidenceEvents: [],
};
function Harness() {
  const [draft, setDraft] = useState(initial);
  const [selected, select] = useState("identity.fullName");
  const [savedWorkspace, setSavedWorkspace] = useState(workspace);
  const [mount, setMount] = useState(0);
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
    <h1>Revisão de formatos — dados sintéticos</h1>
    <button onClick={() => { const normalized = normalizeReviewDraft(draft); setDraft(normalized); setSavedWorkspace({ ...savedWorkspace, reviewedData: structuredClone(normalized), lockVersion: savedWorkspace.lockVersion + 1 }); setMount((value) => value + 1); }}>Salvar e reabrir rascunho sintético</button>
    <output hidden id="synthetic-acceptance" data-review-state={JSON.stringify(savedWorkspace.reviewedData.education.map(({ id, classificationReviewed, classificationOrigin }) => ({ id, classificationReviewed, classificationOrigin })))} />
    <button onClick={() => select("education.education_synthetic2.period")}>Reabrir período sintético</button>
    {confirmationScenario ? <><button onClick={() => select("education.education_synthetic0.course")}>Reabrir formação 1</button><button onClick={() => select("education.education_synthetic1.course")}>Reabrir formação 2</button></> : null}
    <button onClick={() => { const empty = { ...initial, education: initial.education.map((item) => ({ ...item, period: null, level: "secondary" as const })) }; setDraft(empty); setSavedWorkspace({ ...workspace, id: "synthetic-other", extractedData: structuredClone(empty), reviewedData: structuredClone(empty) }); select("education.education_synthetic2.course"); }}>Abrir outra revisão sintética</button>
    <StructuredReviewPanel key={mount} workspace={savedWorkspace} draft={draft} editable busy={false} hasUnsavedChanges={false} hasTransientChanges={false} deferredActionLabel={null} selectedFieldPath={selected} activeLinkId={null}
      validationIssues={validateReviewDraftForSave(normalizeReviewDraft(draft))} validationWarnings={reviewDraftFormatWarnings(draft)} onDraftChange={setDraft} onFieldSelect={select}
      onSaveAndContinue={() => undefined} onDiscardAndContinue={() => undefined} onStartSelection={() => undefined} onCreateCustomSection={() => undefined} onEvidenceNavigate={() => undefined} onEvidenceDelete={() => undefined}/>
  </main></ConfigProvider>;
}
createRoot(document.getElementById("app")!).render(<Harness />);

// Local deterministic browser exercise. No persistence, API, auth or real Person.
const scenario = new URLSearchParams(location.search).get("case");
if (scenario) setTimeout(async () => {
  const checks: Array<{ name: string; pass: boolean }> = [];
  const wait = () => new Promise((resolve) => setTimeout(resolve, 150));
  const check = (name: string, pass: boolean) => { checks.push({ name, pass }); if (!pass) throw Error(name); };
  const field = (path: string) => document.querySelector<HTMLElement>(`[data-review-field-path="${path}"]`);
  const input = (path: string) => field(path)?.querySelector<HTMLInputElement>("input");
  const navigate = async (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>(".prisma-review-format-summary button")].find((item) => item.textContent === label);
    check(`summary link: ${label}`, Boolean(button)); button!.click(); await wait();
  };
  const update = async (path: string, value: string) => {
    const target = input(path)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true })); await wait();
  };
  try {
    check("initial errors before save", document.querySelectorAll(".prisma-review-format-summary .ant-alert-error li").length === (confirmationScenario ? 2 : 4));
    await navigate("Experiência 2 — Período");
    const second = "experiences.experience_synthetic1.period";
    check("second record red and focused", field(second)?.classList.contains("has-validation-error") === true && document.activeElement === input(second));
    check("accessible explanation", input(second)?.getAttribute("aria-invalid") === "true" && Boolean(input(second)?.getAttribute("aria-describedby")));
    if (scenario === "confirmation") {
      const click = async (text: string) => { const target = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text); check(`control: ${text}`, Boolean(target)); target!.click(); await wait(); };
      const button = () => document.querySelector<HTMLButtonElement>(".prisma-education-classification-confirm");
      const card = () => document.querySelector<HTMLElement>(".prisma-education-classification-card");
      const pending = () => button()?.textContent === "Confirmar classificação" && !button()?.disabled && !card()?.classList.contains("is-confirmed");
      const confirmed = () => button()?.textContent === "Confirmada por você" && button()?.disabled === true && card()?.classList.contains("is-confirmed") === true;
      const automatic = () => button()?.textContent === "Classificação válida" && button()?.disabled === true && card()?.classList.contains("is-confirmed") === true;
      await click("Reabrir formação 1");
      check("intact explicit classification needs no confirmation click", automatic());
      check("automatic acceptance keeps explicit provenance", card()?.textContent?.includes("Explícita") === true && !card()?.textContent?.includes("Confirmada por você"));
      const firstPath = "education.education_synthetic0.period";
      input(firstPath)!.focus(); await wait(); await update(firstPath, "2002 - 2004");
      check("unrelated period edit keeps valid explicit classification", automatic() && input(firstPath)?.value === "2002 - 2004");
      await click("Salvar e reabrir rascunho sintético");
      check("saved automatic acceptance needs no extra click", automatic());
      const persisted = JSON.parse(document.getElementById("synthetic-acceptance")!.dataset.reviewState!)[0];
      check("saved system acceptance carries reviewed flag without human origin", persisted.classificationReviewed === true && persisted.classificationOrigin === "explicit");
      await click("Reabrir formação 2");
      check("automatic acceptance is not human confirmation", automatic() && !card()?.textContent?.includes("Confirmada por você"));
      await click("Reabrir período sintético");
      check("inferred classification requires human review", pending() && card()?.classList.contains("requires-review") === true);
      const pendingLabel = [...button()!.querySelectorAll("span")].find((span) => span.textContent === "Confirmar classificação" && span.children.length === 0)!;
      const pendingColor = getComputedStyle(pendingLabel).color;
      check(`pending action has readable white text: ${pendingColor}`, pendingColor === "rgb(255, 255, 255)");
      check("pending action does not show completed icon", !button()?.querySelector("[aria-label=check-circle]"));
      await click("Confirmar classificação");
      check("human confirmation updates card and disables action", confirmed());
      const path = "education.education_synthetic2.period";
      input(path)!.focus(); await wait(); await update(path, "2003 - 2004");
      check("unresolved human classification edit revokes confirmation", pending() && card()?.classList.contains("requires-review") === true && input(path)?.value === "2003 - 2004");
      check("period original remains preserved", field(path)?.textContent?.includes("2004") === true);
      await click("Reabrir formação 2");
      check("editing another record preserves automatic acceptance", automatic());
      await click("Reabrir período sintético");
      check("pending state follows edited record", pending());
      await click("Confirmar classificação");
      await click("Salvar e reabrir rascunho sintético");
      check("remounted saved human confirmation remains true", confirmed());
    }
    if (scenario === "period") {
      await navigate("Formação 3 — Período");
      const path = "education.education_synthetic2.period";
      const target = input(path)!;
      check("secondary period initially shown and focused", Boolean(target) && document.activeElement === target);
      await update(path, "");
      check("clearing retains input identity and focus", target.isConnected && input(path) === target && document.activeElement === target && target.value === "");
      for (const value of ["2", "20", "200", "2004"]) {
        await update(path, value);
        check(`typing ${value} retains input identity and focus`, target.isConnected && input(path) === target && document.activeElement === target && target.value === value);
      }
      check("valid correction removes feedback without hiding field", input(path)?.getAttribute("aria-invalid") === "false" && !field(path)?.classList.contains("has-validation-warning"));
      check("secondary original evidence preserved", field(path)?.textContent?.includes("2024-02-30") === true);
      input("education.education_synthetic2.course")!.focus(); await wait();
      check("blur keeps period visible", input(path)?.value === "2004");
      await navigate("Formação 2 — Período");
      check("other education value preserved", input("education.education_synthetic1.period")?.value === "2024 - 2020");
      const click = async (text: string) => { const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text); check(`control: ${text}`, Boolean(button)); button!.click(); await wait(); };
      await click("Reabrir período sintético");
      check("return to secondary keeps corrected period", input(path)?.value === "2004");
      const summaryTab = [...document.querySelectorAll<HTMLElement>("[role=tab]")].find((item) => item.textContent?.includes("Resumo"));
      summaryTab!.click(); await wait();
      await click("Reabrir período sintético");
      check("tab return keeps corrected period", input(path)?.value === "2004");
      await click("Salvar e reabrir rascunho sintético");
      check("remounted saved draft keeps period editable", input(path)?.value === "2004" && !input(path)?.disabled);
      await click("Abrir outra revisão sintética");
      check("new review does not inherit revealed optional fields", !input(path));
      await click("Reabrir período sintético");
      check("explicit field navigation opens empty period", input(path)?.value === "");
      input("education.education_synthetic2.course")!.focus(); await wait();
      check("opened empty period remains after blur", input(path)?.value === "");
    }
    if (scenario === "run") {
      await update(second, "29/02/2024");
      check("correction removes error immediately", !field(second)?.classList.contains("has-validation-error") && input(second)?.getAttribute("aria-invalid") === "false");
      check("source retained", field(second)?.textContent?.includes("31/02/2024") === true);
    }
    if (scenario === "run" || scenario === "warning") {
      await navigate("Experiência 3 — Período");
      const third = "experiences.experience_synthetic2.period";
      check("third record advisory and focused", field(third)?.classList.contains("has-validation-warning") === true && document.activeElement === input(third) && input(third)?.getAttribute("aria-invalid") === "false");
      if (scenario === "run") {
        await update(third, "2022 - Atual");
        check("corrected warning disappears", document.querySelectorAll(".prisma-review-format-summary .ant-alert-warning li").length === 0);
        await navigate("Formação 2 — Período");
        check("education second selected", input("education.education_synthetic1.period")?.value === "2024 - 2020");
        await update("education.education_synthetic1.period", "2020 - 2024");
        await navigate("Formação 3 — Período");
        check("invalid secondary period remains correctible", input("education.education_synthetic2.period")?.value === "2024-02-30");
        await update("education.education_synthetic2.period", "2024-02-29");
        await navigate("Telefone");
        await update("contact.phone", "(11) 99999-0000");
        check("all objective errors disappear reactively", document.querySelectorAll(".prisma-review-format-summary .ant-alert-error li").length === 0);
      }
    }
    check("no horizontal overflow", document.documentElement.scrollWidth <= innerWidth + 1);
  } catch (error) { checks.push({ name: error instanceof Error ? error.message : "browser error", pass: false }); }
  const captureTarget = scenario === "confirmation" ? document.querySelector<HTMLElement>(".prisma-education-classification-confirm") : document.activeElement as HTMLElement | null;
  captureTarget?.scrollIntoView({ block: "center", behavior: "instant" });
  await wait();
  const report = { scenario, width: innerWidth, height: innerHeight, checks, pass: checks.every((item) => item.pass) };
  await fetch("/qa-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
}, 500);
