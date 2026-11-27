# Communities

One small file per community. community-humanizer reads it before writing there:
- **`comments.types`**: how often each kind of comment shows up. Drafts are drawn at these rates.
- **`comments.words_median` / `chars_median`**: how long comments usually are.
- **`posts`**: what posts look like there (length, lists, greetings, how they end).
- **`rules`**: what the tool must respect.
  - `ai_content: "banned"` makes it refuse to write for that community.
  - `self_promotion_rules` are shown to the user as a reminder.

The real comments themselves are never stored here. The tool reads fresh ones each time, and keeps them for a week on your machine.

## Add a community

```bash
node skills/community-humanizer/bin/voice.mjs profile r/<subreddit>
node skills/community-humanizer/bin/voice.mjs profile clien/<board>
```

This writes the numbers. Then open the community's rules page and fill in `rules` by hand:
- `ai_content`: `"banned"` if a rule bans AI-written posts or comments, `"disclosure required"` if AI-written text is allowed but must be declared (put the rule in `notes` so it is shown before you post), `"no rule found"` if you read the rules and there is none, `"unknown"` if you didn't check
- `ai_rules`: the names of those rules, word for word
- `self_promotion_rules`: the names of the rules about promotion, links or ads
- `notes`: anything else a newcomer gets removed for, such as a required flair, a title tag, or a karma minimum
- `checked`: today's date, and `source`: the rules page

Open a PR with the file. One community per PR is easiest to review.

## Update a community

Run `profile` again with `--refresh` to re-measure. It keeps the `rules` part. If the rules changed, edit them and update `checked`.
