// Extra Simplified-Chinese quiz pairs (2026-11-27). Not a benchmark round: threads are picked for the public quiz.
// r/China_irl text posts from 2026-08-01 to 2026-11-26 with 10+ comments and a top-level human comment of 5+ points,
// leaving out the Chinese test's 28 test threads and 20 sample threads. Political check: the tool's GUARD with Haiku
// AND the same question to Sonnet; either flags it, it is out. Then a hand read (sensitive topics, see hand.json).
// The AI side is the shipped reply path as in ../zh.ts (same labelled sample pool, type rates, seeded draw, Sonnet
// drafts, Haiku pick) with one change, the Round P candidate persona line (../../reddit-comments/punct.ts): ", and you
// often skip the final period." becomes ". Punctuate and break lines the way the real comments below do." The change is
// made on the prompt string here; skills/community-humanizer/lib/prompts.mjs is not touched.
// Judging: ../../reddit-comments/judge.ts prompt word for word, the AI reply and the real top comment only, A/B in a
// seeded order per judge (opus, sonnet).
//   bun extra.ts collect                  Arctic Shift posts of the window (cached), eligible count
//   bun extra.ts filter <n>               walk eligible threads by comment count: Haiku GUARD, Sonnet GUARD, 5+ comment;
//                                         stop after <n> threads pass; writes walk.json and cands.json
//   bun extra.ts screen                   print the candidates for the hand read (writes nothing)
//   bun extra.ts gen                      SKILL replies for candidates not dropped in hand.json
//   bun extra.ts judge <opus|sonnet>      judged/<judge>/<id>.json, raw answers in judged-raw/<judge>/
//   bun extra.ts show                     pairs with scores, hardest first, for the native-reader review
//   bun extra.ts write                    posts.json (kept pairs, from review.json) and ids.json (links only)
// DATA (outside git, default ~/.trina/know-raw/chinese-quiz-extra) holds every real text, hand.json and review.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD, types, replyPrompt, replyPick } from '../../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../../skills/community-humanizer/lib/claude.mjs'
import { defaults } from '../../../skills/community-humanizer/lib/profile.mjs'

process.env.DATA ??= join(homedir(), '.trina/know-raw/chinese-quiz-extra')
const DATA = process.env.DATA
mkdirSync(join(DATA, 'tree'), { recursive: true })
const { claude, pooled, totalCost } = await import('../lib.ts')
const D = import.meta.dir, ZH = join(D, '..')
const OLDDATA = join(homedir(), '.trina/know-raw/chinese-voice-test')
const [cmd, arg] = process.argv.slice(2)
const API = 'https://arctic-shift.photon-reddit.com/api'
const SUB = 'China_irl'
const START = '2026-08-01', END = '2026-11-27' // posts created 2026-08-01 to 2026-11-26 UTC
const rd = (f: string, d: any = null) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)
const wr = (f: string, x: any) => writeFileSync(f, JSON.stringify(x, null, 1))

// the Chinese test's threads: never used here
const oldWalk = rd(join(OLDDATA, 'walk.json')).walk as any[]
const USED = new Set(oldWalk.filter((w) => w.status !== 'political').map((w) => w.id))

