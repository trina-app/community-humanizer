// Extra English quiz pairs (2026-11-28). Not a benchmark round: threads are picked for the public quiz, whose players are
// anyone, so the threads come from everyday, general-audience subreddits instead of the test's developer and startup ones.
// Subreddits: AskAnAmerican, BuyItForLife, AskEurope, HomeImprovement, AskOldPeople. Their rules (rules.json, the sidebar
// and the rules wiki, read 2026-11-28) say nothing against AI-written content. Left out because their rules ban it:
// NoStupidQuestions, CasualConversation, AskUK, Cooking, personalfinance, movies, books (wiki rule 3.7), travel,
// LifeProTips, AskReddit, Frugal, AskCulinary (sidebar), gardening. AskOldPeople ends up with no threads: Arctic Shift
// lists all 172 of its window posts with 10+ comments (and all 61 busy July posts, so it has no sample pool either) as removed
// (automod_filtered or reddit at archive time), and the removed-post rule is kept as it is.
// Threads: posts from 2026-08-01 to 2026-11-26 (UTC), walked round-robin in the order above. The first 80 were walked by
// comment count, as in the other runs; their pairs were almost all easy (1 of 32 judged within 15 points of the real
// side: the busiest threads' top comments are punchy high-score lines), so the rest are walked in a seeded shuffle of
// each subreddit's eligible threads (rng("english-quiz-extra:<sub>")), which reaches ordinary threads. The run was stopped
// early (2026-11-28, the quiz was going live): 140 threads walked, 83 candidates, all read (63 ok), 43 generated and
// judged; the 20 ok shuffled-order candidates read last were not generated. Eligibility as ../collect.ts and ../build-fresh-as.ts: a question post (../collect.ts's rule word for word, plus
// BuyItForLife's "[Request]" tag), body not [removed]/[deleted], not NSFW, 10+ comments, and a top-level human comment of
// 5+ points and 20+ characters (the highest-scored one is the real side). As in the Japanese extra run: link and image
// posts (not a text post, removed by the mods, a body with an image or only a link) and threads whose real top comment is
// only a link or has an image are left out. Political check: the tool's GUARD with Haiku and the same prompt with Sonnet;
// either one flags it, it is out. Then a word list and a hand read of every candidate (hand.json).
// Sample pools (the tool's labelled pool per subreddit): the 10 busiest non-political text threads with 10+ comments of
// 2026-07-01 to 07-31 (before the thread window, so no pool thread is ever a quiz thread), top-level human comments of 2+
// points sorted by score, the first 160, labelled with the tool's LABEL prompt (Sonnet, 40 per call), as ../../japanese-
// comments/ja.ts classify.
// The AI side is the shipped reply path as in ../../japanese-comments/quiz-extra/extra.ts (labelled pool, type rates,
// six examples per type, seeded type draw, three Sonnet drafts, Haiku pick) with the candidate persona line:
// ", and you often skip the final period." becomes ". Punctuate and break lines the way the real comments below do."
// The change is made in a patched copy of lib/prompts.mjs in WORK (prompts-candidate.mjs); skills/community-humanizer/
// lib/prompts.mjs is not touched.
// Judging: ../judge.ts prompt word for word, the AI reply and the real top comment only, labelled A/B in a seeded order
// per judge (opus, sonnet); raw answers kept. Model calls and the Arctic Shift client: ../../japanese-comments/lib.ts.
//   bun extra.ts collect               Arctic Shift listings of 2026-07-01..11-26, one request at a time (cached per sub)
//   bun extra.ts pool                  the sample pools: guard, trees, labelled-<sub>.json
//   [ORDER=busy|random] bun extra.ts filter <n>   continue the round-robin walk until <n> candidates; walk.json, cands.json
//   bun extra.ts screen [from]         word list (auto drops into hand.json), then print the rest for the hand read
//   bun extra.ts gen                   SKILL replies for candidates marked "ok" in hand.json
//   bun extra.ts judge <opus|sonnet>   judged/<judge>/<id>.json, raw answers in judged-raw/<judge>/
//   bun extra.ts show [n] [min d]      pairs with scores, hardest first, for the native-reader review
//   bun extra.ts write                 posts.json (kept pairs, from review.json) in WORK, ids.json (links only) here
//   bun extra.ts scrub                 remove usernames from the cached listings (trees keep only an is-the-poster flag)
// WORK (outside git, default ~/.trina/know-raw/english-quiz-extra) holds every real text, hand.json and review.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD, LABEL } from '../../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../../skills/community-humanizer/lib/claude.mjs'
import { defaults } from '../../../skills/community-humanizer/lib/profile.mjs'

