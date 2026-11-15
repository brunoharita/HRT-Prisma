import assert from 'node:assert/strict';
import {test} from 'node:test';
import {githubApi, isQuotaMessage, numericId, quotaFallback, REPOSITORY} from '../../scripts/lib/ci-quota-fallback.mjs';

const root = `/repos/${REPOSITORY}`;
const runPath = `${root}/actions/runs/123`;
const checkPath = `${root}/check-runs/456`;
const message = "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings";
const sha = 'a'.repeat(40);
function fixture(mode = 'request') {
  const original = {id: 123, name: 'Prisma foundation CI', path: '.github/workflows/ci.yml',
    event: 'pull_request', head_sha: sha, head_branch: 'feature', run_attempt: 1, status: 'completed',
    conclusion: 'failure', head_repository: {full_name: REPOSITORY}, pull_requests: [{number: 39}]};
  const data = {
    [runPath]: {...original, run_attempt: mode === 'request' ? 1 : 2},
    [`${runPath}/attempts/1`]: original,
    [`${root}/pulls/39`]: {state: 'open', base: {ref: 'main', repo: {full_name: REPOSITORY}},
      head: {sha, ref: 'feature', repo: {full_name: REPOSITORY}}},
    [`${runPath}/attempts/1/jobs?per_page=100`]: {total_count: 2, jobs: [
      {name: 'validate', conclusion: 'failure', steps: [], runner_name: '', check_run_url: `https://api.github.com${checkPath}`},
      {name: 'Visual regression (desktop)', conclusion: 'skipped', steps: [], runner_name: ''},
    ]},
    [checkPath]: {app: {slug: 'github-actions'}, conclusion: 'failure', output: {annotations_count: 2}},
    [`${checkPath}/annotations?per_page=100`]: [{message, annotation_level: 'failure'},
      {message: 'The ubuntu-latest label will migrate to a newer Ubuntu version', annotation_level: 'notice'}],
  };
  const posts = [];
  const api = async (path, method = 'GET') => {
    if (method === 'POST') {posts.push(path); return null;}
    assert.ok(Object.hasOwn(data, path), `Unexpected API read: ${path}`);
    return structuredClone(data[path]);
  };
  return {data, posts, api};
}

test('Only verified provider quota can request one retry of the same run', async () => {
  const {api, posts} = fixture();
  assert.equal((await quotaFallback(api, 123, 'request')).fallbackAttempt, 2);
  assert.deepEqual(posts, [`${runPath}/rerun-failed-jobs`]);
  const second = fixture('verify');
  await quotaFallback(second.api, 123, 'verify');
  assert.deepEqual(second.posts, [], 'quality may verify but never mutate Actions');
});

test('Fail closed for test failures, artifact limits, missing steps and ambiguous provider evidence', async () => {
  const mutations = [
    data => {data[`${runPath}/attempts/1/jobs?per_page=100`].jobs[0].steps = [{name: 'npm test', conclusion: 'failure'}];},
    data => {delete data[`${runPath}/attempts/1/jobs?per_page=100`].jobs[0].steps;},
    data => {data[`${runPath}/attempts/1/jobs?per_page=100`].jobs[0].runner_name = 'GitHub Actions 1';},
    data => {data[`${runPath}/attempts/1/jobs?per_page=100`].total_count = 101;},
    data => {data[`${checkPath}/annotations?per_page=100`][0].message = 'Artifact storage quota exceeded';},
    data => {data[`${checkPath}/annotations?per_page=100`][0].message = `Untrusted output says: ${message}`;},
    data => {data[`${checkPath}/annotations?per_page=100`][0].message = 'Test failed';},
    data => {data[`${checkPath}/annotations?per_page=100`] = [];},
    data => {data[`${checkPath}/annotations?per_page=100`][0].annotation_level = 'notice';},
    data => {data[checkPath].app.slug = 'other-app';},
    data => {data[checkPath].output.annotations_count = 101;},
    data => {data[`${runPath}/attempts/1/jobs?per_page=100`].jobs[0].check_run_url = 'https://evil.example/check-runs/456';},
  ];
  for (const mutate of mutations) {
    const {data, api, posts} = fixture(); mutate(data);
    await assert.rejects(quotaFallback(api, 123, 'request'));
    assert.deepEqual(posts, []);
  }
});

