# Japanese community voice test (written 2026-11-27, before any thread was collected)

Same question as the Indonesian test (`../indonesian-comments/PROTOCOL.md`), the Spanish, Chinese and Korean tests and the English fresh test (F1), in Japanese: on held-out Japanese-language Reddit threads, does community-humanizer's shipped reply path (behaviour persona, 3 drafts of comment types drawn at the community's rates, typed real samples, Haiku pick, no made-up experience) read more like a real commenter than plain Claude, or than the most-starred Japanese humanizer skill given real samples from the same subreddit? Nothing is tuned on these threads: the prompts are the shipped ones and the Indonesian test's, word for word, and nothing changes after any output is seen.

## Communities and rules

Japanese Reddit is small, so candidates were checked on Arctic Shift first, by counts only (no thread text was kept): posts from 2026-11-01 to 11-26 and Japanese question threads with 10+ comments in them. Names came from the brief (r/newsokur, r/newsokuvip, r/lowlevelaware, r/ja, Japanese tech and hobby subreddits), from r/newsokur's wiki list of Japanese subreddits (`subreddits_jp`, read through the browser) and from guesses. The counts below used a first draft of the checks (characters not yet weighted, see "Japanese check"), so they are approximate.
- r/newsokunomoral 2,365 posts, 92 Japanese question threads with 10+ comments; r/lowlevelaware 1,855 / 92; r/ja 462 / 56; r/newsokur 365 / 11; r/newsokuexp 881 / 9; r/jisakupc 100 / 5; r/programming_jp 15 / 2; r/newsokuvip 18 / 1.
- Active but with no Japanese question thread of 10+ comments: r/japan_insoul (971 posts, almost all English), r/newsg (554, news links), r/sumo_ja, r/science_jp, r/nisa, r/keiba, r/movie_ja, r/motorcycle_ja, r/nihon, r/ongakur, r/gakumas, r/sokur2.
- No post in November: 58 more names (r/nanj, r/vtuber_ja, r/shogir, r/news_ja, r/kaigai_seikatsu, r/narou, r/soccer_jp, r/creditcard_jp, r/machinelearning_jp and others; the list is in the working folder, `survey/counts.jsonl`). The rest of the wiki list (266 names from about 2015, most of them inactive for years) and 37 hobby and game names picked from it were not checked: the archive was throttling every request on inactive subreddits.
- Also counted (counts only): of the 20 busiest Japanese question threads of each candidate (all of them where fewer), how many have a top-level human Japanese comment of 10+ characters with 5+ points: r/lowlevelaware 19/20, r/ja 15/20, r/newsokunomoral 20/20, r/newsokur 11/11, r/newsokuexp 7/9, r/jisakupc 2/5. So the 10-comment and 5-point thresholds are kept as in the Indonesian test.

Rules of each candidate were read on 2026-11-27 before collection, read-only through the browser (`https://www.reddit.com/r/<sub>/about/rules.json`, and the sidebar in `about.json`; reddit.com refuses plain HTTP). Copies are in the working folder (`rules/`).
- r/newsokur (one rule: no matome-site sources), r/lowlevelaware (joke rules), r/ja, r/newsokunomoral, r/newsokuexp (no matome sites) and r/jisakupc (no rules): no rule on AI-written content, in the rules or the sidebar. No candidate is left out for AI rules.
- r/ja: posts in Japanese, no self-promotion or "propaganda", political posts may be removed by the mods, no NSFW. r/newsokunomoral: political threads are not banned but members are asked to hold back ("政治スレは自重").

So the test uses four subreddits: **r/newsokur, r/lowlevelaware, r/ja, r/newsokunomoral**. r/newsokuexp (9 question threads, a news subreddit of the same family as r/newsokur) and r/jisakupc (the only tech or hobby subreddit with any, 5 threads, 2 with a 5+ comment) are left out for having too few.

## Threads

