// Collects the Spanish test set and sample pools (PROTOCOL.md) through Arctic Shift, one request at a time.
// Writes to the working folder: listing-<sub>.json, tree/<id>.json, political.json, posts.json, pool-<sub>.json, collect.log;
// and ids.json (links only) next to this script. Usage: bun collect.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORK, D, claude, arctic, spanishPost, spanishComment } from './lib'
import { GUARD } from '../../skills/community-humanizer/lib/prompts.mjs'

const SUBS = ['devsarg', 'programacion', 'preguntaleareddit', 'askspain', 'mexico']
const t = (s: string) => Math.floor(Date.parse(s) / 1000)
const POOL_FROM = t('2026-10-01T00:00:00Z'), TEST_FROM = t('2026-11-01T00:00:00Z'), UNTIL = t('2026-11-27T00:00:00Z')
const QUESTION = new RegExp('[?¿]|^\\s*(?:c[oó]mo|qu[eé]|cu[aá]l(?:es)?|cu[aá]nt[oa]s?|cu[aá]ndo|d[oó]nde|por ?qu[eé]|qui[eé]n(?:es)?|alguien|alg[uú]n[oa]?s?|hay|es|son|vale la pena|mejor(?:es)?|busco|necesito|recomiendan|recomendaci[oó]n(?:es)?|recomienden|consejos?|ayuda|deber[ií]a|conviene|se puede|puedo|opiniones?|duda)(?![\\p{L}])', 'iu')
const MAX_ELIGIBLE = 12, TEST_N = 28, POOL_THREADS = 10
mkdirSync(join(WORK, 'tree'), { recursive: true })
const LOG = join(WORK, 'collect.log')
const log = (s: string) => { console.log(s); appendFileSync(LOG, s + '\n') }
const removed = (s: string) => /^\[(removed|deleted)\]/.test(s.trim())

