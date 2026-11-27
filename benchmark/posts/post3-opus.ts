// Post round 3 (development set): MESSY (written fast and not reread, in the order it comes), ROUGH (STATS output with
// slips added at the rates measured in slips.ts, no AI), MESSY_ROUGH (both). Judged with STATS and HUMAN.
// Usage: bun post3.ts gen | judge <opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = process.env.DATA ?? import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const gists: Record<string, string> = JSON.parse(readFileSync(join(D, 'gists.json'), 'utf8'))
const titles = new Set(posts.map((p) => p.title.trim()))
const corpus = (JSON.parse(readFileSync(join(import.meta.dir, 'corpus.json'), 'utf8')) as any[]).filter((c) => !titles.has(String(c.title).trim()))

async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000) // a call that hangs is retried
    const o = await new Response(r.stdout).text(); await r.exited; clearTimeout(timer)
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const block = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')
const samplePosts = (p: any, n: number) => corpus.filter((c) => c.lang === p.lang && c.group === p.group).slice(0, 40).sort((a, b) => (a.title < b.title ? -1 : 1)).slice(0, n)
const head = (p: any) => (p.lang === 'en' ? `Title: ${p.title}\nNotes:\n${gists[p.id]}` : `제목: ${p.title}\n메모:\n${gists[p.id]}`)

const MESSY = (p: any) => (p.lang === 'en'
  ? `You're a regular in ${p.place} typing a post of your own on your phone, fast, between other things, and you won't reread it. Start with whatever is on your mind first, not with a neat setup, and let the order be the order it comes to you; it's fine to circle back to something. Leave a thought half-finished if that's how it comes out, and don't make every point the same size. Use only what's in the notes; never add facts, numbers or backstory. No headings or bold unless the real posts below use them, no summary at the end.`
  : `너는 ${p.place} 게시판 단골이고, 다른 일 하다가 폰으로 네 글을 빨리 치는 중이야. 다시 읽지 않고 올려. 깔끔한 도입 말고 지금 머릿속에 먼저 있는 얘기부터 시작하고, 생각나는 순서대로 써. 앞에서 한 얘기로 다시 돌아가도 돼. 말하다 만 것 같은 문장이 있어도 그대로 두고, 얘기마다 길이를 맞추지 마. 메모에 있는 것만 쓰고, 없는 사실, 숫자, 사연은 절대 보태지 마. 아래 실제 글들이 쓰지 않으면 제목, 굵게, 목록은 쓰지 마. 끝에 정리는 붙이지 마.`)

// slips at the rates measured on real posts (slips.ts), decided per post with a seeded coin
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32) }
function rough(p: any, t: string): string {
  const r = rng(`${p.id}:rough`)
  if (p.lang === 'en') {
    if (r() < 0.16) { const ss = [...t.matchAll(/[.!?]\s+([A-Z])(?=[a-z])/g)]; const m = ss[Math.floor(r() * ss.length)]; if (m) t = t.slice(0, m.index! + m[0].length - 1) + m[1]!.toLowerCase() + t.slice(m.index! + m[0].length) }
    if (r() < 0.09) t = t.replace(/(^|\s)I(\s)/, '$1i$2')
    if (r() < 0.06) t = t.replace(/\b(don|can|didn|doesn|isn|won)'t\b|\bI'm\b|\bthat's\b|\bI've\b/, (w) => w.replace("'", ''))
    if (r() < 0.18) t = t.replace(/\.\s*$/, '')
    return t
  }
  const lines = t.split('\n')
  const dropDots = r() < 0.39
  return lines.map((l) => (dropDots && r() < 0.8 ? l.replace(/(?<=[가-힣a-zA-Z0-9)])\.\s*$/, '') : l)).join('\n').replace(/\.\s*$/, (m) => (r() < 0.15 ? '' : m))
}

if (cmd === 'gen') {
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(D, 'replies', `${p.id}__${arm}.txt`)
    const sp = samplePosts(p, 6)
    const ask = p.lang === 'en' ? `Write a post for ${p.place}.` : `${p.place} 게시판에 올릴 글을 써.`
    const samples = p.lang === 'en' ? `Here are real posts from ${p.place}. Match how people here write posts; don't copy their content:\n${block(sp.map((c) => c.body.slice(0, 900)))}` : `${p.place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식만 맞추고 내용은 베끼지 마:\n${block(sp.map((c) => c.body.slice(0, 900)))}`
    const only = p.lang === 'en' ? 'Reply with the post body only.' : '본문만 답해.'
    if (!existsSync(f('MESSY_OPUS'))) jobs.push(async () => writeFileSync(f('MESSY_OPUS'), await claude('opus', `${ask}\n\n${head(p)}\n\n${MESSY(p)}\n\n${samples}\n\n${only}`)))
  }
  await pooled(jobs, 5, (j) => j())
  if (!process.env.DATA) for (const p of posts) {
    writeFileSync(join(D, 'replies', `${p.id}__ROUGH.txt`), rough(p, readFileSync(join(D, 'replies', `${p.id}__STATS.txt`), 'utf8')))
    writeFileSync(join(D, 'replies', `${p.id}__MESSY_ROUGH.txt`), rough(p, readFileSync(join(D, 'replies', `${p.id}__MESSY.txt`), 'utf8')))
  }
  console.log(`ran ${jobs.length} jobs`)
}

const ARMS = ['STATS', 'MESSY', 'ROUGH', 'MESSY_ROUGH', 'HUMAN'], L = 'ABCDE'
const text = (p: any, a: string) => (a === 'HUMAN' ? p.body : readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged3', judgeName!); mkdirSync(dir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:r3`)
    const body = ord.map((arm, i) => `--- ${p.lang === 'en' ? 'Version' : '본문'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
    const ask = p.lang === 'en'
      ? `Below is a post title from ${p.place} and ${ord.length} versions of the post body, labelled ${L.slice(0, ord.length).split('').join(', ')}. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\nTitle: ${p.title}\n\n${body}`
      : `아래는 ${p.place} 게시판 글 제목과 본문 ${ord.length}개(${L.slice(0, ord.length).split('').join(', ')})야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n제목: ${p.title}\n\n${body}`
    for (let a = 0; a < 2; a++) { try { const res = await claude(judgeName!, ask); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: p.lang, human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged3'))) {
    const rows = readdirSync(join(D, 'judged3', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged3', j, f), 'utf8'))).filter((r) => r.lang === lang)
    console.log(`\n${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
    for (const a of ['MESSY', 'ROUGH', 'MESSY_ROUGH']) { const d = rows.map((r) => r.human[a] - r.human.STATS); const [lo, hi] = boot(d); console.log(`  ${a} - STATS: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
  }
}
