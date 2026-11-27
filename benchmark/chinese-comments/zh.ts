// Chinese test (PROTOCOL.md). Usage:
//   bun zh.ts classify                    label the sample pool by type (the tool's LABEL prompt, Sonnet)
//   bun zh.ts gen                         write PLAIN, HUMANIZER_S and SKILL replies (Sonnet) into outputs/
//   bun zh.ts judge <codex|opus|sonnet>   blind judging into judged/<judge>/, every answer in judged-raw/<judge>/
//   bun zh.ts analyze                     tables for RESULTS.md (also written to analyze.out)
//   bun zh.ts quiz                        ~/.trina/know-raw/quiz-items-zh.json (outside git)
// Real thread text is read from DATA (outside the repo, written by collect.ts).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { LABEL, types, replyPrompt, replyPick } from '../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../skills/community-humanizer/lib/claude.mjs'
import { defaults } from '../../skills/community-humanizer/lib/profile.mjs'
import { DATA, claude, codex, pooled, totalCost } from './lib.ts'

const D = import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(DATA, 'posts.json'), 'utf8')) as any[]
const pool = JSON.parse(readFileSync(join(DATA, 'pool.json'), 'utf8')) as any[]
const OUT = join(D, 'outputs')
mkdirSync(join(OUT, 'drafts'), { recursive: true })