// every post of the subreddit from 2026-10-01 to 2026-11-26, newest first, paged by created_utc
async function listing(sub: string): Promise<any[]> {
  const f = join(WORK, `listing-${sub}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const out: any[] = []
  let before = UNTIL
  for (let page = 0; page < 120; page++) {
    const r = await arctic(`/posts/search?subreddit=${sub}&after=${POOL_FROM}&before=${before}&limit=100&sort=desc&fields=id,title,selftext,num_comments,score,author,created_utc,subreddit`)
    if (!r.length) break
    out.push(...r)
    before = r[r.length - 1].created_utc
    if (r.length < 100) break
  }
  const uniq = [...new Map(out.map((p) => [p.id, p])).values()]
  writeFileSync(f, JSON.stringify(uniq))
  log(`${sub}: ${uniq.length} posts listed (${uniq[0]?.subreddit ?? '?'})`)
  return uniq
}

async function tree(id: string): Promise<any[]> {
  const f = join(WORK, 'tree', `${id}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const r = await arctic(`/comments/tree?link_id=t3_${id}&limit=200`)
  writeFileSync(f, JSON.stringify(r))
  return r
}

// the tool's guard (Haiku), plus the same prompt asked to Sonnet (PROTOCOL.md change before any generation); either one
// calling a thread political leaves it out. The tool's rule: anything but a clear no counts as political.
const PF = join(WORK, 'political.json'), PF2 = join(WORK, 'political-sonnet.json')
const pol: Record<string, boolean> = existsSync(PF) ? JSON.parse(readFileSync(PF, 'utf8')) : {}
const pol2: Record<string, boolean> = existsSync(PF2) ? JSON.parse(readFileSync(PF2, 'utf8')) : {}
async function political(p: any): Promise<boolean> {
  const q = GUARD(p.title, String(p.selftext ?? '').slice(0, 1500))
  if (!(p.id in pol)) {
    pol[p.id] = !/^\s*no\b/i.test(await claude('haiku', q, 'guard'))
    writeFileSync(PF, JSON.stringify(pol, null, 1))
  }
  if (pol[p.id]) return true
  if (!(p.id in pol2)) {
    pol2[p.id] = !/^\s*no\b/i.test(await claude('sonnet', q, 'guard-sonnet'))
    writeFileSync(PF2, JSON.stringify(pol2, null, 1))
    if (pol2[p.id]) log(`  sonnet guard: political, haiku said no: ${p.id} ${JSON.stringify(p.title.slice(0, 90))}`)
  }
  return pol2[p.id]!
}
const text = (p: any) => `${p.title}\n\n${p.selftext ?? ''}`
const byBusy = (a: any, b: any) => b.num_comments - a.num_comments || a.created_utc - b.created_utc

writeFileSync(LOG, `collect ${new Date().toISOString()}\n`)
const lists: Record<string, any[]> = {}
for (const sub of SUBS) lists[sub] = await listing(sub)

// eligible test threads per subreddit, in comment-count order
const eligible: Record<string, any[]> = {}
for (const sub of SUBS) {
  const cands = lists[sub]!.filter((p) => p.created_utc >= TEST_FROM && p.created_utc < UNTIL && p.num_comments >= 10 && QUESTION.test(p.title) && !removed(String(p.selftext ?? ''))).sort(byBusy)
  const notEs = cands.filter((p) => !spanishPost(text(p)))
  log(`${sub}: ${cands.length} question threads with 10+ comments, ${notEs.length} not Spanish`)
  eligible[sub] = []
  for (const p of cands.filter((p) => spanishPost(text(p)))) {
    if (eligible[sub]!.length >= MAX_ELIGIBLE) break
    if (await political(p)) { log(`  skip ${p.id} (${p.num_comments} comments): political`); continue }
    const human = (await tree(p.id)).map((x) => x?.data).filter((c) => c && c.body && !removed(String(c.body)) && c.author !== p.author && c.author !== 'AutoModerator' && c.author !== '[deleted]' && String(c.body).length >= 20 && (c.score ?? 0) >= 5).sort((a, b) => b.score - a.score)[0]
    if (!human) { log(`  skip ${p.id} (${p.num_comments} comments): no top-level human comment with 5+ points`); continue }
    if (!spanishComment(String(human.body))) { log(`  skip ${p.id} (${p.num_comments} comments): top comment not Spanish`); continue }
    eligible[sub]!.push({ id: p.id, sub: p.subreddit, key: sub, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, created: p.created_utc, human: { score: human.score, body: String(human.body) } })
  }
  log(`${sub}: ${eligible[sub]!.length} eligible`)
}

// round-robin in the protocol's order until 28
const test: any[] = []
for (let round = 0; test.length < TEST_N && round < MAX_ELIGIBLE; round++) for (const sub of SUBS) if (test.length < TEST_N && eligible[sub]![round]) test.push(eligible[sub]![round])
const testIds = new Set(test.map((p) => p.id))
for (const sub of SUBS) log(`test ${sub}: ${test.filter((p) => p.key === sub).length}`)

// sample pools: the 10 busiest other Spanish, non-political threads from 2026-10-01 to 11-26
const ids: any[] = test.map((p) => ({ set: 'test', id: p.id, community: `r/${p.sub}`, url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/` }))
for (const sub of SUBS) {
  const others = lists[sub]!.filter((p) => !testIds.has(p.id) && p.num_comments >= 5 && spanishPost(text(p))).sort(byBusy)
  const threads: any[] = []
  for (const minC of [10, 5]) for (const p of others.filter((p) => p.num_comments >= minC)) {
    if (threads.length >= POOL_THREADS) break
    if (threads.some((x) => x.id === p.id)) continue
    if (await political(p)) { log(`  pool skip ${sub} ${p.id}: political`); continue }
    threads.push(p)
  }
  const comments: any[] = []
  for (const th of threads) {
    for (const c of (await tree(th.id)).map((x) => x?.data).filter(Boolean)) {
      if (!c.body || removed(String(c.body)) || c.author === th.author || c.author === 'AutoModerator' || c.author === '[deleted]' || (c.score ?? 0) < 2) continue
      if (!spanishComment(String(c.body))) continue
      comments.push({ thread: th.id, score: c.score, body: String(c.body) })
    }
    ids.push({ set: 'samples', id: th.id, community: `r/${th.subreddit}`, url: `https://www.reddit.com/r/${th.subreddit}/comments/${th.id}/` })
  }
  comments.sort((a, b) => b.score - a.score)
  writeFileSync(join(WORK, `pool-${sub}.json`), JSON.stringify(comments.slice(0, 160), null, 1))
  log(`pool ${sub}: ${threads.length} threads (${threads.map((x) => x.num_comments).join(',')} comments), ${comments.length} usable comments, kept ${Math.min(160, comments.length)}`)
}
writeFileSync(join(WORK, 'posts.json'), JSON.stringify(test, null, 1))
writeFileSync(join(D, 'ids.json'), JSON.stringify(ids, null, 1))
log(`total test ${test.length}`)