process.env.WORK ??= join(homedir(), '.trina/know-raw/english-quiz-extra')
const WORK = process.env.WORK
mkdirSync(join(WORK, 'tree'), { recursive: true })
const { claude, pooled, arctic, chars } = await import('../../japanese-comments/lib.ts')
const D = import.meta.dir, EN = join(D, '..')
const [cmd, arg, arg2] = process.argv.slice(2)
const rd = (f: string, d: any = null) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)
const wr = (f: string, x: any) => writeFileSync(f, JSON.stringify(x, null, 1))

// ---- the candidate persona line, in a patched copy of the shipped prompts
const SHIPPED = join(D, '../../../skills/community-humanizer/lib/prompts.mjs')
const OLD_END = ', and you often skip the final period.'
const NEW_END = '. Punctuate and break lines the way the real comments below do.'
const shipped = readFileSync(SHIPPED, 'utf8')
if (shipped.split(OLD_END).length !== 2) throw new Error('persona line not found once in the shipped prompts.mjs')
const PATCHED = join(WORK, 'prompts-candidate.mjs')
writeFileSync(PATCHED, `// Patched copy of skills/community-humanizer/lib/prompts.mjs, written by benchmark/reddit-comments/quiz-extra/extra.ts:\n// personaEn ends "No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do."\n${shipped.replace(OLD_END, NEW_END)}`)
const { types, replyPrompt, replyPick } = await import(PATCHED)

const SUBS = ['AskAnAmerican', 'BuyItForLife', 'AskEurope', 'HomeImprovement', 'AskOldPeople'] // round-robin order
const t = (s: string) => Math.floor(Date.parse(s) / 1000)
const POOL_FROM = t('2026-07-01T00:00:00Z'), FROM = t('2026-08-01T00:00:00Z'), UNTIL = t('2026-11-27T00:00:00Z')
// the English test's threads (dev and fresh): never used here (other subreddits, so this is only a guard)
const USED = new Set((rd(join(EN, 'ids.json'), []) as any[]).map((x) => x.id))

