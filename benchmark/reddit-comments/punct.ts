// Round P (PROTOCOL.md): the punctuation line. SKILL3P = F1's SKILL3 (gen3.ts on the 28 fresh threads) with only the
// persona's last sentence changed. Prompts are built by the skill itself (skills/community-humanizer/lib/prompts.mjs);
// type draws, examples, pool, Sonnet drafts and the Haiku pick are gen3.ts's.
//   check          rebuild every F1 draft and pick prompt: the type draw must equal drafts3/<id>.json, SKILL3 must be the
//                  picked draft, and prompts.mjs must give gen3.ts's prompt byte for byte once the persona line is put back
//   gen            write SKILL3P (3 Sonnet drafts of the drawn types, Haiku picks)
//   judge <opus|sonnet>   judge.ts prompt word for word, PLAIN, BLADER_S, SKILL3, SKILL3P, HUMAN together, seed <id>:<judge>:P
//   analyze        means, paired differences with bootstrap 95% intervals, the pass rule, punctuation shares, cost
// WORK is the folder outside git with posts-fresh.json, types.json, bd/comments.json and drafts3/ (F1's drafts).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { replyPrompt, replyPick } from '../../skills/community-humanizer/lib/prompts.mjs'
import { block } from '../../skills/community-humanizer/lib/claude.mjs'

const D = import.meta.dir
const WORK = process.env.WORK ?? join(process.env.HOME!, '.trina/know-raw/reddit-voice-test')
const posts = JSON.parse(readFileSync(join(WORK, 'posts-fresh.json'), 'utf8')) as any[]
const ARMS = ['PLAIN', 'BLADER_S', 'SKILL3', 'SKILL3P', 'HUMAN']
const OLD = 'SKILL3', NEW = 'SKILL3P', COMP = 'BLADER_S'
const OUT = 'judged-P'
const [cmd, judge] = process.argv.slice(2)
mkdirSync(join(WORK, 'empty'), { recursive: true })
const file = (p: any, arm: string) => join(D, 'outputs', `${p.id}__${arm}.txt`)

// ---- gen3.ts, word for word: pool, type rates, seeded draw, examples
const types: Record<string, string> = JSON.parse(readFileSync(join(WORK, 'types.json'), 'utf8'))
const raw = JSON.parse(readFileSync(join(WORK, 'bd/comments.json'), 'utf8')) as any[]
const subOf = (c: any) => c.input.url.match(/\/r\/([^/]+)\//)[1]
const idOf = (c: any) => c.input.url.match(/\/comments\/([^/]+)/)[1]
const testIds = new Set(posts.map((p) => p.id))
const pool = raw.filter((c) => types[c.comment_id] && !testIds.has(idOf(c)) && c.num_upvotes >= 2)
const DEF: Record<string, string> = {
  'answer': 'an answer with a bit of explanation or advice',
  'one-liner': 'a very short answer: a name, a tool, a link or a few words',

  'disagree': 'pushing back on the post or its premise',
  'question-back': 'mainly a question back to the poster',
  'side-point': 'something related that the post did not ask about',
  'agree': 'agreeing, "same here", with little more',
  'joke': 'a joke, sarcasm or a quip',
  'complaint': 'venting about the thing the post is about',
}
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32) }
function drawTypes(p: any, k: number): string[] {
  const rate = new Map<string, number>()
  for (const c of pool) if (subOf(c) === p.sub && DEF[types[c.comment_id]!]) rate.set(types[c.comment_id]!, (rate.get(types[c.comment_id]!) ?? 0) + 1)
  const r = rng(p.id), out: string[] = []
  while (out.length < k && rate.size) {
    const total = [...rate.values()].reduce((a, b) => a + b, 0)
    let x = r() * total
    for (const [t, n] of rate) { x -= n; if (x <= 0) { out.push(t); rate.delete(t); break } }
  }
  return out
}
const examples = (sub: string, type: string) => pool.filter((c) => subOf(c) === sub && types[c.comment_id] === type).sort((a, b) => b.num_upvotes - a.num_upvotes).slice(0, 6).map((c) => String(c.comment).slice(0, 400))
// gen3.ts's own prompts, kept only for the check
const OLD_PERSONA_END = 'No greeting, no wrap-up, no list of tips, and you often skip the final period.'
const NEW_PERSONA_END = 'No greeting, no wrap-up, no list of tips. Punctuate and break lines the way the real comments below do.'
const persona3 = (sub: string) => `You're a regular in r/${sub}, replying in between other things. You don't try hard and you're not trying to convince anyone. Most replies here are short, often a few words or a sentence or two, so say the one thing you'd actually say, typed the way you'd type it. You don't know everything and don't pretend to; skip anything you'd have to look up. Never make up personal stories, past jobs, things that happened to you or numbers you didn't get from the post. Dry and a bit funny when it fits. Being blunt or disagreeing is fine. No greeting, no wrap-up, no list of tips, and you often skip the final period.`
const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
const draft3 = (p: any, t: string) => `${post(p)}\n\nWrite a reply to this Reddit post.\n\n${persona3(p.sub)}\n\nWrite it as ${DEF[t]}.\n\nReal comments of that kind from other r/${p.sub} threads, to match how people here write it (don't copy their content):\n${examples(p.sub, t).map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}\n\nReply with the comment text only.`
const pick3 = (p: any, drafts: string[]) => `${post(p)}\n\nHere are ${drafts.length} replies. Which one reads most like a real r/${p.sub} commenter wrote it, not an AI? Answer with the number only.\n\n${drafts.map((d, i) => `[${i + 1}] ${d}`).join('\n\n')}`
// the prompts the skill sends now
const draftP = (p: any, t: string) => replyPrompt('en', p, t, examples(p.sub, t), undefined, block, undefined) as string
const pickP = (p: any, drafts: string[]) => replyPick('en', p, drafts, block) as string