Source: the Arctic Shift archive, one request at a time, 2.5 s between requests, longer waits after any error or throttling. Usernames are not stored. Real post and comment text stays in the working folder outside git (`~/.trina/know-raw/japanese-voice-test`); the repo keeps links only (`ids.json`).

Japanese check (used for posts, comments and outputs). Japanese has no spaces, so it counts scripts, not words. Links, markdown link targets and HTML entities are removed first. Of the letters left (`\p{L}`): kana = hiragana and katakana characters, kanji = Han characters, other = every other letter (Latin, Hangul...). A text is Japanese when it has kana (3+ for a post, title + body; 1+ for a comment or a reply) and kana + kanji, counted three times each, outnumber the other letters. Kana is what tells Japanese from Chinese. The weight is there because one Japanese character carries about what three Latin letters do: a plain majority of characters would call an ordinary Japanese tech comment such as "Pythonで書いたscriptをDocker composeで動かしてる" (11 Japanese characters, 25 Latin letters) not Japanese. The exact rule is `scripts()` and `japanesePost`/`japaneseComment` in `lib.ts`.

Question post: the title has "?" or "？" anywhere; or a question word or request anywhere (教えて, 質問, 相談, 助けて, おすすめ/オススメ/お勧め/お薦め, どう (not どうぞ/どうも), どこ, どれ, どっち, どの, どんな, なぜ, 何故, なんで, 何で, 何が/何を/何か, なにが/なにを/なにか, 誰か, 知りたい, 聞きたい, 求む); or it ends (before any trailing 。、…!！w笑) with a question particle: か (not とか or っか), かな, かね, かい, の, っけ, だろう, でしょう. Japanese questions put the question mark at the end, so the Indonesian "starts with" rule does not carry over. Exact regex in `collect.ts`.

Political check: the tool's own guard (`GUARD` in `skills/community-humanizer/lib/prompts.mjs`, asked to Claude Haiku on title and body; anything but a clear "no" counts as political) and the same `GUARD` prompt asked to Claude Sonnet, because the Spanish and Indonesian tests found Haiku misses some. A thread either model calls political is left out, everywhere: never a test thread, never a sample thread. Every removal is logged, with whether Haiku, Sonnet or both flagged it, and the counts go in RESULTS.md. r/newsokur and r/newsokunomoral are news subreddits, so many removals are expected there.

Test set (28 threads):
- Posted 2026-11-01 to 2026-11-26 (UTC), a question post, body not [removed]/[deleted], not marked NSFW, 10+ comments, Japanese, not political.
- A top-level human comment of 5+ points: not the poster, not AutoModerator, not [deleted], not removed, **10+ characters** (the Indonesian test used 20; 20 characters are 3-4 Indonesian words but one or two Japanese sentences, so 10 keeps about the same bar). The highest-scored one is HUMAN. If it is not Japanese, the thread is skipped.
- Order: comment count, highest first (ties: older first). Up to 12 eligible threads per subreddit are read in that order. The 28 are taken round-robin in the order newsokur, lowlevelaware, ja, newsokunomoral, each turn taking that subreddit's next eligible thread (7/7/7/7 if all have enough; a subreddit that runs out leaves its turns to the others; r/newsokur, with 11 candidates before the political check, probably will). No hand picking. Every skipped thread and why goes in the collection log.
- If the four subreddits together have fewer than 28 eligible threads in that window, the start moves back to 2026-10-01 for all four and the selection runs again unchanged; if still fewer, to 2026-09-01. The thresholds (10 comments, 5 points) are not lowered.

