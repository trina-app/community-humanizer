// Collects the Chinese test threads (PROTOCOL.md): r/China_irl text posts with 10+ comments, the tool's political check,
// the first 28 non-political threads (by comment count) with a top-level human comment of 5+ points, and the sample pool
// from the next 12 non-political threads. Arctic Shift, one request at a time, 2.5 s apart, backing off on throttling.
// Real text is written to DATA (outside the repo); the repo gets ids.json (links only). Usage: bun collect.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD } from '../../skills/community-humanizer/lib/prompts.mjs'
import { claude } from './lib.ts'

const D = import.meta.dir
const DATA = process.env.DATA ?? join(homedir(), '.trina/know-raw/chinese-voice-test')
mkdirSync(join(DATA, 'tree'), { recursive: true })
const API = 'https://arctic-shift.photon-reddit.com/api'
const SUB = 'China_irl'
const END = '2026-11-25' // posts up to 2026-11-24 UTC, at least two days old
const STARTS = ['2026-11-01', '2026-10-01', '2026-09-01'] // widen only if needed
const N_TEST = 28, N_SAMPLE_THREADS = 12

async function get(path: string): Promise<any[]> {
  for (let i = 0; i < 8; i++) {
    await Bun.sleep(2500)
    try {
      const r = await fetch(API + path, { signal: AbortSignal.timeout(90_000) })
      if (r.status === 429) { const s = Number(r.headers.get('x-ratelimit-reset') ?? 30); console.log(`throttled, waiting ${s + 5}s`); await Bun.sleep((s + 5) * 1000); continue }
      const j: any = await r.json()
      if (Array.isArray(j?.data)) return j.data
      console.log(`no data (${j?.error ?? r.status}), backing off`)
    } catch (e) { console.log(`request failed (${String(e).slice(0, 80)}), backing off`) }
    await Bun.sleep(10_000 * (i + 1))
  }
  throw new Error(path)
}

// all posts of the window, newest first, cached
const postsFile = join(DATA, 'all-posts.json')
let all: any[] = existsSync(postsFile) ? JSON.parse(readFileSync(postsFile, 'utf8')) : []
async function fetchBack(start: string) {
  const after = Date.parse(`${start}T00:00:00Z`) / 1000
  let before = all.length ? Math.min(...all.map((p) => p.created_utc)) : Date.parse(`${END}T00:00:00Z`) / 1000
  while (before > after) {
    const page = await get(`/posts/search?subreddit=${SUB}&after=${after}&before=${before}&limit=100&sort=desc`)
    if (!page.length) break
    for (const p of page) all.push({ id: p.id, title: p.title, selftext: p.selftext ?? '', num_comments: p.num_comments, score: p.score, author: p.author, created_utc: p.created_utc, is_self: p.is_self, over_18: p.over_18, removed_by_category: p.removed_by_category ?? null })
    before = page[page.length - 1].created_utc
    writeFileSync(postsFile, JSON.stringify(all))
    console.log(`posts: ${all.length} (back to ${new Date(before * 1000).toISOString().slice(0, 10)})`)
  }
  all = [...new Map(all.map((p) => [p.id, p])).values()]
  writeFileSync(postsFile, JSON.stringify(all))
}

const guardFile = join(DATA, 'guard.json')
const guard: Record<string, { answer: string; political: boolean }> = existsSync(guardFile) ? JSON.parse(readFileSync(guardFile, 'utf8')) : {}
async function political(p: any) {
  if (!guard[p.id]) {
    const answer = await claude('haiku', GUARD(p.title, String(p.selftext ?? '').slice(0, 1500)), 'guard')
    guard[p.id] = { answer, political: !/^\s*no\b/i.test(answer) } // the tool's rule: anything but a clear no is political
    writeFileSync(guardFile, JSON.stringify(guard, null, 1))
  }
  return guard[p.id]!.political
}

