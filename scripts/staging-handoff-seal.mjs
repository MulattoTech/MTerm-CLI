// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-09-staging-handoff (OpenAI / GPT-6 Astra Pro; self-reported)
// Self-contained Cloudflare execute template. Embed this function unchanged in a
// reviewed async execution, then call it with public challenge, cloudflare,
// selected accountId, and an INDEPENDENTLY reviewed source/mode selection.
// It never accepts/exports an account credential or changes policies/bindings.
export async function sealStagingHandoff(input, cloudflare, selectedAccountId, reviewed) {
  const ACCOUNT = '9e18ebcb3c1a920c9ef58a3d61b8d6b6';
  const ORIGINS = ['https://mcp-staging.m-techlabs.com', 'https://mterm-staging.m-techlabs.com'];
  const HARNESS = '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e';
  const PROBE = {
    client_id: 'mterm_public_probe.access',
    client_secret: 'MTERM_PUBLIC_PROBE_ONLY_NO_CREDENTIAL',
  };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const expectedKeys = [
    'mode',
    'localSourceCommit',
    'localBundleSha256',
    'receiverSha256',
    'sealerSha256',
    'harnessSha256',
    'expectedDeployedSourceCommit',
  ];
  const challengeKeys = [
    'type',
    'protocol',
    'purpose',
    'mode',
    'runNonce',
    'recipientKeySha256',
    'expiresAt',
    'accountId',
    'origins',
    'localSourceCommit',
    'localBundleSha256',
    'receiverSha256',
    'sealerSha256',
    'harnessSha256',
    'expectedDeployedSourceCommit',
    'tokenName',
    'tokenDuration',
    'publicKey',
  ];
  let challenge,
    name = null,
    runNonce = null,
    tokenId = null,
    tokenCreatedAt = null,
    tokenExpiresAt = null,
    createAttempted = false,
    rawKey,
    value,
    phase = 'validation';
  class SealError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  const ensure = (condition, code) => {
    if (!condition) throw new SealError(code);
  };
  const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const canonical = (value, pattern) => typeof value === 'string' && pattern.test(value);
  const encode = (data) => {
    let text = '';
    for (const byte of new Uint8Array(data)) text += String.fromCharCode(byte);
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const decode = (text, maximum) => {
    ensure(
      typeof text === 'string' && text.length <= Math.ceil(maximum / 3) * 4 && /^[A-Za-z0-9_-]+$/.test(text),
      'CHALLENGE_REJECTED',
    );
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
    const raw = atob(padded),
      output = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    ensure(output.length <= maximum && encode(output) === text, 'CHALLENGE_REJECTED');
    return output;
  };
  const fresh = () =>
    ensure(
      challenge && Number.isSafeInteger(challenge.expiresAt) && Date.now() < challenge.expiresAt,
      'HANDOFF_EXPIRED',
    );
  const awaitFresh = async (action) => {
    fresh();
    const answer = await action();
    fresh();
    return answer;
  };
  const credential = (data) =>
    object(data) &&
    typeof data.client_id === 'string' &&
    /^[A-Za-z0-9_-]{8,256}\.access$/.test(data.client_id) &&
    typeof data.client_secret === 'string' &&
    /^[A-Za-z0-9_-]{16,1024}$/.test(data.client_secret);
  try {
    ensure(selectedAccountId === ACCOUNT && object(input) && object(reviewed), 'SELECTION_REJECTED');
    ensure(
      JSON.stringify(Object.keys(input)) === JSON.stringify(challengeKeys) &&
        JSON.stringify(Object.keys(reviewed)) === JSON.stringify(expectedKeys),
      'CHALLENGE_REJECTED',
    );
    // Snapshot public inputs before any await; getters/changes from a caller are
    // not an authorization channel. The execution caller must already be trusted.
    challenge = JSON.parse(JSON.stringify(input));
    const expected = JSON.parse(JSON.stringify(reviewed));
    ensure(
      challenge.type === 'mterm-staging-handoff-challenge' &&
        challenge.protocol === 1 &&
        challenge.purpose === 'mterm-staging-handoff' &&
        ['probe', 'smoke'].includes(challenge.mode),
      'CHALLENGE_REJECTED',
    );
    ensure(
      expectedKeys.every((key) => challenge[key] === expected[key]),
      'SELECTION_REJECTED',
    );
    ensure(
      canonical(challenge.localSourceCommit, /^[0-9a-f]{40}$/) &&
        canonical(challenge.expectedDeployedSourceCommit, /^[0-9a-f]{40}$/),
      'CHALLENGE_REJECTED',
    );
    for (const key of [
      'localBundleSha256',
      'receiverSha256',
      'sealerSha256',
      'harnessSha256',
      'recipientKeySha256',
    ])
      ensure(canonical(challenge[key], /^[0-9a-f]{64}$/), 'CHALLENGE_REJECTED');
    ensure(
      challenge.harnessSha256 === HARNESS &&
        challenge.accountId === ACCOUNT &&
        JSON.stringify(challenge.origins) === JSON.stringify(ORIGINS),
      'CHALLENGE_REJECTED',
    );
    ensure(
      canonical(challenge.runNonce, /^[0-9a-f]{32}$/) &&
        challenge.tokenName === 'mterm-staging-handoff-' + challenge.runNonce &&
        challenge.tokenDuration === '30m',
      'CHALLENGE_REJECTED',
    );
    ensure(
      Number.isSafeInteger(challenge.expiresAt) && challenge.expiresAt <= Date.now() + 120000,
      'CHALLENGE_REJECTED',
    );
    fresh();
    name = challenge.tokenName;
    runNonce = challenge.runNonce;
    ensure(
      typeof crypto?.subtle?.importKey === 'function' && typeof crypto.getRandomValues === 'function',
      'CRYPTO_UNAVAILABLE',
    );
    const spki = decode(challenge.publicKey, 1024);
    const recipient = await awaitFresh(() =>
      crypto.subtle.importKey('spki', spki, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']),
    );
    ensure(
      recipient.type === 'public' &&
        recipient.algorithm.name === 'RSA-OAEP' &&
        recipient.algorithm.modulusLength === 3072 &&
        recipient.algorithm.hash.name === 'SHA-256' &&
        JSON.stringify(Array.from(recipient.algorithm.publicExponent)) === '[1,0,1]',
      'CHALLENGE_REJECTED',
    );
    const canonicalKey = await awaitFresh(() => crypto.subtle.exportKey('spki', recipient));
    ensure(encode(canonicalKey) === challenge.publicKey, 'CHALLENGE_REJECTED');
    const fingerprint = Array.from(
      new Uint8Array(await awaitFresh(() => crypto.subtle.digest('SHA-256', spki))),
      (n) => n.toString(16).padStart(2, '0'),
    ).join('');
    ensure(fingerprint === challenge.recipientKeySha256, 'CHALLENGE_REJECTED');
    rawKey = crypto.getRandomValues(new Uint8Array(32));
    const aes = await awaitFresh(() =>
      crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']),
    );
    const encryptedKey = await awaitFresh(() =>
      crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipient, rawKey),
    );
    ensure(new Uint8Array(encryptedKey).length === 384, 'CRYPTO_UNAVAILABLE');
    rawKey.fill(0);
    rawKey = undefined;
    const iv = crypto.getRandomValues(new Uint8Array(12)),
      trialIv = iv.slice();
    trialIv[11] ^= 1; // Guaranteed distinct from the actual frame IV for this key.
    await awaitFresh(() =>
      crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: trialIv,
          additionalData: new TextEncoder().encode('mterm-staging-handoff-crypto-check'),
          tagLength: 128,
        },
        aes,
        new TextEncoder().encode('public-capability-check'),
      ),
    );
    // All selected crypto operations succeed before any credential resource POST.
    if (challenge.mode === 'probe') value = { ...PROBE };
    else {
      ensure(cloudflare && typeof cloudflare.request === 'function', 'API_UNAVAILABLE');
      fresh();
      phase = 'creation';
      createAttempted = true;
      const response = await cloudflare.request({
        method: 'POST',
        path: '/accounts/' + ACCOUNT + '/access/service_tokens',
        body: { name, duration: '30m' },
      });
      // Only a successful response to our own POST establishes a new exact ID.
      // Capture it before validating any other response property or deadline.
      if (response?.success === true && canonical(response.result?.id, UUID)) tokenId = response.result.id;
      value = response?.result;
      fresh();
      ensure(
        tokenId &&
          object(value) &&
          value.name === name &&
          value.duration === '30m' &&
          value.enabled !== false &&
          credential(value),
        'TOKEN_RESPONSE_REJECTED',
      );
      ensure(
        typeof value.created_at === 'string' &&
          value.created_at.length <= 40 &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value.created_at),
        'TOKEN_RESPONSE_REJECTED',
      );
      tokenCreatedAt = Date.parse(value.created_at);
      tokenExpiresAt = tokenCreatedAt + 1800000;
      ensure(
        Number.isSafeInteger(tokenCreatedAt) &&
          tokenCreatedAt <= Date.now() + 5000 &&
          tokenExpiresAt > Date.now() + 450000,
        'TOKEN_RESPONSE_REJECTED',
      );
    }
    phase = 'sealing';
    fresh();
    const header = {
      protocol: challenge.protocol,
      purpose: challenge.purpose,
      mode: challenge.mode,
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM',
      runNonce: challenge.runNonce,
      recipientKeySha256: challenge.recipientKeySha256,
      expiresAt: challenge.expiresAt,
      accountId: challenge.accountId,
      origins: challenge.origins,
      localSourceCommit: challenge.localSourceCommit,
      localBundleSha256: challenge.localBundleSha256,
      receiverSha256: challenge.receiverSha256,
      sealerSha256: challenge.sealerSha256,
      harnessSha256: challenge.harnessSha256,
      expectedDeployedSourceCommit: challenge.expectedDeployedSourceCommit,
      tokenName: challenge.tokenName,
      tokenDuration: challenge.tokenDuration,
      tokenId,
      tokenCreatedAt,
      tokenExpiresAt,
    };
    const protectedText = encode(new TextEncoder().encode(JSON.stringify(header)));
    const plaintext = new TextEncoder().encode(
      JSON.stringify({ client_id: value.client_id, client_secret: value.client_secret }),
    );
    let ciphertext;
    try {
      ciphertext = await awaitFresh(() =>
        crypto.subtle.encrypt(
          { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(protectedText), tagLength: 128 },
          aes,
          plaintext,
        ),
      );
    } finally {
      plaintext.fill(0);
    }
    const frame = JSON.stringify({
      protected: protectedText,
      encryptedKey: encode(encryptedKey),
      iv: encode(iv),
      ciphertext: encode(ciphertext),
    });
    ensure(frame.length <= 16384, 'ENVELOPE_LIMIT');
    fresh();
    return {
      type: 'mterm-staging-handoff-sealed',
      result: 'sealed',
      mode: challenge.mode,
      runNonce,
      frame,
      cleanup: {
        accountId: ACCOUNT,
        tokenId,
        tokenName: name,
        requestedDuration: '30m',
        tokenCreatedAt,
        tokenExpiresAt,
        expiryBasis: tokenId ? 'reported-creation-plus-requested-duration' : 'not-applicable',
        status: tokenId ? 'dedicated-token-active' : 'not-created',
        retrySafe: false,
      },
    };
  } catch (error) {
    let status = createAttempted ? 'creation-outcome-unknown' : 'not-created';
    if (tokenId) {
      status = 'delete-unconfirmed';
      try {
        const removed = await cloudflare.request({
          method: 'DELETE',
          path: '/accounts/' + ACCOUNT + '/access/service_tokens/' + tokenId,
        });
        if (removed?.success === true && removed.result?.id === tokenId) status = 'deleted';
      } catch {
        /* Never return provider exception text or delete another resource. */
      }
    }
    return {
      type: 'mterm-staging-handoff-sealed',
      result: 'failed',
      code: error instanceof SealError ? error.code : phase === 'creation' ? 'CREATE_FAILED' : 'SEAL_FAILED',
      phase,
      cleanup: {
        accountId: ACCOUNT,
        tokenId,
        tokenName: name,
        runNonce,
        status,
        retrySafe: false,
        reconciliationRequired: createAttempted && status !== 'deleted',
      },
    };
  } finally {
    rawKey?.fill(0);
    if (value && typeof value === 'object') {
      value.client_id = '';
      value.client_secret = '';
    }
  }
}
