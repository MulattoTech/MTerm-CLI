# Independent verification command

Working directory: `/workspace/scratch/267bdf8cab08/status-freshness-review`.

Only the following environment override is required:
`MTERM_REVIEW_RUNTIME_ROOT=/workspace/scratch/267bdf8cab08/MTerm-CLI-Status`.

```sh
MTERM_REVIEW_RUNTIME_ROOT=/workspace/scratch/267bdf8cab08/MTerm-CLI-Status node --test --test-reporter=tap --test-concurrency=1 /workspace/scratch/267bdf8cab08/status-freshness-review/adversarial-status.test.mjs
```

The actual invocation used the same Node argv and environment override through Python
`subprocess.run`, with `cwd` set as above, captured stdout/stderr, and a 40-second timeout.
It completed with exit code 0. Its exact structured receipt is `adversarial-execution.json`.

Read-only source/runtime verification commands and outputs are recorded in
`inspection-commands.json`. Source/compiled-file SHA-256 checks and baseline diff comparison were
performed using Python `hashlib` and `git diff`. Both the before and after manifests are retained.
Producer RED/GREEN/nearby logs were copied and read, not rerun by this peer. No ordinary full-suite,
package installation, network access, owner-process operation, service change, or model call was
part of this review.
