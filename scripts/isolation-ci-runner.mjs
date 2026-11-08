// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-lifecycle-observation (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export function createCiCommandRunner(root, evidence) {
  let step = 0;
  async function run(command, args, options = {}) {
    const { retain = true, ...execution } = options;
    const name =
      String(++step).padStart(3, '0') + '-' + path.basename(command).replace(/[^a-zA-Z0-9-]/g, '-') + '.log';
    let result;
    try {
      result = await exec(command, args, {
        timeout: 180000,
        maxBuffer: 16777216,
        cwd: root,
        env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
        ...execution,
      });
    } catch (error) {
      await fs.writeFile(
        path.join(evidence, name),
        retain
          ? (error.stdout ?? '') + (error.stderr ?? '')
          : 'Raw daemon response omitted; operation failed.\n',
      );
      if (!retain) throw new Error('Private CI command failed; raw output is omitted.');
      throw error;
    }
    await fs.writeFile(
      path.join(evidence, name),
      retain ? result.stdout + result.stderr : 'Private CI command succeeded; raw output is omitted.\n',
    );
    return result.stdout;
  }

  return run;
}
