import assert from "node:assert/strict";
import test from "node:test";
import { deriveProfileDelta, isProfileBlockDecisionItem } from "../web/src/domain/profileDelta.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

test("first publication classifies every reviewed fact as an addition", () => {
  const delta = deriveProfileDelta(null, draft({ competencies: ["Scrum"] }));
  assert.equal(delta.firstPublication, true);
  assert.equal(delta.items.every((item) => item.kind === "added"), true);
});

test("first publication keeps private contact visible but outside profile block decisions", () => {
  const proposal = draft({
    contact: { city: "Bauru", state: "SP", phone: "5511999999999", email: "pessoa@example.com", linkedin: null },
    competencies: ["Scrum"],
  });
  const delta = deriveProfileDelta(null, proposal, { currentContact: { city: null, state: null, phone: null, email: null, linkedin: null } });
  const contactItems = delta.items.filter((item) => item.section === "private_contact");

  assert.deepEqual(contactItems.map((item) => item.key), ["contact.city", "contact.state", "contact.phone", "contact.email"]);
  assert.equal(contactItems.every((item) => item.kind === "added"), true);
  assert.equal(contactItems.some(isProfileBlockDecisionItem), false);
  assert.equal(delta.items.filter(isProfileBlockDecisionItem).some((item) => item.key === "competencies::scrum"), true);
});

test("omission never becomes removal and keeps approved experience and competency visible", () => {
  const current = draft({
    experiences: [experience("a", "HRT", "Product Owner"), experience("b", "Bencato", "Analista")],
    competencies: ["Scrum", "BPM"],
  });
  const proposal = draft({ experiences: [experience("new-a", "HRT", "Product Owner")], competencies: ["Scrum"] });
  const delta = deriveProfileDelta(current, proposal);

  assert.equal(delta.items.find((item) => item.key === "experiences::b")?.kind, "not_cited");
  assert.equal(delta.items.find((item) => item.key === "competencies::bpm")?.kind, "not_cited");
  assert.equal(delta.counts.explicit_removal, 0);
});

test("only an explicit human decision classifies approved knowledge as removal", () => {
  const current = draft({ experiences: [experience("b", "Bencato", "Analista")] });
  const delta = deriveProfileDelta(current, draft(), { explicitRemovalKeys: new Set(["experiences::b"]) });
  assert.equal(delta.items.find((item) => item.key === "experiences::b")?.kind, "explicit_removal");
});

test("matches repeated entities by stable business identity and detects material update", () => {
  const previous = experience("old-id", "Servimed", "Analista");
  previous.description = "Processos logísticos";
  const next = experience("new-id", "Servimed", "Analista");
  next.description = "Automação de processos logísticos";
  const delta = deriveProfileDelta(draft({ experiences: [previous] }), draft({ experiences: [next] }));
  assert.equal(delta.items.find((item) => item.key === "experiences::old-id")?.kind, "updated");
});

test("academic enrichment updates a stable formation instead of duplicating it", () => {
  const previous = education("old-id", "UNESP", "Bacharelado em Sistemas de Informação");
  const next = education("new-id", "UNESP", "Sistemas de Informação");
  next.level = "undergraduate";
  next.qualification = "bachelor";
  const delta = deriveProfileDelta(draft({ education: [previous] }), draft({ education: [next] }));
  assert.equal(delta.items.filter((item) => item.section === "education").length, 1);
  assert.equal(delta.items.find((item) => item.section === "education")?.kind, "updated");
});

function draft(overrides: Partial<StructuredDraft> = {}): StructuredDraft {
  return {
    identity: { fullName: "Pessoa Teste" },
    contact: { city: null, state: null, phone: "5511999999999", email: null, linkedin: null },
    professionalTitle: null, areasOfExpertise: [], professionalObjective: null, summary: null, keyResults: [],
    experiences: [], education: [], certifications: [], languages: [], competencies: [], customSections: [],
    uncertainties: [], notIdentified: [], ...overrides,
  };
}

function experience(id: string, organization: string, role: string): StructuredDraft["experiences"][number] {
  return { id, source: "extracted", organization, role, period: null, description: null, evidenceText: `${organization} ${role}`, page: 1 };
}

function education(id: string, institution: string, course: string): StructuredDraft["education"][number] {
  return { id, source: "extracted", institution, course, period: null, description: null, evidenceText: `${course} ${institution}`, page: 1 };
}
