// Extra Spanish quiz pairs (2026-11-28). Not a benchmark round: threads are picked for the public quiz, whose players are
// anyone, so only everyday, general-audience subreddits (no developer, programming or crypto ones).
// Subreddits (rules read 2026-11-28, about/rules.json): preguntaleareddit, mexico, argentina, uruguay, PERU, colombia.
// Left out because their rules ban AI-generated content: chile ("Prohibido contenido ... generado por IA"), spain
// ("No Spam o contenido generado por Inteligencia Artificial"), AskArgentina ("NO está permitido: Contenido generado por
// IA"), askspain (its profile). Posts from 2026-08-01 to 2026-11-26 (UTC), leaving out the Spanish test's 28 test threads
// and 50 sample threads (../ids.json) and the sample threads picked here for the new subreddits.
// Eligibility as ../PROTOCOL.md and ../collect.ts: a question post (collect.ts QUESTION, word for word), body not
// [removed]/[deleted], not NSFW, 10+ comments, Spanish (../lib.ts), not political, and a top-level human comment of
// 5+ points and 20+ characters (the highest-scored one is the real side; if it is not Spanish the thread is skipped).
// Added for the quiz, as ../../japanese-comments/quiz-extra/extra.ts: link and image posts (not a text post, removed by
// the mods, or a body with an image or only a link) and threads whose real top comment is only a link or has an image are
// left out. Political check: the tool's GUARD with Haiku and the same prompt with Sonnet; either one flags it, it is out.
// Then a hand read of every candidate (hand.json; a word list does the plain cases first, see auto()).
// Sample pools: preguntaleareddit and mexico use the Spanish test's labelled pools as they are. For the four new ones,
// ../collect.ts's pool rule: the 10 busiest threads of the subreddit posted 2026-10-01 to 11-26 (any title, 10+ comments,
// Spanish, not political, not a test thread), their top-level comments as the tool reads them (2+ points, not the poster,
// not AutoModerator, not [deleted]/removed), Spanish only, by score, the first 160, labelled by Sonnet with the tool's
// LABEL prompt in batches of 40 (../es.ts classify). Those threads are never candidates.
// The AI side is ../es.ts SKILL (the shipped reply path: labelled pool, type rates, examples, seeded type draw, three
// Sonnet drafts, Haiku pick) with one change, the candidate persona line: ", and you often skip the final period."
// becomes ". Punctuate and break lines the way the real comments below do." The change is made in a patched copy of
// lib/prompts.mjs in the working folder (prompts-candidate.mjs); skills/community-humanizer/lib/prompts.mjs is not touched.
// Judging: ../../reddit-comments/judge.ts prompt word for word, the AI reply and the real top comment only, labelled A/B
// in a seeded order per judge (opus, sonnet); raw answers kept.
//   bun extra.ts collect               Arctic Shift listings of the window, one request at a time (cached per subreddit),
//                                      then the full records of the threads that could be eligible (text post or not, removed)
//   bun extra.ts pool                  sample pools for the four new subreddits, labelled
//   bun extra.ts warm <sub> <n>        political check of a subreddit's <n> busiest eligible threads (guard cache only)
//   bun extra.ts filter <n>            walk eligible threads round-robin (SUBS order), each subreddit by comment count;
//                                      stop after <n> candidates; writes walk.json, cands.json
//   bun extra.ts screen [from]         word-list drops into hand.json, then print the rest for the hand read
//   bun extra.ts gen [n]               SKILL replies for candidates not dropped in hand.json (the first n, read so far)
//   bun extra.ts judge <opus|sonnet>   judged/<judge>/<id>.json, raw answers in judged-raw/<judge>/
//   bun extra.ts show [n]              pairs with scores, hardest first, for the native-reader review
//   bun extra.ts write                 posts.json (kept pairs, from review.json) in WORK, ids.json (links only) here
//   bun extra.ts scrub                 remove usernames from the cached listings (trees keep only an is-the-poster flag)
// WORK (outside git, default ~/.trina/know-raw/spanish-quiz-extra) holds every real text, hand.json and review.json.
// Run (2026-11-28, the quick version the owner asked for): collect stopped early, so the r/colombia listing reaches back
// only to 2026-09-28; the walk covered preguntaleareddit, mexico, argentina and colombia (pools built for the last two),
// stopped at 100 candidates; 52 generated after the hand read, 20 kept after the native read (review.json).
// Following the owner's short-pairs bar, the walk counts a real top comment over 400 characters as out.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD, LABEL } from '../../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../../skills/community-humanizer/lib/claude.mjs'
import { defaults } from '../../../skills/community-humanizer/lib/profile.mjs'

