import type { PostgrestError } from "@supabase/supabase-js";
import {
  searchPublishedProfiles,
  type KnowledgeSearchMatches,
  type ProfileSearchQuery,
  type ProfileSearchResult,
  type PublishedProfileCandidate,
} from "../../domain/profileDiscovery";
import { supabase } from "./client";
import { decodeProfileDataForPresentation } from "./personIngestionService";

const PROFILE_DISCOVERY_PAGE_SIZE = 200;

export interface PublishedProfileCandidateCollection {
  candidates: PublishedProfileCandidate[];
  publishedProfileCount: number;
  analyzedProfileCount: number;
  complete: boolean;
}

export const profileDiscoveryService = {
  async search(
    organizationId: string,
    query: ProfileSearchQuery,
    includePrivateLocation: boolean,
  ): Promise<ProfileSearchResult[]> {
    const [candidates, knowledgeMatches] = await Promise.all([
      loadPublishedProfileCandidates(organizationId, includePrivateLocation),
      loadKnowledgeMatches(organizationId, query.competencies),
    ]);
    return searchPublishedProfiles(candidates, query, knowledgeMatches);
  },

  async loadByIds(
    organizationId: string,
    personIds: string[],
    includePrivateLocation: boolean,
  ): Promise<PublishedProfileCandidate[]> {
    const allowedIds = [...new Set(personIds.filter(Boolean))].slice(0, 2);
    if (!allowedIds.length) return [];
    const candidates = await loadPublishedProfileCandidates(organizationId, includePrivateLocation, allowedIds);
    return allowedIds.flatMap((personId) => {
      const candidate = candidates.find((item) => item.personId === personId);
      return candidate ? [candidate] : [];
    });
  },
};

export async function loadPublishedProfileCandidates(
  organizationId: string,
  includePrivateLocation: boolean,
  personIds?: string[],
): Promise<PublishedProfileCandidate[]> {
  return (await loadPublishedProfileCandidateCollection(organizationId, includePrivateLocation, personIds)).candidates;
}

