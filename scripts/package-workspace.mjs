// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-package-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// Development-only qualification workspace. Originals remain retained; no outer process/fixture cleanup.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const outside = (root, selected) => {
  const relative = path.relative(root, selected);
  return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative);
};
const describeError = (error) => ({
  name: error?.name ?? typeof error,
  code: error?.code ?? null,
  message: String(error?.message ?? error).slice(0, 4096),
});

export async function inspectPackageLocations(root, selected) {
  const checkout = await fs.realpath(root);
  const locations = {};
  for (const [name, value] of Object.entries(selected)) {
    const canonical = await fs.realpath(value);
    locations[name] = { path: canonical, outsideCheckout: outside(checkout, canonical) };
  }
  assert.ok(Object.keys(locations).length, 'At least one package location must be measured');
  return {
    checkout,
    locations,
    outsideCheckout: Object.values(locations).every((entry) => entry.outsideCheckout),
  };
}

async function retainEvidence(output, evidence, receipt, errors) {
  const excluded = new Set(['install', 'links', 'home', 'cache', 'scope']);
  const walk = async (relative = '') => {
    const entries = await fs.readdir(path.join(output, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const selected = path.join(relative, entry.name);
      const source = path.join(output, selected);
      const destination = path.join(evidence, selected);
      try {
        const stat = await fs.lstat(source);
        if (stat.isSymbolicLink()) {
          receipt.excludedPaths.push({ path: selected, reason: 'symbolic-link' });
        } else if (stat.isDirectory()) {
          if (
            (!relative && (excluded.has(entry.name) || /^(?:remote-state-|reference-)/.test(entry.name))) ||
            entry.name === 'fixtures'
          ) {
            receipt.excludedPaths.push({ path: selected, reason: 'runtime-fixture' });
          } else await walk(selected);
        } else if (stat.isFile()) {
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.copyFile(source, destination);
          const bytes = await fs.readFile(destination);
          receipt.copiedFiles.push({
            path: selected,
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          });
        } else receipt.excludedPaths.push({ path: selected, reason: 'nonregular-object' });
      } catch (error) {
        errors.push(error);
        receipt.retentionErrors.push({ path: selected, ...describeError(error) });
      }
    }
  };
  try {
    await walk();
  } catch (error) {
    errors.push(error);
    receipt.retentionErrors.push({ path: '.', ...describeError(error) });
  }
}

export async function withPackageWorkspace(
  rootInput,
  verify,
  { temporaryRoot = os.tmpdir(), inheritedEnv = process.env } = {},
) {
  const root = await fs.realpath(rootInput);
  const temporary = await fs.realpath(temporaryRoot);
  assert.ok(outside(root, temporary), 'Temporary workspace parent must be outside the checkout');
  await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
  const evidence = await fs.realpath(await fs.mkdtemp(path.join(root, 'artifacts', 'package-verify-')));
  const output = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'mterm-package-verify-')));
  assert.ok(outside(root, output), 'Canonical package workspace must be outside the checkout');
  const prefix = path.join(output, 'install');
  const linkPrefix = path.join(output, 'links');
  const home = path.join(output, 'home');
  const empty = path.join(output, 'empty.npmrc');
  const globalEmpty = path.join(output, 'global.npmrc');
  const env = {
    ...inheritedEnv,
    HOME: home,
    USERPROFILE: home,
    CODEX_HOME: path.join(home, 'codex'),
    MTERM_CONFIG_PATH: path.join(home, 'mterm.json'),
    npm_config_userconfig: empty,
    npm_config_globalconfig: globalEmpty,
    npm_config_cache: path.join(output, 'cache'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };
  // npm can reconstruct NODE_OPTIONS from node-options when launching a script.
  // This affects future children only; it cannot undo hooks already loaded in this verifier.
  for (const key of Object.keys(env))
    if (
      /token|secret|password/i.test(key) ||
      /^(?:node_(?:path|options)|npm_config_node[-_]options)$/i.test(key)
    )
      delete env[key];
  const workspace = { root, output, evidence, prefix, linkPrefix, home, env };
  let failed = false;
  let primary;
  let result;
  try {
    await fs.mkdir(home);
    await fs.writeFile(empty, '');
    await fs.writeFile(globalEmpty, '');
    result = await verify(workspace);
  } catch (error) {
    failed = true;
    primary = error;
  }
  const receipt = {
    schemaVersion: 1,
    checkout: root,
    runtime: output,
    evidence,
    runtimeOutsideCheckout: outside(root, output),
    runtimeRetained: true,
    cleanupAttempted: false,
    childExitsProvedByWorkspaceOwner: false,
    evidenceIsCapturedSnapshot: true,
    originalReportPathsPreserved: true,
    outcome: failed ? 'failed' : 'passed',
    primaryError: failed ? describeError(primary) : null,
    copiedFiles: [],
    excludedPaths: [],
    retentionErrors: [],
    failedCommandOutput: [],
  };
  const errors = [];
  for (const stream of ['stdout', 'stderr']) {
    if (!failed || typeof primary?.[stream] !== 'string') continue;
    const name = 'failed-command.' + stream + '.log';
    const original = Buffer.from(primary[stream]);
    const captured = original.subarray(0, 8388608);
    try {
      await fs.writeFile(path.join(output, name), captured);
      receipt.failedCommandOutput.push({
        stream,
        bytes: captured.length,
        truncated: captured.length !== original.length,
      });
    } catch (error) {
      errors.push(error);
      receipt.retentionErrors.push({ path: name, ...describeError(error) });
    }
  }
  await retainEvidence(output, evidence, receipt, errors);
  if (errors.length) receipt.outcome = 'failed';
  try {
    await fs.writeFile(path.join(evidence, 'workspace.json'), JSON.stringify(receipt, null, 2) + '\n');
  } catch (error) {
    errors.push(error);
    receipt.outcome = 'failed';
    receipt.retentionErrors.push({ path: 'workspace.json', ...describeError(error) });
    // Retain the receipt beside the original bytes if its normal destination is unavailable.
    try {
      await fs.writeFile(
        path.join(output, 'workspace-retention.json'),
        JSON.stringify(receipt, null, 2) + '\n',
      );
    } catch (fallbackError) {
      errors.push(fallbackError);
    }
    console.error(JSON.stringify({ evidence, runtime: output, retentionErrors: receipt.retentionErrors }));
  }
  // No deletion here: an existing helper may deliberately retain files for an unconfirmed child.
  if (failed) throw primary;
  if (errors.length) throw errors[0];
  return result;
}
