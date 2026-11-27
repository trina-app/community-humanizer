// Spanish test (PROTOCOL.md). Usage:
//   bun es.ts classify                    label each subreddit's sample pool by type (the tool's labelled())
//   bun es.ts gen                         write PLAIN, HUMANIZER_S and SKILL replies into outputs/
//   bun es.ts judge <codex|opus|sonnet>   blind judging into judged/<judge>/, raw answers into judged-raw/<judge>/
//   bun es.ts analyze                     tables, intervals, lengths, languages, cost
//   bun es.ts quiz                        ~/.trina/know-raw/quiz-items-es.json (outside git)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORK, D, claude, pooled, lang, spanishComment, readJson } from './lib'
import { LABEL, types, replyPrompt, replyPick } from '../../skills/community-humanizer/lib/prompts.mjs'
import { block, rng } from '../../skills/community-humanizer/lib/claude.mjs'
import * as profiles from '../../skills/community-humanizer/lib/profile.mjs'

const [cmd, judgeName] = process.argv.slice(2)
const posts = readJson(join(WORK, 'posts.json')) as any[]
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

// ---- prompts. PLAIN and HUMANIZER_S: reddit-comments/gen.ts word for word (BLADER_S there)
const BLADER = readFileSync(join(D, '..', 'reddit-comments', 'blader-SKILL.md'), 'utf8')
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
    if (!existsSync(f('HUMANIZER_S'))) jobs.push(async () => writeFileSync(f('HUMANIZER_S'), await claude('sonnet', `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${BLADER}\n</skill>\n\n${samples(p)}\n\n${END}`, 'gen-humanizer')))
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

