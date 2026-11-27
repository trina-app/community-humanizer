// Round P (PROTOCOL.md): the punctuation line. SKILLP = the Korean SKILL arm (ko.ts gen on the 28 held-out threads) with
// only the persona's last sentence changed. Prompts are built by the skill itself (skills/community-humanizer/lib/prompts.mjs);
// pool, type rates, seeded draw, typed examples, Sonnet drafts and the Haiku pick are ko.ts's.
//   check          rebuild every draft and pick prompt: the type draw must equal drafts/<id>.json, SKILL must be the picked
//                  draft, and prompts.mjs must give ko.ts's prompt byte for byte once the persona line is put back
//   gen            write SKILLP (3 Sonnet drafts of the drawn types, Haiku picks)
//   judge <opus|sonnet>   ko.ts judge prompt word for word, PLAIN, IMNOTAI_S, SKILL, SKILLP, HUMAN together, seed <id>:<judge>:P
//   analyze        means, paired differences with bootstrap 95% intervals, the pass rule, punctuation shares, cost
// WORK is the folder outside git with posts.json, cands.json, raw/, types.json and drafts/ (the SKILL arm's drafts).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { replyPrompt, replyPick } from '../../skills/community-humanizer/lib/prompts.mjs'
import { block } from '../../skills/community-humanizer/lib/claude.mjs'

const D = import.meta.dir
const WORK = process.env.WORK ?? join(process.env.HOME!, '.trina/know-raw/korean-voice-test')
const [cmd, judgeName] = process.argv.slice(2)
const posts = JSON.parse(readFileSync(join(WORK, 'posts.json'), 'utf8')) as any[]
const cands = JSON.parse(readFileSync(join(WORK, 'cands.json'), 'utf8')) as any[]
const ARMS = ['PLAIN', 'IMNOTAI_S', 'SKILL', 'SKILLP', 'HUMAN']
const OLD = 'SKILL', NEW = 'SKILLP', COMP = 'IMNOTAI_S'
const OUT = 'judged-P'
mkdirSync(join(WORK, 'empty'), { recursive: true })
const file = (p: any, arm: string) => join(D, 'outputs', `${p.id}__${arm}.txt`)

// ---- ko.ts, word for word: pool, types, typed examples, seeded draw
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const BOARD: Record<string, string> = { park: '모두의공원', kin: '아무거나질문' }
const testIds = new Set(posts.map((p) => p.id))
type C = { board: string; thread: string; likes: number; body: string; type?: string }
const pool: C[] = []
for (const f of readdirSync(join(WORK, 'raw'))) {
  const [board, id] = f.replace('.json', '').split('-') as [string, string]
  const title = cands.find((c) => c.board === board && c.id === id)?.title ?? ''
  if (testIds.has(id) || POL.test(title)) continue
  const p = JSON.parse(readFileSync(join(WORK, 'raw', f), 'utf8'))
  for (const c of p.comments) if (!c.reply && !c.op && c.body.length >= 2 && c.likes >= 1 && !POL.test(c.body)) pool.push({ board, thread: id, likes: c.likes, body: c.body })
}
const types: Record<string, string> = JSON.parse(readFileSync(join(WORK, 'types.json'), 'utf8'))
const key = (c: C) => `${c.thread}:${c.body.slice(0, 40)}`
for (const c of pool) c.type = types[key(c)]
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
const blockKo = (xs: string[]) => xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')
// ko.ts's own prompts, kept only for the check
const OLD_PERSONA_END = '마침표는 자주 안 찍어.'
const NEW_PERSONA_END = '문장부호와 줄바꿈은 아래 실제 댓글들이 하는 대로 해.'
const draftKo = (p: any, t: string) => `${post(p)}\n\n이 글에 댓글을 써.\n\n${persona(p.board)}\n\n${DEF[t]}(으)로 써.\n\n같은 게시판 다른 글에 달린 실제 댓글 중 이런 종류인 것들이야. 여기 사람들이 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:\n${blockKo(typed(p.board, t))}\n\n${ONLY}`
const pickKo = (p: any, drafts: string[]) => `${post(p)}\n\n댓글 ${drafts.length}개가 있어. 실제 클리앙 ${p.boardName} 사용자가 쓴 것 같은, AI가 쓰지 않은 것 같은 댓글 하나를 골라. 번호만 답해.\n\n${blockKo(drafts)}`
// the prompts the skill sends now
const draftP = (p: any, t: string) => replyPrompt('ko', p, t, typed(p.board, t), undefined, block, undefined) as string
const pickP = (p: any, drafts: string[]) => replyPick('ko', p, drafts, block) as string

