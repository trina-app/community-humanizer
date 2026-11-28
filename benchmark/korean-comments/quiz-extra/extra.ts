// Extra Korean quiz pairs (2026-11-28). Not a benchmark round: threads are picked for the public quiz.
// Clien 모두의공원 (park) and 아무거나질문 (kin), posts from 2026-09-27 to 2026-11-26 (KST, as the list pages show it),
// leaving out every thread the Korean tests used: the 28 test threads and the sample threads (raw/ of the Korean test's
// working folder) and the Clien posts of the post test's held-out set. Public pages only, one request at a time, 2.6 s
// apart, longer waits after an error; usernames are never kept (only a flag for the poster's own comments).
// Eligibility as ../PROTOCOL.md and ../collect.ts: a question title (collect.ts QUESTION), 15+ comments on park and 6+ on
// kin, and a top-level comment by someone other than the poster with the most 공감 (2+ on park, 1+ on kin). Added for the
// quiz: posts with an image or video, and threads whose top comment is only a link or has an image, are left out. Political
// check: quiz/scripts/build-items.ts's Korean word list on the title, the body and the top comment, then the tool's GUARD
// with Haiku and the same prompt with Sonnet; either one flags it, it is out. Then a word list for other sensitive topics
// and a hand read of every candidate (hand.json).
// The AI side is the Korean SKILL arm of ../ko.ts as ../punct.ts runs it (the shipped prompts from prompts.mjs, the same
// labelled pool, type rates, typed examples and seeded type draw, three Sonnet drafts, Haiku picks) with one change, the
// candidate persona line: "마침표는 자주 안 찍어." becomes "문장부호와 줄바꿈은 아래 실제 댓글들이 하는 대로 해." The change
// is made in a patched copy of lib/prompts.mjs in the working folder; skills/community-humanizer/lib/prompts.mjs is not touched.
// Judging: ../ko.ts's judge prompt word for word (the Korean version of ../../reddit-comments/judge.ts's prompt, which the
// Korean test used), the AI reply and the real top comment only, labelled A/B in a seeded order per judge (opus, sonnet).
//   bun extra.ts list                  list pages of both boards back to the window's start (cached per page)
//   bun extra.ts filter <n>            walk eligible threads round-robin (park, kin), each board by comment count; stop after
//                                      <n> candidates; writes walk.json and cands.json
//   bun extra.ts screen                print candidates for the hand read (sets the word-list drops in hand.json)
//   bun extra.ts gen                   SKILL replies for candidates marked "ok" in hand.json
//   bun extra.ts judge <opus|sonnet>   judged/<judge>/<id>.json, raw answers in judged-raw/<judge>/
//   bun extra.ts show [n]              pairs with scores, hardest first, for the native-reader review
//   bun extra.ts write                 posts.json (kept pairs, from review.json) in WORK, ids.json (links only) here
// WORK (outside git, default ~/.trina/know-raw/korean-quiz-extra) holds every real text, hand.json and review.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { GUARD } from '../../../skills/community-humanizer/lib/prompts.mjs'
import { block } from '../../../skills/community-humanizer/lib/claude.mjs'

process.env.WORK ??= join(homedir(), '.trina/know-raw/korean-quiz-extra')
const WORK = process.env.WORK
for (const d of ['raw', 'list', 'empty']) mkdirSync(join(WORK, d), { recursive: true })
const D = import.meta.dir
const OLDWORK = join(homedir(), '.trina/know-raw/korean-voice-test')
const [cmd, arg] = process.argv.slice(2)
const rd = (f: string, d: any = null) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d)
const wr = (f: string, x: any) => writeFileSync(f, JSON.stringify(x, null, 1))

// ---- the candidate persona line, in a patched copy of the shipped prompts
const SHIPPED = join(D, '../../../skills/community-humanizer/lib/prompts.mjs')
const OLD_END = '마침표는 자주 안 찍어.'
const NEW_END = '문장부호와 줄바꿈은 아래 실제 댓글들이 하는 대로 해.'
const shipped = readFileSync(SHIPPED, 'utf8')
if (shipped.split(OLD_END).length !== 2) throw new Error('persona line not found once in the shipped prompts.mjs')
const PATCHED = join(WORK, 'prompts-candidate.mjs')
writeFileSync(PATCHED, `// Patched copy of skills/community-humanizer/lib/prompts.mjs, written by benchmark/korean-comments/quiz-extra/extra.ts:\n// personaKo ends "인사, 마무리 정리, 팁 목록은 쓰지 마. ${NEW_END}"\n${shipped.replace(OLD_END, NEW_END)}`)
const { replyPrompt, replyPick, types } = await import(PATCHED)