// ---- classify: the 160 highest-scoring pool comments, as voice.mjs labelled() does
const LABELLED = join(DATA, 'labelled.json')
if (cmd === 'classify') {
  const top = pool.slice(0, 160).map((c) => ({ ...c }))
  const batches: any[][] = []
  for (let i = 0; i < top.length; i += 40) batches.push(top.slice(i, i + 40))
  await pooled(batches, 4, async (batch) => {
    const res = await claude('sonnet', `${LABEL}\n\n${batch.map((c, k) => `[${k + 1}] ${c.body.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`, 'label')
    const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
    batch.forEach((c, k) => { c.type = j[String(k + 1)] })
  })
  const out = top.filter((c) => c.type)
  writeFileSync(LABELLED, JSON.stringify(out, null, 1))
  const count: Record<string, number> = {}
  for (const c of out) count[c.type] = (count[c.type] ?? 0) + 1
  console.log(`labelled ${out.length}/${top.length}: ${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${Math.round((100 * n) / out.length)}%`).join(', ')}`)
}

// ---- prompts: ../reddit-comments/gen.ts word for word (PLAIN, BLADER_S with Humanizer-zh in place of blader's skill)
const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
const ask = (p: any) => `Write a reply to this Reddit post in r/${p.sub}.`
const rule = (p: any) => `Make it sound like a real person in r/${p.sub} wrote it, not an AI.`
const END = 'Reply with the final comment text only.'
// the 10 samples: build-fresh-as.ts samplesFor (5+ points, at most 3 per thread, round-robin, 600 characters)
function samples10(): string[] {
  const per = new Map<string, any[]>()
  for (const c of pool.filter((c) => c.score >= 5)) if ((per.get(c.thread)?.length ?? 0) < 3) per.set(c.thread, [...(per.get(c.thread) ?? []), c])
  const rounds = [...per.values()], out: string[] = []
  for (let i = 0; out.length < 10 && i < 3; i++) for (const r of rounds) if (r[i] && out.length < 10) out.push(String(r[i].body).slice(0, 600))
  return out
}
const samplesText = (p: any) => `Here are real top comments from other recent threads in r/${p.sub}. Match how people here write (length, tone, how they open and end); don't copy their content:\n${samples10().map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}`

// ---- SKILL: bin/voice.mjs reply(), with Sonnet as the writer (--fast)
function drawTypes(seed: string, rates: Record<string, number>, defs: Record<string, string>, examples: (t: string) => string[]) {
  const r = rng(seed), kinds: string[] = []
  const left = new Map(Object.entries(rates).filter(([t, v]) => defs[t] && v > 0 && examples(t).length >= 2))
  while (kinds.length < 3 && left.size) {
    let x = r() * [...left.values()].reduce((a, b) => a + b, 0)
    for (const [t, v] of left) { x -= v; if (x <= 0) { kinds.push(t); left.delete(t); break } }
  }
  return kinds
}

if (cmd === 'gen') {
  const HZ = readFileSync(join(D, 'humanizer-zh-SKILL.md'), 'utf8')
  const lab = JSON.parse(readFileSync(LABELLED, 'utf8')) as any[]
  const defs = types('en', undefined)
  const fallback = defaults('en')
  const rates = lab.length >= 40 ? Object.fromEntries(Object.keys(fallback).map((t) => [t, lab.filter((c) => c.type === t).length / lab.length])) : fallback
  const examples = (t: string) => lab.filter((c) => c.type === t).slice(0, 6).map((c) => c.body.slice(0, 400))
  console.log(`rates: ${JSON.stringify(rates)}`)
  const ARMS: Record<string, (p: any) => string> = {
    PLAIN: (p) => `${post(p)}\n\n${ask(p)} ${END}`,
    HUMANIZER_S: (p) => `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${HZ}\n</skill>\n\n${samplesText(p)}\n\n${END}`,
  }
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(OUT, `${p.id}__${arm}.txt`)
    for (const [arm, prompt] of Object.entries(ARMS)) if (!existsSync(f(arm))) jobs.push(async () => writeFileSync(f(arm), await claude('sonnet', prompt(p), arm)))
    if (!existsSync(f('SKILL'))) jobs.push(async () => {
      const kinds = drawTypes(p.id, rates, defs, examples)
      const drafts = await Promise.all(kinds.map((t) => claude('sonnet', replyPrompt('en', p, t, examples(t), undefined, block, undefined), 'SKILL')))
      const pick = await claude('haiku', replyPick('en', p, drafts, block), 'SKILL-pick')
      const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
      writeFileSync(join(OUT, 'drafts', `${p.id}.json`), JSON.stringify({ kinds, drafts, pick: k }, null, 1))
      writeFileSync(f('SKILL'), drafts[k]!)
    })
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs, cost so far $${totalCost().toFixed(2)}`)
}

// ---- judging: ../reddit-comments/judge.ts word for word
const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'HUMAN']
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
  const judge = judgeName!
  const dir = join(D, 'judged', judge), rawDir = join(D, 'judged-raw', judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  const todo = posts.filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, judge === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judge}`)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rawFile = join(rawDir, `${p.id}${attempt ? `.retry${attempt}` : ''}.txt`)
        let text: string
        if (judge === 'codex') text = await codex(prompt(p, ord), rawFile)
        else { text = await claude(judge, prompt(p, ord), `judge-${judge}`); writeFileSync(rawFile, text) }
        const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, sub: p.sub, order: ord, human, rank }, null, 1))
        return
      } catch {}
    }
    console.log(`failed ${p.id}`)
  })
  console.log(`${judge}: judged ${todo.length}, cost so far $${totalCost().toFixed(2)}`)
}

// ---- analysis
const JUDGES = ['codex', 'opus', 'sonnet']
const rowsOf = (judge: string) => (existsSync(join(D, 'judged', judge)) ? readdirSync(join(D, 'judged', judge)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(D, 'judged', judge, f), 'utf8'))) : [])
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
const f1 = (x: number) => x.toFixed(1)
// mostly Chinese: CJK characters are at least half of the CJK + Latin letters
const zhShare = (s: string) => { const cjk = (s.match(/[一-鿿]/g) ?? []).length, lat = (s.match(/[A-Za-z]/g) ?? []).length; return cjk + lat ? cjk / (cjk + lat) : 0 }

