// Korean test (PROTOCOL.md). Usage:
//   bun ko.ts classify            label comments of the non-test, non-political threads by type
//   bun ko.ts gen                 write PLAIN, IMNOTAI_S and SKILL replies
//   bun ko.ts judge <codex|opus|sonnet>
//   bun ko.ts analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const cands = JSON.parse(readFileSync(join(D, 'cands.json'), 'utf8')) as any[]
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const BOARD: Record<string, string> = { park: '모두의공원', kin: '아무거나질문' }
const testIds = new Set(posts.map((p) => p.id))
mkdirSync(join(D, 'replies'), { recursive: true })

// comments of the other non-political threads, per board: samples and type rates
type C = { board: string; thread: string; likes: number; body: string; type?: string }
const pool: C[] = []
for (const f of readdirSync(join(D, 'raw'))) {
  const [board, id] = f.replace('.json', '').split('-') as [string, string]
  const title = cands.find((c) => c.board === board && c.id === id)?.title ?? ''
  if (testIds.has(id) || POL.test(title)) continue
  const p = JSON.parse(readFileSync(join(D, 'raw', f), 'utf8'))
  for (const c of p.comments) if (!c.reply && !c.op && c.body.length >= 2 && c.likes >= 1 && !POL.test(c.body)) pool.push({ board, thread: id, likes: c.likes, body: c.body })
}
const TYPES_FILE = join(D, 'types.json')
const types: Record<string, string> = existsSync(TYPES_FILE) ? JSON.parse(readFileSync(TYPES_FILE, 'utf8')) : {}
const key = (c: C) => `${c.thread}:${c.body.slice(0, 40)}`
for (const c of pool) c.type = types[key(c)]

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

if (cmd === 'classify') {
  const LABEL = `Each numbered item is a top-level comment on a Korean community post. Label each with exactly one type:
- answer: answers the post with an explanation, advice or steps (more than about 20 words)
- one-liner: a very short answer, a tool or product name, a link, or a few words that answers the post
- anecdote: mostly tells the commenter's own experience or story
- disagree: pushes back on the post or its premise, corrects it
- question-back: mainly asks the poster a question
- side-point: about something related but not the post's main question
- agree: agrees or adds "same here" without much more
- joke: humour, sarcasm, a quip
- thanks: thanks or praise
- complaint: venting or a rant
Reply with JSON only, mapping item number to type: {"1":"answer","2":"joke"}`
  const todo = pool.filter((c) => !c.type)
  const batches: C[][] = []
  for (let i = 0; i < todo.length; i += 40) batches.push(todo.slice(i, i + 40))
  await pooled(batches, 5, async (b) => {
    const res = await claude('sonnet', `${LABEL}\n\n${b.map((c, k) => `[${k + 1}] ${c.body.slice(0, 300).replace(/\s+/g, ' ')}`).join('\n')}`)
    const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
    b.forEach((c, k) => { if (j[String(k + 1)]) types[key(c)] = j[String(k + 1)] })
  })
  writeFileSync(TYPES_FILE, JSON.stringify(types, null, 1))
  for (const b of ['park', 'kin']) {
    const mine = pool.filter((c) => c.board === b && types[key(c)])
    const count: Record<string, number> = {}
    for (const c of mine) count[types[key(c)]!] = (count[types[key(c)]!] ?? 0) + 1
    console.log(`${b} (n=${mine.length}): ${Object.entries(count).sort((x, y) => y[1] - x[1]).map(([t, n]) => `${t} ${Math.round((100 * n) / mine.length)}%`).join(', ')}`)
  }
}

// prompts: the Korean version of skill v1
const DEF: Record<string, string> = {
  'answer': '설명이나 조언이 조금 들어간 답',
  'one-liner': '아주 짧은 답(이름, 제품, 링크, 몇 단어)',
  'disagree': '글이나 글의 전제에 반대하는 말',
  'question-back': '글쓴이에게 되묻는 말',
  'side-point': '글이 묻지 않은, 관련된 다른 얘기',
  'agree': '동의하거나 "저도요" 정도의 말',
  'joke': '농담, 비꼬기, 한마디 드립',
  'complaint': '그 주제에 대한 불평',
}
const persona = (b: string) => `너는 클리앙 ${BOARD[b]} 게시판 단골이고, 다른 일 하다가 잠깐 댓글을 다는 중이야. 애써서 쓰지 않고, 누굴 설득하려고 하지도 않아. 여기 댓글은 대부분 짧아. 몇 단어나 한두 문장이니까, 실제로 할 말 하나만 평소 치는 대로 써. 다 아는 척하지 말고, 찾아봐야 아는 건 쓰지 마. 네가 겪은 일, 다녔던 회사, 너한테 있었던 일, 글에 없는 숫자는 절대 지어내지 마. 어울리면 건조하게 조금 웃겨도 돼. 퉁명스럽거나 반대 의견이어도 괜찮아. 인사, 마무리 정리, 팁 목록은 쓰지 마. 마침표는 자주 안 찍어.`
const post = (p: any) => `클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}`.trim()
const samples = (b: string) => { const seen = new Map<string, number>(); return pool.filter((c) => c.board === b).sort((x, y) => y.likes - x.likes).filter((c) => { const n = seen.get(c.thread) ?? 0; seen.set(c.thread, n + 1); return n < 2 }).slice(0, 10).map((c) => c.body.slice(0, 500)) }
const typed = (b: string, t: string) => pool.filter((c) => c.board === b && c.type === t).sort((x, y) => y.likes - x.likes).slice(0, 6).map((c) => c.body.slice(0, 400))
function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32) }
function drawTypes(p: any, k: number) {
  const rate = new Map<string, number>()
  for (const c of pool) if (c.board === p.board && c.type && DEF[c.type] && typed(p.board, c.type).length >= 2) rate.set(c.type, (rate.get(c.type) ?? 0) + 1)
  const r = rng(p.id), out: string[] = []
  while (out.length < k && rate.size) { let x = r() * [...rate.values()].reduce((a, b) => a + b, 0); for (const [t, n] of rate) { x -= n; if (x <= 0) { out.push(t); rate.delete(t); break } } }
  return out
}
const ONLY = '댓글 내용만 답해.'

