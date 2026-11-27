# Results (2026-11-26)

Verdict by the pre-registered rule: NO-GO. SKILL vs BLADER_S pass rate: Opus +0.0pt [-10.7, 10.7], Sonnet +3.6pt [-14.3, 21.4]; the rule needed +15pt with the interval above zero on 2 of 3 judges. GPT and Gemini had no login, so only 2 Claude judges ran.

What helped: real comment samples (BLADER_S vs BLADER: human probability +7.8 Opus, +14.0 Sonnet). Our guide on top of samples: +7.4 [3.5, 11.4] on Opus, +3.6 [-2.1, 9.9] on Sonnet, no change in pass rate, and a worse upvote rank. No AI reply was judged more human than the real comment on Opus (0/28 per arm).

```
## opus (n=28 posts)
arm       human%  pass%  upvote-rank
PLAIN        9.6    0.0      4.1
RULE        16.5    0.0      2.9
BLADER      17.3    3.6      3.1
BLADER_S    25.1    3.6      3.5
SKILL       32.5    3.6      4.1
HUMAN       84.5   92.9      3.2
SKILL - BLADER_S: pass 0.0pt [-10.7, 10.7], human 7.4 [3.5, 11.4], upvote rank better by -0.6
SKILL - RULE: pass 3.6pt [0.0, 10.7], human 16.0 [12.5, 19.4], upvote rank better by -1.2
BLADER_S - BLADER: pass 0.0pt [-10.7, 10.7], human 7.8 [3.6, 11.9], upvote rank better by -0.3
judged more human than the real comment: PLAIN 0/28, RULE 0/28, BLADER 0/28, BLADER_S 0/28, SKILL 0/28

## sonnet (n=28 posts)
arm       human%  pass%  upvote-rank
PLAIN       13.6    0.0      4.0
RULE        25.3    3.6      3.0
BLADER      25.1    7.1      2.5
BLADER_S    39.1   32.1      3.4
SKILL       42.8   35.7      3.7
HUMAN       81.0   96.4      4.4
SKILL - BLADER_S: pass 3.6pt [-14.3, 21.4], human 3.6 [-2.1, 9.9], upvote rank better by -0.3
SKILL - RULE: pass 32.1pt [14.3, 50.0], human 17.5 [11.1, 23.6], upvote rank better by -0.7
BLADER_S - BLADER: pass 25.0pt [3.6, 46.4], human 14.0 [5.6, 22.4], upvote rank better by -0.9
judged more human than the real comment: PLAIN 1/28, RULE 1/28, BLADER 2/28, BLADER_S 2/28, SKILL 1/28

## style (no AI), n=28
arm       words(median)  paragraphs  bullets%  bold%  emdash%
PLAIN          308         5.8      64.3   53.6     0.0
RULE           264         5.0      39.3    7.1     0.0
BLADER         226         4.6      21.4    7.1     0.0
BLADER_S       164         3.2       3.6    0.0     0.0
SKILL           78         1.0       0.0    0.0     0.0
HUMAN           43         2.4       0.0    0.0     3.6

[exited with code 0]
```

# Rounds 2-5 (development set, same 28 posts, prompts tuned on them, so not evidence)

Judges compare within a round, so only within-round differences count (the same PERSONA replies scored 42 in round 2 and 34 in round 3 on Opus).

| Round | Arm | Opus human | Sonnet human | Human comment (Opus/Sonnet) |
|---|---|---|---|---|
| 2 | PERSONA (behaviour persona only) | 42 | 48 | 79/75 |
| 2 | SKILL2 (5 typed drafts, Haiku pick, made-up anecdotes allowed) | 46 | 60 | |
| 3 | SKILL3 (3 typed drafts, no made-up experience, Haiku pick) | 41 | 42 | 80/72 |
| 3 | SKILL3R (one drawn type, no pick) | 32 | 34 | |
| 4 | SKILL3 again | 44 | 54 | 80/71 |
| 4 | SKILL4A / SKILL4 (rules from the Opus diagnostic; angles) | 31 / 32 | 35 / 35 | |
| 5 | SKILL3 again | 43 | 47 | 79/71 |
| 5 | SKILL5 (target length drawn from real lengths) | 35 | 38 | |

