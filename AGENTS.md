# NSW Election Desk — agent guide

This is an existing static, mobile-first reporter's political drill book. Preserve its visual language, eight decks, directories, D3 geometry, offline portability and separation of recall, geography, relationships and editorial application. Do not rebuild with a framework without a concrete benefit. Product rules: local-only `docs/product-brief.md` (excluded from public Git history); public editorial rules are in `docs/source-registry.md`, `docs/content-model.md` and `docs/learning.md`. Initial audit: `docs/audit.md`.

## Authored and generated files

- `nsw-election-learning-game/src/app.template.html`: semantic shell only.
- `src/app.js`, `src/styles.css`: application behavior/styles; `src/learning.js`: pure deterministic questions, difficulty, scheduler and migration; `src/gemini.js`: all optional AI HTTP access.
- `src/editorial-content.json`: canonical curriculum `facts` with separate `learning` metadata, source definitions, campaign ledger, reporting kit, scenarios. Derived cards are not canonical facts.
- `src/regions.json`: editorial regions, not official administrative units.
- `data/`: five distinct approved snapshots and provenance manifest. `vendor/`: pinned D3, not authored code.
- Generated: application `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`, and root `dist/`. Edit sources then rebuild. Keep portable index versioned; `dist/` is ignored and built in CI.

## Commands from repository root

```sh
ruby nsw-election-learning-game/src/build.rb
ruby nsw-election-learning-game/src/validate.rb
node --test tests/*.test.cjs
node tests/check-build.cjs
ruby -run -e httpd . -p 8788 -b 127.0.0.1
```

Open `/dist/` for the Pages bundle or `/nsw-election-learning-game/` for the portable build. Ruby standard library and Node 22 suffice. `extract-pendulum.rb` additionally requires Nokogiri, only for manual analyst HTML imports. Build validates source before writing. Critical errors fail. Staleness produces explicit warnings, never a fabricated refresh date.

## Editorial/data rules

Hierarchy A: NSWEC, Parliament, legislation, official statistics. B: accountability bodies and specialist parliamentary research. C: established news and named election analysts. D: parties/candidates/interest groups; these establish that a claim was made, not its truth. See `docs/source-registry.md` and `SOURCES.md`.

Never overwrite official 2023 results with by-elections, current members, analyst margins or candidate fields. Keep historical result → later event → current representation → 2027 candidate → analytical watch assessment separate. No inference from federal divisions or council wards to state districts. Do not assert nominations without official evidence. Do not invent dates, roles, motives, costings, news or verification status. Missing candidate/term information remains missing.

Data changes need sources, as-of/checked dates, verification status and clear context. Candidate schema/status guidance is in `docs/content-model.md`. Preserve IDs. Answer signatures reset current mastery and flag UPDATED without erasing lifetime attempts; changes to generated question presentation alone should not arbitrarily reset factual mastery.

## Local state and Gemini

Preserve `nswElectionDesk.v1` and stable card IDs. JSON migration validates imports, uses a settings allowlist and preserves old progress. Browser localStorage remains sufficient for this small single-user dataset; no account/database/backend. Export includes progress and private notes, excludes separate AI storage. No stored private notes go to Gemini automatically.

`nswElectionDesk.gemini.device` stores the key/model/enabled state on that browser only. Never commit, print, export or put a real key in fixtures, URLs, HTML, Actions, logs or repository secrets. Service sends `x-goog-api-key` only on an explicit AI action. No ordinary gameplay calls AI. Research is temporary and never canonical. See `docs/gemini.md`.

## Deployment and review

GitHub Pages publishes only `dist/`, built and tested on main. PRs validate without deployment. Set Pages source to GitHub Actions. Public source does not include local progress. `.github/workflows/refresh.yml` runs without Gemini and opens a review PR containing source-health/proposal artifacts; it never applies factual changes or auto-merges.

`src/refresh.cjs` monitors official district names/modification metadata. Parliament blocks automated retrieval in the tested environment; no verified member scraper is claimed. `--input` accepts complete normalized official snapshots and produces reviewed proposals, not canonical writes. Review P0 conflicts then P1 changes; replace approved snapshots and rebuild. See `docs/refresh-and-validate.md`. A source modification date alone does not prove changed electoral geometry.

## Required verification

Run all commands above after logic/data changes. Check all 740+ derived cards through build integrity, plus numerical boundaries/ties/tolerances, difficulty, confusion, same-day repeats, content invalidation, imports and AI failure behavior. Browser-test desktop, 430px and 320px: menus, question commitment, every deck, number ordering/estimates, directories/notes, settings/import/export, themes, no overflow. Map: fit/±/wheel/drag/reset, preserved highlight, no drag answers, no tooltip answer leaks, no repeated-tap score inflation. Real iPhone pinch/trackpad and actual-key Gemini checks require real-device/key availability; do not claim simulations prove these. Service worker caching is disabled on localhost for development, enabled on HTTPS deployments; close old tabs to activate updates.

## Environment note

On the original Mac, `/usr/bin/git` cannot run because Apple developer tools are missing. A temporary npm `isomorphic-git` library created the original checkpoint; the repository itself is standard Git. Do not commit temporary tool installs or machine paths. Normal Git works on GitHub Actions and on a Mac with developer tools installed.