async function tree(id: string): Promise<any[]> {
  const f = join(DATA, 'tree', `${id}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const t = await get(`/comments/tree?link_id=t3_${id}&limit=1000`)
  // keep top-level comments only, without usernames: whether the author is the poster is all that is needed
  const p = all.find((x) => x.id === id)
  const top = t.filter((x) => x?.kind !== 'more').map((x) => x?.data).filter(Boolean).map((c: any) => ({ score: c.score ?? 0, body: String(c.body ?? ''), op: c.author === p.author, bot: c.author === 'AutoModerator', deleted: c.author === '[deleted]' }))
  writeFileSync(f, JSON.stringify(top))
  return top
}
const text = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').trim()
const ok = (c: any) => !c.op && !c.bot && !c.deleted && c.body && !/^\[(removed|deleted)\]/.test(c.body.trim()) && text(c.body).length >= 2

let result: any = null
for (const start of STARTS) {
  await fetchBack(start)
  const after = Date.parse(`${start}T00:00:00Z`) / 1000
  const eligible = all.filter((p) => p.created_utc >= after && p.is_self && !p.over_18 && !p.removed_by_category && !/^\[(removed|deleted)\]$/.test(String(p.selftext).trim()) && p.num_comments >= 10)
    .sort((a, b) => b.num_comments - a.num_comments || (a.id < b.id ? -1 : 1))
  console.log(`window ${start}..${END}: ${all.filter((p) => p.created_utc >= after).length} posts, ${eligible.length} eligible`)
  const walk: any[] = [], test: any[] = [], sampleThreads: string[] = []
  let afterLast = 0
  for (const p of eligible) {
    if (test.length >= N_TEST && afterLast >= N_SAMPLE_THREADS) break
    if (await political(p)) { walk.push({ id: p.id, comments: p.num_comments, status: 'political' }); continue }
    const top = (await tree(p.id)).filter(ok).sort((a, b) => b.score - a.score)
    const human = top.find((c) => c.score >= 5)
    if (test.length < N_TEST && human) {
      test.push({ id: p.id, sub: SUB, title: p.title, body: String(p.selftext).slice(0, 1500), comments: p.num_comments, created: new Date(p.created_utc * 1000).toISOString().slice(0, 10), human: { score: human.score, body: human.body } })
      walk.push({ id: p.id, comments: p.num_comments, status: 'test' })
    } else {
      sampleThreads.push(p.id)
      if (test.length >= N_TEST) afterLast++
      walk.push({ id: p.id, comments: p.num_comments, status: human ? 'sample' : 'sample (no 5+ comment)' })
    }
  }
  if (test.length >= N_TEST && afterLast >= N_SAMPLE_THREADS) { result = { start, eligible: eligible.length, walk, test, sampleThreads }; break }
  console.log(`not enough in ${start}..${END} (test ${test.length}, sample threads after the test ${afterLast}); widening`)
}
if (!result) throw new Error('not enough threads even from 2026-09-01')

const { start, walk, test, sampleThreads } = result
const pool: any[] = []
for (const id of sampleThreads) for (const c of (await tree(id)).filter(ok)) if (c.score >= 2) pool.push({ thread: id, score: c.score, body: c.body })
pool.sort((a, b) => b.score - a.score)
writeFileSync(join(DATA, 'posts.json'), JSON.stringify(test, null, 1))
writeFileSync(join(DATA, 'pool.json'), JSON.stringify(pool, null, 1))
writeFileSync(join(DATA, 'walk.json'), JSON.stringify({ window: `${start}..${END}`, eligible: result.eligible, walk }, null, 1))
const url = (id: string) => `https://www.reddit.com/r/${SUB}/comments/${id}/`
writeFileSync(join(D, 'ids.json'), JSON.stringify([
  ...test.map((p: any) => ({ set: 'test', id: p.id, community: `r/${SUB}`, url: url(p.id) })),
  ...sampleThreads.map((id: string) => ({ set: 'samples', id, community: `r/${SUB}`, url: url(id) })),
  ...walk.filter((w: any) => w.status === 'political').map((w: any) => ({ set: 'political (removed)', id: w.id, community: `r/${SUB}`, url: url(w.id) })),
], null, 1))
const count = (s: string) => walk.filter((w: any) => w.status === s).length
console.log(`window ${start}..${END}: ${result.eligible} eligible, walked ${walk.length}: political ${count('political')}, test ${count('test')}, sample ${count('sample')}, sample without a 5+ comment ${count('sample (no 5+ comment)')}`)
console.log(`pool: ${pool.length} comments with 2+ points from ${sampleThreads.length} threads`)
