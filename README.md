# NSW Election Desk

A mobile-first political drill book for a NSW reporter: people, seats, parliamentary power, electoral geography, numerical judgement and briefing practice. It matures the existing Ruby/D3 application rather than replacing it.

Political knowledge is a **dated approved snapshot**, currently 3 September 2026. Official 2023 results, current members, analyst margins and campaign claims remain separate. Local source monitoring does not imply every political fact has been freshly verified.

## Run locally

Requires Ruby and Node 22 (no application package installation).

```sh
ruby nsw-election-learning-game/src/build.rb
ruby nsw-election-learning-game/src/validate.rb
node --test tests/*.test.cjs
node tests/check-build.cjs
ruby -run -e httpd . -p 8788 -b 127.0.0.1
```

Open `http://127.0.0.1:8788/dist/`. The generated `nsw-election-learning-game/index.html` also works as a portable single file. Browser storage is origin-specific: moving from a local URL to Pages requires exporting/importing progress.

## Study

Settings → Learning selects Beginner (mostly three choices), Standard (four), Hard (related alternatives and numerical ordering/comparison), Expert (recall and estimates), or deterministic Adaptive. Confidence and spacing affect mastery. Easy repetition cannot earn Expert mastery. Numerical feedback reveals the exact value, source basis and date. Editorial/scenario answers are compared with model answers rather than falsely machine-graded.

Maps support D3 wheel, drag, touch gestures and visible zoom/reset controls. Small Sydney districts can be enlarged up to 64×. Locate questions hide seat names and count first-try success. Core facts, eight existing drill decks, profiles, private notes, campaign ledger and reporting kit remain available without AI.

Settings → AI stores an optional Gemini key on that browser only. Exports exclude the key. AI explanations and sourced research never change quiz answers. See [Gemini setup](docs/gemini.md).

## Project layout

- `nsw-election-learning-game/`: preserved application, authored source, approved datasets, vendor library and portable output.
- `docs/`: audit, source/data rules, deployment, learning, refresh and acceptance notes. The original product brief is kept locally and excluded from publication.
- `tests/`: deterministic learning, AI failure and refresh tests; build integrity across all derived questions.
- `.github/workflows/`: validate/deploy and source-review proposals.
- `dist/`: generated Pages-only assets; not committed.
- `AGENTS.md`: instructions for future maintenance.

## Publish and maintain

[GitHub Pages instructions](docs/deployment.md) · [Refresh and validation](docs/refresh-and-validate.md) · [Learning and local data](docs/learning.md) · [Source rules](docs/source-registry.md) · [Acceptance results](docs/acceptance.md)

The refresh workflow checks official sources without Gemini and opens review proposals. Parliament's automated directory access was blocked during testing; complete member snapshots can be proposed with `--input`. It never silently overwrites history or approves a factual change.

No accounts, server, database or hosted AI key are required. Offline caching starts after the first successful HTTPS visit; installation availability depends on the browser. Localhost bypasses service-worker registration while developing.
