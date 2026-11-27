// Holdout judging (PROTOCOL.md, "Holdout confirmation"): PLAIN, HUMANIZER_S, SKILL, MESSY, HUMAN per post, shuffled per judge.
// Usage: DATA=holdout bun holdout-judge.ts judge <opus|sonnet|codex> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const D = process.env.DATA ? join(import.meta.dir, process.env.DATA) : import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text(); await r.exited; clearTimeout(timer)
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function codex(text: string, out: string): Promise<string> {
  const r = Bun.spawn(['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', out, text], { cwd: join(D, 'empty'), stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' })
  await r.exited
  return readFileSync(out, 'utf8')
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'MESSY', 'HUMAN'], L = 'ABCDE'
const text = (p: any, a: string) => (a === 'HUMAN' ? p.body : readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged', judgeName!), raw = join(D, 'judged-raw', judgeName!); mkdirSync(dir, { recursive: true }); mkdirSync(raw, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judgeName === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:holdout`)
    const body = ord.map((arm, i) => `--- ${p.lang === 'en' ? 'Version' : '본문'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
    const ask = p.lang === 'en'
      ? `Below is a post title from ${p.place} and ${ord.length} versions of the post body, labelled A-E. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\nTitle: ${p.title}\n\n${body}`
      : `아래는 ${p.place} 게시판 글 제목과 본문 ${ord.length}개(A~E)야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n제목: ${p.title}\n\n${body}`
    for (let a = 0; a < 2; a++) { try { const res = judgeName === 'codex' ? await codex(ask, join(raw, `${p.id}.txt`)) : await claude(judgeName!, ask); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: p.lang, human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged'))) {
    const rows = readdirSync(join(D, 'judged', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged', j, f), 'utf8'))).filter((r) => r.lang === lang)
    if (!rows.length) continue
    console.log(`\n${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
    for (const [x, y] of [['MESSY', 'HUMANIZER_S'], ['MESSY', 'SKILL'], ['MESSY', 'HUMAN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); console.log(`  ${x} - ${y}: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
    console.log(`  judged more human than the real post: MESSY ${rows.filter((r) => r.human.MESSY > r.human.HUMAN).length}/${rows.length}`)
  }
}
