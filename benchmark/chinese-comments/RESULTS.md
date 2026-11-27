# Chinese comment test results (r/China_irl, 28 held-out threads, political threads excluded), 2026-11-27

Protocol: `PROTOCOL.md`, written before collection. Writer: Claude Sonnet for every arm. Judges: Claude Opus and Claude Sonnet, blind, all four replies of a thread at once in each judge's own order, `judge.ts` prompt word for word.

**GPT was not run.** The protocol named three judges (GPT via codex, Opus, Sonnet). Codex hit its usage limit before judging, and GPT was then dropped by decision, so the pre-registered rule ("SKILL beats HUMANIZER_S on all three judges, interval above zero") cannot be applied as written. On the two judges that ran, SKILL beats HUMANIZER_S on both with the interval well above zero.

## Mean "a person wrote this" probability (0-100)

| | GPT | Opus | Sonnet | Average (Opus, Sonnet) |
|---|---|---|---|---|
| PLAIN (plain Claude) | not run | 8.7 | 10.7 | 9.7 |
| HUMANIZER_S (Humanizer-zh + 10 real comments) | not run | 28.0 | 36.0 | 32.0 |
| SKILL (shipped community-humanizer reply path) | not run | 60.1 | 59.5 | 59.8 |
| HUMAN (real top comment) | not run | 86.5 | 81.4 | 84.0 |
| SKILL - HUMANIZER_S, bootstrap 95% | not run | +32.1 [24.8, 39.3] | +23.5 [14.1, 32.2] | +27.8 [21.0, 34.8] |
| SKILL - HUMAN, bootstrap 95% | not run | -26.5 [-33.7, -19.3] | -21.9 [-29.1, -15.0] | -24.2 [-30.4, -18.3] |

The average column is the mean of the two judges; its interval resamples threads on the per-thread mean of the two judges' scores.

Other measures (Opus / Sonnet):
- Replies scored 50 or more: SKILL 71% / 71%, HUMANIZER_S 0% / 29%, PLAIN 0% / 0%, HUMAN 100% / 100%.
- Judged more human than the real comment: SKILL 2/28 / 2/28, HUMANIZER_S 0/28 / 1/28, PLAIN 0/28 / 0/28.
- Upvote rank (1 = best of 4): HUMAN 1.6 / 1.7, SKILL 2.1 / 2.0, HUMANIZER_S 2.8 / 2.5, PLAIN 3.5 / 3.7. Unlike the English development round 6, where judges would upvote the humanizer arm more, SKILL also ranks above HUMANIZER_S here.
- Median length in characters: PLAIN 476, HUMANIZER_S 183, SKILL 57, HUMAN 70.
- Every reply in every arm came back in Chinese (0/28 not mainly Chinese), though all writing prompts are English, as shipped.
- Type SKILL's Haiku pick chose: joke 10, disagree 5, complaint 4, answer 4, side-point 2, one-liner 2, question-back 1.

Same pattern as the English fresh test (Opus / Sonnet: SKILL3 56 / 68, BLADER_S 25 / 33, HUMAN 78 / 78) and the Korean test (SKILL 61 / 71, IMNOTAI_S 33 / 35, HUMAN 87 / 85). Those were separate rounds with other judges' scales, so the comparison is indicative only.

### One thread, every score (1xmd3vj)

| | Opus | Sonnet |
|---|---|---|
| PLAIN | 12 | 22 |
| HUMANIZER_S | 18 | 30 |
| SKILL | 80 | 70 |
| HUMAN | 88 | 85 |

## Selection

- Window 2026-11-01 to 11-24 was enough, so it was not widened. 1,924 posts, 450 eligible (text posts, not removed, not NSFW, 10+ comments).
- Walking the eligible threads by comment count, 102 were read: the tool's political check removed **54 of 102 (53%)**, 28 became test threads, 20 became sample threads (12 after the last test thread, 8 skipped earlier for having no 5+ comment). The removed ones are listed in `ids.json` as "political (removed)".
- No thread was dropped after selection. All 28 got all three generated replies and both judges' scores on the first try.
- Sample pool: 114 top-level comments with 2+ points from the 20 sample threads; only 7 of those threads had comments with 5+ points, so the 10 HUMANIZER_S samples come from those 7. Scores in r/China_irl run low (the HUMAN comments have 5 to 42 points, median 9).

## Limits

- Two judges, both Claude. GPT, the non-Claude judge in the English and Korean tests, did not run. Sonnet wrote every arm and is one of the two judges; the English writer-model test found no sign of Sonnet favouring its own text, but here there is no neutral judge to check that.
- One community, one month, 28 threads. At least 11 of the 28 test threads are about the same news story (the Nvidia CEO scandal).
- Political threads are excluded, and they are most of r/China_irl's busy threads. The result says nothing about them, and the tool refuses them.
- The tool's political check is narrow (elections, politicians, parties, a government's political decisions). Threads about espionage claims, the CCP, geopolitics or attitudes to religion and minorities passed it (for example 1xr8iff, 1xux0yg, 1y1oiti, 1xopzmj, 1xog18r) and stayed in, as the protocol forbids hand picking.
- r/China_irl rule 保证发帖质量 (d) asks that AI-generated content be declared. The benchmark posted nothing. Using the tool there without declaring it would break that rule; the community profile (`communities/reddit/china_irl.json`) says so, and the tool prints it.
- AI judges only. A native-speaker pass comes next through the quiz (`~/.trina/know-raw/quiz-items-zh.json`, outside git).
- One SKILL reply (1xvyge1) says what the writer has or hasn't seen in the news: a small first-person claim the persona is meant to avoid.

## Files

- `PROTOCOL.md`: written before collection, with the dated note on dropping GPT at the end.
- `collect.ts`: Arctic Shift collection and the political walk. `zh.ts`: labelling, generation, judging, analysis, quiz items. `lib.ts`: isolated `claude -p` and `codex` calls, with a cost log. Real thread text lives in the data folder (`DATA`, default `~/.trina/know-raw/chinese-voice-test`), not in the repo.
- `ids.json`: links to the 28 test threads, the 20 sample threads and the 54 political threads the check removed.
- `humanizer-zh-SKILL.md`: op7418/Humanizer-zh `SKILL.md` at commit f4518a8eab97b8bfebc66a89d34320a89bef6930 (2026-09-23), unchanged; MIT license in `humanizer-zh-LICENSE`.
- `outputs/<id>__<ARM>.txt`: every generated reply. `outputs/drafts/<id>.json`: SKILL's three drafts, their types and Haiku's pick.
- `judged/<judge>/<id>.json`: parsed scores and upvote ranks. `judged-raw/<judge>/<id>.txt`: each judge's answer as given.
- `analyze.out`: the full analysis output.

Cost: $3.19 in logged Claude calls (generation with picks $2.24, judging $0.86, political check and labelling $0.09), plus about $0.10 for the profile command's own labelling. Codex was never run.
