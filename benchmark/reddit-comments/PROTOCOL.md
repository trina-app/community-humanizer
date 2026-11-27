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
