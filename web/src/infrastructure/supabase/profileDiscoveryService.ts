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

const MAX_PILOT_PROFILES = 500;

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
  let profileQuery = supabase.from("professional_profiles")
    .select("id, person_id, profile_version, profile_data, approved_at, created_at")
    .eq("organization_id", organizationId)
    .is("superseded_at", null)
    .order("approved_at", { ascending: false })
    .range(0, MAX_PILOT_PROFILES - 1);
  if (personIds?.length) profileQuery = profileQuery.in("person_id", personIds);
  const profileResult = await profileQuery;
  throwIfError(profileResult.error, "Não foi possível consultar os Perfis publicados desta empresa.");
  const profiles = profileResult.data ?? [];
  if (!profiles.length) return [];
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
      .select("profile_id, original_term, resolution_state, concept_id")
      .eq("organization_id", organizationId)
      .in("profile_id", profiles.map((profile) => profile.id)),
  ]);
  throwIfError(peopleResult.error, "Não foi possível confirmar as Pessoas dos Perfis encontrados.");
  throwIfError(privateResult.error, "Não foi possível consultar as localizações permitidas.");
  throwIfError(observationsResult.error, "Não foi possível consultar a normalização profissional dos Perfis.");

  const conceptIds = [...new Set((observationsResult.data ?? []).flatMap((item) => item.concept_id ? [item.concept_id] : []))];
  const conceptResult = conceptIds.length
    ? await supabase.from("knowledge_concepts").select("id, canonical_label").in("id", conceptIds)
    : { data: [], error: null };
  throwIfError(conceptResult.error, "Não foi possível resolver os conceitos profissionais encontrados.");
  const people = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
  const locations = new Map((privateResult.data ?? []).map((item) => [item.person_id, [item.city, item.country_code].filter(Boolean).join(", ") || null]));
  const concepts = new Map((conceptResult.data ?? []).map((item) => [item.id, item.canonical_label]));
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
        canonicalLabel: item.concept_id ? concepts.get(item.concept_id) ?? null : null,
        state: knowledgeResolutionState(item.resolution_state),
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