- Best and stable: SKILL3, Opus 41-44. The behaviour persona does most of it; picking among drafts adds some; a single drawn type adds nothing.
- Fixes taken from Opus's own explanations (normal case, "bring a specific", angles) made it worse: its stated reasons are not what drives its scores.
- Length: AI replies score lower the longer they are (Opus 11-25 words 50, 151+ words 14), but at equal length real comments score about 35 points higher. AI almost never writes 10 words or fewer (1 of 448); 14% of real top comments do.
- Head to head, Opus picks the AI reply 26/28 times (the 2 misses were human comments parodying AI).
- Made-up anecdotes: in round 2, Haiku picked "anecdote" 17/28 times; they were invented. Banned from round 3.

# Round 6: three judges, one round (development set)

Arms PLAIN, BLADER_S, SKILL3, HUMAN, judged by GPT-6 (codex exec, gpt-6-astra), Claude Opus and Claude Sonnet.

| Arm | GPT | Opus | Sonnet |
|---|---|---|---|
| PLAIN | 6 | 11 | 14 |
| BLADER_S | 18 | 25 | 40 |
| SKILL3 | 56 | 55 | 67 |
| HUMAN | 85 | 82 | 77 |

- GPT agrees with the Claude judges, so the gap is not only Claude spotting Claude.
- SKILL3 vs BLADER_S: +37 (GPT), +29 (Opus), +28 (Sonnet), intervals well above zero.
- SKILL3 vs HUMAN: -29 (GPT), -27 (Opus), -10 (Sonnet; interval just touches zero).
- Judged more human than the real comment: 5/28 (GPT), 3/28 (Opus), 7/28 (Sonnet).
- Upvote rank: judges would upvote BLADER_S more often (GPT 1.5 vs 2.9). Short and human-sounding costs some helpfulness.
- Still the development set: confirm on fresh posts before any claim.

# Fresh test (held-out posts, skill frozen at skill-v1), 2026-11-26

28 posts (Arctic Shift), judges GPT (codex), Opus, Sonnet. Pre-registered pass: SKILL3 beats BLADER_S on all three judges with the interval above zero. **PASSED.**

| F1 | GPT | Opus | Sonnet |
|---|---|---|---|
| PLAIN | 6 | 11 | 17 |
| BLADER_S | 15 | 25 | 33 |
| SKILL3 | 51 | 56 | 68 |
| HUMAN | 85 | 78 | 78 |
| SKILL3 - BLADER_S | +36.8 [27.5, 45.9] | +30.3 [23.8, 36.9] | +34.6 [26.9, 42.2] |
| SKILL3 - HUMAN | -33.9 | -22.8 | -10.2 |

- Same as the development round 6 (56/55/67), so the dev numbers were not overfit.
- F2 swap test (the real top comment rewritten by Sonnet, no HUMAN in the round): PARA 76 (GPT), 66 (Opus), 69 (Sonnet) vs SKILL3 57/58/70 in the same round. Real content in AI wording lands between our skill and the real comment: content is most of the gap for GPT and Opus. The judge prompt said some replies were human although none were, and the comparison with HUMAN is across rounds, so this is indicative.
- F3 pick control: a random one of the same three drafts scored 54 (Opus), 65 (Sonnet), 56 (GPT, only 15 of 28 judged, the rest failed) vs SKILL3 56/68/51 in F1. The Haiku pick adds about 1-3 points; random equalled Haiku's pick 7/28 times.

# Extra held-out arms (launch review), 2026-11-27
Opus / Sonnet on the 28 fresh posts: REWRITE (plain reply rewritten with humanizer) 12.2 / 13.2; BLADER_S 23.6 / 26.4; PERSONA alone 43.0 / 51.1; SKILL3 48.8 / 61.7; HUMAN 78.0 / 77.0. SKILL3 - PERSONA: +5.7 [-0.7, 12.5] (Opus), +10.6 [3.6, 17.8] (Sonnet). Korean in korean-voice-test (gfix.out): REWRITE 10.5 / 10.9, IMNOTAI_S 27.4 / 25.6, PERSONA 46.5 / 52.7, SKILL 51.0 / 63.9, HUMAN 87.3 / 85.9; SKILL - PERSONA +4.5 [-4.3, 13.3] / +11.2 [3.7, 18.4]. GPT hit its usage limit.

