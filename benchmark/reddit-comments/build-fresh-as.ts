// Fresh test posts from Arctic Shift (BrightData failed with no_peers on 2026-11-26). Same selection as build-fresh.ts:
// up to 6 per subreddit with a human top-level comment of 5+ points; BLADER_S samples from the development threads only.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const API = 'https://arctic-shift.photon-reddit.com/api'
const dev = JSON.parse(readFileSync(join(D, 'bd/comments.json'), 'utf8')) as any[]
const subOf = (u: string) => u.match(/\/r\/([^/]+)\//)![1]!
const idOf = (u: string) => u.match(/\/comments\/([^/]+)/)![1]!
const okBD = (c: any) => c.comment && !/^\[(removed|deleted)\]$/.test(c.comment.trim()) && c.user_posted && c.user_posted !== 'AutoModerator' && c.user_posted !== '[deleted]' && !c.has_bot_in_username && c.comment.length >= 20
async function get(path: string): Promise<any[]> {
  for (let i = 0; i < 6; i++) {
    await Bun.sleep(1500)
    try { const j = await (await fetch(API + path, { signal: AbortSignal.timeout(60_000) })).json(); if (Array.isArray(j?.data)) return j.data } catch {}
    await Bun.sleep(5000 * (i + 1))
  }
  throw new Error(path)
}
const samplesFor = (sub: string) => {
  const per = new Map<string, any[]>()
  for (const c of dev.filter((c) => okBD(c) && subOf(c.input.url) === sub && c.num_upvotes >= 5).sort((a, b) => b.num_upvotes - a.num_upvotes)) {
    const k = idOf(c.input.url)
    if ((per.get(k)?.length ?? 0) < 3) per.set(k, [...(per.get(k) ?? []), c])
  }
  const rounds = [...per.values()], out: string[] = []
  for (let i = 0; out.length < 10 && i < 3; i++) for (const r of rounds) if (r[i] && out.length < 10) out.push(String(r[i].comment).slice(0, 600))
  return out
}
const cands = readFileSync(join(D, 'cands-fresh.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const out: any[] = []
for (const cd of cands) {
  if (out.filter((x) => x.sub === cd.sub).length >= 6) continue
  const p = (await get(`/posts/ids?ids=${cd.id}`))[0]
  if (!p) { console.log(`no post: ${cd.id}`); continue }
  const tree = await get(`/comments/tree?link_id=t3_${cd.id}&limit=200`)
  const human = tree.map((x) => x?.data).filter((c) => c && c.body && !/^\[(removed|deleted)\]/.test(c.body) && c.author !== p.author && c.author !== 'AutoModerator' && c.author !== '[deleted]' && String(c.body).length >= 20 && (c.score ?? 0) >= 5).sort((a, b) => b.score - a.score)[0]
  if (!human) { console.log(`no human comment 5+: ${cd.sub} ${cd.id}`); continue }
  out.push({ id: cd.id, sub: cd.sub, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, human: { score: human.score, body: human.body }, samples: samplesFor(cd.sub) })
}
writeFileSync(join(D, 'posts-fresh.json'), JSON.stringify(out, null, 1))
for (const s of new Set(out.map((p) => p.sub))) console.log(`${s}: ${out.filter((p) => p.sub === s).length}`)
console.log(`total ${out.length}`)
