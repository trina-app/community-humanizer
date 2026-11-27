# Japanese comment test results (4 Japanese-language subreddits, 28 held-out threads), 2026-11-27

**Pass.** The rule written before collection (PROTOCOL.md) was: SKILL beats HUMANIZER_S on both judges (Opus, Sonnet) with the bootstrap 95% interval above zero on both. It does, and it still does without the nine borderline threads named before any generation. Both judges are Claude models and Sonnet wrote every AI arm, so this is a Claude-only check.

Human probability (0-100), mean over threads:

| All 28 threads | Opus | Sonnet | Mean of the 2 |
|---|---|---|---|
| PLAIN | 9.8 | 13.1 | 11.4 |
| HUMANIZER_S (yomiyasu + 10 real comments) | 34.3 | 42.5 | 38.4 |
| SKILL (shipped reply path, Sonnet writing) | 58.3 | 59.0 | 58.6 |
| HUMAN (top comment by points) | 85.2 | 77.6 | 81.4 |
| SKILL - HUMANIZER_S | +24.0 [13.0, 34.4] | +16.5 [5.4, 27.6] | |
| SKILL - HUMAN | -26.9 [-35.4, -18.3] | -18.6 [-27.5, -9.0] | |

| Without the 9 borderline threads (19; PROTOCOL.md note before generation) | Opus | Sonnet |
|---|---|---|
| PLAIN | 8.7 | 12.2 |
| HUMANIZER_S | 32.0 | 39.8 |
| SKILL | 56.6 | 57.8 |
| HUMAN | 86.9 | 79.7 |
| SKILL - HUMANIZER_S | +24.6 [12.5, 36.5] | +18.1 [3.8, 32.4] |
| SKILL - HUMAN | -30.4 [-40.6, -20.1] | -21.9 [-31.9, -12.4] |

- Pass rate (50+): SKILL 64% (Opus) / 75% (Sonnet), HUMANIZER_S 7% / 43%, PLAIN 0% / 0%, HUMAN 100% / 96%.
- Judged more human than the real comment: SKILL 2/28 (Opus: 1y4vwn6, 1xvn8if) and 6/28 (Sonnet: 1y38epu, 1xlvfwu, 1xltwk1, 1xnodwz, 1xvn8if, 1xzcxkz); HUMANIZER_S 0/28 and 3/28 (Sonnet: 1xvn8if, 1xnodwz, 1xmtery); PLAIN never. No ties.
- Upvote rank (1 = best of 4): Opus PLAIN 3.8, HUMANIZER_S 2.9, SKILL 2.3, HUMAN 1.1; Sonnet PLAIN 3.3, HUMANIZER_S 2.6, SKILL 2.2, HUMAN 1.9. SKILL ranked above the real comment on 4/28 threads (Opus) and 12/28 (Sonnet). Unlike the English, Spanish and Indonesian rounds, the Sonnet judge here would upvote SKILL a little more often than the humanizer reply.
- By subreddit, SKILL - HUMANIZER_S (Opus / Sonnet): newsokur +30.0 / +32.5 (2 threads), lowlevelaware +16.1 / +7.6 (9), ja +39.2 / +38.8 (9), newsokunomoral +14.3 / -2.6 (8). r/newsokunomoral on Sonnet is the only subreddit and judge where SKILL does not beat the humanizer; r/ja carries much of the lead.
- Median length in characters: PLAIN 379, HUMANIZER_S 104, SKILL 63, HUMAN 50. As in Indonesian, SKILL is about as long as the real comments; PLAIN is six times longer.
- All 112 texts are Japanese by the script check, although every prompt was in English.
- Types Haiku picked for SKILL: answer 7, complaint 5, side-point 5, disagree 4, one-liner 4, joke 2, question-back 1. Type rates came from each subreddit's labelled pool for all 28 (no profile existed at run time; every pool had 40+ labelled comments).
- Seen afterwards, not acted on: the 7 SKILL replies where Haiku picked the "answer" draft average 34.6 over the two judges; the other 21 average 66.6. The five lowest SKILL threads (1xpo2tv, 1xp41zg, 1xmtery, 1xnn3w2, 1xls1ev, two-judge 27.5-32.5) are all answer picks of 100-228 characters, each with a shorter draft of another type beside it. Haiku picked the longest of the three drafts in 11 of 28 threads.
- Next to the Indonesian round (same two judges, other threads and another humanizer, so indicative only): SKILL minus the humanizer arm was +18.5 / +29.4 there and is +24.0 / +16.5 here. yomiyasu scores higher than humanizer-indonesia did (34 / 43 here, 27 / 36 there), and the real comments score a little lower (85 / 78 here, 87 / 85 there).

