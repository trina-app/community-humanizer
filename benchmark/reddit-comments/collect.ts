// Collects the test posts (PROTOCOL.md): per subreddit, question posts from 2026-11-12 to 11-24 with 10+ comments, the
// top human comment of each, and 10 voice samples from OTHER threads in the same subreddit. One request at a time.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'https://arctic-shift.photon-reddit.com/api'
const SUBS = ['smallbusiness', 'SaaS', 'selfhosted', 'ClaudeAI', 'webdev']
const PER_SUB = 6
const after = Math.floor(Date.parse('2026-11-12T00:00:00Z') / 1000)
const before = Math.floor(Date.parse('2026-11-25T00:00:00Z') / 1000)
const QUESTION = /\?|^(how|what|which|any|is|are|should|does|do|can|best|looking for|need)\b/i

async function get(url: string): Promise<any> {
  for (let i = 0; i < 6; i++) {
    await Bun.sleep(2500)
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      const j = await r.json()
      if (Array.isArray(j?.data)) return j
    } catch {}
    await Bun.sleep(10_000 * (i + 1)) // the archive throttles bursts; back off
  }
  return { data: [] }
}

type Comment = { author: string; score: number; body: string }
async function topLevel(id: string, op: string): Promise<Comment[]> {
  const tree = await get(`${API}/comments/tree?link_id=t3_${id}&limit=200`)
  return (tree.data as any[]).map((c) => c?.data).filter(Boolean)
    .filter((d: any) => d.body && !/^\[(removed|deleted)\]/.test(d.body) && d.author !== op && d.author !== 'AutoModerator' && d.author !== '[deleted]' && String(d.body).length >= 20)
    .map((d: any) => ({ author: d.author, score: d.score ?? 0, body: String(d.body) }))
}

const out: any[] = []
for (const sub of SUBS) {
  const posts: any[] = []
  let b = before
  for (let page = 0; page < 8 && posts.length < 400; page++) {
    const r = await get(`${API}/posts/search?subreddit=${sub}&after=${after}&before=${b}&limit=100&sort=desc&fields=id,title,selftext,num_comments,score,author,created_utc`)
    if (!r.data.length) break
    posts.push(...r.data)
    b = r.data[r.data.length - 1].created_utc
  }
  const candidates = posts.filter((p) => p.num_comments >= 10 && QUESTION.test(p.title) && !/\[(removed|deleted)\]/.test(p.selftext ?? '')).sort((x, y) => y.num_comments - x.num_comments)
  const picked: any[] = []
  const others: Comment[] = []
  for (const p of candidates) {
    const cs = (await topLevel(p.id, p.author)).sort((x, y) => y.score - x.score)
    const best = cs.find((c) => c.score >= 5)
    if (picked.length < PER_SUB && best) picked.push({ id: p.id, sub, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, human: best })
    else others.push(...cs.filter((c) => c.score >= 5).slice(0, 3)) // samples come only from threads that are not in the test
    if (picked.length >= PER_SUB && others.length >= 10) break
  }
  for (const p of picked) out.push({ ...p, samples: others.slice(0, 10).map((c) => c.body.slice(0, 600)) })
  console.log(`${sub}: ${posts.length} posts, ${candidates.length} candidates, picked ${picked.length}, samples ${Math.min(10, others.length)}`)
}
writeFileSync(join(import.meta.dir, 'posts.json'), JSON.stringify(out, null, 1))
console.log(`total ${out.length}`)
