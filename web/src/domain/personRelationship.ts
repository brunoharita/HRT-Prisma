export function personRelationshipLabels(person: {isActiveEmployee?: boolean; isCandidate?: boolean; operationalStatus?: string}): string[] {
  if (person.operationalStatus && person.operationalStatus !== "active") return [];
  return [...(person.isActiveEmployee === true ? ["Colaborador"] : []), ...(person.isCandidate === true ? ["Candidato"] : [])];
}
