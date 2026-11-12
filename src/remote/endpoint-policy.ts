// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-12-public-endpoint-inspector (OpenAI / GPT-6 Astra Pro; self-reported)
import { BlockList, isIP } from 'node:net';
import { fail } from '../errors.js';

export interface PublicEndpoint {
  readonly url: string;
  readonly hostname: string;
  readonly port: number;
  readonly path: string;
  readonly family: 0 | 4 | 6;
}

// Reviewed against the IANA special-purpose registries on 2026-11-12.
// Public mode conservatively refuses entire special-purpose allocations, including
// their globally reachable exceptions. Multicast and Azure's platform VIP are
// additional exclusions. This is admission policy, not a routing-table oracle.
const denied4 = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.31.196.0', 24],
  ['192.52.193.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['192.175.48.0', 24],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  denied4.addSubnet(network, prefix, 'ipv4');
denied4.addAddress('168.63.129.16', 'ipv4');

const global6 = new BlockList();
global6.addSubnet('2000::', 3, 'ipv6');
const denied6 = new BlockList();
for (const [network, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['2620:4f:8000::', 48],
  ['3fff::', 20],
] as const)
  denied6.addSubnet(network, prefix, 'ipv6');

export function isPublicEndpointAddress(address: string): boolean {
  // Keep the two families separate: Node's IPv6 mapped-address BlockList rules
  // can also match ordinary IPv4 inputs. Mapped IPv6 is outside the permitted
  // envelope; known IANA transition ranges are denied separately. Arbitrary
  // locally configured translation/routing is outside this address policy.
  if (typeof address !== 'string' || address.includes('%')) return false;
  const family = isIP(address);
  if (family === 4) return !denied4.check(address, 'ipv4');
  if (family === 6) return global6.check(address, 'ipv6') && !denied6.check(address, 'ipv6');
  return false;
}

function invalid(): never {
  fail(
    'ENDPOINT_URL',
    'Use an unambiguous public HTTPS URL with an ASCII hostname and simple MCP path; credentials, queries, fragments and encoded paths are unsupported.',
  );
}

export function admitPublicEndpoint(input: string): Readonly<PublicEndpoint> {
  // Examine the original text before WHATWG URL normalization removes tabs,
  // dot segments, empty delimiters, numeric-address spellings or backslashes.
  if (typeof input !== 'string' || input.length > 2048 || /[^\x21-\x7e]|[\\?#%]/.test(input)) invalid();
  const match = /^https:\/\/([^/]+)(\/.*)?$/i.exec(input);
  if (!match) invalid();
  const authority = match[1]!,
    pathname = match[2] ?? '/';
  if (
    !/^\/[A-Za-z0-9._~/-]*$/.test(pathname) ||
    pathname.includes('//') ||
    pathname.split('/').some((part) => part === '.' || part === '..')
  )
    invalid();
  let hostname: string, rawPort: string | undefined;
  if (authority.startsWith('[')) {
    const literal = /^\[([0-9a-f:.]+)\](?::([0-9]+))?$/i.exec(authority);
    if (!literal || isIP(literal[1]!) !== 6) invalid();
    hostname = literal[1]!;
    rawPort = literal[2];
  } else {
    const host = /^([^:@]+)(?::([0-9]+))?$/.exec(authority);
    if (!host) invalid();
    hostname = host[1]!.toLowerCase();
    rawPort = host[2];
    if (isIP(hostname) !== 4) {
      const labels = hostname.split('.');
      if (
        hostname.length > 253 ||
        labels.length < 2 ||
        labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
        /^[0-9]+$/.test(labels.at(-1)!) ||
        /\.(?:localhost|local|localdomain|internal|home|lan|test|invalid|example|onion|arpa)$/.test(hostname)
      )
        invalid();
    }
  }
  if (rawPort !== undefined && (!/^[1-9][0-9]{0,4}$/.test(rawPort) || Number(rawPort) > 65535)) invalid();
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    invalid();
  }
  const family = isIP(hostname) as 0 | 4 | 6;
  const normalizedHost = parsed.hostname.replace(/^\[|\]$/g, '');
  if ((!family && normalizedHost !== hostname) || parsed.pathname !== pathname) invalid();
  if (family && !isPublicEndpointAddress(normalizedHost)) {
    fail(
      'ENDPOINT_ADDRESS',
      'Public endpoint mode refuses private, local, special-purpose and transition addresses.',
    );
  }
  return Object.freeze({
    url: parsed.href,
    hostname: normalizedHost,
    port: rawPort === undefined ? 443 : Number(rawPort),
    path: pathname,
    family,
  });
}
