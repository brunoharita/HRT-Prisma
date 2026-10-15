import { supabase } from "./client";
export async function loadPersonCandidacies(organizationId: string, personIds: string[]): Promise<Map<string, boolean>> {
  const ids = [...new Set(personIds)];
  if (!ids.length) return new Map();
  const {data,error} = await supabase.rpc("get_person_relationship_tags" as never,{p_organization_id:organizationId,p_person_ids:ids} as never);
  if(error) throw new Error("Não foi possível confirmar as participações atuais. Atualize a consulta.");
  const rows = data as unknown as Array<{personId:string;isCandidate:boolean}>;
  if(!Array.isArray(rows)||rows.some(r=>!ids.includes(r.personId)||typeof r.isCandidate!=="boolean")) throw new Error("Participações atuais incompatíveis.");
  return new Map(rows.map(r=>[r.personId,r.isCandidate]));
}
