import {appendFileSync} from 'node:fs';
import {githubApi, numericId, quotaFallback, REPOSITORY} from './lib/ci-quota-fallback.mjs';

try {
  const mode = process.argv[2];
  if (mode !== 'request' && mode !== 'verify') throw new Error('Use request or verify');
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY) throw new Error('Unapproved repository');
  const result = await quotaFallback(githubApi(process.env.GH_TOKEN ?? ''), numericId(process.env.PRISMA_QUOTA_RUN_ID), mode);
  const message = `KVM2 contingency ${mode}: run ${result.run}, attempt 2; initial provider billing limit verified.`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n`);
} catch (error) {
  console.error(`KVM2 contingency refused: ${error instanceof Error ? error.message : 'verification failed'}`);
  process.exitCode = 1;
}