async function get(path: string): Promise<any[]> {
  for (let i = 0; i < 8; i++) {
    await Bun.sleep(2600)
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

const postsFile = join(DATA, 'all-posts.json')
let all: any[] = rd(postsFile, [])
const text = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').trim()
const eligible = () => all.filter((p) => !USED.has(p.id) && p.is_self && !p.over_18 && !p.removed_by_category && !/^\[(removed|deleted)\]$/.test(String(p.selftext).trim()) && p.num_comments >= 10)
  .sort((a, b) => b.num_comments - a.num_comments || (a.id < b.id ? -1 : 1))

if (cmd === 'collect') {
  const after = Date.parse(`${START}T00:00:00Z`) / 1000
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
  console.log(`window ${START}..${END}: ${all.length} posts, ${all.filter((p) => USED.has(p.id)).length} used by the Chinese test, ${eligible().length} eligible`)
}

// ---- political check: Haiku GUARD (the tool's check; the Chinese test's Haiku answers are reused), then Sonnet
const guardFile = join(DATA, 'guard.json')
const guard: Record<string, { haiku?: string; sonnet?: string }> = rd(guardFile, {})
const oldGuard = rd(join(OLDDATA, 'guard.json'), {}) as Record<string, { answer: string }>
const flagged = (a?: string) => a != null && !/^\s*no\b/i.test(a) // the tool's rule: anything but a clear no is political
async function check(p: any, model: 'haiku' | 'sonnet') {
  const g = (guard[p.id] ??= {})
  if (model === 'haiku' && g.haiku == null && oldGuard[p.id]) g.haiku = oldGuard[p.id]!.answer
  if (g[model] == null) { g[model] = await claude(model, GUARD(p.title, String(p.selftext ?? '').slice(0, 1500)), `guard-${model}`); wr(guardFile, guard) }
  return flagged(g[model])
}

async function tree(p: any): Promise<any[]> {
  const f = join(DATA, 'tree', `${p.id}.json`)
  if (existsSync(f)) return rd(f)
  const t = await get(`/comments/tree?link_id=t3_${p.id}&limit=1000`)
  const top = t.filter((x) => x?.kind !== 'more').map((x) => x?.data).filter(Boolean).map((c: any) => ({ score: c.score ?? 0, body: String(c.body ?? ''), op: c.author === p.author, bot: c.author === 'AutoModerator', deleted: c.author === '[deleted]' }))
  writeFileSync(f, JSON.stringify(top))
  return top
}
const ok = (c: any) => !c.op && !c.bot && !c.deleted && c.body && !/^\[(removed|deleted)\]/.test(c.body.trim()) && text(c.body).length >= 2

const walkFile = join(DATA, 'walk.json'), candsFile = join(DATA, 'cands.json')
if (cmd === 'filter') {
  const want = Number(arg ?? 80)
  const el = eligible()
  const walk: any[] = [], cands: any[] = []
  for (let i = 0; i < el.length && cands.length < want; i += 24) {
    const chunk = el.slice(i, i + 24)
    await pooled(chunk, 12, async (p) => { if (!(await check(p, "haiku"))) await check(p, "sonnet") })
    for (const p of chunk) {
      if (cands.length >= want) break
      // a check whose Claude call failed is tried once more; a thread is never passed without both answers
      for (let t = 0; t < 2 && (guard[p.id]?.haiku == null || (!flagged(guard[p.id]!.haiku) && guard[p.id]!.sonnet == null)); t++) {
        try { if (!(await check(p, 'haiku'))) await check(p, 'sonnet') } catch {}
      }
      const g = guard[p.id] ?? {}
      if (g.haiku == null || (!flagged(g.haiku) && g.sonnet == null)) { walk.push({ id: p.id, comments: p.num_comments, status: 'political check failed (left out)' }); continue }
      if (flagged(g.haiku)) { walk.push({ id: p.id, comments: p.num_comments, status: 'political (Haiku GUARD)' }); continue }
      if (flagged(g.sonnet)) { walk.push({ id: p.id, comments: p.num_comments, status: 'political (Sonnet)' }); continue }
      const human = (await tree(p)).filter(ok).sort((a, b) => b.score - a.score).find((c) => c.score >= 5)
      if (!human) { walk.push({ id: p.id, comments: p.num_comments, status: 'no 5+ comment' }); continue }
      walk.push({ id: p.id, comments: p.num_comments, status: 'candidate' })
      cands.push({ id: p.id, sub: SUB, title: p.title, body: String(p.selftext).slice(0, 1500), comments: p.num_comments, created: new Date(p.created_utc * 1000).toISOString().slice(0, 10), human: { score: human.score, body: human.body } })
    }
    wr(walkFile, { window: `${START}..${END}`, eligible: el.length, walk }); wr(candsFile, cands)
    console.log(`walked ${walk.length}, candidates ${cands.length}`)
  }
  const n: Record<string, number> = {}
  for (const w of walk) n[w.status] = (n[w.status] ?? 0) + 1
  console.log(`eligible ${el.length}, walked ${walk.length}: ${JSON.stringify(n)}; cost so far $${totalCost().toFixed(2)}`)
}

const hand: Record<string, string> = rd(join(DATA, 'hand.json'), {}) // id -> "ok", or the reason it was dropped by hand before generation
// drops that need no reading: what quiz/scripts/build-items.ts would drop anyway (its Chinese word list, a stray kana or
// hangul, only one side over 600 characters: the real one here, as replies are short), and a link in the real comment
const ZH_POL = /黄仁勋|老黄|黄皮|爱泼斯坦|萝莉岛|中共|共产党|习近平|政府|政治|台湾|香港|新疆|西藏|穆斯林|伊斯兰|性少数|间谍|认知战|地缘|粉红|润人|经济停止|经济恶化|身败名裂|川普|特朗普|拜登|战争|民主|社会主义|集权/
const cut = (s: string) => (s.length > 600 ? s.slice(0, 600) : s)
// the hand rules written down once they kept recurring: sex, gender war, ethnic labels, religion, police and army,
// self-harm, drugs, minors at school
const SENS = /女权|打拳|国男|国女|中男|中女|白女|白男|黑人|印度人|韩男|日男|蝈蝻|普信|捞女|约炮|嫖|性压抑|性欲|性生活|做爱|撸管|手淫|色情|黄片|同性|跨性别|间性|宗教|基督|佛教|教会|穆斯林|天主|共党|党员|解放军|军队|警察|公安|维稳|翻墙|审查|自杀|跳楼|抑郁|自残|吸毒|毒品|大麻|未成年|小学生|初中生|高中生|牢A|牢a|老🀄|支那|殖民/
function auto(p: any): string | null {
  if ([p.title, cut(p.body), p.human.body].some((s) => ZH_POL.test(s))) return 'build-items word list (ZH_POL)'
  if (/[가-힣぀-ヿ]/.test(p.human.body)) return 'kana or hangul in the real comment (build-items)'
  if (p.human.body.length > 600) return 'real comment over 600 characters (build-items fairness rule)'
  if (/https?:\/\/|preview\.redd\.it|!\[/.test(p.human.body)) return 'link or image in the real comment'
  const m = [p.title, cut(p.body), p.human.body].join(' ').match(SENS)
  if (m) return `sensitive word list (${m[0]})`
  return null
}
if (cmd === 'screen') {
  let changed = 0
  for (const p of rd(candsFile) as any[]) { const a = !hand[p.id] && auto(p); if (a) { hand[p.id] = `auto: ${a}`; changed++ } }
  if (changed) wr(join(DATA, 'hand.json'), hand)
  const n = Number(arg ?? 140)
  for (const p of rd(candsFile) as any[]) {
    if (hand[p.id]) continue
    console.log(`\n=== ${p.id}\nT: ${p.title}\nB: ${String(p.body).replace(/\s+/g, ' ').slice(0, n)}\nH(${p.human.score}): ${String(p.human.body).replace(/\s+/g, ' ').slice(0, n)}`)
  }
}

// ---- generation: ../zh.ts SKILL, word for word, except the persona's last sentence
const OLD_END = 'No greeting, no wrap-up, no list of tips, and you often skip the final period.'
const NEW_END = 'No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do.'
const OUT = join(D, 'outputs')
const lab = rd(join(OLDDATA, 'labelled.json')) as any[]
const defs = types('en', undefined)
const fallback = defaults('en')
const rates = lab.length >= 40 ? Object.fromEntries(Object.keys(fallback).map((t) => [t, lab.filter((c) => c.type === t).length / lab.length])) : fallback
const examples = (t: string) => lab.filter((c) => c.type === t).slice(0, 6).map((c) => c.body.slice(0, 400))
function drawTypes(seed: string) {
  const r = rng(seed), kinds: string[] = []
  const left = new Map(Object.entries(rates).filter(([t, v]) => defs[t] && v > 0 && examples(t).length >= 2))
  while (kinds.length < 3 && left.size) {
    let x = r() * [...left.values()].reduce((a, b) => a + b, 0)
    for (const [t, v] of left) { x -= v; if (x <= 0) { kinds.push(t); left.delete(t); break } }
  }
  return kinds
}
const draftPrompt = (p: any, t: string) => {
  const s = replyPrompt('en', p, t, examples(t), undefined, block, undefined) as string
  if (s.split(OLD_END).length !== 2) throw new Error('persona line not found once in the shipped prompt')
  return s.replace(OLD_END, NEW_END)
}
const generated = () => (rd(candsFile, []) as any[]).filter((p) => existsSync(join(OUT, `${p.id}__SKILL.txt`)))

if (cmd === 'gen') {
  mkdirSync(join(OUT, 'drafts'), { recursive: true })
  const todo = (rd(candsFile) as any[]).filter((p) => hand[p.id] === 'ok' && !existsSync(join(OUT, `${p.id}__SKILL.txt`)))
  await pooled(todo, 5, async (p) => {
    const kinds = drawTypes(p.id)
    const drafts = await Promise.all(kinds.map((t) => claude('sonnet', draftPrompt(p, t), 'SKILL')))
    const pick = await claude('haiku', replyPick('en', p, drafts, block), 'SKILL-pick')
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    wr(join(OUT, 'drafts', `${p.id}.json`), { kinds, drafts, pick: k })
    writeFileSync(join(OUT, `${p.id}__SKILL.txt`), drafts[k]!)
  })
  console.log(`gen: ${todo.length} jobs, ${generated().length} written, cost so far $${totalCost().toFixed(2)}`)
}

// ---- judging: ../../reddit-comments/judge.ts word for word, two replies
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const t = await claude(judge, prompt(p, ord), `judge-${judge}`)
        writeFileSync(join(rawDir, `${p.id}${attempt ? `.retry${attempt}` : ''}.txt`), t)
        const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        wr(join(dir, `${p.id}.json`), { id: p.id, sub: p.sub, order: ord, human, rank })
        return
      } catch {}
    }
    console.log(`failed ${p.id}`)
  })
  console.log(`${judge}: judged ${todo.length}, cost so far $${totalCost().toFixed(2)}`)
}