export async function loadPublishedProfileCandidateCollection(
  organizationId: string,
  includePrivateLocation: boolean,
  personIds?: string[],
): Promise<PublishedProfileCandidateCollection> {
  const candidates: PublishedProfileCandidate[] = [];
  let publishedProfileCount = 0;
  let processedProfileCount = 0;
  let page = 0;

  while (true) {
    const from = page * PROFILE_DISCOVERY_PAGE_SIZE;
    let profileQuery = supabase.from("professional_profiles")
      .select("id, person_id, profile_version, profile_data, approved_at, created_at", { count: "exact" })
      .eq("organization_id", organizationId)
      .is("superseded_at", null)
      .order("approved_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PROFILE_DISCOVERY_PAGE_SIZE - 1);
    if (personIds?.length) profileQuery = profileQuery.in("person_id", [...new Set(personIds.filter(Boolean))]);
    const profileResult = await profileQuery;
    throwIfError(profileResult.error, "Não foi possível consultar os Perfis publicados desta empresa.");
    const profiles = profileResult.data ?? [];
    if (page === 0) publishedProfileCount = profileResult.count ?? profiles.length;
    if (!profiles.length) break;
    processedProfileCount += profiles.length;
    candidates.push(...await materializePublishedProfileCandidates(organizationId, includePrivateLocation, profiles));
    if (profiles.length < PROFILE_DISCOVERY_PAGE_SIZE) break;
    page += 1;
  }

  return {
    candidates,
    publishedProfileCount: candidates.length,
    analyzedProfileCount: candidates.length,
    complete: processedProfileCount >= publishedProfileCount,
  };
}

async function materializePublishedProfileCandidates(
  organizationId: string,
  includePrivateLocation: boolean,
  profiles: Array<{ id: string; person_id: string; profile_version: number; profile_data: import("./database.types.js").Json; approved_at: string | null; created_at: string }>,
): Promise<PublishedProfileCandidate[]> {
  const ids = profiles.map((profile) => profile.person_id);
  const [peopleResult, privateResult, observationsResult] = await Promise.all([
    supabase.from("people")
      .select("id, full_name, lifecycle, operational_status")
      .eq("organization_id", organizationId)
      .in("id", ids)
      .neq("operational_status", "merged"),
    includePrivateLocation
      ? supabase.from("person_private_data").select("person_id, city, country_code").eq("organization_id", organizationId).in("person_id", ids)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("knowledge_observations")
      .select("profile_id, original_term, resolution_state, concept_id, source_field_path")
      .eq("organization_id", organizationId)
      .in("profile_id", profiles.map((profile) => profile.id)),
  ]);
  throwIfError(peopleResult.error, "Não foi possível confirmar as Pessoas dos Perfis encontrados.");
  throwIfError(privateResult.error, "Não foi possível consultar as localizações permitidas.");
  throwIfError(observationsResult.error, "Não foi possível consultar a normalização profissional dos Perfis.");

  const conceptIds = [...new Set((observationsResult.data ?? []).flatMap((item) => item.concept_id ? [item.concept_id] : []))];
  const conceptResult = conceptIds.length
    ? await supabase.from("knowledge_concepts").select("id, canonical_label, concept_type").in("id", conceptIds)
    : { data: [], error: null };
  throwIfError(conceptResult.error, "Não foi possível resolver os conceitos profissionais encontrados.");
  const people = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
  const locations = new Map((privateResult.data ?? []).map((item) => [item.person_id, [item.city, item.country_code].filter(Boolean).join(", ") || null]));
  const concepts = new Map((conceptResult.data ?? []).map((item) => [item.id, item]));
  const observations = observationsResult.data ?? [];

  return profiles.flatMap((profile): PublishedProfileCandidate[] => {
    const person = people.get(profile.person_id);
    if (!person || (person.operational_status !== "active" && person.operational_status !== "archived")) return [];
    return [{
      personId: person.id,
      fullName: person.full_name,
      lifecycle: person.lifecycle,
      operationalStatus: person.operational_status,
      location: locations.get(person.id) ?? null,
      profileId: profile.id,
      profileVersion: profile.profile_version,
      publishedAt: profile.approved_at ?? profile.created_at,
      profileData: decodeProfileDataForPresentation(profile.profile_data),
      knowledge: observations.filter((item) => item.profile_id === profile.id).map((item) => ({
        originalTerm: item.original_term,
        canonicalLabel: item.concept_id ? concepts.get(item.concept_id)?.canonical_label ?? null : null,
        state: knowledgeResolutionState(item.resolution_state),
        conceptId: item.concept_id,
        conceptType: item.concept_id ? concepts.get(item.concept_id)?.concept_type ?? null : null,
        sourceFieldPath: item.source_field_path,
      })),
    }];
  });
}

async function loadKnowledgeMatches(organizationId: string, competencies: string[]): Promise<KnowledgeSearchMatches> {
  const terms = [...new Set(competencies.map((item) => item.trim()).filter(Boolean))].slice(0, 12);
  const results = await Promise.all(terms.map(async (term) => {
    const result = await supabase.rpc("search_people_by_knowledge_concept", { p_organization_id: organizationId, p_query: term });
    throwIfError(result.error, `Não foi possível resolver o conceito profissional “${term}”.`);
    const byPerson: Record<string, string[]> = {};
    for (const match of result.data ?? []) byPerson[match.person_id] = match.observed_terms;
    return [normalize(term), byPerson] as const;
  }));
  return Object.fromEntries(results);
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function knowledgeResolutionState(value: string): "resolved" | "ambiguous" | "unresolved" {
  return value === "resolved" || value === "ambiguous" ? value : "unresolved";
}

function throwIfError(error: PostgrestError | null, message: string): void {
  if (error) throw new Error(message);
}