async function claude(model: string, text: string, stage: string): Promise<string> {
  for (let a = 0; a < 3; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(WORK, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const timer = setTimeout(() => r.kill(), 300_000)
    const o = await new Response(r.stdout).text()
    await r.exited
    clearTimeout(timer)
    try {
      const j = JSON.parse(o)
      appendFileSync(join(WORK, 'costs-p.jsonl'), JSON.stringify({ stage, model, cost: j.total_cost_usd ?? null, models: Object.keys(j.modelUsage ?? {}), stop: j.stop_reason ?? null, ok: !j.is_error && !!j.result }) + '\n')
      if (!j.is_error && j.result) return String(j.result).trim()
    } catch {}
  }
  throw new Error(`claude ${model} failed (${stage})`)
}
async function pooled<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]!; try { await fn(x) } catch (e) { console.log(String(e)) } } }))
}

if (cmd === 'check') {
  let bad = 0, persona = 0
  for (const p of posts) {
    if (p.boardName !== BOARD[p.board]) { bad++; console.log(`board name differs: ${p.id}`) }
    const kinds = drawTypes(p, 3)
    const d = JSON.parse(readFileSync(join(WORK, 'drafts', `${p.id}.json`), 'utf8'))
    if (JSON.stringify(kinds) !== JSON.stringify(d.kinds)) { bad++; console.log(`type draw differs ${p.id}: ${kinds} vs ${d.kinds}`) }
    if (readFileSync(file(p, OLD), 'utf8') !== d.drafts[d.pick]) { bad++; console.log(`SKILL is not the picked draft: ${p.id}`) }
    for (const a of ['PLAIN', COMP, OLD]) if (readFileSync(file(p, a), 'utf8') !== readFileSync(join(WORK, 'replies', `${p.id}__${a}.txt`), 'utf8')) { bad++; console.log(`outputs/ and WORK/replies differ: ${p.id} ${a}`) }
    for (const t of kinds) {
      const now = draftP(p, t)
      if (now.includes(NEW_PERSONA_END)) persona++
      if (now.replace(NEW_PERSONA_END, OLD_PERSONA_END) !== draftKo(p, t)) { bad++; console.log(`draft prompt differs beyond the persona line: ${p.id} ${t}`) }
    }
    if (pickP(p, d.drafts) !== pickKo(p, d.drafts)) { bad++; console.log(`pick prompt differs: ${p.id}`) }
  }
  console.log(`check: ${posts.length} threads, ${pool.length} pool comments, ${bad} problems; ${persona} of ${posts.length * 3} draft prompts carry the new persona line`)
}

if (cmd === 'gen') {
  mkdirSync(join(WORK, 'drafts-p'), { recursive: true })
  const todo = posts.filter((p) => !existsSync(file(p, NEW)))
  await pooled(todo, 4, async (p) => {
    const kinds = drawTypes(p, 3)
    const drafts = await Promise.all(kinds.map((t) => { const pr = draftP(p, t); if (!pr.includes(NEW_PERSONA_END)) throw new Error('prompts.mjs does not carry the new line'); return claude('sonnet', pr, 'gen-draft') }))
    const pick = await claude('haiku', pickP(p, drafts), 'gen-pick')
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    writeFileSync(join(WORK, 'drafts-p', `${p.id}.json`), JSON.stringify({ kinds, drafts, pick: k, pickRaw: pick }, null, 1))
    writeFileSync(file(p, NEW), drafts[k]!)
  })
  console.log(`gen: ${todo.length} jobs, ${posts.filter((p) => existsSync(file(p, NEW))).length}/${posts.length} written`)
}

