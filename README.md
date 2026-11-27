# community-humanizer

**Humanizers make text sound less like AI. This makes it sound like the people who actually hang out there.**

A Claude Code skill for Reddit (and Clien) comments and posts. Point it at a thread and, if you like, say what you want to get across. It writes the way people in that community actually write, using real comments from other threads there as samples. It never posts anything.

[Quiz: two versions, one is real →](#quiz) · [한국어](README.ko.md)

An example from the held-out test:

> **r/ClaudeAI: What would you do if there's a Claude outage?**
>
> community-humanizer: *the weekly limit is already the outage for most people on here*
>
> Judges rated that line GPT 68, Opus 85, Sonnet 80 for "a person wrote this". The real top comment (77 points), a list of what its author does in an outage, scored 80–93.

## Does it work?

We judged every version blind:
- **Judges:** GPT, Claude Opus and Claude Sonnet.
- **Setup:** each judge saw all versions for one post at once, shuffled in its own order.
- **Score:** a 0–100 chance that a person wrote each one.
- **Posts used:** every number in this section comes from posts that were not used while tuning the prompts.

**Replies, English** (28 held-out question threads from r/smallbusiness, r/SaaS, r/selfhosted, r/ClaudeAI and r/startups)

| | GPT | Opus | Sonnet |
|---|---|---|---|
| Plain Claude | 6 | 11 | 17 |
| [humanizer](https://github.com/blader/humanizer) (74k★) + 10 real comments from the same subreddit | 15 | 25 | 33 |
| **community-humanizer** | **51** | **56** | **68** |
| The real top comment | 85 | 78 | 78 |

**Replies, Korean** (28 Clien threads from 모두의공원 and 아무거나질문)

| | GPT | Opus | Sonnet |
|---|---|---|---|
| Plain Claude | 6 | 11 | 11 |
| [im-not-ai](https://github.com/epoko77-ai/im-not-ai) (6.8k★) + 10 real comments | 23 | 33 | 35 |
| **community-humanizer** | **54** | **61** | **71** |
| The real top comment | 95 | 87 | 85 |

**Posts** (22 English and 25 Korean held-out posts; the writer got only the poster's point as short notes, never the real post)

| | English GPT | English Opus | English Sonnet | Korean GPT | Korean Opus | Korean Sonnet |
|---|---|---|---|---|---|---|
| Plain Claude | 9 | 10 | 14 | 7 | 7 | 7 |
| humanizer / im-not-ai + 5 real posts | 14 | 15 | 23 | 13 | 15 | 20 |
| **community-humanizer** | **21** | **32** | **63** | **17** | **28** | **50** |
| The real post | 80 | 79 | 65 | 93 | 91 | 92 |

**Is it just the persona? And what about humanizer used as a rewriter?** On the same 28 English and 28 Korean held-out threads, in one more round (Opus and Sonnet; GPT was over its usage limit):

| | English Opus | English Sonnet | Korean Opus | Korean Sonnet |
|---|---|---|---|---|
| Plain Claude reply, then rewritten with humanizer / im-not-ai | 12 | 13 | 11 | 11 |
| humanizer / im-not-ai + real samples | 24 | 26 | 27 | 26 |
| The behaviour persona alone (one paragraph, no samples) | 43 | 51 | 47 | 53 |
| **community-humanizer** | **49** | **62** | **51** | **64** |
| The real top comment | 78 | 77 | 87 | 86 |

Most of the effect is the persona paragraph, which you can read in [prompts.mjs](skills/community-humanizer/lib/prompts.mjs). Real samples, comment types and the pick add about 11 points on Sonnet (interval above zero in both languages) and about 5 on Opus (inside the noise). Using humanizer the way it is meant to be used, as a rewriter, scored lower still.

**Which model writes?** The tables above were written by Sonnet. To check that Sonnet wasn't just rating its own writing kindly, we had Opus write the same held-out sets with the same prompts. We judged both versions together:

| Opus-written minus Sonnet-written | GPT | Opus | Sonnet |
|---|---|---|---|
| English replies (28) | +5 | +10 | +10 |
| Korean replies (28) | 0 | +3 | −2 |
| English posts (22) | +1 | +11 | +22 |
| Korean posts (25) | +4 | +4 | +10 |

- The Sonnet judge rated the Opus-written text higher too, so this is not Sonnet favouring itself.
- Opus-written was never worse, so **Opus is the default writer**. `--fast` uses Sonnet: cheaper and quicker, and the version in the tables above.
- Intervals for these differences are in [benchmark/](benchmark/). The GPT and Korean-reply differences are inside the noise; most of the others are not.

What this does and doesn't show:
- **Replies:** we beat humanizer or im-not-ai plus the same real samples by 28–37 points on every judge. The bootstrap 95% interval is above zero in all six cases, and the pass rule was written down before the run. Opus and GPT still rate the real comment well above ours.
- **Posts are harder:**
  - Sonnet couldn't tell our English posts from the real ones (63 vs 65, n=22).
  - Opus and GPT still spot most of them.
  - With GPT judging, the posts prompt did no better than our first version in English, and worse in Korean (−4). Its edge over im-not-ai on Korean posts (+3) is inside the noise.
- **The judges are all LLMs.** Studies disagree on how they compare with people:
  - One found new LLM judges stricter than people at picking the human (Hager et al. 2026: Opus 78%, people 55%).
  - Another found GPT-4 less accurate than people (Rathi et al. 2025).
  - We have no human answers yet. The quiz below collects them.
- **Human-like is not the same as helpful.** Asked which reply they would upvote, all three judges more often picked the longer humanizer replies.
- **Scores are relative within a round.** The same reply can score differently next to different competitors, so compare rows within one table only.

humanizer and im-not-ai clean AI tells out of text you already have; they weren't built to write Reddit replies. For this test we pasted each one's SKILL.md into the writing prompt and gave it the same real samples we use. That was the closest cheap substitute we could think of.

## What we learned

These come from the development rounds, so treat the numbers as directions, not results.

**What helped**
- **Short beats polished.**
  - In 1,830 real comments, long answers are only 30–51%, and a quarter of r/selfhosted comments are one-liners.
  - AI almost never wrote 10 words or fewer (1 of 448 replies), against 14% of real top comments.
- **The behaviour persona did nearly all of it.**
  - The persona: short, low effort, doesn't know everything and doesn't pretend to (after Jones & Bergen 2025).
  - Drawing comment types at the community's real rates and picking one of three drafts adds 1–3 points.

**What didn't**
- **Fixing what the judge said gave it away made scores worse.**
  - Opus named tidy closers, fake casualness and answering every question.
  - Removing exactly those cost 12–20 points.
  - Judges' stated reasons are not what drives their scores, which matches Marioriyad et al. 2025.
- **Fake sloppiness doesn't help.**
  - Real posts have almost no typos (1–2%).
  - Adding common slips (a lower-case sentence start, a dropped final period) at their real rates moved scores by 0–1.5 points.
  - What helped posts was writing like someone typing fast on a phone, in the order things come to mind.
- **Other changes that hurt or did nothing:**
  - target lengths drawn from real comments
  - "bring a specific"
  - angle sampling
  - shorter posts
  - a board-page continuation prompt

**Why long posts are hard**
- An AI rewrite of a real post, with all of its content, scored no better than ours. In long text the wording gives it away, not missing content.
- Detection gets easier with length ([Ippolito et al. 2020](https://arxiv.org/abs/1911.00650), [Chakraborty et al. 2023](https://arxiv.org/abs/2304.04736)).
- Model fingerprints survive paraphrase (Sun et al. 2025).

**What we left out on purpose**
- **Made-up anecdotes.**
  - When they were allowed, the picking model chose an invented "my experience" draft 17 times out of 28.
  - The judges disagreed on whether that helped (Opus −6, Sonnet +10).
  - We banned them either way.

Every protocol, prompt, output and score is in [benchmark/](benchmark/).

## Install

Claude Code:

```text
/plugin marketplace add <this repo>
/plugin install community-humanizer
```

From a clone (Node 18+, with Claude Code installed and signed in):

```bash
node skills/community-humanizer/bin/voice.mjs reply <reddit or clien post url> [--point "what you want to say"]
node skills/community-humanizer/bin/voice.mjs post --to r/selfhosted --title "Is a Mac mini enough for Immich?" --notes "400GB of photos, M2 mini 16GB unused, also Jellyfin for 3 people, macOS or Linux on an old PC?"
```

Inside Claude Code you can just ask: "write a reply to this thread: <url>" or "write a post for r/selfhosted about ...".

## How it works

**Replies**
1. It reads about ten busy threads from the same community in the last two weeks. Reddit comes through the free [Arctic Shift](https://arctic-shift.photon-reddit.com) archive, Clien through its public pages. The thread you're answering is never used as a sample.
2. It labels their top comments by kind: answer, one-liner, disagree, question back, side point, joke, complaint.
3. It draws three kinds at that community's real rates and writes one draft of each. Each draft is a separate, isolated Claude call with real comments of that kind as samples.
4. A smaller model picks the one that reads most like a regular. You get the other two as well.

**Posts**
1. You give the point as notes.
2. It writes the post the way a regular types it on a phone, using six real posts from that community.
3. A second call lists anything in the post that your notes don't say. If it finds something, it writes the post once more and shows you whatever is still not in your notes.

**Cost and time:** one measured reply (three drafts and the pick) cost about $0.07 and took about 13 seconds with Opus writing, or about $0.04 and 14 seconds with `--fast` (Sonnet). These are the API prices Claude Code reports; on a subscription the calls count toward your plan instead. The first time in a community, reading and labelling it takes about a minute, and that is cached for a week.

## Guardrails

- **It never posts.** You read the draft, fix anything that isn't true for you, and post it yourself.
- **It is told never to invent experience.** Your own story goes in only through `--fact "..."` for replies or your notes for posts, and posts are checked against your notes. `--point "..."` for replies came after the tests, so replies were measured without it.
- **It refuses political threads and posts.** A small model checks first, and anything that isn't a clear "not political" is refused.
- **Follow each community's rules.** Many subreddits ban AI-written content or self-promotion. Check before you use it there.

## Quiz

Two versions of a reply or a post, and a person wrote one of them. Ten questions come from the held-out sets above.

Answers are stored anonymously (a random session id, no IP), so we can report how often people can tell. The code is in [quiz/](quiz/).

## Communities

Each community has a small profile in [communities/](communities/). It holds how often each kind of comment shows up, how long comments and posts are, and the rules that matter. The tool refuses to write for a community whose profile says AI-written content is banned, and it shows that community's self-promotion rules before you post.

Adding one takes a command and a look at the rules page. See [communities/README.md](communities/README.md) and send it as a PR.

## Benchmark

[benchmark/](benchmark/) holds three tests: English Reddit replies, Korean Clien replies, and posts in both languages. Each test includes:
- the protocol, written before the run
- the results
- the scripts
- every generated text
- every judge's score

The real comments and posts are not redistributed; `ids.json` links to each source thread. Want to test your own humanizer on the same posts? Open a PR with its outputs.

## License

MIT
