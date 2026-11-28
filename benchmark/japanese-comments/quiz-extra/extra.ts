// Extra Japanese quiz pairs (2026-11-27). Not a benchmark round: threads are picked for the public quiz.
// The four subreddits of ../PROTOCOL.md, posts from 2026-07-01 to 2026-11-26 (UTC), leaving out the Japanese test's 28
// test threads and 40 sample threads (../ids.json). Eligibility as ../PROTOCOL.md and ../collect.ts: a question post,
// body not [removed]/[deleted], not NSFW, 10+ comments, Japanese, not political, and a top-level human comment of 5+ points
// and 10+ characters (the highest-scored one is the real side; if it is not Japanese the thread is skipped). Added for the
// quiz: link and image posts (not a text post, removed by the mods, or a body with an image or only a link) and threads
// whose real top comment is only a link or has an image are left out. Political check: the tool's GUARD with Haiku and the
// same prompt with Sonnet; either one flags it, it is out. Then a hand read of every candidate (hand.json).
// The AI side is ../ja.ts SKILL (the shipped reply path: the same labelled pools, type rates, examples, seeded type draw,
// three Sonnet drafts, Haiku pick) with one change, the candidate persona line: ", and you often skip the final period."
// becomes ". Punctuate and break lines the way the real comments below do." The change is made in a patched copy of
// lib/prompts.mjs in the working folder (prompts-candidate.mjs); skills/community-humanizer/lib/prompts.mjs is not touched.
// Judging: ../../reddit-comments/judge.ts prompt word for word, the AI reply and the real top comment only, labelled A/B
// in a seeded order per judge (opus, sonnet); raw answers kept.
//   bun extra.ts collect               Arctic Shift listings of the window, one request at a time (cached per subreddit)
//   bun extra.ts filter <n>            walk eligible threads round-robin (newsokur, lowlevelaware, ja, newsokunomoral), each
//                                      subreddit by comment count; stop after <n> candidates; writes walk.json, cands.json
//   bun extra.ts screen [from]         print candidates for the hand read (writes nothing)
//   bun extra.ts gen                   SKILL replies for candidates not dropped in hand.json
//   bun extra.ts judge <opus|sonnet>   judged/<judge>/<id>.json, raw answers in judged-raw/<judge>/
//   bun extra.ts show [n]              pairs with scores, hardest first, for the native-reader review
//   bun extra.ts write                 posts.json (kept pairs, from review.json) in WORK, ids.json (links only) here
//   bun extra.ts scrub                 remove usernames from the cached listings (trees keep only an is-the-poster flag)
// WORK (outside git, default ~/.trina/know-raw/japanese-quiz-extra) holds every real text, hand.json and review.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD } from '../../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../../skills/community-humanizer/lib/claude.mjs'
import { defaults } from '../../../skills/community-humanizer/lib/profile.mjs'

process.env.WORK ??= join(homedir(), '.trina/know-raw/japanese-quiz-extra')
const WORK = process.env.WORK
mkdirSync(join(WORK, 'tree'), { recursive: true })
const { claude, pooled, arctic, japanesePost, japaneseComment, chars } = await import('../lib.ts')
const D = import.meta.dir, JA = join(D, '..')
const OLDWORK = join(homedir(), '.trina/know-raw/japanese-voice-test')
const [cmd, arg] = process.argv.slice(2)
const rd = (f: string, d: any = null) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)
const wr = (f: string, x: any) => writeFileSync(f, JSON.stringify(x, null, 1))

// ---- the candidate persona line, in a patched copy of the shipped prompts
const SHIPPED = join(D, '../../../skills/community-humanizer/lib/prompts.mjs')
const OLD_END = ', and you often skip the final period.'
const NEW_END = '. Punctuate and break lines the way the real comments below do.'
const shipped = readFileSync(SHIPPED, 'utf8')
if (shipped.split(OLD_END).length !== 2) throw new Error('persona line not found once in the shipped prompts.mjs')
const PATCHED = join(WORK, 'prompts-candidate.mjs')
writeFileSync(PATCHED, `// Patched copy of skills/community-humanizer/lib/prompts.mjs, written by benchmark/japanese-comments/quiz-extra/extra.ts:\n// personaEn ends "No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do."\n${shipped.replace(OLD_END, NEW_END)}`)
const { types, replyPrompt, replyPick } = await import(PATCHED)