# Writer-model test (Opus vs Sonnet writing the same prompts), 2026-11-27
Opus-written minus Sonnet-written, per judge (GPT / Opus / Sonnet), bootstrap 95% interval:
- English comments (28): +5.4 [-9.2, 19.8] / +10.5 [2.1, 19.1] / +10.3 [1.5, 19.3]
- Korean comments (28): +0.3 [-10.6, 11.0] / +2.6 [-6.4, 11.8] / -2.0 [-10.6, 6.5]
- English posts (22): +0.8 [-3.4, 5.6] / +10.5 [7.0, 14.0] / +21.6 [15.8, 28.1]
- Korean posts (25, no political): +4.0 [1.0, 6.9] / +4.4 [1.9, 6.8] / +10.2 [2.0, 18.3]
No sign of Sonnet favouring its own writing: the Sonnet judge rated Opus-written text higher too. Opus-written is never worse; the shipped default writer becomes Opus, with --fast for Sonnet (the version in the main tables). Full output: writer.out.

# Round NS: no-ai-slop arm (held-out F1 threads), 2026-11-27
**This round has two judges (Claude Opus, Claude Sonnet), not F1's three: there is no GPT judge.** Its numbers are not directly comparable with the published F1 figures: 58 for community-humanizer, 24 for humanizer, 11 for plain Claude and 80 for the real comment are averages over GPT, Opus and Sonnet, and GPT is the strictest judge. Compare rows within this round only.

New arm NOAISLOP_S: [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) (13.8k stars, MIT, commit 000650b) `SKILL.md` pasted into the F1 BLADER_S prompt in place of blader's, with the same 10 real comments per thread, Sonnet writing. It was judged together with F1's PLAIN, BLADER_S, SKILL3 and HUMAN on the same 28 threads (all five at once, re-scored). The pre-registered rule (PROTOCOL.md, Round NS, written before generating) was that SKILL3 beats NOAISLOP_S on both judges with the bootstrap 95% interval above zero. **PASSED.**

| Round NS (28 threads) | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 11.6 | 15.2 | 13.4 |
| BLADER_S (blader/humanizer + 10 real comments) | 27.2 | 33.9 | 30.5 |
| NOAISLOP_S (no-ai-slop + the same 10) | 25.3 | 32.9 | 29.1 |
| SKILL3 (community-humanizer, Sonnet writing) | 61.4 | 69.0 | 65.2 |
| HUMAN (real top comment) | 79.2 | 79.6 | 79.4 |
| SKILL3 - NOAISLOP_S | +36.1 [29.8, 42.3] | +36.1 [28.1, 43.6] | +36.1 [29.7, 42.1] |
| SKILL3 - BLADER_S | +34.2 [27.5, 40.4] | +35.1 [27.3, 42.5] | +34.7 [28.4, 40.4] |
| NOAISLOP_S - BLADER_S | -1.9 [-5.4, 1.4] | -1.0 [-6.7, 4.6] | -1.5 [-5.3, 2.3] |
| SKILL3 - HUMAN | -17.8 [-26.8, -7.9] | -10.6 [-19.7, -0.6] | -14.2 [-22.7, -4.8] |

- no-ai-slop and blader/humanizer, given the same samples, land in the same place: the difference is under 2 points and inside the noise on both judges.
- Pass rate (50+): NOAISLOP_S 0% (Opus) / 18% (Sonnet), BLADER_S 4% / 18%, SKILL3 75% / 86%, HUMAN 89% / 89%.
- Judged more human than the real comment (strictly higher, no ties occurred): NOAISLOP_S 1/28 (Opus), 2/28 (Sonnet); BLADER_S 2/28 and 2/28; SKILL3 4/28 and 5/28; PLAIN 1/28 and 1/28.
- Upvote rank (1 = best of 5): Opus PLAIN 2.9, BLADER_S 2.9, NOAISLOP_S 2.4, SKILL3 3.2, HUMAN 3.6; Sonnet 3.3, 2.8, 2.1, 3.0, 3.8. Both judges would upvote no-ai-slop's longer replies most often, ahead of SKILL3 by 0.8-0.9. This is the same trade-off between sounding human and being helpful as in F1.
- Median length in words: PLAIN 272, BLADER_S 164, NOAISLOP_S 183, SKILL3 53, HUMAN 55 (characters 1,556 / 878 / 983 / 284 / 273). 14% of NOAISLOP_S replies have a bulleted or numbered list (BLADER_S 4%, SKILL3 0%), none have bold, and none have em dashes.
- Every NOAISLOP_S output was a plain comment. Neither the regex nor a read of all 28 found a "What changed" section, a request for a draft, or edit notes, so the planned check without such threads equals the main result.
- By subreddit, SKILL3 - NOAISLOP_S is positive in all five on both judges (Opus / Sonnet): ClaudeAI +47.2 / +39.8 (6 threads), smallbusiness +38.3 / +45.5 (6), startups +36.6 / +40.6 (5), SaaS +34.8 / +29.5 (6), selfhosted +21.4 / +23.8 (5).
- Re-scoring moved the F1 arms a little. The same two judges gave SKILL3 55.5 / 67.9, BLADER_S 25.3 / 33.3 and HUMAN 78.4 / 78.1 in F1, and 61.4 / 69.0, 27.2 / 33.9 and 79.2 / 79.6 here, with one more reply in the set. Scores are relative within a round.
- No judge failures: both judges scored all 28 threads on the first attempt. Models behind the aliases (from `modelUsage`): claude-sonnet-5-5 writing and judging, claude-opus-5-5 judging. F1 did not log model IDs.

