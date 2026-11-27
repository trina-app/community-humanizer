// Post round 2 (development set): STATS (measured shape of real posts in the prompt), DOC (continue the last post on a
// board page of real posts), HAIKU (round-1 SKILL prompt written by Haiku, one draft). Judged with SKILL and HUMAN.
// Samples come from corpus.json (tuning corpus; held-out posts excluded) minus the test posts themselves.
// Usage: bun post2.ts gen | judge <opus|sonnet> | analyze
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const gists: Record<string, string> = JSON.parse(readFileSync(join(D, 'gists.json'), 'utf8'))
const titles = new Set(posts.map((p) => p.title.trim()))
const corpus = (JSON.parse(readFileSync(join(D, 'corpus.json'), 'utf8')) as any[]).filter((c) => !titles.has(String(c.title).trim()))

async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 2; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const o = await new Response(r.stdout).text(); await r.exited
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } })) }
const block = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')

// measured shape of real posts per community (corpus.json)
function shape(lang: string, group: string): string {
  const ps = corpus.filter((c) => c.lang === lang && c.group === group).map((c) => String(c.body))
  const pct = (f: (t: string) => boolean) => Math.round((100 * ps.filter(f).length) / ps.length)
  const med = (f: (t: string) => number) => { const s = ps.map(f).sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  if (lang === 'en') return `How posts in r/${group} actually look (measured on ${ps.length} real posts): median ${med((t) => t.split(/\s+/).filter(Boolean).length)} words in ${med((t) => t.split(/\n\s*\n/).filter((s) => s.trim()).length)} short paragraphs; ${pct((t) => /^I\b/.test(t.trim()))}% start with "I"; ${pct((t) => /^(hey|hi|hello)\b/i.test(t.trim()))}% open with a greeting; ${pct((t) => /^\s*([-*•]|\d+[.)])\s/m.test(t))}% have a list; ${pct((t) => /\*\*|^#+\s/m.test(t))}% use bold or a heading; ${pct((t) => /(^|[.!?]\s+)[a-z]/.test(t))}% have a sentence starting in lower case; ${pct((t) => /\.\.(?!\.)/.test(t))}% use ".."; ${pct((t) => /\?\s*$/.test(t.trim()))}% end on a question; ${pct((t) => /(thanks|thank you|appreciate)[^\n]{0,40}$/i.test(t.trim()))}% end with thanks.`
  const lines = (t: string) => t.split('\n').filter((s) => s.trim()).length
  return `이 게시판 실제 글 ${ps.length}개를 재 본 모양이야: 본문은 보통 ${med((t) => t.length)}자, ${med(lines)}줄이고 한 줄은 ${med((t) => Math.round(t.length / Math.max(1, lines(t))))}자 정도로 짧게 끊어 써. ".."이나 "…"을 쓰는 글 ${pct((t) => /\.\.(?!\.)|…/.test(t))}%, "~다/~음/~듯/~네" 같은 반말 투로 끝나는 글 ${pct((t) => /(다|음|함|임|듯|네|지)[.?!~]*\s*$/.test(t.trim()))}%, "안녕하세요"로 시작하는 글 ${pct((t) => /^안녕/.test(t.trim()))}%, 끝에 감사 인사 ${pct((t) => /(감사|고맙)[^\n]{0,20}$/.test(t.trim()))}%, ㅠㅠ ${pct((t) => /[ㅠㅜ]{2}/.test(t))}%, ㅎㅎ·ㅋㅋ ${pct((t) => /[ㅎㅋ]{2}/.test(t))}%, 물음표로 끝나는 글 ${pct((t) => /\?\s*$/.test(t.trim()))}%.`
}
const samplePosts = (p: any, n: number) => corpus.filter((c) => c.lang === p.lang && c.group === p.group).slice(0, 40).sort((a, b) => (a.title < b.title ? -1 : 1)).slice(0, n)
const head = (p: any) => (p.lang === 'en' ? `Title: ${p.title}\nNotes:\n${gists[p.id]}` : `제목: ${p.title}\n메모:\n${gists[p.id]}`)
const persona = (p: any) => (p.lang === 'en'
  ? `You're a regular in ${p.place} writing a post of your own, in between other things. You don't polish it and you're not writing an article. Say what's going on and what you want to know, roughly in the order you'd type it, using only what's in the notes. Never add facts, numbers, places or backstory that aren't in the notes. Don't explain more than a person in your spot would. No headings, bold or lists unless the real posts below use them. No summary or moral at the end.`
  : `너는 ${p.place} 게시판 단골이고, 다른 일 하다가 네 글을 하나 올리는 중이야. 다듬지 않고, 기사처럼 쓰지도 않아. 무슨 일인지와 뭘 묻고 싶은지를 평소 치는 순서대로, 메모에 있는 것만으로 써. 메모에 없는 사실, 숫자, 장소, 사연은 절대 보태지 마. 네 입장의 사람이 설명할 만큼만 설명해. 아래 실제 글들이 쓰지 않으면 제목, 굵게, 목록은 쓰지 마. 끝에 요약이나 교훈은 붙이지 마.`)
const ONLY = (p: any) => (p.lang === 'en' ? 'Reply with the post body only.' : '본문만 답해.')

if (cmd === 'gen') {
  const jobs: (() => Promise<void>)[] = []
  for (const p of posts) {
    const f = (arm: string) => join(D, 'replies', `${p.id}__${arm}.txt`)
    const sp = samplePosts(p, 6)
    if (!existsSync(f('STATS'))) jobs.push(async () => writeFileSync(f('STATS'), await claude('sonnet', p.lang === 'en'
      ? `Write a post for ${p.place}.\n\n${head(p)}\n\n${persona(p)}\n\n${shape(p.lang, p.group)} Write it so it would sit in the middle of that: a typical post here, not every feature at once.\n\nHere are real posts from ${p.place}. Match how people here write posts; don't copy their content:\n${block(sp.map((c) => c.body.slice(0, 900)))}\n\n${ONLY(p)}`
      : `${p.place} 게시판에 올릴 글을 써.\n\n${head(p)}\n\n${persona(p)}\n\n${shape(p.lang, p.group)} 이 중간쯤에 들어갈 평범한 글로 써. 위 특징을 한꺼번에 다 넣지는 마.\n\n${p.place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식만 맞추고 내용은 베끼지 마:\n${block(sp.map((c) => c.body.slice(0, 900)))}\n\n${ONLY(p)}`)))
    if (!existsSync(f('DOC'))) jobs.push(async () => {
      const page = sp.map((c, i) => (p.lang === 'en' ? `[Post ${i + 1}]\nTitle: ${c.title}\n\n${c.body.slice(0, 900)}` : `[글 ${i + 1}]\n제목: ${c.title}\n\n${c.body.slice(0, 900)}`)).join('\n\n')
      writeFileSync(f('DOC'), await claude('sonnet', p.lang === 'en'
        ? `Below is a page of posts from ${p.place}. The last one has a title but no body yet. Write its body exactly as its author would have typed it, in the same way the other posts on this page are written. What the author wants to say (their notes; add nothing else):\n${gists[p.id]}\n\n${page}\n\n[Post ${sp.length + 1}]\nTitle: ${p.title}\n\n(${ONLY(p)})`
        : `아래는 ${p.place} 게시판에 올라온 글들이야. 마지막 글은 제목만 있고 본문이 없어. 그 글쓴이가 실제로 쳤을 그대로, 이 페이지의 다른 글들과 같은 방식으로 본문을 써. 글쓴이가 하려던 말(메모, 이것 말고는 보태지 마):\n${gists[p.id]}\n\n${page}\n\n[글 ${sp.length + 1}]\n제목: ${p.title}\n\n(${ONLY(p)})`))
    })
    if (!existsSync(f('HAIKU'))) jobs.push(async () => writeFileSync(f('HAIKU'), await claude('haiku', `${p.lang === 'en' ? `Write a post for ${p.place}.` : `${p.place} 게시판에 올릴 글을 써.`}\n\n${head(p)}\n\n${persona(p)}\n\n${p.lang === 'en' ? `Here are real posts from ${p.place}. Match how people here write posts (length, tone, how they open and end); don't copy their content:` : `${p.place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:`}\n${block(p.samples.slice(0, 5))}\n\n${ONLY(p)}`)))
  }
  await pooled(jobs, 5, (j) => j())
  console.log(`ran ${jobs.length} jobs`)
}

const ARMS = ['SKILL', 'STATS', 'DOC', 'HAIKU', 'HUMAN'], L = 'ABCDE'
const text = (p: any, a: string) => (a === 'HUMAN' ? p.body : readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
if (cmd === 'judge') {
  const dir = join(D, 'judged2', judgeName!); mkdirSync(dir, { recursive: true })
  await pooled(posts.filter((p) => !existsSync(join(dir, `${p.id}.json`))), 4, async (p) => {
    const ord = order(`${p.id}:${judgeName}:r2`)
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
  for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged2'))) {
    const rows = readdirSync(join(D, 'judged2', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged2', j, f), 'utf8'))).filter((r) => r.lang === lang)
    console.log(`\n${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
    for (const a of ['STATS', 'DOC', 'HAIKU']) { const d = rows.map((r) => r.human[a] - r.human.SKILL); const [lo, hi] = boot(d); console.log(`  ${a} - SKILL: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
  }
}
