# Korean community voice test (written 2026-11-26, before any run)

Same question as the Reddit test, in Korean: does the skill (behaviour persona + 3 drafts of comment types drawn at the board's measured rates, typed real samples, Haiku picks, no made-up experience) read more like a real commenter than plain Claude or the top Korean humanizer (epoko77-ai/im-not-ai, 6.8k stars) given the same samples?

Source: Clien (clien.net) 모두의공원 (park) and 아무거나질문 (kin), list pages read with plain HTTP, 2 s between requests. Question posts only (title with ?, 나요, 까요, 는지, 어떻게, 어떤, 추천, 궁금). Up to 14 test posts per board, picked by comment count, each with a top-level comment from someone other than the poster with the most 공감 (at least 2 on park, at least 1 on kin). Other candidate threads give samples and type rates; a test post's own thread never does. Usernames are not stored.

Arms (Claude Sonnet, no tools, isolated):
- PLAIN: "이 클리앙 <게시판> 글에 댓글을 써 줘."
- IMNOTAI_S: PLAIN + "AI가 쓴 티 안 나게, 그 게시판 사람이 쓴 것처럼" + im-not-ai's skills/humanize-korean/SKILL.md + the same 10 samples.
- SKILL: the Korean version of skill v1 (persona translated, comment types, typed samples, Haiku pick).
- HUMAN: the real top comment.
Judges: GPT (codex), Opus, Sonnet, blind, 4 replies shuffled per judge, human probability 0-100 and upvote rank, in Korean. Primary: SKILL vs IMNOTAI_S, all three judges, bootstrap interval above zero. A human pass by the founder (native speaker) through a 2-choice quiz comes after.
- Change before any generation (2026-11-26): political threads are excluded (keyword list in collect.ts, applied to the title, the post body and the top comment). The park board's first pick was mostly politics; writing human-sounding political comments is the misuse this tool must not serve. The 40 highest-comment non-political candidates per board are read; samples come only from these non-political threads too.
- Extra arms (2026-11-27, before running): REWRITE (plain reply rewritten with im-not-ai as the rewriting skill) and PERSONA (Korean persona alone). Judged with IMNOTAI_S, SKILL and HUMAN by GPT, Opus and Sonnet (judged-G).

## Round P: punctuation line (2026-11-27, written before generating)
Why: native readers of the public quiz (quiz.trina.app) found a giveaway the AI judges never flagged. In the Korean comment items, 0 of 26 AI replies end with . ? ! (humans 18 of 26). 20 of 24 have no sentence punctuation at all (humans 5 of 24), and 13 of 24 run two or three sentences together with only a space. The AI replies are also one block with no line break more often than real ones. The likely cause is the persona's last sentence, "마침표는 자주 안 찍어." Review: `research/community-humanizer-launch/quiz-review/ko.md` (outside this repo).

Change, and nothing else in `skills/community-humanizer/lib/prompts.mjs`: in `personaKo`, "마침표는 자주 안 찍어." becomes "문장부호와 줄바꿈은 아래 실제 댓글들이 하는 대로 해." The English line has its own Round P in `reddit-comments/PROTOCOL.md`. Each line is kept or reverted on its own language's rule.

Arms:
- SKILLP (new): the SKILL arm's generation (`ko.ts gen`) with only that sentence changed. Same 28 held-out threads (`posts.json`), same labelled pool (non-political, non-test threads from `raw/`, `types.json`), the same seeded draw of 3 comment types per thread (`rng(<id>)`), the same 6 typed examples per type. Claude Sonnet writes the three drafts and Claude Haiku picks one with `ko.ts`'s pick prompt. The prompts are built by `prompts.mjs` itself (`replyPrompt`, `replyPick`), so the round runs the shipped code. Before the edit, `punct.ts check` showed that on all 28 threads `prompts.mjs` gives `ko.ts`'s 84 draft prompts and 28 pick prompts byte for byte, that the type draws equal `drafts/<id>.json`, and that `outputs/<id>__SKILL.txt` is the picked draft. After the edit, the same check must show the persona sentence as the only difference. Isolation flags as `ko.ts`. A call that fails or comes back empty is retried, up to 3 attempts (as the shipped `claude.mjs`). Text is kept as returned (trimmed), never regenerated, edited or dropped. Drafts and the pick go to `drafts-p/<id>.json` in the working folder.
- PLAIN, IMNOTAI_S, SKILL: the outputs judged in the first round, unchanged. HUMAN: the real top comment.

Judging (`judged-P/`): Claude Opus and Claude Sonnet only (no GPT), all five versions of a thread at once, labelled A-E. The prompt is `ko.ts`'s judge prompt word for word (human probability and 공감 order). Each judge gets its own seeded order: `order()` over PLAIN, IMNOTAI_S, SKILL, SKILLP, HUMAN with seed `<id>:<judge>:P`. Two attempts per thread; a thread a judge fails twice is reported and left out of that judge's numbers. Raw answers in `judged-P-raw/<judge>/`, scores in `judged-P/<judge>/<id>.json`. Both judges are Claude and Sonnet wrote every AI arm. Numbers are compared within this round only.

Measures:
- Mean human probability (0-100) per arm and judge. Paired by thread with a bootstrap 95% interval (10,000 resamples, `boot()` of `ko.ts`): SKILLP - IMNOTAI_S, SKILLP - SKILL, SKILL - IMNOTAI_S, and each of SKILL and SKILLP minus HUMAN.
- Punctuation, as the share of the 28 replies, for SKILL, SKILLP and HUMAN (PLAIN and IMNOTAI_S for reference). Definitions are in `punct.ts`:
  1. ends with sentence punctuation: after trimming whitespace and trailing closing quotes or brackets, the last character is . ? ! or … (or full-width 。？！);
  2. any sentence punctuation: one of those characters followed by whitespace, a closing quote or bracket, or the end of the text;
  3. a line break: the trimmed text contains a newline;
  4. sentences run together: somewhere a sentence ending at the end of a word (요, 죠, 니다, 습니까/ㅂ니까, common plain -다 endings, 듯, and 음슴체 남/함/됨) is followed by only spaces on the same line and then another word. Nouns ending in 요 (필요, 중요, 주요, 수요 ...), words such as 처음, 다음, 게임, and connective forms ("-다 보니", "-ㄹ 듯 합니다") don't count.
  On the outputs that exist before this round, these give SKILL 1/28, 6/28, 2/28, 16/28 and HUMAN 20/28, 22/28, 10/28, 2/28. Reading every match in SKILL and HUMAN found no false hit beyond "알겠죠 뭐" (a trailing 뭐). The review counted 13 of 24 run-ons by hand on the quiz's subset. The definitions were fixed after looking at the old arm and HUMAN only, before any SKILLP text existed. SKILLP is "closer to HUMAN" on a measure when |SKILLP - HUMAN| < |SKILL - HUMAN| (strictly).

**Pass (keep the new `personaKo` line): on both judges, (a) SKILLP beats IMNOTAI_S with the bootstrap 95% interval of SKILLP - IMNOTAI_S above zero, and (b) mean SKILLP minus mean SKILL is at least -3 points; and (c) SKILLP is closer to HUMAN than SKILL on at least 2 of the 4 punctuation measures. Otherwise the line is reverted in `prompts.mjs`.** There is one sample per thread, so SKILLP - SKILL carries sampling noise; the -3 tolerance is set with that in mind.

Reported as it comes: pass rate (50+), 공감 rank, how often each AI arm is judged more human than HUMAN, median length, how often SKILLP's picked comment type equals SKILL's, judge failures, cost from `total_cost_usd`, and the model IDs from `modelUsage`.

Script: `punct.ts` (`check`, `gen`, `judge opus`, `judge sonnet`, `analyze`).
