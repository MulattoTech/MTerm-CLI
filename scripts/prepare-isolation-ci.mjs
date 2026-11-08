// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-08-aug005-container-isolation (OpenAI / GPT-6 Astra Pro; self-reported)
// Explicit disposable GitHub-hosted CI preparation, never a product installer or workstation repair.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cgroupfsDaemonConfig, decodeDaemonConfig } from './isolation-ci-config.mjs';
import { createCiCommandRunner } from './isolation-ci-runner.mjs';
const exec = promisify(execFile);
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.platform, 'linux');
assert.equal(process.arch, 'x64');
assert.notEqual(process.getuid(), 0);
assert.doesNotMatch(os.release(), /microsoft|wsl|linuxkit/i);
const release = await fs.readFile('/etc/os-release', 'utf8');
assert.match(release, /^ID=ubuntu$/m);
assert.match(release, /^VERSION_CODENAME=noble$/m);
const root = process.cwd(),
  evidence = path.resolve('artifacts/aug005/ci-evidence'),
  privateRoot = path.resolve('artifacts/aug005/ci-private');
await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(privateRoot, { recursive: true, mode: 0o700 });
const config = path.join(privateRoot, 'docker-config');
await fs.mkdir(config, { mode: 0o700 });
await fs.writeFile(path.join(config, 'config.json'), '{}\n', { mode: 0o600 });
const docker = ['--config', config, '--host', 'unix:///var/run/docker.sock'];
const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  kernel: os.release(),
  runnerImage: process.env.ImageVersion ?? 'unknown',
  runnerOS: process.env.ImageOS ?? 'unknown',
  sourceCommit: process.env.GITHUB_SHA,
  packagePins: [],
  licenses: [],
  runtimeBinaries: [],
  image: null,
  modelCalls: 0,
  runtimeRedistributedWithMTerm: false,
  fullRuntimeImageRedistributionEligible: false,
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = createCiCommandRunner(root, evidence);
async function download(url, file) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true, 'Pinned source unavailable: ' + url);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 0 && bytes.length <= 2097152);
  await fs.writeFile(file, bytes);
  return bytes;
}
try {
  const existing = await run('/usr/bin/docker', [
    ...docker,
    'container',
    'ls',
    '--all',
    '--format',
    '{{.ID}}',
  ]);
  assert.equal(existing.trim(), '', 'Refuse to replace a runtime with pre-existing containers');
  const keyFile = path.join(evidence, 'docker-archive-key.asc');
  const key = await download('https://download.docker.com/linux/ubuntu/gpg', keyFile);
  const gpgHome = path.join(privateRoot, 'gnupg');
  await fs.mkdir(gpgHome, { mode: 0o700 });
  const keyInfo = await run('/usr/bin/gpg', [
    '--homedir',
    gpgHome,
    '--batch',
    '--show-keys',
    '--with-colons',
    keyFile,
  ]);
  const primaryFingerprints = [];
  let keyType;
  for (const line of keyInfo.split('\n')) {
    const fields = line.split(':');
    if (fields[0] === 'pub' || fields[0] === 'sub') keyType = fields[0];
    else if (fields[0] === 'fpr' && keyType === 'pub') {
      primaryFingerprints.push(fields[9]);
      keyType = undefined;
    }
  }
  assert.deepEqual(primaryFingerprints, ['9DC858229FC7DD38854AE2D88D81803C0EBFCD88']);
  const fingerprint = primaryFingerprints[0];
  report.repositoryKey = {
    url: 'https://download.docker.com/linux/ubuntu/gpg',
    fingerprint,
    sha256: sha(key),
  };
  // Public repository metadata must be readable by APT's sandbox user. A new
  // isolated lists directory prevents silent reuse of a runner's stale indexes.
  const aptRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mterm-isolation-apt-'));
  await fs.chmod(aptRoot, 0o755);
  const keyring = path.join(aptRoot, 'docker.gpg');
  await run('/usr/bin/gpg', ['--homedir', gpgHome, '--batch', '--dearmor', '--output', keyring, keyFile]);
  await fs.chmod(keyring, 0o644);
  const sources = path.join(aptRoot, 'docker.list'),
    lists = path.join(aptRoot, 'lists');
  await fs.mkdir(lists);
  await fs.chmod(lists, 0o755);
  assert.deepEqual(await fs.readdir(lists), []);
  await fs.writeFile(
    sources,
    'deb [arch=amd64 signed-by=' + keyring + '] https://download.docker.com/linux/ubuntu noble stable\n',
  );
  await fs.chmod(sources, 0o644);
  await run('/usr/bin/sudo', ['-n', '-u', '_apt', '/usr/bin/test', '-r', keyring]);
  const apt = [
    '-o',
    'Dir::Etc::sourcelist=' + sources,
    '-o',
    'Dir::Etc::sourceparts=-',
    '-o',
    'Dir::State::lists=' + lists,
    '-o',
    'APT::Update::Error-Mode=any',
    '-o',
    'Acquire::AllowInsecureRepositories=false',
    '-o',
    'Acquire::AllowDowngradeToInsecureRepositories=false',
    '-o',
    'APT::Get::AllowUnauthenticated=false',
  ];
  await run('/usr/bin/sudo', ['-n', '/usr/bin/apt-get', ...apt, 'update']);
  const signedPath = path.join(lists, 'download.docker.com_linux_ubuntu_dists_noble_InRelease');
  const signed = await fs.readFile(signedPath);
  await fs.writeFile(path.join(evidence, 'docker-noble-InRelease'), signed);
  const verified = await run('/usr/bin/gpgv', [
    '--homedir',
    gpgHome,
    '--keyring',
    keyring,
    '--status-fd',
    '1',
    signedPath,
  ]);
  const signatures = verified
    .split('\n')
    .filter((line) => line.startsWith('[GNUPG:] VALIDSIG '))
    .map((line) => line.trim().split(/\s+/));
  assert.equal(signatures.length, 1);
  assert.equal(signatures[0].at(-1), fingerprint);
  assert.doesNotMatch(verified, /\[GNUPG:\] (?:REVKEYSIG|EXPKEYSIG|EXPSIG|BADSIG|ERRSIG|NO_PUBKEY) /);
  const indices = (await fs.readdir(lists)).filter((n) =>
    /^download\.docker\.com_linux_ubuntu_dists_noble_stable_binary-amd64_Packages/.test(n),
  );
  assert.equal(indices.length, 1);
  const packages = await run('/usr/lib/apt/apt-helper', ['cat-file', path.join(lists, indices[0])]);
  const releaseSection = signed
    .toString()
    .split('\nSHA256:\n')[1]
    ?.split(/\n[^ ]/)[0];
  assert.ok(releaseSection);
  const packageLine = releaseSection.split('\n').find((l) => / stable\/binary-amd64\/Packages$/.test(l));
  assert.ok(packageLine);
  const [packageDigest, packageBytes] = packageLine.trim().split(/\s+/);
  assert.equal(sha(Buffer.from(packages)), packageDigest);
  assert.equal(Buffer.byteLength(packages), Number(packageBytes));
  await fs.writeFile(path.join(evidence, 'docker-noble-amd64-Packages'), packages);
  report.signedIndex = {
    inReleaseSha256: sha(signed),
    packagesSha256: packageDigest,
    bytes: Number(packageBytes),
    freshIsolatedLists: true,
    signatureVerifiedByApt: true,
    signatureVerifiedByGpgv: true,
    signingKeyFingerprint: signatures[0][2],
    primaryKeyFingerprint: fingerprint,
  };
  const archive = path.join(privateRoot, 'packages');
  await fs.mkdir(archive);
  const pins = [
    ['docker-ce', '5:29.9.3-1~ubuntu.24.04~noble'],
    ['docker-ce-cli', '5:29.9.3-1~ubuntu.24.04~noble'],
    ['containerd.io', '2.4.2-3~ubuntu.24.04~noble'],
  ];
  const debs = [];
  for (const [name, version] of pins) {
    const record = packages
      .split('\n\n')
      .find(
        (s) =>
          s.includes('\nVersion: ' + version + '\n') &&
          (s.startsWith('Package: ' + name + '\n') || s.includes('\nPackage: ' + name + '\n')),
      );
    assert.ok(record, 'Pinned package not present in signed repository metadata');
    const fields = Object.fromEntries(
      record
        .split('\n')
        .filter((l) => /^[A-Za-z0-9-]+: /.test(l))
        .map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 2)]),
    );
    assert.match(fields.SHA256, /^[a-f0-9]{64}$/);
    const basename = path.basename(fields.Filename);
    assert.match(basename, /^[A-Za-z0-9.+:~_-]+\.deb$/);
    const before = new Set(await fs.readdir(archive));
    await run('/usr/bin/apt-get', [...apt, 'download', name + '=' + version], { cwd: archive });
    const added = (await fs.readdir(archive)).filter((n) => !before.has(n));
    assert.equal(added.length, 1);
    assert.ok(added[0].endsWith('.deb'));
    const file = path.join(archive, added[0]),
      bytes = await fs.readFile(file);
    assert.equal(sha(bytes), fields.SHA256);
    assert.equal(bytes.length, Number(fields.Size));
    debs.push(file);
    report.packagePins.push({
      name,
      version,
      filename: fields.Filename,
      downloadedFile: added[0],
      sha256: fields.SHA256,
      bytes: bytes.length,
    });
  }
  const conflicts = [];
  for (const name of [
    'docker.io',
    'docker-doc',
    'docker-compose',
    'podman-docker',
    'containerd',
    'runc',
    'moby-engine',
    'moby-cli',
    'moby-containerd',
    'moby-runc',
  ]) {
    const state = await exec('/usr/bin/dpkg-query', ['-W', '-f=${db:Status-Status}', name]).then(
      (r) => r.stdout,
      () => '',
    );
    if (state === 'installed') conflicts.push(name);
  }
  if (conflicts.length)
    await run('/usr/bin/sudo', ['-n', '/usr/bin/apt-get', ...apt, 'remove', '--yes', ...conflicts]);
  await run('/usr/bin/sudo', [
    '-n',
    '/usr/bin/apt-get',
    ...apt,
    'install',
    '--yes',
    '--no-install-recommends',
    '--allow-downgrades',
    ...debs,
  ]);
  // This mutation is confined to the guarded disposable GitHub runner above.
  // Pinned containerd's own critest.sh documents lost systemd OOM attribution.
  // Qualify an explicit cgroupfs/v2 candidate; do not relax the live OOM gate.
  const daemonDirectory = '/etc/docker',
    daemonFile = path.join(daemonDirectory, 'daemon.json');
  assert.equal(await fs.realpath(daemonDirectory), daemonDirectory);
  const daemonParent = await fs.lstat(daemonDirectory);
  assert.ok(daemonParent.isDirectory() && !daemonParent.isSymbolicLink());
  assert.equal(daemonParent.uid, 0);
  assert.equal(daemonParent.mode & 0o022, 0);
  const daemonStat = await fs.lstat(daemonFile).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (daemonStat) {
    assert.ok(daemonStat.isFile() && !daemonStat.isSymbolicLink());
    assert.equal(daemonStat.nlink, 1);
    assert.equal(daemonStat.uid, 0);
    assert.equal(daemonStat.gid, 0);
    assert.equal(daemonStat.mode & 0o7022, 0);
    assert.ok(daemonStat.size <= 65536);
  }
  const beforeDaemon = daemonStat ? await fs.readFile(daemonFile) : Buffer.from('{}\n');
  const candidateDaemon = cgroupfsDaemonConfig(decodeDaemonConfig(beforeDaemon));
  const candidateFile = path.join(privateRoot, 'daemon-cgroupfs.json');
  await fs.writeFile(path.join(privateRoot, 'daemon-before.json'), beforeDaemon, { mode: 0o600, flag: 'wx' });
  await fs.writeFile(candidateFile, candidateDaemon, { mode: 0o600, flag: 'wx' });
  await run('/usr/bin/dockerd', ['--validate', '--config-file', candidateFile], { retain: false });
  assert.equal(
    (
      await run('/usr/bin/sudo', [
        '-n',
        '/usr/bin/docker',
        ...docker,
        'container',
        'ls',
        '--all',
        '--format',
        '{{.ID}}',
      ])
    ).trim(),
    '',
    'Refuse driver configuration while any container exists',
  );
  const currentDaemon = await fs.lstat(daemonFile).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (daemonStat) {
    assert.ok(currentDaemon?.isFile() && !currentDaemon.isSymbolicLink());
    for (const key of ['dev', 'ino', 'nlink', 'uid', 'gid', 'mode', 'size', 'mtimeMs', 'ctimeMs'])
      assert.equal(currentDaemon[key], daemonStat[key], 'Daemon configuration changed during preparation');
    assert.ok(
      (await fs.readFile(daemonFile)).equals(beforeDaemon),
      'Daemon configuration bytes changed during preparation',
    );
  } else assert.equal(currentDaemon, null);
  const daemonMode = (daemonStat ? daemonStat.mode & 0o777 : 0o644).toString(8);
  await run('/usr/bin/sudo', [
    '-n',
    '/usr/bin/install',
    '-o',
    'root',
    '-g',
    'root',
    '-m',
    daemonMode,
    '--',
    candidateFile,
    daemonFile,
  ]);
  const appliedDaemon = await fs.lstat(daemonFile);
  assert.ok(appliedDaemon.isFile() && !appliedDaemon.isSymbolicLink());
  assert.equal(appliedDaemon.nlink, 1);
  assert.equal(appliedDaemon.uid, 0);
  assert.equal(appliedDaemon.gid, 0);
  assert.equal(appliedDaemon.mode & 0o777, Number.parseInt(daemonMode, 8));
  assert.ok(
    (await fs.readFile(daemonFile)).equals(Buffer.from(candidateDaemon)),
    'Applied daemon configuration bytes differ from the selected candidate',
  );
  report.cgroupDriverConfiguration = {
    scope: 'disposable-github-hosted-runner',
    requiredDriver: 'cgroupfs',
    requiredVersion: '2',
    previousFileExisted: daemonStat !== null,
    beforeSha256: sha(beforeDaemon),
    afterSha256: sha(Buffer.from(candidateDaemon)),
    retainedPrivateBackup: true,
    qualified: false,
    reason:
      'Pinned systemd OOM attribution is unreliable; unchanged actual source and installed gates must qualify this candidate.',
  };
  await run('/usr/bin/sudo', ['-n', '/usr/bin/systemctl', 'restart', 'docker']);
  // A narrow grant to the ordinary ephemeral runner, never chmod666 or a workstation change.
  await run('/usr/bin/sudo', [
    '-n',
    '/usr/bin/setfacl',
    '-m',
    'u:' + process.getuid() + ':rw',
    '/var/run/docker.sock',
  ]);
  for (const [name, expected] of pins)
    assert.equal((await run('/usr/bin/dpkg-query', ['-W', '-f=${Version}', name])).trim(), expected);
  const version = JSON.parse(
    await run('/usr/bin/docker', [...docker, 'version', '--format', '{{json .Server}}']),
  );
  assert.equal(version.Version, '29.9.3');
  assert.equal(version.ApiVersion, '1.56');
  assert.equal(version.Os, 'linux');
  assert.equal(version.Arch, 'amd64');
  assert.match(version.GitCommit, /^[a-f0-9]{7,40}$/);
  assert.ok('70efc0e31da3a115fc87574d1b786fa2b867c346'.startsWith(version.GitCommit));
  const component = (name) => version.Components.find((c) => c.Name === name);
  assert.equal(component('containerd').Version.replace(/^v/, ''), '2.4.2');
  assert.ok(component('containerd').Details.GitCommit.includes('b7a25261e029d68978bbf290df0a62fc819b3c51'));
  assert.equal(component('runc').Version.replace(/^v/, ''), '1.5.2');
  assert.match(component('runc').Details.GitCommit, /29dd3dc2/);
  const rawInfo = JSON.parse(
    await run('/usr/bin/docker', [...docker, 'info', '--format', '{{json .}}'], { retain: false }),
  );
  const info = Object.fromEntries(
    [
      'ServerVersion',
      'OSType',
      'Architecture',
      'KernelVersion',
      'OperatingSystem',
      'Driver',
      'CgroupVersion',
      'CgroupDriver',
      'MemoryLimit',
      'SwapLimit',
      'CpuCfsPeriod',
      'CpuCfsQuota',
      'PidsLimit',
      'SecurityOptions',
      'Runtimes',
      'DefaultRuntime',
    ].map((k) => [k, rawInfo[k]]),
  );
  assert.equal(info.CgroupVersion, '2');
  assert.equal(info.CgroupDriver, 'cgroupfs');
  assert.ok(info.SecurityOptions.includes('name=seccomp,profile=builtin'));
  for (const field of ['MemoryLimit', 'SwapLimit', 'CpuCfsPeriod', 'CpuCfsQuota', 'PidsLimit'])
    assert.equal(info[field], true);
  assert.doesNotMatch(info.KernelVersion, /microsoft|wsl|linuxkit/i);
  assert.doesNotMatch(info.OperatingSystem, /docker desktop/i);
  report.engine = version;
  report.capabilities = info;
  for (const file of [
    '/usr/bin/docker',
    '/usr/bin/dockerd',
    '/usr/bin/containerd',
    '/usr/bin/runc',
    '/usr/bin/containerd-shim-runc-v2',
  ]) {
    const bytes = await fs.readFile(file);
    report.runtimeBinaries.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  const manifest =
    'docker.io/library/node@sha256:c0a93797ee78814ae6d32fcca2561fdbbe423149c3f5389aad32d86e9fd85bd4';
  await run('/usr/bin/docker', [...docker, 'pull', '--platform', 'linux/amd64', manifest]);
  const image = JSON.parse(
    await run('/usr/bin/docker', [...docker, 'image', 'inspect', manifest], { retain: false }),
  )[0];
  const configId = 'sha256:280af3207172947339cc2e8c9d2efac585716fd906af49f57d6fdf0dbb829a73',
    manifestId = 'sha256:c0a93797ee78814ae6d32fcca2561fdbbe423149c3f5389aad32d86e9fd85bd4';
  assert.ok(
    [configId, manifestId].includes(image.Id),
    'Engine image identity must be one of the two fixed representations of this manifest',
  );
  assert.ok(
    image.RepoDigests.some(
      (d) => /^(?:docker\.io\/(?:library\/)?)?node@/.test(d) && d.endsWith('@' + manifestId),
    ),
  );
  assert.equal(image.Os, 'linux');
  assert.equal(image.Architecture, 'amd64');
  assert.equal(image.Config.Volumes ?? null, null);
  const manifestBody = JSON.parse(await run('/usr/bin/docker', [...docker, 'manifest', 'inspect', manifest]));
  assert.equal(manifestBody.config.digest, configId);
  report.image = {
    manifest,
    configId,
    id: image.Id,
    idRepresentation: image.Id === configId ? 'classic-config' : 'containerd-manifest',
    repoDigests: image.RepoDigests,
    os: image.Os,
    architecture: image.Architecture,
    size: image.Size,
    created: image.Created,
    environmentKeys: image.Config.Env.map((v) => v.split('=', 1)[0]),
    fullRedistributionEligible: false,
  };
  const runtimeSources = [
    ['engine', 'moby/moby', '70efc0e31da3a115fc87574d1b786fa2b867c346'],
    ['cli', 'docker/cli', '5457199aa57c45e990c59c89cab5f02b817238d7'],
    ['containerd', 'containerd/containerd', 'b7a25261e029d68978bbf290df0a62fc819b3c51'],
    ['runc', 'opencontainers/runc', '29dd3dc2b13b4123162e5fe132504bb4b15569f1'],
  ];
  for (const [name, repository, commit] of runtimeSources)
    for (const filename of ['LICENSE', 'NOTICE']) {
      assert.match(commit, /^[a-f0-9]{40}$/);
      const url = 'https://raw.githubusercontent.com/' + repository + '/' + commit + '/' + filename;
      const bytes = await download(url, path.join(evidence, name + '-' + filename));
      if (filename === 'LICENSE') assert.match(bytes.toString(), /Apache License/);
      report.licenses.push({
        name,
        repository,
        commit,
        filename,
        url,
        bytes: bytes.length,
        sha256: sha(bytes),
      });
    }
  const recipe =
    'https://raw.githubusercontent.com/nodejs/docker-node/e994dfe115899a82684caa7533380aa7d439aae1/24/bookworm-slim/Dockerfile';
  const recipeBytes = await download(recipe, path.join(evidence, 'node-image-Dockerfile'));
  assert.match(recipeBytes.toString(), /NODE_VERSION=24\.22\.2/);
  report.image.buildRecipe = { url: recipe, sha256: sha(recipeBytes) };
  const environmentFile = process.env.GITHUB_ENV,
    runnerTemp = process.env.RUNNER_TEMP;
  assert.ok(
    environmentFile &&
      runnerTemp &&
      path.isAbsolute(environmentFile) &&
      !path.relative(runnerTemp, environmentFile).startsWith('..'),
  );
  assert.ok(!config.includes('\n') && !config.includes('\r'));
  await fs.appendFile(
    environmentFile,
    'MTERM_ISOLATION_IMAGE_ID=' + image.Id + '\nMTERM_ISOLATION_DOCKER_CONFIG=' + config + '\n',
  );
  report.passed = true;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidence, 'bootstrap.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(
  JSON.stringify({
    passed: report.passed,
    evidence,
    engine: report.engine?.Version,
    image: report.image?.id,
    fullRuntimeImageRedistributionEligible: false,
  }),
);
