# Indonesian community voice test (written 2026-11-27, before any thread was collected)

Same question as the Spanish test (`../spanish-comments/PROTOCOL.md`), the English fresh test (F1), the Korean and the Chinese tests, in Indonesian: on held-out Indonesian-language Reddit threads, does community-humanizer's shipped reply path (behaviour persona, 3 drafts of comment types drawn at the community's rates, typed real samples, Haiku pick, no made-up experience) read more like a real commenter than plain Claude, or than the most-starred Indonesian humanizer skill given real samples from the same subreddit? Nothing is tuned on these threads: the prompts are the shipped ones and the Spanish test's, word for word, and nothing changes after any output is seen.

## Communities and rules

Candidates were checked on Arctic Shift by counts only (no thread text was read or kept): posts from 2026-10-01 to 11-26, and Indonesian question threads with 10+ comments posted 2026-11-01 to 11-26, by the checks below. r/indonesia 1,168 threads with 10+ comments in November; r/indotech 227 Indonesian question threads; r/finansial 39; r/indonesiabebas 37; r/indowibu 7; r/bandung 3; r/jakarta 1 (mostly English). r/IndoGaming, r/indoworkers, r/AskIndonesia, r/saham, r/kopi and a few other guesses are not in the archive.

Rules of each candidate were read on 2026-11-27 before collection, read-only through the browser (`https://www.reddit.com/r/<sub>/about/rules.json`; reddit.com refuses plain HTTP). Copies are in the working folder (`rules/`).
- r/indonesia, r/indotech, r/indonesiabebas, r/indowibu: no rule on AI-written content.
- **r/finansial is left out**: its rule "No low effort post" says "No copy-pasted generative AI answer". That bans AI-written comments, so the shipped tool refuses r/finansial once its profile carries the rule (`ai_content: "banned"`), and writing human-sounding AI replies for it is the use the tool must not serve. It gets a profile after the run so the tool refuses it; none of its threads are used as tests or samples.
- r/jakarta and r/bandung are left out for having too few Indonesian question threads.

So the test uses four subreddits: **r/indonesia, r/indotech, r/indonesiabebas, r/indowibu** (r/indonesia plus three, as allowed).

## Threads

Source: the Arctic Shift archive, one request at a time, 2.5 s between requests, longer waits after any error or throttling. Usernames are not stored. Real post and comment text stays in the working folder outside git (`~/.trina/know-raw/indonesian-voice-test`); the repo keeps links only (`ids.json`).

Indonesian check (used for posts, comments and outputs): lowercase, split into words, count Indonesian function words, formal and casual, with the usual chat spellings (yang, yg, dan, di, ke, dari, ini, itu, untuk, buat, dengan, tidak, ada, saya, aku, gue, lu, kamu, kita, dia, kalau, kalo, karena, juga, sudah, udah, belum, bisa, apa, gimana, bagaimana, kenapa, gak, ga, nggak, enggak, aja, sih, dong, kok, banget, nih, tuh, deh, kan, ya, atau, tapi, jadi, sama, kayak, seperti, adalah, bukan, masih, harus, punya, lebih, lagi, mau, akan, emang, cuma, gitu, sampai, ...) and English ones (the list of the Spanish test: the, and, is, are, was, of, to, it, that, this, for, you, with, on, have, be, what, how, do, my, but, not, they, there, would, should, if, or, from, at, an, just, your, ...). Words used in both languages are in neither list. A post (title + body) is Indonesian with 3+ Indonesian words and more than twice as many Indonesian as English words; a comment with 1+ Indonesian word and the same ratio. The exact lists are in `lib.ts`. Indonesian Reddit mixes in a lot of English; the ratio rule lets a few English words through and keeps out posts that are mainly English.

Question post: the title has "?", or starts (after an optional "[" or "(") with an Indonesian question opener: apa, apakah, ada, adakah, gimana, gmn, bagaimana, kenapa, knp, mengapa, siapa, kapan, di mana, dimana, ke mana, kemana, berapa, mana, boleh, bisa, perlu, harus (and their -kah forms), sebaiknya, mending, enakan, rekomendasi, rekom, minta, saran, butuh, cari, nyari, tanya, nanya, bertanya, tolong, bantu, bantuin, pendapat, opini, worth it, help, ask. Exact regex in `collect.ts`.

Political check: the tool's own guard (`GUARD` in `skills/community-humanizer/lib/prompts.mjs`, asked to Claude Haiku on title and body; anything but a clear "no" counts as political) and the same `GUARD` prompt asked to Claude Sonnet, because the Spanish test found Haiku misses some. A thread either model calls political is left out, everywhere: never a test thread, never a sample thread. Every removal is logged, with whether Haiku, Sonnet or both flagged it, and the counts go in RESULTS.md. r/indonesia and r/indonesiabebas carry a lot of politics, so many removals are expected.

Test set (28 threads):
- Posted 2026-11-01 to 2026-11-26 (UTC), a question post, body not [removed]/[deleted], not marked NSFW (an addition to the Spanish rules: r/indowibu has NSFW posts), 10+ comments, Indonesian, not political.
- A top-level human comment of 5+ points: not the poster, not AutoModerator, not [deleted], not removed, 20+ characters. The highest-scored one is HUMAN. If it is not Indonesian, the thread is skipped.
- Order: comment count, highest first (ties: older first). Up to 12 eligible threads per subreddit are read in that order. The 28 are taken round-robin in the order indonesia, indotech, indonesiabebas, indowibu, each turn taking that subreddit's next eligible thread (7/7/7/7 if all have enough; a subreddit that runs out leaves its turns to the others). No hand picking. Every skipped thread and why goes in the collection log.
- If the four subreddits together have fewer than 28 eligible threads in that window, the start moves back to 2026-10-01 for all four and the selection runs again unchanged.

