// SPDX-License-Identifier: MIT
// The compiler copies TypeScript outputs, not the native PowerShell helper.
// Keep the exact reviewed script beside its compiled Windows wrapper so the
// packed CLI does not fall back to missing-source behavior after installation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'native', 'job-supervisor.ps1');
const destination = path.join(root, 'dist', 'native', 'job-supervisor.ps1');

await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.copyFile(source, destination);
