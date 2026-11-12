// SPDX-License-Identifier: MIT
// Offline coherence checks for retained GitHub observations. Not a signature or
// live attestation: reviewers must still verify the original observations.
import { createHash } from 'node:crypto';

const ensure = (ok, message) => {
  if (!ok) throw new Error(`[SOURCE_BINDING] ${message}`);
};
const equalList = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);
const uniquePaths = (records, expected) =>
  Array.isArray(records) &&
  records.length === expected.length &&
  new Set(records.map((x) => x.path)).size === records.length &&
  records.every((record) => expected.includes(record.path));
const utcDate = (value) =>
  typeof value === 'string' && /T.*(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));

export function validateDeliveryIdentity(item, receipt, evidenceTexts) {
  const originals = receipt.originalEvidence.filter((entry) => entry.role === 'github-api-identity');
  ensure(originals.length === 1, `${item.id}: one captured GitHub identity is required`);
  const raw = JSON.parse(evidenceTexts[originals[0].repositoryPath]);
  const api = `https://api.github.com/repos/${item.repository}`;
  const web = `https://github.com/${item.repository}`;
  const pr = raw.pullRequest?.response;
  ensure(
    raw.repository === item.repository &&
      raw.pullRequestNumber === item.pullRequest &&
      raw.pullRequest?.requestUrl === `${api}/pulls/${item.pullRequest}` &&
      pr &&
      pr.number === item.pullRequest &&
      pr.url === `${web}/pull/${item.pullRequest}` &&
      pr.head_repo_full_name === item.repository &&
      typeof pr.head === 'string' &&
      pr.head.trim().length > 0 &&
      pr.head_sha === item.candidateSha &&
      pr.base === 'main' &&
      pr.merge_commit_sha === item.mainSha &&
      pr.merged === true &&
      pr.state === 'closed' &&
      utcDate(receipt.mergedAt) &&
      receipt.mergedAt === pr.merged_at &&
      utcDate(item.observedAt) &&
      Date.parse(item.observedAt) >= Date.parse(receipt.mergedAt) &&
      item.candidateSha !== item.mainSha &&
      pr.base_sha === receipt.mainParents[0] &&
      !receipt.mainParents.includes(item.mainSha),
    `${item.id}: captured PR identity`,
  );

  for (const [phase, sha, branch, event] of [
    ['candidate', item.candidateSha, pr.head, 'pull_request'],
    ['main', item.mainSha, 'main', 'push'],
  ]) {
    const observation = raw[phase],
      commit = observation?.commit?.response;
    ensure(
      commit &&
        observation.commit.requestUrl === `${api}/git/commits/${sha}` &&
        commit.sha === sha &&
        commit.tree?.sha === item.tree &&
        commit.url === `${api}/git/commits/${sha}` &&
        equalList(
          commit.parents?.map((parent) => parent.sha),
          receipt[`${phase}Parents`],
        ),
      `${item.id}: captured ${phase} commit/tree/parents`,
    );

    ensure(
      uniquePaths(
        observation.workflows,
        receipt.workflows.map((workflow) => workflow.path),
      ),
      `${item.id}: captured ${phase} workflow set`,
    );
    for (const workflow of receipt.workflows) {
      const observed = observation.workflows.find((entry) => entry.path === workflow.path);
      ensure(
        observed.ref === sha &&
          observed.requestUrl === `${api}/contents/${workflow.path}?ref=${sha}` &&
          typeof observed.content === 'string',
        `${item.id}: captured workflow source`,
      );
      const bytes = Buffer.from(observed.content, 'utf8');
      const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      ensure(
        blob === workflow.gitBlob && createHash('sha256').update(bytes).digest('hex') === workflow.sha256,
        `${item.id}: workflow bytes do not belong to the recorded source`,
      );
    }

    const runs = receipt[phase].runs,
      checks = receipt[phase].checks;
    ensure(
      Array.isArray(observation.runs) &&
        observation.runs.length === runs.length &&
        new Set(observation.runs.map((entry) => entry.response?.id)).size === runs.length &&
        Array.isArray(observation.jobLists) &&
        observation.jobLists.length === runs.length,
      `${item.id}: captured ${phase} runs/job lists`,
    );
    const consumedJobLists = new Set();
    for (const run of runs) {
      const entry = observation.runs.find((entry) => entry.response?.id === run.id);
      const captured = entry?.response;
      ensure(
        captured &&
          entry.requestUrl === `${api}/actions/runs/${run.id}` &&
          captured.url === `${api}/actions/runs/${run.id}` &&
          captured.workflow_url === `${api}/actions/workflows/${run.workflowId}` &&
          captured.repository?.full_name === item.repository &&
          captured.head_sha === sha &&
          captured.head_branch === branch &&
          captured.event === event &&
          captured.run_attempt === run.runAttempt &&
          captured.workflow_id === run.workflowId &&
          captured.path === run.workflowPath &&
          captured.status === run.status &&
          captured.conclusion === run.conclusion &&
          captured.html_url === run.url,
        `${item.id}: normalized ${phase} run differs from captured identity`,
      );
      const jobsEntry = observation.jobLists.find(
        (entry) => entry.requestUrl === `${api}/actions/runs/${run.id}/jobs?per_page=100`,
      );
      const jobs = jobsEntry?.response?.jobs;
      const normalized = checks.filter((check) => check.runId === run.id);
      ensure(
        jobsEntry &&
          !consumedJobLists.has(jobsEntry.requestUrl) &&
          Array.isArray(jobs) &&
          jobsEntry.response.total_count === jobs.length &&
          jobs.length === normalized.length &&
          new Set(jobs.map((job) => job.id)).size === jobs.length,
        `${item.id}: captured ${phase} complete job set`,
      );
      consumedJobLists.add(jobsEntry.requestUrl);
      for (const check of normalized) {
        const job = jobs.find((entry) => entry.id === check.id);
        ensure(
          job &&
            job.run_id === check.runId &&
            job.url === `${api}/actions/jobs/${check.id}` &&
            job.run_url === `${api}/actions/runs/${run.id}` &&
            job.run_attempt === check.runAttempt &&
            job.head_sha === sha &&
            job.name === check.name &&
            job.status === check.status &&
            job.conclusion === check.conclusion &&
            utcDate(job.completed_at) &&
            Date.parse(item.observedAt) >= Date.parse(job.completed_at) &&
            job.html_url === check.url,
          `${item.id}: normalized ${phase} job differs from captured identity`,
        );
      }
    }
  }
}
