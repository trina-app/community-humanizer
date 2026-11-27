// Blind judging (PROTOCOL.md + amendment): per post, the 6 replies shuffled (a different order per judge), labelled
// A-F. Each judge gives a human probability per reply and an upvote ranking. Usage: bun judge.ts <opus|sonnet|codex> [--jobs 6]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const judge = process.argv[2]!
const posts = JSON.parse(readFileSync(join(D, process.env.POSTS ?? 'posts.json'), 'utf8')) as any[]
const ARMS = (process.env.ARMS ?? 'PLAIN,RULE,BLADER,BLADER_S,SKILL,HUMAN').split(',')
const OUT = process.env.OUT ?? 'judged'
const L = 'ABCDEFGH'
mkdirSync(join(D, OUT, judge), { recursive: true })

// seeded shuffle so a rerun gives the same order
function order(seed: string): string[] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const a = [...ARMS]
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] }
  return a
}
const reply = (p: any, arm: string) => arm === 'HUMAN' ? String(p.human.body) : readFileSync(join(D, 'replies', `${p.id}__${arm}.txt`), 'utf8')

function prompt(p: any, ord: string[]) {
  return `Below is a post from r/${p.sub} and ${ord.length} replies to it, labelled ${L.slice(0, ord.length).split('').join(', ')}. Some replies were written by people who really commented in this thread, some were written by an AI.

For each reply, give the probability (0-100) that a human wrote it. Then rank all replies by which you would upvote as a regular reader of r/${p.sub}, best first.

Answer with JSON only: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}

Post in r/${p.sub}:
Title: ${p.title}

${p.body}

${ord.map((arm, i) => `--- Reply ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
}

// codex writes its last message to a file; the raw answers go next to the output folder, not in it
const rawDir = join(D, `${OUT}-raw`)
mkdirSync(rawDir, { recursive: true })
function run(text: string, id: string): string[] {
  if (judge === 'codex') return ['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', join(rawDir, `${id}.txt`), text]
  return ['claude', '-p', text, '--model', judge, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project']
}

const jobs = posts.filter((p) => !existsSync(join(D, OUT, judge, `${p.id}.json`))).map((p) => async () => {
  const ord = order(`${p.id}:${judge}`)
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = Bun.spawn(run(prompt(p, ord), p.id), { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const out = await new Response(r.stdout).text()
    await r.exited
    try {
      const text = judge === 'codex' ? readFileSync(join(rawDir, `${p.id}.txt`), 'utf8') : String(JSON.parse(out).result)
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
      const human: Record<string, number> = {}, rank: Record<string, number> = {}
      ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
      if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
      writeFileSync(join(D, OUT, judge, `${p.id}.json`), JSON.stringify({ id: p.id, sub: p.sub, order: ord, human, rank }, null, 1))
      return
    } catch {}
  }
  console.log(`failed ${p.id}`)
})
const n = Number(process.argv.includes('--jobs') ? process.argv[process.argv.indexOf('--jobs') + 1] : 6)
let i = 0
await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) await jobs[i++]!() }))
console.log(`${judge}: judged ${jobs.length}`)