// ---- isolated model calls (the flags of skills/community-humanizer/lib/claude.mjs), the cost of every call logged
async function claude(model: string, text: string, stage: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text()
    await r.exited
    clearTimeout(timer)
    try {
      const j = JSON.parse(o)
      appendFileSync(join(WORK, 'costs.jsonl'), JSON.stringify({ stage, model, cost: j.total_cost_usd ?? null, models: Object.keys(j.modelUsage ?? {}), stop: j.stop_reason ?? null, ok: !j.is_error && !!j.result }) + '\n')
      if (!j.is_error && j.result) return String(j.result).trim()
    } catch {}
  }
  throw new Error(`claude ${model} failed (${stage})`)
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}

// ---- Clien: one request at a time, at least 2.6 s apart, longer waits after an error
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
let last = 0
async function html(url: string): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const wait = last + 2600 - Date.now()
    if (wait > 0) await Bun.sleep(wait)
    last = Date.now()
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) })
      if (r.ok) return await r.text()
      if (r.status === 404 || r.status === 410) return null
      console.log(`HTTP ${r.status} on ${url}, backing off`)
    } catch (e) { console.log(`request failed (${String(e).slice(0, 60)}), backing off`) }
    await Bun.sleep(10_000 * (i + 1))
    last = Date.now()
  }
  throw new Error(`Clien did not answer: ${url}`)
}
// the tool's own reader (lib/clien.mjs parsePost), plus image flags; no usernames
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const text = (h: string) => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
const MEDIA = /<img|<video|<iframe|<embed/gi
function parseThread(h: string) {
  const title = decode(h.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? '').replace(/\s*:\s*클리앙\s*$/, '')
  const s = h.indexOf('class="post_article"'), e = h.indexOf('class="post_writer"', s)
  const art = s > 0 ? h.slice(h.indexOf('>', s) + 1, e > s ? h.lastIndexOf('<', e) : s + 20000) : ''
  const op = h.match(/articleSingo\('([^']+)'\)/)?.[1] ?? ''
  const rows = [...h.matchAll(/<div class="(comment_row[^"]*)" data-role="comment-row" data-author-id="([^"]*)" data-comment-sn="(\d+)"/g)]
  const comments = rows.map((m, i) => {
    const chunk = h.slice(m.index!, rows[i + 1]?.index ?? h.length)
    const likes = Number(chunk.match(new RegExp(`setLikeCount_${m[3]}"[^>]*>(\\d+)<`))?.[1] ?? 0)
    const view = chunk.match(/<div class="comment_view"([\s\S]*?)<input type="hidden" value="([^"]*)"/)
    return { likes, reply: /\bre\b/.test(m[1]!), op: m[2] === op, media: view ? (view[1]!.match(MEDIA) ?? []).length : 0, body: view ? decode(view[2]!).trim() : '' }
  }).filter((c) => c.body)
  return { title, body: text(art).slice(0, 1500), media: (art.match(MEDIA) ?? []).length, comments }
}

// ---- list pages
const BOARDS = [
  { board: 'park', name: '모두의공원', minComments: 15, minLikes: 2 },
  { board: 'kin', name: '아무거나질문', minComments: 6, minLikes: 1 },
]
const FROM = '2026-09-27', UNTIL = '2026-11-27' // Clien timestamps (KST): 2026-09-27 00:00 to 2026-11-26 23:59
const listFile = (b: string) => join(WORK, 'list', `${b}.json`)
if (cmd === 'list') {
  for (const B of BOARDS) {
    const st = rd(listFile(B.board), { done: false, pages: {} as Record<string, any[]> })
    for (let po = Object.keys(st.pages).length; !st.done; po++) {
      const h = await html(`https://www.clien.net/service/board/${B.board}?&od=T31&po=${po}`)
      const items = (h ?? '').split('class="list_item').slice(1).filter((b) => b.startsWith(' symph_row')).map((b) => ({
        id: b.match(new RegExp(`/service/board/${B.board}/(\\d+)`))?.[1],
        title: decode(b.match(/data-role="list-title-text"[^>]*title="([^"]*)"/)?.[1] ?? ''),
        n: Number(b.match(/data-comment-count=(\d+)/)?.[1] ?? 0),
        ts: b.match(/class="timestamp">([^<]+)</)?.[1] ?? '',
      })).filter((x) => x.id && x.ts)
      st.pages[po] = items
      if (!items.length || items.every((x) => x.ts < FROM)) st.done = true
      wr(listFile(B.board), st)
      if (po % 20 === 0 || st.done) console.log(`${B.board} page ${po}: ${items.at(-1)?.ts ?? 'empty'}`)
    }
  }
}

