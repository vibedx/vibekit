---
id: TKT-020
title: Release vibekit with skills.sh support
slug: TKT-020-release-vibekit-with-skills
status: in_progress
priority: high
assignee: "opusaku"
author: ""
created_at: 2026-04-11T11:45:06.237Z
updated_at: 2026-04-11T11:45:54.993Z
---

## Description

Publish a new vibekit release that includes the skills.sh support added in PR #27 (`skills/vibekit/SKILL.md`). The skill file is already in main but users won't see it in their installed vibekit until a new npm version is published.

Bump version to `0.6.0` (minor — new feature) and create a GitHub release so the publish workflow auto-publishes to npm.

## Acceptance Criteria

- [ ] `package.json` version bumped to `0.6.0`
- [ ] PR opened with version bump, merged to main
- [ ] GitHub release `v0.6.0` created with notes
- [ ] Publish workflow succeeds (npm shows `@vibedx/vibekit@0.6.0`)
- [ ] Local install updated: `npm install -g @vibedx/vibekit@0.6.0`
- [ ] `npx skills add vibedx/vibekit` still works end-to-end
- [ ] Notify #project-vibekit on Slack with release notes
- [ ] Default template in this repo includes `assignee`/`author` fields (bug fix — was outdated)

## Implementation Notes

- Release notes should highlight: skills.sh support (`npx skills add vibedx/vibekit`), fixed outdated template in the repo itself
- E2E tests should still pass
- Follow the same release flow as v0.4.0 and v0.5.0: version bump PR → merge → `gh release create`

## Testing & Test Cases

- Verify `npm view @vibedx/vibekit version` returns 0.6.0 after publish
- Verify skill installs from published package via `npx skills add`
- Verify existing E2E and unit tests all pass in CI

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.