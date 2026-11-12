from pathlib import Path
import datetime
import gzip
import hashlib
import json
import re
import subprocess

OUT = Path(__file__).resolve().parent
REPO = OUT.parent / 'MTerm-CLI-Status'
BASE = '55ac8b1f35f657b079c191292219b0ae576d7164'
VALIDATION = 'docs/validation/2026-11-12-remote-status-freshness/'
AI = 'docs/ai/changes/2026-11-12-remote-status-freshness.json'
commands = []

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    command = ['git', *args]
    result = subprocess.run(command, cwd=REPO, capture_output=True, check=True)
    commands.append({'argv': command, 'cwd': str(REPO), 'exitCode': result.returncode,
                     'stdoutBytes': len(result.stdout), 'stdoutSha256': sha(result.stdout),
                     'stderr': result.stderr.decode()})
    return result.stdout

def save_json(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

started = datetime.datetime.now(datetime.timezone.utc).isoformat()
paths = git('diff', '--cached', '--name-only', '-z').decode().strip('\0').split('\0')
assert len(paths) == 51
assert git('diff', '--name-only') == b'', 'Unstaged differences appeared'
staged = {name: git('show', ':' + name) for name in paths}
manifest_before = {name: {'bytes': len(data), 'sha256': sha(data)} for name, data in staged.items()}
save_json('before-index-manifest.json', manifest_before)
assert all((REPO / name).read_bytes() == data for name, data in staged.items())

head, tree, parents = git('show', '--no-patch', '--format=%H%n%T%n%P', 'HEAD').decode().strip().splitlines()
assert head == 'b2b62156bde7d75b2a36b0af0fd677ef1ad514dd'
assert tree == git('rev-parse', BASE + '^{tree}').decode().strip()
assert parents.split() == ['d430ec5e0d7dcefc041df4ab5f80cb32382c5ac3', BASE]

ai = json.loads(staged[AI])
assert ai['files'] == paths, 'AI changed-path inventory differs from the exact staged path list'
frozen = json.loads((OUT.parent / 'status-freshness-review' / 'after-source-hashes.json').read_bytes())
assert ai['reviewed_source_sha256'] == frozen['source_sha256']
assert all(sha(staged[name]) == expected for name, expected in frozen['source_sha256'].items())
assert ai['base_sha'] == BASE and ai['integration_base_sha'] == head
assert all(row['stage_change'] is False for row in ai['roadmap_updates'])

validation_manifest = json.loads(staged[VALIDATION + 'manifest.json'])
members = validation_manifest['files']
assert len(members) == 42
assert {row['path'] for row in members} == {
    name for name in paths if name.startswith(VALIDATION) and name != VALIDATION + 'manifest.json'
}
for row in members:
    data = staged[row['path']]
    assert row['bytes'] == len(data) and row['sha256'] == sha(data), row['path']
assert validation_manifest['reviewedSourceSha256'] == frozen['source_sha256']

producer = OUT.parent / 'status-freshness-review'
producer_files = [p for p in sorted(producer.rglob('*')) if p.is_file()]
assert len(producer_files) == 27
for source in producer_files:
    target = VALIDATION + 'independent-review/' + str(source.relative_to(producer))
    assert staged[target] == source.read_bytes(), target

investigation_receipt = json.loads(staged[VALIDATION + 'independent-investigation/execution-receipt.json'])
investigation_root = Path(investigation_receipt['cwd'])
assert investigation_root == OUT.parent / 'remote-status-future-time-investigation'
investigation_names = ['REPORT.md', 'execution-receipt.json', 'observations.json', 'probe.mjs', 'source-identity.json']
for name in investigation_names:
    assert staged[VALIDATION + 'independent-investigation/' + name] == (investigation_root / name).read_bytes()
assert investigation_receipt['originalSourceSha'] == BASE
assert investigation_receipt['originalSourceOnly'] and not investigation_receipt['fixedSourceTested']
assert investigation_receipt['totals']['futureFalseFreshness'] == 3
assert investigation_receipt['totals']['preservedControls'] == 8

complete = json.loads(staged[VALIDATION + 'complete-check.json'])
archive = staged[VALIDATION + 'check.log.gz']
raw = gzip.decompress(archive)
assert len(archive) == complete['losslessArchive']['bytes'] == 84691
assert sha(archive) == complete['losslessArchive']['sha256']
assert len(raw) == complete['uncompressed']['bytes'] == 759224
assert sha(raw) == complete['uncompressed']['sha256']
log = raw.decode()
summary = {}
for key in ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
    values = re.findall(r'^ℹ ' + key + r' (\d+)$', log, re.M)
    assert len(values) == 1, key
    summary[key] = int(values[0])
    assert summary[key] == complete['summary'][key]
assert summary == {'tests': 1582, 'suites': 0, 'pass': 1543, 'fail': 27, 'cancelled': 0, 'skipped': 12, 'todo': 0}
assert complete['exitCode'] == 1
failure_tail = log.split('✖ failing tests:\n')
assert len(failure_tail) == 2
blocks = re.findall(r'^test at ([^\n]+)\n(.*?)(?=^test at |\Z)', failure_tail[1], re.M | re.S)
assert len(blocks) == 27
failures = []
for location, block in blocks:
    assert location.startswith('tests/isolation.test.mjs:')
    assert 'listen EPERM' in block and "code: 'EPERM'" in block and "syscall: 'listen'" in block
    failures.append({'location': location, 'title': block.splitlines()[0], 'error': 'listen EPERM'})
assert git('show', BASE + ':tests/isolation.test.mjs') == git('show', ':tests/isolation.test.mjs')
save_json('complete-check-inspection.json', {
    'archiveBytes': len(archive), 'archiveSha256': sha(archive),
    'uncompressedBytes': len(raw), 'uncompressedSha256': sha(raw),
    'summary': summary, 'finalFailureBlocks': failures,
    'failingTestSourceUnchangedFromBase': True,
    'testsRerun': False,
})

review = json.loads(staged['docs/roadmap/review.json'])
old_review = json.loads(git('show', BASE + ':docs/roadmap/review.json'))
assert review['catalogFingerprint'] == old_review['catalogFingerprint']
assert review['weightFingerprint'] == old_review['weightFingerprint']
assert set(review['sourceFiles']) == set(old_review['sourceFiles'])
changed_review_members = [name for name, value in review['sourceFiles'].items() if old_review['sourceFiles'][name] != value]
assert set(changed_review_members) == set(frozen['source_sha256'])
for name, expected in review['sourceFiles'].items():
    data = (REPO / name).read_bytes()
    if re.search(r'\.(md|txt|json|mjs|cjs|js|ts|tsx|yaml|yml|toml|ps1|sh|css|html|svg)$', name):
        data = data.decode('utf-8').replace('\r\n', '\n').encode()
    assert sha(data) == expected, name
review_hash = sha((json.dumps(review['sourceFiles'], indent=2) + '\n').encode())
assert review_hash == review['sourceFingerprint'] == complete['sourceFingerprint']
assert git('diff', '--cached', BASE, '--', 'docs/roadmap/progress.json',
           'docs/roadmap/requirements-seed.json', 'docs/roadmap/desktop-commander-parity.json',
           'docs/expansion') == b''

snapshot_paths = [
    'docs/REMOTE_MCP.md', 'docs/HANDOFF.md',
    'docs/engineering-runs/mterm-comprehensive-reconciliation-2026-11-12.md',
    AI, 'docs/roadmap/review.json', VALIDATION + 'README.md',
    VALIDATION + 'complete-check.json', VALIDATION + 'manifest.json', VALIDATION + 'source-inputs.json',
]
for name in snapshot_paths:
    destination = OUT / 'snapshot' / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(staged[name])

paths_after = git('diff', '--cached', '--name-only', '-z').decode().strip('\0').split('\0')
assert paths_after == paths
manifest_after = {}
for name in paths_after:
    data = git('show', ':' + name)
    manifest_after[name] = {'bytes': len(data), 'sha256': sha(data)}
assert manifest_after == manifest_before
whitespace_command = ['git', 'diff', '--cached', '--check']
whitespace = subprocess.run(whitespace_command, cwd=REPO, capture_output=True)
commands.append({'argv': whitespace_command, 'cwd': str(REPO), 'exitCode': whitespace.returncode,
                 'stdoutBytes': len(whitespace.stdout), 'stdoutSha256': sha(whitespace.stdout),
                 'stderr': whitespace.stderr.decode()})
(OUT / 'preserved-evidence-whitespace.log').write_bytes(whitespace.stdout + whitespace.stderr)
diagnostic_paths = sorted({line.split(':', 1)[0] for line in whitespace.stdout.decode().splitlines()
                           if line.startswith('docs/')})
preserved_whitespace_paths = {
    VALIDATION + name for name in [
        'build.log', 'development-build-after.log', 'development-build-before.log', 'red.tap',
        'independent-review/frozen-source.patch', 'independent-review/status-build-after.log',
        'independent-review/status-freshness-red.tap',
    ]
}
assert whitespace.returncode in (0, 2)
assert set(diagnostic_paths) <= preserved_whitespace_paths
assert git('diff', '--cached', '--check', '--', *snapshot_paths, *frozen['source_sha256']) == b''
save_json('after-index-manifest.json', manifest_after)
save_json('commands.json', commands)
result = {
    'startedAt': started,
    'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'head': head, 'headTree': tree, 'orderedParents': parents.split(),
    'baselineTreeEqualsHeadTree': True,
    'stagedFiles': len(paths), 'aiFileInventoryExact': True,
    'validationManifestMembers': len(members), 'allValidationMembersMatchGitIndex': True,
    'unchangedProducerFiles': len(producer_files), 'unchangedInvestigatorFiles': len(investigation_names),
    'sourceApprovalHashesUnchanged': True, 'stagedIndexUnchangedDuringReview': True,
    'roadmapSourceFingerprint': review_hash,
    'roadmapSourceMemberCount': len(review['sourceFiles']),
    'roadmapCatalogAndWeightFingerprintsUnchanged': True,
    'baselineAndAcceptanceDataUnchanged': True,
    'completeCheck': summary, 'finalFailureBlocks': len(failures),
    'fullCheckArchiveVerifiedLossless': True,
    'authoredMetadataAndFrozenSourceWhitespaceCheck': 'PASS',
    'completeStagedWhitespaceCheck': {
        'exitCode': whitespace.returncode,
        'diagnosticPaths': diagnostic_paths,
        'classification': 'Original producer log/patch whitespace retained byte-exact; no normalization requested',
    },
    'testsRerun': False, 'remoteChecksRequeried': False,
    'requiredCorrections': [],
    'verdict': 'APPROVED: bounded metadata/evidence consistency at the recorded prepared index',
    'limits': ['No new source verdict; original frozen approval retained',
               'Parent actual-main, candidate, package/platform and subsequent actual-main gates remain separate',
               'No deployment, provider mutation or whole-feature acceptance'],
}
save_json('results.json', result)
print(json.dumps(result, indent=2))