async function claude(model: string, text: string, stage: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text()
    await r.exited
    clearTimeout(timer)
    try {
      const j = JSON.parse(o)
      appendFileSync(join(WORK, 'costs-p.jsonl'), JSON.stringify({ stage, model, cost: j.total_cost_usd ?? null, models: Object.keys(j.modelUsage ?? {}), stop: j.stop_reason ?? null, ok: !j.is_error && !!j.result }) + '\n')
      if (!j.is_error && j.result) return String(j.result).trim()
    } catch {}
  }
  throw new Error(`claude ${model} failed (${stage})`)
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}

if (cmd === 'check') {
  let bad = 0, persona = 0
  for (const p of posts) {
    const kinds = drawTypes(p, 3)
    const d3 = JSON.parse(readFileSync(join(WORK, 'drafts3', `${p.id}.json`), 'utf8'))
    if (JSON.stringify(kinds) !== JSON.stringify(d3.kinds)) { bad++; console.log(`type draw differs ${p.id}: ${kinds} vs ${d3.kinds}`) }
    if (readFileSync(file(p, OLD), 'utf8') !== d3.drafts[d3.pick]) { bad++; console.log(`SKILL3 is not the picked draft: ${p.id}`) }
    if (readFileSync(file(p, OLD), 'utf8') !== readFileSync(join(WORK, 'replies', `${p.id}__${OLD}.txt`), 'utf8')) { bad++; console.log(`outputs/ and WORK/replies differ: ${p.id}`) }
    for (const a of ['PLAIN', COMP]) if (readFileSync(file(p, a), 'utf8') !== readFileSync(join(WORK, 'replies', `${p.id}__${a}.txt`), 'utf8')) { bad++; console.log(`outputs/ and WORK/replies differ: ${p.id} ${a}`) }
    for (const t of kinds) {
      const now = draftP(p, t)
      if (now.includes(NEW_PERSONA_END)) persona++
      if (now.replace(NEW_PERSONA_END, OLD_PERSONA_END) !== draft3(p, t)) { bad++; console.log(`draft prompt differs beyond the persona line: ${p.id} ${t}`) }
    }
    if (pickP(p, d3.drafts) !== pick3(p, d3.drafts)) { bad++; console.log(`pick prompt differs: ${p.id}`) }
  }
  console.log(`check: ${posts.length} threads, ${bad} problems; ${persona} of ${posts.length * 3} draft prompts carry the new persona line`)
}

