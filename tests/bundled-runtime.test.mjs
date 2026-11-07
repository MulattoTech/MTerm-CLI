// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-07-aug002-provenance (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const entry = path.resolve(process.env.MTERM_VERIFY_BIN ?? 'bin/mterm-cli.js');
const require = createRequire(pathToFileURL(path.resolve(path.dirname(entry), '../package.json')));
test('actual SDK artifact embeds only the exact reviewed fixed fast-uri version', async () => {
  const ajvEntry = require.resolve('@modelcontextprotocol/server/validators/ajv');
  const dist = path.resolve(path.dirname(ajvEntry), '..');
  const maps = (await fs.readdir(dist)).filter((name) => /^ajvProvider-.*\.(?:mjs|cjs)\.map$/.test(name));
  assert.equal(
    maps.length,
    2,
    'Both runtime format source maps are required for the bundled inventory check',
  );
  for (const name of maps) {
    const map = JSON.parse(await fs.readFile(path.join(dist, name), 'utf8'));
    const versions = map.sources
      .map((source) => source.match(/\/fast-uri@([^/]+)\/node_modules\/fast-uri\//)?.[1])
      .filter(Boolean);
    assert.ok(versions.length >= 3, 'URI implementation must be visible in the reviewed source map');
    assert.deepEqual(
      [...new Set(versions)],
      ['3.1.9'],
      'Do not ship the audited affected fast-uri3.1.0/3.1.8 artifacts',
    );
  }
});
