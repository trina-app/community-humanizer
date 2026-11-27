// Round NS (PROTOCOL.md): petergyang/no-ai-slop as a comparison arm on the 28 fresh (F1) threads.
// gen: NOAISLOP_S = gen.ts BLADER_S word for word with noaislop-SKILL.md in place of blader's, the same 10 samples.
// judge <opus|sonnet>: judge.ts prompt word for word, all five arms of a thread at once, seeded order per judge.
// analyze: per-judge means, two-judge mean, paired differences with bootstrap 95% intervals, lengths.
// Usage: bun noaislop.ts gen | judge opus | judge sonnet | analyze
// WORK is the folder outside git with posts-fresh.json (real posts and comments); outputs and scores go next to this file.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const WORK = process.env.WORK ?? join(process.env.HOME!, '.trina/know-raw/reddit-voice-test')
const posts = JSON.parse(readFileSync(join(WORK, 'posts-fresh.json'), 'utf8')) as any[]
const NOAISLOP = readFileSync(join(D, 'noaislop-SKILL.md'), 'utf8')
const ARMS = ['PLAIN', 'BLADER_S', 'NOAISLOP_S', 'SKILL3', 'HUMAN']
const OUT = 'judged-NS'
const [cmd, judge] = process.argv.slice(2)
mkdirSync(join(WORK, 'empty'), { recursive: true })

// gen.ts flags; the cost and model of every call is logged in the working folder
async function claude(model: string, text: string, stage: string): Promise<string> {
  const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
  const timer = setTimeout(() => r.kill(), 300_000)
  const o = await new Response(r.stdout).text()
  await r.exited
  clearTimeout(timer)
  try {
    const j = JSON.parse(o)
    appendFileSync(join(WORK, 'costs-ns.jsonl'), JSON.stringify({ stage, model, cost: j.total_cost_usd ?? null, models: Object.keys(j.modelUsage ?? {}), ok: !j.is_error && !!j.result }) + '\n')
    if (!j.is_error && j.result) return String(j.result).trim()
  } catch {}
  throw new Error(`claude ${model} failed (${stage}): ${o.slice(0, 120)}`)
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}
const file = (p: any, arm: string) => join(D, 'outputs', `${p.id}__${arm}.txt`)

// ---- gen.ts, word for word (BLADER_S with the no-ai-slop SKILL.md in place of blader's)
const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
const ask = (p: any) => `Write a reply to this Reddit post in r/${p.sub}.`
const rule = (p: any) => `Make it sound like a real person in r/${p.sub} wrote it, not an AI.`
const samples = (p: any) => `Here are real top comments from other recent threads in r/${p.sub}. Match how people here write (length, tone, how they open and end); don't copy their content:\n${p.samples.map((s: string, i: number) => `[${i + 1}] ${s}`).join('\n\n')}`
const END = 'Reply with the final comment text only.'
const NOAISLOP_S = (p: any) => `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${NOAISLOP}\n</skill>\n\n${samples(p)}\n\n${END}`

if (cmd === 'gen') {
  const todo = posts.filter((p) => !existsSync(file(p, 'NOAISLOP_S')))
  await pooled(todo, 6, async (p) => {
    for (let a = 0; a < 3; a++) { try { writeFileSync(file(p, 'NOAISLOP_S'), await claude('sonnet', NOAISLOP_S(p), 'gen')); return } catch (e) { if (a === 2) throw e } }
  })
  console.log(`gen: ${todo.length} jobs, ${posts.filter((p) => existsSync(file(p, 'NOAISLOP_S'))).length}/${posts.length} written`)
}

