// Isolated model calls, the same flags as skills/community-humanizer/lib/claude.mjs and ../reddit-comments/judge.ts
// (no tools, skills, MCP, CLAUDE.md or project settings, from an empty folder). Each Claude call's cost goes to DATA/cost.jsonl.
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const DATA = process.env.DATA ?? join(homedir(), '.trina/know-raw/chinese-voice-test')
const EMPTY = join(DATA, 'empty')
mkdirSync(EMPTY, { recursive: true })

async function once(model: string, prompt: string, tag: string): Promise<{ text: string; raw: string }> {
  const r = Bun.spawn(['claude', '-p', prompt, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: EMPTY, stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
  const timer = setTimeout(() => r.kill(), 300_000)
  const out = await new Response(r.stdout).text()
  await r.exited
  clearTimeout(timer)
  const j = JSON.parse(out)
  appendFileSync(join(DATA, 'cost.jsonl'), JSON.stringify({ tag, model, usd: j.total_cost_usd ?? null, at: new Date().toISOString() }) + '\n')
  if (j.is_error || !j.result) throw new Error('claude call failed')
  return { text: String(j.result).trim(), raw: out }
}

export async function claude(model: string, prompt: string, tag = ''): Promise<string> {
  let last: unknown
  for (let a = 0; a < 3; a++) { try { return (await once(model, prompt, tag)).text } catch (e) { last = e } }
  throw last
}

// codex writes its last message to a file
export async function codex(prompt: string, outFile: string): Promise<string> {
  const r = Bun.spawn(['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', outFile, prompt], { cwd: EMPTY, stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' })
  const timer = setTimeout(() => r.kill(), 600_000)
  await r.exited
  clearTimeout(timer)
  if (!existsSync(outFile)) throw new Error('codex wrote nothing')
  return readFileSync(outFile, 'utf8')
}

export async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}

export function totalCost() {
  const f = join(DATA, 'cost.jsonl')
  if (!existsSync(f)) return 0
  return readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).reduce((s, l) => s + (JSON.parse(l).usd ?? 0), 0)
}
