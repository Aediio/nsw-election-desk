# Refresh and review

Use trusted source → collect → normalize → compare → validate/conflict check → proposed change set → human review → publish → regenerate/reintroduce affected learning cards.

```sh
node nsw-election-learning-game/src/refresh.cjs --output refresh-output
```

This monitors the official Spatial Services district list/modification metadata and Parliament reachability. It needs no Gemini key. It writes `changes.json` and `REVIEW.md`, never canonical data. On the tested run it confirmed 93 district names, flagged two post-snapshot modified records, and reported Parliament HTTP 403. Metadata changes require geometry review; they are not automatically new electoral boundaries.

Parliament has no verified working structured adapter in this implementation because the source blocks this environment. Complete normalized snapshots can still be compared deterministically:

```sh
node nsw-election-learning-game/src/refresh.cjs --input official-members.json --output refresh-output
```

Input shape: `{ "asOf": "YYYY-MM-DD", "source": "https://www.parliament.nsw.gov.au/members-and-electorates", "la": [...], "lc": [...] }`, with existing member schema. Counts, IDs, house and seat joins fail closed. Output contains proposed complete snapshots and per-record adds/updates/closes/reverification. This input is an evidence-supported proposal, not proof that a supplied file is official.

Review the source evidence before replacing current snapshots. Investigate vacancies or unexpected counts. Update corresponding manifest retrieval dates. Update editorial asOf only when the overall stated content date is justified. Maintain historical results separately. Then run the build, validation, tests and browser checks in README. A party change may conflict with the analyst holder; resolve it explicitly with source evidence before a valid build can publish.

The scheduled Actions workflow runs twice weekly, uploads artifacts and creates/updates branch `codex/official-source-review` with a PR. Enable “Allow GitHub Actions to create and approve pull requests” in repository Actions settings if required; approval remains human, and the workflow does not approve or merge. GitHub's default token can create review artifacts but does not automatically trigger all downstream workflows when it authors changes. Human-approved merges to main trigger Pages validation/deployment. Review P0 then P1; stale/unreachable data remains clearly marked.

The original assisted editorial refresh prompt remains in `nsw-election-learning-game/prompts/refresh-game.md`. It supplements this deterministic workflow for political context and analyst data. Never silently rewrite history or treat LLM research as an approved dataset.
