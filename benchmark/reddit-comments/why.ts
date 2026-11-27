// Diagnostic (dev set): Opus sees the real comment and the SKILL3 reply in random order and says which is AI and why.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const out: any[] = []
let i = 0
await Promise.all(Array.from({ length: 5 }, async () => { while (i < posts.length) {
  const p = posts[i++]!
  const ai = readFileSync(join(D, 'replies', `${p.id}__SKILL3.txt`), 'utf8'), human = String(p.human.body)
  const flip = p.id.charCodeAt(p.id.length - 1) % 2 === 0
  const [a, b] = flip ? [ai, human] : [human, ai]
  const text = `A post from r/${p.sub} and two replies. One was written by a real commenter, one by an AI. Which one is the AI, and what exactly gave it away? Answer in this form: "AI: A" or "AI: B", then one or two sentences on the tells.\n\nTitle: ${p.title}\n\n${p.body}\n\n--- Reply A ---\n${a}\n\n--- Reply B ---\n${b}`
  const r = Bun.spawn(['claude', '-p', text, '--model', 'opus', '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
  const o = await new Response(r.stdout).text(); await r.exited
  try { const res = String(JSON.parse(o).result); out.push({ id: p.id, sub: p.sub, correct: res.includes(`AI: ${flip ? 'A' : 'B'}`), why: res }) } catch { out.push({ id: p.id, error: true }) }
} }))
writeFileSync(join(D, 'why.json'), JSON.stringify(out, null, 1))
console.log(`correct ${out.filter((x) => x.correct).length}/${out.length}`)
for (const x of out) console.log(`- ${x.correct ? 'caught' : 'FOOLED'} r/${x.sub}: ${String(x.why).replace(/\s+/g, ' ').slice(0, 260)}`)