// ---- eligibility
const QUESTION = /\?|나요|까요|는지|어떻게|어떤|추천|궁금/ // ../collect.ts
// quiz/scripts/build-items.ts's Korean list (a superset of ../collect.ts's)
const POL = /국힘|민주당|이재명|잼통|쨈통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민|특검|대법|판사|김민석|투표|기소|장관|의원/
// every thread the Korean tests used: test threads, sample threads, the post test's Clien posts
const USED = new Set<string>([
  ...(rd(join(D, '../ids.json')) as any[]).map((x) => x.id),
  ...(rd(join(OLDWORK, 'posts.json')) as any[]).map((x) => x.id),
  ...readdirSync(join(OLDWORK, 'raw')).map((f) => f.replace('.json', '').split('-')[1]!),
  ...((rd(join(homedir(), '.trina/know-raw/post-voice-test/holdout/posts.json'), []) as any[]).filter((x) => x.lang === 'ko').map((x) => x.id)),
])
function eligible(B: (typeof BOARDS)[number]) {
  const st = rd(listFile(B.board), { pages: {} })
  const all = [...new Map((Object.values(st.pages) as any[][]).flat().filter((x) => x.ts >= FROM && x.ts < UNTIL).map((x) => [x.id, x])).values()]
  const q = all.filter((x) => QUESTION.test(x.title) && x.n >= B.minComments)
  const used = q.filter((x) => USED.has(x.id))
  const pol = q.filter((x) => !USED.has(x.id) && POL.test(x.title))
  const el = q.filter((x) => !USED.has(x.id) && !POL.test(x.title)).sort((a, b) => b.n - a.n || (a.id < b.id ? -1 : 1))
  return { all: all.length, question: q.length, used: used.length, pol: pol.length, el }
}
const bare = (s: string) => s.replace(/https?:\/\/\S+/g, '').trim()
const top = (p: any, B: (typeof BOARDS)[number]) => (p.comments as any[]).filter((c) => !c.reply && !c.op && c.body.length >= 2 && c.likes >= B.minLikes).sort((a, b) => b.likes - a.likes)[0]

// political check: the tool's GUARD to Haiku and to Sonnet; the tool's rule: anything but a clear no is political
const guardFile = join(WORK, 'guard.json')
const guard: Record<string, { haiku?: string; sonnet?: string }> = rd(guardFile, {})
const flagged = (a?: string) => a != null && !/^\s*no\b/i.test(a)
async function check(id: string, title: string, body: string) {
  const g = (guard[id] ??= {}), q = GUARD(title, body.slice(0, 1500))
  await Promise.all((['haiku', 'sonnet'] as const).filter((m) => g[m] == null).map(async (m) => { try { g[m] = await claude(m, q, `guard-${m}`) } catch {} wr(guardFile, guard) }))
}

