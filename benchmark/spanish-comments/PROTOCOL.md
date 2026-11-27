# Spanish community voice test (written 2026-11-27, before any collection)

Same question as the English fresh test (F1) and the Korean test, in Spanish: on held-out Spanish-language Reddit threads, does community-humanizer's shipped reply path (behaviour persona, 3 drafts of comment types drawn at the community's rates, typed real samples, Haiku pick, no made-up experience) read more like a real commenter than plain Claude, or than blader/humanizer given real samples from the same subreddit?

## Threads

Source: the Arctic Shift archive, one request at a time, 2.5 s between requests, longer waits after any error. Subreddits: r/devsarg, r/programacion, r/preguntaleareddit, r/askspain, r/mexico. Usernames are not stored. Real post and comment text stays in the working folder outside git (`~/.trina/know-raw/spanish-voice-test`); the repo keeps links only (`ids.json`).

Spanish check (used for posts, comments and outputs): lowercase, split into words, count Spanish function words (de, la, que, el, en, los, las, del, al, por, para, con, una, uno, un, es, son, lo, como, más, pero, porque, qué, este, esta, esto, eso, muy, sin, también, hay, donde, cuando, yo, mi, te, se, su, ya, ni, sí, está, tengo, tiene, puede, algo, nada, todo, cómo, y, pues, así, bien...) and English ones (the, and, is, are, was, of, to, it, that, this, for, you, with, on, have, be, what, how, do, my, but, not, they, there, would, should, if, or, from, at, an, just, your...; words used in both languages are in neither list). A post (title + body) is Spanish with 3+ Spanish words and more than twice as many Spanish as English words; a comment with 1+ Spanish word and the same ratio. The exact lists are in `collect.ts`.

Political check: the tool's own guard (`GUARD` in `skills/community-humanizer/lib/prompts.mjs`, asked to Claude Haiku on title and body; anything but a clear "no" counts as political).

Test set (28 threads):
- Posted 2026-11-01 to 2026-11-26 (UTC), a question post (title has ? or ¿, or starts with a Spanish question opener: cómo, qué, cuál, cuánto, dónde, por qué, quién, alguien, algún, hay, es, son, vale la pena, mejor, busco, necesito, recomiendan, consejo, ayuda, debería, conviene, se puede...; exact regex in `collect.ts`), body not [removed]/[deleted], 10+ comments, Spanish, not political.
- A top-level human comment of 5+ points: not the poster, not AutoModerator, not [deleted], not removed, 20+ characters. The highest-scored one is HUMAN. If it is not Spanish, the thread is skipped.
- Order: comment count, highest first (ties: older first). Up to 12 eligible threads per subreddit are read in that order. The 28 are taken round-robin in the order devsarg, programacion, preguntaleareddit, askspain, mexico, each turn taking that subreddit's next eligible thread (6/6/6/5/5 if all have enough; a subreddit that runs out leaves its turns to the others). No hand picking. Every skipped thread and why goes in the collection log.

Sample pool (per subreddit, never any test thread):
- The 10 busiest other threads of the same subreddit posted 2026-10-01 to 2026-11-26, any title, 10+ comments (threads with 5+ comments fill in if fewer than 10), Spanish, not political.
- Their top-level comments as the tool reads them (`lib/reddit.mjs`: 2+ points, not the poster, not AutoModerator, not [deleted]/removed), Spanish only, sorted by score, the first 160, labelled by type by Claude Sonnet with the tool's `LABEL` prompt in batches of 40 (the tool's `labelled()`).
- HUMANIZER_S's 10 samples: comments with 5+ points from this pool, at most 3 per thread, taken round-robin across threads in score order (`samplesFor` in `reddit-comments/build-fresh-as.ts`), cut to 600 characters (2+ point comments fill in if fewer than 10). The same 10 for every test thread of that subreddit.

## Arms

All written by Claude Sonnet through `claude -p` with the tool's exact isolation flags (no tools, skills, MCP, CLAUDE.md or project settings, from an empty folder). Input: title and body (body cut to 1,500 characters, as the tool reads it). Prompts word for word, no changes after seeing any output.
- PLAIN: `gen.ts` PLAIN ("Write a reply to this Reddit post in r/<sub>. Reply with the final comment text only.").
- HUMANIZER_S: `gen.ts` BLADER_S: the RULE line + blader/humanizer SKILL.md (`reddit-comments/blader-SKILL.md`) + the 10 samples.
- SKILL: the shipped reply path of `bin/voice.mjs reply --fast`: `replyPrompt` and `replyPick` imported from `lib/prompts.mjs` with lang `en` (what the tool uses for every Reddit link), type rates counted from the labelled pool (the tool's rule when a community has no profile and 40+ comments; under 40, the `_defaults.json` rates), examples = the first 6 comments of each type in score order cut to 400 characters, types drawn by the tool's `drawTypes` with the post id as seed, 3 drafts by Sonnet, Haiku picks. No `--point`, no `--fact`.
- HUMAN: the real top comment.

The prompts are English for every arm, as the shipped tool's are for Reddit. How many outputs of each arm come back in Spanish is reported; nothing is regenerated or dropped for it.

## Judges

GPT (`codex exec`, the logged-in CLI's default model, read-only, ephemeral), Claude Opus and Claude Sonnet (`claude -p`, isolated). Blind, all 4 replies of one thread at once, labelled A-D in each judge's own seeded order (`order()` of `judge.ts`, seed `<id>:<judge>`). Prompt: `reddit-comments/judge.ts` word for word (human probability 0-100 per reply, then upvote ranking). Two attempts per thread; a thread a judge fails twice is reported and left out of that judge's numbers. Every raw answer is saved (`judged-raw/`), parsed scores in `judged/`.

## Measure and rule

Primary: mean human probability, SKILL minus HUMANIZER_S, paired by thread, bootstrap 95% interval (10,000 resamples, the `analyze` code of `korean-comments/ko.ts`).

Pass: SKILL beats HUMANIZER_S on all three judges with the interval above zero. Otherwise no-go. SKILL minus HUMAN is reported as it comes, with each arm's mean over the three judges, pass rate (50+), upvote rank, how often an AI reply is judged more human than the real one, and median lengths.

Budget: about $20 of model calls at most.

Afterwards (not part of the measure): community profiles for the five subreddits with `voice.mjs profile`, rules filled by hand from each subreddit's rules page, and quiz items (real top comment vs SKILL) from the test set only, kept outside git.

## Change before any generation (2026-11-27, after collection, before any reply was written)

The tool's Haiku guard let through a test thread that is plainly political (r/askspain, opinions on a TV interview with the leader of Vox, with talk of elections). Writing human-sounding replies there is the misuse the tool must not serve. So a second check was added, applied the same way to every test and pool thread: the same `GUARD` prompt asked to Claude Sonnet; a thread either model calls political is left out, and the selection rules above run again unchanged (a dropped test thread is replaced by its subreddit's next eligible one; a dropped pool thread by the next busiest). The Haiku miss is reported in RESULTS.md as a finding about the tool's guard.

## Note (2026-11-27, after the Opus and Sonnet judging, before any GPT result)

The GPT judge was not run. The codex CLI hit its usage limit before judging (reset at 14:30 local), and the run scheduled for after the reset was then cancelled by decision of the project owner, so that no GPT scores exist for this set. The pre-registered rule needs all three judges, so it cannot be applied as written. RESULTS.md reports the two Claude judges (Opus, Sonnet) and whether SKILL beats HUMANIZER_S on both with the interval above zero; that is a weaker check than the one registered, because both judges are Claude models.
