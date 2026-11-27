// Diagnostic: Sonnet rewrites the real post in its own words (same points, about the same length). Judged in a round
// without the real post: PLAIN, HUMANIZER_S, SKILL, PARA. Output judged-para/.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const [cmd, judge] = process.argv.slice(2)
async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 2; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const o = await new Response(r.stdout).text(); await r.exited
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
if (cmd === 'gen') await pooled(posts, 5, async (p) => {
  const f = join(D, 'replies', `${p.id}__PARA.txt`); if (existsSync(f)) return
  writeFileSync(f, await claude('sonnet', p.lang === 'en'
    ? `Here is a post from ${p.place}.\n\nTitle: ${p.title}\n\n${p.body}\n\nRewrite this post in your own words. Keep every point it makes and about the same length. Reply with the rewritten post body only.`
    : `${p.place} 게시판 글이야.\n\n제목: ${p.title}\n\n${p.body}\n\n이 글을 네 말로 다시 써 줘. 담긴 내용은 전부 그대로 두고 길이도 비슷하게. 다시 쓴 본문만 답해.`))
})
const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'PARA'], L = 'ABCD'
const text = (p: any, a: string) => readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8')
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged-para', judge!); mkdirSync(dir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), 4, async (p) => {
    const ord = order(`${p.id}:${judge}:para`)
    const body = ord.map((arm, i) => `--- ${p.lang === 'en' ? 'Version' : '본문'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
    const ask = p.lang === 'en'
      ? `Below is a post title from ${p.place} and ${ord.length} versions of the post body, labelled A-D. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it. Then rank all versions by which you would upvote as a regular reader of ${p.place}, best first.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\nTitle: ${p.title}\n\n${body}`
      : `아래는 ${p.place} 게시판 글 제목과 본문 ${ord.length}개(A~D)야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨. 그다음 이 게시판의 평범한 사용자로서 공감을 누를 순서대로 전부 순위를 매겨(가장 먼저 누를 것부터).\n\nJSON만 답해: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\n제목: ${p.title}\n\n${body}`
    for (let a = 0; a < 2; a++) { try { const res = await claude(judge!, ask); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: p.lang, human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged-para'))) {
  const rows = readdirSync(join(D, 'judged-para', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged-para', j, f), 'utf8'))).filter((r) => r.lang === lang)
  const m = (a: string) => (rows.reduce((s, r) => s + r.human[a], 0) / rows.length).toFixed(1)
  console.log(`${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${m(a)}`).join(', ')}`)
}
