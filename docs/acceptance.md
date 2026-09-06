# Acceptance record — 6 September 2026

## Passed locally

- Original build/validation before refactoring; all eight original decks played, a full Daily 10 completed and original map score exploit reproduced.
- Final Ruby source/build/output validation: 93 districts/results/current Assembly members, 42 Council members, five distinct datasets, 38 authored facts, 7 campaign entries and 8 newsroom scenarios.
- 23 Node tests: difficulty progression, no easy-only mastery, spaced Expert mastery, same-day repetition, confident errors/confusions, numerical tolerance/band boundaries, magnitude/trend/order/comparison/threshold, answer invalidation, validated legacy imports, AI local configuration/header/grounding/errors, offline caching and negative data validation.
- Build integrity exercises 740 derived cards at all four manual difficulties: Beginner/Standard 701 choice + 39 recall; Hard 567 choice + 134 ordering + 39 recall; Expert 604 recall + 136 estimates. No duplicate IDs/options, missing assets/placeholders, syntax errors or key-like secrets in deployment assets.
- Browser: three choices in Beginner, four in Standard/Hard, unaided Expert, assisted Adaptive; commitment before feedback; wrong factual answers cannot earn Got it; Expert numerical feedback includes exact source/date/basis; no-key AI gives a readable fallback.
- Browser map: fit, zoom in/out, reset, mouse-wheel zoom to 13×, drag, no answer during drag, tap after pan, highlight retained through zoom/redraw, quiz names hidden, completed sprint with one deliberate error yields 4/5 first try. Explicit Next prevents rapid repeated scoring.
- 430×932 portrait, verified 1280×900 desktop and verified 320×700 narrow layout. All five main views have no page overflow. Fixed file-input overflow in narrow Settings. Themes, seat/person searches, changed-holder profile, private note save/reopen checked.
- Progress import through real file picker restored a legacy-format test; downloaded export was read back and confirmed to preserve the test card/note while excluding Gemini/API fields.
- Live deterministic source monitor: all 93 official district names matched; later modification metadata for two records was flagged for review. Parliament HTTP 403 was reported explicitly. Canonical datasets remained unchanged.

## Limits / follow-up checks

- Physical iPhone/iPad pinch, physical trackpad behavior and Home Screen installation were not available to this automation. D3 native touch handlers are configured; wheel/drag/keyboard were exercised. Do not equate desktop gestures with a physical touch acceptance pass.
- Gemini requests were tested with mocked responses and no-key browser behavior. A real key was not supplied; live model availability, billing/restrictions and Google Search output require the user's local connection test.
- Offline asset serving is covered by the worker cache test; real-device offline installation should be checked after the first HTTPS visit. Localhost intentionally bypasses registration.
- Parliament membership auto-fetch is blocked and no unverified parser was substituted. The scheduled workflow produces source-health review proposals; normalized complete official snapshots have a deterministic comparison path. It is not a fully automatic political database refresh.
- Candidate statuses and richer temporal objects are specified for future approved records; no unsourced candidate field was invented. The trend exercise is hypothetical, explicitly labelled, because no canonical longitudinal NSW measure was supplied.

GitHub deployment status is recorded in the final delivery message and repository Actions history.