if (cmd === 'analyze') {
  const lines: string[] = []
  const log = (s: string) => { lines.push(s); console.log(s) }
  const per: Record<string, Record<string, number>> = {}
  for (const judge of JUDGES) {
    const rows = rowsOf(judge)
    if (!rows.length) continue
    per[judge] = {}
    log(`\n## ${judge} (n=${rows.length})\narm          human%  pass%  upvote-rank`)
    for (const a of ARMS) { per[judge]![a] = mean(rows.map((r) => r.human[a])); log(`${a.padEnd(12)} ${f1(per[judge]![a]!).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`) }
    for (const [x, y] of [['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN'], ['SKILL', 'PLAIN'], ['HUMANIZER_S', 'PLAIN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); log(`${x} - ${y}: human ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
    log(`judged more human than the real comment: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}`)
  }
  // average of the three judges: per arm, the mean of the judges' means; and per thread, the mean of the judges' scores
  const js = Object.keys(per)
  log(`\n## average of ${js.length} judges (${js.join(', ')})`)
  for (const a of ARMS) log(`${a.padEnd(12)} ${f1(mean(js.map((j) => per[j]![a]!)))}`)
  const common = posts.filter((p) => js.every((j) => existsSync(join(D, 'judged', j, `${p.id}.json`))))
  const avg = (id: string, a: string) => mean(js.map((j) => JSON.parse(readFileSync(join(D, 'judged', j, `${id}.json`), 'utf8')).human[a]))
  for (const [x, y] of [['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN']]) { const d = common.map((p) => avg(p.id, x) - avg(p.id, y)); const [lo, hi] = boot(d); log(`${x} - ${y} (judge average, n=${common.length}): ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
  const beats = (j: string) => { const d = rowsOf(j).map((r) => r.human.SKILL - r.human.HUMANIZER_S); return mean(d) > 0 && boot(d)[0]! > 0 }
  const missing = JUDGES.filter((j) => !js.includes(j))
  if (missing.length) log(`\nPrimary rule (SKILL beats HUMANIZER_S on all three judges, interval above zero): cannot be applied as written, ${missing.join(', ')} not run. On the judges that ran (${js.join(', ')}): ${js.every(beats) ? 'SKILL beats HUMANIZER_S on every one, interval above zero' : 'not on every one'}`)
  else log(`\nPrimary rule (SKILL beats HUMANIZER_S on all three judges, interval above zero): ${JUDGES.every(beats) ? 'PASSED' : 'NO-GO'}`)
  const chars = (a: string) => posts.map((p) => [...reply(p, a)].length).sort((x, y) => x - y)
  log(`length (characters, median): ${ARMS.map((a) => `${a} ${chars(a)[Math.floor(posts.length / 2)]}`).join(', ')}`)
  log(`not mainly Chinese: ${ARMS.map((a) => `${a} ${posts.filter((p) => zhShare(reply(p, a)) < 0.5).length}/${posts.length}`).join(', ')}`)
  const kinds: Record<string, number> = {}
  for (const p of posts) { const d = JSON.parse(readFileSync(join(OUT, 'drafts', `${p.id}.json`), 'utf8')); const t = d.kinds[d.pick]; kinds[t] = (kinds[t] ?? 0) + 1 }
  log(`SKILL picked type: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')}`)
  log(`Claude cost (all calls, from cost.jsonl): $${totalCost().toFixed(2)}`)
  writeFileSync(join(D, 'analyze.out'), lines.join('\n') + '\n')
}

// ---- quiz items, in the shape of community-reply/quiz/src/items.json (outside git)
if (cmd === 'quiz') {
  const J: Record<string, string> = { gpt: 'codex', opus: 'opus', sonnet: 'sonnet' }
  const items = posts.map((p) => {
    const scores: any = {}
    for (const [k, j] of Object.entries(J)) { const f = join(D, 'judged', j, `${p.id}.json`); if (existsSync(f)) { const r = JSON.parse(readFileSync(f, 'utf8')); scores[k] = { human: r.human.HUMAN, ai: r.human.SKILL } } }
    const body = String(p.body)
    return { qid: `zc-${p.id}`, lang: 'zh', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: body.length > 600 ? body.slice(0, 599) + '…' : body, url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`, human: String(p.human.body).slice(0, 600), ai: reply(p, 'SKILL'), scores }
  })
  const f = join(homedir(), '.trina/know-raw/quiz-items-zh.json')
  writeFileSync(f, JSON.stringify(items, null, 1) + '\n')
  console.log(`wrote ${items.length} items to ${f}`)
}
