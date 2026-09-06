# Source hierarchy

The machine-readable source registry remains `nsw-election-learning-game/src/editorial-content.json` → `sources`; dataset provenance is `data/manifest.json`. Do not maintain duplicated registries.

| Tier | Sources | Use |
| --- | --- | --- |
| A | NSW Electoral Commission, Parliament member directory, Spatial Services, legislation, official statistical and Budget documents | Canonical event, membership, boundary, rule or official measure |
| B | Audit Office, Ombudsman, accountability bodies, specialist parliamentary research | Findings, analysis, scrutiny with their precise scope |
| C | Established news, named election analysts, academic and polling methodology | Dated analysis or reporting with attribution |
| D | Party, candidate, interest group, social post | Evidence that the source made a claim; underlying truth needs independent evidence |

Registry `type` is descriptive; it does not mechanically certify every assertion. A government document is canonical for its own stated appropriation, not proof of future delivery. Tally Room margins remain analyst snapshots and are never labelled official results or forecasts. Regions are editorial groupings; neighbouring-seat joins use matching segments in simplified geometry and may omit water boundaries.

Verification vocabulary: verified, single-source, inference, disputed, stale. Existing supplied snapshots have retained their retrieval dates; this engineering work did not independently reverify every political assertion. Missing sources must be explicit editorial inference, never invented links. Each numerical fact needs value, unit, date, geographic scope and comparison basis.

On 6 September 2026, the official boundary service returned all 93 expected district names and later modification metadata for Wagga Wagga and Cootamundra. This is a review signal, not proof of a boundary change. Parliament returned an access challenge. Full machine-readable report: `source-review-2026-09-06.json`.