Sample pool (per subreddit, never any test thread):
- The 10 busiest other threads of the same subreddit posted 2026-10-01 to 2026-11-26, any title, 10+ comments (threads with 5+ comments fill in if fewer than 10), Indonesian, not political.
- Their top-level comments as the tool reads them (`lib/reddit.mjs`: 2+ points, not the poster, not AutoModerator, not [deleted]/removed), Indonesian only, sorted by score, the first 160, labelled by type by Claude Sonnet with the tool's `LABEL` prompt in batches of 40 (the tool's `labelled()`).
- HUMANIZER_S's 10 samples: comments with 5+ points from this pool, at most 3 per thread, taken round-robin across threads in score order (`samplesFor` in `reddit-comments/build-fresh-as.ts`), cut to 600 characters (2+ point comments fill in if fewer than 10). The same 10 for every test thread of that subreddit.

## Arms

All written by Claude Sonnet through `claude -p` with the tool's exact isolation flags (no tools, skills, MCP, CLAUDE.md or project settings, from an empty folder). Input: title and body (body cut to 1,500 characters, as the tool reads it). Prompts word for word, no changes after seeing any output.
- PLAIN: `gen.ts` PLAIN ("Write a reply to this Reddit post in r/<sub>. Reply with the final comment text only.").
- HUMANIZER_S: `gen.ts` BLADER_S, word for word (the RULE line, "Use this writing skill:", the skill inside `<skill>` tags, the 10 samples), with the SKILL.md of **adhiprib/humanizer-indonesia** in place of blader's (`humanizer-id-SKILL.md`, version 1.7.2, commit 05231b5167d44f70e91acaaf66f94baa381d3d55 of 2026-11-18, MIT, license in `humanizer-id-LICENSE`).
  - Why this one: a GitHub search on 2026-11-27 (humanizer indonesia / indonesian / bahasa / humanizer-id and similar) found it as the most-starred Indonesian humanizer, 360 stars, MIT. The rule set before the search was to use an Indonesian humanizer with a few hundred stars or more and a permissive license if one exists, else blader/humanizer as in the Spanish run. The next ones are apissaj/humanizer-id (260 stars, MIT, an editorial guide for academic writing) and onesoira/humanizer-bahasa-indonesia (18 stars).
  - Known before the run: it is written for editing formal Indonesian text (papers, abstracts, reports, teaching material, email), it is long (74 KB), and it refers to files of its repo (`references/id-ai-tells.md`, `scripts/metrik.py`, voice presets) that the writer does not get. As with blader's and Humanizer-zh in the earlier runs, only SKILL.md is passed, and the writer has no tools.
- SKILL: the shipped reply path of `bin/voice.mjs reply --fast`: `replyPrompt` and `replyPick` imported from `lib/prompts.mjs` with lang `en` (what the tool uses for every Reddit link), type rates counted from the labelled pool (the tool's rule when a community has no profile and 40+ comments; under 40, the `_defaults.json` rates), examples = the first 6 comments of each type in score order cut to 400 characters, types drawn by the tool's `drawTypes` with the post id as seed, 3 drafts by Sonnet, Haiku picks. No `--point`, no `--fact`.
- HUMAN: the real top comment.

The prompts are English for every arm, as the shipped tool's are for Reddit. How many outputs of each arm come back in Indonesian is reported; nothing is regenerated or dropped for it.

## Judges

Claude Opus and Claude Sonnet (`claude -p`, isolated, as above). No GPT judge: it was dropped by the project owner before this run. Blind, all 4 replies of one thread at once, labelled A-D in each judge's own seeded order (`order()` of `judge.ts`, seed `<id>:<judge>`). Prompt: `reddit-comments/judge.ts` word for word (human probability 0-100 per reply, then upvote ranking). Two attempts per thread; a thread a judge fails twice is reported and left out of that judge's numbers. Every raw answer is saved (`judged-raw/`), parsed scores in `judged/`.

## Measure and rule

Primary: mean human probability, SKILL minus HUMANIZER_S, paired by thread, bootstrap 95% interval (10,000 resamples, the `analyze` code of `korean-comments/ko.ts` as used in `spanish-comments/es.ts`).

**Pass: SKILL beats HUMANIZER_S on both judges (Opus and Sonnet), with the bootstrap 95% interval above zero on both. Otherwise no-go.** Both judges are Claude models and Sonnet also writes every AI arm; that limit is known and is reported.

Reported as it comes: SKILL minus HUMAN per judge with its interval; each arm's mean per judge and over the two judges; pass rate (50+); upvote rank; how often each AI reply is judged more human than the real one; median lengths in words (and characters); how many outputs of each arm are not Indonesian by the check; political removals; any judge failure; cost.

Budget: about $15 of model calls at most.

Afterwards (not part of the measure): community profiles with `voice.mjs profile` for the four test subreddits and r/finansial, with `rules` filled by hand from the rules read above; `posts.json` of the 28 test threads in the working folder for the quiz builder (outside git).

## Note after collection, before any reply was written (2026-11-27)

Collection gave 28 threads (r/indonesia 9, r/indotech 8, r/indonesiabebas 8, r/indowibu 3; r/indowibu had only 3 eligible, so its turns went to the others as the round-robin rule says). Reading the 28 titles, three look borderline although both guards said no: 1xse85x (r/indonesia, news about the pay of volunteers in a government meal programme), 1xux6n4 (r/indonesiabebas, "what worries you most about Indonesia now", listing politics among other topics) and 1xnj0zn (r/indonesiabebas, opinions on a preacher). They stay in the set, since the selection is by rule and not by hand. RESULTS.md also reports the main numbers without these three, and they are not used as examples anywhere.
