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
