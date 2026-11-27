# Spanish comment test results (5 Spanish-language subreddits, 28 held-out threads), 2026-11-27

The protocol named three judges (GPT, Opus, Sonnet). GPT was not run: the codex CLI was at its usage limit, and the run planned for after the reset was then dropped by decision. **The pre-registered rule needs all three judges, so it cannot be applied as written.** On the two judges that ran, SKILL beats HUMANIZER_S on both, with the bootstrap 95% interval above zero on both, with or without r/askspain. Both judges are Claude models, so this is a weaker check than the one registered.

Human probability (0-100), mean over threads:

| All 28 threads | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 9.9 | 11.3 | 10.6 |
| HUMANIZER_S (blader/humanizer + 10 real comments) | 29.8 | 36.4 | 33.1 |
| SKILL (shipped reply path, Sonnet writing) | 50.7 | 60.3 | 55.5 |
| HUMAN (top comment by points) | 87.7 | 84.5 | 86.1 |
| SKILL - HUMANIZER_S | +20.9 [14.4, 27.9] | +23.9 [15.4, 32.3] | |
| SKILL - HUMAN | -37.0 [-43.3, -30.3] | -24.2 [-33.1, -15.6] | |

| Without r/askspain (23 threads; the tool now refuses it) | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 9.5 | 10.8 | 10.2 |
| HUMANIZER_S | 30.1 | 38.3 | 34.2 |
| SKILL | 52.6 | 62.4 | 57.5 |
| HUMAN | 87.6 | 85.0 | 86.3 |
| SKILL - HUMANIZER_S | +22.5 [15.2, 30.3] | +24.1 [14.7, 33.3] | |

- Pass rate (50+): SKILL 43% (Opus) / 71% (Sonnet), HUMANIZER_S 0% / 21%, PLAIN 0% / 0%, HUMAN 100% / 100%.
- Judged more human than the real comment: SKILL 0/28 (Opus), 2/28 (Sonnet); the other AI arms never.
- Upvote rank (1 = best of 4): SKILL 2.4 / 2.3, HUMANIZER_S 2.4 / 2.0, HUMAN 1.9 / 2.6, PLAIN 3.3 / 3.1. As in English, the Sonnet judge would upvote the humanizer reply a little more often.
- By subreddit, SKILL - HUMANIZER_S is positive in all five on both judges (Opus / Sonnet): devsarg +21.7 / +34.0, programacion +16.7 / +25.5, preguntaleareddit +28.8 / +11.8, askspain +13.6 / +23.0, mexico +23.0 / +25.4 (5-6 threads each, so noisy).
- Thread 1xynq5l (r/devsarg): Opus PLAIN 8, HUMANIZER_S 25, SKILL 82, HUMAN 88; Sonnet PLAIN 8, HUMANIZER_S 30, SKILL 80, HUMAN 85.
- Median length in words: PLAIN 280, HUMANIZER_S 115, SKILL 48, HUMAN 17. All 112 texts are Spanish by the word check, although every prompt was in English.
- Types Haiku picked for SKILL: answer 8, one-liner 5, complaint 5, joke 4, side-point 3, disagree 2, agree 1.
- Next to the earlier rounds (same two judges, other rounds, so indicative only): SKILL minus the humanizer arm was +30.3 / +34.6 in English F1 and +27.6 / +36.5 in Korean; Spanish is a bit smaller at +20.9 / +23.9, mostly because SKILL scores lower here (51 / 60 vs 56 / 68 English, 61 / 71 Korean).

Full output: `es.out`.

## Threads left out

- **1xs6i7k** (r/askspain, opinions on a TV interview with the leader of Vox, with talk of elections): political. The tool's Haiku guard said no; the Sonnet second check added before any generation (PROTOCOL.md) said yes. Replaced by askspain's next eligible thread, 1xlz6z6. That was the only disagreement in 113 threads the Sonnet check read.
- Skipped by the pre-registered rules while reading the busiest question threads: political by the guard, devsarg 1, askspain 10, mexico 4 (with 1xs6i7k, 11 of the 23 askspain threads read were political); no top-level comment of 5+ points, programacion 3. Question threads that failed the Spanish check were filtered before that: devsarg 3, preguntaleareddit 6, askspain 59, mexico 41. The log is `collect.log` in the working folder.
- No judge failures: both judges scored all 28.

