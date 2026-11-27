// One isolated Claude Code call: no tools, skills, MCP servers, CLAUDE.md or project settings, run from an empty folder,
// so the user's own setup can't change what was measured. A call that hangs for 5 minutes is retried.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const EMPTY = join(tmpdir(), 'community-humanizer-empty')
mkdirSync(EMPTY, { recursive: true })

function once(model, prompt) {
  return new Promise((resolve, reject) => {
    const p = spawn('claude', ['-p', prompt, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: EMPTY, env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' }, stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const timer = setTimeout(() => p.kill(), 300_000)
    p.stdout.on('data', (d) => (out += d))
    p.on('error', (e) => { clearTimeout(timer); reject(e) })
    p.on('close', () => {
      clearTimeout(timer)
      try { const j = JSON.parse(out); if (j.is_error || !j.result) throw new Error(); resolve(String(j.result).trim()) } catch { reject(new Error('claude call failed')) }
    })
  })
}

export async function claude(model, prompt) {
  let last
  for (let a = 0; a < 3; a++) { try { return await once(model, prompt) } catch (e) { last = e } }
  throw last
}

export const block = (xs) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')

export function rng(seed) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32)
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