const sc = (id: string, j: string) => rd(join(D, 'judged', j, `${id}.json`))
const diff = (id: string) => { const v = ['opus', 'sonnet'].map((j) => sc(id, j)).filter(Boolean); return v.length ? v.reduce((a, r) => a + r.human.SKILL - r.human.HUMAN, 0) / v.length : -100 }
const review: Record<string, string> = rd(join(DATA, 'review.json'), {}) // id -> "keep" or the reason it was dropped

if (cmd === 'show') {
  const ps = generated().sort((a, b) => diff(b.id) - diff(a.id))
  for (const p of ps) {
    const o = sc(p.id, 'opus'), s = sc(p.id, 'sonnet')
    const d = JSON.parse(readFileSync(join(OUT, 'drafts', `${p.id}.json`), 'utf8'))
    console.log(`\n=== ${p.id} d=${diff(p.id).toFixed(0)} opus ai ${o?.human.SKILL} / real ${o?.human.HUMAN}, sonnet ai ${s?.human.SKILL} / real ${s?.human.HUMAN} [${d.kinds[d.pick]}] ${review[p.id] ?? ''}\nT: ${p.title}\nB: ${String(p.body).slice(0, Number(arg ?? 400))}\n-- AI: ${reply(p, 'SKILL')}\n-- REAL(${p.human.score}): ${p.human.body}`)
  }
}