const SUBS = ['newsokur', 'lowlevelaware', 'ja', 'newsokunomoral'] // the protocol's round-robin order
const t = (s: string) => Math.floor(Date.parse(s) / 1000)
const FROM = t('2026-07-01T00:00:00Z'), UNTIL = t('2026-11-27T00:00:00Z')
// the Japanese test's threads (28 test, 40 sample): never used here
const USED = new Set((rd(join(JA, 'ids.json')) as any[]).map((x) => x.id))

// ---- listings
const listFile = (sub: string) => join(WORK, `listing-${sub}.json`)
const slim = (p: any) => ({ id: p.id, subreddit: p.subreddit, title: p.title, selftext: p.selftext ?? '', num_comments: p.num_comments, score: p.score, author: p.author, created_utc: p.created_utc, over_18: p.over_18, is_self: p.is_self, url: p.url, post_hint: p.post_hint ?? null, removed_by_category: p.removed_by_category ?? null })
if (cmd === 'collect') {
  for (const sub of SUBS) {
    const st = rd(listFile(sub), { done: false, posts: [] })
    if (st.done) { console.log(`${sub}: ${st.posts.length} posts (cached)`); continue }
    let before = st.posts.length ? Math.min(...st.posts.map((p: any) => p.created_utc)) : UNTIL
    for (;;) {
      const r = await arctic(`/posts/search?subreddit=${sub}&after=${FROM}&before=${before}&limit=100&sort=desc`)
      if (!r.length) break
      st.posts.push(...r.map(slim))
      before = r[r.length - 1].created_utc
      wr(listFile(sub), st)
      console.log(`${sub}: ${st.posts.length} (back to ${new Date(before * 1000).toISOString().slice(0, 10)})`)
      if (r.length < 100) break
    }
    st.posts = [...new Map(st.posts.map((p: any) => [p.id, p])).values()]
    st.done = true
    wr(listFile(sub), st)
    console.log(`${sub}: ${st.posts.length} posts listed`)
  }
}

