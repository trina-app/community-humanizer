// Post round 4 (development set): MESSY2 = MESSY + no added reasons or motives + a short length (the community's 25th
// percentile); PICK3 = three MESSY2 drafts with different samples, Haiku picks. Judged with MESSY and HUMAN.
// Usage: bun post4.ts gen | judge <opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const gists: Record<string, string> = JSON.parse(readFileSync(join(D, 'gists.json'), 'utf8'))
const titles = new Set(posts.map((p) => p.title.trim()))
const corpus = (JSON.parse(readFileSync(join(D, 'corpus.json'), 'utf8')) as any[]).filter((c) => !titles.has(String(c.title).trim()))
async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text(); await r.exited; clearTimeout(timer)
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const block = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')
const pool = (p: any) => corpus.filter((c) => c.lang === p.lang && c.group === p.group).slice(0, 40).sort((a, b) => (a.title < b.title ? -1 : 1))
const head = (p: any) => (p.lang === 'en' ? `Title: ${p.title}\nNotes:\n${gists[p.id]}` : `제목: ${p.title}\n메모:\n${gists[p.id]}`)
const short = (p: any) => { const v = corpus.filter((c) => c.lang === p.lang && c.group === p.group).map((c) => (p.lang === 'en' ? c.body.split(/\s+/).filter(Boolean).length : c.body.length)).sort((a, b) => a - b); return v[Math.floor(v.length * 0.25)] }
const MESSY2 = (p: any) => (p.lang === 'en'
  ? `You're a regular in ${p.place} typing a post of your own on your phone, fast, between other things, and you won't reread it. Start with whatever is on your mind first, not with a neat setup, and let the order be the order it comes to you; it's fine to circle back to something. Leave a thought half-finished if that's how it comes out, and don't make every point the same size. Use only what's in the notes: never add facts, numbers, reasons, motives or backstory that aren't there, and you can leave out a note if it doesn't come up. Keep it short, about ${short(p)} words. No headings or bold unless the real posts below use them, no summary at the end.`
  : `너는 ${p.place} 게시판 단골이고, 다른 일 하다가 폰으로 네 글을 빨리 치는 중이야. 다시 읽지 않고 올려. 깔끔한 도입 말고 지금 머릿속에 먼저 있는 얘기부터 시작하고, 생각나는 순서대로 써. 앞에서 한 얘기로 다시 돌아가도 돼. 말하다 만 것 같은 문장이 있어도 그대로 두고, 얘기마다 길이를 맞추지 마. 메모에 있는 것만 써. 메모에 없는 사실, 숫자, 이유, 동기, 사연은 절대 보태지 말고, 안 떠오르는 메모는 빼도 돼. 짧게, ${short(p)}자 정도로 써. 아래 실제 글들이 쓰지 않으면 제목, 굵게, 목록은 쓰지 마. 끝에 정리는 붙이지 마.`)
const prompt = (p: any, sp: any[]) => `${p.lang === 'en' ? `Write a post for ${p.place}.` : `${p.place} 게시판에 올릴 글을 써.`}\n\n${head(p)}\n\n${MESSY2(p)}\n\n${p.lang === 'en' ? `Here are real posts from ${p.place}. Match how people here write posts; don't copy their content:` : `${p.place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식만 맞추고 내용은 베끼지 마:`}\n${block(sp.map((c) => c.body.slice(0, 900)))}\n\n${p.lang === 'en' ? 'Reply with the post body only.' : '본문만 답해.'}`
if (cmd === 'gen') {
  mkdirSync(join(D, 'drafts4'), { recursive: true })
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(D, 'replies', `${p.id}__${arm}.txt`)
    const all = pool(p)
    if (!existsSync(f('MESSY2'))) jobs.push(async () => writeFileSync(f('MESSY2'), await claude('sonnet', prompt(p, all.slice(0, 6)))))
    if (!existsSync(f('PICK3'))) jobs.push(async () => {
      const drafts = await Promise.all([6, 12, 18].map((k) => claude('sonnet', prompt(p, all.slice(k, k + 6).length >= 3 ? all.slice(k, k + 6) : all.slice(0, 6)))))
      const q = p.lang === 'en' ? `Title: ${p.title}\n\nHere are ${drafts.length} versions of this post. Which one reads most like a real ${p.place} user wrote it, not an AI? Answer with the number only.` : `제목: ${p.title}\n\n이 글의 본문 ${drafts.length}개가 있어. 실제 ${p.place} 사용자가 쓴 것 같은, AI가 쓰지 않은 것 같은 걸 하나 골라. 번호만 답해.`
      const k = Math.min(3, Math.max(1, parseInt((await claude('haiku', `${q}\n\n${block(drafts)}`)).match(/\d+/)?.[0] ?? '1'))) - 1
      writeFileSync(join(D, 'drafts4', `${p.id}.json`), JSON.stringify({ drafts, pick: k }, null, 1))
      writeFileSync(f('PICK3'), drafts[k]!)
    })
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs`)
}
const ARMS = ['MESSY', 'MESSY2', 'PICK3', 'HUMAN'], L = 'ABCD'
const text = (p: any, a: string) => (a === 'HUMAN' ? p.body : readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged4', judgeName!); mkdirSync(dir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:r4`)
    const body = ord.map((arm, i) => `--- ${p.lang === 'en' ? 'Version' : '본문'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
    const ask = p.lang === 'en'
      ? `Below is a post title from ${p.place} and ${ord.length} versions of the post body, labelled A-D. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\nTitle: ${p.title}\n\n${body}`
      : `아래는 ${p.place} 게시판 글 제목과 본문 ${ord.length}개(A~D)야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n제목: ${p.title}\n\n${body}`
    for (let a = 0; a < 2; a++) { try { const res = await claude(judgeName!, ask); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: p.lang, human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged4'))) {
    const rows = readdirSync(join(D, 'judged4', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged4', j, f), 'utf8'))).filter((r) => r.lang === lang)
    console.log(`\n${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
    for (const a of ['MESSY2', 'PICK3']) { const d = rows.map((r) => r.human[a] - r.human.MESSY); const [lo, hi] = boot(d); console.log(`  ${a} - MESSY: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
  }
  const len = (lang: string, a: string) => { const v = posts.filter((p) => p.lang === lang).map((p) => (lang === 'en' ? text(p, a).split(/\s+/).filter(Boolean).length : text(p, a).length)).sort((x, y) => x - y); return v[Math.floor(v.length / 2)] }
  for (const lang of ['en', 'ko']) console.log(`${lang} length median: ${ARMS.map((a) => `${a} ${len(lang, a)}`).join(', ')}`)
}
