# Source and status log

Content is current to **3 September 2026 (Australia/Sydney)**. Source links also appear beside the facts inside the game.

## Stable official baseline

- The election is scheduled for Saturday, 13 March 2027: [NSW Electoral Commission](https://elections.nsw.gov.au/elections/state-elections/2027-nsw-state-election).
- Voting rules and ballot instructions: [NSW Electoral Commission voting guide](https://elections.nsw.gov.au/elections/how-voting-works/voting-in-new-south-wales/how-to-cast-your-vote-in-a-state-election) and [counting guide](https://elections.nsw.gov.au/elections/how-counting-works/how-votes-are-counted-in-a-state-election).
- Current members, parties, ministries and parliamentary offices: [Parliament of NSW member directory](https://www.parliament.nsw.gov.au/members-and-electorates), retrieved 3 September 2026.
- Parliamentary structure and powers: [Legislative Assembly](https://www.parliament.nsw.gov.au/parliamentary-business/legislative-assembly/role-and-history-of-the-legislative-assembly/role-of-the-legislative-assembly) and [Legislative Council](https://www.parliament.nsw.gov.au/parliamentary-business/legislative-council/role-and-history-of-the-council).
- Official seat-by-seat 2023 results: [NSW Electoral Commission Virtual Tally Room](https://pastvtr.elections.nsw.gov.au/SG2301/LA/results).
- Result interpretation and historical comparison: [NSW Parliamentary Research Service 2023 election analysis](https://www.parliament.nsw.gov.au/parliamentary-business/research-and-library/research-publications-data/2023-nsw-election-analysis-with-supplement-2025).
- Electorate geometry: [Spatial Services NSW State Electoral District layer](https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme_multiCRS/FeatureServer/4). The source geometry was simplified for phone performance; the build rewinds polygon rings only in the embedded map copy to match D3's spherical convention.

## Dated analysis

- Current electoral pendulum: [The Tally Room NSW 2027 pendulum](https://www.tallyroom.com.au/nsw2027/pendulumnsw2027), snapshot dated 3 September 2026. This is analysis, not an official margin or prediction. The official 2023 margin remains a separate field.
- “Watch tier” is generated locally from margin, final-pair type, a changed holder since 2023 and crossbench status. It is an editorial-attention tool, not a forecast and not evidence of party campaign spending.
- The 15 reporting regions are study groupings authored for this game. They are not official electoral regions.

## Campaign snapshot

- Labor's 2026–27 Budget measures: [NSW Budget highlights](https://www.nsw.gov.au/business-and-economy/nsw-budget/2026-27-budget-papers/overview/budget-highlights).
- Coalition budget-reply pitches: [ABC News, 25 June 2026](https://www.abc.net.au/news/2026-06-25/nsw-opposition-leader-kellie-sloane-budget-reply-speech/106839734).
- One Nation leadership, Cessnock candidacy, energy and tax pitches: [ABC News, 28 August 2026](https://www.abc.net.au/news/2026-08-28/nsw-one-nation-leader-mike-newman-coal-nuclear-energy/107088390).
- Election-period donation disclosures: [NSW Electoral Commission disclosure portal](https://elections.nsw.gov.au/electoral-funding/disclosures/view-disclosures) and [2027 election bulletin No. 5](https://elections.nsw.gov.au/bulletins/2027-nsw-state-election-bulletin-no-5).

The campaign ledger distinguishes funded Budget measures from election pitches and records unresolved costing and delivery questions. It is a dated snapshot, not a live feed.

## Interstate comparison module

- [Queensland 2024 results](https://www.abc.net.au/news/elections/qld/2024/results).
- [Western Australia 2025 lower-house result](https://www.abc.net.au/news/2025-03-08/wa-labor-wins-2025-election-in-comfortable-victory/105025568) and [upper-house result](https://www.abc.net.au/news/2025-04-16/wa-upper-house-final-election-results-revealed/105185376).
- [Tasmania 2025 final lower-house composition](https://www.abc.net.au/news/2025-08-02/george-razay-result-finalised-in-tasmanian-seat-of-bass/105604472).
- [South Australia 2026 results](https://www.abc.net.au/news/elections/sa/2026/results).

Each comparison includes an electoral-system caveat so that a result in another state is used as a reporting question, not mechanically applied to NSW.

## Engineering/source-monitor check — 6 September 2026

The approved political snapshots above retain their 3 September retrieval dates. Application improvements do not constitute independent reverification of those claims. The official Spatial Services query returned all 93 expected district names and newer modification metadata for Wagga Wagga and Cootamundra. These were recorded for review without replacing geometry. Parliament returned HTTP 403/access challenge; current members were not reverified. See `../docs/source-review-2026-09-06.json` and the source hierarchy in `../docs/source-registry.md`.

The new trend exercise is explicitly hypothetical practice; it is not a NSW trend dataset. Budget magnitude questions derive from the existing attributed campaign entry. No new unsourced candidate, retirement or by-election assertions have been added.