// ---- judge.ts, word for word (prompt, labels, seeded shuffle, parsing); seed <id>:<judge>:NS
const L = 'ABCDEFGH'
function order(seed: string): string[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const a = [...ARMS]
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] }
  return a
}
const reply = (p: any, arm: string) => arm === 'HUMAN' ? String(p.human.body) : readFileSync(file(p, arm), 'utf8')
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
  if (judge !== 'opus' && judge !== 'sonnet') throw new Error('judge: opus or sonnet')
  const dir = join(D, OUT, judge), raw = join(D, `${OUT}-raw`, judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(raw, { recursive: true })
  const missing = posts.filter((p) => ARMS.some((a) => a !== 'HUMAN' && !existsSync(file(p, a))))
  if (missing.length) throw new Error(`missing outputs for ${missing.map((p) => p.id).join(', ')}`)
  const todo = posts.filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, 6, async (p) => {
    const ord = order(`${p.id}:${judge}:NS`)
    for (let attempt = 1; attempt <= 2; attempt++) {
      let text = ''
      try {
        text = await claude(judge, prompt(p, ord), `judge-${judge}`)
        const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(raw, `${p.id}.txt`), text)
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, sub: p.sub, order: ord, human, rank }, null, 1))
        return
      } catch { writeFileSync(join(raw, `${p.id}.fail${attempt}.txt`), text) }
    }
    console.log(`failed ${p.id}`)
  })
  console.log(`${judge}: ${todo.length} jobs, ${readdirSync(dir).length}/${posts.length} judged`)
}

