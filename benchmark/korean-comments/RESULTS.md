# Korean comment test results (Clien, 28 posts, political threads excluded), 2026-11-26/27

| | GPT | Opus | Sonnet |
|---|---|---|---|
| PLAIN | 6 | 11 | 11 |
| IMNOTAI_S (im-not-ai + 10 real comments) | 23 | 33 | 35 |
| SKILL (Korean skill v1) | 54 | 61 | 71 |
| HUMAN (top comment by 공감) | 95 | 87 | 85 |
| SKILL - IMNOTAI_S | +31.6 [21.2, 41.6] | +27.6 [18.9, 36.2] | +36.5 [27.5, 44.9] |

Primary rule (SKILL beats IMNOTAI_S on all three judges, interval above zero): passed. Median length: PLAIN 436 chars, IMNOTAI_S 142, SKILL 68, HUMAN 63. In pairs, Opus ranks the real comment above SKILL 26/28 times, Sonnet 22/28. Full output in ko.out.

# Round P: punctuation line (Korean held-out threads), 2026-11-27
**This round has two judges (Claude Opus, Claude Sonnet), not the first round's three: there is no GPT judge.** Compare rows within this round only.

Why: native readers of the public quiz saw at once that our Korean comments have no sentence punctuation. 0 of 26 AI comments end with . ? ! (humans 18 of 26), and 20 of 24 have none at all (humans 5 of 24). In 13 of 24, two or three sentences run together with only a space. The AI judges never flagged it. The tested change, in `personaKo`, was "마침표는 자주 안 찍어." to "문장부호와 줄바꿈은 아래 실제 댓글들이 하는 대로 해."

New arm SKILLP: the SKILL arm's generation (`ko.ts gen`) with only that sentence changed. Same 28 threads, labelled pool, seeded type draws and typed examples; Sonnet writes three drafts and Haiku picks. The prompts came from `prompts.mjs` itself, and `punct.ts check` confirmed they equal `ko.ts`'s byte for byte apart from that sentence. SKILLP was judged with PLAIN, IMNOTAI_S and SKILL from the first round and the real comment, all five at once. The pre-registered rule (PROTOCOL.md, Round P, written before generating) had three parts. On both judges, (a) SKILLP beats IMNOTAI_S with the interval above zero, and (b) SKILLP minus SKILL is at least -3. And (c) SKILLP is closer to HUMAN than SKILL on at least 2 of 4 punctuation measures. **FAILED on (b) with both judges (-8.7 Opus, -9.7 Sonnet). The line is reverted: `prompts.mjs` is back to the measured version, so the shipped Korean line still says "마침표는 자주 안 찍어."**

| Round P (28 threads) | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 9.2 | 12.6 | 10.9 |
| IMNOTAI_S (im-not-ai + 10 real comments) | 29.3 | 37.1 | 33.2 |
| SKILL (old line, the shipped version) | 51.9 | 67.5 | 59.7 |
| SKILLP (new punctuation line) | 43.2 | 57.8 | 50.5 |
| HUMAN (top comment by 공감) | 87.5 | 87.3 | 87.4 |
| SKILLP - IMNOTAI_S | +14.0 [7.9, 20.6] | +20.8 [12.9, 28.8] | +17.4 [11.0, 24.0] |
| SKILLP - SKILL | -8.7 [-19.7, 2.4] | -9.7 [-20.5, 0.6] | -9.2 [-19.6, 1.0] |
| SKILL - IMNOTAI_S | +22.7 [13.8, 31.6] | +30.5 [19.6, 40.6] | +26.6 [18.0, 34.9] |
| SKILLP - HUMAN | -44.3 [-51.5, -36.4] | -29.5 [-38.3, -20.7] | -36.9 [-44.2, -29.6] |
| SKILL - HUMAN | -35.6 [-43.6, -27.4] | -19.8 [-29.4, -10.6] | -27.7 [-35.3, -20.2] |

Punctuation (share of the 28 comments; definitions in PROTOCOL.md, Round P):

| | SKILL (old) | SKILLP (new) | HUMAN | new closer to HUMAN |
|---|---|---|---|---|
| ends with . ? ! | 4% (1/28) | 79% (22/28) | 71% (20/28) | yes |
| any sentence punctuation | 21% (6/28) | 93% (26/28) | 79% (22/28) | yes |
| a line break | 7% (2/28) | 4% (1/28) | 36% (10/28) | no |
| sentences run together | 57% (16/28) | 4% (1/28) | 7% (2/28) | yes |

- The line fixed the punctuation: periods and question marks now look like the real comments', and run-ons are gone. The one SKILLP run-on hit ("지웠다 깔았다 반복 중입니다") is a false positive of the pattern, so the true count is 0/28. It did not bring line breaks: 4% against the real comments' 36%. Both judges scored the punctuated version lower, by about 9 points. Both intervals just include zero, but the rule is on the mean.
- Pass rate (50+): SKILL 43% (Opus) / 75% (Sonnet), SKILLP 29% / 71%, IMNOTAI_S 4% / 21%, HUMAN 100% / 100%. Judged more human than the real comment: SKILL 1/28 and 5/28; SKILLP 1/28 (plus 1 tie) and 2/28. 공감 rank (1 = best of 5): SKILL 3.1 / 2.4, SKILLP 3.3 / 2.8, HUMAN 1.8 / 2.1.
- Median length: SKILLP 84 characters, SKILL 68, HUMAN 63, IMNOTAI_S 142, PLAIN 436.
- The Haiku pick landed on the same comment type as SKILL's in only 11 of 28 threads. Post hoc, not the rule: in those 11 threads SKILLP - SKILL is -3.4 (Opus) / -1.9 (Sonnet); in the other 17 it is -12.2 / -14.8. Much of the drop comes with a different picked type, not with punctuation alone, but the data can't separate the two.
- Re-scoring noise: the same SKILL texts got 61 (first round, four arms), 51.0 (extra arms round) and 51.9 (here) from Opus, and 71, 63.9 and 67.5 from Sonnet. There is one sample per thread.
- No judge failures and no Haiku refusals. All 112 generation calls ended normally (`end_turn`). Models (from `modelUsage`): claude-sonnet-5-5 (drafts and the Sonnet judge), claude-haiku-5-5 (pick), claude-opus-5-5 (Opus judge).
- What this leaves: the AI judges do not count the missing periods and run-ons against a comment, so a judge-scored round cannot credit the fix people asked for. Only people rating the comments, as in the quiz, can measure that.

Cost (from `total_cost_usd`): $2.19 over 168 calls. Drafts $1.04, picks $0.02, Opus judge $0.77, Sonnet judge $0.36.

Files: `punct.ts` (`check`, `gen`, `judge opus`, `judge sonnet`, `analyze`; real posts read from `WORK`, default `~/.trina/know-raw/korean-voice-test`), `outputs/<id>__SKILLP.txt` (kept as the record of the tested line; nothing shipped uses them), `judged-P/<judge>/<id>.json`, `judged-P-raw/<judge>/<id>.txt`, and `p.out` (full analysis output, with every run-on match). The drafts, the picks and Haiku's raw answers are in the working folder (`drafts-p/<id>.json`). Also there: a copy of PROTOCOL.md taken before the first generation call (`PROTOCOL-P-before-run.md`, `.stamp`: 2026-11-27T12:36:52Z, sha256 2b334c51…).