Sample pool (per subreddit, never any test thread):
- The 10 busiest other threads of the same subreddit posted 2026-10-01 to 2026-11-26, any title, 10+ comments (threads with 5+ comments fill in if fewer than 10), Japanese, not political, not NSFW.
- Their top-level comments as the tool reads them (`lib/reddit.mjs`: 2+ points, not the poster, not AutoModerator, not [deleted]/removed), Japanese only, sorted by score, the first 160, labelled by type by Claude Sonnet with the tool's `LABEL` prompt in batches of 40 (the tool's `labelled()`).
- HUMANIZER_S's 10 samples: comments with 5+ points from this pool, at most 3 per thread, taken round-robin across threads in score order (`samplesFor` in `reddit-comments/build-fresh-as.ts`), cut to 600 characters (2+ point comments fill in if fewer than 10). The same 10 for every test thread of that subreddit.

## Arms

All written by Claude Sonnet through `claude -p` with the tool's exact isolation flags (no tools, skills, MCP, CLAUDE.md or project settings, from an empty folder). Input: title and body (body cut to 1,500 characters, as the tool reads it). Prompts word for word, no changes after seeing any output.
- PLAIN: `gen.ts` PLAIN ("Write a reply to this Reddit post in r/<sub>. Reply with the final comment text only.").
- HUMANIZER_S: `gen.ts` BLADER_S, word for word (the RULE line, "Use this writing skill:", the skill inside `<skill>` tags, the 10 samples), with the SKILL.md of **nanaism/yomiyasu** in place of blader's (`yomiyasu-SKILL.md`, `skills/yomiyasu/SKILL.md` of the repo, version 3.4.1, commit 3979c750b5e1fe9892bd47bb354f0fb51d534ff2 of 2026-11-25, MIT, license in `yomiyasu-LICENSE`).
  - Why this one: the rule set before the search was to use a Japanese humanizer with a few hundred stars or more and a permissive license if one exists, else blader/humanizer. A GitHub search on 2026-11-27 (humanizer japanese / ja / jp / 日本語, AIっぽさ, AI臭, slop 日本語, 推敲 skill, 自然な日本語 skill, natural japanese skill and similar) found yomiyasu as the most-starred one: 3,556 stars, MIT, described as "AI生成の日本語を自然な日本語へ推敲するAgent Skill". The next ones: coji/natural-japanese (2,089 stars, MIT, a guide for writing and fixing work Japanese, not aimed at AI tells), iKora128/stop-ai-slop-jp (485, MIT), devswha/patina (392, MIT, one skill for Korean, English, Chinese and Japanese), gonta223/humanizer-ja (167, MIT).
  - Known before the run: it is written for editing (推敲) AI-written Japanese documents (articles, mail, papers, slides, PR text...), it is long (43 KB), its description says to use it only when called by name, and it tells the model to run its Python lint and check scripts and read reference files of its repo, none of which the writer gets. As with blader's, Humanizer-zh and humanizer-indonesia in the earlier runs, only SKILL.md is passed, and the writer has no tools. A comment task is outside what it was built for.
