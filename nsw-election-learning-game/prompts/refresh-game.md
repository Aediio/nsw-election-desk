# Refresh the NSW Election Desk

You are maintaining a private, newsroom-grade learning game for a NSW state political reporter. Work in the existing `nsw-election-learning-game` folder. Update the facts and rebuild the standalone `index.html`; do not redesign the product unless asked.

The refresh date is **[INSERT TODAY'S DATE IN AUSTRALIA/SYDNEY]**. The target election is the **2027 NSW State election**. Treat every current office, member, party affiliation, candidate, promise, poll, campaign signal, disclosure rule and election timetable as time-sensitive.

## Editorial standard

1. Prefer primary sources: NSW Electoral Commission, Parliament of NSW, NSW legislation, NSW Budget papers, Audit Office, official department data and source documents from parties or candidates.
2. Use reputable reporting to add context or to capture announcements that do not yet have a complete primary document. Attribute claims and never turn a party claim into an established fact.
3. Keep these fact classes separate:
   - official 2023 election result;
   - current member and party;
   - current analyst pendulum or estimate;
   - opinion polling;
   - observed campaign activity;
   - promises, funded government measures and political rhetoric.
4. Attach a publication or observation date, source URL and status to every time-sensitive item.
5. Do not infer candidates, campaign intensity, preference deals, costings or target seats from weak signals. “No reliable update found” is acceptable.
6. Do not call a watch tier a forecast. Do not apply a uniform swing as a prediction.
7. Preserve neutral language. Summarise what was announced, how it is funded or not funded, where it applies, what must happen for delivery and what remains unverified.
8. Preserve stable card and record IDs whenever the underlying subject is the same so existing browser review history still works.

## Refresh sequence

### 1. Verify the election frame

- Confirm election date, writ/timetable announcements, enrolment or nomination deadlines, voting-rule changes, campaign-finance caps and disclosure windows at the NSW Electoral Commission.
- Update `src/editorial-content.json` metadata and relevant cards only when an authoritative source supports the change.

### 2. Refresh Parliament

- Retrieve all current Legislative Assembly and Legislative Council members from the Parliament of NSW member directory.
- Capture exact display name, house, electorate for Assembly members, party, ministries, shadow ministries and parliamentary offices.
- Replace `data/current-la-members.json` and `data/current-lc-members.json` as complete snapshots, not partial patches.
- Confirm counts are 93 and 42. Investigate vacancies, party changes or duplicate/missing electorates before continuing.

### 3. Preserve official election baselines

- Keep `data/seat-results-2023.json` tied to the NSW Electoral Commission Virtual Tally Room unless an official correction is published.
- Keep winner, actual final pair, TCP percentages, margin, primary vote, enrolment, turnout, informality and candidate primaries.
- Never overwrite official 2023 figures with a current pendulum, by-election result or notional estimate.

### 4. Check boundaries

- Verify whether the 2021 redistribution boundaries remain the boundaries for 2027.
- Replace `data/state-electoral-districts.geojson` only with published NSW government geometry. Retain all 93 districts and WGS84 longitude/latitude coordinates. Simplify enough for a small mobile file without changing topology or hand-drawing shapes.
- If official seat names change, update every joining dataset and `src/regions.json`, then document the change.

### 5. Refresh the analyst pendulum and watchlist basis

- Update `data/current-pendulum.json` from the named analyst source, preserving `sourceAsOf`, holder party, margin, and explicit opponent where the contest is non-classic.
- If the analyst source is unavailable or stale, do not invent a replacement. Keep the previous dated snapshot and report that it was not refreshed.
- The build derives watch tiers from this snapshot, current holder, contest type and changes since 2023.

### 6. Refresh campaigns, promises and campaign intensity

- Search from the previous content date through today for formal NSW election pitches, launches, promises, reversals, costings and major campaign events from Labor, Liberal, Nationals, Greens, independents and relevant minor parties.
- Update `campaignLedger` in `src/editorial-content.json`. Each record needs:
  - stable ID;
  - announcement date;
  - actor and party;
  - status such as Budget measure, legislated policy, formal election commitment, election pitch, intention or rhetoric;
  - concise exact summary;
  - stated cost and the limits of the costing;
  - geographic or electorate footprint;
  - verification questions and dependencies;
  - direct source IDs.
- Deduplicate repeated announcements. Note when a proposal changes, is costed, legislated, abandoned or copied by another party.
- For campaign intensity, require observable dated evidence such as repeated leader visits, campaign staffing, sustained advertising, direct mail, candidate timing, local policy launches or opponent defensive activity. Store uncertainty; do not equate a media mention with resource commitment.

### 7. Refresh accountability and interstate context

- Check the NSW donation disclosure portal and election-period rules. Add only material, sourceable developments.
- Review recent Australian state elections and upcoming contests for genuinely useful NSW implications. Update `interstateLens` only when the comparison teaches a specific reporting lesson, and always state differences in electoral system and context.

### 8. Improve learning content carefully

- Add flashcards only for durable, reportable knowledge or dated campaign facts worth retrieving.
- Keep prompts atomic: one useful retrieval target per card.
- Answers must be concise; explanations should supply distinction, caveat or reporting significance.
- Add newsroom scenarios when they train verification, counting, polling, costing, jurisdiction or election-night judgment. Do not add trivia for volume.

## Build and quality checks

Run:

```sh
ruby src/build.rb
ruby src/validate.rb
```

Then serve the folder locally and test `index.html` in a real browser at approximately 430 × 932 and 320 × 700:

- Today dashboard and countdown;
- a complete Daily 10 review, including confidence and all three ratings;
- same-session repeat after “Again” and saved due date;
- map rendering, regional zoom, all four layers and a five-seat locate drill;
- seat search/filter and at least three full profiles, including one changed-holder seat;
- people search by name, role, party and house;
- current Assembly and Council composition totals;
- campaign, interstate and reporting-kit sections;
- private seat note save;
- progress export/import;
- light and dark themes;
- no horizontal page overflow, clipped text, blank map or console errors.

## Return a refresh report

Summarise:

- exact refresh date;
- files changed;
- official changes to members, parties, rules, boundaries or results;
- analyst-pendulum changes;
- campaign entries added, updated or retired;
- stale or unavailable sources;
- validation and browser-test results;
- any claim that still needs human editorial review.

Do not claim the game is live-updating. It is a dated offline build until a separate scheduled refresh system is implemented.

## Current source layout

The template is now a shell; application logic is `src/app.js`, styles are `src/styles.css`, pure learning rules are `src/learning.js` and AI access is `src/gemini.js`. Canonical curriculum is `src/editorial-content.json` → `facts`, with `statement` and separate `learning` fields. Build derives cards with stable IDs. Run root Node tests and `tests/check-build.cjs` after the Ruby build. The separate Pages bundle is generated in root `dist/`; do not hand-edit it. Follow root `AGENTS.md` and `docs/refresh-and-validate.md` for deterministic source monitoring and reviewed proposals.
