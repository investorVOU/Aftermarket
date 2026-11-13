# Publication commands — approval record

These commands were proposed on November 12. The owner authorized publishing to
main on November 13. The publication preserves existing history and tags; actual
results are recorded in `RELEASE_CHECKS.md`. No default-branch setting change or
paid deployment is part of this operation.

Unauthenticated GitHub API inspection on November 12 reported:

- Public repository; default branch: `hackathon/track-09-testnet`.
- Review branch: `58d2cca1d26a5fc1d8f21867d85f37bff3e02126`.
- Main: `b4783084a6e63c5921be7a1173d7dd53bec00f2c`.
- `baseline-import`: `957283d672769fcf265b3e7c16c4df72ae22e8a5`.
- `hackathon-submission`: `586d638b786777c5d4b75012e8746cbcbfa23a5d`.

Thus the supplied context saying main was the default and no tags existed was
outdated. The public branch API returned HTTP 200; a web-reader cache miss is
not evidence of a private or nonexistent branch. Giving main the same reviewed
commit remains a useful compatibility measure.

The prepared publication checkout is based on `58d2cca`, which preserves both
histories and includes the November 9 Render/mobile commits `1a65fc1` and
`b478308`. Apply the complete reviewed change set to that checkout before these
commands; do not commit the separate stale source-workspace history by itself.

## Branches: preserve history and update main and review together

```sh
git diff --check
git add README.md HACKATHON_REQUIREMENTS.md PROJECT_AUDIT.md docs game shared server scripts tests package.json render.yaml
git commit -m "Refine movement, inventory UX and judge documentation"
git fetch origin
git merge --no-edit origin/hackathon/track-09-testnet
git merge --no-edit origin/main
git merge-base --is-ancestor 1a65fc1 HEAD
git merge-base --is-ancestor b478308 HEAD
npm ci
npm run build
npm run lint
npm test
git diff --check
git push --atomic origin HEAD:refs/heads/main HEAD:refs/heads/hackathon/track-09-testnet
```

Stop on any conflict, failed ancestor check or failed validation. Do not resolve
conflicts by discarding either branch wholesale. The atomic, non-force push updates
both branches together or neither. It does not change the GitHub default branch.
Both names will show the same reviewed README and source. A concurrent remote
update makes the push fail safely; fetch/review/merge and validate before retrying.

## Tags: preserve published checkpoints

Do not recreate or move either existing tag. A new immutable reviewed tag is
optional, after branch publication and final checks, with separate explicit approval:

```sh
git tag -a hackathon-reviewed-2026-11-13 HEAD -m "Reviewed Track 9 testnet release"
git push origin refs/tags/hackathon-reviewed-2026-11-13
```

No README link points at this proposed tag before it exists. The current README
uses the existing immutable checkpoint/diff and existing files instead. If final
review happens later, agree a new tag name rather than moving a published tag.

## After Git approval

Render must deploy the approved commit. Keep the custom domain origin configured
as described in `OPERATIONS.md`. Verify the guest entry, rerun the headless check,
and measure the actual deployed candidate before claiming its new UX/performance
on the hosted URL. Mainnet, paid plans, X publication and the hackathon submission
API are outside this proposed approval.
