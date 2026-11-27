// Writer-model test (PROTOCOL.md): the Sonnet-written and Opus-written versions of the same skill, judged together with
// the humanizer arm and the real text. Usage: bun writer-judge.ts <encomments|kocomments|posts> judge <codex|opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [set, cmd, judgeName] = process.argv.slice(2)
const K = join(import.meta.dir, '..')
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민|특검|대법|판사|김민석|투표|기소|장관|의원/
const CFG: Record<string, { D: string; file: string; arms: string[]; sonnet: string; opus: string }> = {
  encomments: { D: join(K, 'reddit-voice-test'), file: 'posts-fresh.json', arms: ['BLADER_S', 'SKILL3', 'SKILL3_OPUS', 'HUMAN'], sonnet: 'SKILL3', opus: 'SKILL3_OPUS' },
  kocomments: { D: join(K, 'korean-voice-test'), file: 'posts.json', arms: ['IMNOTAI_S', 'SKILL', 'SKILL_OPUS', 'HUMAN'], sonnet: 'SKILL', opus: 'SKILL_OPUS' },
  posts: { D: join(K, 'post-voice-test', 'holdout'), file: 'posts.json', arms: ['HUMANIZER_S', 'MESSY', 'MESSY_OPUS', 'HUMAN'], sonnet: 'MESSY', opus: 'MESSY_OPUS' },
}
const c = CFG[set!]!
const posts = (JSON.parse(readFileSync(join(c.D, c.file), 'utf8')) as any[]).filter((p) => !(set === 'posts' && p.lang === 'ko' && (POL.test(p.title) || POL.test(p.body))))
const lang = (p: any) => (set === 'encomments' ? 'en' : set === 'kocomments' ? 'ko' : p.lang)
const text = (p: any, a: string) => (a === 'HUMAN' ? String(set === 'posts' ? p.body : p.human.body) : readFileSync(join(c.D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
async function claude(model: string, t: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', t, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(c.D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text(); await r.exited; clearTimeout(timer)
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function codex(t: string, out: string): Promise<string> { const r = Bun.spawn(['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', out, t], { cwd: join(c.D, 'empty'), stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }); await r.exited; return readFileSync(out, 'utf8') }
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const L = 'ABCD'
function order(seed: string) { let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); const a = [...c.arms]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
function ask(p: any, ord: string[]) {
  const vs = ord.map((arm, i) => `--- ${lang(p) === 'en' ? (set === 'posts' ? 'Version' : 'Reply') : set === 'posts' ? '본문' : '댓글'} ${L[i]} ---\n${text(p, arm)}`).join('\n\n')
  if (set === 'posts') return lang(p) === 'en'
    ? `Below is a post title from ${p.place} and 4 versions of the post body, labelled A-D. Some were written by people, some by an AI.\n\nFor each version, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\nTitle: ${p.title}\n\n${vs}`
    : `아래는 ${p.place} 게시판 글 제목과 본문 4개(A~D)야. 어떤 본문은 사람이 썼고, 어떤 건 AI가 썼어.\n\n본문마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n제목: ${p.title}\n\n${vs}`
  return lang(p) === 'en'
    ? `Below is a post from r/${p.sub} and 4 replies to it, labelled A-D. Some replies were written by people who really commented in this thread, some were written by an AI.\n\nFor each reply, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\nPost in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}\n\n${vs}`
    : `아래는 클리앙 ${p.boardName} 게시판 글과 댓글 4개(A~D)야. 어떤 댓글은 이 글에 실제로 사람들이 단 것이고, 어떤 건 AI가 쓴 거야.\n\n댓글마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}\n\n${vs}`
}
if (cmd === 'judge') {
  const dir = join(c.D, 'judged-W', judgeName!), raw = join(c.D, 'judged-W-raw', judgeName!); mkdirSync(dir, { recursive: true }); mkdirSync(raw, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judgeName === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:W`)
    for (let a = 0; a < 2; a++) { try { const res = judgeName === 'codex' ? await codex(ask(p, ord), join(raw, `${p.id}.txt`)) : await claude(judgeName!, ask(p, ord)); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, lang: lang(p), human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const lg of set === 'posts' ? ['en', 'ko'] : [set === 'encomments' ? 'en' : 'ko']) for (const j of readdirSync(join(c.D, 'judged-W'))) {
    const rows = readdirSync(join(c.D, 'judged-W', j)).map((f) => JSON.parse(readFileSync(join(c.D, 'judged-W', j, f), 'utf8'))).filter((r) => r.lang === lg)
    if (!rows.length) continue
    const d = rows.map((r) => r.human[c.opus] - r.human[c.sonnet]); const [lo, hi] = boot(d)
    console.log(`${set} ${lg} ${j} (n=${rows.length}): ${c.arms.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')} | Opus-written minus Sonnet-written ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`)
  }
}