// ---- listings
const listFile = (sub: string) => join(WORK, `listing-${sub}.json`)
const slim = (p: any) => ({ id: p.id, subreddit: p.subreddit, title: p.title, selftext: p.selftext ?? '', num_comments: p.num_comments, score: p.score, author: p.author, created_utc: p.created_utc, over_18: p.over_18, is_self: p.is_self, url: p.url, post_hint: p.post_hint ?? null, removed_by_category: p.removed_by_category ?? null, link_flair_text: p.link_flair_text ?? null })
if (cmd === 'collect') {
  for (const sub of SUBS) {
    const st = rd(listFile(sub), { done: false, posts: [] })
    if (st.done) { console.log(`${sub}: ${st.posts.length} posts (cached)`); continue }
    let before = st.posts.length ? Math.min(...st.posts.map((p: any) => p.created_utc)) : UNTIL
    for (;;) {
      const r = await arctic(`/posts/search?subreddit=${sub}&after=${POOL_FROM}&before=${before}&limit=100&sort=desc`)
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

// ---- eligibility (../collect.ts's question rule word for word, plus BuyItForLife's request tag)
const QUESTION = /\?|^(how|what|which|any|is|are|should|does|do|can|best|looking for|need)\b/i
const REQUEST = /^\s*[\[(]\s*request\s*[\])]/i
const removed = (s: string) => /^\[(removed|deleted)\]/.test(s.trim())
const text = (p: any) => `${p.title}\n\n${p.selftext ?? ''}`
const byBusy = (a: any, b: any) => b.num_comments - a.num_comments || a.created_utc - b.created_utc
const IMG = /preview\.redd\.it|i\.redd\.it|v\.redd\.it|imgur\.com|giphy\.com|!\[[^\]]*\]\(|\.(png|jpe?g|gif|webp|mp4)\b/i
const bare = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim()
const listed = (sub: string, from = FROM, until = UNTIL) => (rd(listFile(sub), { posts: [] }).posts as any[]).filter((p) => p.created_utc >= from && p.created_utc < until)
const isQuestion = (p: any) => QUESTION.test(p.title) || REQUEST.test(p.title)
function eligible(sub: string) {
  const all = listed(sub)
  const q = all.filter((p) => p.num_comments >= 10 && isQuestion(p) && !removed(String(p.selftext ?? '')) && !p.over_18)
  const el = q.filter((p) => !USED.has(p.id)).sort(byBusy)
  return { all: all.length, busy: all.filter((p) => p.num_comments >= 10).length, question: q.length, used: q.length - el.length, el }
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
const usable = (c: any) => c.body && !removed(c.body) && !c.op && !c.bot && !c.deleted
const human = (cs: any[]) => cs.filter((c) => usable(c) && c.body.length >= 20 && c.score >= 5).sort((a, b) => b.score - a.score)[0]

// ---- sample pools (July, before the thread window)
const key = (sub: string) => String(sub).toLowerCase()
const labelledFile = (sub: string) => join(WORK, `labelled-${key(sub)}.json`)
const poolFile = join(WORK, 'pools.json')
if (cmd === 'pool') {
  const pools: Record<string, string[]> = rd(poolFile, {})
  for (const sub of SUBS) {
    if (existsSync(labelledFile(sub))) { console.log(`${sub}: labelled pool cached`); continue }
    if (!rd(listFile(sub))?.done) { console.log(`${sub}: not listed yet (run collect)`); continue }
    const others = listed(sub, POOL_FROM, FROM).filter((p) => p.num_comments >= 10 && !p.over_18 && p.is_self && !p.removed_by_category && !removed(String(p.selftext ?? ''))).sort(byBusy)
    const threads: any[] = []
    for (let i = 0; i < others.length && threads.length < 10; i += 8) {
      const chunk = others.slice(i, i + 8)
      await pooled(chunk, 8, check)
      for (const p of chunk) if (threads.length < 10 && !flagged(guard[p.id]?.haiku) && !flagged(guard[p.id]?.sonnet) && guard[p.id]?.haiku != null && guard[p.id]?.sonnet != null) threads.push(p)
    }
    const comments: any[] = []
    for (const th of threads) for (const c of await tree(th)) if (usable(c) && c.score >= 2 && chars(c.body) >= 2) comments.push({ thread: th.id, score: c.score, body: c.body })
    comments.sort((a, b) => b.score - a.score)
    const top = comments.slice(0, 160)
    for (let i = 0; i < top.length; i += 40) {
      const batch = top.slice(i, i + 40)
      try {
        const res = await claude('sonnet', `${LABEL}\n\n${batch.map((c, n) => `[${n + 1}] ${c.body.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`, 'label')
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        batch.forEach((c, n) => { c.type = j[String(n + 1)] })
      } catch {}
    }
    const out = top.filter((c) => c.type)
    wr(labelledFile(sub), out)
    pools[sub] = threads.map((x) => x.id); wr(poolFile, pools)
    const count: Record<string, number> = {}
    for (const c of out) count[c.type] = (count[c.type] ?? 0) + 1
    console.log(`${sub}: ${threads.length} pool threads (${threads.map((x) => x.num_comments).join(',')} comments), ${comments.length} usable comments, labelled ${out.length}/${top.length}: ${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${Math.round((100 * n) / out.length)}%`).join(', ')}`)
  }
}

const walkFile = join(WORK, 'walk.json'), candsFile = join(WORK, 'cands.json')
if (cmd === 'filter') {
  const want = Number(arg ?? 150)
  // a rerun continues the walk; ORDER=busy walks by comment count, ORDER=random (the default) in a seeded shuffle
  const ORDER = process.env.ORDER ?? 'random'
  const walk: any[] = (rd(walkFile, { walk: [] }).walk as any[]).map((w) => ({ order: 'busy', ...w })), cands: any[] = rd(candsFile, [])
  const seen = new Set(walk.map((w) => w.id))
  const shuffle = (xs: any[], seed: string) => { const r = rng(seed), a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  const queues = Object.fromEntries(SUBS.map((s) => { const el = eligible(s).el.filter((p) => !seen.has(p.id)); return [s, ORDER === 'busy' ? el : shuffle(el, `english-quiz-extra:${s}`)] }))
  for (const s of SUBS) { const e = eligible(s); console.log(`${s}: ${e.all} posts in the window, ${e.busy} with 10+ comments, ${e.question} question threads with 10+ comments (not NSFW, not removed), ${e.used} used by the English test, ${e.el.length} eligible`) }
  const order: any[] = []
  for (let i = 0; SUBS.some((s) => queues[s]![i]); i++) for (const s of SUBS) if (queues[s]![i]) order.push(queues[s]![i])
  console.log(`continuing after ${walk.length} walked and ${cands.length} candidates, order ${ORDER}`)
  for (let i = 0; i < order.length && cands.length < want; i += 20) {
    const chunk = order.slice(i, i + 20)
    await pooled(chunk.filter((p) => !linkPost(p)), 10, check)
    for (const p of chunk) {
      if (cands.length >= want) break
      const w = (status: string) => walk.push({ id: p.id, sub: p.subreddit, comments: p.num_comments, order: ORDER, status })
      const lp = linkPost(p)
      if (lp) { w(lp); continue }
      const g = guard[p.id] ?? {}
      if (g.haiku == null || g.sonnet == null) { w('political check failed (left out)'); continue }
      const h = flagged(g.haiku), s = flagged(g.sonnet)
      if (h || s) { w(`political (${h && s ? 'Haiku and Sonnet' : h ? 'Haiku only' : 'Sonnet only'})`); continue }
      const c = human(await tree(p))
      if (!c) { w('no top-level human comment with 5+ points'); continue }
      if (IMG.test(c.body) || !bare(c.body)) { w('top comment only a link or has an image'); continue }
      w('candidate')
      cands.push({ id: p.id, sub: p.subreddit, title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, created: p.created_utc, human: { score: c.score, body: c.body } })
    }
    wr(walkFile, { window: '2026-08-01..2026-11-26', walk }); wr(candsFile, cands)
    console.log(`walked ${walk.length}, candidates ${cands.length}`)
  }
  const n: Record<string, number> = {}
  for (const x of walk) n[x.status] = (n[x.status] ?? 0) + 1
  console.log(`walked ${walk.length} (this run had ${order.length} unwalked eligible threads): ${JSON.stringify(n)}`)
}

const handFile = join(WORK, 'hand.json')
const hand: Record<string, string> = rd(handFile, {}) // id -> "ok", or why it was dropped before generation
// drops that need no reading: what quiz/scripts/build-items.ts would drop anyway (a character from another script, only one
// side over 600 characters: the real one here, as replies are short), a link in the real comment, and a word list for
// the topics the quiz leaves out (politics, religion, sex, drugs, self-harm, medical and legal matters, guns, crime, war).
// The quiz also wants short rounds (2026-11-28): real comments over 400 characters are left out before generation, and
// the review prefers pairs with both replies under about 250.
const cut = (s: string) => (s.length > 600 ? s.slice(0, 600) : s)
const SENS = /\b(trump|biden|harris|obama|vance|maga|democrats?|republicans?|liberals?|conservatives?|left-wing|right-wing|election|vot(e|es|ed|ing)|congress|senat(e|or)|politic\w*|government|immigra\w*|refugees?|israel\w*|palestin\w*|gaza|ukrain\w*|russia\w*|putin|nato|war|wars|nazis?|fascis\w*|communis\w*|racis\w*|religio\w*|church\w*|christian\w*|catholic\w*|muslims?|islam\w*|jews?|jewish|bible|atheis\w*|sex|sexual\w*|porn\w*|nsfw|nude|rape|abortion|gay|lesbian|lgbt\w*|trans|transgender|suicid\w*|self-harm|depress\w*|weed|marijuana|cannabis|cocaine|heroin|meth|drugs?|alcoholi\w*|guns?|firearms?|shooting|murder\w*|kill(ed|ing)?|police|cops?|lawyers?|lawsuit|sue|illegal|doctors?|medication|diagnos\w*|cancer|pregnan\w*|abuse\w*|slurs?|n-word)\b/i
function auto(p: any): string | null {
  if (/[぀-ヿ一-鿿가-힣]/.test(p.human.body)) return 'another script in the real comment (build-items)'
  if (p.human.body.length > 600) return 'real comment over 600 characters (build-items fairness rule)'
  if (p.human.body.length > 400) return 'real comment over 400 characters (the quiz wants short replies)'
  if (/https?:\/\/|www\.|preview\.redd\.it|!\[/.test(p.human.body)) return 'link or image in the real comment'
  const m = [p.title, cut(p.body), p.human.body].join(' ').match(SENS)
  if (m) return `sensitive word list (${m[0]})`
  return null
}
const MINOR = /\b(1[0-7]|[1-9])\s?(yo|y\/o|year[- ]olds?|years? old)\b|\b(teen\w*|high school\w*|middle school\w*|my (son|daughter|kids?|child|children))\b/i
if (cmd === 'screen') {
  let changed = 0
  for (const p of rd(candsFile) as any[]) { const a = !hand[p.id] && auto(p); if (a) { hand[p.id] = `auto: ${a}`; changed++ } }
  if (changed) wr(handFile, hand)
  const n = Number(arg2 ?? 400)
  for (const p of (rd(candsFile) as any[]).slice(Number(arg ?? 0))) {
    if (hand[p.id]) continue
    const flags = [MINOR.test(text(p) + ' ' + p.human.body) ? 'MINOR?' : ''].filter(Boolean).join(' ')
    console.log(`\n=== ${p.id} r/${p.sub} ${flags}\nT: ${p.title}\nB: ${String(p.body).replace(/\s+/g, ' ').slice(0, n)}\nH(${p.human.score}): ${String(p.human.body).replace(/\s+/g, ' ').slice(0, n)}`)
  }
  const v = Object.values(hand), c: Record<string, number> = {}
  for (const x of v) { const k = x === 'ok' ? 'ok' : x.startsWith('auto:') ? x.replace(/ \(.*$/, '') : 'dropped by hand'; c[k] = (c[k] ?? 0) + 1 }
  console.log(`\nhand.json: ${JSON.stringify(c)}; unread ${(rd(candsFile) as any[]).filter((p) => !hand[p.id]).length}`)
}

// ---- generation: ../../japanese-comments/quiz-extra/extra.ts skillSetup(), word for word, with the patched persona line
const OUT = join(D, 'outputs')
const defs = types('en', undefined)
const fallback = defaults('en')
function skillSetup(p: any) {
  const pool = (rd(labelledFile(p.sub)) as any[]).filter((c) => c.thread !== p.id)
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
  const todo = (rd(candsFile) as any[]).filter((p) => hand[p.id] === 'ok' && !existsSync(join(OUT, `${p.id}__SKILL.txt`)))
  await pooled(todo, 6, async (p) => {
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

// ---- judging: ../judge.ts prompt and order() word for word, two replies
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
  await pooled(todo, 6, async (p) => {
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
  const min = arg2 == null ? -1e9 : Number(arg2)
  const ps = generated().filter((p) => diff(p.id) >= min).sort((a, b) => diff(b.id) - diff(a.id))
  for (const p of ps.slice(0, Number(arg ?? 1e9))) {
    const o = sc(p.id, 'opus'), s = sc(p.id, 'sonnet'), d = rd(join(OUT, 'drafts', `${p.id}.json`))
    console.log(`\n=== ${p.id} r/${p.sub} d=${diff(p.id).toFixed(0)} | opus ai ${o?.human.SKILL} real ${o?.human.HUMAN} | sonnet ai ${s?.human.SKILL} real ${s?.human.HUMAN} | ${d.kinds[d.pick]} of ${d.kinds.join(',')} | chars ai ${chars(reply(p, 'SKILL'))} real ${chars(p.human.body)} ${review[p.id] ? '| ' + review[p.id] : ''}\nT: ${p.title}\nB: ${String(p.body).slice(0, 600)}\n-- AI: ${reply(p, 'SKILL')}\n-- REAL(${p.human.score}): ${p.human.body}`)
  }
}

const scrubText = (s: string) => s.replace(/\bu\/[A-Za-z0-9_-]+/g, 'u/…')
if (cmd === 'write') {
  const ps = generated()
  const kept = ps.filter((p) => review[p.id] === 'keep').sort((a, b) => diff(b.id) - diff(a.id))
  wr(join(WORK, 'posts.json'), kept.map(({ id, sub, title, body, comments, created, human }: any) => ({ id, sub, title: scrubText(title), body: scrubText(body), comments, created, human: { score: human.score, body: scrubText(human.body) } })))
  const walk = (rd(walkFile) as any).walk as any[]
  const gen = new Set(ps.map((p) => p.id))
  const set = (w: any) => w.status !== 'candidate' ? w.status : !hand[w.id] ? 'not read (stopped early)' : hand[w.id] !== 'ok' ? 'dropped before generation' : !gen.has(w.id) ? 'not generated (stopped early)' : review[w.id] === 'keep' ? 'quiz' : review[w.id] ? 'generated, dropped in review' : 'generated, not reviewed'
  const pools: Record<string, string[]> = rd(poolFile, {})
  wr(join(D, 'ids.json'), [...walk.map((w) => ({ set: set(w), id: w.id, community: `r/${w.sub}`, url: `https://www.reddit.com/r/${w.sub}/comments/${w.id}/` })),
    ...Object.entries(pools).flatMap(([sub, ids]) => ids.map((id) => ({ set: 'samples', id, community: `r/${sub}`, url: `https://www.reddit.com/r/${sub}/comments/${id}/` })))])
  const n: Record<string, number> = {}
  for (const w of walk) n[set(w)] = (n[set(w)] ?? 0) + 1
  const sub = (xs: any[]) => { const c: Record<string, number> = {}; for (const p of xs) c[p.sub] = (c[p.sub] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`walked ${walk.length}: ${JSON.stringify(n)}`)
  const hv = Object.entries(hand).filter(([id]) => (rd(candsFile) as any[]).some((p) => p.id === id)), hc: Record<string, number> = {}
  for (const [, x] of hv) { const k = x === 'ok' ? 'ok' : x.startsWith('auto:') ? x.replace(/ \(.*$/, '') : 'dropped by hand'; hc[k] = (hc[k] ?? 0) + 1 }
  console.log(`before generation: ${JSON.stringify(hc)}`)
  console.log(`kept ${kept.length} ${sub(kept)}: AI side ${mean(kept.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(kept.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)} (mean of Opus and Sonnet); opus ai/real ${mean(kept.map((p) => sc(p.id, 'opus').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'opus').human.HUMAN)).toFixed(1)}, sonnet ${mean(kept.map((p) => sc(p.id, 'sonnet').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'sonnet').human.HUMAN)).toFixed(1)}; AI minus real >= -15 in ${kept.filter((p) => diff(p.id) >= -15).length}, AI judged more human than the real one in ${kept.filter((p) => diff(p.id) > 0).length}`)
  for (const p of kept) console.log(`  ${p.id} r/${p.sub} d=${diff(p.id).toFixed(0)} ai ${avg(p.id, 'SKILL').toFixed(0)} real ${avg(p.id, 'HUMAN').toFixed(0)} | chars ai ${chars(reply(p, 'SKILL'))} real ${chars(p.human.body)}`)
  const len = (xs: any[]) => { const a = xs.map((p) => chars(reply(p, 'SKILL'))), h = xs.map((p) => chars(p.human.body)); return `AI median ${[...a].sort((x, y) => x - y)[a.length >> 1]} chars, real median ${[...h].sort((x, y) => x - y)[h.length >> 1]}; both under 250 in ${xs.filter((p) => chars(reply(p, 'SKILL')) < 250 && chars(p.human.body) < 250).length}, either over 400 in ${xs.filter((p) => chars(reply(p, 'SKILL')) > 400 || chars(p.human.body) > 400).length}` }
  if (kept.length) console.log(`kept lengths: ${len(kept)}`)
  console.log(`all generated ${ps.length} ${sub(ps)}: AI side ${mean(ps.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(ps.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)}; AI minus real >= -15 in ${ps.filter((p) => diff(p.id) >= -15).length}`)
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
