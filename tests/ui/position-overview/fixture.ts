import { emptyVacancyDraft, newVacancyRequirement, type VacancyDetail } from "../../../web/src/domain/vacancy.js";
import { m71Fixture, m71Item, m71Complement } from "../../fixtures/m71Taxonomy.js";
export const scenario = new URLSearchParams(location.search).get("case") ?? "normal";
export const fixture = { calls: [] as string[], navigations: [] as string[], failDelete: scenario === "delete-error" };
Object.assign(window, { __positionOverview: fixture });
export const detail: VacancyDetail = {
  ...emptyVacancyDraft(), id: "position-fixture", organizationId: "org-fixture", versionId: "version-fixture", version: 6,
  title: "Desenvolvedor backend", area: "Tecnologia", location: "Bauru, BR", jobRoleName: "", occupantName: null, createdAt: "", updatedAt: "",
  mission: "Desenvolver, evoluir e manter aplicações backend, garantindo segurança, desempenho e integração entre sistemas.",
  responsibilities: ["Desenvolver aplicações backend", "Criar e documentar APIs REST", "Integrar sistemas e bancos de dados", "Garantir qualidade de código"],
  expectedOutcomes: ["APIs seguras e bem documentadas", "Aplicações estáveis e eficientes"],
  contextItems: ["Atuação em desenvolvimento de software, com foco em aplicações backend e integração de sistemas."],
  requirements: [...["APIs REST", "Segurança de aplicações", "Node.js", "Banco de dados"].map(label => ({ ...newVacancyRequirement(label, "technology"), importance: "required" as const })), ...["Docker", "AWS", "Mensageria"].map(label => ({ ...newVacancyRequirement(label, "technology"), importance: "desired" as const }))],
  taxonomy: m71Fixture({ originalTitle: "Desenvolvedor backend", complements: [m71Complement] }),
};
if (scenario === "empty") Object.assign(detail, { mission: "", responsibilities: [], expectedOutcomes: [], contextItems: [], requirements: [], taxonomy: null, area: "", location: "" });
if (scenario === "occupied") Object.assign(detail, { occupancy: "occupied", occupantName: "Pessoa sintética", employmentType: "CLT" });
if (scenario === "long") { detail.title += " — integração de sistemas e aplicações distribuídas ".repeat(3); detail.taxonomy = null; detail.responsibilities.push("IdentificadorExtensoSemEspacos".repeat(12)); detail.requirements.push({ ...newVacancyRequirement("RequisitoExtensoSemEspacos".repeat(12), "technology"), importance: "required" }); }
if (scenario === "pending") detail.requirements[0]!.importance = "unclassified";
if (scenario === "ambiguous" || scenario === "unresolved") Object.assign(detail.taxonomy!, { state: scenario, concept: null });
if (scenario === "foreign") detail.taxonomy!.organizationId = "other-organization";
if (scenario === "stale") detail.taxonomy!.originalTitle = "Outro título";
if (scenario === "unknown") detail.taxonomy!.contractVersion = "unknown" as never;
if (scenario === "provenance") detail.requirements[0]!.taxonomyOrigin = { ...m71Item, label: "APIs REST" };
const wait = () => new Promise(resolve => setTimeout(resolve, scenario === "slow" ? 1800 : 350));
export const service = {
  async load() { fixture.calls.push("load"); await wait(); if (scenario === "load-error") throw new Error("Falha sintética ao consultar a Posição."); return structuredClone(detail); },
  async history() { fixture.calls.push("history"); await wait(); return [{ type: "created", version: 6, createdAt: "2026-10-08T12:00:00Z" }]; },
  async cancel() { fixture.calls.push("cancel"); await wait(); if (fixture.failDelete) throw new Error("Falha sintética ao excluir a Posição."); },
  async findPeople() { fixture.calls.push("findPeople"); throw new Error("Descoberta não deve ocorrer no detalhe"); },
};
export const taxonomyService = {
  async history() { fixture.calls.push("taxonomy-history"); await wait(); return [{ version: 6, snapshot: detail.taxonomy }]; },
  async preview() { fixture.calls.push("preview"); throw new Error("Preview não deve ocorrer na consulta"); },
};
export const transport = { async rpc(name: string) { fixture.calls.push(name); throw new Error("RPC inesperada na fixture de leitura"); } };
