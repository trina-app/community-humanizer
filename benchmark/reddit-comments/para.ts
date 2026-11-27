// F2 swap test: Sonnet rewrites the real top comment in its own words, keeping the same points and about the same length.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, process.env.POSTS ?? 'posts.json'), 'utf8')) as any[]
let i = 0
await Promise.all(Array.from({ length: 5 }, async () => { while (i < posts.length) {
  const p = posts[i++]!, f = join(D, 'replies', `${p.id}__PARA.txt`)
  if (existsSync(f)) continue
  const text = `Here is a comment someone left on a post in r/${p.sub}.\n\nPost title: ${p.title}\n\nComment:\n${p.human.body}\n\nRewrite this comment in your own words as a reply to the same post. Keep every point it makes and about the same length. Reply with the rewritten comment only.`
  const r = Bun.spawn(['claude', '-p', text, '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
  const o = await new Response(r.stdout).text(); await r.exited
  try { writeFileSync(f, String(JSON.parse(o).result).trim()) } catch { console.log(`failed ${p.id}`) }
} }))
