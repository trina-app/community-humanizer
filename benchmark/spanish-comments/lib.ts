// Shared helpers for the Spanish test (PROTOCOL.md): working folder, isolated model calls with cost logging,
// the Arctic Shift client and the Spanish check.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// real post and comment text lives here, outside git
export const WORK = process.env.WORK ?? join(process.env.HOME!, '.trina/know-raw/spanish-voice-test')
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

// Spanish check (PROTOCOL.md). Words used in both languages are in neither list.
const ES = new Set(('de la que el en los las del al por para con una uno unos unas un es son lo como más mas pero porque qué este esta esto ' +
  'eso esa ese estos estas muy sin sobre también hay donde dónde cuando cuándo yo tú tu mi mis te se su sus nos les le ya ni sí ' +
  'está están estoy estás ser estar tengo tiene tienen tenés hace hacer puede pueden puedo algo alguien nada todo todos toda mucho muchos ' +
  'cómo cual cuál y pues entonces aquí ahí acá así bien mejor gracias porqué quien quién cosa cosas año años vos usted ustedes ' +
  'pero aunque desde hasta entre otro otra otros cada mismo misma solo sólo siempre nunca ahora hoy después antes').split(/\s+/))
const EN = new Set(('the and is are was were of to it that this for you with on have be what how do does my but not they there would ' +
  'should can if or from at an about just like any your will been which their them we our because really think know').split(/\s+/))
export function lang(text: string) {
  const w = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)
  return { es: w.filter((x) => ES.has(x)).length, en: w.filter((x) => EN.has(x)).length }
}
export const spanishPost = (t: string) => { const { es, en } = lang(t); return es >= 3 && es > 2 * en }
export const spanishComment = (t: string) => { const { es, en } = lang(t); return es >= 1 && es > 2 * en }

export const readJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'))
