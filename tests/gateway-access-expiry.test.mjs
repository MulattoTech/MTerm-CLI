// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-access-expiry (OpenAI / GPT-6 Astra Pro; self-reported)
// Real signed JWTs and WebCrypto operations; controlled settlement clocks, no network or owner state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyAccess } from '../gateway/security.mjs';

const issuer = 'https://expiry-fixture.cloudflareaccess.com';
const initialTime = 1900000000000;
let keyFixture;
async function signingKeys() {
  keyFixture ??= crypto.subtle
    .generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )
    .then(async (keys) => ({
      keys,
      jwk: { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'expiry-fixture-key' },
    }));
  return keyFixture;
}

async function fixture(t, { kind = 'user', claims = {}, environment = 'staging' } = {}) {
  const { keys, jwk } = await signingKeys();
  const service = kind === 'staging-service';
  const env = {
    ACCESS_ISSUER: issuer,
    ACCESS_AUDIENCE: 'expiry-fixture-audience',
    ALLOWED_EMAILS: 'fixture-owner@example.test',
    ENVIRONMENT: environment,
    STAGING_SERVICE_ID: 'expiry-fixture-service',
  };
  const payload = {
    type: 'app',
    iss: issuer,
    aud: env.ACCESS_AUDIENCE,
    ...(service
      ? { sub: '', common_name: env.STAGING_SERVICE_ID }
      : { sub: 'expiry-fixture-owner', email: 'fixture-owner@example.test' }),
    exp: initialTime / 1000 + 10,
    iat: initialTime / 1000,
    ...claims,
  };
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid })).toString('base64url');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = new TextEncoder().encode(header + '.' + encoded);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, signingInput),
  );
  const material = issuer + '\n' + (service ? 'service:' + payload.common_name : 'user:' + payload.sub);
  const expected = {
    userId: createHash('sha256').update(material).digest('hex'),
    kind,
  };
  let clock = initialTime;
  let transition;
  const observed = { keys: 0, verification: [], identityHashes: 0, externalRequests: 0 };
  const settle = (phase) => {
    if (transition?.phase === phase) clock = transition.time;
  };
  t.mock.method(Date, 'now', () => clock);
  t.mock.method(globalThis, 'fetch', async () => {
    observed.externalRequests++;
    assert.fail('This fixture must never make an external request.');
  });
  const originalVerify = crypto.subtle.verify;
  t.mock.method(crypto.subtle, 'verify', async function (...args) {
    const verified = await originalVerify.apply(this, args);
    observed.verification.push(verified);
    settle('signature');
    return verified;
  });
  const originalDigest = crypto.subtle.digest;
  t.mock.method(crypto.subtle, 'digest', async function (...args) {
    const digest = await originalDigest.apply(this, args);
    if (new TextDecoder().decode(args[1]) === material) {
      observed.identityHashes++;
      settle('identity');
    }
    return digest;
  });
  const fetcher = async (url, options) => {
    assert.equal(url, issuer + '/cdn-cgi/access/certs');
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    observed.keys++;
    settle('keys');
    return Response.json({ keys: [jwk] });
  };
  t.after(() => assert.equal(observed.externalRequests, 0));
  return {
    observed,
    expected,
    expiresAt: payload.exp * 1000,
    at(phase, time) {
      transition = { phase, time };
    },
    run({ invalidSignature = false } = {}) {
      const bytes = signature.slice();
      if (invalidSignature) bytes[0] ^= 1;
      const jwt = header + '.' + encoded + '.' + Buffer.from(bytes).toString('base64url');
      return verifyAccess(
        new Request('https://dashboard-fixture.invalid', {
          headers: { 'cf-access-jwt-assertion': jwt },
        }),
        env,
        fetcher,
      );
    },
  };
}

const invalidIdentity = (error) => error.status === 401 && error.code === 'invalid_identity';
const identityDenied = (error) => error.status === 403 && error.code === 'identity_not_allowed';
function checkedIdentity(f) {
  assert.equal(f.observed.keys, 1);
  assert.deepEqual(f.observed.verification, [true]);
  assert.equal(f.observed.identityHashes, 1);
}

