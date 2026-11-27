// Turns the BrightData records into posts.json (PROTOCOL.md): the 30 test posts with their top human comment, and 10
// voice samples per subreddit taken only from the other candidate threads of that subreddit.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, 'bd/test_posts.json'), 'utf8')) as any[]
const comments = JSON.parse(readFileSync(join(D, 'bd/comments.json'), 'utf8')) as any[]
const subOf = (u: string) => u.match(/\/r\/([^/]+)\//)![1]!
const idOf = (u: string) => u.match(/\/comments\/([^/]+)/)![1]!
const ok = (c: any) => c.comment && !/^\[(removed|deleted)\]$/.test(c.comment.trim()) && c.user_posted && c.user_posted !== 'AutoModerator' && c.user_posted !== '[deleted]' && !c.has_bot_in_username && c.comment.length >= 20

const testIds = new Set(posts.map((p) => idOf(p.input.url)))
const bySub = new Map<string, any[]>()
for (const c of comments) if (ok(c) && !testIds.has(idOf(c.input.url))) {
  const s = subOf(c.input.url)
  bySub.set(s, [...(bySub.get(s) ?? []), c])
}
// up to 3 top comments per sample thread, highest first, 10 per subreddit
const samplesFor = (sub: string) => {
  const per = new Map<string, any[]>()
  for (const c of (bySub.get(sub) ?? []).filter((c) => c.num_upvotes >= 5).sort((a, b) => b.num_upvotes - a.num_upvotes)) {
    const k = idOf(c.input.url)
    if ((per.get(k)?.length ?? 0) < 3) per.set(k, [...(per.get(k) ?? []), c])
  }
  const rounds = [...per.values()]
  const out: string[] = []
  for (let i = 0; out.length < 10 && i < 3; i++) for (const r of rounds) if (r[i] && out.length < 10) out.push(String(r[i].comment).slice(0, 600))
  return out
}

const out: any[] = []
for (const p of posts) {
  const id = idOf(p.input.url), sub = subOf(p.input.url)
  const human = comments.filter((c) => idOf(c.input.url) === id && ok(c) && c.user_posted !== p.user_posted && c.num_upvotes >= 5).sort((a, b) => b.num_upvotes - a.num_upvotes)[0]
  if (!human) { console.log(`no human comment 5+: ${sub} ${id}`); continue }
  out.push({ id, sub, title: p.title, body: String(p.description ?? '').slice(0, 1500), comments: p.num_comments, human: { author: human.user_posted, score: human.num_upvotes, body: human.comment }, samples: samplesFor(sub) })
}
writeFileSync(join(D, 'posts.json'), JSON.stringify(out, null, 1))
for (const s of new Set(out.map((p) => p.sub))) console.log(`${s}: ${out.filter((p) => p.sub === s).length} posts, ${samplesFor(s).length} samples`)
console.log(`total ${out.length}`)
