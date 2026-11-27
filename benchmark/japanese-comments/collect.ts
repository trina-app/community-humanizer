// Collects the Japanese test set and sample pools (PROTOCOL.md) through Arctic Shift, one request at a time.
// Writes to the working folder: listing-<sub>.json, tree/<id>.json, political.json, political-sonnet.json, posts.json,
// pool-<sub>.json, collect.log; and ids.json (links only) next to this script. Usage: bun collect.ts
// Same as ../indonesian-comments/collect.ts except: the subreddits, the Japanese check and question markers, a HUMAN
// comment of 10+ characters (not 20), and a second fallback to 2026-09-01.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORK, D, claude, arctic, japanesePost, japaneseComment, chars } from './lib'
import { GUARD } from '../../skills/community-humanizer/lib/prompts.mjs'

const SUBS = (process.env.SUBS ?? '').split(',').filter(Boolean)
if (!SUBS.length) throw new Error('SUBS: the subreddits of PROTOCOL.md, in round-robin order')
const t = (s: string) => Math.floor(Date.parse(s) / 1000)
const POOL_FROM = t('2026-10-01T00:00:00Z'), SEP = t('2026-09-01T00:00:00Z'), UNTIL = t('2026-11-27T00:00:00Z')
// question post: a ? or ？ anywhere, a question word or request anywhere, or a title ending in a question particle
const QUESTION = new RegExp('[?？]|教えて|質問|相談|助けて|おすすめ|オススメ|お勧め|お薦め|どう(?!ぞ|も)|どこ|どれ|どっち|どの|どんな|なぜ|何故|なんで|何で|何(?:が|を|か)|なに(?:が|を|か)|誰か|知りたい|聞きたい|求む|(?:(?<![とっ])か|かな|かね|かい|の|っけ|だろう|でしょう)[\\s。、…!！wｗ笑]*$', 'u')
const MAX_ELIGIBLE = 12, TEST_N = 28, POOL_THREADS = 10, HUMAN_MIN_CHARS = 10
mkdirSync(join(WORK, 'tree'), { recursive: true })
const LOG = join(WORK, 'collect.log')
const log = (s: string) => { console.log(s); appendFileSync(LOG, s + '\n') }
const removed = (s: string) => /^\[(removed|deleted)\]/.test(s.trim())

