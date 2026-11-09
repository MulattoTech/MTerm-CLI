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

// AI-Change: 2026-11-09-staging-recovery (OpenAI / GPT-6 Astra Pro; self-reported)
// These separate exports are deliberately self-contained: each is copied alone
// into a reviewed Cloudflare execution. Neither can delete a retained resource.
export async function bootstrapStagingRecovery(publicCreationNonce, cloudflare, selectedAccountId) {
  const ACCOUNT = '9e18ebcb3c1a920c9ef58a3d61b8d6b6';
  const STAGING = {
    issuer: 'https://broken-breeze-d0bb.cloudflareaccess.com',
    audience: '9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563',
    registryNamespaceId: 'b66edc2d536e474093e1a18d0e88a24d',
    registryClassName: 'MTermRegistry',
  };
  const startWall = Date.now(),
    startMono = performance.now();
  const operations = { create: { attempted: false, acknowledged: false } };
  let tokenId = null,
    tokenName = null,
    creationRunNonce = null,
    value,
    clientId;
  class BootstrapError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  const ensure = (condition, code) => {
    if (!condition) throw new BootstrapError(code);
  };
  const fresh = () =>
    ensure(Date.now() < startWall + 30000 && performance.now() < startMono + 30000, 'BOOTSTRAP_EXPIRED');
  const uuid = (v) =>
    typeof v === 'string' &&
    v.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
  const client = (v) => typeof v === 'string' && v.length <= 263 && /^[A-Za-z0-9_-]{8,256}\.access$/.test(v);
  const timestamp = (v) => {
    ensure(
      typeof v === 'string' &&
        v.length <= 40 &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v),
      'TOKEN_RESPONSE_REJECTED',
    );
    const time = Date.parse(v);
    ensure(
      Number.isSafeInteger(time) && new Date(time).toISOString().slice(0, 19) === v.slice(0, 19),
      'TOKEN_RESPONSE_REJECTED',
    );
    return time;
  };
  const cleanup = () => ({
    accountId: ACCOUNT,
    tokenId,
    tokenName,
    creationRunNonce,
    status: tokenId ? 'retained' : operations.create.attempted ? 'creation-outcome-unknown' : 'not-created',
    retrySafe: false,
    reconciliationRequired: operations.create.attempted,
  });
  try {
    ensure(
      selectedAccountId === ACCOUNT &&
        typeof publicCreationNonce === 'string' &&
        publicCreationNonce.length === 32 &&
        /^[0-9a-f]{32}$/.test(publicCreationNonce),
      'SELECTION_REJECTED',
    );
    ensure(cloudflare && typeof cloudflare.request === 'function', 'API_UNAVAILABLE');
    creationRunNonce = publicCreationNonce;
    tokenName = 'mterm-staging-handoff-' + creationRunNonce;
    fresh();
    operations.create.attempted = true;
    const created = await cloudflare.request({
      method: 'POST',
      path: '/accounts/' + ACCOUNT + '/access/service_tokens',
      body: { name: tokenName, duration: '30m' },
    });
    // Record acknowledged creation and its exact UUID before any late decision.
    operations.create.acknowledged = created?.success === true;
    if (operations.create.acknowledged && uuid(created.result?.id)) tokenId = created.result.id;
    value = created?.result;
    const validCredentials =
      client(value?.client_id) &&
      typeof value?.client_secret === 'string' &&
      value.client_secret.length <= 1024 &&
      /^[A-Za-z0-9_-]{16,1024}$/.test(value.client_secret);
    clientId = validCredentials ? value.client_id : undefined;
    if (value && typeof value === 'object') value.client_secret = '';
    fresh();
    ensure(
      operations.create.acknowledged && tokenId && value?.name === tokenName && validCredentials,
      'TOKEN_RESPONSE_REJECTED',
    );
    fresh();
    const observed = await cloudflare.request({
      method: 'GET',
      path: '/accounts/' + ACCOUNT + '/access/service_tokens/' + tokenId,
    });
    fresh();
    const token = observed?.result;
    ensure(
      observed?.success === true &&
        token?.id === tokenId &&
        token.name === tokenName &&
        token.client_id === clientId &&
        token.enabled === true,
      'TOKEN_RESPONSE_REJECTED',
    );
    const createdAt = timestamp(token.created_at),
      expiresAt = timestamp(token.expires_at);
    ensure(
      createdAt <= Date.now() + 5000 &&
        expiresAt > createdAt &&
        expiresAt - Date.now() > 600000 &&
        expiresAt - Date.now() <= 1805000,
      'TOKEN_LIFETIME_REJECTED',
    );
    const ownership = {
      tokenId,
      tokenName,
      creationRunNonce,
      originalCreatedAt: token.created_at,
      originalExpiresAt: token.expires_at,
      staging: STAGING,
    };
    fresh();
    return {
      type: 'mterm-staging-recovery-bootstrap',
      result: 'created',
      ownership,
      operations,
      cleanup: cleanup(),
      liveAcceptance: false,
    };
  } catch (error) {
    return {
      type: 'mterm-staging-recovery-bootstrap',
      result: 'failed',
      code: error instanceof BootstrapError ? error.code : 'BOOTSTRAP_FAILED',
      operations,
      cleanup: cleanup(),
      liveAcceptance: false,
    };
  } finally {
    clientId = undefined;
    if (value && typeof value === 'object') {
      value.client_id = '';
      value.client_secret = '';
    }
  }
}