// ---- ko.ts judge, word for word (prompt, labels, seeded shuffle, parsing); five arms, so labels A-E
const L = 'ABCDE'
const reply = (p: any, arm: string) => (arm === 'HUMAN' ? String(p.human.body) : readFileSync(file(p, arm), 'utf8'))
function order(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const a = [...ARMS]; for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177); const j = Math.abs(h) % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a }

if (cmd === 'judge') {
  if (judgeName !== 'opus' && judgeName !== 'sonnet') throw new Error('judge: opus or sonnet')
  const dir = join(D, OUT, judgeName), rawDir = join(D, `${OUT}-raw`, judgeName)
  mkdirSync(dir, { recursive: true }); mkdirSync(rawDir, { recursive: true })
  const missing = posts.filter((p) => ARMS.some((a) => a !== 'HUMAN' && !existsSync(file(p, a))))
  if (missing.length) throw new Error(`missing outputs for ${missing.map((p) => p.id).join(', ')}`)
  const todo = posts.filter((p) => !existsSync(join(dir, `${p.id}.json`)))
  await pooled(todo, 6, async (p) => {
    const ord = order(`${p.id}:${judgeName}:P`)
    const text = `아래는 클리앙 ${p.boardName} 게시판 글과 댓글 ${ord.length}개(${L.slice(0, ord.length).split('').join(', ')})야. 어떤 댓글은 이 글에 실제로 사람들이 단 것이고, 어떤 건 AI가 쓴 거야.\n\n댓글마다 사람이 썼을 확률(0~100)을 매겨. 그다음 이 게시판의 평범한 사용자로서 공감을 누를 순서대로 전부 순위를 매겨(가장 먼저 누를 것부터).\n\nJSON만 답해: {"human":{"A":0,"B":0,...},"upvote":["A","B",...]}\n\n${post(p)}\n\n${ord.map((arm, i) => `--- 댓글 ${L[i]} ---\n${reply(p, arm)}`).join('\n\n')}`
    for (let attempt = 1; attempt <= 2; attempt++) {
      let res = ''
      try {
        res = await claude(judgeName, text, `judge-${judgeName}`)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        const human: Record<string, number> = {}, rank: Record<string, number> = {}
        ord.forEach((arm, i) => { human[arm] = Number(j.human[L[i]!]); rank[arm] = (j.upvote as string[]).indexOf(L[i]!) + 1 })
        if (Object.values(human).some((v) => !Number.isFinite(v)) || Object.values(rank).some((v) => v < 1)) throw 0
        writeFileSync(join(rawDir, `${p.id}.txt`), res)
        writeFileSync(join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, board: p.board, order: ord, human, rank }, null, 1))
        return
      } catch { writeFileSync(join(rawDir, `${p.id}.fail${attempt}.txt`), res) }
    }
    console.log(`failed ${p.id}`)
  })
  console.log(`${judgeName}: ${todo.length} jobs, ${readdirSync(dir).length}/${posts.length} judged`)
}

