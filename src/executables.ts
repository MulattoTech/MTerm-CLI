// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fail } from './errors.js';
/** Never search implicit current-directory or execute batch wrappers through a shell. */
export async function resolveExecutable(name: string, explicit?: string): Promise<string> {
  if (explicit) {
    if (!path.isAbsolute(explicit) || /\.(cmd|bat|ps1)$/i.test(explicit))
      fail('INVALID_EXECUTABLE', 'Provide an absolute native executable path.');
    const full = await fs.realpath(explicit);
    if (!(await fs.stat(full)).isFile()) fail('INVALID_EXECUTABLE', 'Expected an executable file.');
    return full;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) fail('INVALID_EXECUTABLE', 'Invalid executable name.');
  const envPath = Object.entries(process.env).find(([k]) => k.toLowerCase() === 'path')?.[1] ?? '';
  for (const dir of envPath.split(path.delimiter)) {
    if (!path.isAbsolute(dir)) continue;
    const full = path.join(dir, process.platform === 'win32' ? name + '.exe' : name);
    try {
      if ((await fs.stat(full)).isFile()) return await fs.realpath(full);
    } catch {}
  }
  fail('DEPENDENCY_MISSING', 'Required executable is not available in explicit PATH directories: ' + name);
}