export async function sealOwnedStagingHandoff(input, cloudflare, selectedAccountId, reviewed) {
  const ACCOUNT = '9e18ebcb3c1a920c9ef58a3d61b8d6b6';
  const ORIGINS = ['https://mcp-staging.m-techlabs.com', 'https://mterm-staging.m-techlabs.com'];
  const HARNESS = '208ac5b3296ae8c55986db8e947ec92c7bd678f0c045cf37014b2910ec7c811e';
  const STAGING = {
    issuer: 'https://broken-breeze-d0bb.cloudflareaccess.com',
    audience: '9533396534dbc90c78bae02791ecdd0fab21f775876ed7164ed3b57bf54e1563',
    registryNamespaceId: 'b66edc2d536e474093e1a18d0e88a24d',
    registryClassName: 'MTermRegistry',
  };
  const expectedKeys = [
    'mode',
    'localSourceCommit',
    'localBundleSha256',
    'receiverSha256',
    'sealerSha256',
    'harnessSha256',
    'expectedDeployedSourceCommit',
    'ownership',
    'renewal',
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
    'ownership',
    'renewal',
    'publicKey',
  ];
  const operations = {
    renew: { attempted: false, acknowledged: false },
    rotate: { attempted: false, acknowledged: false },
  };
  const startMono = performance.now();
  let challenge,
    endMono,
    ownership,
    rawKey,
    value,
    selector,
    expiry,
    observedAt,
    observedMono,
    phase = 'validation';
  class OwnedSealError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }
  const ensure = (condition, code) => {
    if (!condition) throw new OwnedSealError(code);
  };
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const hex = (v, n) => typeof v === 'string' && v.length === n && /^[0-9a-f]+$/.test(v);
  const uuid = (v) =>
    typeof v === 'string' &&
    v.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
  const client = (v) => typeof v === 'string' && v.length <= 263 && /^[A-Za-z0-9_-]{8,256}\.access$/.test(v);
  const exactKeys = (v, keys) => object(v) && JSON.stringify(Object.keys(v)) === JSON.stringify(keys);
  const timestamp = (v) => {
    ensure(
      typeof v === 'string' &&
        v.length <= 40 &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v),
      'TOKEN_RESPONSE_REJECTED',
    );
    const time = Date.parse(v);
    ensure(
      Number.isSafeInteger(time) && new Date(time).toISOString().slice(0, 19) === v.slice(0, 19),
      'TOKEN_RESPONSE_REJECTED',
    );
    return time;
  };
  const fresh = () =>
    ensure(challenge && Date.now() < challenge.expiresAt && performance.now() < endMono, 'HANDOFF_EXPIRED');
  const awaitFresh = async (action) => {
    fresh();
    const answer = await action();
    fresh();
    return answer;
  };
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
    const raw = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
    const output = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    ensure(output.length <= maximum && encode(output) === text, 'CHALLENGE_REJECTED');
    return output;
  };
  const request = async (method, path, body, mutation) => {
    fresh();
    if (mutation) operations[mutation].attempted = true;
    const response = await cloudflare.request({ method, path, ...(body === undefined ? {} : { body }) });
    // Acknowledgement is the API success flag, distinct from subsequent identity
    // validation. Preserve it even when an awaited request crosses the deadline.
    if (mutation) operations[mutation].acknowledged = response?.success === true;
    fresh();
    ensure(response?.success === true && object(response.result), 'PROVIDER_RESPONSE_REJECTED');
    return response.result;
  };
  const bindings = (items) => {
    ensure(Array.isArray(items) && items.length <= 256, 'STAGING_CONTEXT_REJECTED');
    const plain = {
      ACCESS_ISSUER: STAGING.issuer,
      ACCESS_AUDIENCE: STAGING.audience,
      BUILD_SHA: challenge.expectedDeployedSourceCommit,
      ENVIRONMENT: 'staging',
      MCP_ENABLED: 'true',
      PUBLIC_ORIGIN: ORIGINS[0],
      DASHBOARD_ORIGIN: ORIGINS[1],
    };
    const one = (name) => {
      const found = items.filter((v) => object(v) && v.name === name);
      ensure(found.length === 1, 'STAGING_CONTEXT_REJECTED');
      return found[0];
    };
    for (const [name, text] of Object.entries(plain)) {
      const entry = one(name);
      ensure(entry.type === 'plain_text' && entry.text === text, 'STAGING_CONTEXT_REJECTED');
    }
    const registry = one('REGISTRY');
    ensure(
      registry.type === 'durable_object_namespace' &&
        registry.namespace_id === STAGING.registryNamespaceId &&
        registry.class_name === STAGING.registryClassName &&
        !Object.hasOwn(registry, 'script_name') &&
        !Object.hasOwn(registry, 'environment'),
      'STAGING_CONTEXT_REJECTED',
    );
    const service = one('STAGING_SERVICE_ID');
    ensure(service.type === 'plain_text' && client(service.text), 'STAGING_CONTEXT_REJECTED');
    return service.text;
  };
  const context = async () => {
    const worker = '/accounts/' + ACCOUNT + '/workers/scripts/mterm-gateway-staging';
    const latest = bindings((await request('GET', worker + '/settings')).bindings);
    const deployment = await request('GET', worker + '/deployments');
    ensure(
      Array.isArray(deployment.deployments) &&
        deployment.deployments.length > 0 &&
        deployment.deployments[0]?.strategy === 'percentage',
      'STAGING_CONTEXT_REJECTED',
    );
    const versions = deployment.deployments[0]?.versions;
    ensure(
      Array.isArray(versions) &&
        versions.length === 1 &&
        versions[0]?.percentage === 100 &&
        uuid(versions[0].version_id),
      'STAGING_CONTEXT_REJECTED',
    );
    const version = await request('GET', worker + '/versions/' + versions[0].version_id);
    ensure(version.id === versions[0].version_id, 'STAGING_CONTEXT_REJECTED');
    const active = bindings(version.resources?.bindings);
    ensure(latest === active, 'STAGING_CONTEXT_REJECTED');
    return { selector: latest, versionId: version.id };
  };
  const token = (entry) => {
    ensure(
      entry.id === ownership.tokenId &&
        entry.name === ownership.tokenName &&
        entry.client_id === selector &&
        entry.enabled === true,
      'TOKEN_RESPONSE_REJECTED',
    );
    expiry = timestamp(entry.expires_at);
    observedAt = Date.now();
    observedMono = performance.now();
  };
  const lifetime = () =>
    ensure(
      Number.isSafeInteger(expiry) &&
        expiry - Date.now() > 600000 &&
        expiry - Date.now() <= 1805000 &&
        expiry - observedAt - (performance.now() - observedMono) > 600000,
      'TOKEN_LIFETIME_REJECTED',
    );
  const cleanup = () => ({
    accountId: ACCOUNT,
    tokenId: ownership?.tokenId ?? null,
    tokenName: ownership?.tokenName ?? null,
    creationRunNonce: ownership?.creationRunNonce ?? null,
    status: ownership ? 'retained' : 'not-selected',
    retrySafe: false,
    reconciliationRequired: Boolean(ownership),
  });
  try {
    ensure(
      selectedAccountId === ACCOUNT && exactKeys(input, challengeKeys) && exactKeys(reviewed, expectedKeys),
      'SELECTION_REJECTED',
    );
    challenge = JSON.parse(JSON.stringify(input));
    const expected = JSON.parse(JSON.stringify(reviewed));
    ensure(
      challenge.type === 'mterm-staging-handoff-challenge' &&
        challenge.protocol === 2 &&
        challenge.purpose === 'mterm-staging-owned-handoff' &&
        ['cleanup', 'smoke-owned'].includes(challenge.mode),
      'CHALLENGE_REJECTED',
    );
    ensure(
      expectedKeys.every((key) => JSON.stringify(challenge[key]) === JSON.stringify(expected[key])),
      'SELECTION_REJECTED',
    );
    ensure(
      hex(challenge.localSourceCommit, 40) && hex(challenge.expectedDeployedSourceCommit, 40),
      'CHALLENGE_REJECTED',
    );
    for (const key of [
      'localBundleSha256',
      'receiverSha256',
      'sealerSha256',
      'harnessSha256',
      'recipientKeySha256',
    ])
      ensure(hex(challenge[key], 64), 'CHALLENGE_REJECTED');
    ensure(
      challenge.accountId === ACCOUNT &&
        challenge.harnessSha256 === HARNESS &&
        JSON.stringify(challenge.origins) === JSON.stringify(ORIGINS) &&
        hex(challenge.runNonce, 32),
      'CHALLENGE_REJECTED',
    );
    const selected = challenge.ownership;
    ensure(
      exactKeys(selected, [
        'tokenId',
        'tokenName',
        'creationRunNonce',
        'originalCreatedAt',
        'originalExpiresAt',
        'staging',
      ]) &&
        uuid(selected.tokenId) &&
        hex(selected.creationRunNonce, 32) &&
        selected.tokenName === 'mterm-staging-handoff-' + selected.creationRunNonce &&
        selected.creationRunNonce !== challenge.runNonce &&
        JSON.stringify(selected.staging) === JSON.stringify(STAGING) &&
        ['none', '30m-if-needed'].includes(challenge.renewal),
      'OWNERSHIP_REJECTED',
    );
    timestamp(selected.originalCreatedAt);
    timestamp(selected.originalExpiresAt);
    ownership = selected;
    ensure(
      Number.isSafeInteger(challenge.expiresAt) && challenge.expiresAt <= Date.now() + 120000,
      'CHALLENGE_REJECTED',
    );
    endMono = startMono + Math.min(120000, challenge.expiresAt - Date.now());
    fresh();
    ensure(cloudflare && typeof cloudflare.request === 'function', 'API_UNAVAILABLE');
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
    ensure(
      encode(await awaitFresh(() => crypto.subtle.exportKey('spki', recipient))) === challenge.publicKey,
      'CHALLENGE_REJECTED',
    );
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
    trialIv[11] ^= 1;
    await awaitFresh(() =>
      crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: trialIv,
          additionalData: new TextEncoder().encode('mterm-staging-owned-handoff-crypto-check'),
          tagLength: 128,
        },
        aes,
        new TextEncoder().encode('public-capability-check'),
      ),
    );
    phase = 'context';
    const originalContext = await context();
    selector = originalContext.selector;
    const tokenPath = '/accounts/' + ACCOUNT + '/access/service_tokens/' + ownership.tokenId;
    phase = 'observation';
    token(await request('GET', tokenPath));
    if (expiry - Date.now() <= 600000) {
      ensure(challenge.renewal === '30m-if-needed', 'TOKEN_LIFETIME_REJECTED');
      phase = 'renewal';
      const renewed = await request('PUT', tokenPath, { duration: '30m' }, 'renew');
      ensure(renewed.id === ownership.tokenId, 'TOKEN_RESPONSE_REJECTED');
      token(await request('GET', tokenPath));
    }
    lifetime();
    phase = 'rotation';
    value = await request('POST', tokenPath + '/rotate', {}, 'rotate');
    ensure(
      value.id === ownership.tokenId &&
        value.client_id === selector &&
        typeof value.client_secret === 'string' &&
        value.client_secret.length <= 1024 &&
        /^[A-Za-z0-9_-]{16,1024}$/.test(value.client_secret),
      'TOKEN_RESPONSE_REJECTED',
    );
    token(await request('GET', tokenPath));
    lifetime();
    phase = 'context-readback';
    const finalContext = await context();
    ensure(
      finalContext.selector === selector && finalContext.versionId === originalContext.versionId,
      'STAGING_CONTEXT_REJECTED',
    );
    lifetime();
    phase = 'sealing';
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
      ownership,
      renewal: challenge.renewal,
      providerObservedAt: observedAt,
      tokenExpiresAt: expiry,
      renewed: operations.renew.acknowledged,
      rotated: true,
    };
    const protectedText = encode(new TextEncoder().encode(JSON.stringify(header)));
    const plaintext = new TextEncoder().encode(
      JSON.stringify({ client_id: selector, client_secret: value.client_secret }),
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
    lifetime();
    return {
      type: 'mterm-staging-owned-handoff-sealed',
      result: 'sealed',
      mode: challenge.mode,
      runNonce: challenge.runNonce,
      frame,
      operations,
      cleanup: cleanup(),
      liveAcceptance: false,
    };
  } catch (error) {
    return {
      type: 'mterm-staging-owned-handoff-sealed',
      result: 'failed',
      code: error instanceof OwnedSealError ? error.code : 'OWNED_SEAL_FAILED',
      phase,
      operations,
      cleanup: cleanup(),
      liveAcceptance: false,
    };
  } finally {
    rawKey?.fill(0);
    selector = undefined;
    if (value && typeof value === 'object') {
      value.client_id = '';
      value.client_secret = '';
    }
  }
}
