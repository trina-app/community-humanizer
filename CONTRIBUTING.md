# Contributing

The most useful thing you can add is a community: see [communities/README.md](communities/README.md). Run one command, fill in the community's rules from its rules page, and open a PR.

Other welcome PRs:
- **Benchmark results for another humanizer or prompt.** Generate one output per post in a held-out set, judge them with the scripts in [benchmark/](benchmark/), and include the scores.
- **A new site.** Add a reader like `lib/reddit.mjs` or `lib/clien.mjs`, plus a test on held-out threads, before claiming it works.
- **Bug fixes.**

Changing a prompt in `lib/prompts.mjs` changes what was measured. Please include a blind test against the current prompt on posts that weren't used while writing the change.

Things we won't merge:
- auto-posting
- account automation
- ways around a community's rules or a site's limits
- anything that invents experience for the user
