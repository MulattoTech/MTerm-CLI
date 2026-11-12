// SPDX-License-Identifier: MIT
// Explicit local state selection for the MTerm pairing/agent protocol.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getEnvironmentName } from '../config.js';
import { fail } from '../errors.js';
const inside = (root, candidate) => {
    const relative = path.relative(root, candidate);
    return (!relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)));
};
function absolute(input) {
    if (!path.isAbsolute(input) || /[\x00-\x1f\x7f]/.test(input))
        fail('REMOTE_STATE', 'Remote state requires an absolute path without control characters.');
    return path.normalize(input);
}
export function validateRemoteProfileName(name) {
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name))
        fail('REMOTE_PROFILE', 'Profile names must be safe lowercase ASCII slugs of at most 48 characters.');
    return name;
}
export function remoteStateBase() {
    return absolute(process.platform === 'win32'
        ? (process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'))
        : (process.env.XDG_STATE_HOME ?? path.join(os.homedir(), '.local', 'state')));
}
function namespace(base, environment) {
    return path.join(base, environment === 'development' ? 'MTerm-CLI-DEV' : 'MTerm-CLI');
}
export function remoteStateLayout(environment) {
    const parent = namespace(remoteStateBase(), environment);
    return {
        namespace: parent,
        defaultDirectory: path.join(parent, 'remote'),
        profilesDirectory: path.join(parent, 'remote-profiles'),
    };
}
export function resolveRemoteTarget(options = {}) {
    if (options.dev && options.environment !== undefined)
        fail('USAGE', 'Choose --dev or --environment, not both.');
    const environment = options.environment ?? (options.dev ? 'development' : getEnvironmentName([]));
    if (!['production', 'development'].includes(environment))
        fail('USAGE', 'Unknown remote environment.');
    if (options.profile !== undefined && options.stateDirectory !== undefined)
        fail('USAGE', 'Choose --profile or --state-dir, not both.');
    const profile = options.profile === undefined ? undefined : validateRemoteProfileName(options.profile);
    const layout = remoteStateLayout(environment);
    return Object.freeze({
        environment,
        selection: options.stateDirectory !== undefined
            ? 'explicit-directory'
            : profile && profile !== 'default'
                ? 'named-profile'
                : 'default',
        ...(options.stateDirectory === undefined ? { profile: profile ?? 'default' } : {}),
        stateDirectory: options.stateDirectory !== undefined
            ? absolute(path.resolve(options.stateDirectory))
            : profile && profile !== 'default'
                ? path.join(layout.profilesDirectory, profile)
                : layout.defaultDirectory,
    });
}
/** Resolve existing ancestors without creating any missing directory. */
export async function prospectiveRealpath(input) {
    const full = absolute(input);
    try {
        return await fs.realpath(full);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
        // A dangling link must not be mistaken for a missing directory to create.
        const existing = await fs.lstat(full).catch((e) => {
            if (e.code !== 'ENOENT')
                throw e;
            return undefined;
        });
        if (existing)
            fail('REMOTE_STATE', 'A remote state ancestor is unresolved or linked.');
        const parent = path.dirname(full);
        if (parent === full)
            throw error;
        return path.join(await prospectiveRealpath(parent), path.basename(full));
    }
}
async function privateDirectory(input, create, allowMissing, privateMode = true) {
    if (create)
        await fs.mkdir(input, { mode: 0o700 }).catch((error) => {
            if (error.code !== 'EEXIST')
                throw error;
        });
    const stat = await fs.lstat(input).catch((error) => {
        if (allowMissing && error.code === 'ENOENT')
            return undefined;
        throw error;
    });
    if (!stat)
        return undefined;
    if (!stat.isDirectory() || stat.isSymbolicLink())
        fail('REMOTE_STATE', 'Remote state must use regular directories without linked managed parents.');
    if (process.platform !== 'win32' &&
        ((stat.mode & (privateMode ? 0o077 : 0o022)) !== 0 || stat.uid !== process.getuid?.()))
        fail('REMOTE_STATE_PERMISSIONS', privateMode
            ? 'Remote state directories require private current-user ownership.'
            : 'Remote state ancestors must be current-user owned and not writable by other users.');
    return stat;
}
export async function admitRemoteStateDirectory(input, environment, create, allowMissing = false) {
    const full = absolute(input);
    if (!['production', 'development'].includes(environment))
        fail('REMOTE_SCOPE', 'Unknown remote environment.');
    const base = remoteStateBase(), canonicalBase = await prospectiveRealpath(base);
    let canonical = await prospectiveRealpath(full);
    let requiresBoundScope = environment === 'development', managed = false;
    const directories = [];
    const inspect = async (directory, mayCreate, privateMode = true) => {
        const stat = await privateDirectory(directory, mayCreate, allowMissing, privateMode);
        if (stat)
            directories.push({
                path: directory,
                canonical: await fs.realpath(directory),
                dev: stat.dev,
                ino: stat.ino,
                mode: stat.mode,
                uid: stat.uid,
            });
    };
    for (const candidateEnvironment of ['production', 'development']) {
        const lexicalNamespace = namespace(base, candidateEnvironment);
        const canonicalNamespace = namespace(canonicalBase, candidateEnvironment);
        const lexical = inside(lexicalNamespace, full);
        if (!lexical && !inside(canonicalNamespace, canonical))
            continue;
        if (candidateEnvironment !== environment)
            fail('REMOTE_SCOPE', 'Selected state belongs to another remote environment.');
        const anchor = lexical ? lexicalNamespace : canonicalNamespace;
        const target = lexical ? full : canonical;
        const relative = path.relative(anchor, target).split(path.sep).filter(Boolean);
        if (!relative.length)
            fail('REMOTE_STATE', 'The managed namespace itself is not a state directory.');
        // Windows case/short-name aliases must not turn a named store into legacy
        // unbound state. Classify canonical membership too, while retaining every
        // lexical managed-component check below so links cannot evade admission.
        const canonicalRelative = inside(canonicalNamespace, canonical)
            ? path.relative(canonicalNamespace, canonical).split(path.sep).filter(Boolean)
            : [];
        const profileRelative = [relative, canonicalRelative].find((parts) => (process.platform === 'win32' ? parts[0]?.toLowerCase() : parts[0]) === 'remote-profiles');
        if (profileRelative) {
            if (profileRelative.length !== 2 || profileRelative[1] === 'default')
                fail('REMOTE_PROFILE', 'Choose one named profile or the separate default slot.');
            validateRemoteProfileName(profileRelative[1]);
            requiresBoundScope = true;
        }
        if (create)
            await fs.mkdir(path.dirname(anchor), { recursive: true, mode: 0o700 });
        let current = anchor;
        await inspect(current, create, false);
        for (const [index, part] of relative.entries()) {
            current = path.join(current, part);
            await inspect(current, create, Boolean(profileRelative) || index === relative.length - 1);
        }
        managed = true;
        break;
    }
    if (!managed) {
        if (create)
            await fs.mkdir(full, { recursive: true, mode: 0o700 });
        await inspect(full, false);
    }
    canonical = await prospectiveRealpath(full);
    return { directory: canonical, environment, requiresBoundScope, directories };
}
export async function assertRemoteStateAdmission(admission) {
    if (!admission.requiresBoundScope)
        return;
    for (const expected of admission.directories) {
        const current = await fs.lstat(expected.path).catch(() => undefined);
        if (!current ||
            !current.isDirectory() ||
            current.isSymbolicLink() ||
            current.dev !== expected.dev ||
            current.ino !== expected.ino ||
            current.mode !== expected.mode ||
            current.uid !== expected.uid ||
            path.relative(expected.canonical, await fs.realpath(expected.path)) !== '')
            fail('REMOTE_STATE', 'The admitted remote state directory or managed parent changed.');
    }
}
export async function assertRemoteRootOutsideState(root, stateDirectory) {
    const base = remoteStateBase();
    const protectedDirectories = await Promise.all([
        prospectiveRealpath(stateDirectory),
        prospectiveRealpath(namespace(base, 'production')),
        prospectiveRealpath(namespace(base, 'development')),
    ]);
    for (const directory of protectedDirectories)
        if (inside(root, directory) || inside(directory, root))
            fail('STATE_IN_ROOT', 'Remote roots cannot overlap selected state or any managed profile namespace.');
}
export function remoteTargetArguments(target) {
    const args = ['--environment', target.environment];
    if (target.selection === 'explicit-directory')
        args.push('--state-dir', target.stateDirectory);
    else
        args.push('--profile', target.profile ?? 'default');
    return args;
}
/** Only public, known runtime fields can enter status/inventory responses. */
export function publicRemoteRuntime(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const raw = value, result = {};
    if (['connecting', 'online', 'reconnecting', 'revoked', 'stopped'].includes(String(raw.state)))
        result.state = raw.state;
    for (const key of ['at', 'startedAt'])
        if (typeof raw[key] === 'string' && raw[key].length <= 40 && Number.isFinite(Date.parse(raw[key])))
            result[key] = raw[key];
    for (const key of ['pid', 'activeRequests'])
        if (Number.isSafeInteger(raw[key]) && raw[key] >= 0)
            result[key] = raw[key];
    return result;
}
/** Names only; never scan arbitrary explicit directories or credential files. */
export async function discoverRemoteTargets(environment) {
    const layout = remoteStateLayout(environment), targets = [];
    let truncated = false, invalidEntries = 0;
    const defaultConfig = await fs
        .lstat(path.join(layout.defaultDirectory, 'config.json'))
        .catch((error) => {
        if (error.code !== 'ENOENT')
            throw error;
        return undefined;
    });
    if (defaultConfig)
        targets.push(resolveRemoteTarget({ environment }));
    // Check the namespace/collection directly. No user-valid profile name may
    // double as an internal probe or control whether other entries can be listed.
    const parent = await privateDirectory(layout.namespace, false, true, false);
    if (!parent)
        return { targets, truncated, invalidEntries };
    const collection = await privateDirectory(layout.profilesDirectory, false, true);
    if (!collection)
        return { targets, truncated, invalidEntries };
    const dir = await fs.opendir(layout.profilesDirectory);
    let visited = 0;
    for await (const entry of dir) {
        if (++visited > 256 || targets.length >= 64) {
            truncated = true;
            break;
        }
        try {
            validateRemoteProfileName(entry.name);
            if (entry.name === 'default' || !entry.isDirectory() || entry.isSymbolicLink())
                throw Error('Unsafe profile');
            targets.push(resolveRemoteTarget({ environment, profile: entry.name }));
        }
        catch {
            invalidEntries++;
        }
    }
    targets.sort((a, b) => (a.profile ?? '').localeCompare(b.profile ?? '', 'en'));
    return { targets, truncated, invalidEntries };
}
