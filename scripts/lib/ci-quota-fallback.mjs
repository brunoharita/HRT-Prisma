/** Contingency is authorized by provider evidence, never by a failing test. */
export const REPOSITORY = 'brunoharita/HRT-Prisma';
const ROOT = `/repos/${REPOSITORY}`;
const BILLING_MESSAGE = "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings";

/** @typedef {{id:number, name:string, path:string, event:string, head_sha:string, head_branch:string, run_attempt:number, status:string, conclusion:string|null, head_repository:{full_name:string}|null, pull_requests:{number:number}[]}} Run */
/** @typedef {{name:string, conclusion:string|null, steps?:unknown[], check_run_url:string, runner_name?:string}} Job */
/** @typedef {(path:string, method?:'GET'|'POST') => Promise<any>} Api */

/** @param {string} token @param {typeof fetch} [request] @returns {Api} */
export function githubApi(token, request = fetch) {
  if (!token) throw new Error('GitHub token is required');
  return async (path, method = 'GET') => {
    if (!path.startsWith(`${ROOT}/`) || path.includes('..')) throw new Error('Unexpected API path');
    const response = await request(`https://api.github.com${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'},
    });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    return response.status === 204 || method === 'POST' ? null : response.json();
  };
}

/** @param {unknown} value @returns {number} */
export function numericId(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error('Invalid run or pull request ID');
  }
  return Number(value);
}

/** @param {unknown} message */
export function isQuotaMessage(message) {
  return typeof message === 'string' && message.trim().replace(/[.!]+$/, '') === BILLING_MESSAGE;
}

/**
 * Refuse stale revisions, forks and all events except internal PR/main push.
 * @param {Api} api @param {Run} run
 */
async function verifySource(api, run) {
  if (run.path !== '.github/workflows/ci.yml' || run.name !== 'Prisma foundation CI' ||
      run.head_repository?.full_name !== REPOSITORY || !/^[a-f0-9]{40}$/.test(run.head_sha)) {
    throw new Error('Unapproved workflow or repository');
  }
  if (run.event === 'push' && run.head_branch === 'main') {
    const ref = await api(`${ROOT}/git/ref/heads/main`);
    if (ref.object?.sha !== run.head_sha) throw new Error('Obsolete main revision');
    return;
  }
  if (run.event !== 'pull_request' || run.pull_requests?.length !== 1) throw new Error('Unapproved event');
  const number = numericId(run.pull_requests[0]?.number);
  const pr = await api(`${ROOT}/pulls/${number}`);
  if (pr.state !== 'open' || pr.base?.repo?.full_name !== REPOSITORY || pr.base?.ref !== 'main' ||
      pr.head?.repo?.full_name !== REPOSITORY || pr.head?.sha !== run.head_sha || pr.head?.ref !== run.head_branch) {
    throw new Error('External or obsolete pull request');
  }
}

/**
 * Require every failed initial job to have no steps and an exact official billing
 * annotation. Missing metadata, partial API results and test failures fail closed.
 * @param {Api} api @param {number} id
 */
async function verifyOriginalQuota(api, id) {
  /** @type {Run} */
  const first = await api(`${ROOT}/actions/runs/${id}/attempts/1`);
  if (first.id !== id || first.run_attempt !== 1 || first.status !== 'completed' || first.conclusion !== 'failure') {
    throw new Error('Initial attempt is not a completed failure');
  }
  await verifySource(api, first);
  const page = await api(`${ROOT}/actions/runs/${id}/attempts/1/jobs?per_page=100`);
  /** @type {Job[]} */
  const jobs = page.jobs;
  if (!Array.isArray(jobs) || !jobs.length || jobs.length !== page.total_count ||
      jobs.some(job => !Array.isArray(job.steps) || job.steps.length > 0 ||
        !['failure', 'skipped'].includes(job.conclusion ?? '') || job.runner_name)) {
    throw new Error('Initial jobs executed, incomplete or not quota failures');
  }
  const failed = jobs.filter(job => job.conclusion === 'failure');
  if (!failed.some(job => job.name === 'validate')) throw new Error('No blocked validate job');
  for (const job of failed) {
    const prefix = `https://api.github.com${ROOT}/check-runs/`;
    if (!job.check_run_url?.startsWith(prefix) || !/^\d+$/.test(job.check_run_url.slice(prefix.length))) {
      throw new Error('Unexpected check provenance');
    }
    const path = job.check_run_url.slice('https://api.github.com'.length);
    const check = await api(path);
    const annotations = await api(`${path}/annotations?per_page=100`);
    if (check.app?.slug !== 'github-actions' || check.conclusion !== 'failure' ||
        !Array.isArray(annotations) || annotations.length !== check.output?.annotations_count ||
        !annotations.some(annotation => annotation.annotation_level === 'failure') ||
        !annotations.filter(annotation => annotation.annotation_level === 'failure')
          .every(annotation => isQuotaMessage(annotation.message))) {
      throw new Error('Official billing/compute quota evidence missing or ambiguous');
    }
  }
  return first;
}

/** @param {Api} api @param {number} id @param {'request'|'verify'} mode */
export async function quotaFallback(api, id, mode) {
  if (!['request', 'verify'].includes(mode)) throw new Error('Invalid contingency mode');
  numericId(id);
  /** @type {Run} */
  const current = await api(`${ROOT}/actions/runs/${id}`);
  const expectedAttempt = mode === 'request' ? 1 : 2;
  if (current.id !== id || current.run_attempt !== expectedAttempt ||
      (mode === 'request' && (current.status !== 'completed' || current.conclusion !== 'failure'))) {
    throw new Error('Contingency permits one retry after the initial completed failure');
  }
  await verifySource(api, current);
  const first = await verifyOriginalQuota(api, id);
  if (first.head_sha !== current.head_sha || first.event !== current.event || first.path !== current.path) {
    throw new Error('Attempt identity changed');
  }
  if (mode === 'request') {
    // Re-read immediately before the mutation: duplicate notifications must not
    // request another attempt after another controller/operator already retried.
    const latest = await api(`${ROOT}/actions/runs/${id}`);
    if (latest.id !== id || latest.run_attempt !== 1 || latest.status !== 'completed' || latest.conclusion !== 'failure') throw new Error('Run already retried');
    await verifySource(api, latest);
    if (latest.head_sha !== first.head_sha || latest.event !== first.event || latest.path !== first.path) throw new Error('Attempt identity changed');
    await api(`${ROOT}/actions/runs/${id}/rerun-failed-jobs`, 'POST');
  }
  return {run: id, originalAttempt: 1, fallbackAttempt: 2, reason: 'verified-provider-billing-limit'};
}