// every post of the subreddit from `from` to `until`, newest first, paged by created_utc
async function listing(sub: string, from: number, until: number, tag: string): Promise<any[]> {
  const f = join(WORK, `listing-${sub}${tag}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const out: any[] = []
  let before = until
  for (let page = 0; page < 200; page++) {
    const r = await arctic(`/posts/search?subreddit=${sub}&after=${from}&before=${before}&limit=100&sort=desc&fields=id,title,selftext,num_comments,score,author,created_utc,subreddit,over_18`)
    if (!r.length) break
    out.push(...r)
    before = r[r.length - 1].created_utc
    if (r.length < 100) break
  }
  const uniq = [...new Map(out.map((p) => [p.id, p])).values()]
  writeFileSync(f, JSON.stringify(uniq))
  log(`${sub}${tag}: ${uniq.length} posts listed (${uniq[0]?.subreddit ?? '?'})`)
  return uniq
}

async function tree(id: string): Promise<any[]> {
  const f = join(WORK, 'tree', `${id}.json`)
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const r = await arctic(`/comments/tree?link_id=t3_${id}&limit=200`)
  writeFileSync(f, JSON.stringify(r))
  return r
}

// the tool's guard (Haiku) and the same prompt asked to Sonnet; either one calling a thread political leaves it out.
// The tool's rule: anything but a clear no counts as political.
const PF = join(WORK, 'political.json'), PF2 = join(WORK, 'political-sonnet.json')
const pol: Record<string, boolean> = existsSync(PF) ? JSON.parse(readFileSync(PF, 'utf8')) : {}
const pol2: Record<string, boolean> = existsSync(PF2) ? JSON.parse(readFileSync(PF2, 'utf8')) : {}
const removedBy: Record<string, { haiku: number; sonnet: number; both: number }> = {}
async function political(p: any, where: string): Promise<boolean> {
  const q = GUARD(p.title, String(p.selftext ?? '').slice(0, 1500))
  await Promise.all([
    !(p.id in pol) && claude('haiku', q, 'guard').then((a) => { pol[p.id] = !/^\s*no\b/i.test(a); writeFileSync(PF, JSON.stringify(pol, null, 1)) }),
    !(p.id in pol2) && claude('sonnet', q, 'guard-sonnet').then((a) => { pol2[p.id] = !/^\s*no\b/i.test(a); writeFileSync(PF2, JSON.stringify(pol2, null, 1)) }),
  ])
  const h = pol[p.id]!, s = pol2[p.id]!
  if (h || s) {
    const k = `${where} ${p.subreddit.toLowerCase()}`
    removedBy[k] ??= { haiku: 0, sonnet: 0, both: 0 }
    removedBy[k]![h && s ? 'both' : h ? 'haiku' : 'sonnet']++
    if (!h) log(`  sonnet guard: political, haiku said no: ${p.id}`)
    if (!s) log(`  haiku guard: political, sonnet said no: ${p.id}`)
  }
  return h || s
}
const text = (p: any) => `${p.title}\n\n${p.selftext ?? ''}`
const byBusy = (a: any, b: any) => b.num_comments - a.num_comments || a.created_utc - b.created_utc

writeFileSync(LOG, `collect ${new Date().toISOString()}\n`)
const lists: Record<string, any[]> = {}
for (const sub of SUBS) lists[sub] = await listing(sub, POOL_FROM, UNTIL, '')

// eligible test threads per subreddit, in comment-count order
async function eligibleFrom(from: number) {
  const eligible: Record<string, any[]> = {}
  for (const sub of SUBS) {
    const cands = lists[sub]!.filter((p) => p.created_utc >= from && p.created_utc < UNTIL && p.num_comments >= 10 && QUESTION.test(p.title) && !removed(String(p.selftext ?? '')) && !p.over_18).sort(byBusy)
    const notJa = cands.filter((p) => !japanesePost(text(p)))
    log(`${sub}: ${cands.length} question threads with 10+ comments (not NSFW), ${notJa.length} not Japanese`)
    eligible[sub] = []
    for (const p of cands.filter((p) => japanesePost(text(p)))) {
      if (eligible[sub]!.length >= MAX_ELIGIBLE) break
      if (await political(p, 'test')) { log(`  skip ${p.id} (${p.num_comments} comments): political`); continue }
      const human = (await tree(p.id)).map((x) => x?.data).filter((c) => c && c.body && !removed(String(c.body)) && c.author !== p.author && c.author !== 'AutoModerator' && c.author !== '[deleted]' && chars(String(c.body)) >= HUMAN_MIN_CHARS && (c.score ?? 0) >= 5).sort((a, b) => b.score - a.score)[0]
      if (!human) { log(`  skip ${p.id} (${p.num_comments} comments): no top-level human comment with 5+ points`); continue }
      if (!japaneseComment(String(human.body))) { log(`  skip ${p.id} (${p.num_comments} comments): top comment not Japanese`); continue }
      eligible[sub]!.push({ id: p.id, sub: p.subreddit, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, created: p.created_utc, human: { score: human.score, body: String(human.body) } })
    }
    log(`${sub}: ${eligible[sub]!.length} eligible`)
  }
  return eligible
}
const total = (e: Record<string, any[]>) => Object.values(e).reduce((s, x) => s + x.length, 0)
let eligible = await eligibleFrom(t('2026-11-01T00:00:00Z'))
if (total(eligible) < TEST_N) {
  log('fewer than 28 eligible from 2026-11-01: the start moves back to 2026-10-01 (PROTOCOL.md)')
  for (const k of Object.keys(removedBy)) delete removedBy[k]
  eligible = await eligibleFrom(POOL_FROM)
}
if (total(eligible) < TEST_N) {
  log('fewer than 28 eligible from 2026-10-01: the start moves back to 2026-09-01 (PROTOCOL.md)')
  for (const sub of SUBS) lists[sub] = [...lists[sub]!, ...(await listing(sub, SEP, POOL_FROM, '-sep'))]
  for (const k of Object.keys(removedBy)) delete removedBy[k]
  eligible = await eligibleFrom(SEP)
}

// round-robin in the protocol's order until 28
const test: any[] = []
for (let round = 0; test.length < TEST_N && round < MAX_ELIGIBLE; round++) for (const sub of SUBS) if (test.length < TEST_N && eligible[sub]![round]) test.push(eligible[sub]![round])
const testIds = new Set(test.map((p) => p.id))
for (const sub of SUBS) log(`test ${sub}: ${test.filter((p) => p.sub.toLowerCase() === sub).length}`)

// sample pools: the 10 busiest other Japanese, non-political threads from 2026-10-01 to 11-26
const ids: any[] = test.map((p) => ({ set: 'test', id: p.id, community: `r/${p.sub}`, url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/` }))
for (const sub of SUBS) {
  const others = lists[sub]!.filter((p) => p.created_utc >= POOL_FROM && !testIds.has(p.id) && p.num_comments >= 5 && !p.over_18 && japanesePost(text(p))).sort(byBusy)
  const threads: any[] = []
  for (const minC of [10, 5]) for (const p of others.filter((p) => p.num_comments >= minC)) {
    if (threads.length >= POOL_THREADS) break
    if (threads.some((x) => x.id === p.id)) continue
    if (await political(p, 'pool')) { log(`  pool skip ${sub} ${p.id}: political`); continue }
    threads.push(p)
  }
  const comments: any[] = []
  for (const th of threads) {
    for (const c of (await tree(th.id)).map((x) => x?.data).filter(Boolean)) {
      if (!c.body || removed(String(c.body)) || c.author === th.author || c.author === 'AutoModerator' || c.author === '[deleted]' || (c.score ?? 0) < 2) continue
      if (!japaneseComment(String(c.body))) continue
      comments.push({ thread: th.id, score: c.score, body: String(c.body) })
    }
    ids.push({ set: 'samples', id: th.id, community: `r/${th.subreddit}`, url: `https://www.reddit.com/r/${th.subreddit}/comments/${th.id}/` })
  }
  comments.sort((a, b) => b.score - a.score)
  writeFileSync(join(WORK, `pool-${sub}.json`), JSON.stringify(comments.slice(0, 160), null, 1))
  log(`pool ${sub}: ${threads.length} threads (${threads.map((x) => x.num_comments).join(',')} comments), ${comments.length} usable comments, kept ${Math.min(160, comments.length)}`)
}
log(`political removals (where subreddit: flagged by haiku only / sonnet only / both): ${Object.entries(removedBy).map(([k, v]) => `${k} ${v.haiku}/${v.sonnet}/${v.both}`).join(', ') || 'none'}`)
log(`guard calls: ${Object.keys(pol).length} threads read by haiku, ${Object.keys(pol2).length} by sonnet`)
writeFileSync(join(WORK, 'posts.json'), JSON.stringify(test, null, 1))
writeFileSync(join(D, 'ids.json'), JSON.stringify(ids, null, 1))
log(`total test ${test.length}`)
