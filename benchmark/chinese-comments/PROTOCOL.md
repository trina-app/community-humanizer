# Chinese (Simplified) comment test (written 2026-11-27, before any thread was collected)

Question: on a held-out set of Simplified Chinese Reddit threads, does the shipped community-humanizer reply path read more like a real commenter than plain Claude and than the top Chinese humanizer skill (op7418/Humanizer-zh, about 24k stars) given the same real samples? Same design as the English fresh test (`../reddit-comments/PROTOCOL.md`, "Fresh test", F1) and the Korean test (`../korean-comments/PROTOCOL.md`). Nothing is tuned on these threads: the prompts are the shipped ones, word for word, and nothing changes after any result is seen.

## Community and rules

r/China_irl, the largest Chinese-language subreddit. Its rules were read on 2026-11-27 before collection (https://www.reddit.com/r/China_irl/about/rules.json). No rule bans AI-written content; rule 保证发帖质量 (d) asks that AI-generated content be declared ("在发布由 AI 生成的内容时，应主动进行声明"). The benchmark posts nothing, so it runs; the rule goes into the community profile and the limits.

## Threads

Source: the Arctic Shift archive (posts/search, comments/tree), one request at a time with a pause of at least 2.5 s, backing off on throttling. Usernames are not stored. Real text stays in a working folder outside the repo; the repo keeps links only (`ids.json`).

- Window: posts created 2026-11-01 to 2026-11-24 (UTC), so every thread is at least two days old and its scores have settled. If that window gives fewer than 28 test threads plus 12 sample threads, the start moves back to 2026-10-01, then to 2026-09-01. The narrowest window that is enough is used.
- Eligible: text (self) posts, not removed or deleted, not NSFW, 10+ comments. Link and image posts are left out because the writers cannot see the link or image.
- Political filter: every eligible thread, in order of comment count, goes through the tool's own check (`GUARD` in `skills/community-humanizer/lib/prompts.mjs`, Claude Haiku, title + body; anything but a clear "no" counts as political). Political threads are removed and counted. They are never used as test threads or as samples.
- Test threads: walking down the non-political threads by comment count, the first 28 that have a top-level human comment of 5+ points (not the poster, not AutoModerator, not deleted or removed, with at least 2 characters of text once links and images are stripped). No hand picking. HUMAN is that thread's highest-scoring such comment.
- Sample threads: the next 12 non-political threads after the 28th test thread, plus any non-political thread passed in the walk for lacking a 5+ comment. A test thread never gives samples, to itself or any other arm.
- Sample pool: top-level comments with 2+ points in the sample threads (the tool's rule), same author and text rules as above.
  - The 10 samples for HUMANIZER_S follow the English fresh rule (`build-fresh-as.ts`): 5+ points, highest first, at most 3 per thread taken round-robin, cut to 600 characters. Every test thread gets the same 10.
  - For SKILL, the 160 highest-scoring pool comments are labelled by type with the tool's `LABEL` prompt (Sonnet, batches of 40), as `voice.mjs` does. Type rates are counted from this labelled pool, as in the English SKILL3 and Korean SKILL arms (the tool uses the same counts when a community has no profile).

## Arms (Claude Sonnet writes, no tools, isolated `claude -p` from an empty folder, as in the published tables)

- PLAIN: `../reddit-comments/gen.ts` PLAIN, word for word ("Write a reply to this Reddit post in r/China_irl. Reply with the final comment text only.").
- HUMANIZER_S: `gen.ts` BLADER_S, word for word, with op7418/Humanizer-zh's SKILL.md (`humanizer-zh-SKILL.md`, commit f4518a8eab97b8bfebc66a89d34320a89bef6930, 2026-09-23) in place of blader's, plus the 10 samples.
- SKILL: the shipped reply path for a Reddit link (`replyPrompt('en', ...)` and `replyPick('en', ...)` imported unchanged from `skills/community-humanizer/lib/prompts.mjs`, `drawTypes` as in `bin/voice.mjs`): 3 drafts of types drawn at the pool's rates (seeded by the post id, types with at least 2 examples), the 6 highest-scoring pool comments of each type as examples (400 characters each), Haiku picks one. Sonnet writes (the shipped `--fast` writer, the model in the main English and Korean tables). The tool's prompts are English for every subreddit; that is the shipped behaviour and is kept.
- HUMAN: the real top comment.

The writing prompts are in English for all arms, as shipped. A reply that comes back mostly not in Chinese is kept as it is and counted in the results.

## Judges

GPT (codex CLI, `codex exec`, read-only, ephemeral, as `judge.ts` does), Claude Opus and Claude Sonnet. Blind; each judge sees the post and all 4 replies of one thread at once, labelled A-D in its own seeded order (`order(id:judge)` from `judge.ts`). Prompt: `judge.ts` word for word: a 0-100 probability that a human wrote each reply, then an upvote ranking. Every judge answer is saved (`judged-raw/`), parsed scores in `judged/<judge>/`.

## Measures and pass rule

- Primary: mean "human" probability, SKILL minus HUMANIZER_S, paired by thread, bootstrap 95% interval (10,000 resamples, the seeded resampler of `../korean-comments/ko.ts`).
- Pass: SKILL beats HUMANIZER_S on all three judges with the interval above zero. Otherwise no-go.
- Reported as it comes: SKILL minus HUMAN per judge with its interval, how often each arm is judged more human than the real comment, upvote rank, the average of the three judges per arm, reply length (median characters), and how many replies are not mainly Chinese.
- Also reported: how many eligible threads the political filter removed, and any thread dropped and why.

## Limits known before the run

One community. Political threads (most of r/China_irl's busy threads) are excluded, so the result says nothing about them; the tool refuses them anyway. AI judges only; a native-speaker pass comes later through the quiz (`~/.trina/know-raw/quiz-items-zh.json`, outside git).

## Change after the Claude judges ran (2026-11-27)

GPT (codex CLI) hit its usage limit before judging and was then dropped by the founder's decision; it was not run on any thread. The pre-registered rule needs all three judges, so it cannot be applied as written. RESULTS.md reports the two Claude judges (Opus, Sonnet) and whether SKILL beats HUMANIZER_S on both with the interval above zero. Nothing else changed: same threads, prompts, replies and judge prompt.
