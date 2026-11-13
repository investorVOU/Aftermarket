# Baseline and review history

The available history starts with `957283d`, a November 9 import of the earlier Claude-generated v0.6 game. The import already contains backend and contract work. It is not an untouched pre-hackathon snapshot, and no earlier authentic commit is available. The island, characters, navigation, phone and original local simulation are disclosed as baseline.

The published review checkpoint `58d2cca` preserves both the original main history and a separate import history. Local ancestor checks confirmed that it includes `1a65fc1` (Render binding/responsive UI) and `b478308` (narrow-screen camera controls). Those fixes must remain in the final main release.

An unauthenticated GitHub API check on November 12 reported:

| Reference | Existing public commit |
|---|---|
| `main` | `b478308` |
| `hackathon/track-09-testnet` | `58d2cca` |
| `baseline-import` tag | `957283d` |
| `hackathon-submission` tag | `586d638` |

The API reported `hackathon/track-09-testnet` as the current default branch. Thus the older context saying main was the default and no tags had been pushed is outdated. The branch API is publicly readable; a web-reader cache miss is not a repository permission failure.

[Existing import](https://github.com/investorVOU/Aftermarket/tree/957283d) · [published checkpoint](https://github.com/investorVOU/Aftermarket/tree/58d2cca) · [existing comparison](https://github.com/investorVOU/Aftermarket/compare/957283d...58d2cca).

The historical submission tag is not the latest release. It will not be moved or recreated. The README links the existing immutable checkpoint rather than pretending an unpublished final tag exists. Movement/UI/documentation publication to main was authorized on November 13; release verification is recorded in `RELEASE_CHECKS.md`.

[Proposed exact commands](PUBLICATION_APPROVAL.md) merge both current branches, preserve history and update main/review atomically without force or a default-branch setting change. An optional new reviewed tag needs explicit approval after checks. No Git tag/remote mutation was performed during this review task.
