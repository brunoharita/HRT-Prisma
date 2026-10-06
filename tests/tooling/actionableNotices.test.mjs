import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith(".tsx") ? [join(dir, entry.name)] : []); }
const inventory = files("web/src").flatMap((file) => {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const notices = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const name = node.tagName.getText(source);
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
      const value = (key) => attrs.find((attr) => attr.name.getText(source) === key)?.initializer;
      const type = value("type"); const kind = value("kind");
      if ((name === "Alert" && type && ts.isStringLiteral(type) && type.text === "error")
        || (name === "PrismaState" && kind && ts.isStringLiteral(kind) && ["error", "unavailable"].includes(kind.text))) {
        notices.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, action: Boolean(value("action")) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source); return notices;
});
test(`falhas e acessos indisponíveis possuem ação explícita no próprio aviso (${inventory.length} pontos)`, () => {
  assert.ok(inventory.length > 40, "audit must cover the app, not only the competency page");
  assert.deepEqual(inventory.filter((item) => !item.action), []);
});
test("avisos temporários de erro usam mensagem persistente com ação contextual", () => {
  const raw = files("web/src").filter((file) => !file.endsWith("ActionableMessage.tsx")).filter((file) => /message\.error\(/.test(readFileSync(file, "utf8")));
  assert.deepEqual(raw, []);
  const component = readFileSync("web/src/ui/ActionableMessage.tsx", "utf8");
  assert.match(component, /duration: 0/); assert.match(component, /action\.onClick\(\)/);
});
test("definir grupo reutiliza a operação autorizada e não altera o vínculo factual", () => {
  const service = readFileSync("web/src/infrastructure/supabase/profileCompetencyCurationService.ts", "utf8");
  assert.match(service, /rpc\("classify_knowledge_competency"/);
  assert.match(service, /rpc\("link_person_competency_evidence_batch_v2"/);
  const modal = readFileSync("web/src/components/profile/CompetencyGroupModal.tsx", "utf8");
  assert.match(modal, /useState<string \| null>\(null\)/);
  assert.match(modal, /concept\?\.scope === "organization" \|\| adapter\.canUseGlobal/);
});
