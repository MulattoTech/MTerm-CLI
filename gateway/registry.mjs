// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-gateway (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-09-poll-capacity; retain queued work until the agent offers delivery capacity.
// Modified: 2026-11-09-grant-expiry; authorize delivery/results at fresh post-read decision boundaries.
// Modified: 2026-11-09-request-ownership; terminal consumption and private cancellation preserve newer RPC leases.
// Modified: 2026-11-09-oauth-expiry; recheck client token and grant expiry after authorization reads.
// Modified: 2026-11-09-pairing-expiry; authorize final pairing decisions after asynchronous checks.
import {
  READ_TOOLS,
  WIRE_VERSION,
  MAX_RESULT_BYTES,
  JOB_TIMEOUT_MS,
  UUID_PATTERN,
} from '../dist/remote/protocol.js';
import {
  HttpError,
  requireValue,
  randomToken,
  sha256,
  constantEqual,
  json,
  body,
  errorResponse,
} from './security.mjs';
const toolNames = new Set(READ_TOOLS.map((t) => t.name));
const now = () => Date.now();
const uuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);
const label = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 80 && !/[\x00-\x1f\x7f]/.test(value);
const cleanDevice = (d) => ({
  id: d.id,
  name: d.name,
  platform: d.platform,
  capabilities: d.capabilities,
  permissions: 'read-only',
  createdAt: d.createdAt,
  lastSeen: d.lastSeen || null,
  status: d.revokedAt
    ? 'revoked'
    : !d.lastSeen
      ? 'offline'
      : now() - d.lastSeen < 15000
        ? 'online'
        : now() - d.lastSeen < 45000
          ? 'reconnecting'
          : 'offline',
});
const toolError = (code) => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({ ok: false, error: { code, message: code.replaceAll('_', ' ').toLowerCase() } }),
    },
  ],
  structuredContent: { ok: false, error: { code } },
  isError: true,
});

/** One private staging registry. Serialized storage transitions make codes, pairing,
 * grants and request delivery single-use across concurrent HTTP requests and restarts.
 * This does not implement filesystem/process logic; the selected agent owns that. */
