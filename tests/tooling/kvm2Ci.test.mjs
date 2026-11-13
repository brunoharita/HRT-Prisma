import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const workflows = ["ci.yml", "mail-forwarder.yml"];
const originalRepository = "brunoharita/HRT-Prisma";

for (const workflow of workflows) {
  const source = readFileSync(new URL(`../../.github/workflows/${workflow}`, import.meta.url), "utf8");
  const expression = source.match(/^\s+runs-on: \$\{\{ (.+) \}\}$/m)?.[1];

  test(`${workflow}: routes only explicitly enabled original main pushes to KVM2`, () => {
    assert.ok(expression, "runner expression must be present");
    for (const enabled of [undefined, "", "false", "TRUE", "true"]) {
      for (const repository of [originalRepository, "someone/fork"]) {
        for (const event of ["push", "pull_request", "pull_request_target", "workflow_dispatch"]) {
          for (const ref of ["refs/heads/main", "refs/heads/feature", "refs/pull/1/merge", "refs/tags/v1"]) {
            const actual = runInNewContext(expression, {
              fromJSON: JSON.parse,
              vars: { PRISMA_KVM2_CI_ENABLED: enabled },
              github: { repository, event_name: event, ref },
            }, { timeout: 100 });
            const useKvm2 = enabled === "true" && repository === originalRepository && event === "push" && ref === "refs/heads/main";
            assert.deepEqual(actual, useKvm2
              ? ["self-hosted", "linux", "x64", "prisma-kvm2-ci"]
              : ["ubuntu-latest"], JSON.stringify({ enabled, repository, event, ref }));
          }
        }
      }
    }
  });

  test(`${workflow}: read-only token, bounded job and no persisted checkout credential`, () => {
    assert.match(source, /^permissions:\n  contents: read$/m);
    assert.match(source, /^    timeout-minutes: 10$/m);
    assert.match(source, /^\s+persist-credentials: false$/m);
    assert.doesNotMatch(source, /pull_request_target:|secrets: inherit|contents: write/);
  });
}