process.env.WORK ??= join(homedir(), '.trina/know-raw/spanish-quiz-extra')
const WORK = process.env.WORK
mkdirSync(join(WORK, 'tree'), { recursive: true })
const { claude, pooled, arctic, spanishPost, spanishComment } = await import('../lib.ts')
const D = import.meta.dir, ES = join(D, '..')
const OLDWORK = join(homedir(), '.trina/know-raw/spanish-voice-test')
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
writeFileSync(PATCHED, `// Patched copy of skills/community-humanizer/lib/prompts.mjs, written by benchmark/spanish-comments/quiz-extra/extra.ts:\n// personaEn ends "No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do."\n${shipped.replace(OLD_END, NEW_END)}`)
const { types, replyPrompt, replyPick } = await import(PATCHED)

const LISTED = ['preguntaleareddit', 'mexico', 'argentina', 'uruguay', 'PERU', 'colombia'] // listings collected
// the quick version (2026-11-28, the owner wants it live): walk four of them, two with the Spanish test's pools and two
// new ones, in this round-robin order; uruguay and PERU are listed but not walked, the colombia listing is left partial
const SUBS = ['preguntaleareddit', 'mexico', 'argentina', 'colombia']
const OLDPOOL = new Set(['preguntaleareddit', 'mexico']) // labelled pools of the Spanish test
const t = (s: string) => Math.floor(Date.parse(s) / 1000)
const FROM = t('2026-08-01T00:00:00Z'), POOL_FROM = t('2026-10-01T00:00:00Z'), UNTIL = t('2026-11-27T00:00:00Z')
// the Spanish test's threads (28 test, 50 sample): never used here
const USED = new Set((rd(join(ES, 'ids.json')) as any[]).map((x) => x.id))