const walkFile = join(WORK, 'walk.json'), candsFile = join(WORK, 'cands.json')
if (cmd === 'filter') {
  const want = Number(arg ?? 200)
  const E = Object.fromEntries(BOARDS.map((B) => [B.board, eligible(B)]))
  for (const B of BOARDS) { const e = E[B.board]!; console.log(`${B.board}: ${e.all} posts in the window, ${e.question} question posts with ${B.minComments}+ comments, ${e.used} used by the Korean tests, ${e.pol} political by title (word list), ${e.el.length} eligible`) }
  const order: any[] = []
  for (let i = 0; BOARDS.some((B) => E[B.board]!.el[i]); i++) for (const B of BOARDS) if (E[B.board]!.el[i]) order.push({ ...E[B.board]!.el[i], B })
  const walk: any[] = [], cands: any[] = []
  // fetch a chunk, then judge its politics while the next chunk is fetched
  const fetchChunk = async (chunk: any[]) => {
    const out: any[] = []
    for (const x of chunk) {
      const f = join(WORK, 'raw', `${x.B.board}-${x.id}.json`)
      let p = rd(f)
      if (!p) { const h = await html(`https://www.clien.net/service/board/${x.B.board}/${x.id}`); p = h ? parseThread(h) : { title: '', body: '', media: 0, comments: [] }; wr(f, p) }
      const c = top(p, x.B)
      const status = !p.title ? 'deleted or unreadable'
        : p.media ? 'image or video in the post'
        : POL.test(p.body) ? 'political (word list, body)'
        : !c ? `no top-level comment with ${x.B.minLikes}+ 공감`
        : c.media || !bare(c.body) ? 'top comment only a link or has an image'
        : POL.test(c.body) ? 'political (word list, top comment)'
        : null
      out.push({ x, p, c, status })
    }
    return out
  }
  const guardChunk = (rows: any[]) => pooled(rows.filter((r) => !r.status), 6, (r) => check(r.x.id, r.p.title, r.p.body))
  const N = 20
  let next = fetchChunk(order.slice(0, N))
  for (let i = 0; i < order.length && cands.length < want; i += N) {
    const rows = await next
    const g = guardChunk(rows)
    next = fetchChunk(order.slice(i + N, i + 2 * N))
    await g
    await guardChunk(rows.filter((r) => !r.status && (guard[r.x.id]?.haiku == null || guard[r.x.id]?.sonnet == null))) // a failed call, once more
    for (const r of rows) {
      if (cands.length >= want) break
      const w = (status: string) => walk.push({ id: r.x.id, board: r.x.B.board, comments: r.x.n, status })
      if (r.status) { w(r.status); continue }
      const gg = guard[r.x.id] ?? {}
      if (gg.haiku == null || gg.sonnet == null) { w('political check failed (left out)'); continue }
      const h = flagged(gg.haiku), s = flagged(gg.sonnet)
      if (h || s) { w(`political (${h && s ? 'Haiku and Sonnet' : h ? 'Haiku only' : 'Sonnet only'})`); continue }
      w('candidate')
      cands.push({ id: r.x.id, board: r.x.B.board, boardName: r.x.B.name, title: r.p.title || r.x.title, body: r.p.body, comments: r.p.comments.length, listed: r.x.n, created: r.x.ts.slice(0, 10), human: { likes: r.c.likes, body: r.c.body } })
    }
    wr(walkFile, { window: `${FROM}..2026-11-26`, walk }); wr(candsFile, cands)
    console.log(`walked ${walk.length}, candidates ${cands.length}`)
  }
  await next
  const n: Record<string, number> = {}
  for (const x of walk) n[x.status] = (n[x.status] ?? 0) + 1
  console.log(`walked ${walk.length} of ${order.length}: ${JSON.stringify(n)}`)
}

// ---- hand read before generation
const hand: Record<string, string> = rd(join(WORK, 'hand.json'), {}) // id -> "ok", or why it was dropped before generation
// drops that need no reading: what build-items.ts would drop anyway (a stray hanja or kana, only one side over 600
// characters: the real one here, as replies are short), and words for the sensitive topics the quiz leaves out
// (religion, sex, gender and regional fights, self-harm, drugs, minors at school, ethnic labels), and long real comments
const SENS = /종교|교회|기독교|개신교|천주교|성당|불교|스님|목사|신천지|이슬람|무슬림|섹스|성관계|야동|자위|성욕|19금|콘돔|업소|유흥|성매매|페미|한남|김치녀|메갈|여혐|남혐|자살|자해|극단적|우울증|마약|대마|필로폰|중학생|고등학생|초등학생|초딩|중딩|고딩|미성년|학폭|전라도|경상도|홍어|과메기|조선족|짱깨|흑인|동성애|트랜스젠더|성소수자/
function auto(p: any): string | null {
  if (/[一-鿿぀-ヿ]/.test(p.human.body)) return 'hanja or kana in the real comment (build-items)'
  if (p.human.body.length > 600) return 'real comment over 600 characters (build-items fairness rule)'
  // the quiz wants short rounds (2026-11-28): both replies ideally under about 100 characters, none over about 150
  if (p.human.body.length > 150) return 'real comment over 150 characters (short-pairs rule)'
  const m = [p.title, p.body.slice(0, 600), p.human.body].join(' ').match(SENS)
  if (m) return `sensitive word list (${m[0]})`
  return null
}
if (cmd === 'screen') {
  let changed = 0
  for (const p of rd(candsFile) as any[]) { const a = !hand[p.id] && auto(p); if (a) { hand[p.id] = `auto: ${a}`; changed++ } }
  if (changed) wr(join(WORK, 'hand.json'), hand)
  const n = Number(arg ?? 300)
  for (const p of rd(candsFile) as any[]) {
    if (hand[p.id]) continue
    console.log(`\n=== ${p.id} ${p.board} ${p.created} (${p.comments})\nT: ${p.title}\nB: ${String(p.body).replace(/\s+/g, ' ').slice(0, n)}\nH(${p.human.likes}): ${String(p.human.body).replace(/\s+/g, ' ').slice(0, n)}`)
  }
}

