# Post-writing test results (development set, 2026-11-27)

Generators get the title and short notes; the real post is never shown. Judges Opus and Sonnet, human probability 0-100.

Round 1 on cleaned data (4 versions per post):
| | en Opus | en Sonnet | ko Opus | ko Sonnet |
|---|---|---|---|---|
| PLAIN | 12 | 12 | 8 | 8 |
| humanizer / im-not-ai + samples | 29 | 30 | 24 | 25 |
| SKILL (post persona, 3 drafts, pick) | 33 | 35 | 28 | 31 |
| HUMAN | 77 | 71 | 89 | 89 |
SKILL vs humanizer: +4 to +6, intervals include zero.

Rewrite diagnostic (no HUMAN in the round): Sonnet rewriting the real post, with all of its content, scored 48/44 (en) and 48/48 (ko), the same as SKILL. For posts the wording is the gap, not missing content.

Round 2 (5 versions with HUMAN): SKILL 21/27 (en), 15/26 (ko); STATS (measured shape in the prompt) +1 (en), +4 to +7 (ko, Opus interval above zero); DOC (continue a board page) -3 to +2; HAIKU writer -1 to -13. HUMAN 74-91.
STATS overshot "..": 92% of its Korean posts vs 54% of real ones.

Conclusion so far: prompt changes move posts by at most a few points; LLM judges spot AI posts almost every time. Not confirmed on holdout because nothing is worth confirming yet.

## Rounds 3-4 and holdout (2026-11-27)
- Round 3 (dev): MESSY (fast, not reread, order as it comes) beat STATS by +5 to +7 (Opus) and +19 to +26 (Sonnet); slips added mechanically at measured rates did nothing (0 to +1.5).
- Round 4 (dev): a shorter MESSY and a 3-draft pick did not help (Opus +2 to +5, Sonnet -5 to -17). MESSY stays.
- **Holdout (52 posts never used while tuning; PASSED the pre-registered rule):**

| | en Opus | en Sonnet | ko Opus | ko Sonnet |
|---|---|---|---|---|
| PLAIN | 10 | 14 | 6 | 7 |
| humanizer / im-not-ai + samples | 15 | 23 | 15 | 19 |
| SKILL (round 1) | 22 | 28 | 21 | 22 |
| MESSY | 32 | 63 | 27 | 48 |
| HUMAN | 79 | 65 | 90 | 92 |
| MESSY - humanizer | +17.4 [13.6, 21.9] | +39.4 [30.4, 48.0] | +11.5 [8.2, 15.4] | +29.0 [20.3, 37.6] |
| MESSY - HUMAN | -46.7 | -2.2 [-22.5, 18.0] | -63.6 | -43.6 |

English Sonnet judged MESSY more human than the real post in 10/22. Opus still spots it almost every time. One post's notes call failed twice in the script and was written by hand with the same prompt and model.
