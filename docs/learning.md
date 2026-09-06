# Learning and local data

Beginner: mostly three alternatives and broad margin bands. Standard: mostly four choices and approximate values. Hard: related people/nearby electorates, recorded confusions, close numerical values, comparisons and ordering. Expert: unaided recall, own-word briefing and approximate numerical entry. Contextual scenarios retain model-answer self-assessment at every level; exact prose matching would misgrade good answers.

Adaptive is deterministic: new cards begin at Beginner, confident success on another review day moves toward Standard/Hard/Expert, errors step back. New-item initial success permits the next level, but repeated same-day answers do not create additional spaced mastery. Manual difficulty never resets history.

Wrong choices are counted per card in commonWrongAnswers and influence later alternatives. Correct-but-guessing schedules two days and does not establish spaced recall. Fairly sure uses roughly 4 → 10 → 21 days; certain uses 7 → 21 → 45. Wrong answers return later in the same finite session, then tomorrow. A same-day recovery from a lapse stays due tomorrow.

Learned requires two successful non-Beginner recalls on separate days. Mastered requires at least three across fourteen days and at least two Expert successes. Self-rated prose cannot be objectively certified; confidence and honest rating remain part of the design. Historical legacy spacing is preserved but not retroactively called Expert mastery.

A fact signature uses prompt, answer, numerical metadata and sources. Changed reviewed facts are flagged UPDATED, due now, and lose current mastery while retaining lifetime reviews/errors. Unchanged signatures retain schedules. Orphaned historic IDs remain in exports; they do not enter current decks. Map answers are stored separately under map-seat-slug IDs.

LocalStorage `nswElectionDesk.v1` holds cards, settings, activity and seat notes. The dataset is small enough that IndexedDB adds complexity without a present benefit. Imports validate records and settings before replacing state. Export before moving origin/device; HTTPS Pages, localhost, different ports and local files are separate storage origins. Clearing browser data removes progress. The Gemini key lives under a different key and is excluded from progress export/import. Export files include private notes and should be treated accordingly.

Settings change session length, difficulty, confidence prompts and Beginner region labels. Disabling confidence prompts conservatively records guessed confidence. To study a domain, choose an existing deck; Daily includes mixed geography and an application question. Updated and Weakest knowledge are accessible from Today. No rewards currency, leaderboards or punitive streaks.
