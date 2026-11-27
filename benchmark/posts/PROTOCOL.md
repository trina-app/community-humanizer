# Post-writing test (written 2026-11-27, before any run)

Question: comments worked; do posts? Generators get the title and short notes of what the real poster wanted to say (written by Sonnet from the real post), never the post itself. 24 English Reddit posts (60-400 words, the five subreddits of the Reddit test) and 24 Korean Clien posts (120-1500 chars, 모두의공원 and 아무거나질문, political ones excluded). Samples are other real posts from the same community.
Arms: PLAIN; HUMANIZER_S (blader/humanizer for English, im-not-ai for Korean, plus 5 real posts); SKILL (post persona, 3 drafts each with a different 5 real posts, Haiku picks); HUMAN (the real post). Judges Opus and Sonnet, plus GPT if codex is available; blind, shuffled per judge.
Primary: SKILL vs HUMANIZER_S per language, interval above zero on every judge. Report SKILL vs HUMAN as it comes.
- Data fix after round 1, before any prompt change (2026-11-27): the real English bodies (from BrightData) had lost their line breaks and the Korean ones carried scrape leftovers, both of which a judge can use to spot the real post. clean.ts re-reads the English bodies from Arctic Shift and cleans the Korean ones; samples rebuilt. Round 1 is re-run on the cleaned data as the baseline.
- Rewrite diagnostic (2026-11-27): Sonnet rewriting the real post scored the same as SKILL (en 48/44 vs 48/52, ko 48/48 vs 52/58), so for posts the wording, not missing content, is the gap.
- Round 2 (development set only; numbers are not evidence): STATS, DOC, HAIKU against SKILL and HUMAN, judges Opus and Sonnet (human probability only). Samples from corpus.json minus the test posts. The winner is confirmed on holdout.json later.
- Round 3 (development set, 2026-11-27, founder: "너무 좀 못하게 하면 안 되니?"): MESSY (fast, not reread, order as it comes), ROUGH (STATS plus slips at measured rates from slips.ts, no AI), MESSY_ROUGH. Typos are rare in real posts (1-2%), so none are added; only measured slips (lower-case sentence starts, dropped final periods, lower-case i, dropped apostrophes; Korean dropped line-end periods).
- Round 3 result: MESSY +5 to +7 (Opus), +19 to +26 (Sonnet) over STATS; measured slips added nothing (0-1.5). MESSY once added a motive not in the notes.
- Round 4 (development set): MESSY2 (MESSY + no added reasons or motives + the community's 25th-percentile length) and PICK3 (three MESSY2 drafts, Haiku picks), judged with MESSY and HUMAN. Then the best arm goes to holdout.json.

## Holdout confirmation (written 2026-11-27, before any holdout run)
Prompts frozen: PLAIN, HUMANIZER_S and SKILL as in posts.ts (round 1); MESSY as in post3.ts (round 3, the best development arm). 52 held-out posts (22 English, 30 Korean) never used while tuning. Judges Opus and Sonnet (GPT added when codex is available), 5 versions per post with HUMAN.
Pass: MESSY beats HUMANIZER_S in each language on both judges with the bootstrap interval above zero. Report MESSY vs SKILL and vs HUMAN as they come.
