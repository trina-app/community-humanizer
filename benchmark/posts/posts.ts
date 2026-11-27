// Post-writing test (PROTOCOL.md). Generators get the title and short notes (the point), never the real post.
// Usage: bun posts.ts gist | gen | judge <codex|opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = process.env.DATA ?? import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const GIST = join(D, 'gists.json')
const gists: Record<string, string> = existsSync(GIST) ? JSON.parse(readFileSync(GIST, 'utf8')) : {}
const BLADER = readFileSync(join(import.meta.dir, '..', 'reddit-voice-test', 'blader-SKILL.md'), 'utf8')
const IMNOTAI = readFileSync(join(import.meta.dir, '..', 'korean-voice-test', 'imnotai-SKILL.md'), 'utf8')

async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 2; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const o = await new Response(r.stdout).text(); await r.exited
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
const block = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')

if (cmd === 'gist') {
  await pooled(posts.filter((p) => !gists[p.id]), 5, async (p) => {
    const ask = p.lang === 'en'
      ? `Here is a post from ${p.place}.\n\nTitle: ${p.title}\n\n${p.body}\n\nWrite the notes the poster would have had before writing it: what is going on and what they want to know, in 2-4 short lines. Keep the concrete facts (numbers, products, places). Don't copy its sentences. Reply with the notes only.`
      : `${p.place} 게시판 글이야.\n\n제목: ${p.title}\n\n${p.body}\n\n글쓴이가 이 글을 쓰기 전에 가지고 있었을 메모를 써 줘. 무슨 일인지와 뭘 알고 싶은지를 짧은 줄 2~4개로. 숫자, 제품, 장소 같은 구체적인 사실은 남기고, 글의 문장은 베끼지 마. 메모만 답해.`
    gists[p.id] = await claude('sonnet', ask)
  })
  writeFileSync(GIST, JSON.stringify(gists, null, 1))
  console.log(`gists ${Object.keys(gists).length}`)
}

const head = (p: any) => (p.lang === 'en' ? `Title: ${p.title}\nNotes:\n${gists[p.id]}` : `제목: ${p.title}\n메모:\n${gists[p.id]}`)
const persona = (p: any) => (p.lang === 'en'
  ? `You're a regular in ${p.place} writing a post of your own, in between other things. You don't polish it and you're not writing an article. Say what's going on and what you want to know, roughly in the order you'd type it, using only what's in the notes. Never add facts, numbers, places or backstory that aren't in the notes. Don't explain more than a person in your spot would. No headings, bold or lists unless the real posts below use them. No summary or moral at the end.`
  : `너는 ${p.place} 게시판 단골이고, 다른 일 하다가 네 글을 하나 올리는 중이야. 다듬지 않고, 기사처럼 쓰지도 않아. 무슨 일인지와 뭘 묻고 싶은지를 평소 치는 순서대로, 메모에 있는 것만으로 써. 메모에 없는 사실, 숫자, 장소, 사연은 절대 보태지 마. 네 입장의 사람이 설명할 만큼만 설명해. 아래 실제 글들이 쓰지 않으면 제목, 굵게, 목록은 쓰지 마. 끝에 요약이나 교훈은 붙이지 마.`)
const samplesText = (p: any, xs: string[]) => (p.lang === 'en'
  ? `Here are real posts from ${p.place}. Match how people here write posts (length, tone, how they open and end); don't copy their content:\n${block(xs)}`
  : `${p.place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:\n${block(xs)}`)
const ONLY = (p: any) => (p.lang === 'en' ? 'Reply with the post body only.' : '본문만 답해.')

