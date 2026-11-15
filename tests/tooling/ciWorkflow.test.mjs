import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const observer = readFileSync(new URL('../../.github/workflows/ci-quota-fallback.yml', import.meta.url), 'utf8');

test('Readiness is closed; attempt one, forks and unrelated refs stay hosted', () => {
  const expression = workflow.match(/fromJSON\((.+) && '\["self-hosted"/)[1];
  // Evaluate the actual workflow routing expression against representative contexts.
  const route = (attempt, ready = 'true', event = 'push', ref = 'refs/heads/main', repo = 'brunoharita/HRT-Prisma', head = repo, base = 'main') => {
    const github = {run_attempt: attempt, repository: repo, event_name: event, ref,
      event: {pull_request: {head: {repo: {full_name: head}}, base: {ref: base}}}};
    return Function('github', 'vars', `return ${expression}`)(github, {PRISMA_KVM2_CI_READY: ready});
  };
  assert.equal(route(1), false);
  assert.equal(route(2), true);
  assert.equal(route(2, ''), false);
  assert.equal(route(2, 'false'), false);
  assert.equal(route(3), false);
  assert.equal(route(2, 'true', 'push', 'refs/heads/feature'), false);
  assert.equal(route(2, 'true', 'pull_request'), true);
  assert.equal(route(2, 'true', 'pull_request', '', undefined, 'external/fork'), false);
  assert.equal(route(2, 'true', 'pull_request_target'), false);
  assert.equal(route(2, 'true', 'pull_request', '', undefined, undefined, 'qa'), false);
  assert.match(observer, /vars.PRISMA_KVM2_CI_READY == 'true'/);
});

test('Trusted controller never executes PR code, installs dependencies or receives deploy secrets', () => {
  assert.match(observer, /workflow_run:\n    workflows: \[Prisma foundation CI\]/);
  assert.match(observer, /workflow_run.run_attempt == 1/);
  assert.match(observer, /ref: main\n          path: \.ci-controller\n          persist-credentials: false/);
  assert.match(observer, /working-directory: \.ci-controller/);
  assert.match(observer, /actions: write/);
  assert.doesNotMatch(observer, /pnpm|npm |head_sha|contents: write|pull_request_target|secrets:/);
  assert.doesNotMatch(workflow, /actions: write|contents: write|secrets:|release:publish/);
});

test('Each VPS test job proves quota from main before dependencies or test checkout', () => {
  const proof = workflow.indexOf('run: /usr/bin/node scripts/ci-quota-fallback.mjs verify');
  assert.ok(proof > 0);
  assert.ok(proof < workflow.indexOf('name: Checkout independent full test repository'));
  assert.ok(proof < workflow.indexOf('uses: pnpm/action-setup'));
  assert.ok(proof < workflow.indexOf('run: pnpm install'));
  assert.match(workflow, /ref: main\n          path: \.ci-verifier/);
  assert.match(workflow, /working-directory: ci-checkout/);
  assert.match(workflow, /cache-dependency-path: ci-checkout\/pnpm-lock.yaml/);
  assert.match(workflow, /path: ci-checkout\/tmp\/ci-reports\//);
  for (const command of ['pnpm validate', 'pnpm check:supabase-ledger', 'bash -n deploy/release-web.sh', 'pnpm audit --prod --audit-level high']) assert.ok(workflow.includes(command));
  assert.match(workflow, /  validate:\n/);
  assert.match(workflow, /set -o pipefail/);
});

test('Full checkout remains independent of a partial controller without credentials', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prisma-ci-git-'));
  const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: 'pipe'}).trim();
  try {
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.name', 'CI fixture'); git(dir, 'config', 'user.email', 'ci@example.invalid');
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    writeFileSync(join(dir, 'controller.mjs'), '// trusted fixture\n');
    git(dir, 'add', '.'); git(dir, 'commit', '-qm', 'fixture');
    git(dir, 'sparse-checkout', 'set', '--no-cone', '/controller.mjs');
    git(dir, 'config', 'remote.origin.url', 'https://invalid.example/no-credentials');
    git(dir, 'config', 'remote.origin.promisor', 'true');
    git(dir, 'config', 'remote.origin.partialclonefilter', 'blob:none');
    const checkout = join(dir, 'ci-checkout'); mkdirSync(checkout);
    git(checkout, 'init', '-q'); git(checkout, 'fetch', dir, 'HEAD'); git(checkout, 'checkout', '--detach', 'FETCH_HEAD');
    assert.equal(git(checkout, 'rev-parse', '--show-toplevel'), checkout);
    assert.ok(existsSync(join(checkout, 'pnpm-lock.yaml')));
    assert.equal(existsSync(join(dir, 'pnpm-lock.yaml')), false);
    assert.equal(git(checkout, 'status', '--porcelain'), '');
  } finally {rmSync(dir, {recursive: true, force: true});}
});