if (cmd === 'gen') {
  mkdirSync(join(WORK, 'drafts3p'), { recursive: true })
  const todo = posts.filter((p) => !existsSync(file(p, NEW)))
  await pooled(todo, 4, async (p) => {
    const kinds = drawTypes(p, 3)
    const drafts = await Promise.all(kinds.map((t) => { const pr = draftP(p, t); if (!pr.includes(NEW_PERSONA_END)) throw new Error('prompts.mjs does not carry the new line'); return claude('sonnet', pr, 'gen-draft') }))
    const pick = await claude('haiku', pickP(p, drafts), 'gen-pick')
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    writeFileSync(join(WORK, 'drafts3p', `${p.id}.json`), JSON.stringify({ kinds, drafts, pick: k, pickRaw: pick }, null, 1))
    writeFileSync(file(p, NEW), drafts[k]!)
  })
  console.log(`gen: ${todo.length} jobs, ${posts.filter((p) => existsSync(file(p, NEW))).length}/${posts.length} written`)
}

// ---- judge.ts, word for word (prompt, labels, seeded shuffle, parsing)
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
  const dir = join(D, OUT, judge), rawDir = join(D, `${OUT}-raw`, judge)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  const missing = posts.filter((p) => ARMS.some((a) => a !== 'HUMAN' && !existsSync(file(p, a))))
  if (missing.length) throw new Error(`missing outputs for ${missing.map((p) => p.id).join(', ')}`)
  const todo = posts.filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, 6, async (p) => {
    const ord = order(`${p.id}:${judge}:P`)
    for (let attempt = 1; attempt <= 2; attempt++) {
      let text = ''
      try {
        text = await claude(judge, prompt(p, ord), `judge-${judge}`)
        const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(rawDir, `${p.id}.txt`), text)
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, sub: p.sub, order: ord, human, rank }, null, 1))
        return
      } catch { writeFileSync(join(rawDir, `${p.id}.fail${attempt}.txt`), text) }
    }
    console.log(`failed ${p.id}`)
  })
  console.log(`${judge}: ${todo.length} jobs, ${readdirSync(dir).length}/${posts.length} judged`)
}

