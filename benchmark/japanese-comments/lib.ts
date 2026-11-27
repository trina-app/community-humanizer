// Shared helpers for the Japanese test (PROTOCOL.md): working folder, isolated model calls with cost logging,
// the Arctic Shift client and the Japanese check. Same as ../indonesian-comments/lib.ts except the language check,
// which counts scripts instead of words (Japanese has no spaces), and chars(), the length measure.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// real post and comment text lives here, outside git
export const WORK = process.env.WORK ?? join(process.env.HOME!, '.trina/know-raw/japanese-voice-test')
export const D = import.meta.dir
mkdirSync(join(WORK, 'empty'), { recursive: true })

// the same flags as skills/community-humanizer/lib/claude.mjs; the cost of every call is logged
export async function claude(model: string, text: string, stage: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text()
    await r.exited
    clearTimeout(timer)
    try {
      const j = JSON.parse(o)
      appendFileSync(join(WORK, 'costs.jsonl'), JSON.stringify({ stage, model, cost: j.total_cost_usd ?? null, models: Object.keys(j.modelUsage ?? {}), ok: !j.is_error }) + '\n')
      if (!j.is_error && j.result) return String(j.result).trim()
    } catch {}
  }
  throw new Error(`claude ${model} failed (${stage})`)
}

export async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}

// Arctic Shift: one request at a time, 2.5 s apart, longer waits after errors or throttling
const API = 'https://arctic-shift.photon-reddit.com/api'
export async function arctic(path: string): Promise<any[]> {
  for (let i = 0; i < 6; i++) {
    await Bun.sleep(2500)
    try {
      const r = await fetch(API + path, { signal: AbortSignal.timeout(60_000) })
      if (r.status === 429) { console.log(`throttled, waiting ${20 * (i + 1)} s`); await Bun.sleep(20_000 * (i + 1)); continue }
      const j = await r.json()
      if (Array.isArray(j?.data)) return j.data
    } catch {}
    await Bun.sleep(10_000 * (i + 1))
  }
  throw new Error(`Arctic Shift did not answer: ${path}`)
}

// Japanese check (PROTOCOL.md). Links, markdown link targets and HTML entities are removed first. Then, over the
// letters left (\p{L}): kana = hiragana + katakana characters, kanji = Han characters, other = every other letter
// (Latin, Hangul, ...). A text is Japanese when it has kana (3+ for a post, 1+ for a comment or a reply) and kana + kanji,
// counted three times each, are more than the other letters: one Japanese character carries about what three Latin
// letters do, and a plain majority of characters would reject ordinary Japanese tech comments such as
// "Pythonで書いたscriptをDocker composeで動かしてる" (11 Japanese characters, 25 Latin letters). Kana is what tells
// Japanese from Chinese; the weighted majority keeps out posts that are mainly English (or Korean) with a Japanese word.
const strip = (t: string) => t.replace(/https?:\/\/\S+/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/&[a-z]+;|&#\d+;/gi, ' ')
const n = (t: string, re: RegExp) => (t.match(re) ?? []).length
export function scripts(text: string) {
  const t = strip(text)
  return { kana: n(t, /[\p{Script=Hiragana}\p{Script=Katakana}]/gu), kanji: n(t, /\p{Script=Han}/gu), letters: n(t, /\p{L}/gu) }
}
const isJa = (text: string, minKana: number) => { const { kana, kanji, letters } = scripts(text); return kana >= minKana && 3 * (kana + kanji) > letters - kana - kanji }
export const japanesePost = (t: string) => isJa(t, 3)
export const japaneseComment = (t: string) => isJa(t, 1)

// length in characters (code points), since words cannot be counted without spaces
export const chars = (s: string) => [...s.trim()].length

export const readJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