test('External, stale, closed and unknown revisions/events never obtain VPS authorization', async () => {
  const mutations = [
    data => {data[runPath].head_repository.full_name = 'someone/fork';},
    data => {data[runPath].event = 'pull_request_target';},
    data => {data[runPath].path = '.github/workflows/unknown.yml';},
    data => {data[runPath].pull_requests = [];},
    data => {data[`${root}/pulls/39`].head.repo.full_name = 'someone/fork';},
    data => {data[`${root}/pulls/39`].head.sha = 'b'.repeat(40);},
    data => {data[`${root}/pulls/39`].base.ref = 'qa';},
    data => {data[`${root}/pulls/39`].state = 'closed';},
    data => {data[`${runPath}/attempts/1`].head_sha = 'b'.repeat(40);},
  ];
  for (const mutate of mutations) {
    const {data, api, posts} = fixture(); mutate(data);
    await assert.rejects(quotaFallback(api, 123, 'request'));
    assert.deepEqual(posts, []);
  }
});

test('Only current main can fall back; no retry loop or duplicate notification', async () => {
  const main = fixture();
  for (const path of [runPath, `${runPath}/attempts/1`]) Object.assign(main.data[path], {event: 'push', head_branch: 'main', pull_requests: []});
  main.data[`${root}/git/ref/heads/main`] = {object: {sha}};
  await quotaFallback(main.api, 123, 'request');
  main.data[`${root}/git/ref/heads/main`].object.sha = 'b'.repeat(40);
  await assert.rejects(quotaFallback(main.api, 123, 'request'), /Obsolete/);
  for (const attempt of [2, 3, 4]) {
    const f = fixture(); f.data[runPath].run_attempt = attempt;
    await assert.rejects(quotaFallback(f.api, 123, 'request'));
    assert.deepEqual(f.posts, []);
  }
  const f = fixture(); let reads = 0;
  await assert.rejects(quotaFallback(async (path, method) => {
    if (path === runPath && ++reads === 2) return {...f.data[runPath], run_attempt: 2};
    return f.api(path, method);
  }, 123, 'request'), /already retried/);
  assert.deepEqual(f.posts, []);
});

test('API errors refuse contingency and authentication cannot follow redirects or leave repo', async () => {
  await assert.rejects(quotaFallback(async () => {throw new Error('API unavailable');}, 123, 'request'), /unavailable/);
  let sent = false;
  const api = githubApi('test-token', async (url, options) => {
    sent = true;
    assert.equal(url, `https://api.github.com${runPath}`);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response('{}', {status: 403});
  });
  await assert.rejects(api('/repos/other/repo/actions/runs/123'), /Unexpected/);
  assert.equal(sent, false);
  await assert.rejects(api(runPath), /HTTP 403/);
  for (const id of [undefined, '', -1, 0, '123/../../', NaN]) assert.throws(() => numericId(id));
  assert.equal(isQuotaMessage(message + '.'), true);
  assert.equal(isQuotaMessage('quota'), false);
});

test('Unknown modes, timeout, cancelled jobs, dependency errors and ambiguous failures are rejected', async () => {
  await assert.rejects(quotaFallback(fixture().api, 123, 'other'), /Invalid/);
  for (const conclusion of ['timed_out', 'cancelled', 'success', null]) {
    const f = fixture();
    f.data[`${runPath}/attempts/1/jobs?per_page=100`].jobs[0].conclusion = conclusion;
    await assert.rejects(quotaFallback(f.api, 123, 'request'));
    assert.deepEqual(f.posts, []);
  }
  for (const reason of ['Dependency resolution failed', 'No space left on device', 'Unknown error', 'Timeout exceeded']) {
    const f = fixture(); f.data[`${checkPath}/annotations?per_page=100`][0].message = reason;
    await assert.rejects(quotaFallback(f.api, 123, 'request'));
    assert.deepEqual(f.posts, []);
  }
  for (const attempt of [1, 3, 4]) {
    const f = fixture('verify'); f.data[runPath].run_attempt = attempt;
    await assert.rejects(quotaFallback(f.api, 123, 'verify'));
  }
});

test('Source becoming obsolete immediately before retry is rejected without mutation', async () => {
  const f = fixture(); let reads = 0;
  await assert.rejects(quotaFallback(async (path, method) => {
    if (path === `${root}/pulls/39` && ++reads === 3) return {...f.data[path], state: 'closed'};
    return f.api(path, method);
  }, 123, 'request'), /obsolete/);
  assert.deepEqual(f.posts, []);
});