for (const phase of ['keys', 'signature', 'identity']) {
  for (const delta of [-1, 0, 1]) {
    const boundary = delta < 0 ? 'one millisecond before' : delta === 0 ? 'exactly at' : 'after';
    test(`Access expiry: human settles ${boundary} expiry during ${phase}`, async (t) => {
      const f = await fixture(t);
      f.at(phase, f.expiresAt + delta);
      if (delta < 0) assert.deepEqual(await f.run(), f.expected);
      else await assert.rejects(f.run(), invalidIdentity);
      checkedIdentity(f);
    });
  }
  test(`Access expiry: staging service expires during ${phase}`, async (t) => {
    const f = await fixture(t, { kind: 'staging-service' });
    f.at(phase, f.expiresAt);
    await assert.rejects(f.run(), invalidIdentity);
    checkedIdentity(f);
  });
}

test('Access expiry: clock rollback after identity hashing rechecks issued-at tolerance', async (t) => {
  const f = await fixture(t);
  f.at('identity', initialTime - 6000);
  await assert.rejects(f.run(), invalidIdentity);
  checkedIdentity(f);
});

test('Access expiry: clock rollback after signature verification rechecks not-before tolerance', async (t) => {
  const f = await fixture(t, {
    claims: { iat: initialTime / 1000 - 120, nbf: initialTime / 1000 },
  });
  f.at('signature', initialTime - 6000);
  await assert.rejects(f.run(), invalidIdentity);
  checkedIdentity(f);
});

test('Access expiry: existing five-second issued-at and not-before tolerance stays valid', async (t) => {
  const f = await fixture(t, {
    kind: 'staging-service',
    claims: { iat: initialTime / 1000 + 5, nbf: initialTime / 1000 + 5 },
  });
  assert.deepEqual(await f.run(), f.expected);
  checkedIdentity(f);
});

for (const claim of ['iat', 'nbf'])
  test(`Access expiry: ${claim} beyond existing tolerance rejects before certificate retrieval`, async (t) => {
    const f = await fixture(t, { claims: { [claim]: initialTime / 1000 + 6 } });
    await assert.rejects(f.run(), invalidIdentity);
    assert.equal(f.observed.keys, 0);
    assert.deepEqual(f.observed.verification, []);
    assert.equal(f.observed.identityHashes, 0);
  });

test('Access expiry: already-expired signed identity rejects before certificate retrieval', async (t) => {
  const f = await fixture(t, { claims: { exp: initialTime / 1000 } });
  await assert.rejects(f.run(), invalidIdentity);
  assert.equal(f.observed.keys, 0);
  assert.deepEqual(f.observed.verification, []);
  assert.equal(f.observed.identityHashes, 0);
});

test('Access expiry: invalid signature remains rejected by actual verification', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.run({ invalidSignature: true }), invalidIdentity);
  assert.equal(f.observed.keys, 1);
  assert.deepEqual(f.observed.verification, [false]);
  assert.equal(f.observed.identityHashes, 0);
});

test('Access expiry: wrong audience cannot acquire authorization', async (t) => {
  const f = await fixture(t, { claims: { aud: 'another-fixture-audience' } });
  await assert.rejects(f.run(), invalidIdentity);
  assert.equal(f.observed.keys, 0);
});

test('Access expiry: a valid signature does not broaden the human allowlist', async (t) => {
  const f = await fixture(t, { claims: { email: 'unapproved@example.test' } });
  await assert.rejects(f.run(), identityDenied);
  assert.deepEqual(f.observed.verification, [true]);
  assert.equal(f.observed.identityHashes, 0);
});

test('Access expiry: service-principal acceptance remains unavailable in production', async (t) => {
  const f = await fixture(t, { kind: 'staging-service', environment: 'production' });
  await assert.rejects(f.run(), identityDenied);
  assert.deepEqual(f.observed.verification, [true]);
  assert.equal(f.observed.identityHashes, 0);
});