// ---- eligibility (../collect.ts, word for word for the question rule)
const QUESTION = new RegExp('[?？]|教えて|質問|相談|助けて|おすすめ|オススメ|お勧め|お薦め|どう(?!ぞ|も)|どこ|どれ|どっち|どの|どんな|なぜ|何故|なんで|何で|何(?:が|を|か)|なに(?:が|を|か)|誰か|知りたい|聞きたい|求む|(?:(?<![とっ])か|かな|かね|かい|の|っけ|だろう|でしょう)[\\s。、…!！wｗ笑]*$', 'u')
const removed = (s: string) => /^\[(removed|deleted)\]/.test(s.trim())
const text = (p: any) => `${p.title}\n\n${p.selftext ?? ''}`
const byBusy = (a: any, b: any) => b.num_comments - a.num_comments || a.created_utc - b.created_utc
const IMG = /preview\.redd\.it|i\.redd\.it|v\.redd\.it|imgur\.com|giphy\.com|!\[[^\]]*\]\(|\.(png|jpe?g|gif|webp|mp4)\b/i
const bare = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim()
const listed = (sub: string) => (rd(listFile(sub), { posts: [] }).posts as any[]).filter((p) => p.created_utc >= FROM && p.created_utc < UNTIL)
function eligible(sub: string) {
  const all = listed(sub)
  const q = all.filter((p) => p.num_comments >= 10 && QUESTION.test(p.title) && !removed(String(p.selftext ?? '')) && !p.over_18)
  const ja = q.filter((p) => japanesePost(text(p)))
  const el = ja.filter((p) => !USED.has(p.id)).sort(byBusy)
  return { all: all.length, question: q.length, notJa: q.length - ja.length, used: ja.length - el.length, el }
}
// link and image posts: not a text post, removed by the mods, a body with an image, or a body that is only a link
const linkPost = (p: any) => (!p.is_self ? 'link or image post' : p.removed_by_category ? 'removed post' : IMG.test(String(p.selftext)) ? 'image in the post' : String(p.selftext).trim() && !bare(String(p.selftext)) ? 'link-only post' : null)

// ---- political check: the tool's GUARD to Haiku and to Sonnet; the tool's rule: anything but a clear no is political
const guardFile = join(WORK, 'guard.json')
const guard: Record<string, { haiku?: string; sonnet?: string }> = rd(guardFile, {})
const flagged = (a?: string) => a != null && !/^\s*no\b/i.test(a)
async function check(p: any) {
  const g = (guard[p.id] ??= {}), q = GUARD(p.title, String(p.selftext ?? '').slice(0, 1500))
  await Promise.all((['haiku', 'sonnet'] as const).filter((m) => g[m] == null).map(async (m) => { g[m] = await claude(m, q, `guard-${m}`); wr(guardFile, guard) }))
}

// top-level comments only, kept as score, body and three flags (no usernames)
async function tree(p: any): Promise<any[]> {
  const f = join(WORK, 'tree', `${p.id}.json`)
  if (existsSync(f)) return rd(f)
  if (!p.author) throw new Error(`no poster name for ${p.id} (listing scrubbed?)`)
  const r = await arctic(`/comments/tree?link_id=t3_${p.id}&limit=200`)
  const top = r.map((x: any) => x?.data).filter(Boolean).map((c: any) => ({ score: c.score ?? 0, body: String(c.body ?? ''), op: c.author === p.author, bot: c.author === 'AutoModerator', deleted: c.author === '[deleted]' }))
  wr(f, top)
  return top
}
const human = (cs: any[]) => cs.filter((c) => c.body && !removed(c.body) && !c.op && !c.bot && !c.deleted && chars(c.body) >= 10 && c.score >= 5).sort((a, b) => b.score - a.score)[0]

const walkFile = join(WORK, 'walk.json'), candsFile = join(WORK, 'cands.json')
if (cmd === 'filter') {
  const want = Number(arg ?? 150)
  const queues = Object.fromEntries(SUBS.map((s) => [s, eligible(s).el]))
  for (const s of SUBS) { const e = eligible(s); console.log(`${s}: ${e.all} posts in the window, ${e.question} question threads with 10+ comments (not NSFW, not removed), ${e.notJa} not Japanese, ${e.used} used by the Japanese test, ${e.el.length} eligible`) }
  const order: any[] = []
  for (let i = 0; SUBS.some((s) => queues[s]![i]); i++) for (const s of SUBS) if (queues[s]![i]) order.push(queues[s]![i])
  const walk: any[] = [], cands: any[] = []
  for (let i = 0; i < order.length && cands.length < want; i += 16) {
    const chunk = order.slice(i, i + 16)
    await pooled(chunk.filter((p) => !linkPost(p)), 8, check)
    for (const p of chunk) {
      if (cands.length >= want) break
      const w = (status: string) => walk.push({ id: p.id, sub: p.subreddit, comments: p.num_comments, status })
      const lp = linkPost(p)
      if (lp) { w(lp); continue }
      const g = guard[p.id]!, h = flagged(g.haiku), s = flagged(g.sonnet)
      if (h || s) { w(`political (${h && s ? 'Haiku and Sonnet' : h ? 'Haiku only' : 'Sonnet only'})`); continue }
      const c = human(await tree(p))
      if (!c) { w('no top-level human comment with 5+ points'); continue }
      if (!japaneseComment(c.body)) { w('top comment not Japanese'); continue }
      if (IMG.test(c.body) || !bare(c.body)) { w('top comment only a link or has an image'); continue }
      w('candidate')
      cands.push({ id: p.id, sub: p.subreddit, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, created: p.created_utc, human: { score: c.score, body: c.body } })
    }
    wr(walkFile, { window: '2026-07-01..2026-11-26', walk }); wr(candsFile, cands)
    console.log(`walked ${walk.length}, candidates ${cands.length}`)
  }
  const n: Record<string, number> = {}
  for (const x of walk) n[x.status] = (n[x.status] ?? 0) + 1
  console.log(`walked ${walk.length} of ${order.length}: ${JSON.stringify(n)}`)
}

const hand: Record<string, string> = rd(join(WORK, 'hand.json'), {}) // id -> why it was dropped by hand before generation
const MINOR = /中学|高校|高[一二三123１２３]|中[一二三123１２３]|JK|JC|DK|DC|小学|[1１][0-7０-７]歳|未成年|学生/
if (cmd === 'screen') {
  for (const p of (rd(candsFile) as any[]).slice(Number(arg ?? 0))) {
    if (hand[p.id]) continue
    const flags = [MINOR.test(text(p)) ? 'MINOR?' : '', /https?:\/\//.test(p.human.body) ? 'LINK-IN-REAL' : ''].filter(Boolean).join(' ')
    console.log(`\n=== ${p.id} r/${p.sub} (${new Date(p.created * 1000).toISOString().slice(0, 10)}, ${p.comments} comments) ${flags}\nT: ${p.title}\nB: ${String(p.body).replace(/\s+/g, ' ').slice(0, 300)}\nH(${p.human.score}): ${String(p.human.body).replace(/\s+/g, ' ').slice(0, 300)}`)
  }
}

// ---- generation: ../ja.ts skill(), word for word, with the patched persona line
const OUT = join(D, 'outputs')
const defs = types('en', undefined)
const fallback = defaults('en')
function skillSetup(p: any) {
  const pool = (rd(join(OLDWORK, `labelled-${String(p.sub).toLowerCase()}.json`)) as any[]).filter((c) => c.thread !== p.id)
  const rates = pool.length >= 40 ? Object.fromEntries(Object.keys(fallback).map((t) => [t, pool.filter((c) => c.type === t).length / pool.length])) : fallback
  const examples = (t: string) => pool.filter((c) => c.type === t).slice(0, 6).map((c) => c.body.slice(0, 400))
  const r = rng(p.id), kinds: string[] = []
  const left = new Map(Object.entries(rates).filter(([t, v]) => defs[t] && (v as number) > 0 && examples(t).length >= 2))
  while (kinds.length < 3 && left.size) {
    let x = r() * [...left.values()].reduce((a: number, b: any) => a + b, 0)
    for (const [t, v] of left) { x -= v as number; if (x <= 0) { kinds.push(t); left.delete(t); break } }
  }
  return { kinds, examples, rates_from: pool.length >= 40 ? `pool (${pool.length})` : 'defaults' }
}
const generated = () => (rd(candsFile, []) as any[]).filter((p) => existsSync(join(OUT, `${p.id}__SKILL.txt`)))

if (cmd === 'gen') {
  mkdirSync(join(OUT, 'drafts'), { recursive: true })
  const todo = (rd(candsFile) as any[]).filter((p) => !hand[p.id] && !existsSync(join(OUT, `${p.id}__SKILL.txt`)))
  await pooled(todo, 5, async (p) => {
    const { kinds, examples, rates_from } = skillSetup(p)
    const prompts = kinds.map((t) => replyPrompt('en', p, t, examples(t), undefined, block, undefined) as string)
    if (prompts.some((s) => !s.includes('no list of tips. Punctuate and break lines the way the real comments below do.'))) throw new Error('patched persona line missing')
    const drafts = await Promise.all(prompts.map((s) => claude('sonnet', s, 'gen-skill')))
    const pick = await claude('haiku', replyPick('en', p, drafts, block), 'gen-pick')
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    wr(join(OUT, 'drafts', `${p.id}.json`), { kinds, drafts, pick: k, haiku: pick, rates_from })
    writeFileSync(join(OUT, `${p.id}__SKILL.txt`), drafts[k]!)
  })
  console.log(`gen: ${todo.length} jobs, ${generated().length} written`)
}

// ---- judging: ../../reddit-comments/judge.ts prompt and order() word for word, two replies
const ARMS = ['SKILL', 'HUMAN']
const L = 'ABCDEFGH'
function order(seed: string): string[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const a = [...ARMS]
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] }
  return a
}
const reply = (p: any, arm: string) => (arm === 'HUMAN' ? String(p.human.body) : readFileSync(join(OUT, `${p.id}__${arm}.txt`), 'utf8'))
function prompt(p: any, ord: string[]) {
  return `Below is a post from r/${p.sub} and ${ord.length} replies to it, labelled ${L.slice(0, ord.length).split('').join(', ')}. Some replies were written by people who really commented in this thread, some were written by an AI.

For each reply, give the probability (0-100) that a human wrote it. Then rank all replies by which you would upvote as a regular reader of r/${p.sub}, best first.

Answer with JSON only: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}

Post in r/${p.sub}:
Title: ${p.title}

${p.body}

${ord.map((arm, i) => `--- Reply ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
}