if (cmd === 'write') {
  const ps = generated()
  const kept = ps.filter((p) => review[p.id] === 'keep')
  wr(join(DATA, 'posts.json'), kept.map(({ id, sub, title, body, comments, created, human }: any) => ({ id, sub, title, body, comments, created, human })))
  const walk = (rd(walkFile) as any).walk as any[]
  const url = (id: string) => `https://www.reddit.com/r/${SUB}/comments/${id}/`
  const set = (w: any) => w.status !== 'candidate' ? w.status : hand[w.id] !== 'ok' ? 'dropped by hand before generation' : review[w.id] === 'keep' ? 'quiz' : review[w.id] ? 'generated, dropped in review' : 'generated, not reviewed'
  wr(join(D, 'ids.json'), walk.map((w) => ({ set: set(w), id: w.id, community: `r/${SUB}`, url: url(w.id) })))
  const n: Record<string, number> = {}
  for (const w of walk) n[set(w)] = (n[set(w)] ?? 0) + 1
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const avg = (p: any, arm: string) => mean(['opus', 'sonnet'].map((j) => sc(p.id, j).human[arm]))
  console.log(`walked ${walk.length}: ${JSON.stringify(n)}`)
  console.log(`kept ${kept.length}: AI side ${mean(kept.map((p) => avg(p, 'SKILL'))).toFixed(1)}, real side ${mean(kept.map((p) => avg(p, 'HUMAN'))).toFixed(1)} (mean of Opus and Sonnet); opus ai/real ${mean(kept.map((p) => sc(p.id, 'opus').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'opus').human.HUMAN)).toFixed(1)}, sonnet ${mean(kept.map((p) => sc(p.id, 'sonnet').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'sonnet').human.HUMAN)).toFixed(1)}`)
  console.log(`all generated ${ps.length}: AI side ${mean(ps.map((p) => avg(p, 'SKILL'))).toFixed(1)}, real side ${mean(ps.map((p) => avg(p, 'HUMAN'))).toFixed(1)}; cost $${totalCost().toFixed(2)}`)
}