Full output: `ja.out`.

## Political filter and other removals

- 131 threads went through the political check (Haiku with the tool's `GUARD`, and the same prompt to Sonnet). 48 were removed: 42 flagged by both, 5 by Haiku only (all r/newsokur: 1xpu8kv, a test candidate, and 1xql75p, 1y54jqb, 1xdeocy, 1wyxlqn, pool candidates) and 1 by Sonnet only (r/ja 1xmpc76, a test candidate). Haiku alone would have let 1 through, Sonnet alone 5.
- By subreddit: r/newsokur 46 of 58 threads checked were political (8 of its 11 question threads, and most of its busiest threads, which were walked for the sample pool), r/ja 1 of 26, r/newsokunomoral 1 of 23, r/lowlevelaware 0 of 24. r/newsokur is a political news board in practice; r/newsokunomoral, the other news subreddit, much less so.
- Other skips by the pre-registered rules: top comment not Japanese, 1 each in all four; no top-level human comment of 5+ points, lowlevelaware 1, ja 3. Question threads that failed the Japanese check before that: lowlevelaware 2 of 94, the others none.
- r/newsokur had only 2 eligible threads, so its turns went to the others (2 / 9 / 9 / 8), as the round-robin rule says. All 28 are from the November window; the October fallback was not needed and no threshold was changed.
- Labelling: one batch of 40 r/newsokur pool comments came back unparsable, so 58 of its 98 pool comments were labelled. The tool's `labelled()` drops a failed batch the same way; 58 is still above the 40 the tool needs to use the pool's own rates.
- Nine borderline threads stayed in by rule (both guards said no), named in PROTOCOL.md before generation: politics or near it 1xoxm0n, 1xqmd0w, 1xmpwyh, 1xzcxkz, 1xyk7i5; sex 1xmo5sd, 1xvn8if, 1xmtery; a real-person scandal in the top comment 1y4dsst. Without them the result is the same (table above). Four more are not borderline by topic but crude, and should stay out of a public quiz too: 1y4vwn6 (sexual top comment), 1xue0ts (vulgar top comment about a real CEO), 1xtc12z (drugs), 1xqk9fy (a 7-year-old girl in a women's bath). Japanese Reddit's casual boards are rougher than the Indonesian set: 13 of 28 are on one of the two lists.
- No judge failures: both judges scored all 28 on the first try.

## Community profiles

`communities/reddit/{newsokur,lowlevelaware,ja,newsokunomoral}.json` were written with `voice.mjs profile` after the run, with `rules` filled by hand from each subreddit's live rules and sidebar (read 2026-11-27 through the browser before collection).
- None of the four bans or mentions AI-written content (`ai_content: "no rule found"`), so unlike r/finansial and r/askspain, no subreddit was left out or marked banned.
- The tool counts comment length in words, which means nothing in Japanese, so `comments.words_median` was replaced by `chars_median` (median characters of the comments the tool labelled): newsokur 32, lowlevelaware 23, ja 73, newsokunomoral 33 (`bun ja.ts profiles`).
- The profile command found 0 posts in each (its 30-word filter splits on spaces). The `posts` blocks of r/lowlevelaware, r/ja and r/newsokunomoral were rebuilt from the Arctic Shift listing as for `china_irl.json` (40 text posts each, median 155 / 168 / 174 characters). r/newsokur has only 1 text post of 60+ characters with 5+ comments in November (it is a link board), so its `posts` block was dropped.
- The profiles read the last 30 days without a political or language filter, so their type rates differ from the non-political Japanese-only pools used in the test. r/newsokunomoral's profile: joke 20%, disagree 14%, side-point 14%, answer 13%; its test pool: side-point 38%, anecdote 17%, joke 13%. r/newsokur's profile (122 comments, mostly from political threads): complaint 30%, joke 25%. r/ja's profile has 74 comments. The shipped tool now draws from the profiles, so its r/newsokunomoral replies would differ from the ones measured here.

## Limits

- Two judges, both Claude, and Sonnet also wrote all three AI arms. This set has no neutral judge; GPT was dropped before the run.
- HUMANIZER_S used nanaism/yomiyasu because it is the most-starred Japanese humanizer (3,556 stars, MIT). It is written for editing (推敲) AI-written Japanese documents, it is 43 KB, it says to use it only when called by name, and it tells the model to run lint scripts and read reference files that the writer did not get. A comment task is outside what it was built for. blader/humanizer was not run here.
- The SKILL arm is written by Sonnet (`--fast`), the model in the published tables; the shipped default writer is Opus and was not tested here.
- The prompts for every arm are English with Japanese samples, as the shipped tool's are for Reddit. The judge prompt is English too.
- Four subreddits, 2-9 threads each; r/newsokur has only 2. Japanese Reddit is small, and the subreddit survey was partial (78 names checked; 300 old wiki names unchecked because the archive throttled requests on inactive subreddits). No tech or hobby subreddit had enough threads. Political threads, which are most of r/newsokur, are excluded, so the result says nothing about them; the tool refuses them anyway.
- The Japanese check is a script heuristic (kana required, kana and kanji weighted 3 to 1 against other letters). Comment scores are as archived by Arctic Shift (newest test thread 2026-11-25).
- No native-speaker check yet. `posts.json` for the quiz builder is in the working folder (outside git).

## Cost

Claude calls, from `total_cost_usd`: $4.13 over 501 calls (generation $2.77, of which HUMANIZER_S $1.87 because its skill is 43 KB; judging $0.70; type labelling $0.24; political checks $0.42). The four `voice.mjs profile` runs label about 500 more comments; their calls are not logged, about $0.20 by the same rate. Total about $4.35.

## Files and rerun

- `PROTOCOL.md` (written before collection, with the dated note), `RESULTS.md`, `ja.out`.
- `ids.json`: links only, 28 `test` threads and 40 `samples` threads (10 per subreddit).
- `lib.ts` (isolated model calls with cost logging, Arctic Shift client, Japanese check, character count), `collect.ts` (selection), `ja.ts` (classify, gen, judge, analyze, profiles). SKILL imports the shipped `lib/prompts.mjs`, `lib/claude.mjs` and `lib/profile.mjs` directly.
- `yomiyasu-SKILL.md` and `yomiyasu-LICENSE`: nanaism/yomiyasu `skills/yomiyasu/` at commit 3979c75 (MIT).
- `outputs/<id>__<ARM>.txt`: every generated reply; `outputs/drafts/<id>.json`: SKILL's three drafts, their types and Haiku's pick.
- `judged/<opus|sonnet>/<id>.json`: scores per arm with each judge's order; `judged-raw/<opus|sonnet>/<id>.txt`: each judge's raw answer.
- Real posts and comments stay in the working folder (`WORK`, default `~/.trina/know-raw/japanese-voice-test`): the subreddit survey (`survey/`), listings, comment trees, pools, labelled pools, guard answers, the subreddits' rules and sidebars, `posts.json`, `collect.log`, `threads.out` (per-thread scores with titles). Usernames in the cached listings and comment trees were replaced by pseudonyms after collection (a random salt that was not kept; AutoModerator and [deleted] left as they are), and `collect.ts` run on the scrubbed cache gives the same 28 threads, pools and `ids.json`. To rerun: `SUBS=newsokur,lowlevelaware,ja,newsokunomoral bun collect.ts`, then `bun ja.ts classify`, `gen`, `judge opus`, `judge sonnet`, `analyze`; for the profiles, `node skills/community-humanizer/bin/voice.mjs profile r/<sub>` for each, then `bun ja.ts profiles newsokur,lowlevelaware,ja,newsokunomoral`.
