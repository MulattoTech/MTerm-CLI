// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeRoot = process.env.MTERM_ENDPOINT_VERIFY_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { admitPublicEndpoint, isPublicEndpointAddress } = await import(
  pathToFileURL(path.join(runtimeRoot, 'dist/remote/endpoint-policy.js')).href
);

test('public endpoint admission normalizes explicit safe origins and preserves the MCP path', () => {
  assert.deepEqual(admitPublicEndpoint('https://EXAMPLE.com:443/mcp/v1'), {
    url: 'https://example.com/mcp/v1',
    hostname: 'example.com',
    port: 443,
    path: '/mcp/v1',
    family: 0,
  });
  assert.equal(admitPublicEndpoint('https://example.com:8443/a-b_1.2~x/').port, 8443);
  assert.equal(admitPublicEndpoint('https://8.8.8.8').path, '/');
  assert.equal(admitPublicEndpoint('https://[2606:4700:4700::1111]/mcp').family, 6);
  assert.equal(Object.isFrozen(admitPublicEndpoint('https://example.com/mcp')), true);
});

test('public URL validation rejects ambiguous raw syntax before URL normalization can hide it', () => {
  for (const url of [
    '',
    'http://example.com/mcp',
    'HTTPS:example.com/mcp',
    '//example.com/mcp',
    ' https://example.com/mcp',
    'https://example.com/mcp\n',
    'https://exam\tple.com/mcp',
    'https://user:SECRET@example.com/mcp',
    'https://@example.com/mcp',
    'https://example.com/mcp?',
    'https://example.com/mcp#',
    'https://example.com/mcp?token=SECRET',
    'https://example.com\\@127.0.0.1/mcp',
    'https://example.com/mcp\\x',
    'https://%65xample.com/mcp',
    'https://127.1/mcp',
    'https://2130706433/mcp',
    'https://0177.0.0.1/mcp',
    'https://0x7f000001/mcp',
    'https://0x7f.0.0.1/mcp',
    'https://example.com:/mcp',
    'https://example.com:0/mcp',
    'https://example.com:0443/mcp',
    'https://example.com:65536/mcp',
    'https://example.com:443:80/mcp',
    'https://example.com./mcp',
    'https://example..com/mcp',
    'https://-bad.example.com/mcp',
    'https://éxample.com/mcp',
    'https://example.com/a/../mcp',
    'https://example.com/./mcp',
    'https://example.com/%2e%2e/mcp',
    'https://example.com/%252fadmin',
    'https://example.com/a%2fb',
    'https://example.com/%00',
    'https://example.com//mcp',
    'https://example.com/a;b',
    'https://[fe80::1%25eth0]/mcp',
    'https://example.com/' + 'x'.repeat(2048),
  ]) {
    assert.throws(
      () => admitPublicEndpoint(url),
      (error) => error.code === 'ENDPOINT_URL',
    );
  }
});

test('private, special-purpose, mapped and transition addresses are denied in public mode', () => {
  for (const address of [
    '0.0.0.0',
    '0.255.255.255',
    '10.0.0.0',
    '10.255.255.255',
    '100.64.0.0',
    '100.127.255.255',
    '127.0.0.1',
    '127.255.255.255',
    '169.254.0.0',
    '169.254.255.255',
    '172.16.0.0',
    '172.31.255.255',
    '192.0.0.9',
    '192.0.2.1',
    '192.31.196.1',
    '192.52.193.1',
    '192.88.99.2',
    '192.168.0.0',
    '192.168.255.255',
    '192.175.48.1',
    '198.18.0.0',
    '198.19.255.255',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.0',
    '239.255.255.255',
    '240.0.0.0',
    '255.255.255.255',
    '168.63.129.16',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:8.8.8.8',
    '::ffff:0808:0808',
    '64:ff9b::808:808',
    '64:ff9b:1::1',
    '100::1',
    '100:0:0:1::1',
    '2001::1',
    '2001:1::1',
    '2001:2::1',
    '2001:20::1',
    '2001:30::1',
    '2001:db8::1',
    '2002:0808:0808::1',
    '2620:4f:8000::1',
    '3fff::1',
    '3fff:fff:ffff::1',
    '5f00::1',
    'fc00::1',
    'fdff::1',
    'fe80::1',
    'ff02::1',
    'fe80::1%eth0',
    'garbage',
    '2606:4700:4700::1111%eth0',
    '2001:4860::1%1',
  ])
    assert.equal(isPublicEndpointAddress(address), false, address);
  for (const host of [
    'localhost',
    'router.local',
    'thing.internal',
    'computer.lan',
    'example.test',
    'a.invalid',
  ]) {
    assert.throws(
      () => admitPublicEndpoint(`https://${host}/mcp`),
      (error) => error.code === 'ENDPOINT_URL',
    );
  }
  for (const url of ['https://10.1.2.3/mcp', 'https://[::1]/mcp', 'https://168.63.129.16/mcp']) {
    assert.throws(
      () => admitPublicEndpoint(url),
      (error) => error.code === 'ENDPOINT_ADDRESS',
    );
  }
});

test('address boundaries leave ordinary public IPv4 and global IPv6 eligible', () => {
  for (const address of [
    '1.1.1.1',
    '8.8.8.8',
    '9.255.255.255',
    '11.0.0.0',
    '100.63.255.255',
    '100.128.0.0',
    '126.255.255.255',
    '128.0.0.0',
    '169.253.255.255',
    '169.255.0.0',
    '172.15.255.255',
    '172.32.0.0',
    '192.167.255.255',
    '192.169.0.0',
    '198.17.255.255',
    '198.20.0.0',
    '223.255.255.255',
    '168.63.129.15',
    '168.63.129.17',
    '2001:4860:4860::8888',
    '2606:4700:4700::1111',
    '2001:200::1',
    '3ffe:ffff::1',
  ])
    assert.equal(isPublicEndpointAddress(address), true, address);
});

test('refused URLs never disclose the rejected input in errors', () => {
  for (const url of [
    'https://user:SENTINEL_SECRET@example.com/mcp',
    'https://example.com/mcp?SENTINEL_SECRET',
  ]) {
    assert.throws(
      () => admitPublicEndpoint(url),
      (error) => !String(error).includes('SENTINEL_SECRET'),
    );
  }
});
