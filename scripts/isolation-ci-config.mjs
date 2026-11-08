// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-lifecycle-observation (OpenAI / GPT-6 Astra Pro; self-reported)
// Pure config transformation for the separately guarded disposable CI bootstrap.
const refuse = () => {
  throw new Error('Daemon configuration is malformed, ambiguous or unsupported.');
};
export function decodeDaemonConfig(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 65536) refuse();
  try {
    // Keep a BOM visible so the JSON parser rejects it; never replace invalid bytes.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    refuse();
  }
}
function unambiguousJson(text) {
  const token =
    /"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/y;
  const tokens = [];
  let position = 0;
  while (position < text.length) {
    if (/[ \t\r\n]/.test(text[position])) {
      position++;
      continue;
    }
    token.lastIndex = position;
    const found = token.exec(text);
    if (!found || tokens.length >= 8192) refuse();
    tokens.push(found[0]);
    position = token.lastIndex;
  }
  let cursor = 0;
  const take = () => tokens[cursor++];
  const string = (value) => {
    if (typeof value !== 'string' || !value.startsWith('"')) refuse();
    const decoded = JSON.parse(value);
    if (!decoded.isWellFormed()) refuse();
    return decoded;
  };
  const value = (depth) => {
    if (depth > 32) refuse();
    const next = take();
    if (next === '{') {
      const keys = new Set();
      if (tokens[cursor] === '}') {
        cursor++;
        return;
      }
      while (true) {
        const key = string(take());
        if (keys.has(key)) refuse();
        keys.add(key);
        if (take() !== ':') refuse();
        value(depth + 1);
        const separator = take();
        if (separator === '}') return;
        if (separator !== ',') refuse();
      }
    }
    if (next === '[') {
      if (tokens[cursor] === ']') {
        cursor++;
        return;
      }
      while (true) {
        value(depth + 1);
        const separator = take();
        if (separator === ']') return;
        if (separator !== ',') refuse();
      }
    }
    if (next?.startsWith('"')) {
      string(next);
      return;
    }
    if (['true', 'false', 'null'].includes(next)) return;
    // Refuse lossy or noncanonical numbers before conversion to JavaScript Number.
    if (!next || !/^-?(?:0|[1-9]\d*)$/.test(next) || next === '-0') refuse();
    const integer = BigInt(next);
    if (integer < -9007199254740991n || integer > 9007199254740991n) refuse();
  };
  value(0);
  if (cursor !== tokens.length) refuse();
  return JSON.parse(text);
}
export function cgroupfsDaemonConfig(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) refuse();
  let current;
  try {
    current = unambiguousJson(text);
  } catch {
    refuse();
  }
  if (!current || Array.isArray(current) || typeof current !== 'object') refuse();
  // Docker's decoder accepts case-insensitive struct keys; do not shadow an alias.
  if (Object.keys(current).some((key) => key.toLowerCase() === 'exec-opts' && key !== 'exec-opts')) refuse();
  const options = Object.hasOwn(current, 'exec-opts') ? current['exec-opts'] : [];
  if (!Array.isArray(options) || !options.every((option) => typeof option === 'string')) refuse();
  const drivers = options.filter((option) => /^native\.cgroupdriver(?:=|$)/.test(option));
  if (
    drivers.length > 1 ||
    drivers.some(
      (option) => !['native.cgroupdriver=systemd', 'native.cgroupdriver=cgroupfs'].includes(option),
    )
  )
    refuse();
  const selected = [
    ...options.filter((option) => !/^native\.cgroupdriver(?:=|$)/.test(option)),
    'native.cgroupdriver=cgroupfs',
  ];
  return JSON.stringify({ ...current, 'exec-opts': selected }, null, 2) + '\n';
}
