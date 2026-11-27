// Indonesian test (PROTOCOL.md). Same as ../spanish-comments/es.ts except: humanizer-indonesia in HUMANIZER_S, the
// Indonesian check, two Claude judges only. Usage:
//   bun id.ts classify              label each subreddit's sample pool by type (the tool's labelled())
//   bun id.ts gen                   write PLAIN, HUMANIZER_S and SKILL replies into outputs/
//   bun id.ts judge <opus|sonnet>   blind judging into judged/<judge>/, raw answers into judged-raw/<judge>/
//   bun id.ts analyze               tables, intervals, lengths, languages, cost (id.out); per-thread list with titles in WORK
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORK, D, claude, pooled, lang, indonesianComment, readJson } from './lib'
import { LABEL, types, replyPrompt, replyPick } from '../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../skills/community-humanizer/lib/claude.mjs'
import * as profiles from '../../skills/community-humanizer/lib/profile.mjs'

const [cmd, judgeName] = process.argv.slice(2)
const posts = (readJson(join(WORK, 'posts.json')) as any[]).map((p) => ({ ...p, key: String(p.sub).toLowerCase() }))
const KEYS = [...new Set(posts.map((p) => p.key))] as string[]
const OUT = join(D, 'outputs')
mkdirSync(join(OUT, 'drafts'), { recursive: true })

