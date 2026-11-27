# Benchmark

Five blind tests, run 2026-11-26/27. Each folder has the protocols (written before each run), the results, the scripts, every generated text (`outputs/`, `holdout-outputs/`) and every judge's scores (`judged*/`). The real comments and posts belong to their authors and are not copied here; `ids.json` links to each source thread. Five political Korean posts that slipped into the post holdout are left out.

| Folder | What | Held-out rounds |
|---|---|---|
| `reddit-comments/` | English replies, 5 subreddits | `judged-F1` (main), `judged-F2` (swap test), `judged-F3` (random pick), `judged-G` (humanizer as a rewriter, persona only), `judged-W` (Opus vs Sonnet writing). Rounds 1-6 (`judged`, `judged2`-`judged6`) are the development set |
| `korean-comments/` | Korean replies, Clien 모두의공원 and 아무거나질문 | `judged` (main, first run, no tuning), `judged-G`, `judged-W` |
| `chinese-comments/` | Chinese replies, r/China_irl, against Humanizer-zh | `judged` (first run, no tuning; Opus and Sonnet only) |
| `spanish-comments/` | Spanish replies, 5 subreddits | `judged` (first run, no tuning; Opus and Sonnet only) |
| `posts/` | English and Korean posts written from notes | `holdout-judged` (main), `holdout-judged-W` (Opus vs Sonnet writing); rounds 1-4 (`judged`-`judged4`) are the development set |

Judges: GPT (codex CLI), Claude Opus, Claude Sonnet (the Chinese and Spanish tests ran without GPT; see their RESULTS.md). Each saw all versions of one post at once, in its own shuffled order, and gave a 0-100 "a person wrote this" probability. Scores are relative within one round: compare arms judged together only.

Arm names in the files:
- `PLAIN`: plain Claude
- `BLADER_S` / `HUMANIZER_S` / `IMNOTAI_S`: humanizer or im-not-ai pasted into the writing prompt, plus the same real samples
- `REWRITE`: plain Claude's reply rewritten with humanizer or im-not-ai
- `PERSONA`: the behaviour persona alone
- `SKILL3` / `SKILL`: the shipped reply prompt written by Sonnet; `SKILL3_OPUS` / `SKILL_OPUS`: the same written by Opus (the shipped default)
- `MESSY` / `MESSY_OPUS`: the shipped post prompt, Sonnet- / Opus-written
- `HUMAN`: the real text

To rerun: collect the threads again from `ids.json` (the collection scripts are included: Reddit through Arctic Shift, Clien through its pages), then run the generation and judge scripts in each folder. Paths inside the scripts point at the original working folders, so adjust them.

To add your own humanizer: generate one output per post in a held-out set, save them as `outputs/<id>__YOURS.txt`, judge them with the same script and arms, and open a PR with the scores.