// ---- punctuation measures (PROTOCOL.md, Round P)
const SP = '.?!…。？！'
const endsPunct = (t: string) => new RegExp(`[${SP}]$`).test(t.trim().replace(/["'”’)\]]+$/, ''))
const anyPunct = (t: string) => new RegExp(`[${SP}](?=\\s|$|["'”’)\\]])`).test(t.trim())
const lineBreak = (t: string) => /\n/.test(t.trim())
// sentences run together: a sentence ending at the end of a word, then only spaces or tabs, then the next word on the same line
const RUN = /([가-힣]+)(요|죠|니다|[습합됩입십]니까|[는았었였했겠있없같된한간온산본준난든됐봤왔갔났줬냈렸켰졌웠쳤싶좋많맞낫쉽렵높싸]다|듯|[남함됨])[ \t]+(?=[가-힣A-Za-z0-9"“'(])/g
const NOUN_YO = /(필|중|주|수|개|강|소|요)요$/ // 필요, 중요, 주요, 수요 ... are nouns, not the polite ending
const NOT_ENDING = /^(처음|다음|마음|게임|모임|포함|아님?|남|이름|느낌)$/
const CONNECTIVE_NEXT = /^(보니|보면|보니까|싶|하|합|해|한|할|했|하고|치고|해도|는)/ // "-다 보니", "-다 하더라", "-ㄹ 듯 합니다"
function runOns(t: string): string[] {
  const out: string[] = []
  for (const line of t.trim().split('\n')) for (const m of line.matchAll(RUN)) {
    const word = m[1]! + m[2]!, next = line.slice(m.index! + m[0].length)
    if (m[2] === '요' && NOUN_YO.test(word)) continue
    if (NOT_ENDING.test(word)) continue
    if (/다$|듯$/.test(m[2]!) && CONNECTIVE_NEXT.test(next)) continue
    out.push(`${word} ${next.slice(0, 10)}`)
  }
  return out
}
const runTogether = (t: string) => runOns(t).length > 0

if (cmd === 'analyze') {
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const f1 = (x: number) => x.toFixed(1)
  const sg = (x: number) => (x >= 0 ? '+' : '') + f1(x)
  const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] as [number, number] }
  const ci = (d: number[]) => { const [lo, hi] = boot(d); return `${sg(mean(d))} [${f1(lo)}, ${f1(hi)}]` }
  const PAIRS = [[NEW, COMP], [NEW, OLD], [OLD, COMP], [NEW, 'HUMAN'], [OLD, 'HUMAN']]
  const judges = ['opus', 'sonnet'].filter((j) => existsSync(join(D, OUT, j)))
  const rows: Record<string, any[]> = {}
  for (const j of judges) rows[j] = readdirSync(join(D, OUT, j)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(D, OUT, j, f), 'utf8')))
  const means: Record<string, Record<string, number>> = {}
  const ruleAB: Record<string, { a: boolean; b: boolean }> = {}
  for (const j of judges) {
    const rs = rows[j]!
    means[j] = Object.fromEntries(ARMS.map((a) => [a, mean(rs.map((r) => r.human[a]))]))
    console.log(`\n## ${j} (n=${rs.length} threads)\narm          human%  pass%  upvote-rank  more-human-than-HUMAN (ties)`)
    for (const a of ARMS) console.log(`${a.padEnd(11)} ${f1(means[j]![a]!).padStart(7)} ${f1(100 * mean(rs.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rs.map((r) => r.rank[a]))).padStart(8)}      ${a === 'HUMAN' ? '' : `${rs.filter((r) => r.human[a] > r.human.HUMAN).length}/${rs.length} (${rs.filter((r) => r.human[a] === r.human.HUMAN).length})`}`)
    for (const [x, y] of PAIRS) console.log(`${x} - ${y}: human ${ci(rs.map((r) => r.human[x] - r.human[y]))}, upvote rank better by ${f1(mean(rs.map((r) => r.rank[y] - r.rank[x])))}`)
    const dc = rs.map((r) => r.human[NEW] - r.human[COMP])
    ruleAB[j] = { a: mean(dc) > 0 && boot(dc)[0] > 0, b: means[j]![NEW]! - means[j]![OLD]! >= -3 }
  }
  if (judges.length === 2) {
    console.log(`\n## mean of the two judges\n${ARMS.map((a) => `${a} ${f1(mean(judges.map((j) => means[j]![a]!)))}`).join(', ')}`)
    const both = (x: string, y: string) => rows.opus!.map((r) => r.id).filter((id) => rows.sonnet!.some((r) => r.id === id)).map((id) => mean(judges.map((j) => { const r = rows[j]!.find((r) => r.id === id); return r.human[x] - r.human[y] })))
    for (const [x, y] of PAIRS) console.log(`${x} - ${y} (two-judge mean per thread): ${ci(both(x, y))}`)
  }

  const text = (p: any, a: string) => (a === 'HUMAN' ? String(p.human.body) : readFileSync(file(p, a), 'utf8'))
  const share = (a: string, f: (t: string) => boolean) => 100 * mean(posts.map((p) => (f(text(p, a)) ? 1 : 0)))
  const MEASURES: [string, (t: string) => boolean][] = [['ends with . ? !', endsPunct], ['any sentence punctuation', anyPunct], ['line break', lineBreak], ['sentences run together', runTogether]]
  console.log(`\n## punctuation (share of the ${posts.length} replies, %)\nmeasure                     ${OLD.padStart(8)} ${NEW.padStart(8)}    HUMAN   new closer to HUMAN?`)
  let closer = 0
  for (const [name, f] of MEASURES) {
    const o = share(OLD, f), n = share(NEW, f), h = share('HUMAN', f)
    const c = Math.abs(n - h) < Math.abs(o - h)
    if (c) closer++
    console.log(`${name.padEnd(27)} ${f1(o).padStart(8)} ${f1(n).padStart(8)} ${f1(h).padStart(8)}   ${c ? 'yes' : 'no'}`)
  }
  for (const a of ['PLAIN', COMP]) console.log(`(${a}: ${MEASURES.map(([name, f]) => `${name} ${f1(share(a, f))}`).join(', ')})`)
  if (process.env.SHOW) for (const a of [OLD, NEW, 'HUMAN']) for (const p of posts) { const r = runOns(text(p, a)); if (r.length) console.log(`  run-on ${a} ${p.id}: ${r.join(' ; ')}`) }
  console.log(`\n## length (median chars)\n${ARMS.map((a) => { const s = posts.map((p) => text(p, a).length).sort((x, y) => x - y); return `${a} ${s[Math.floor(s.length / 2)]}` }).join(', ')}`)
  if (existsSync(join(WORK, 'drafts-p'))) {
    const same = posts.filter((p) => { const a = JSON.parse(readFileSync(join(WORK, 'drafts', `${p.id}.json`), 'utf8')), b = JSON.parse(readFileSync(join(WORK, 'drafts-p', `${p.id}.json`), 'utf8')); return a.kinds[a.pick] === b.kinds[b.pick] }).length
    console.log(`picked comment type same as SKILL's: ${same}/${posts.length}`)
  }

  if (judges.length === 2) {
    const pass = judges.every((j) => ruleAB[j]!.a && ruleAB[j]!.b) && closer >= 2
    console.log(`\nRULE: (a) ${NEW} beats ${COMP}, interval above zero: ${judges.map((j) => `${j} ${ruleAB[j]!.a ? 'yes' : 'no'}`).join(', ')}; (b) ${NEW} - ${OLD} >= -3: ${judges.map((j) => `${j} ${ruleAB[j]!.b ? 'yes' : 'no'} (${sg(means[j]![NEW]! - means[j]![OLD]!)})`).join(', ')}; (c) closer to HUMAN on ${closer} of ${MEASURES.length} measures. ${pass ? 'PASS: adopt the line' : 'FAIL: revert the line'}`)
  }

  if (existsSync(join(WORK, 'costs-p.jsonl'))) {
    const c = readFileSync(join(WORK, 'costs-p.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const by = new Map<string, { n: number; cost: number; models: Set<string> }>()
    for (const x of c) { const e = by.get(x.stage) ?? { n: 0, cost: 0, models: new Set<string>() }; e.n++; e.cost += x.cost ?? 0; for (const m of x.models) e.models.add(m); by.set(x.stage, e) }
    console.log(`\n## cost: $${c.reduce((s, x) => s + (x.cost ?? 0), 0).toFixed(2)} over ${c.length} calls (${c.filter((x) => !x.ok).length} not ok)`)
    for (const [s, e] of by) console.log(`${s}: ${e.n} calls, $${e.cost.toFixed(2)}, models ${[...e.models].join(' + ')}`)
  }
}
