#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp
import { main, safeError } from '../dist/cli.js';
try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  const e = safeError(error);
  process.stderr.write(`${e.code}: ${e.message}\n`);
  process.exitCode = e.code === 'USAGE' ? 2 : 1;
}