if (cmd === 'gen') {
  const IMNOTAI = readFileSync(join(D, 'imnotai-SKILL.md'), 'utf8')
  const block = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')
  mkdirSync(join(D, 'drafts'), { recursive: true })
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(D, 'replies', `${p.id}__${arm}.txt`)
    if (!existsSync(f('PLAIN'))) jobs.push(async () => writeFileSync(f('PLAIN'), await claude('sonnet', `${post(p)}\n\n이 클리앙 ${p.boardName} 글에 댓글을 써 줘. ${ONLY}`)))
    if (!existsSync(f('IMNOTAI_S'))) jobs.push(async () => writeFileSync(f('IMNOTAI_S'), await claude('sonnet', `${post(p)}\n\n이 클리앙 ${p.boardName} 글에 댓글을 써 줘. AI가 쓴 티 안 나게, 그 게시판 사람이 쓴 것처럼 써 줘. 이 글쓰기 스킬을 따라:\n\n<skill>\n${IMNOTAI}\n</skill>\n\n같은 게시판 다른 글에 달린 실제 인기 댓글이야. 여기 사람들이 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:\n${block(samples(p.board))}\n\n${ONLY}`)))
    if (!existsSync(f(process.env.SKILL_ARM ?? 'SKILL'))) jobs.push(async () => {
      const kinds = drawTypes(p, 3)
      const drafts = await Promise.all(kinds.map((t) => claude(process.env.WRITER ?? 'sonnet', `${post(p)}\n\n이 글에 댓글을 써.\n\n${persona(p.board)}\n\n${DEF[t]}(으)로 써.\n\n같은 게시판 다른 글에 달린 실제 댓글 중 이런 종류인 것들이야. 여기 사람들이 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:\n${block(typed(p.board, t))}\n\n${ONLY}`)))
      const pick = await claude('haiku', `${post(p)}\n\n댓글 ${drafts.length}개가 있어. 실제 클리앙 ${p.boardName} 사용자가 쓴 것 같은, AI가 쓰지 않은 것 같은 댓글 하나를 골라. 번호만 답해.\n\n${block(drafts)}`)
      const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
      writeFileSync(join(D, process.env.SKILL_ARM ? 'drafts-opus' : 'drafts', `${p.id}.json`), JSON.stringify({ kinds, drafts, pick: k }, null, 1))
      writeFileSync(f(process.env.SKILL_ARM ?? 'SKILL'), drafts[k]!)
    })
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs`)
}

const ARMS = ['PLAIN', 'IMNOTAI_S', 'SKILL', 'HUMAN']
const L = 'ABCD'
const reply = (p: any, arm: string) => (arm === 'HUMAN' ? String(p.human.body) : readFileSync(join(D, 'replies', `${p.id}__${arm}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }

if (cmd === 'judge') {
  const dir = join(D, 'judged', judgeName!), rawDir = join(D, 'judged-raw', judgeName!)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judgeName === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}`)
    const text = `아래는 클리앙 ${p.boardName} 게시판 글과 댓글 ${ord.length}개(${L.slice(0, ord.length).split('').join(', ')})야. 어떤 댓글은 이 글에 실제로 사람들이 단 것이고, 어떤 건 AI가 쓴 거야.\n\n댓글마다 사람이 썼을 확률(0~100)을 매겨. 그다음 이 게시판의 평범한 사용자로서 공감을 누를 순서대로 전부 순위를 매겨(가장 먼저 누를 것부터).\n\nJSON만 답해: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\n${post(p)}\n\n${ord.map((arm, i) => `--- 댓글 ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
    for (let a = 0; a < 2; a++) {
      try {
        const res = judgeName === 'codex' ? await codex(text, join(rawDir, `${p.id}.txt`)) : await claude(judgeName!, text)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, board: p.board, order: ord, human, rank }, null, 1))
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
  for (const judge of readdirSync(join(D, 'judged'))) {
    const rows = readdirSync(join(D, 'judged', judge)).map((f) => JSON.parse(readFileSync(join(D, 'judged', judge, f), 'utf8')))
    console.log(`\n## ${judge} (n=${rows.length})\narm        human%  pass%  upvote-rank`)
    for (const a of ARMS) console.log(`${a.padEnd(10)} ${f1(mean(rows.map((r) => r.human[a]))).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`)
    for (const [x, y] of [['SKILL', 'IMNOTAI_S'], ['SKILL', 'HUMAN'], ['IMNOTAI_S', 'PLAIN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); console.log(`${x} - ${y}: human ${f1(mean(d))} [${f1(lo)}, ${f1(hi)}]`) }
    console.log(`judged more human than the real comment: ${ARMS.slice(0, 3).map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}`)
  }
  const chars = (a: string) => posts.map((p) => reply(p, a).length).sort((x, y) => x - y)
  console.log(`\nlength (chars, median): ${ARMS.map((a) => `${a} ${chars(a)[Math.floor(posts.length / 2)]}`).join(', ')}`)
}