// ---- generation: ../ko.ts SKILL as ../punct.ts runs it, with the patched persona line
const OUT = join(D, 'outputs')
const BOARD: Record<string, string> = { park: '모두의공원', kin: '아무거나질문' }
type C = { board: string; thread: string; likes: number; body: string; type?: string }
const oldPosts = rd(join(OLDWORK, 'posts.json')) as any[], oldCands = rd(join(OLDWORK, 'cands.json')) as any[]
const OLD_POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/ // ../ko.ts
const testIds = new Set(oldPosts.map((p) => p.id))
const pool: C[] = []
for (const f of readdirSync(join(OLDWORK, 'raw'))) {
  const [board, id] = f.replace('.json', '').split('-') as [string, string]
  const title = oldCands.find((c) => c.board === board && c.id === id)?.title ?? ''
  if (testIds.has(id) || OLD_POL.test(title)) continue
  const p = rd(join(OLDWORK, 'raw', f))
  for (const c of p.comments) if (!c.reply && !c.op && c.body.length >= 2 && c.likes >= 1 && !OLD_POL.test(c.body)) pool.push({ board, thread: id, likes: c.likes, body: c.body })
}
const labels: Record<string, string> = rd(join(OLDWORK, 'types.json'))
for (const c of pool) c.type = labels[`${c.thread}:${c.body.slice(0, 40)}`]
const DEF: Record<string, string> = types('ko', undefined) // the eight types of ../ko.ts DEF, same keys
const typed = (b: string, t: string) => pool.filter((c) => c.board === b && c.type === t).sort((x, y) => y.likes - x.likes).slice(0, 6).map((c) => c.body.slice(0, 400))
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32) }
function drawTypes(p: any, k: number) {
  const rate = new Map<string, number>()
  for (const c of pool) if (c.board === p.board && c.type && DEF[c.type] && typed(p.board, c.type).length >= 2) rate.set(c.type, (rate.get(c.type) ?? 0) + 1)
  const r = rng(p.id), out: string[] = []
  while (out.length < k && rate.size) { let x = r() * [...rate.values()].reduce((a, b) => a + b, 0); for (const [t, n] of rate) { x -= n; if (x <= 0) { out.push(t); rate.delete(t); break } } }
  return out
}
const generated = () => (rd(candsFile, []) as any[]).filter((p) => existsSync(join(OUT, `${p.id}__SKILL.txt`)))

// on the Korean test's 28 threads: the type draw must equal Round P's (drafts-p/<id>.json), and the prompts must be the
// shipped ones with only the persona sentence changed
if (cmd === 'check') {
  const S = await import(SHIPPED)
  let bad = 0
  for (const p of oldPosts) {
    const kinds = drawTypes(p, 3), d = rd(join(OLDWORK, 'drafts-p', `${p.id}.json`))
    if (JSON.stringify(kinds) !== JSON.stringify(d.kinds)) { bad++; console.log(`type draw differs ${p.id}`) }
    for (const t of kinds) if ((replyPrompt('ko', p, t, typed(p.board, t), undefined, block, undefined) as string).replace(NEW_END, OLD_END) !== S.replyPrompt('ko', p, t, typed(p.board, t), undefined, block, undefined)) { bad++; console.log(`prompt differs beyond the persona line ${p.id} ${t}`) }
    if (replyPick('ko', p, d.drafts, block) !== S.replyPick('ko', p, d.drafts, block)) { bad++; console.log(`pick prompt differs ${p.id}`) }
  }
  console.log(`check: ${oldPosts.length} threads, ${pool.length} pool comments, ${bad} problems`)
}