- SKILL: the shipped reply path of `bin/voice.mjs reply --fast`: `replyPrompt` and `replyPick` imported from `lib/prompts.mjs` with lang `en` (what the tool uses for every Reddit link), type rates counted from the labelled pool (the tool's rule when a community has no profile and 40+ comments; under 40, the `_defaults.json` rates), examples = the first 6 comments of each type in score order cut to 400 characters, types drawn by the tool's `drawTypes` with the post id as seed, 3 drafts by Sonnet, Haiku picks. No `--point`, no `--fact`.
- HUMAN: the real top comment.

The prompts are English for every arm, as the shipped tool's are for Reddit. How many outputs of each arm come back in Japanese is reported; nothing is regenerated or dropped for it.

## Judges

Claude Opus and Claude Sonnet (`claude -p`, isolated, as above). No GPT judge: it was dropped by the project owner before the Spanish, Chinese and Indonesian runs. Blind, all 4 replies of one thread at once, labelled A-D in each judge's own seeded order (`order()` of `judge.ts`, seed `<id>:<judge>`). Prompt: `reddit-comments/judge.ts` word for word (human probability 0-100 per reply, then upvote ranking). Two attempts per thread; a thread a judge fails twice is reported and left out of that judge's numbers. Every raw answer is saved (`judged-raw/`), parsed scores in `judged/`.

## Measure and rule

Primary: mean human probability, SKILL minus HUMANIZER_S, paired by thread, bootstrap 95% interval (10,000 resamples, the `analyze` code of `korean-comments/ko.ts` as used in `indonesian-comments/id.ts`).

**Pass: SKILL beats HUMANIZER_S on both judges (Opus and Sonnet), with the bootstrap 95% interval above zero on both. Otherwise no-go.** Both judges are Claude models and Sonnet also writes every AI arm; that limit is known and is reported.

Reported as it comes: SKILL minus HUMAN per judge with its interval; each arm's mean per judge and over the two judges; pass rate (50+); upvote rank; how often each AI reply is judged more human than the real one; median lengths in characters (code points; words cannot be counted without spaces); how many outputs of each arm are not Japanese by the check; political removals; any judge failure; cost.

After collection and before any reply is written, the 28 titles are read once and any thread that looks borderline (politics, religion, sex, real-person scandals) although both guards said no is named in a dated note below. Such threads stay in the set, since the selection is by rule and not by hand; RESULTS.md also gives the main numbers without them, and they are not used as examples.

Budget: about $15 of model calls at most.

Afterwards (not part of the measure): community profiles with `voice.mjs profile` for the four test subreddits, with `rules` filled by hand from the rules read above. The tool measures comment length in words, which means nothing in Japanese, so `comments.words_median` is replaced by `chars_median` (median characters of the comments the tool labelled), and a `posts` block built from fewer than 10 posts is rebuilt from the Arctic Shift listing or dropped, as was done for `communities/reddit/china_irl.json` (`bun ja.ts profiles`). `posts.json` of the 28 test threads and `threads.out` (per-thread scores) go in the working folder for the quiz builder (outside git).

## Note after collection, before any reply was written (2026-11-27)

Collection gave 28 threads (r/newsokur 2, r/lowlevelaware 9, r/ja 9, r/newsokunomoral 8), all from the November window. r/newsokur had 11 question threads, 8 of them political and 1 with a non-Japanese top comment, so its turns went to the others as the round-robin rule says. The thresholds were not changed and the October fallback was not needed.

The 28 titles were read once, with the first line of each real top comment (it was in the same listing) and, for seven unclear ones, the post body. Both guards said no to all of them, and they stay in the set by rule. Nine look borderline by topic (politics, religion, sex, real-person scandals); RESULTS.md also gives the main numbers without them, and they are not used as examples anywhere:
- politics or near it: 1xoxm0n (r/newsokur, Japan's GDP against one US state; the top comment blames the ruling party and the central bank), 1xqmd0w (r/newsokunomoral, recession, NISA and buying Chinese goods), 1xmpwyh (r/lowlevelaware, "is Japan, or the world, over?": discrimination, hate speech, war, nuclear weapons), 1xzcxkz (r/ja, "怖い" used as a weapon, protected groups as a kind of power), 1xyk7i5 (r/newsokunomoral, whether "外人" is a slur);
- sex: 1xmo5sd (r/ja, "isn't sex scary?"), 1xvn8if (r/lowlevelaware, why one word for genitals is acceptable and the other is not), 1xmtery (r/lowlevelaware, favourite body part, the post says buttocks and thighs);
- a real-person scandal: 1y4dsst (r/lowlevelaware, "failed JK [high-school girl], ask me anything"; the top comment is a joke about Johnny Kitagawa).

Not borderline by topic, but crude enough that they should also stay out of a public quiz: 1y4vwn6 (r/newsokunomoral, voice input in offices; the top comment is a sexual joke), 1xue0ts (r/newsokunomoral, Jensen Huang stepping down; vulgar top comment), 1xtc12z (r/lowlevelaware, would you leave a partner who used drugs), 1xqk9fy (r/newsokunomoral, news about a 7-year-old girl alone in a women's bath). They stay in every number.
