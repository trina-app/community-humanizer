---
name: community-humanizer
description: Writes a reply or a post for an online community the way regulars there write, from real comments and posts of that same community. Reddit (any subreddit) and Clien (클리앙) for now. Use when someone asks to draft a Reddit comment or reply, a Reddit post, a 클리앙 댓글 or 글, "write a reply to this thread", "레딧 답글 써줘", "이 글에 댓글 달아줘", "r/selfhosted에 올릴 글 써줘". It never posts anything and never invents experience.
---

# community-humanizer

Drafts a reply or a post that reads like a regular in that community wrote it. It reads real comments and posts from other recent threads of the same subreddit or board, then writes in that voice. It does not post.

## Reply to a thread

```bash
node "<this skill's folder>/bin/voice.mjs" reply "<reddit or clien post url>"
```

What happens:
- It reads about ten other busy recent threads in the same community.
- It labels their top comments by kind (a short answer, a one-liner, a disagreement, a joke...).
- It writes three drafts of kinds picked at the community's real rates, and a smaller model picks the one that reads most human.
- The chosen draft goes to stdout. The other two go to stderr.

The first run in a community takes about a minute: it reads and labels that community once and keeps the result for a week (`~/.cache/community-humanizer/`). After that a reply takes about 13 seconds. Add `--refresh` to read the community again sooner.

If the user says what they want to say in the reply, pass it with `--point "..."` (tested only without it; real content in a reply helped in a related test). If the user tells you something that really happened to them and fits the thread, pass it with `--fact "..."`. That's the only way the reply may talk about their own experience. Never write `--fact` yourself from guesses.

## Write a post

```bash
node "<this skill's folder>/bin/voice.mjs" post --to r/<subreddit> --title "..." --notes "..."
node "<this skill's folder>/bin/voice.mjs" post --to clien/<board> --title "..." --notes "..."
```

`--notes` is the user's point: what's going on and what they want to know, in a few lines, in any order. Ask the user for it if they haven't given it. Don't fill it in from your own guesses, because the post will say only what the notes say.

Common Clien boards:
- `park` 모두의공원
- `kin` 아무거나질문
- `cm_mac` MaClien
- `cm_app` 개발한당

Only `park` and `kin` were measured in testing.

## What to tell the user

- Show the draft as it is. Mention the other drafts when there are some.
- Say that nothing was posted, and that they should read it, fix anything that isn't true for them, and post it themselves.
- Don't rewrite or polish the draft afterwards. Its measured advantage is that it isn't polished.
- Political threads and posts are refused. Pass that message on as it is.

## Speed

Drafts are written by Opus by default, which scored equal or better than Sonnet on every held-out set. Add `--fast` to write with Sonnet when the user wants it quicker or cheaper.

## Requirements

- Node 18 or newer.
- Claude Code signed in. The tool runs its own short `claude -p` calls with no tools, skills or MCP, so the user's setup doesn't change the result.