if (cmd === 'gen') {
  mkdirSync(join(OUT, 'drafts'), { recursive: true })
  const todo = (rd(candsFile) as any[]).filter((p) => hand[p.id] === 'ok' && !existsSync(join(OUT, `${p.id}__SKILL.txt`)))
  await pooled(todo, Number(process.env.JOBS ?? 5), async (p) => {
    if (p.boardName !== BOARD[p.board]) throw new Error(`board name ${p.id}`)
    const kinds = drawTypes(p, 3)
    const prompts = kinds.map((t) => replyPrompt('ko', p, t, typed(p.board, t), undefined, block, undefined) as string)
    if (prompts.some((s) => !s.includes(`팁 목록은 쓰지 마. ${NEW_END}`))) throw new Error('patched persona line missing')
    const drafts = await Promise.all(prompts.map((s) => claude('sonnet', s, 'gen-draft')))
    const pick = await claude('haiku', replyPick('ko', p, drafts, block) as string, 'gen-pick')
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    wr(join(OUT, 'drafts', `${p.id}.json`), { kinds, drafts, pick: k, haiku: pick })
    writeFileSync(join(OUT, `${p.id}__SKILL.txt`), drafts[k]!)
  })
  console.log(`gen: ${todo.length} jobs, ${generated().length} written`)
}

