# Baseline and review plan

The owner supplied a Claude-generated v0.6 Three.js game. Its island, characters,
navigation, phone, local trades, contracts, forestry and agriculture are disclosed
as baseline in PROJECT_AUDIT.md. No authentic pre-window commit or untouched
v0.6 source snapshot is present in the available Git history.

The oldest available commit, `957283d` (November 9), is an import that already
contains backend and contract work. It must not be falsely dated or tagged as
a pre-window commit. We conservatively use it as the comparison baseline, excluding
earlier in-window upgrades from the reviewed diff.

Proposed commands were shown to the owner before local execution:

```sh
git tag baseline-import 957283d
git switch -c hackathon/track-09-testnet
# Commit verified testnet changes locally, then:
git tag hackathon-submission
git diff baseline-import..hackathon-submission
```

The baseline tag and dedicated branch have been created locally in the writable
publication checkout. No history has been rewritten. The submission tag is created
only after final verification. Pushing any branch or tag still requires the owner's
explicit confirmation. The original workspace's `.git` is protected read-only in
this environment; the publication checkout is a clean, secret-scanned copy.

[Existing imported baseline](https://github.com/investorVOU/Aftermarket/tree/957283d).
The intended [review diff](https://github.com/investorVOU/Aftermarket/compare/baseline-import...hackathon-submission)
becomes available after the owner approves publishing those tags. Until then,
review it locally with `git diff baseline-import..hackathon-submission`.