export class MTermRegistry {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.env = env;
  }
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        requireValue(request.method === 'POST', 405, 'method_not_allowed');
        if ((await this.storage.getAlarm()) === null) await this.storage.setAlarm(now() + 60000);
        const a = await body(request, 320000);
        const result = await this.handle(a.action, a.data || {});
        return json(result);
      } catch (e) {
        return errorResponse(e);
      }
    });
  }
  async rows(prefix, limit = 1000) {
    const live = [];
    let startAfter;
    for (;;) {
      const page = await this.storage.list({ prefix, limit: 256, ...(startAfter ? { startAfter } : {}) });
      for (const [key, value] of page) {
        startAfter = key;
        if (value?.expiresAt && value.expiresAt <= now()) await this.storage.delete(key);
        else live.push(value);
        if (live.length >= limit) return live;
      }
      if (page.size < 256) return live;
    }
  }
  async rate(key, limit = 60, windowMs = 60000) {
    const k = 'rate:' + key,
      previous = await this.storage.get(k);
    const count = previous && previous.expiresAt > now() ? previous.count + 1 : 1;
    requireValue(count <= limit, 429, 'rate_limited');
    await this.storage.put(k, {
      count,
      expiresAt: previous?.expiresAt > now() ? previous.expiresAt : now() + windowMs,
    });
  }
  async audit(userId, record) {
    // No request arguments, file contents, prompts, device secrets, or bearer values.
    const event = { at: new Date().toISOString(), actor: userId, ...record, expiresAt: now() + 7 * 86400000 };
    await this.storage.put('audit:' + userId + ':' + now() + ':' + randomToken(8), event);
    const entries = await this.storage.list({ prefix: 'audit:' + userId + ':', limit: 300 });
    for (const key of [...entries.keys()].slice(0, Math.max(0, entries.size - 128)))
      await this.storage.delete(key);
  }
  async epoch(userId) {
    return (await this.storage.get('epoch:' + userId)) || 0;
  }
  async userDevices(userId) {
    const indices = await this.rows('user-device:' + userId + ':', 21);
    const devices = await Promise.all(indices.map((i) => this.storage.get('device:' + i.id)));
    const epoch = await this.epoch(userId);
    return devices.filter((d) => d && !d.revokedAt && d.epoch === epoch);
  }
  async userGrants(userId) {
    const indices = await this.rows('user-grant:' + userId + ':', 33);
    const grants = await Promise.all(indices.map((i) => this.storage.get('grant:' + i.id)));
    return grants.filter((g) => g && !g.revokedAt && g.expiresAt > now());
  }
  async access(token) {
    const hash = await sha256(token),
      t = await this.storage.get('token:' + hash);
    requireValue(
      t &&
        t.kind === 'access' &&
        t.expiresAt > now() &&
        t.resource === this.env.PUBLIC_ORIGIN + '/mcp' &&
        t.scope === 'mterm:read' &&
        t.epoch === (await this.epoch(t.userId)),
      401,
      'invalid_token',
    );
    const grant = await this.storage.get('grant:' + t.grantId);
    // Epoch and grant reads may cross token expiry; the final decision has no subsequent await.
    const checkedAt = now();
    requireValue(
      grant &&
        !grant.revokedAt &&
        t.expiresAt > checkedAt &&
        grant.expiresAt > checkedAt &&
        grant.userId === t.userId &&
        grant.clientId === t.clientId,
      401,
      'invalid_token',
    );
    return { ...t, tokenHash: hash };
  }
  async device(token, deviceId) {
    requireValue(uuid(deviceId), 400, 'invalid_device');
    const hash = await sha256(token),
      index = await this.storage.get('agent:' + hash);
    requireValue(index, 401, 'invalid_device_token');
    requireValue(index.deviceId === deviceId, 403, 'device_mismatch');
    const d = await this.storage.get('device:' + deviceId);
    requireValue(
      d && !d.revokedAt && d.epoch === (await this.epoch(d.userId)) && constantEqual(d.tokenHash, hash),
      410,
      'device_revoked',
    );
    return d;
  }
  async ownedDevice(userId, deviceId) {
    requireValue(uuid(deviceId), 400, 'invalid_device');
    const d = await this.storage.get('device:' + deviceId);
    requireValue(d && d.userId === userId, 404, 'device_unavailable');
    requireValue(!d.revokedAt && d.epoch === (await this.epoch(d.userId)), 410, 'device_revoked');
    return d;
  }
  async mint(grant) {
    requireValue(grant.epoch === (await this.epoch(grant.userId)), 400, 'invalid_grant');
    const access = randomToken(),
      refresh = randomToken();
    const common = {
      userId: grant.userId,
      clientId: grant.clientId,
      grantId: grant.id,
      epoch: await this.epoch(grant.userId),
      resource: grant.resource,
      scope: 'mterm:read',
    };
    await this.storage.put('token:' + (await sha256(access)), {
      ...common,
      kind: 'access',
      expiresAt: now() + 3600000,
    });
    await this.storage.put('token:' + (await sha256(refresh)), {
      ...common,
      kind: 'refresh',
      expiresAt: grant.expiresAt,
      used: false,
    });
    return {
      access_token: access,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refresh,
      scope: 'mterm:read',
    };
  }
  async finish(job, status, result) {
    job.status = status;
    job.finishedAt = now();
    job.expiresAt = now() + 120000;
    if (['cancelled', 'timeout', 'revoked'].includes(status)) job.abortRequested = true;
    if (result) job.result = result;
    delete job.arguments;
    await this.storage.put('job:' + job.requestId, job);
    await this.audit(job.userId, {
      requestId: job.requestId,
      deviceId: job.deviceId,
      clientId: job.clientId,
      tool: job.tool,
      decision: 'allow-read',
      result: status === 'complete' ? (result?.isError ? 'tool_error' : 'ok') : status,
    });
  }
  async revokeDevice(d) {
    d.revokedAt = now();
    d.expiresAt = now() + 7 * 86400000;
    await this.storage.put('device:' + d.id, d);
    await this.storage.put('agent:' + d.tokenHash, { deviceId: d.id, expiresAt: d.expiresAt });
    await this.storage.delete('user-device:' + d.userId + ':' + d.id);
    for (const job of await this.rows('job:', 256))
      if (job.deviceId === d.id && ['queued', 'delivered', 'complete'].includes(job.status)) {
        delete job.result;
        await this.finish(job, 'revoked');
      }
    await this.audit(d.userId, { deviceId: d.id, decision: 'revoke-device', result: 'revoked' });
  }
  async revokeGrant(g) {
    g.revokedAt = now();
    await this.storage.put('grant:' + g.id, g);
    await this.storage.delete('user-grant:' + g.userId + ':' + g.id);
    for (const job of await this.rows('job:', 256))
      if (job.grantId === g.id && ['queued', 'delivered', 'complete'].includes(job.status)) {
        delete job.result;
        await this.finish(job, 'revoked');
      }
    await this.audit(g.userId, { clientId: g.clientId, decision: 'revoke-grant', result: 'revoked' });
  }
  async handle(action, a) {
    if (action === 'register') {
      await this.rate('register:' + a.ip, 10, 3600000);
      requireValue((await this.rows('client:', 257)).length < 256, 429, 'registration_capacity');
      const p = a.input;
      requireValue(
        Array.isArray(p.redirect_uris) &&
          p.redirect_uris.length > 0 &&
          p.redirect_uris.length <= 4 &&
          (!p.token_endpoint_auth_method || p.token_endpoint_auth_method === 'none'),
      );
      requireValue(
        !p.grant_types ||
          (Array.isArray(p.grant_types) &&
            p.grant_types.every((t) => ['authorization_code', 'refresh_token'].includes(t))),
      );
      requireValue(
        !p.response_types || (Array.isArray(p.response_types) && p.response_types.every((t) => t === 'code')),
      );
      for (const value of p.redirect_uris) {
        requireValue(typeof value === 'string' && value.length <= 2048);
        let u;
        try {
          u = new URL(value);
        } catch {
          throw new HttpError(400, 'invalid_redirect_uri');
        }
        requireValue(
          !u.username &&
            !u.password &&
            !u.hash &&
            (u.protocol === 'https:' ||
              (u.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(u.hostname))),
          400,
          'invalid_redirect_uri',
        );
      }
      requireValue(!p.client_name || label(p.client_name));
      const id = randomToken(24),
        c = {
          id,
          name: p.client_name || 'MCP client',
          redirectUris: [...new Set(p.redirect_uris)],
          expiresAt: now() + 30 * 86400000,
        };
      await this.storage.put('client:' + id, c);
      return {
        client_id: id,
        client_name: c.name,
        redirect_uris: c.redirectUris,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      };
    }
    if (action === 'consent') {
      await this.rate('consent:' + a.identity.userId, 30);
      const p = a.params,
        c = await this.storage.get('client:' + p.client_id);
      requireValue(
        c && c.expiresAt > now() && c.redirectUris.includes(p.redirect_uri),
        400,
        'invalid_client',
      );
      requireValue(
        p.response_type === 'code' &&
          p.scope === 'mterm:read' &&
          p.resource === this.env.PUBLIC_ORIGIN + '/mcp' &&
          p.code_challenge_method === 'S256' &&
          /^[A-Za-z0-9_-]{43}$/.test(p.code_challenge) &&
          typeof p.state === 'string' &&
          p.state.length >= 8 &&
          p.state.length <= 512,
        400,
        'invalid_authorization_request',
      );
      const nonce = randomToken();
      await this.storage.put('consent:' + (await sha256(nonce)), {
        redirect_uri: p.redirect_uri,
        resource: p.resource,
        code_challenge: p.code_challenge,
        state: p.state,
        userId: a.identity.userId,
        clientId: c.id,
        epoch: await this.epoch(a.identity.userId),
        expiresAt: now() + 300000,
      });
      return { nonce, clientName: c.name, redirectOrigin: new URL(p.redirect_uri).origin };
    }
    if (action === 'authorize') {
      const key = 'consent:' + (await sha256(a.consent)),
        c = await this.storage.get(key);
      requireValue(
        c &&
          c.expiresAt > now() &&
          c.userId === a.identity.userId &&
          c.epoch === (await this.epoch(c.userId)),
        400,
        'invalid_consent',
      );
      await this.storage.delete(key);
      const redirect = new URL(c.redirect_uri);
      redirect.searchParams.set('state', c.state);
      if (a.decision !== 'approve') {
        redirect.searchParams.set('error', 'access_denied');
        return { redirect: redirect.href };
      }
      const code = randomToken();
      await this.storage.put('code:' + (await sha256(code)), {
        userId: c.userId,
        clientId: c.clientId,
        epoch: c.epoch,
        redirectUri: c.redirect_uri,
        resource: c.resource,
        challenge: c.code_challenge,
        expiresAt: now() + 60000,
      });
      redirect.searchParams.set('code', code);
      return { redirect: redirect.href };
    }
    if (action === 'token') {
      await this.rate('token:' + a.ip, 60);
      const p = a.params;
      requireValue(p.resource === this.env.PUBLIC_ORIGIN + '/mcp', 400, 'invalid_target');
      if (p.grant_type === 'authorization_code') {
        requireValue(
          typeof p.code === 'string' &&
            p.code.length <= 128 &&
            /^[A-Za-z0-9._~-]{43,128}$/.test(p.code_verifier || ''),
          400,
          'invalid_grant',
        );
        const key = 'code:' + (await sha256(p.code)),
          c = await this.storage.get(key);
        requireValue(
          c &&
            c.expiresAt > now() &&
            c.epoch === (await this.epoch(c.userId)) &&
            c.clientId === p.client_id &&
            c.redirectUri === p.redirect_uri &&
            c.resource === p.resource &&
            constantEqual(c.challenge, await sha256(p.code_verifier, 'base64url')),
          400,
          'invalid_grant',
        );
        requireValue((await this.userGrants(c.userId)).length < 32, 409, 'grant_limit');
        await this.storage.delete(key);
        const g = {
          id: crypto.randomUUID(),
          userId: c.userId,
          clientId: c.clientId,
          epoch: c.epoch,
          resource: c.resource,
          createdAt: now(),
          expiresAt: now() + 7 * 86400000,
        };
        await this.storage.put('grant:' + g.id, g);
        await this.storage.put('user-grant:' + g.userId + ':' + g.id, { id: g.id, expiresAt: g.expiresAt });
        await this.audit(g.userId, { clientId: g.clientId, decision: 'grant-read', result: 'authorized' });
        return this.mint(g);
      }
      requireValue(
        p.grant_type === 'refresh_token' &&
          typeof p.refresh_token === 'string' &&
          p.refresh_token.length <= 128,
        400,
        'unsupported_grant_type',
      );
      const key = 'token:' + (await sha256(p.refresh_token)),
        t = await this.storage.get(key);
      requireValue(
        t &&
          t.kind === 'refresh' &&
          t.clientId === p.client_id &&
          t.resource === p.resource &&
          t.expiresAt > now() &&
          t.epoch === (await this.epoch(t.userId)),
        400,
        'invalid_grant',
      );
      const g = await this.storage.get('grant:' + t.grantId);
      requireValue(g && !g.revokedAt && g.expiresAt > now(), 400, 'invalid_grant');
      await this.rate('refresh:' + g.id, 5);
      if (t.used) {
        await this.revokeGrant(g);
        throw new HttpError(400, 'refresh_replay');
      }
      t.used = true;
      await this.storage.put(key, t);
      return this.mint(g);
    }
    if (action === 'tokenRevoke') {
      requireValue(typeof a.params.token === 'string' && a.params.token.length <= 128);
      const t = await this.storage.get('token:' + (await sha256(a.params.token)));
      if (t && t.clientId === a.params.client_id) {
        const g = await this.storage.get('grant:' + t.grantId);
        if (g) await this.revokeGrant(g);
      }
      return { revoked: true };
    }
    if (action === 'access') {
      const t = await this.access(a.token);
      return { userId: t.userId, clientId: t.clientId, scope: t.scope };
    }
    if (action === 'pairStart') {
      await this.rate('pair:' + a.ip, 10);
      requireValue((await this.rows('pair:', 129)).length < 128, 429, 'pairing_capacity');
      const p = a.input;
      requireValue(
        label(p.name) &&
          ['win32', 'linux', 'darwin'].includes(p.platform) &&
          Array.isArray(p.capabilities) &&
          p.capabilities.length > 0 &&
          p.capabilities.length <= READ_TOOLS.length &&
          p.capabilities.every((n) => toolNames.has(n)),
      );
      const pairId = crypto.randomUUID(),
        deviceCode = randomToken(),
        userCode = randomToken(6).toUpperCase();
      const expiresAt = now() + 300000;
      await this.storage.put('pair:' + pairId, {
        pairId,
        deviceCodeHash: await sha256(deviceCode),
        userCodeHash: await sha256(userCode),
        name: p.name,
        platform: p.platform,
        capabilities: [...new Set(p.capabilities)],
        expiresAt,
      });
      return {
        pairId,
        deviceCode,
        userCode,
        verificationUri: this.env.DASHBOARD_ORIGIN + '/pair?pair=' + pairId,
        expiresAt,
        pollIntervalMs: 2000,
      };
    }
    if (action === 'pairApprove') {
      await this.rate('pair-approve:' + a.identity.userId, 10);
      requireValue(
        uuid(a.input.pairId) && typeof a.input.userCode === 'string' && a.input.userCode.length <= 16,
      );
      const p = await this.storage.get('pair:' + a.input.pairId);
      requireValue(
        p &&
          p.expiresAt > now() &&
          !p.userId &&
          constantEqual(p.userCodeHash, await sha256(a.input.userCode.trim().toUpperCase())),
        400,
        'invalid_pairing',
      );
      requireValue((await this.userDevices(a.identity.userId)).length < 20, 409, 'device_limit');
      p.userId = a.identity.userId;
      p.epoch = await this.epoch(p.userId);
      requireValue(p.expiresAt > now(), 400, 'invalid_pairing');
      await this.storage.put('pair:' + p.pairId, p);
      return { approved: true };
    }
    if (action === 'pairPoll') {
      requireValue(
        uuid(a.input.pairId) && typeof a.input.deviceCode === 'string' && a.input.deviceCode.length <= 128,
      );
      const p = await this.storage.get('pair:' + a.input.pairId);
      requireValue(p && p.expiresAt > now(), 410, 'pairing_expired');
      requireValue(constantEqual(p.deviceCodeHash, await sha256(a.input.deviceCode)), 403, 'invalid_pairing');
      await this.rate('pair-poll:' + p.pairId, 90);
      if (!p.userId) {
        requireValue(p.expiresAt > now(), 410, 'pairing_expired');
        return { pending: true };
      }
      requireValue(p.epoch === (await this.epoch(p.userId)), 410, 'pairing_revoked');
      requireValue((await this.userDevices(p.userId)).length < 20, 409, 'device_limit');
      const deviceId = crypto.randomUUID(),
        deviceToken = randomToken(),
        hash = await sha256(deviceToken);
      requireValue(p.expiresAt > now(), 410, 'pairing_expired');
      // Consume before creating credentials: a crash may require re-pairing, never replay.
      await this.storage.delete('pair:' + p.pairId);
      await this.storage.put('device:' + deviceId, {
        id: deviceId,
        userId: p.userId,
        epoch: p.epoch,
        name: p.name,
        platform: p.platform,
        capabilities: p.capabilities,
        createdAt: now(),
        tokenHash: hash,
        lastSeen: null,
      });
      await this.storage.put('agent:' + hash, { deviceId });
      await this.storage.put('user-device:' + p.userId + ':' + deviceId, { id: deviceId });
      await this.audit(p.userId, { deviceId, decision: 'pair-read', result: 'paired' });
      return { deviceId, deviceToken };
    }
    if (action === 'agentPoll') {
      requireValue(a.input.version === WIRE_VERSION);
      const availableSlots = Object.hasOwn(a.input, 'availableSlots') ? a.input.availableSlots : 4;
      requireValue(
        Number.isInteger(availableSlots) && availableSlots >= 0 && availableSlots <= 4,
        400,
        'invalid_capacity',
      );
      const d = await this.device(a.token, a.input.deviceId);
      await this.rate('poll:' + d.id, 180);
      d.lastSeen = now();
      await this.storage.put('device:' + d.id, d);
      const requests = [],
        cancelled = [];
      for (const job of await this.rows('job:', 256)) {
        if (job.deviceId !== d.id) continue;
        let checkedAt = now();
        if (['queued', 'delivered'].includes(job.status)) {
          if (job.deadline <= checkedAt) await this.finish(job, 'timeout');
          else {
            const grant = await this.storage.get('grant:' + job.grantId);
            const epoch = await this.epoch(job.userId);
            // Storage awaits may cross either boundary; timeout retains precedence.
            checkedAt = now();
            if (job.deadline <= checkedAt) await this.finish(job, 'timeout');
            else if (!grant || grant.revokedAt || !(grant.expiresAt > checkedAt) || job.epoch !== epoch)
              await this.finish(job, 'revoked');
          }
        }
        if (job.status === 'queued' && requests.length < availableSlots) {
          job.status = 'delivered';
          job.deliveredAt = checkedAt;
          await this.storage.put('job:' + job.requestId, job);
          requests.push({
            version: WIRE_VERSION,
            requestId: job.requestId,
            deviceId: job.deviceId,
            tool: job.tool,
            arguments: job.arguments,
            deadline: job.deadline,
          });
        } else if (job.abortRequested) cancelled.push(job.requestId);
      }
      return { requests, cancelled: cancelled.slice(0, 64), pollAfterMs: 2000 };
    }
    if (action === 'agentResult') {
      const frame = a.input;
      requireValue(frame.version === WIRE_VERSION && uuid(frame.requestId));
      const d = await this.device(a.token, frame.deviceId),
        job = await this.storage.get('job:' + frame.requestId);
      requireValue(job && job.deviceId === d.id && job.status === 'delivered', 409, 'request_not_pending');
      requireValue(job.deadline > now(), 410, 'request_expired');
      const grant = await this.storage.get('grant:' + job.grantId);
      const epoch = await this.epoch(job.userId);
      const checkedAt = now();
      requireValue(job.deadline > checkedAt, 410, 'request_expired');
      if (!grant || grant.revokedAt || !(grant.expiresAt > checkedAt) || job.epoch !== epoch) {
        await this.finish(job, 'revoked');
        throw new HttpError(410, 'request_revoked');
      }
      const r = frame.result;
      requireValue(
        r &&
          typeof r.isError === 'boolean' &&
          Array.isArray(r.content) &&
          r.content.length <= 8 &&
          r.content.every((c) => c && c.type === 'text' && typeof c.text === 'string') &&
          r.structuredContent &&
          typeof r.structuredContent === 'object' &&
          !Array.isArray(r.structuredContent),
        400,
        'invalid_result',
      );
      requireValue(
        new TextEncoder().encode(JSON.stringify(r)).length <= MAX_RESULT_BYTES,
        413,
        'result_too_large',
      );
      await this.finish(job, 'complete', r);
      return { accepted: true };
    }
    if (action === 'agentRevoke') {
      const d = await this.device(a.token, a.input.deviceId);
      await this.revokeDevice(d);
      return { revoked: true };
    }
    if (action === 'listDevices') {
      const t = await this.access(a.token);
      return { devices: (await this.userDevices(t.userId)).map(cleanDevice) };
    }
    if (action === 'enqueue') {
      const t = await this.access(a.token);
      await this.rate('tools:' + t.userId, 120);
      requireValue(toolNames.has(a.tool), 403, 'tool_disabled');
      const d = await this.ownedDevice(t.userId, a.deviceId);
      requireValue(d.capabilities.includes(a.tool), 403, 'tool_unavailable');
      requireValue(d.lastSeen && now() - d.lastSeen < 15000, 409, 'device_offline');
      const existing = await this.rows('job:', 256);
      requireValue(
        existing.length < 200 &&
          existing.filter(
            (j) => j.deviceId === d.id && ['queued', 'delivered', 'complete'].includes(j.status),
          ).length < 4,
        429,
        'device_busy',
      );
      const rpcKey = 'active:' + t.tokenHash + ':' + (await sha256(JSON.stringify(a.rpcId)));
      const active = await this.storage.get(rpcKey);
      requireValue(!active || active.expiresAt <= now(), 409, 'request_in_progress');
      const requestId = crypto.randomUUID(),
        deadline = now() + JOB_TIMEOUT_MS;
      const job = {
        requestId,
        deviceId: d.id,
        userId: t.userId,
        clientId: t.clientId,
        grantId: t.grantId,
        epoch: t.epoch,
        tool: a.tool,
        arguments: a.arguments,
        deadline,
        status: 'queued',
        rpcKey,
        expiresAt: deadline + 120000,
      };
      await this.storage.put('job:' + requestId, job);
      await this.storage.put(rpcKey, { requestId, expiresAt: deadline + 1000 });
      await this.audit(t.userId, {
        requestId,
        deviceId: d.id,
        clientId: t.clientId,
        tool: a.tool,
        decision: 'allow-read',
        result: 'queued',
      });
      return { requestId, deadline };
    }
    if (action === 'jobResult') {
      const t = await this.access(a.token),
        job = await this.storage.get('job:' + a.requestId);
      requireValue(
        job && job.userId === t.userId && job.clientId === t.clientId && job.grantId === t.grantId,
        404,
        'request_unavailable',
      );
      await this.ownedDevice(t.userId, job.deviceId);
      requireValue(job.status !== 'consumed', 409, 'result_already_consumed');
      if (['queued', 'delivered'].includes(job.status) && job.deadline <= now())
        await this.finish(job, 'timeout');
      if (['queued', 'delivered'].includes(job.status)) return { pending: true };
      const result = job.status === 'complete' ? job.result : toolError('REMOTE_' + job.status.toUpperCase());
      requireValue(result, 409, 'result_already_consumed');
      delete job.result;
      job.status = 'consumed';
      await this.storage.put('job:' + job.requestId, job);
      const active = await this.storage.get(job.rpcKey);
      if (active?.requestId === job.requestId) await this.storage.delete(job.rpcKey);
      return { result };
    }
    if (action === 'cancel') {
      const t = await this.access(a.token);
      const hasExpected = Object.hasOwn(a, 'expectedRequestId');
      requireValue(!hasExpected || uuid(a.expectedRequestId), 400, 'invalid_request');
      const rpcKey = 'active:' + t.tokenHash + ':' + (await sha256(JSON.stringify(a.rpcId)));
      const entry = await this.storage.get(rpcKey);
      if (hasExpected && entry?.requestId !== a.expectedRequestId) return { cancelled: true };
      const job = entry && (await this.storage.get('job:' + entry.requestId));
      if (job && job.userId === t.userId && ['queued', 'delivered'].includes(job.status))
        await this.finish(job, 'cancelled');
      return { cancelled: true };
    }
    if (action === 'dashboard') {
      const userId = a.identity.userId;
      const devices = (await this.userDevices(userId)).map(cleanDevice);
      const grants = (await this.userGrants(userId)).map((g) => ({
        id: g.id,
        clientId: g.clientId,
        createdAt: g.createdAt,
        expiresAt: g.expiresAt,
        scope: 'mterm:read',
      }));
      const sessions = (await this.rows('job:', 256))
        .filter((j) => j.userId === userId && ['queued', 'delivered'].includes(j.status))
        .map((j) => ({
          requestId: j.requestId,
          deviceId: j.deviceId,
          tool: j.tool,
          deadline: j.deadline,
          status: j.status,
        }));
      const audit = (await this.rows('audit:' + userId + ':', 128)).reverse().map(({ expiresAt, ...e }) => e);
      return {
        authenticated: true,
        identityKind: a.identity.kind,
        devices,
        grants,
        sessions,
        audit,
        mcpUrl: this.env.PUBLIC_ORIGIN + '/mcp',
        permissions: { read: true, write: false, execute: false },
        build: this.env.BUILD_SHA || 'unknown',
      };
    }
    if (action === 'deviceRevoke') {
      const d = await this.ownedDevice(a.identity.userId, a.input.deviceId);
      await this.revokeDevice(d);
      return { revoked: true };
    }
    if (action === 'revokeAll') {
      const userId = a.identity.userId,
        devices = await this.userDevices(userId),
        grants = await this.userGrants(userId);
      await this.storage.put('epoch:' + userId, (await this.epoch(userId)) + 1);
      for (const d of devices) await this.revokeDevice(d);
      for (const g of grants) await this.revokeGrant(g);
      return { revoked: true };
    }
    if (action === 'grantRevoke') {
      requireValue(uuid(a.input.grantId));
      const g = await this.storage.get('grant:' + a.input.grantId);
      requireValue(g && g.userId === a.identity.userId, 404, 'grant_unavailable');
      await this.revokeGrant(g);
      return { revoked: true };
    }
    if (action === 'requestCancel') {
      requireValue(uuid(a.input.requestId));
      const job = await this.storage.get('job:' + a.input.requestId);
      requireValue(job && job.userId === a.identity.userId, 404, 'request_unavailable');
      if (['queued', 'delivered'].includes(job.status)) await this.finish(job, 'cancelled');
      return { cancelled: true };
    }
    throw new HttpError(404, 'not_found');
  }
  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      let startAfter = await this.storage.get('cleanup-cursor'),
        more = false;
      for (let page = 0; page < 8; page++) {
        const entries = await this.storage.list({ limit: 256, ...(startAfter ? { startAfter } : {}) });
        for (const [key, value] of entries) {
          startAfter = key;
          if (value?.expiresAt && value.expiresAt <= now()) await this.storage.delete(key);
        }
        more = entries.size === 256;
        if (!more) break;
      }
      if (more) await this.storage.put('cleanup-cursor', startAfter);
      else await this.storage.delete('cleanup-cursor');
      await this.storage.setAlarm(now() + (more ? 1000 : 60000));
    });
  }
}
