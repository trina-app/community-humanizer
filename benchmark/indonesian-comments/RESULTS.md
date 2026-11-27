# Indonesian comment test results (4 Indonesian-language subreddits, 28 held-out threads), 2026-11-27

**Pass.** The rule written before collection (PROTOCOL.md) was: SKILL beats HUMANIZER_S on both judges (Opus, Sonnet) with the bootstrap 95% interval above zero on both. It does, and it still does without the three borderline threads named before any generation. Both judges are Claude models and Sonnet wrote every AI arm, so this is a Claude-only check.

Human probability (0-100), mean over threads:

| All 28 threads | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 9.4 | 10.8 | 10.1 |
| HUMANIZER_S (humanizer-indonesia + 10 real comments) | 27.2 | 36.3 | 31.8 |
| SKILL (shipped reply path, Sonnet writing) | 45.7 | 65.6 | 55.7 |
| HUMAN (top comment by points) | 87.1 | 84.6 | 85.9 |
| SKILL - HUMANIZER_S | +18.5 [13.4, 24.1] | +29.4 [21.1, 37.6] | |
| SKILL - HUMAN | -41.4 [-47.3, -34.6] | -19.0 [-27.7, -9.9] | |

| Without the 3 borderline threads (25; PROTOCOL.md note before generation) | Opus | Sonnet |
|---|---|---|
| PLAIN | 9.4 | 10.8 |
| HUMANIZER_S | 26.5 | 35.8 |
| SKILL | 45.2 | 65.0 |
| HUMAN | 86.9 | 84.3 |
| SKILL - HUMANIZER_S | +18.7 [13.3, 24.7] | +29.2 [20.0, 38.2] |
| SKILL - HUMAN | -41.7 [-48.0, -34.4] | -19.2 [-29.0, -8.9] |

- Pass rate (50+): SKILL 29% (Opus) / 79% (Sonnet), HUMANIZER_S 0% / 29%, PLAIN 0% / 0%, HUMAN 100% / 96%.
- Judged more human than the real comment: SKILL 1/28 (Opus), 4/28 (Sonnet, plus 1 tie); the other AI arms never.
- Upvote rank (1 = best of 4): Opus PLAIN 3.5, HUMANIZER_S 2.5, SKILL 2.5, HUMAN 1.4; Sonnet PLAIN 3.4, HUMANIZER_S 2.1, SKILL 2.3, HUMAN 2.2. SKILL ranked above the real comment on 5/28 threads (Opus) and 14/28 (Sonnet). As in English and Spanish, the Sonnet judge would upvote the humanizer reply a little more often than SKILL's.
- By subreddit, SKILL - HUMANIZER_S is positive in all four on both judges (Opus / Sonnet): indonesia +21.4 / +28.4 (9 threads), indotech +15.6 / +27.4 (8), indonesiabebas +17.5 / +34.0 (8), indowibu +20.0 / +25.0 (3).
- Thread 1xrgz1c (r/indonesia): Opus PLAIN 5, HUMANIZER_S 30, SKILL 80, HUMAN 85; Sonnet PLAIN 8, HUMANIZER_S 72, SKILL 85, HUMAN 80.
- Median length in words: PLAIN 171, HUMANIZER_S 81, SKILL 28, HUMAN 31 (characters 1,125 / 502 / 181 / 172). This is the first set where SKILL's replies are about as long as the real ones (Spanish: SKILL 48 vs HUMAN 17).
- All 112 texts are Indonesian by the word check, although every prompt was in English.
- Types Haiku picked for SKILL: answer 7, complaint 6, question-back 5, side-point 5, disagree 4, joke 1.
- Next to the Spanish round (same two judges, other threads and another humanizer, so indicative only): SKILL minus the humanizer arm was +20.9 / +23.9 there and is +18.5 / +29.4 here. humanizer-indonesia lands where blader/humanizer did in Spanish (27 / 36 here, 30 / 36 there).

Full output: `id.out`.

## Political filter and other removals

