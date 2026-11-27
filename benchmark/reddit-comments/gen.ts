// Writes one reply per post and arm (PROTOCOL.md + amendment): PLAIN, RULE, BLADER, BLADER_S, SKILL.
// Claude Sonnet, no tools, no skills, no MCP, no CLAUDE.md, from an empty folder. Usage: bun gen.ts [--jobs 6] [--only <id>]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, process.env.POSTS ?? 'posts.json'), 'utf8')) as any[]
const BLADER = readFileSync(join(D, 'blader-SKILL.md'), 'utf8')
mkdirSync(join(D, 'replies'), { recursive: true })
mkdirSync(join(D, 'empty'), { recursive: true })
const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined)

const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
const ask = (p: any) => `Write a reply to this Reddit post in r/${p.sub}.`
const rule = (p: any) => `Make it sound like a real person in r/${p.sub} wrote it, not an AI.`
const samples = (p: any) => `Here are real top comments from other recent threads in r/${p.sub}. Match how people here write (length, tone, how they open and end); don't copy their content:\n${p.samples.map((s: string, i: number) => `[${i + 1}] ${s}`).join('\n\n')}`
const END = 'Reply with the final comment text only.'

// The skill's voice rules: the general part of a 943-comment study of Reddit replies, nothing about one person.
const VOICE = `How replies on Reddit actually read (from 943 real comments):
- Length: usually 20-80 words, often one block. Median about 33 words. No bullet points, bold, headings or em dashes (fewer than 1% use them).
- The first sentence is the answer. Don't restate the question, greet, or praise other answers.
- One concrete thing from experience beats three general tips: what happened, where, a number, a tool name, a setting.
- Plain spoken words. Commas often join clauses. Contractions sometimes, not forced.
- End on the point or a dry line. No summary, no lesson, no "hope this helps", no "curious what others think". Ask a question only if you really need to know.
- Never: "Great question", "delve", "it's worth noting", "here's the thing", "in short", "game-changer"; announcing with a colon ("It comes down to two things:"); a dramatic one-line sentence on its own; "X, not Y" more than once; lists of three; paragraphs of equal length; ending with a moral.
- Don't fake it: no deliberate typos or all-lowercase.`

const ARMS: Record<string, (p: any) => string> = {
  PLAIN: (p) => `${post(p)}\n\n${ask(p)} ${END}`,
  RULE: (p) => `${post(p)}\n\n${ask(p)} ${rule(p)} ${END}`,
  BLADER: (p) => `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${BLADER}\n</skill>\n\n${END}`,
  BLADER_S: (p) => `${post(p)}\n\n${ask(p)} ${rule(p)} Use this writing skill:\n\n<skill>\n${BLADER}\n</skill>\n\n${samples(p)}\n\n${END}`,
  SKILL: (p) => `${post(p)}\n\n${ask(p)}\n\n${VOICE}\n\n${samples(p)}\n\nWrite the reply, then check it against the "Never" list and fix anything that matches. ${END}`,
}

const jobs: (() => Promise<void>)[] = []
for (const p of posts.filter((p) => !arg('--only') || p.id === arg('--only'))) for (const [arm, prompt] of Object.entries(ARMS).filter(([a]) => !process.env.GEN_ARMS || process.env.GEN_ARMS.split(',').includes(a))) {
  const f = join(D, 'replies', `${p.id}__${arm}.txt`)
  if (existsSync(f)) continue
  jobs.push(async () => {
    const r = Bun.spawn(['claude', '-p', prompt(p), '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const text = await new Response(r.stdout).text()
    await r.exited
    try { const j = JSON.parse(text); if (j.is_error || !j.result) throw 0; writeFileSync(f, String(j.result).trim()) } catch { console.log(`failed ${p.id} ${arm}: ${text.slice(0, 120)}`) }
  })
}
const n = Number(arg('--jobs') || 6)
let i = 0
await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) await jobs[i++]!() }))
console.log(`ran ${jobs.length} jobs`)
