# Content model

Canonical files remain separate: `current-la-members.json` (93), `current-lc-members.json` (42), `seat-results-2023.json` (93), `current-pendulum.json` (93), `state-electoral-districts.geojson` (93). `manifest.json` records source, authority, retrieval, count, refresh rule, freshness class and maximum review age. Critical join/count/geometry/number failures block builds; stale snapshots show warnings and UI status.

Authored curriculum is `editorial-content.json` → `facts`. Each has stable `id`, `statement`, `domain`, `sourceIds`, `asOf`, `verificationStatus`, `freshnessClass`; `learning` contains presentation prompt, distractors and priority. The build derives static cards, then the app derives people/seat/role/number cards from approved objects. `contentDifficulty` is separate from selected presentation difficulty. Application questions are not an alternative canonical political database.

Future records should preserve `id`, `asOf`, `validFrom`, `validTo`, `checkedAt`, `freshnessClass`, `verificationStatus`, `sources` and `editorialNote` where supported. Unknown valid dates or Council term/cohort fields stay null rather than being guessed. Keep a later event/by-election record alongside the 2023 result; never replace the original baseline.

Candidate status vocabulary: rumoured, publicly discussed, announced, preselected, endorsed, registered, officially nominated, withdrawn. Store candidate ID, seat, election year, status, status date and source evidence. Only NSWEC nomination evidence supports officially nominated. No candidate field is inferred from incumbent membership or a party announcement.

News durability: transient, campaign-relevant, term-relevant, structural. Prefer a change linked to a tracked person, seat, institution, promise or issue; avoid a generic news feed. An attributed campaign promise needs cost, period, geography, delivery and verification questions. The hypothetical trend exercise is labelled practice and does not assert a real NSW statistic.

Review priorities: P0 materially misleading/blocking; P1 consequential current fact; P2 context/watch analysis; P3 minor enrichment. The proposed-change JSON supports adds, updates, closes, unchangedButReverified, disputes, staleOrUnreachable, cardInvalidations and proposedCards. Live AI output cannot mutate any of these canonical files.
