# Quiz: which one is real?

Two versions of a reply or a post; one a person wrote. Built from the held-out test sets only.

Build and run locally:

```bash
bun quiz/scripts/build-items.ts ~/.trina/know-raw          # writes quiz/src/items.json (not committed: it holds the answers and real texts)
cd quiz && echo "SECRET=$(openssl rand -hex 32)" > .dev.vars
npx wrangler d1 execute which-one-is-real --local --file=schema.sql
npx wrangler dev --local
```

Deploy (after the founder's OK): `npx wrangler d1 create which-one-is-real`, put the id in wrangler.toml, run schema.sql with `--remote`, `npx wrangler secret put SECRET` (and TURNSTILE_SECRET / TURNSTILE_SITE_KEY if a Turnstile widget is set up), then `npx wrangler deploy`. Move D1 to the paid plan before launch day (free is 100k row writes a day).

Stored per answer: a random session id, the pair id, language, kind, right or wrong, and seconds taken. No IP, no user agent. To have a text removed, open an issue.