// ---- listings: slim fields, then the full record of each thread that could be eligible
const listFile = (sub: string) => join(WORK, `listing-${sub}.json`)
const FIELDS = 'id,title,selftext,num_comments,score,author,created_utc,subreddit,over_18,url'
const QUESTION = new RegExp('[?¿]|^\\s*(?:c[oó]mo|qu[eé]|cu[aá]l(?:es)?|cu[aá]nt[oa]s?|cu[aá]ndo|d[oó]nde|por ?qu[eé]|qui[eé]n(?:es)?|alguien|alg[uú]n[oa]?s?|hay|es|son|vale la pena|mejor(?:es)?|busco|necesito|recomiendan|recomendaci[oó]n(?:es)?|recomienden|consejos?|ayuda|deber[ií]a|conviene|se puede|puedo|opiniones?|duda)(?![\\p{L}])', 'iu')
const removed = (s: string) => /^\[(removed|deleted)\]/.test(s.trim())
const text = (p: any) => `${p.title}\n\n${p.selftext ?? ''}`
const byBusy = (a: any, b: any) => b.num_comments - a.num_comments || a.created_utc - b.created_utc
const maybe = (p: any) => p.num_comments >= 10 && QUESTION.test(p.title) && !removed(String(p.selftext ?? '')) && !p.over_18 && spanishPost(text(p))
const busy = (p: any) => p.num_comments >= 10 && p.created_utc >= POOL_FROM && !removed(String(p.selftext ?? '')) && spanishPost(text(p))
if (cmd === 'collect') {
  for (const sub of LISTED) {
    const st = rd(listFile(sub), { done: false, full: false, posts: [] })
    if (!st.done) {
      let before = st.posts.length ? Math.min(...st.posts.map((p: any) => p.created_utc)) : UNTIL
      for (;;) {
        const r = await arctic(`/posts/search?subreddit=${sub}&after=${FROM}&before=${before}&limit=100&sort=desc&fields=${FIELDS}`)
        if (!r.length) break
        st.posts.push(...r)
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
    if (!st.full) {
      const need = st.posts.filter((p: any) => (maybe(p) || busy(p)) && p.is_self == null)
      for (let i = 0; i < need.length; i += 100) {
        const r = await arctic(`/posts/ids?ids=${need.slice(i, i + 100).map((p: any) => p.id).join(',')}`)
        const by = new Map(r.map((x: any) => [x.id, x]))
        for (const p of need.slice(i, i + 100)) { const x: any = by.get(p.id); if (x) Object.assign(p, { is_self: x.is_self, post_hint: x.post_hint ?? null, removed_by_category: x.removed_by_category ?? null, num_comments: x.num_comments ?? p.num_comments }) }
        wr(listFile(sub), st)
        console.log(`${sub}: full records ${Math.min(i + 100, need.length)}/${need.length}`)
      }
      st.full = true
      wr(listFile(sub), st)
    }
  }
}
const listed = (sub: string) => (rd(listFile(sub), { posts: [] }).posts as any[]).filter((p) => p.created_utc >= FROM && p.created_utc < UNTIL)

// ---- political check: the tool's GUARD to Haiku and to Sonnet; the tool's rule: anything but a clear no is political
const guardFile = join(WORK, 'guard.json')
const guard: Record<string, { haiku?: string; sonnet?: string }> = rd(guardFile, {})
const flagged = (a?: string) => a != null && !/^\s*no\b/i.test(a)
async function check(p: any) {
  const g = (guard[p.id] ??= {}), q = GUARD(p.title, String(p.selftext ?? '').slice(0, 1500))
  await Promise.all((['haiku', 'sonnet'] as const).filter((m) => g[m] == null).map(async (m) => { g[m] = await claude(m, q, `guard-${m}`); wr(guardFile, guard) }))
}
const political = (p: any) => flagged(guard[p.id]?.haiku) || flagged(guard[p.id]?.sonnet)

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

// ---- sample pools for the new subreddits (../collect.ts pool rule, ../es.ts classify)
const poolFile = join(WORK, 'pool-threads.json')
const poolThreads: Record<string, string[]> = rd(poolFile, {})
const POOLED = new Set(Object.values(poolThreads).flat())
const labelledFile = (sub: string) => (OLDPOOL.has(sub) ? join(OLDWORK, `labelled-${sub}.json`) : join(WORK, `labelled-${sub.toLowerCase()}.json`))
if (cmd === 'pool') {
  for (const sub of SUBS.filter((s) => !OLDPOOL.has(s))) {
    if (existsSync(labelledFile(sub))) { console.log(`${sub}: labelled pool exists`); continue }
    const others = listed(sub).filter((p) => !USED.has(p.id) && busy(p)).sort(byBusy)
    await pooled(others.slice(0, 24), 8, check) // the busiest 24 checked at once; the first 10 not political are taken
    const threads = others.slice(0, 24).filter((p) => guard[p.id]?.haiku != null && guard[p.id]?.sonnet != null && !political(p)).slice(0, 10)
    poolThreads[sub] = threads.map((p) => p.id)
    wr(poolFile, poolThreads)
    const comments: any[] = []
    for (const th of threads) for (const c of await tree(th)) {
      if (!c.body || removed(c.body) || c.op || c.bot || c.deleted || c.score < 2 || !spanishComment(c.body)) continue
      comments.push({ thread: th.id, score: c.score, body: c.body })
    }
    comments.sort((a, b) => b.score - a.score)
    const top = comments.slice(0, 160)
    await Promise.all([0, 40, 80, 120].filter((i) => i < top.length).map(async (i) => {
      const batch = top.slice(i, i + 40)
      try {
        const res = await claude('sonnet', `${LABEL}\n\n${batch.map((c, n) => `[${n + 1}] ${c.body.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`, 'label')
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        batch.forEach((c, n) => { c.type = j[String(n + 1)] })
      } catch {}
    }))
    const out = top.filter((c) => c.type)
    wr(labelledFile(sub), out)
    const count: Record<string, number> = {}
    for (const c of out) count[c.type] = (count[c.type] ?? 0) + 1
    console.log(`${sub}: ${threads.length} pool threads (${threads.map((x) => x.num_comments).join(',')} comments), ${comments.length} usable comments, labelled ${out.length}/${top.length}: ${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${Math.round((100 * n) / out.length)}%`).join(', ')}`)
  }
}

// ---- eligibility
const IMG = /preview\.redd\.it|i\.redd\.it|v\.redd\.it|imgur\.com|giphy\.com|!\[[^\]]*\]\(|\.(png|jpe?g|gif|webp|mp4)\b/i
const bare = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim()
function eligible(sub: string) {
  const all = listed(sub)
  const q = all.filter((p) => p.num_comments >= 10 && QUESTION.test(p.title) && !removed(String(p.selftext ?? '')) && !p.over_18)
  const es = q.filter((p) => spanishPost(text(p)))
  const el = es.filter((p) => !USED.has(p.id) && !POOLED.has(p.id)).sort(byBusy)
  return { all: all.length, question: q.length, notEs: q.length - es.length, used: es.length - el.length, el }
}
// link and image posts: not a text post, removed by the mods, a body with an image, or a body that is only a link
const linkPost = (p: any) => (p.is_self === false ? 'link or image post' : p.removed_by_category ? 'removed post' : IMG.test(String(p.selftext)) ? 'image in the post' : String(p.selftext).trim() && !bare(String(p.selftext)) ? 'link-only post' : null)
// bun extra.ts warm <sub> <n>: the political check of a subreddit's <n> busiest eligible threads ahead of the walk
// (fills the guard cache only, while other listings are still being collected; the walk itself is unchanged)
if (cmd === 'warm') {
  const el = eligible(arg!).el.filter((p) => !linkPost(p)).slice(0, Number(process.argv[4] ?? 100))
  await pooled(el, 8, check)
  console.log(`${arg}: ${el.length} checked, ${el.filter(political).length} political`)
}
const human = (cs: any[]) => cs.filter((c) => c.body && !removed(c.body) && !c.op && !c.bot && !c.deleted && c.body.length >= 20 && c.score >= 5).sort((a, b) => b.score - a.score)[0]

// word lists (used before the walk's guard and comment fetch on title and body, and again in the hand read)
const ES_POL = /nazi|fascis|comunis|\bvox\b|psoe|\bpp\b|sánchez|ayuso|amlo|morena|sheinbaum|milei|kirchner|peronis|elecci|gobierno|polític/i
const SENS = /\bsexo\b|sexual|\bcoger\b|cogerse|follar|porno|\bputa|prostitu|nalgas|\bculo\b|\bpene\b|vagina|virgen|masturb|condón|orgasmo|religi|\bdios\b|iglesia|católic|cristian|evangél|biblia|\bateo|droga|marihuana|\bweed\b|cocaína|\bperico\b|alcohólic|suicid|matarme|autolesi|depresi|ansiedad|psiquiatr|psicólog|terapia|medicament|pastilla|médico|doctor|enfermedad|cáncer|embaraz|aborto|abogad|demanda|denuncia|\bley\b|ilegal|policía|narco|cártel|asesin|violaci|abuso|menor de edad|\b1[0-7] años|secundaria|\bprepa\b|colegio|liceo|negro[s]?\b|indio[s]?\b|gay|maric|trans\b|lesbian|judío|musulm|venezolan|haitian|boliviano|veneco|chino[s]? |gringo/i
const cut = (s: string) => (s.length > 600 ? s.slice(0, 600) : s)
const pre = (p: any) => { const t = [p.title, cut(String(p.selftext ?? ''))].join(' '); if (ES_POL.test(t)) return 'word list on title or body (build-items ES_POL)'; const m = t.match(SENS); return m ? `word list on title or body (${m[0].trim()})` : null }

const walkFile = join(WORK, 'walk.json'), candsFile = join(WORK, 'cands.json')
if (cmd === 'filter') {
  const want = Number(arg ?? 150)
  const queues = Object.fromEntries(SUBS.map((s) => [s, eligible(s).el]))
  for (const s of SUBS) { const e = eligible(s); console.log(`${s}: ${e.all} posts in the window, ${e.question} question threads with 10+ comments (not NSFW, not removed), ${e.notEs} not Spanish, ${e.used} used by the Spanish test or as samples, ${e.el.length} eligible`) }
  const order: any[] = []
  for (let i = 0; SUBS.some((s) => queues[s]![i]); i++) for (const s of SUBS) if (queues[s]![i]) order.push(queues[s]![i])
  const walk: any[] = [], cands: any[] = []
  // the political check runs ahead of the walk (AHEAD threads, 4 at a time) while comments are fetched one by one
  const inflight = new Map<string, Promise<void>>()
  const checkOnce = (p: any) => { if (!inflight.has(p.id)) inflight.set(p.id, check(p).catch(() => {})); return inflight.get(p.id)! }
  void pooled(order.filter((p) => !linkPost(p) && !pre(p)).slice(0, Number(process.env.AHEAD ?? 360)), 4, checkOnce)
  for (let i = 0; i < order.length && cands.length < want; i += 16) {
    const chunk = order.slice(i, i + 16)
    for (const p of chunk) {
      if (cands.length >= want) break
      const w = (status: string) => walk.push({ id: p.id, sub: p.subreddit, comments: p.num_comments, status })
      const lp = linkPost(p) ?? pre(p)
      if (lp) { w(lp); continue }
      await checkOnce(p)
      const g = guard[p.id] ?? {}, h = flagged(g.haiku), s = flagged(g.sonnet)
      if (g.haiku == null || g.sonnet == null) { w('political check did not answer'); continue }
      if (h || s) { w(`political (${h && s ? 'Haiku and Sonnet' : h ? 'Haiku only' : 'Sonnet only'})`); continue }
      const c = human(await tree(p))
      if (!c) { w('no top-level human comment with 5+ points'); continue }
      if (!spanishComment(c.body)) { w('top comment not Spanish'); continue }
      if (IMG.test(c.body) || !bare(c.body)) { w('top comment only a link or has an image'); continue }
      if (c.body.length > 400) { w('top comment over 400 characters (short-pairs bar)'); continue }
      if (/https?:\/\//.test(c.body)) { w('link in the top comment'); continue }
      w('candidate')
      cands.push({ id: p.id, sub: p.subreddit, key: String(p.subreddit).toLowerCase(), title: p.title, body: String(p.selftext ?? '').slice(0, 1500), comments: p.num_comments, created: p.created_utc, human: { score: c.score, body: c.body } })
    }
    wr(walkFile, { window: '2026-08-01..2026-11-26', walk }); wr(candsFile, cands)
    console.log(`walked ${walk.length}, candidates ${cands.length}`)
  }
  const n: Record<string, number> = {}
  for (const x of walk) n[x.status] = (n[x.status] ?? 0) + 1
  console.log(`walked ${walk.length} of ${order.length}: ${JSON.stringify(n)}`)
  process.exit(0) // the political check running ahead is not needed any more
}

// ---- hand read. Drops that need no reading: what quiz/scripts/build-items.ts would drop anyway (its Spanish word list),
// a real comment over 400 characters (the owner's bar, 2026-11-28: hard but short pairs so a round goes fast, both
// replies ideally under about 250 characters, none over about 400; it also covers build-items' 600-character fairness
// rule), a link in the real comment, and a word list for the topics the quiz leaves out (sex, religion, drugs,
// self-harm, minors, health and law, slurs)
const hand: Record<string, string> = rd(join(WORK, 'hand.json'), {}) // id -> why it was dropped by hand before generation
function auto(p: any): string | null {
  if ([p.title, cut(p.body), p.human.body].some((s) => ES_POL.test(s))) return 'build-items word list (ES_POL)'
  if (p.human.body.length > 400) return 'real comment over 400 characters (short-pairs bar)'
  if (/https?:\/\/|preview\.redd\.it|!\[/.test(p.human.body)) return 'link or image in the real comment'
  const m = [p.title, cut(p.body), p.human.body].join(' ').match(SENS)
  if (m) return `sensitive word list (${m[0].trim()})`
  return null
}
if (cmd === 'screen') {
  // a candidate walked while a guard call failed (the first filter run let those through): ask again, then decide
  const miss = (rd(candsFile) as any[]).filter((p) => !hand[p.id] && (guard[p.id]?.haiku == null || guard[p.id]?.sonnet == null))
  await pooled(miss.map((p) => ({ ...p, selftext: p.body })), 4, check)
  for (const p of miss) if (guard[p.id]?.haiku == null || guard[p.id]?.sonnet == null) hand[p.id] = 'political check did not answer'; else if (political(p)) hand[p.id] = 'political (asked again after a failed guard call)'
  if (miss.length) { wr(join(WORK, 'hand.json'), hand); console.log(`guard asked again for ${miss.length}: ${miss.filter((p) => hand[p.id]).length} dropped`) }
  let changed = 0
  for (const p of rd(candsFile) as any[]) { const a = !hand[p.id] && auto(p); if (a) { hand[p.id] = `auto: ${a}`; changed++ } }
  if (changed) wr(join(WORK, 'hand.json'), hand)
  const left = (rd(candsFile) as any[]).filter((p) => !hand[p.id])
  console.log(`word list dropped ${changed} more; ${left.length} left to read`)
  for (const p of left.slice(Number(arg ?? 0))) console.log(`\n=== ${p.id} r/${p.sub} (${p.comments} comments)\nT: ${p.title}\nB: ${String(p.body).replace(/\s+/g, ' ').slice(0, 400)}\nH(${p.human.score}): ${String(p.human.body).replace(/\s+/g, ' ').slice(0, 400)}`)
}

// ---- generation: ../es.ts skill(), word for word, with the patched persona line
const OUT = join(D, 'outputs')
const defs = types('en', undefined)
const fallback = defaults('en')
function skillSetup(p: any) {
  const pool = (rd(labelledFile(p.key)) as any[]).filter((c) => c.thread !== p.id)
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
  const todo = (rd(candsFile) as any[]).slice(0, Number(arg ?? 1e9)).filter((p) => !hand[p.id] && !existsSync(join(OUT, `${p.id}__SKILL.txt`)))
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
    console.log(`\n=== ${p.id} r/${p.sub} d=${diff(p.id).toFixed(0)} | opus ai ${o?.human.SKILL} real ${o?.human.HUMAN} | sonnet ai ${s?.human.SKILL} real ${s?.human.HUMAN} | ${d.kinds[d.pick]} of ${d.kinds.join(',')} | chars ai ${reply(p, 'SKILL').length} real ${p.human.body.length} ${review[p.id] ? '| ' + review[p.id] : ''}\nT: ${p.title}\nB: ${String(p.body).slice(0, 600)}\n-- AI: ${reply(p, 'SKILL')}\n-- REAL(${p.human.score}): ${p.human.body}`)
  }
}

const scrubText = (s: string) => s.replace(/\bu\/[A-Za-z0-9_-]+/g, 'u/…')
if (cmd === 'write') {
  const ps = generated()
  const kept = ps.filter((p) => review[p.id] === 'keep').sort((a, b) => diff(b.id) - diff(a.id))
  wr(join(WORK, 'posts.json'), kept.map(({ id, sub, key, title, body, comments, created, human }: any) => ({ id, sub, key, title: scrubText(title), body: scrubText(body), comments, created, human: { score: human.score, body: scrubText(human.body) } })))
  const walk = (rd(walkFile) as any).walk as any[]
  const set = (w: any) => w.status !== 'candidate' ? w.status : hand[w.id] ? 'dropped by hand before generation' : review[w.id] === 'keep' ? 'quiz' : review[w.id] ? 'generated, dropped in review' : 'generated, not reviewed'
  const samples = Object.entries(poolThreads).flatMap(([sub, ids]) => ids.map((id) => ({ set: 'samples', id, community: `r/${sub}`, url: `https://www.reddit.com/r/${sub}/comments/${id}/` })))
  wr(join(D, 'ids.json'), [...walk.map((w) => ({ set: set(w), id: w.id, community: `r/${w.sub}`, url: `https://www.reddit.com/r/${w.sub}/comments/${w.id}/` })), ...samples])
  const n: Record<string, number> = {}
  for (const w of walk) n[set(w)] = (n[set(w)] ?? 0) + 1
  const sub = (xs: any[]) => { const c: Record<string, number> = {}; for (const p of xs) c[p.sub] = (c[p.sub] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`walked ${walk.length}: ${JSON.stringify(n)}`)
  console.log(`kept ${kept.length} ${sub(kept)}: AI side ${mean(kept.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(kept.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)} (mean of Opus and Sonnet); opus ai/real ${mean(kept.map((p) => sc(p.id, 'opus').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'opus').human.HUMAN)).toFixed(1)}, sonnet ${mean(kept.map((p) => sc(p.id, 'sonnet').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'sonnet').human.HUMAN)).toFixed(1)}; AI judged more human than the real one in ${kept.filter((p) => diff(p.id) > 0).length}`)
  console.log(`reply lengths, AI/real characters: ${kept.map((p) => `${p.id} ${reply(p, 'SKILL').trim().length}/${p.human.body.trim().length}`).join(', ')}`)
  console.log(`all generated ${ps.length} ${sub(ps)}: AI side ${mean(ps.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(ps.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)}`)
  const c = cost()
  console.log(`cost (total_cost_usd): ${Object.entries(c).map(([k, v]) => `${k} $${v.toFixed(2)}`).join(', ')}; total $${Object.values(c).reduce((a, b) => a + b, 0).toFixed(2)}`)
}

if (cmd === 'scrub') {
  for (const sub of LISTED) {
    const st = rd(listFile(sub))
    if (!st) continue
    for (const p of st.posts) delete p.author
    wr(listFile(sub), st)
  }
  const left = readdirSync(join(WORK, 'tree')).filter((f) => Object.keys(rd(join(WORK, 'tree', f))[0] ?? {}).includes('author'))
  console.log(`listings scrubbed; trees with usernames: ${left.length}`)
}
