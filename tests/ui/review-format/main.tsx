import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import { StructuredReviewPanel } from "../../../web/src/components/review/StructuredReviewPanel";
import { normalizeReviewDraft, reviewDraftFormatWarnings, validateReviewDraftForSave } from "../../../web/src/domain/reviewFieldLifecycle";
import type { ProfileReviewWorkspace, StructuredDraft } from "../../../web/src/domain/personIngestion";
import { prismaTheme } from "../../../web/src/ui/theme";
import "../../../web/src/styles.css";
import "../../../web/src/ui/foundation.css";
const initial: StructuredDraft = {
  identity: { fullName: "Pessoa sintética" }, contact: { phone: "(11) 99999-0000 / (21) 99999-0000", email: "qa@example.invalid", linkedin: null, city: null, state: null },
  professionalTitle: "Analista", professionalObjective: null, summary: null, areasOfExpertise: [], keyResults: [],
  experiences: ["2019–2023", "31/02/2024", "Durante o curso"].map((period, i) => ({ id: `experience_synthetic${i}`, source: "extracted", role: "Analista", organization: "Organização sintética", period, description: null, evidenceText: period, page: 1 })),
  education: ["2019", "2024 - 2020", "2024-02-30"].map((period, i) => ({ id: `education_synthetic${i}`, source: "extracted", course: "Curso sintético", institution: "Instituição sintética", period, evidenceText: period, page: 1, level: i === 2 ? "secondary" : "complementary" })),
  certifications: [], languages: [], competencies: [], customSections: [], uncertainties: [], notIdentified: [],
};
const workspace: ProfileReviewWorkspace = {
  id: "synthetic", personId: "synthetic", personName: "Pessoa sintética", personPrivateContact: { phone: null, email: null }, sourceKind: "document", sourceProfileId: null, sourceProfileVersion: null,
  documentId: "synthetic", documentName: "Sintético.pdf", documentVersion: 1, documentPageCount: 1, documentStoragePath: null, documentSourceType: "resume_pdf", processingAttemptId: "synthetic", state: "draft", lockVersion: 1, requiresContractUpgrade: false,
  extractedData: structuredClone(initial), reviewedData: structuredClone(initial), baseProfileVersion: null, approvedProfileId: null, approvedAt: null,
  pages: [], revisions: [], changes: [], adaptationEvents: [], originalEvidence: [], spatialRegions: [], evidenceLinks: [], evidenceRefinements: [], evidenceEvents: [],
};
function Harness() {
  const [draft, setDraft] = useState(initial);
  const [selected, select] = useState("identity.fullName");
  return <ConfigProvider locale={ptBR} theme={prismaTheme}><main style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
    <h1>Revisão de formatos — dados sintéticos</h1>
    <StructuredReviewPanel workspace={workspace} draft={draft} editable busy={false} hasUnsavedChanges={false} hasTransientChanges={false} deferredActionLabel={null} selectedFieldPath={selected} activeLinkId={null}
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
    check("initial errors before save", document.querySelectorAll(".prisma-review-format-summary .ant-alert-error li").length === 4);
    await navigate("Experiência 2 — Período");
    const second = "experiences.experience_synthetic1.period";
    check("second record red and focused", field(second)?.classList.contains("has-validation-error") === true && document.activeElement === input(second));
    check("accessible explanation", input(second)?.getAttribute("aria-invalid") === "true" && Boolean(input(second)?.getAttribute("aria-describedby")));
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
  (document.activeElement as HTMLElement | null)?.scrollIntoView({ block: "center", behavior: "instant" });
  await wait();
  const report = { scenario, width: innerWidth, height: innerHeight, checks, pass: checks.every((item) => item.pass) };
  await fetch("/qa-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
}, 500);
