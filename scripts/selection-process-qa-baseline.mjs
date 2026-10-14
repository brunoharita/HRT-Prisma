import{readFile}from"node:fs/promises";
export async function selectionProcessQaSql(database="import_evidence_v202"){
 if(!["import_evidence_v202","selection_process_concurrency_v260","selection_outcome_concurrency_v261"].includes(database))throw Error("LOCAL task database required");
 const files=JSON.parse(await readFile("tests/fixtures/selection-processes/recipe.json","utf8"));
 let source=(await Promise.all(files.map(f=>readFile(f,"utf8")))).join("\n").replaceAll("'import_evidence_v202'",`'${database}'`);
 source+="\n"+await readFile("supabase/migrations/20261014150000_selection_process_management.sql","utf8");
 source+="\n"+await readFile("supabase/qa/selection_process_management_verification.sql","utf8")+"\nrollback;";
 return source;
}
