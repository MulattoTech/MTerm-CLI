// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnvironmentName, configPath } from '../dist/config.js';

test('Default environment resolves to production and MTermCLI directory', () => {
  delete process.env.MTERM_ENV;
  delete process.env.MTERM_CONFIG_PATH;

  assert.equal(getEnvironmentName(), 'production');
  const pathVal = configPath();
  assert.ok(pathVal.includes('MTermCLI'));
  assert.equal(pathVal.includes('MTermCLI-DEV'), false);
});

test('MTERM_ENV=development isolates environment to MTermCLI-DEV', () => {
  delete process.env.MTERM_CONFIG_PATH;
  process.env.MTERM_ENV = 'development';

  try {
    assert.equal(getEnvironmentName(), 'development');
    const pathVal = configPath();
    assert.ok(pathVal.includes('MTermCLI-DEV'));
  } finally {
    delete process.env.MTERM_ENV;
  }
});
