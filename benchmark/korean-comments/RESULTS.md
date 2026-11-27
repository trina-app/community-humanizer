# Korean comment test results (Clien, 28 posts, political threads excluded), 2026-11-26/27

| | GPT | Opus | Sonnet |
|---|---|---|---|
| PLAIN | 6 | 11 | 11 |
| IMNOTAI_S (im-not-ai + 10 real comments) | 23 | 33 | 35 |
| SKILL (Korean skill v1) | 54 | 61 | 71 |
| HUMAN (top comment by 공감) | 95 | 87 | 85 |
| SKILL - IMNOTAI_S | +31.6 [21.2, 41.6] | +27.6 [18.9, 36.2] | +36.5 [27.5, 44.9] |

Primary rule (SKILL beats IMNOTAI_S on all three judges, interval above zero): passed. Median length: PLAIN 436 chars, IMNOTAI_S 142, SKILL 68, HUMAN 63. In pairs, Opus ranks the real comment above SKILL 26/28 times, Sonnet 22/28. Full output in ko.out.
