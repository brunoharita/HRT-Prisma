import assert from "node:assert/strict";
import test from "node:test";
import { deriveProfileDelta } from "../web/src/domain/profileDelta.js";
import type { StructuredDraft } from "../web/src/domain/personIngestion.js";

test("first publication classifies every reviewed fact as an addition", () => {
  const delta = deriveProfileDelta(null, draft({ competencies: ["Scrum"] }));
  assert.equal(delta.firstPublication, true);
  assert.equal(delta.items.every((item) => item.kind === "added"), true);
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