Limits: both judges are Claude models, and Sonnet also wrote every AI arm. no-ai-slop is a skill for editing a draft the user pastes, so pasting it into a writing prompt is a substitute, as it was for blader's. It also refers to its `eval.md`, which the writer did not get. There is one reply per thread and arm.

Cost (from `total_cost_usd`): $1.84 over 84 calls. Generation took 28 calls ($0.83), the Opus judge $0.70 and the Sonnet judge $0.31.

Files: `noaislop.ts` (`gen`, `judge opus`, `judge sonnet`, `analyze`; real posts read from `WORK`, default `~/.trina/know-raw/reddit-voice-test`), `noaislop-SKILL.md` and `noaislop-LICENSE` (commit 000650b), `outputs/<id>__NOAISLOP_S.txt`, `judged-NS/<judge>/<id>.json` (scores and each judge's order), `judged-NS-raw/<judge>/<id>.txt` (raw answers), and `ns.out` (full analysis output). A copy of PROTOCOL.md taken before the first generation call, with its time and hash, is in the working folder (`PROTOCOL-NS-before-run.md`, `.stamp`).

# Round P: punctuation line (held-out F1 threads), 2026-11-27
**This round has two judges (Claude Opus, Claude Sonnet), not F1's three: there is no GPT judge.** Compare rows within this round only.

Why: native readers of the public quiz saw at once that our replies almost never end with sentence punctuation. 1 of 18 English AI replies ends with . ? ! against 10 of 18 real top comments, and the AI replies are one block more often. The AI judges never flagged it. The tested change, in `personaEn`, was "No greeting, no wrap-up, no list of tips, and you often skip the final period." to "No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do."

New arm SKILL3P: F1's SKILL3 generation with only that sentence changed. Same 28 threads, labelled pool, seeded type draws and examples; Sonnet writes three drafts and Haiku picks. The prompts came from `prompts.mjs` itself, and `punct.ts check` confirmed they equal `gen3.ts`'s byte for byte apart from that sentence. SKILL3P was judged with F1's PLAIN, BLADER_S and SKILL3 and the real comment, all five at once. The pre-registered rule (PROTOCOL.md, Round P, written before generating) had three parts. On both judges, (a) SKILL3P beats BLADER_S with the interval above zero, and (b) SKILL3P minus SKILL3 is at least -3. And (c) SKILL3P is closer to HUMAN than SKILL3 on at least 2 of 3 punctuation measures. **FAILED on (b) with the Sonnet judge (-5.0). The line is reverted: `prompts.mjs` is back to the measured version, so the shipped English line still says "you often skip the final period".**

| Round P (28 threads) | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 10.3 | 12.3 | 11.3 |
| BLADER_S (blader/humanizer + 10 real comments) | 24.7 | 33.8 | 29.2 |
| SKILL3 (old line, the shipped version) | 50.3 | 67.9 | 59.1 |
| SKILL3P (new punctuation line) | 49.7 | 62.9 | 56.3 |
| HUMAN (real top comment) | 78.0 | 78.5 | 78.3 |
| SKILL3P - BLADER_S | +25.0 [16.7, 32.7] | +29.1 [18.7, 38.1] | +27.0 [18.5, 34.5] |
| SKILL3P - SKILL3 | -0.6 [-8.1, 7.0] | -5.0 [-12.6, 3.1] | -2.8 [-9.2, 3.8] |
| SKILL3 - BLADER_S | +25.6 [17.9, 32.3] | +34.1 [25.4, 42.1] | +29.8 [22.1, 36.6] |
| SKILL3P - HUMAN | -28.3 [-38.6, -16.8] | -15.6 [-25.6, -4.5] | -22.0 [-31.7, -11.2] |
| SKILL3 - HUMAN | -27.7 [-36.9, -18.0] | -10.6 [-19.7, -0.9] | -19.2 [-27.5, -10.1] |

Punctuation (share of the 28 replies; definitions in PROTOCOL.md, Round P):

| | SKILL3 (old) | SKILL3P (new) | HUMAN | new closer to HUMAN |
|---|---|---|---|---|
| ends with . ? ! | 4% (1/28) | 86% (24/28) | 64% (18/28) | yes |
| any sentence punctuation | 89% (25/28) | 100% (28/28) | 82% (23/28) | no |
| a line break | 18% (5/28) | 46% (13/28) | 43% (12/28) | yes |

- The line did what it says. Final punctuation went from 4% to 86%, past the real comments' 64%, and line breaks went from 18% to 46% (real 43%). The judges did not reward it. Opus scored the two versions the same (-0.6), and Sonnet scored the new one 5.0 lower. Both intervals include zero, but the rule is on the mean.
- Pass rate (50+): SKILL3 43% (Opus) / 86% (Sonnet), SKILL3P 43% / 79%, BLADER_S 4% / 21%, HUMAN 89% / 93%. Judged more human than the real comment (strictly higher, no ties): SKILL3 5/28 and 5/28, SKILL3P 3/28 and 5/28. Upvote rank (1 = best of 5): SKILL3 3.2 / 2.8, SKILL3P 3.4 / 3.0, HUMAN 3.3 / 3.8.
- Median length: SKILL3P 58 words / 319 characters, SKILL3 53 / 284, HUMAN 55 / 273.
- The Haiku pick landed on the same comment type as SKILL3's in only 10 of 28 threads, so the difference mixes the line with pick variance. Post hoc, not the rule: in the 10 same-type threads SKILL3P - SKILL3 is -2.8 (Opus) / -10.2 (Sonnet); in the other 18 it is +0.6 / -2.1.
- Haiku refused to pick in 3 of 28 threads (1xxst6q, 1xzln70, 1y1im0b): it would not help AI text pass as a person's. The `gen3.ts` parse, which the shipped `voice.mjs` shares, then took the first number in the refusal, or draft 1 if there was none. That gave draft 1 twice and draft 2 once, from "B2B" in the refusal text. Without those 3 threads SKILL3P - SKILL3 is -1.8 (Opus) / -4.6 (Sonnet). One refusal named the working folder ("reddit-voice-test"), which the CLI shows the model through its working directory, as in F1. In the shipped tool the same parse means a refusal quietly picks a draft.
- Re-scoring noise: the same SKILL3 texts got 55.5 (F1), 61.4 (Round NS) and 50.3 (here) from Opus, and 67.9, 69.0 and 67.9 from Sonnet. Opus moves about 11 points between rounds on identical text, more than the -3 tolerance. There is one sample per thread.
- No judge failures, and all 112 generation calls ended normally (`end_turn`). Models (from `modelUsage`): claude-sonnet-5-5 (drafts and the Sonnet judge), claude-haiku-5-5 (pick), claude-opus-5-5 (Opus judge).
- What this leaves: the AI judges do not count missing punctuation against a reply, so a judge-scored round cannot credit the fix people asked for. Only people rating the replies, as in the quiz, can measure that.

Cost (from `total_cost_usd`): $1.67 over 168 calls. Drafts $0.77, picks $0.01, Opus judge $0.60, Sonnet judge $0.29.

Files: `punct.ts` (`check`, `gen`, `judge opus`, `judge sonnet`, `analyze`), `outputs/<id>__SKILL3P.txt` (kept as the record of the tested line; nothing shipped uses them), `judged-P/<judge>/<id>.json`, `judged-P-raw/<judge>/<id>.txt`, and `p.out` (full analysis output). The drafts, the picks and Haiku's raw answers are in the working folder (`drafts3p/<id>.json`). Also there: a copy of PROTOCOL.md taken before the first generation call (`PROTOCOL-P-before-run.md`, `.stamp`: 2026-11-27T12:36:51Z, sha256 9b610cf7…).
