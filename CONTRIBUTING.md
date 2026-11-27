# Contributing

We take three kinds of additions. Each one comes with evidence, the way the existing ones did.

## A subreddit

One profile per subreddit in [communities/reddit/](communities/reddit/). Run one command, fill in the subreddit's rules from its rules page (including whether it bans or requires disclosure of AI-written text), and open a PR. See [communities/README.md](communities/README.md).

## A language

The prompts are in English and are used unchanged for every language. They have been tested blind in English, Korean, Japanese, Chinese, Spanish and Indonesian. To add a language:
- Run a blind test on held-out threads in that language. Copy [benchmark/indonesian-comments/](benchmark/indonesian-comments/): write the protocol before collecting, keep real posts and comments out of the repo (links go in `ids.json`), compare against the best-known humanizer for that language with the same real samples, and report what the judges said even if it doesn't pass.
- Add profiles for the subreddits you tested.
- If you are a native speaker: a `README.<lang>.md` and the quiz strings in [quiz/public/index.html](quiz/public/index.html) are welcome too.

## A community outside Reddit

Forums and boards like Clien. Add a reader like [lib/clien.mjs](skills/community-humanizer/lib/clien.mjs) or [lib/reddit.mjs](skills/community-humanizer/lib/reddit.mjs), a profile in `communities/<site>/`, and a blind test on held-out threads before claiming it works.

## Also welcome

- **Benchmark results for another humanizer or prompt.** Generate one output per thread in a held-out set, judge them with the scripts in [benchmark/](benchmark/), and include the scores.
- **Bug fixes.**

Changing a prompt in `lib/prompts.mjs` changes what was measured. Please include a blind test against the current prompt on threads that weren't used while writing the change.

Things we won't merge:
- auto-posting
- account automation
- ways around a community's rules or a site's limits
- anything that invents experience for the user