// ---- punctuation measures (PROTOCOL.md, Round P), the same in both languages
const SP = '.?!…。？！'
const endsPunct = (t: string) => new RegExp(`[${SP}]$`).test(t.trim().replace(/["'”’)\]]+$/, ''))
const anyPunct = (t: string) => new RegExp(`[${SP}](?=\\s|$|["'”’)\\]])`).test(t.trim())
const lineBreak = (t: string) => /\n/.test(t.trim())

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
  const PAIRS = [[NEW, COMP], [NEW, OLD], [OLD, COMP], [NEW, 'HUMAN'], [OLD, 'HUMAN']]
  const judges = ['opus', 'sonnet'].filter((j) => existsSync(join(D, OUT, j)))
  const rows: Record<string, any[]> = {}
  for (const j of judges) rows[j] = readdirSync(join(D, OUT, j)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(D, OUT, j, f), 'utf8')))
  const means: Record<string, Record<string, number>> = {}
  const ruleAB: Record<string, { a: boolean; b: boolean }> = {}
  for (const j of judges) {
    const rs = rows[j]!
    means[j] = Object.fromEntries(ARMS.map((a) => [a, mean(rs.map((r) => r.human[a]))]))
    console.log(`\n## ${j} (n=${rs.length} threads)\narm          human%  pass%  upvote-rank  more-human-than-HUMAN (ties)`)
    for (const a of ARMS) console.log(`${a.padEnd(11)} ${f1(means[j]![a]!).padStart(7)} ${f1(100 * mean(rs.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rs.map((r) => r.rank[a]))).padStart(8)}      ${a === 'HUMAN' ? '' : `${rs.filter((r) => r.human[a] > r.human.HUMAN).length}/${rs.length} (${rs.filter((r) => r.human[a] === r.human.HUMAN).length})`}`)
    for (const [x, y] of PAIRS) console.log(`${x} - ${y}: human ${ci(rs.map((r) => r.human[x] - r.human[y]))}, upvote rank better by ${f1(mean(rs.map((r) => r.rank[y] - r.rank[x])))}`)
    const dc = rs.map((r) => r.human[NEW] - r.human[COMP])
    ruleAB[j] = { a: mean(dc) > 0 && boot(dc)[0] > 0, b: means[j]![NEW]! - means[j]![OLD]! >= -3 }
  }
  if (judges.length === 2) {
    console.log(`\n## mean of the two judges\n${ARMS.map((a) => `${a} ${f1(mean(judges.map((j) => means[j]![a]!)))}`).join(', ')}`)
    const both = (x: string, y: string) => rows.opus!.map((r) => r.id).filter((id) => rows.sonnet!.some((r) => r.id === id)).map((id) => mean(judges.map((j) => { const r = rows[j]!.find((r) => r.id === id); return r.human[x] - r.human[y] })))
    for (const [x, y] of PAIRS) console.log(`${x} - ${y} (two-judge mean per thread): ${ci(both(x, y))}`)
  }

  const text = (p: any, a: string) => (a === 'HUMAN' ? String(p.human.body) : readFileSync(file(p, a), 'utf8'))
  const share = (a: string, f: (t: string) => boolean) => 100 * mean(posts.map((p) => (f(text(p, a)) ? 1 : 0)))
  const MEASURES: [string, (t: string) => boolean][] = [['ends with . ? !', endsPunct], ['any sentence punctuation', anyPunct], ['line break', lineBreak]]
  console.log(`\n## punctuation (share of the ${posts.length} replies, %)\nmeasure                     ${OLD.padStart(8)} ${NEW.padStart(8)}    HUMAN   new closer to HUMAN?`)
  let closer = 0
  for (const [name, f] of MEASURES) {
    const o = share(OLD, f), n = share(NEW, f), h = share('HUMAN', f)
    const c = Math.abs(n - h) < Math.abs(o - h)
    if (c) closer++
    console.log(`${name.padEnd(27)} ${f1(o).padStart(8)} ${f1(n).padStart(8)} ${f1(h).padStart(8)}   ${c ? 'yes' : 'no'}`)
  }
  for (const a of ['PLAIN', COMP]) console.log(`(${a}: ${MEASURES.map(([name, f]) => `${name} ${f1(share(a, f))}`).join(', ')})`)
  console.log(`\n## length (median)\n${ARMS.map((a) => { const t = posts.map((p) => text(p, a)); const med = (v: number[]) => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]! }; return `${a} ${med(t.map((x) => x.split(/\s+/).filter(Boolean).length))} words / ${med(t.map((x) => x.length))} chars` }).join(', ')}`)
  if (existsSync(join(WORK, 'drafts3p'))) {
    const same = posts.filter((p) => { const a = JSON.parse(readFileSync(join(WORK, 'drafts3', `${p.id}.json`), 'utf8')), b = JSON.parse(readFileSync(join(WORK, 'drafts3p', `${p.id}.json`), 'utf8')); return a.kinds[a.pick] === b.kinds[b.pick] }).length
    console.log(`picked comment type same as SKILL3's: ${same}/${posts.length}`)
  }

  if (judges.length === 2) {
    const pass = judges.every((j) => ruleAB[j]!.a && ruleAB[j]!.b) && closer >= 2
    console.log(`\nRULE: (a) ${NEW} beats ${COMP}, interval above zero: ${judges.map((j) => `${j} ${ruleAB[j]!.a ? 'yes' : 'no'}`).join(', ')}; (b) ${NEW} - ${OLD} >= -3: ${judges.map((j) => `${j} ${ruleAB[j]!.b ? 'yes' : 'no'} (${sg(means[j]![NEW]! - means[j]![OLD]!)})`).join(', ')}; (c) closer to HUMAN on ${closer} of ${MEASURES.length} measures. ${pass ? 'PASS: adopt the line' : 'FAIL: revert the line'}`)
  }

  if (existsSync(join(WORK, 'costs-p.jsonl'))) {
    const c = readFileSync(join(WORK, 'costs-p.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const by = new Map<string, { n: number; cost: number; models: Set<string> }>()
    for (const x of c) { const e = by.get(x.stage) ?? { n: 0, cost: 0, models: new Set<string>() }; e.n++; e.cost += x.cost ?? 0; for (const m of x.models) e.models.add(m); by.set(x.stage, e) }
    console.log(`\n## cost: $${c.reduce((s, x) => s + (x.cost ?? 0), 0).toFixed(2)} over ${c.length} calls (${c.filter((x) => !x.ok).length} not ok)`)
    for (const [s, e] of by) console.log(`${s}: ${e.n} calls, $${e.cost.toFixed(2)}, models ${[...e.models].join(' + ')}`)
  }
}
