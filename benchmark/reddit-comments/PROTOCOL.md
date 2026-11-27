# Reddit voice test (written 2026-11-26, before any run)

Question: does a subreddit-voice skill (real comment samples from the same subreddit, voice rules, an AI-tell check) write replies that read more human and get picked more than plain Claude or a one-line "sound like a redditor" instruction?

Posts: 30 question posts from 2026-11-12 to 2026-11-24 in r/smallbusiness, r/SaaS, r/selfhosted, r/ClaudeAI, r/webdev (6 each), read through the Arctic Shift archive, with at least 10 comments and a top-level human comment scoring 5+ (not the poster, not AutoModerator). Picked by comment count, no hand picking.

Arms (Claude Sonnet, one reply each, post title + body as input, no tools):
- PLAIN: "Write a reply to this Reddit post in r/<sub>."
- RULE: the same plus "Make it sound like a real person in r/<sub> wrote it, not an AI."
- SKILL: voice rules (length, shape, openings, endings, AI-tell list) plus 10 top-level comments scoring 5+ from OTHER recent threads in the same subreddit (never from the test post's thread), then a self-check against the AI-tell list.
- HUMAN: the post's highest-scoring top-level human comment (control).

Judging, blind (the 4 replies shuffled, labelled A-D), two judges (Claude Opus, Claude Sonnet), no tools:
1. For each reply: probability that a human wrote it (0-100).
2. Rank the 4 by which you would upvote as a reader of r/<sub>.

Primary: mean "human" probability, SKILL vs RULE (paired by post, bootstrap 95% CI). Secondary: upvote rank; how often SKILL is judged more human than the real HUMAN comment. A human rater pass is added if people are available.

Pass: SKILL beats RULE on the primary with the interval above zero, and does not rank worse than RULE on upvotes.

## Amendment (2026-11-26, after the independent review, before any run)

The review (~/.trina/know-raw/community-humanizer-review.md) named the cheapest real substitute: blader/humanizer plus a one-line instruction, plus a few real comments. Arms now:
- PLAIN and RULE as above.
- BLADER: blader/humanizer SKILL.md (blader-SKILL.md, commit noted in git log) + the RULE line.
- BLADER_S: BLADER + the same 10 samples the SKILL arm gets.
- SKILL as above.
- HUMAN as above.
Primary comparison is now SKILL vs BLADER_S (same samples, so the difference is our measured guide vs blader's rules). Judges: Claude Opus, GPT (codex CLI), Gemini (gemini CLI); a reply counts as "passed" when its human probability is 50 or more. Pass: SKILL beats BLADER_S by 15 points or more in pass rate with the bootstrap interval above zero, on 2 of 3 judges. Otherwise no-go.
Posts come from BrightData (collect_by_url) for the r/smallbusiness, r/SaaS, r/selfhosted, r/ClaudeAI, r/startups question posts listed in cands.jsonl (top 6 per subreddit by comments; the other 10 per subreddit give the samples).

## Round 2 (2026-11-26, development only)

After the no-go, the founder set the goal at the real-comment level (~81). Levers from online-voice-papers.md: a behaviour persona (Jones & Bergen 2025), 5-10 real samples, many drafts with a pick, comment types at community rates. These 28 posts are now the DEVELOPMENT set: prompts may be tuned on them, so their numbers are not evidence. Any claim needs a fresh set of posts collected after the prompts are frozen.
Arms: BLADER_S, SKILL (round 1), PERSONA (behaviour persona only, the cheap substitute), SKILL2 (5 drafts, types drawn at the subreddit's measured rates, typed samples, persona; Haiku picks). Judges Opus and Sonnet, which never pick drafts. Output in judged2/.

## Fresh test (2026-11-26, written before collection finished; skill frozen at tag skill-v1)

Posts: the next 10 question posts per subreddit by comment count (ranks 17-26, 11/12-11/24), none used in the development set or as its samples; up to 6 per subreddit with a human top-level comment of 5+ points. Samples for BLADER_S and SKILL3 come from the other fresh threads and the development threads, never the post's own thread. Prompts are exactly skill-v1/gen.ts and gen.ts; no changes after seeing any fresh result.
- F1 (primary): PLAIN, BLADER_S, SKILL3, HUMAN. Judges GPT (codex), Opus, Sonnet. Pass: SKILL3 beats BLADER_S on all three judges with the bootstrap interval above zero. Report SKILL3 vs HUMAN as it comes.
- F2 (swap test): PLAIN, BLADER_S, SKILL3, PARA, where PARA is Sonnet rewriting the real top comment in its own words, same points and about the same length. No HUMAN in this round, so the judge never sees both versions. If PARA scores near HUMAN's F1 level, the gap is content; if near SKILL3, it is wording fingerprints.
- F3 (pick control): PLAIN, BLADER_S, SKILL3RND, HUMAN, where SKILL3RND is a seeded random one of SKILL3's own three drafts. Compare with SKILL3 in F1.
- Change before any fresh result (2026-11-26): BrightData returned no comments (no_peers, 50 errors), so fresh posts and their human comments come from Arctic Shift (build-fresh-as.ts). Usernames are not stored. Everything else as above.

## Extra held-out arms (2026-11-27, after the launch review, before running them)
On the 28 fresh posts: REWRITE (plain Claude's reply rewritten with blader/humanizer, used as the rewriting skill it is) and PERSONA (the behaviour persona alone, no samples or types). Judged in one round with BLADER_S, SKILL3 and HUMAN by GPT, Opus and Sonnet (judged-G). Report SKILL3 vs each.

## Writer-model test (2026-11-27, before running)
Question: is Sonnet's higher score partly Sonnet judging its own writing? Same prompts, drafts written by Opus instead of Sonnet (Haiku still picks), on the fresh 28 (SKILL3_OPUS), the Korean 28 (SKILL_OPUS) and the post holdout without political posts (MESSY_OPUS). Each judged with the Sonnet-written version, the humanizer arm and HUMAN by GPT, Opus and Sonnet (judged-W). Self-preference shows as each Claude judge favouring its own model's text; GPT is the neutral judge.

## Round NS: no-ai-slop arm (2026-11-27, written before generating)
Question: on the 28 held-out F1 threads, does SKILL3 also beat petergyang/no-ai-slop when that skill gets the same 10 real comments, as it beat blader/humanizer?

Comparison skill: [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) `skills/no-ai-slop/SKILL.md` at commit 000650b156983f5159695b441477f4e63b25dc85 (2026-09-02, the newest commit on 2026-11-27), MIT, 13.8k stars. It is copied as `noaislop-SKILL.md`, with its license in `noaislop-LICENSE`. Known before the run: it is an editing skill. It edits a draft the user pastes, returns the edited draft plus a "What changed" section, and asks for a draft if there isn't one. It also tells the editor to check its work against the repo's `eval.md`, which the writer does not get. As with blader's, Humanizer-zh and humanizer-indonesia, only SKILL.md is passed, and the writer has no tools. It was not built to write Reddit replies; pasting SKILL.md into the writing prompt with real samples is the same cheap substitute used for blader.

Arms:
- NOAISLOP_S (new): the `gen.ts` BLADER_S prompt word for word, with `noaislop-SKILL.md` in place of `blader-SKILL.md`. That is: the post, "Write a reply to this Reddit post in r/<sub>.", the RULE line, "Use this writing skill:", the skill inside `<skill>` tags, the same 10 samples, then "Reply with the final comment text only." The 10 samples are each thread's `samples` in `posts-fresh.json` (built by `build-fresh-as.ts`, unchanged since working-folder commit 63e791a), the exact ones F1's BLADER_S got. Claude Sonnet (`--model sonnet`) writes one reply per thread, through `claude -p` with `gen.ts`'s isolation flags: no tools, no slash commands, an empty MCP config, project settings only, `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1`, run from an empty folder. A call that returns an error or an empty result is retried, up to 3 attempts. Returned text is kept exactly as returned: never regenerated, edited or dropped.
- PLAIN, BLADER_S, SKILL3: the F1 outputs (`outputs/<id>__<ARM>.txt`), unchanged. HUMAN: the real top comment in `posts-fresh.json`.

Judging (`judged-NS/`): judges see all five versions of a thread at once, labelled A-E. Each judge gets its own seeded order: `order()` of `judge.ts` over PLAIN, BLADER_S, NOAISLOP_S, SKILL3, HUMAN, with seed `<id>:<judge>:NS`. The prompt is `judge.ts` word for word. The judges are Claude Opus and Claude Sonnet only (no GPT), isolated as above, with two attempts per thread. A thread a judge fails twice is reported and left out of that judge's numbers. Every raw answer is saved in `judged-NS-raw/<judge>/`, and parsed scores in `judged-NS/<judge>/<id>.json`. Judges score relative to the other replies in the same round, and F1 had three judges including GPT. So this round's numbers are not directly comparable with F1's published ones, and F1's arms are re-scored here for the within-round comparison.

Measure: mean human probability (0-100) per arm and judge. The differences SKILL3 - NOAISLOP_S and SKILL3 - BLADER_S are paired by thread, with a bootstrap 95% interval (10,000 resamples, `boot()` of `analyze.ts`).

**Pass: SKILL3 beats NOAISLOP_S on both judges (Opus and Sonnet), with the bootstrap 95% interval of SKILL3 - NOAISLOP_S above zero on both. Otherwise no-go.** Both judges are Claude models, and Sonnet also wrote every AI arm. That limit is known and is reported.

Reported as it comes:
- NOAISLOP_S - BLADER_S and SKILL3 - HUMAN, with intervals.
- Each arm's mean per judge and over the two judges.
- Pass rate (50+) and upvote rank.
- How often each AI arm is judged more human than HUMAN (strictly higher; ties counted apart).
- Median length in words and characters, and the shares with bullets, bold and em dashes.
- Which NOAISLOP_S outputs contain text that is not the comment, such as a "What changed" section, a request for a draft, or notes about the edit. These are found by a regex and by reading all 28, and listed by id. As a sensitivity check (not the rule), the pass rule is also computed without those threads.
- Judge failures; cost from `total_cost_usd`; the model IDs behind the aliases, from `modelUsage`.

Script: `noaislop.ts` (`gen`, `judge opus`, `judge sonnet`, `analyze`). Budget: about $10 of model calls.

## Round P: punctuation line (2026-11-27, written before generating)
Why: native readers of the public quiz (quiz.trina.app) found a giveaway the AI judges never flagged. Our replies almost never end with sentence punctuation: 1 of 18 English AI replies ends with . ? ! against 10 of 18 real top comments. They are also one block with no line break more often than real comments. The likely cause is the persona's last clause, "and you often skip the final period". Reviews: `research/community-humanizer-launch/quiz-review/{en,ko}.md` (outside this repo).

Change, and nothing else in `skills/community-humanizer/lib/prompts.mjs`: in `personaEn`, "No greeting, no wrap-up, no list of tips, and you often skip the final period." becomes "No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do." Reddit replies in every language use `personaEn`, so zh/es/id/ja Reddit replies change too. They are re-tested later, not in this round. The Korean line (`personaKo`) has its own Round P in `korean-comments/PROTOCOL.md`. Each line is kept or reverted on its own language's rule.

Arms:
- SKILL3P (new): F1's SKILL3 generation (`gen3.ts` with `POSTS=posts-fresh.json`) with only that sentence changed. Same 28 F1 threads, same labelled pool (`types.json` over `bd/comments.json`, test threads left out, 2+ upvotes), same seeded draw of 3 comment types per thread (`rng(<id>)`), the same 6 typed examples per type. Claude Sonnet writes the three drafts and Claude Haiku picks one with `gen3.ts`'s pick prompt. The prompts are built by `prompts.mjs` itself (`replyPrompt`, `replyPick`), so the round runs the shipped code. Before the edit, `punct.ts check` showed that on all 28 threads `prompts.mjs` gives `gen3.ts`'s 84 draft prompts and 28 pick prompts byte for byte, that the type draws equal F1's `drafts3/<id>.json`, and that `outputs/<id>__SKILL3.txt` is F1's picked draft. After the edit, the same check must show the persona sentence as the only difference. Isolation flags as `gen.ts`. A call that fails or comes back empty is retried, up to 3 attempts (as the shipped `claude.mjs`). Text is kept as returned (trimmed), never regenerated, edited or dropped. Drafts and the pick go to `drafts3p/<id>.json` in the working folder.
- PLAIN, BLADER_S, SKILL3: the F1 outputs, unchanged. HUMAN: the real top comment.

Judging (`judged-P/`): Claude Opus and Claude Sonnet only (no GPT), all five versions of a thread at once, labelled A-E. The prompt is `judge.ts` word for word. Each judge gets its own seeded order: `order()` over PLAIN, BLADER_S, SKILL3, SKILL3P, HUMAN with seed `<id>:<judge>:P`. Two attempts per thread; a thread a judge fails twice is reported and left out of that judge's numbers. Raw answers in `judged-P-raw/<judge>/`, scores in `judged-P/<judge>/<id>.json`. Both judges are Claude and Sonnet wrote every AI arm. Numbers are compared within this round only.

Measures:
- Mean human probability (0-100) per arm and judge. Paired by thread with a bootstrap 95% interval (10,000 resamples, `boot()` of `analyze.ts`): SKILL3P - BLADER_S, SKILL3P - SKILL3, SKILL3 - BLADER_S, and each of SKILL3 and SKILL3P minus HUMAN.
- Punctuation, as the share of the 28 replies, for SKILL3, SKILL3P and HUMAN (PLAIN and BLADER_S for reference). Definitions are in `punct.ts`:
  1. ends with sentence punctuation: after trimming whitespace and trailing closing quotes or brackets, the last character is . ? ! or … (or full-width 。？！);
  2. any sentence punctuation: one of those characters followed by whitespace, a closing quote or bracket, or the end of the text (so "3.5" and "example.com" don't count);
  3. a line break: the trimmed text contains a newline.
  On the outputs that exist before this round, these give SKILL3 1/28, 25/28, 5/28 and HUMAN 18/28, 23/28, 12/28. The definitions were fixed after looking at the old arm and HUMAN only, before any SKILL3P text existed. SKILL3P is "closer to HUMAN" on a measure when |SKILL3P - HUMAN| < |SKILL3 - HUMAN| (strictly).

**Pass (keep the new `personaEn` line): on both judges, (a) SKILL3P beats BLADER_S with the bootstrap 95% interval of SKILL3P - BLADER_S above zero, and (b) mean SKILL3P minus mean SKILL3 is at least -3 points; and (c) SKILL3P is closer to HUMAN than SKILL3 on at least 2 of the 3 punctuation measures. Otherwise the line is reverted in `prompts.mjs`.** There is one sample per thread, so SKILL3P - SKILL3 carries sampling noise; the -3 tolerance is set with that in mind.

Reported as it comes: pass rate (50+), upvote rank, how often each AI arm is judged more human than HUMAN, median length, how often SKILL3P's picked comment type equals SKILL3's, judge failures, cost from `total_cost_usd`, and the model IDs from `modelUsage`.

Script: `punct.ts` (`check`, `gen`, `judge opus`, `judge sonnet`, `analyze`). Budget: about $5 of model calls for both languages.