// ---- analysis (boot() of analyze.ts)
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const f1 = (x: number) => x.toFixed(1)
  const sg = (x: number) => (x >= 0 ? '+' : '') + f1(x)
  function boot(diffs: number[]): [number, number] {
    let s = 12345
    const rnd = () => ((s = Math.imul(s, 1103515245) + 12345 >>> 0) / 2 ** 32)
    const m: number[] = []
    for (let b = 0; b < 10000; b++) m.push(mean(diffs.map(() => diffs[Math.floor(rnd() * diffs.length)]!)))
    m.sort((a, b) => a - b)
    return [m[250]!, m[9749]!]
  }
  const ci = (d: number[]) => { const [lo, hi] = boot(d); return `${sg(mean(d))} [${f1(lo)}, ${f1(hi)}]` }
  const PAIRS = [['SKILL3', 'NOAISLOP_S'], ['SKILL3', 'BLADER_S'], ['NOAISLOP_S', 'BLADER_S'], ['SKILL3', 'HUMAN'], ['NOAISLOP_S', 'HUMAN']]
  const judges = ['opus', 'sonnet'].filter((j) => existsSync(join(D, OUT, j)))
  const rows: Record<string, any[]> = {}
  for (const j of judges) rows[j] = readdirSync(join(D, OUT, j)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(D, OUT, j, f), 'utf8')))

  // NOAISLOP_S outputs with text that is not the comment (PROTOCOL.md): edit notes, a request for a draft, headings
  const META = /what changed|changes made|\bedited draft\b|\bedits?:|paste (your|the|a) draft|\bhere'?s (the|my|your) (edited|revised|reply|comment)|^#{1,6}\s|^\*\*[^*]+\*\*\s*$/im
  const flagged = posts.filter((p) => META.test(readFileSync(file(p, 'NOAISLOP_S'), 'utf8'))).map((p) => p.id)
  const extra = (process.env.FLAG ?? '').split(',').filter(Boolean)
  const drop = new Set([...flagged, ...extra])

  for (const [label, keep] of [['all threads', (_: any) => true], [`without the ${drop.size} flagged NOAISLOP_S threads`, (r: any) => !drop.has(r.id)]] as const) {
    if (label !== 'all threads' && drop.size === 0) continue
    console.log(`\n######## ${label}`)
    const means: Record<string, Record<string, number>> = {}
    for (const j of judges) {
      const rs = rows[j]!.filter(keep)
      means[j] = Object.fromEntries(ARMS.map((a) => [a, mean(rs.map((r) => r.human[a]))]))
      console.log(`\n## ${j} (n=${rs.length} threads)\narm          human%  pass%  upvote-rank  more-human-than-HUMAN (ties)`)
      for (const a of ARMS) console.log(`${a.padEnd(11)} ${f1(means[j]![a]!).padStart(7)} ${f1(100 * mean(rs.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rs.map((r) => r.rank[a]))).padStart(8)}      ${a === 'HUMAN' ? '' : `${rs.filter((r) => r.human[a] > r.human.HUMAN).length}/${rs.length} (${rs.filter((r) => r.human[a] === r.human.HUMAN).length})`}`)
      for (const [x, y] of PAIRS) console.log(`${x} - ${y}: human ${ci(rs.map((r) => r.human[x] - r.human[y]))}, pass ${ci(rs.map((r) => 100 * ((r.human[x] >= 50 ? 1 : 0) - (r.human[y] >= 50 ? 1 : 0))))}pt, upvote rank better by ${f1(mean(rs.map((r) => r.rank[y] - r.rank[x])))}`)
    }
    if (judges.length === 2) {
      console.log(`\n## mean of the two judges\n${ARMS.map((a) => `${a} ${f1(mean(judges.map((j) => means[j]![a]!)))}`).join(', ')}`)
      const both = (x: string, y: string) => { const ids = rows.opus!.filter(keep).map((r) => r.id).filter((id) => rows.sonnet!.some((r) => r.id === id)); return ids.map((id) => mean(judges.map((j) => { const r = rows[j]!.find((r) => r.id === id); return r.human[x] - r.human[y] }))) }
      for (const [x, y] of PAIRS) console.log(`${x} - ${y} (two-judge mean per thread): ${ci(both(x, y))}`)
      const k = rows.opus!.filter(keep)
      const pass = judges.every((j) => { const d = rows[j]!.filter(keep).map((r) => r.human.SKILL3 - r.human.NOAISLOP_S); return mean(d) > 0 && boot(d)[0] > 0 })
      console.log(`\nRULE (SKILL3 beats NOAISLOP_S on both judges, interval above zero on both): ${pass ? 'PASS' : 'NO-GO'} (n=${k.length})`)
    }
  }

  console.log(`\n## NOAISLOP_S outputs with non-comment text (regex): ${flagged.length ? flagged.join(', ') : 'none'}${extra.length ? `; added by reading: ${extra.join(', ')}` : ''}`)
  const text = (p: any, a: string) => (a === 'HUMAN' ? String(p.human.body) : readFileSync(file(p, a), 'utf8'))
  console.log(`\n## style (no AI), n=${posts.length}\narm          words(median)  chars(median)  paragraphs  bullets%  bold%  emdash%`)
  for (const a of ARMS) {
    const t = posts.map((p) => text(p, a))
    const med = (v: number[]) => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]! }
    console.log(`${a.padEnd(11)} ${String(med(t.map((x) => x.split(/\s+/).filter(Boolean).length))).padStart(8)}      ${String(med(t.map((x) => x.length))).padStart(9)}      ${f1(mean(t.map((x) => x.split(/\n\s*\n/).filter((s) => s.trim()).length))).padStart(6)}    ${f1(100 * mean(t.map((x) => (/^\s*([-*•]|\d+\.)\s/m.test(x) ? 1 : 0)))).padStart(6)}  ${f1(100 * mean(t.map((x) => (/\*\*[^*]+\*\*/.test(x) ? 1 : 0)))).padStart(5)}  ${f1(100 * mean(t.map((x) => (/—/.test(x) ? 1 : 0)))).padStart(6)}`)
  }

  // cost and models, from the call log in the working folder
  if (existsSync(join(WORK, 'costs-ns.jsonl'))) {
    const c = readFileSync(join(WORK, 'costs-ns.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const by = new Map<string, { n: number; cost: number; models: Set<string> }>()
    for (const x of c) { const e = by.get(x.stage) ?? { n: 0, cost: 0, models: new Set<string>() }; e.n++; e.cost += x.cost ?? 0; for (const m of x.models) e.models.add(m); by.set(x.stage, e) }
    console.log(`\n## cost: $${c.reduce((s, x) => s + (x.cost ?? 0), 0).toFixed(2)} over ${c.length} calls (${c.filter((x) => !x.ok).length} not ok)`)
    for (const [s, e] of by) console.log(`${s}: ${e.n} calls, $${e.cost.toFixed(2)}, models ${[...e.models].join(' + ')}`)
  }
}