## Finding about the tool's political guard

The shipped guard (Haiku, `GUARD` in `lib/prompts.mjs`) let through a Spanish thread that is plainly about a party leader and elections. One miss in this set, caught by asking Sonnet the same question. Worth a look before the tool is pointed at communities like these: 11 of the 23 busiest r/askspain question threads read were political, and 4 of 16 in r/mexico.

## Community profiles

`communities/reddit/{devsarg,programacion,preguntaleareddit,askspain,mexico}.json` were written with `voice.mjs profile` after the run, with `rules` filled by hand from each subreddit's live rules (read 2026-11-27 through the browser, since reddit.com refuses plain HTTP; Arctic Shift's copy is from January 2025).
- r/askspain is `ai_content: "banned"`: its rule "No hilos de poco esfuerzo" says "No aceptamos nada generado por IA." The tool now refuses r/askspain. Its 5 threads were measured before the profile existed, as the protocol ordered; the table without them is above.
- The other four have no rule on AI-written content. r/devsarg's "No se permite publicar tu app vibecodeada." is about promotion and is listed under self-promotion.
- Smallest samples: r/programacion, 41 comments and 12 posts. Every Spanish profile has at least 12 posts and 41 comments, so no block was dropped.

## Limits

- Two judges, both Claude, and Sonnet also wrote all three AI arms. The earlier writer test found no sign of Sonnet favouring its own writing, but this set has no neutral judge.
- The SKILL arm is written by Sonnet (`--fast`), the model in the published tables; the shipped default writer is Opus and was not tested here.
- The prompts for every arm are English with Spanish samples, as the shipped tool's are for Reddit. The judge prompt is English too.
- SKILL's type rates and typed examples come from each subreddit's pool of the 10 busiest non-test threads (2026-10-01 to 11-26). The shipped tool now uses the profile rates instead.
- Three Spanish varieties (Argentine voseo in r/devsarg, Spain, Mexico), 5-6 threads per subreddit.
- The Spanish check is a word-list heuristic. Comment scores are as archived by Arctic Shift (newest test thread 2026-11-24).
- No native-speaker check yet. The quiz items for one are in `~/.trina/know-raw/quiz-items-es.json` (outside git; 25 of 28 threads, 3 left out by the quiz's rule that both sides are cut or neither; GPT scores are null).
- The real comments are much shorter than any AI arm (median 17 words vs SKILL's 48).

## Cost

Claude calls, from `total_cost_usd`: $4.24 over 504 calls (generation $2.60, judging $0.81, type labelling $0.39, political checks $0.44). The five `voice.mjs profile` runs label about 630 more comments; their calls are not logged, about $0.35 by the same rate. GPT: no calls. Total about $4.60.

## Files and rerun

- `PROTOCOL.md` (written before collection, with the dated changes), `RESULTS.md`, `es.out`.
- `ids.json`: links only, 28 `test` threads and 50 `samples` threads (10 per subreddit).
- `lib.ts` (isolated model calls with cost logging, Arctic Shift client, Spanish check), `collect.ts` (selection), `es.ts` (classify, gen, judge, analyze, quiz). SKILL imports the shipped `lib/prompts.mjs`, `lib/claude.mjs` and `lib/profile.mjs` directly.
- `outputs/<id>__<ARM>.txt`: every generated reply; `outputs/drafts/<id>.json`: SKILL's three drafts, their types and Haiku's pick.
- `judged/<opus|sonnet>/<id>.json`: scores per arm with each judge's order; `judged-raw/<opus|sonnet>/<id>.txt`: each judge's raw answer.
- Real posts and comments stay in the working folder (`WORK`, default `~/.trina/know-raw/spanish-voice-test`). To rerun: `bun collect.ts`, then `bun es.ts classify`, `gen`, `judge opus`, `judge sonnet` (and `judge codex` for GPT), `analyze`, `quiz`.
