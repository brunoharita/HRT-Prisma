import test from "node:test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { matchVacancyCandidate } from "../web/src/domain/vacancy.js";
import { calculateMatchingScore, type MatchingScoreInput } from "../web/src/domain/matchingScore.js";
import { parseResumePeriod } from "../src/domain/resumeDates.js";

test("M8.3: Edge snapshot uses the exact generated domain runtime", () => {
  execFileSync(process.execPath, ["scripts/generate-matching-runtime.mjs", "--check"], {
    cwd: process.cwd(), stdio: "pipe",
  });
});

test("two-digit date policy and temporal scores are identical in web and generated Edge runtime", async () => {
  const generated = (file: string) => import(pathToFileURL(resolve("supabase/functions/matching-trajectory/_generated", file)).href);
  const dates = await generated("src/domain/resumeDates.js");
  const runtime = await generated("web/src/domain/matchingScore.js");
  for (const period of ["Jun/08 - Nov/12", "Jan/25 - Atual", "Jun/2008 - Nov/2012", "49 - 50", "51 - 99", "24 - Atual", "29/02/23 - Atual", "Nov/12 - Jun/08"]) {
    assert.deepEqual(dates.parseResumePeriod(period), parseResumePeriod(period), period);
    const input: MatchingScoreInput = {
      areaApplicable: false, functionApplicable: false,
      areaRelation: { status: "none", coverageState: "not_applicable", evidence: [], explanation: "Não aplicável." },
      functionAssessment: { relation: "no_relation", basePoints: 0, seniorityAdjustment: 0, seniorityRelation: "not_available", coverageState: "not_applicable", evidence: [], explanation: "Não aplicável." },
      requirements: [], unclassifiedRequirementCount: 0, relatedExperiences: [{ id: "e1", period, evidence: [] }], referenceDate: "2026-09-27",
      positionVersion: "v1", positionVersionNumber: 1, profileVersion: "p1", profileVersionNumber: 1, matchingContractVersion: "vacancy-matching-explainable-5.0.0",
    };
    assert.deepEqual(runtime.calculateMatchingScore(input), calculateMatchingScore(input), period);
  }
});

test("M8.3: generated decoder and matching run without browser or provider capabilities", async () => {
  const generated = (file: string) => import(pathToFileURL(resolve("supabase/functions/matching-trajectory/_generated", file)).href);
  const decoder = await generated("web/src/infrastructure/supabase/personIngestionService.js");
  const runtime = await generated("web/src/domain/vacancy.js");
  const profile = decoder.decodeProfileDataForPresentation({
    experiences: [{ role: "Desenvolvedor backend", description: "Implementei APIs REST.", organization: null }],
    education: [{ course: "Sistemas", institution: null }], competencies: [{ name: "Node.js" }],
  });
  assert.ok(profile.experiences[0].id);
  assert.deepEqual(profile.competencies, ["Node.js"]);
  const vacancy = { ...runtime.emptyVacancyDraft(), title: "Desenvolvedor backend", area: "Software",
    id: "v", organizationId: "o", versionId: "v1", version: 1,
    requirements: [{ ...runtime.newVacancyRequirement("Node.js", "technology"), stableId: "r", importance: "required" }] };
  const candidate: Parameters<typeof matchVacancyCandidate>[1] = { personId: "p", profileId: "p1", profileVersion: 1,
    profileData: profile, fullName: "Sintético", knowledge: [], lifecycle: "candidate", operationalStatus: "active", location: null, publishedAt: "2026-09-25T00:00:00Z" };
  assert.deepEqual(runtime.matchVacancyCandidate(vacancy, candidate), matchVacancyCandidate(vacancy, candidate));
});