if (cmd === 'gen') {
  mkdirSync(join(D, 'drafts'), { recursive: true })
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(D, 'replies', `${p.id}__${arm}.txt`)
    const plain = p.lang === 'en' ? `Write a post for ${p.place} from these notes.\n\n${head(p)}` : `이 메모로 ${p.place} 게시판에 올릴 글 본문을 써 줘.\n\n${head(p)}`
    if (!existsSync(f('PLAIN'))) jobs.push(async () => writeFileSync(f('PLAIN'), await claude('sonnet', `${plain}\n\n${ONLY(p)}`)))
    if (!existsSync(f('HUMANIZER_S'))) jobs.push(async () => writeFileSync(f('HUMANIZER_S'), await claude('sonnet', p.lang === 'en'
      ? `${plain}\n\nMake it sound like a real person in ${p.place} wrote it, not an AI. Use this writing skill:\n\n<skill>\n${BLADER}\n</skill>\n\n${samplesText(p, p.samples.slice(0, 5))}\n\n${ONLY(p)}`
      : `${plain}\n\nAI가 쓴 티 안 나게, 그 게시판 사람이 쓴 것처럼 써 줘. 이 글쓰기 스킬을 따라:\n\n<skill>\n${IMNOTAI}\n</skill>\n\n${samplesText(p, p.samples.slice(0, 5))}\n\n${ONLY(p)}`)))
    if (!existsSync(f('SKILL'))) jobs.push(async () => {
      // three drafts, each shown a different set of five real posts; Haiku picks one
      const sets = [0, 1, 2].map((k) => [...p.samples.slice(k * 2), ...p.samples.slice(0, k * 2)].slice(0, 5))
      const ask = p.lang === 'en' ? `Write a post for ${p.place}.\n\n${head(p)}` : `${p.place} 게시판에 올릴 글을 써.\n\n${head(p)}`
      const drafts = await Promise.all(sets.map((s) => claude('sonnet', `${ask}\n\n${persona(p)}\n\n${samplesText(p, s)}\n\n${ONLY(p)}`)))
      const q = p.lang === 'en' ? `Title: ${p.title}\n\nHere are ${drafts.length} versions of this post. Which one reads most like a real ${p.place} user wrote it, not an AI? Answer with the number only.` : `제목: ${p.title}\n\n이 글의 본문 ${drafts.length}개가 있어. 실제 ${p.place} 사용자가 쓴 것 같은, AI가 쓰지 않은 것 같은 걸 하나 골라. 번호만 답해.`
      const pick = await claude('haiku', `${q}\n\n${block(drafts)}`)
      const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
      writeFileSync(join(D, 'drafts', `${p.id}.json`), JSON.stringify({ drafts, pick: k }, null, 1))
      writeFileSync(f('SKILL'), drafts[k]!)
    })
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs`)
}

const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'HUMAN']
const L = 'ABCD'
const text = (p: any, arm: string) => (arm === 'HUMAN' ? p.body : readFileSync(join(D, 'replies', `${p.id}__${arm}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }

if (cmd === 'judge') {
  const dir = join(D, 'judged', judgeName!), rawDir = join(D, 'judged-raw', judgeName!)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judgeName === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}`)
    const body = ord.map((arm, i) => `--- ${p.lang === 'en' ? 'Version' : '본문'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
    const ask = p.lang === 'en'
      ? `Below is a post title from ${p.place} and ${ord.length} versions of the post body, labelled A-D. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it. Then rank all versions by which you would upvote as a regular reader of ${p.place}, best first.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\nTitle: ${p.title}\n\n${body}`
      : `아래는 ${p.place} 게시판 글 제목과 본문 ${ord.length}개(A~D)야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨. 그다음 이 게시판의 평범한 사용자로서 공감을 누를 순서대로 전부 순위를 매겨(가장 먼저 누를 것부터).\n\nJSON만 답해: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\n제목: ${p.title}\n\n${body}`
    for (let a = 0; a < 2; a++) {
      try {
        const res = judgeName === 'codex' ? await codex(ask, join(rawDir, `${p.id}.txt`)) : await claude(judgeName!, ask)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: p.lang, order: ord, human, rank }, null, 1))
        return
      } catch {}
    }
    console.log(`failed ${p.id}`)
  })
}

if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const f1 = (x: number) => x.toFixed(1)
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const lang of ['en', 'ko']) for (const judge of readdirSync(join(D, 'judged'))) {
    const rows = readdirSync(join(D, 'judged', judge)).map((f) => JSON.parse(readFileSync(join(D, 'judged', judge, f), 'utf8'))).filter((r) => r.lang === lang)
    if (!rows.length) continue
    console.log(`\n## ${lang} ${judge} (n=${rows.length})\narm          human%  pass%  upvote-rank`)
    for (const a of ARMS) console.log(`${a.padEnd(12)} ${f1(mean(rows.map((r) => r.human[a]))).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`)
    for (const [x, y] of [['SKILL', 'HUMANIZER_S'], ['SKILL', 'HUMAN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); console.log(`${x} - ${y}: ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
    console.log(`judged more human than the real post: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}`)
  }
  for (const lang of ['en', 'ko']) {
    const ps = posts.filter((p) => p.lang === lang)
    const med = (a: string) => { const xs = ps.map((p) => (lang === 'en' ? text(p, a).split(/\s+/).filter(Boolean).length : text(p, a).length)).sort((x, y) => x - y); return xs[Math.floor(xs.length / 2)] }
    console.log(`\n${lang} length (${lang === 'en' ? 'words' : 'chars'}, median): ${ARMS.map((a) => `${a} ${med(a)}`).join(', ')}`)
  }
}
