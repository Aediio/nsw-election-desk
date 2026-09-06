# NSW Election Desk

`index.html` is a self-contained, mobile-first study game for the 2027 NSW State election. It embeds the game, data, official electorate geometry and map library in one file, so the finished game does not fetch data while it is being used.

## What is included

- Adaptive flashcards with recall-before-reveal, confidence ratings and spaced review.
- All 93 Legislative Assembly seats, current members and parties.
- Official 2023 winner, final pair, margin, primary vote, enrolment, turnout, informality and candidate results for each seat.
- A current analyst pendulum snapshot, clearly separated from official 2023 figures and labelled as non-forecast analysis.
- An interactive map built from Spatial Services NSW district geometry.
- All current Legislative Assembly and Legislative Council members, portfolios and parliamentary offices.
- Parliament structure, voting mechanics, election-night concepts and newsroom scenarios.
- A dated campaign-promise ledger and recent interstate election comparison module.
- Private per-seat notes, progress export/import and dark mode. Progress stays in the browser on that device.

## Use it

On a computer, open `index.html` in a modern browser. For the most reliable iPhone experience, serve this folder over HTTP or place it on a static web host. From a Mac on the same Wi-Fi network, run this from the game folder:

```sh
ruby -run -e httpd . -p 8787 -b 0.0.0.0
```

Then open `http://YOUR-MAC-IP:8787/` in Safari on the iPhone. Safari can add it to the Home Screen. The Mac must remain awake while it is serving the file. The game itself is self-contained; HTTP is recommended because iOS file previews do not consistently provide full browser storage and JavaScript behaviour.

## Refresh and rebuild

The stable source data lives in `data/`; authored curriculum and source definitions live in `src/editorial-content.json`; reporting regions live in `src/regions.json`.

1. Give `prompts/refresh-game.md` to an LLM with browsing and local file access.
2. Review its source log and changed facts.
3. Run `ruby src/build.rb`.
4. Run `ruby src/validate.rb`.
5. Open `index.html` and test the drill, map, seat directory, people directory and campaign desk at a narrow mobile width.

Card IDs are deliberately stable. Updating the HTML does not erase existing browser progress as long as those IDs and the storage key remain unchanged.

## Data policy

- Official sources take priority for election dates, rules, boundaries, members and results.
- The current pendulum is analysis from The Tally Room, dated 3 September 2026. It is not an official forecast.
- The 15 reporting regions are editorial study groupings, not official regions.
- Watch tiers identify reporting attention from margins, contest type and holder changes. They do not assert campaign intensity or predict a winner.
- Campaign claims are dated, attributed and assigned a status such as “Budget measure” or “Election pitch”. A summary is not an endorsement.
- Candidate fields and campaign-resource claims must not be inferred when no reliable source exists.

## Main files

- `index.html` — finished standalone game.
- `src/app.template.html` — editable application source.
- `src/editorial-content.json` — curriculum, sources, campaign ledger, interstate lens and newsroom scenarios.
- `src/regions.json` — editorial seat-to-region mapping.
- `src/build.rb` — validates joins and compiles the standalone file.
- `src/validate.rb` — integrity and completeness checks.
- `prompts/refresh-game.md` — reusable update prompt.
- `data/` — dated source snapshots and their `manifest.json` provenance record.
- `SOURCES.md` — human-readable source and status log.
- `vendor/d3.v7.9.0.min.js` — pinned map library embedded at build time.

## Matured application (6 September 2026)

See the [root README](../README.md) for the current build/deployment workflow. The original eight decks and reference views remain. Settings now provides five difficulty levels, local Gemini setup, source health and progress transfer. `src/learning.js` implements question choices, numerical tolerance, confusion and difficulty-aware spaced mastery. `src/gemini.js` owns optional AI access. `src/app.js` and `src/styles.css` are authored sources extracted from the original template.

Canonical curriculum lives in `src/editorial-content.json` → `facts` (`statement` plus separate `learning` metadata), not in quiz answers. Build derives 740 cards from curriculum and approved political objects. The generated `index.html` remains portable; root `dist/` is the cacheable GitHub Pages bundle. Do not edit either generated output directly.

Localhost bypasses service-worker caching for development; HTTPS deployments cache core learning after first load. Installability and touch behavior should also be tested on the intended physical iPhone. The deterministic official-source monitor and reviewed member-snapshot proposal tool are documented in [refresh instructions](../docs/refresh-and-validate.md). It does not claim to have automatically refreshed Parliament membership when the directory is blocked.