if (cmd === 'judge') {
  const judge = arg!
  if (judge !== 'opus' && judge !== 'sonnet') throw new Error('judge: opus or sonnet')
  const dir = join(D, 'judged', judge), rawDir = join(D, 'judged-raw', judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  const todo = generated().filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, 5, async (p) => {
    const ord = order(`${p.id}:${judge}`)
    for (let a = 0; a < 2; a++) {
      try {
        const res = await claude(judge, prompt(p, ord), `judge-${judge}`)
        writeFileSync(join(rawDir, a ? `${p.id}.try2.txt` : `${p.id}.txt`), res)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        wr(join(dir, `${p.id}.json`), { id: p.id, sub: p.sub, order: ord, human, rank })
        return
      } catch {}
    }
    console.log(`failed ${judge} ${p.id}`)
  })
  console.log(`${judge}: judged ${todo.length}`)
}

// ---- review and output
const sc = (id: string, j: string) => rd(join(D, 'judged', j, `${id}.json`))
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const avg = (id: string, arm: string) => { const v = ['opus', 'sonnet'].map((j) => sc(id, j)).filter(Boolean); return v.length ? mean(v.map((r) => r.human[arm])) : NaN }
const diff = (id: string) => avg(id, 'SKILL') - avg(id, 'HUMAN')
const review: Record<string, string> = rd(join(WORK, 'review.json'), {}) // id -> "keep" or why it was dropped
const cost = () => { const f = join(WORK, 'costs.jsonl'); if (!existsSync(f)) return {} as Record<string, number>; const by: Record<string, number> = {}; for (const l of readFileSync(f, 'utf8').trim().split('\n')) { const c = JSON.parse(l); by[c.stage] = (by[c.stage] ?? 0) + (c.cost ?? 0) } return by }