// ---- judging: ../ko.ts judge prompt, order() and parsing word for word, two replies
const ARMS = ['SKILL', 'HUMAN']
const L = 'ABCD'
const post = (p: any) => `클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}`.trim()
const reply = (p: any, arm: string) => (arm === 'HUMAN' ? String(p.human.body) : readFileSync(join(OUT, `${p.id}__${arm}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }

if (cmd === 'judge') {
  const judge = arg!
  if (judge !== 'opus' && judge !== 'sonnet') throw new Error('judge: opus or sonnet')
  const dir = join(D, 'judged', judge), rawDir = join(D, 'judged-raw', judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  const todo = generated().filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, 5, async (p) => {
    const ord = order(`${p.id}:${judge}`)
    const text = `아래는 클리앙 ${p.boardName} 게시판 글과 댓글 ${ord.length}개(${L.slice(0, ord.length).split('').join(', ')})야. 어떤 댓글은 이 글에 실제로 사람들이 단 것이고, 어떤 건 AI가 쓴 거야.\n\n댓글마다 사람이 썼을 확률(0~100)을 매겨. 그다음 이 게시판의 평범한 사용자로서 공감을 누를 순서대로 전부 순위를 매겨(가장 먼저 누를 것부터).\n\nJSON만 답해: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\n${post(p)}\n\n${ord.map((arm, i) => `--- 댓글 ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
    for (let a = 0; a < 2; a++) {
      let res = ''
      try {
        res = await claude(judge, text, `judge-${judge}`)
        writeFileSync(join(rawDir, a ? `${p.id}.try2.txt` : `${p.id}.txt`), res)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        wr(join(dir, `${p.id}.json`), { id: p.id, board: p.board, order: ord, human, rank })
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
// ../punct.ts measures, for the review: no sentence punctuation at all, sentences run together with only a space
const anyPunct = (t: string) => /[.?!…。？！](?=\s|$|["'”’)\]])/.test(t.trim())
const RUN = /([가-힣]+)(요|죠|니다|[습합됩입십]니까|[는았었였했겠있없같된한간온산본준난든됐봤왔갔났줬냈렸켰졌웠쳤싶좋많맞낫쉽렵높싸]다|듯|[남함됨])[ \t]+(?=[가-힣A-Za-z0-9"“'(])/g
function runOns(t: string): string[] {
  const out: string[] = []
  for (const line of t.trim().split('\n')) for (const m of line.matchAll(RUN)) {
    const word = m[1]! + m[2]!, next = line.slice(m.index! + m[0].length)
    if (m[2] === '요' && /(필|중|주|수|개|강|소|요)요$/.test(word)) continue
    if (/^(처음|다음|마음|게임|모임|포함|아님?|남|이름|느낌)$/.test(word)) continue
    if (/다$|듯$/.test(m[2]!) && /^(보니|보면|보니까|싶|하|합|해|한|할|했|하고|치고|해도|는)/.test(next)) continue
    out.push(`${word} ${next.slice(0, 10)}`)
  }
  return out
}

if (cmd === 'show') {
  const ps = generated().sort((a, b) => diff(b.id) - diff(a.id))
  for (const p of ps.slice(0, Number(arg ?? 1e9))) {
    const o = sc(p.id, 'opus'), s = sc(p.id, 'sonnet'), d = rd(join(OUT, 'drafts', `${p.id}.json`)), ai = reply(p, 'SKILL')
    const tells = [anyPunct(ai) ? '' : 'NO-PUNCT', runOns(ai).length ? `RUN-ON(${runOns(ai).join('|')})` : ''].filter(Boolean).join(' ')
    console.log(`\n=== ${p.id} ${p.board} d=${diff(p.id).toFixed(0)} | opus ai ${o?.human.SKILL} real ${o?.human.HUMAN} | sonnet ai ${s?.human.SKILL} real ${s?.human.HUMAN} | ${d.kinds[d.pick]} of ${d.kinds.join(',')} | chars ai ${ai.length} real ${p.human.body.length} ${tells} ${review[p.id] ? '| ' + review[p.id] : ''}\nT: ${p.title}\nB: ${String(p.body).slice(0, 700)}\n-- AI: ${ai}\n-- REAL(${p.human.likes}): ${p.human.body}`)
  }
}

if (cmd === 'write') {
  const ps = generated()
  const kept = ps.filter((p) => review[p.id] === 'keep').sort((a, b) => diff(b.id) - diff(a.id))
  // the shape of korean-voice-test/posts.json
  wr(join(WORK, 'posts.json'), kept.map(({ id, board, boardName, title, body, comments, human }: any) => ({ id, board, boardName, title, body, comments, human: { likes: human.likes, body: human.body } })))
  const walk = (rd(walkFile) as any).walk as any[]
  const set = (w: any) => w.status !== 'candidate' ? w.status : hand[w.id] !== 'ok' ? 'dropped by hand before generation' : review[w.id] === 'keep' ? 'quiz' : review[w.id] ? 'generated, dropped in review' : 'generated, not reviewed'
  wr(join(D, 'ids.json'), walk.map((w) => ({ set: set(w), id: w.id, community: `clien/${w.board}`, url: `https://www.clien.net/service/board/${w.board}/${w.id}` })))
  const n: Record<string, number> = {}
  for (const w of walk) n[set(w)] = (n[set(w)] ?? 0) + 1
  const by = (xs: any[]) => { const c: Record<string, number> = {}; for (const p of xs) c[p.board] = (c[p.board] ?? 0) + 1; return JSON.stringify(c) }
  console.log(`walked ${walk.length}: ${JSON.stringify(n)}`)
  console.log(`kept ${kept.length} ${by(kept)}: AI side ${mean(kept.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(kept.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)} (mean of Opus and Sonnet); opus ai/real ${mean(kept.map((p) => sc(p.id, 'opus').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'opus').human.HUMAN)).toFixed(1)}, sonnet ${mean(kept.map((p) => sc(p.id, 'sonnet').human.SKILL)).toFixed(1)}/${mean(kept.map((p) => sc(p.id, 'sonnet').human.HUMAN)).toFixed(1)}; AI - real >= -15 in ${kept.filter((p) => diff(p.id) >= -15).length}, AI judged more human than the real one in ${kept.filter((p) => diff(p.id) > 0).length}`)
  console.log(`all generated ${ps.length} ${by(ps)}: AI side ${mean(ps.map((p) => avg(p.id, 'SKILL'))).toFixed(1)}, real side ${mean(ps.map((p) => avg(p.id, 'HUMAN'))).toFixed(1)}; AI - real >= -15 in ${ps.filter((p) => diff(p.id) >= -15).length}`)
  for (const p of kept) console.log(`  ${p.id} ${p.board} d=${diff(p.id).toFixed(0)} ai ${avg(p.id, 'SKILL').toFixed(0)} real ${avg(p.id, 'HUMAN').toFixed(0)} | chars ai ${reply(p, 'SKILL').trim().length} real ${p.human.body.trim().length}`)
  const c = cost()
  console.log(`cost (total_cost_usd): ${Object.entries(c).map(([k, v]) => `${k} $${v.toFixed(2)}`).join(', ')}; total $${Object.values(c).reduce((a, b) => a + b, 0).toFixed(2)}`)
}