// ---- pools: the tool's labelled() on the comments collect.ts kept (other threads only, sorted by score, first 160)
const labelledFile = (k: string) => join(WORK, `labelled-${k}.json`)
if (cmd === 'classify') {
  for (const k of KEYS) {
    if (existsSync(labelledFile(k))) continue
    const top = (readJson(join(WORK, `pool-${k}.json`)) as any[]).slice(0, 160)
    for (let i = 0; i < top.length; i += 40) {
      const batch = top.slice(i, i + 40)
      try {
        const res = await claude('sonnet', `${LABEL}\n\n${batch.map((c, n) => `[${n + 1}] ${c.body.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`, 'label')
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        batch.forEach((c, n) => { c.type = j[String(n + 1)] })
      } catch {}
    }
    const out = top.filter((c) => c.type)
    writeFileSync(labelledFile(k), JSON.stringify(out, null, 1))
    const count: Record<string, number> = {}
    for (const c of out) count[c.type] = (count[c.type] ?? 0) + 1
    console.log(`${k} (n=${out.length}/${top.length}): ${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${Math.round((100 * n) / out.length)}%`).join(', ')}`)
  }
}

// ---- prompts. PLAIN and HUMANIZER_S: reddit-comments/gen.ts word for word (BLADER_S there), humanizer-indonesia's SKILL.md
const HZ = readFileSync(join(D, 'humanizer-id-SKILL.md'), 'utf8')
const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
const ask = (p: any) => `Write a reply to this Reddit post in r/${p.sub}.`
const rule = (p: any) => `Make it sound like a real person in r/${p.sub} wrote it, not an AI.`
const samples = (p: any) => `Here are real top comments from other recent threads in r/${p.sub}. Match how people here write (length, tone, how they open and end); don't copy their content:\n${p.samples.map((s: string, i: number) => `[${i + 1}] ${s}`).join('\n\n')}`
const END = 'Reply with the final comment text only.'

// the 10 samples: build-fresh-as.ts samplesFor (5+ points, at most 3 per thread, round-robin), 2+ point comments fill in
function samplesFor(k: string): string[] {
  const pool = readJson(join(WORK, `pool-${k}.json`)) as any[]
  const pick = (min: number) => {
    const per = new Map<string, any[]>()
    for (const c of pool.filter((c) => c.score >= min).sort((a, b) => b.score - a.score)) if ((per.get(c.thread)?.length ?? 0) < 3) per.set(c.thread, [...(per.get(c.thread) ?? []), c])
    const rounds = [...per.values()], out: string[] = []
    for (let i = 0; out.length < 10 && i < 3; i++) for (const r of rounds) if (r[i] && out.length < 10) out.push(String(r[i].body).slice(0, 600))
    return out
  }
  const s = pick(5)
  for (const x of pick(2)) if (s.length < 10 && !s.includes(x)) s.push(x)
  return s
}

// SKILL: bin/voice.mjs reply, with Sonnet as the writer (--fast). drawTypes copied from voice.mjs.
function drawTypes(seed: string, rates: Record<string, number>, defs: Record<string, string>, examples: (t: string) => string[]) {
  const r = rng(seed), kinds: string[] = []
  const left = new Map(Object.entries(rates).filter(([t, v]) => defs[t] && v > 0 && examples(t).length >= 2))
  while (kinds.length < 3 && left.size) {
    let x = r() * [...left.values()].reduce((a, b) => a + b, 0)
    for (const [t, v] of left) { x -= v; if (x <= 0) { kinds.push(t); left.delete(t); break } }
  }
  return kinds
}
async function skill(p: any) {
  const pool = (readJson(labelledFile(p.key)) as any[]).filter((c) => c.thread !== p.id)
  const defs = types('en', undefined)
  const fallback = profiles.defaults('en')
  const rates = pool.length >= 40 ? Object.fromEntries(Object.keys(fallback).map((t) => [t, pool.filter((c) => c.type === t).length / pool.length])) : fallback
  const examples = (t: string) => pool.filter((c) => c.type === t).slice(0, 6).map((c) => c.body.slice(0, 400))
  const kinds = drawTypes(p.id, rates, defs, examples)
  const drafts = await Promise.all(kinds.map((t) => claude('sonnet', replyPrompt('en', p, t, examples(t), undefined, block, undefined), 'gen-skill')))
  const pick = await claude('haiku', replyPick('en', p, drafts, block), 'gen-pick')
  const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
  writeFileSync(join(OUT, 'drafts', `${p.id}.json`), JSON.stringify({ kinds, drafts, pick: k, haiku: pick, rates_from: pool.length >= 40 ? `pool (${pool.length})` : 'defaults' }, null, 1))
  return drafts[k]!
}

if (cmd === 'gen') {
  const jobs: (() => Promise<void>)[] = []
  for (const p0 of posts) {
    const p = { ...p0, samples: samplesFor(p0.key) }
    const f = (arm: string) => join(OUT, `${p.id}__${arm}.txt`)
    if (!existsSync(f('PLAIN'))) jobs.push(async () => writeFileSync(f('PLAIN'), await claude('sonnet', `${post(p)}\n\n${ask(p)} ${END}`, 'gen-plain')))
    if (!existsSync(f('HUMANIZER_S'))) jobs.push(async () => writeFileSync(f('HUMANIZER_S'), await claude('sonnet', `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${HZ}\n</skill>\n\n${samples(p)}\n\n${END}`, 'gen-humanizer')))
    if (!existsSync(f('SKILL'))) jobs.push(async () => writeFileSync(f('SKILL'), await skill(p)))
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs`)
}

// ---- judging: reddit-comments/judge.ts prompt and order() word for word, 4 arms
const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'HUMAN']
const L = 'ABCDEFGH'
const reply = (p: any, arm: string) => (arm === 'HUMAN' ? String(p.human.body) : readFileSync(join(OUT, `${p.id}__${arm}.txt`), 'utf8'))
function order(seed: string): string[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const a = [...ARMS]
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] }
  return a
}
function judgePrompt(p: any, ord: string[]) {
  return `Below is a post from r/${p.sub} and ${ord.length} replies to it, labelled ${L.slice(0, ord.length).split('').join(', ')}. Some replies were written by people who really commented in this thread, some were written by an AI.

For each reply, give the probability (0-100) that a human wrote it. Then rank all replies by which you would upvote as a regular reader of r/${p.sub}, best first.

Answer with JSON only: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}

Post in r/${p.sub}:
Title: ${p.title}

${p.body}

${ord.map((arm, i) => `--- Reply ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
}

if (cmd === 'judge') {
  const judge = judgeName!
  if (judge !== 'opus' && judge !== 'sonnet') throw new Error('judge: opus or sonnet (no GPT judge in this run, PROTOCOL.md)')
  const dir = join(D, 'judged', judge), rawDir = join(D, 'judged-raw', judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), 4, async (p) => {
    const ord = order(`${p.id}:${judge}`)
    for (let a = 0; a < 2; a++) {
      try {
        const raw = join(rawDir, a ? `${p.id}.try2.txt` : `${p.id}.txt`)
        const res = await claude(judge, judgePrompt(p, ord), `judge-${judge}`)
        writeFileSync(raw, res)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, sub: p.sub, order: ord, human, rank }, null, 1))
        return
      } catch {}
    }
    console.log(`failed ${judge} ${p.id}`)
    appendFileSync(join(WORK, 'judge-failures.log'), `${judge} ${p.id}\n`)
  })
  console.log(`${judge}: done`)
}

// ---- analysis
const JUDGES = ['opus', 'sonnet']
const rowsOf = (j: string) => (existsSync(join(D, 'judged', j)) ? readdirSync(join(D, 'judged', j)).filter((f) => f.endsWith('.json')).map((f) => readJson(join(D, 'judged', j, f))) : [])
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const f1 = (x: number) => x.toFixed(1)
const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const BORDER = new Set(['1xse85x', '1xux6n4', '1xnj0zn'])

if (cmd === 'analyze') {
  const lines: string[] = []
  const say = (s: string) => { lines.push(s); console.log(s) }
  const per: Record<string, Record<string, number>> = {}
  const pass: Record<string, boolean> = {}
  for (const judge of JUDGES) {
    const rows = rowsOf(judge)
    if (!rows.length) continue
    per[judge] = {}
    say(`\n## ${judge} (n=${rows.length})\narm          human%  pass%  upvote-rank`)
    for (const a of ARMS) { per[judge]![a] = mean(rows.map((r) => r.human[a])); say(`${a.padEnd(12)} ${f1(per[judge]![a]!).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`) }
    for (const [x, y] of [['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN'], ['SKILL', 'PLAIN'], ['HUMANIZER_S', 'PLAIN']]) {
      const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d)
      if (x === 'SKILL' && y === 'HUMANIZER_S') pass[judge] = mean(d) > 0 && lo! > 0
      say(`${x} - ${y}: human ${f1(mean(d))} [${f1(lo!)}, ${f1(hi!)}]`)
    }
    say(`judged more human than the real comment: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}; tied with it: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] === r.human.HUMAN).length}`).join(', ')}`)
    say(`upvote rank SKILL above HUMAN: ${rows.filter((r) => r.rank.SKILL < r.rank.HUMAN).length}/${rows.length}`)
    const subs = [...new Set(rows.map((r) => r.sub))]
    say(`by subreddit (SKILL - HUMANIZER_S): ${subs.map((s) => { const rs = rows.filter((r) => r.sub === s); return `${s} ${f1(mean(rs.map((r) => r.human.SKILL - r.human.HUMANIZER_S)))} (n=${rs.length})` }).join(', ')}`)
    say(`by subreddit (SKILL mean): ${subs.map((s) => { const rs = rows.filter((r) => r.sub === s); return `${s} ${f1(mean(rs.map((r) => r.human.SKILL)))}` }).join(', ')}`)
    // the three borderline threads named in PROTOCOL.md before any generation
    { const rs = rows.filter((r) => !BORDER.has(r.id)); say(`without the 3 borderline threads (n=${rs.length}): ${ARMS.map((a) => `${a} ${f1(mean(rs.map((r) => r.human[a])))}`).join(', ')}; ${[['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN']].map(([x, y]) => { const d = rs.map((r) => r.human[x] - r.human[y]), [lo, hi] = boot(d); return `${x} - ${y} ${f1(mean(d))} [${f1(lo!)}, ${f1(hi!)}]` }).join('; ')}`) }
  }
  const ran = Object.keys(per)
  say(`\n## mean of the two judges (${ran.join(', ')})\n${ARMS.map((a) => `${a.padEnd(12)} ${f1(mean(ran.map((j) => per[j]![a]!)))}`).join('\n')}`)
  say(`\npass rule (SKILL beats HUMANIZER_S on both judges, interval above zero): ${ran.map((j) => `${j} ${pass[j] ? 'yes' : 'no'}`).join(', ')} -> ${ran.length === 2 && ran.every((j) => pass[j]) ? 'PASS' : 'NO-GO'}`)
  const chars = (a: string) => posts.map((p) => reply(p, a).trim().length).sort((x, y) => x - y)
  const wl = (a: string) => posts.map((p) => words(reply(p, a))).sort((x, y) => x - y)
  const med = (v: number[]) => v[Math.floor(v.length / 2)]! // as es.ts: the upper middle value for an even count
  say(`\nlength (median chars / words): ${ARMS.map((a) => `${a} ${med(chars(a))}/${med(wl(a))}`).join(', ')}`)
  say(`in Indonesian (word check): ${ARMS.map((a) => `${a} ${posts.filter((p) => indonesianComment(reply(p, a))).length}/${posts.length}`).join(', ')}`)
  say(`not Indonesian: ${ARMS.flatMap((a) => posts.filter((p) => !indonesianComment(reply(p, a))).map((p) => `${a}:${p.id} ${JSON.stringify(lang(reply(p, a)))}`)).join('; ') || 'none'}`)
  const kinds: Record<string, number> = {}
  for (const p of posts) { const d = readJson(join(OUT, 'drafts', `${p.id}.json`)); kinds[d.kinds[d.pick]] = (kinds[d.kinds[d.pick]] ?? 0) + 1 }
  say(`SKILL picked type: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')}`)
  const costs = readFileSync(join(WORK, 'costs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const by: Record<string, number> = {}
  for (const c of costs) by[c.stage] = (by[c.stage] ?? 0) + (c.cost ?? 0)
  say(`\nClaude cost (total_cost_usd): ${Object.entries(by).map(([s, v]) => `${s} $${v.toFixed(2)}`).join(', ')}; total $${Object.values(by).reduce((a, b) => a + b, 0).toFixed(2)} over ${costs.length} calls`)
  writeFileSync(join(D, 'id.out'), lines.join('\n') + '\n')
  // per thread, with titles (real text, so it stays in the working folder): two-judge averages, each judge, ranks, words
  const J = Object.fromEntries(ran.map((j) => [j, Object.fromEntries(rowsOf(j).map((r) => [r.id, r]))]))
  const rowsT = posts.map((p) => ({ p, avg: Object.fromEntries(ARMS.map((a) => [a, mean(ran.map((j) => J[j]![p.id]?.human[a]))])), w: Object.fromEntries(ARMS.map((a) => [a, words(reply(p, a))])) }))
  rowsT.sort((a, b) => b.avg.SKILL! - a.avg.SKILL!)
  const tl = rowsT.map(({ p, avg, w }) => `${p.id} r/${p.sub} ${JSON.stringify(p.title)}\n  avg ${ARMS.map((a) => `${a} ${f1(avg[a]!)}`).join(' ')}\n  ${ran.map((j) => `${j} ${ARMS.map((a) => `${a} ${J[j]![p.id]?.human[a]}`).join(' ')} | rank SKILL ${J[j]![p.id]?.rank.SKILL} HUMAN ${J[j]![p.id]?.rank.HUMAN}`).join('\n  ')}\n  words ${ARMS.map((a) => `${a} ${w[a]}`).join(' ')}`)
  writeFileSync(join(WORK, 'threads.out'), tl.join('\n') + '\n')
  console.log(`\nper-thread list with titles: ${join(WORK, 'threads.out')}`)
}