- 137 threads went through the political check (Haiku with the tool's `GUARD`, and the same prompt to Sonnet). 51 were removed: 47 flagged by both, 2 by Sonnet only (r/indonesia 1xs9ivp, a test candidate, and 1xxhr6l, a pool candidate) and 2 by Haiku only (r/indotech 1xksn9r, a test candidate, and r/indonesia 1xo8yh9, a pool candidate). Haiku alone would have let 2 through, as in the Spanish run.
- While reading the busiest question threads for the test set: r/indonesia 15 political of 28 read, r/indonesiabebas 11 of 25, r/indotech 1 of 17, r/indowibu 0 of 6. For the sample pools: r/indonesia 21 more busy threads were political (one of them also a test candidate), r/indonesiabebas 4. r/indonesia's busiest threads are mostly political.
- Other skips by the pre-registered rules: top comment not Indonesian, indonesia 1, indotech 4, indonesiabebas 2, indowibu 2; no top-level comment of 5+ points, indowibu 1. Question threads that failed the Indonesian check were filtered before that: indonesia 88 of 266, indotech 45 of 270, indonesiabebas 12 of 49, indowibu 1 of 7.
- r/indowibu had only 3 eligible threads, so its turns went to the others (9 / 8 / 8 / 3), as the round-robin rule says. The October fallback was not needed.
- Three borderline threads stayed in by rule (both guards said no): 1xse85x (r/indonesia, pay of volunteers in a government meal programme), 1xux6n4 (r/indonesiabebas, "what worries you most about Indonesia now"), 1xnj0zn (r/indonesiabebas, opinions on a preacher). Without them the result is the same (table above). The quiz builder's Indonesian politics filter (`ID_POL` in `quiz/scripts/build-items.ts`, as of this run) catches 1xux6n4 but not 1xse85x or 1xnj0zn; they need leaving out there by hand. It also filters 1xu8nw2 (a seller who sent the wrong item), which is not political.
- No judge failures: both judges scored all 28 on the first try.

## Community profiles

`communities/reddit/{indonesia,indotech,indonesiabebas,indowibu,finansial}.json` were written with `voice.mjs profile` after the run, with `rules` filled by hand from each subreddit's live rules (read 2026-11-27 through the browser before collection).
- **r/finansial is `ai_content: "banned"`**: its rule "No low effort post" says "No copy-pasted generative AI answer." The tool now refuses r/finansial. It was left out of the test for that reason before any thread was collected (PROTOCOL.md), so unlike r/askspain in the Spanish run, none of its threads were measured.
- The four test subreddits have no rule on AI-written content.
- Smallest profile: r/indowibu, 69 comments and 3 posts (the tool reads the last 30 days without a language filter; r/indowibu is small and image-heavy). Its measured comment types (45% one-liner, median 6 words) differ a lot from the Indonesian-only pool used in the test (12% one-liner). The shipped tool now draws from the profile, so it would write r/indowibu replies shorter than the ones measured here.

## Limits

- Two judges, both Claude, and Sonnet also wrote all three AI arms. This set has no neutral judge; GPT was dropped before the run.
- HUMANIZER_S used adhiprib/humanizer-indonesia because it is the most-starred Indonesian humanizer (360 stars, MIT). It is written for editing formal Indonesian (papers, reports, email), it is 74 KB, and it refers to files of its repo that the writer did not get. A comment task is outside what it was built for. blader/humanizer, the Spanish run's comparison, was not run here.
- The SKILL arm is written by Sonnet (`--fast`), the model in the published tables; the shipped default writer is Opus and was not tested here.
- The prompts for every arm are English with Indonesian samples, as the shipped tool's are for Reddit. The judge prompt is English too.
- SKILL's type rates and typed examples come from each subreddit's pool of the 10 busiest non-test threads (2026-10-01 to 11-26), Indonesian comments only. The shipped tool now uses the profile rates instead (see r/indowibu above).
- Four subreddits, 3-9 threads each; r/indowibu has only 3. Political threads, which are most of r/indonesia's busiest, are excluded, so the result says nothing about them; the tool refuses them anyway.
- The Indonesian check is a word-list heuristic, and Indonesian Reddit mixes in a lot of English. Comment scores are as archived by Arctic Shift (newest test thread 2026-11-24).
- No native-speaker check yet. `posts.json` for the quiz builder is in the working folder (outside git).

## Cost

Claude calls, from `total_cost_usd`: $7.08 over 513 calls (generation $5.49, of which HUMANIZER_S $4.47 because its skill is 74 KB; judging $0.78; type labelling $0.29; political checks $0.52). The five `voice.mjs profile` runs label about 700 more comments; their calls are not logged, about $0.40 by the same rate. Total about $7.50.

## Files and rerun

- `PROTOCOL.md` (written before collection, with the dated note), `RESULTS.md`, `id.out`.
- `ids.json`: links only, 28 `test` threads and 40 `samples` threads (10 per subreddit).
- `lib.ts` (isolated model calls with cost logging, Arctic Shift client, Indonesian check), `collect.ts` (selection), `id.ts` (classify, gen, judge, analyze). SKILL imports the shipped `lib/prompts.mjs`, `lib/claude.mjs` and `lib/profile.mjs` directly.
- `humanizer-id-SKILL.md` and `humanizer-id-LICENSE`: adhiprib/humanizer-indonesia at commit 05231b5 (MIT).
- `outputs/<id>__<ARM>.txt`: every generated reply; `outputs/drafts/<id>.json`: SKILL's three drafts, their types and Haiku's pick.
- `judged/<opus|sonnet>/<id>.json`: scores per arm with each judge's order; `judged-raw/<opus|sonnet>/<id>.txt`: each judge's raw answer.
- Real posts and comments stay in the working folder (`WORK`, default `~/.trina/know-raw/indonesian-voice-test`): listings, comment trees, pools, labelled pools, guard answers, the subreddits' rules, `posts.json`, `collect.log`, `threads.out` (per-thread scores with titles). To rerun: `bun collect.ts`, then `bun id.ts classify`, `gen`, `judge opus`, `judge sonnet`, `analyze`.