if (cmd === 'show') {
  const ps = generated().sort((a, b) => diff(b.id) - diff(a.id))
  for (const p of ps.slice(0, Number(arg ?? 1e9))) {
    const o = sc(p.id, 'opus'), s = sc(p.id, 'sonnet'), d = rd(join(OUT, 'drafts', `${p.id}.json`))
    console.log(`\n=== ${p.id} r/${p.sub} d=${diff(p.id).toFixed(0)} | opus ai ${o?.human.SKILL} real ${o?.human.HUMAN} | sonnet ai ${s?.human.SKILL} real ${s?.human.HUMAN} | ${d.kinds[d.pick]} of ${d.kinds.join(',')} | chars ai ${chars(reply(p, 'SKILL'))} real ${chars(p.human.body)} ${review[p.id] ? '| ' + review[p.id] : ''}\nT: ${p.title}\nB: ${String(p.body).slice(0, 500)}\n-- AI: ${reply(p, 'SKILL')}\n-- REAL(${p.human.score}): ${p.human.body}`)
  }
}

const scrubText = (s: string) => s.replace(/\bu\/[A-Za-z0-9_-]+/g, 'u/…')
if (cmd === 'write') {
  const ps = generated()
  const kept = ps.filter((p) => review[p.id] === 'keep').sort((a, b) => diff(b.id) - diff(a.id))
  wr(join(WORK, 'posts.json'), kept.map(({ id, sub, title, body, comments, created, human }: any) => ({ id, sub, title: scrubText(title), body: scrubText(body), comments, created, human: { score: human.score, body: scrubText(human.body) } })))
  const walk = (rd(walkFile) as any).walk as any[]
  const set = (w: any) => w.status !== 'candidate' ? w.status : hand[w.id] ? 'dropped by hand before generation' : review[w.id] === 'keep' ? 'quiz' : review[w.id] ? 'generated, dropped in review' : 'generated, not reviewed'
  wr(join(D, 'ids.json'), walk.map((w) => ({ set: set(w), id: w.id, community: `r/${w.sub}`, url: `https://www.reddit.com/r/${w.sub}/comments/${w.id}/` })))
  const n: Record<string, number> = {}
  for (const w of walk) n[set(w)] = (n[set(w)] ?? 0) + 1
  const sub = (xs: any[]) => { const c: Record<string, number> = {}; for (const p of xs) c[p.sub] = (c[p.sub] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`walked ${walk.length}: ${JSON.stringify(n)}`)
  console.log(`kept ${kept.length} ${sub(kept)}: AI side ${mean(kept.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(kept.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)} (mean of Opus and Sonnet); opus ai/real ${mean(kept.map((p) => sc(p.id, 'opus').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'opus').human.HUMAN)).toFixed(1)}, sonnet ${mean(kept.map((p) => sc(p.id, 'sonnet').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'sonnet').human.HUMAN)).toFixed(1)}; AI judged more human than the real one in ${kept.filter((p) => diff(p.id) > 0).length}`)
  console.log(`all generated ${ps.length} ${sub(ps)}: AI side ${mean(ps.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(ps.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)}`)
  const c = cost()
  console.log(`cost (total_cost_usd): ${Object.entries(c).map(([k, v]) => `${k} $${v.toFixed(2)}`).join(', ')}; total $${Object.values(c).reduce((a, b) => a + b, 0).toFixed(2)}`)
}

if (cmd === 'scrub') {
  for (const sub of SUBS) {
    const st = rd(listFile(sub))
    if (!st) continue
    for (const p of st.posts) delete p.author
    wr(listFile(sub), st)
  }
  const left = readdirSync(join(WORK, 'tree')).filter((f) => Object.keys(rd(join(WORK, 'tree', f))[0] ?? {}).includes('author'))
  console.log(`listings scrubbed; trees with usernames: ${left.length}`)
}
