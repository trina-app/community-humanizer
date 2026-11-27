// Extra held-out arms for the launch review: REWRITE (plain reply rewritten by the humanizer skill) and PERSONA (persona
// only). Usage: bun gfix.ts <en|ko> gen | judge <codex|opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [lang, cmd, judgeName] = process.argv.slice(2)
const D = lang === 'en' ? join(import.meta.dir) : join(import.meta.dir, '..', 'korean-voice-test')
const posts = JSON.parse(readFileSync(join(D, lang === 'en' ? 'posts-fresh.json' : 'posts.json'), 'utf8')) as any[]
const SKILLDOC = readFileSync(lang === 'en' ? join(D, 'blader-SKILL.md') : join(D, 'imnotai-SKILL.md'), 'utf8')
async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text(); await r.exited; clearTimeout(timer)
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function codex(text: string, out: string): Promise<string> { const r = Bun.spawn(['codex', 'exec', '--skip-git-repo-check', '-s', 'read-only', '--ephemeral', '-o', out, text], { cwd: join(D, 'empty'), stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' }); await r.exited; return readFileSync(out, 'utf8') }
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const personaEn = (sub: string) => `You're a regular in r/${sub}, replying in between other things. You don't try hard and you're not trying to convince anyone. Most replies here are short, often a few words or a sentence or two, so say the one thing you'd actually say, typed the way you'd type it. You don't know everything and don't pretend to; skip anything you'd have to look up. Never make up personal stories, past jobs, things that happened to you or numbers you didn't get from the post. Dry and a bit funny when it fits. Being blunt or disagreeing is fine. No greeting, no wrap-up, no list of tips, and you often skip the final period.`
const personaKo = (b: string) => `너는 클리앙 ${b} 게시판 단골이고, 다른 일 하다가 잠깐 댓글을 다는 중이야. 애써서 쓰지 않고, 누굴 설득하려고 하지도 않아. 여기 댓글은 대부분 짧아. 몇 단어나 한두 문장이니까, 실제로 할 말 하나만 평소 치는 대로 써. 다 아는 척하지 말고, 찾아봐야 아는 건 쓰지 마. 네가 겪은 일, 다녔던 회사, 너한테 있었던 일, 글에 없는 숫자는 절대 지어내지 마. 어울리면 건조하게 조금 웃겨도 돼. 퉁명스럽거나 반대 의견이어도 괜찮아. 인사, 마무리 정리, 팁 목록은 쓰지 마. 마침표는 자주 안 찍어.`
const head = (p: any) => (lang === 'en' ? `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim() : `클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}`.trim())
const COMP = lang === 'en' ? 'BLADER_S' : 'IMNOTAI_S', OURS = lang === 'en' ? 'SKILL3' : 'SKILL'
if (cmd === 'gen') {
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (a: string) => join(D, 'replies', `${p.id}__${a}.txt`)
    const plain = readFileSync(f('PLAIN'), 'utf8')
    if (!existsSync(f('REWRITE'))) jobs.push(async () => writeFileSync(f('REWRITE'), await claude('sonnet', lang === 'en'
      ? `Use this skill:\n\n<skill>\n${SKILLDOC}\n</skill>\n\nRewrite the reply below so it reads like a real person in r/${p.sub} wrote it, not an AI. Keep what it says. Reply with the rewritten reply only.\n\n${head(p)}\n\nReply:\n${plain}`
      : `이 스킬을 따라:\n\n<skill>\n${SKILLDOC}\n</skill>\n\n아래 댓글을 클리앙 ${p.boardName} 사용자가 쓴 것처럼, AI 티 안 나게 다시 써 줘. 내용은 그대로 둬. 다시 쓴 댓글만 답해.\n\n${head(p)}\n\n댓글:\n${plain}`)))
    if (!existsSync(f('PERSONA'))) jobs.push(async () => writeFileSync(f('PERSONA'), await claude('sonnet', lang === 'en'
      ? `${head(p)}\n\nWrite a reply to this Reddit post.\n\n${personaEn(p.sub)}\n\nReply with the comment text only.`
      : `${head(p)}\n\n이 글에 댓글을 써.\n\n${personaKo(p.boardName)}\n\n댓글 내용만 답해.`)))
  }
  await pooled(jobs, 5, (j) => j()); console.log(`ran ${jobs.length}`)
}
const ARMS = [COMP, 'REWRITE', 'PERSONA', OURS, 'HUMAN'], L = 'ABCDE'
const text = (p: any, a: string) => (a === 'HUMAN' ? String(p.human.body) : readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged-G', judgeName!), raw = join(D, 'judged-G-raw', judgeName!); mkdirSync(dir, { recursive: true }); mkdirSync(raw, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), judgeName === 'codex' ? 3 : 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:G`)
    const ask = lang === 'en'
      ? `Below is a post from r/${p.sub} and ${ord.length} replies to it, labelled A-E. Some replies were written by people who really commented in this thread, some were written by an AI.\n\nFor each reply, give the probability (0-100) that a human wrote it.\n\nAnswer with JSON only: {"human":{"A":0,"B":0,...}}\n\n${head(p)}\n\n${ord.map((arm, i) => `--- Reply ${L[i]} ---\n${text(p, arm)}`).join('\n\n')}`
      : `아래는 클리앙 ${p.boardName} 게시판 글과 댓글 ${ord.length}개(A~E)야. 어떤 댓글은 이 글에 실제로 사람들이 단 것이고, 어떤 건 AI가 쓴 거야.\n\n댓글마다 사람이 썼을 확률(0~100)을 매겨.\n\nJSON만 답해: {"human":{"A":0,"B":0,...}}\n\n${head(p)}\n\n${ord.map((arm, i) => `--- 댓글 ${L[i]} ---\n${text(p, arm)}`).join('\n\n')}`
    for (let a = 0; a < 2; a++) { try { const res = judgeName === 'codex' ? await codex(ask, join(raw, `${p.id}.txt`)) : await claude(judgeName!, ask); const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1)); const human: Record<string, number> = {}; ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]) }); if (Object.values(human).some((v) => !Number.isFinite(v))) throw 0; writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, human })); return } catch {} }
    console.log(`failed ${p.id}`)
  })
}
if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
  for (const j of readdirSync(join(D, 'judged-G'))) {
    const rows = readdirSync(join(D, 'judged-G', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged-G', j, f), 'utf8')))
    console.log(`${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
    for (const y of [COMP, 'REWRITE', 'PERSONA', 'HUMAN']) { const d = rows.map((r) => r.human[OURS] - r.human[y]); const [lo, hi] = boot(d); console.log(`  ${OURS} - ${y}: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
  }
}
