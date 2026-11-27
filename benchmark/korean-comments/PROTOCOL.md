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
