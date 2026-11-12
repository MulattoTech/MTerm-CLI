// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
// Real TLS against an owned loopback fixture only. No product address-policy bypass.
import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const runtimeRoot = process.env.MTERM_ENDPOINT_VERIFY_ROOT ?? fileURLToPath(new URL('../', import.meta.url));
const { createEndpointInspectionAgent, inspectPublicEndpoint } = await import(
  pathToFileURL(path.join(runtimeRoot, 'dist/remote/endpoint-probe.js')).href
);

test(
  'actual inspection TLS rejects an untrusted certificate and a wrong host under an ambient disable flag',
  { timeout: 10000 },
  async (t) => {
    const [key, cert] = await Promise.all(
      ['fixture-key.pem', 'fixture-cert.pem'].map((name) =>
        fs.readFile(new URL(`./fixtures/endpoint-tls/${name}`, import.meta.url)),
      ),
    );
    let requests = 0;
    const sockets = new Set();
    const server = https.createServer({ key, cert }, (_request, response) => {
      requests++;
      response.end('owned fixture');
    });
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    server.on('tlsClientError', () => {});
    t.after(async () => {
      for (const socket of sockets) socket.destroy();
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    await assert.rejects(
      inspectPublicEndpoint(`https://127.0.0.1:${port}/mcp`, { check: true }),
      (error) => error.code === 'ENDPOINT_ADDRESS',
    );
    const old = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    t.after(() => {
      if (old === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = old;
    });
    const get = (agent, extra = {}) =>
      new Promise((resolve, reject) => {
        const request = https.request(
          { hostname: '127.0.0.1', port, method: 'GET', agent, ...extra },
          (response) => {
            response.resume();
            response.once('end', () => resolve(response.statusCode));
          },
        );
        request.once('error', reject);
        request.setTimeout(2000, () => request.destroy(new Error('Owned TLS fixture timed out')));
        request.end();
      });
    const control = new https.Agent({ proxyEnv: {}, keepAlive: false, ca: cert, rejectUnauthorized: true });
    t.after(() => control.destroy());
    assert.equal(await get(control), 200, 'The synthetic server and its explicit trust control must work');
    const inspection = createEndpointInspectionAgent();
    t.after(() => inspection.destroy());
    await assert.rejects(get(inspection, { rejectUnauthorized: false }), (error) =>
      [
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      ].includes(error.code),
    );
    const hostnameCheck = createEndpointInspectionAgent();
    t.after(() => hostnameCheck.destroy());
    await assert.rejects(
      get(hostnameCheck, { ca: cert, servername: 'wrong.invalid', rejectUnauthorized: false }),
      (error) => error.code === 'ERR_TLS_CERT_ALTNAME_INVALID',
    );
    assert.equal(requests, 1, 'Only the explicitly trusted control may reach the HTTP handler');
  },
);