async function codex(text: string, out: string, logFile: string): Promise<string> {
  const r = Bun.spawn(['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', out, text], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' })
  const [o, e] = await Promise.all([new Response(r.stdout).text(), new Response(r.stderr).text()])
  await r.exited
  writeFileSync(logFile, o + '\n' + e) // the session log echoes the prompt (real comments), so it stays in the working folder
  return readFileSync(out, 'utf8')
}

if (cmd === 'judge') {
  const judge = judgeName!
  const dir = join(D, 'judged', judge), rawDir = join(D, 'judged-raw', judge), logDir = join(WORK, 'codex-logs')
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true }); mkdirSync(logDir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judge === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judge}`)
    for (let a = 0; a < 2; a++) {
      try {
        const raw = join(rawDir, a ? `${p.id}.try2.txt` : `${p.id}.txt`)
        const res = judge === 'codex' ? await codex(judgePrompt(p, ord), raw, join(logDir, `${p.id}.${a}.log`)) : await claude(judge, judgePrompt(p, ord), `judge-${judge}`)
        if (judge !== 'codex') writeFileSync(raw, res)
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
const JUDGES = ['codex', 'opus', 'sonnet']
const rowsOf = (j: string) => (existsSync(join(D, 'judged', j)) ? readdirSync(join(D, 'judged', j)).filter((f) => f.endsWith('.json')).map((f) => readJson(join(D, 'judged', j, f))) : [])
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const f1 = (x: number) => x.toFixed(1)
const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }

if (cmd === 'analyze') {
  const lines: string[] = []
  const say = (s: string) => { lines.push(s); console.log(s) }
  const per: Record<string, Record<string, number>> = {}
  for (const judge of JUDGES) {
    const rows = rowsOf(judge)
    if (!rows.length) continue
    per[judge] = {}
    say(`\n## ${judge} (n=${rows.length})\narm          human%  pass%  upvote-rank`)
    for (const a of ARMS) { per[judge]![a] = mean(rows.map((r) => r.human[a])); say(`${a.padEnd(12)} ${f1(per[judge]![a]!).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`) }
    for (const [x, y] of [['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN'], ['SKILL', 'PLAIN'], ['HUMANIZER_S', 'PLAIN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); say(`${x} - ${y}: human ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
    say(`judged more human than the real comment: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}`)
    const subs = [...new Set(rows.map((r) => r.sub))]
    say(`by subreddit (SKILL - HUMANIZER_S): ${subs.map((s) => { const rs = rows.filter((r) => r.sub === s); return `${s} ${f1(mean(rs.map((r) => r.human.SKILL - r.human.HUMANIZER_S)))} (n=${rs.length})` }).join(', ')}`)
    // r/askspain bans AI-generated content (its profile, written after the run), so the shipped tool now refuses it
    { const rs = rows.filter((r) => r.sub.toLowerCase() !== 'askspain'), d = rs.map((r) => r.human.SKILL - r.human.HUMANIZER_S), [lo, hi] = boot(d); say(`without r/askspain (n=${rs.length}): ${ARMS.map((a) => `${a} ${f1(mean(rs.map((r) => r.human[a])))}`).join(', ')}; SKILL - HUMANIZER_S ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
  }
  // the judges that ran (GPT was not run for this set, see PROTOCOL.md)
  const ran = Object.keys(per).join(', ')
  say(`\n## mean of the judges that ran (${ran})\n${ARMS.map((a) => `${a.padEnd(12)} ${f1(mean(Object.values(per).map((x) => x[a]!)))}`).join('\n')}`)
  const perNoAs = Object.keys(per).map((j) => rowsOf(j).filter((r) => r.sub.toLowerCase() !== 'askspain'))
  say(`\n## mean of the judges that ran (${ran}), without r/askspain (n=${perNoAs[0]?.length})\n${ARMS.map((a) => `${a.padEnd(12)} ${f1(mean(perNoAs.map((rs) => mean(rs.map((r) => r.human[a])))))}`).join('\n')}`)
  for (const id of ['1xynq5l']) say(`\nthread ${id}: ${Object.keys(per).map((j) => { const f = join(D, 'judged', j, `${id}.json`); return existsSync(f) ? `${j} ${ARMS.map((a) => `${a} ${readJson(f).human[a]}`).join(' ')}` : `${j} -` }).join(' | ')}`)
  const chars = (a: string) => posts.map((p) => reply(p, a).trim().length).sort((x, y) => x - y)
  const words = (a: string) => posts.map((p) => reply(p, a).trim().split(/\s+/).length).sort((x, y) => x - y)
  say(`\nlength (median chars / words): ${ARMS.map((a) => `${a} ${chars(a)[Math.floor(posts.length / 2)]}/${words(a)[Math.floor(posts.length / 2)]}`).join(', ')}`)
  say(`in Spanish (word check): ${ARMS.map((a) => `${a} ${posts.filter((p) => spanishComment(reply(p, a))).length}/${posts.length}`).join(', ')}`)
  say(`not Spanish: ${ARMS.flatMap((a) => posts.filter((p) => !spanishComment(reply(p, a))).map((p) => `${a}:${p.id} ${JSON.stringify(lang(reply(p, a)))}`)).join('; ') || 'none'}`)
  const kinds: Record<string, number> = {}
  for (const p of posts) { const d = readJson(join(OUT, 'drafts', `${p.id}.json`)); kinds[d.kinds[d.pick]] = (kinds[d.kinds[d.pick]] ?? 0) + 1 }
  say(`SKILL picked type: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')}`)
  const costs = readFileSync(join(WORK, 'costs.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const by: Record<string, number> = {}
  for (const c of costs) by[c.stage] = (by[c.stage] ?? 0) + (c.cost ?? 0)
  say(`\nClaude cost (total_cost_usd): ${Object.entries(by).map(([s, v]) => `${s} $${v.toFixed(2)}`).join(', ')}; total $${Object.values(by).reduce((a, b) => a + b, 0).toFixed(2)} over ${costs.length} calls`)
  const logs = existsSync(join(WORK, 'codex-logs')) ? readdirSync(join(WORK, 'codex-logs')) : []
  const tok = logs.map((f) => Number((readFileSync(join(WORK, 'codex-logs', f), 'utf8').match(/tokens used\s*\n?\s*([\d,]+)/i)?.[1] ?? '0').replace(/,/g, ''))).reduce((a, b) => a + b, 0)
  say(`codex: ${logs.length} runs, ${tok} tokens used`)
  writeFileSync(join(WORK, 'es.out'), lines.join('\n') + '\n')
}

// ---- quiz items (shape of community-reply/quiz/src/items.json; cut and fairness rule of quiz/scripts/build-items.ts)
if (cmd === 'quiz') {
  const LIMIT = 600
  const cut = (s: string) => (s.length > LIMIT ? s.slice(0, LIMIT).replace(/\s+\S*$/, '') + '…' : s)
  const fair = (h: string, a: string) => (h.length > LIMIT) === (a.length > LIMIT)
  const score = (j: string, id: string, arm: string) => { const f = join(D, 'judged', j, `${id}.json`); return existsSync(f) ? readJson(f).human[arm] ?? null : null }
  const items: any[] = [], unfair: string[] = []
  for (const p of posts) {
    const human = String(p.human.body), ai = readFileSync(join(OUT, `${p.id}__SKILL.txt`), 'utf8').trim()
    if (!fair(human, ai)) { unfair.push(p.id); continue }
    items.push({ qid: `rc-${p.id}`, lang: 'es', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      human: cut(human), ai: cut(ai), scores: Object.fromEntries(JUDGES.map((j) => [j === 'codex' ? 'gpt' : j, { human: score(j, p.id, 'HUMAN'), ai: score(j, p.id, 'SKILL') }])) })
  }
  const f = join(process.env.HOME!, '.trina/know-raw/quiz-items-es.json')
  writeFileSync(f, JSON.stringify(items, null, 1))
  console.log(`wrote ${items.length} items to ${f}; left out because only one side would be cut: ${unfair.join(', ') || 'none'}`)
}
