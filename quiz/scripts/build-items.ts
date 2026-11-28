// Builds quiz/src/items.json from the held-out test sets only (never the development set): real top comment or post vs
// the skill's version, with each judge's human probability. Real texts are cut to 600 chars; no usernames.
// Usage: bun quiz/scripts/build-items.ts ~/.trina/know-raw
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const K = process.argv[2]!
const POL = /국힘|민주당|이재명|잼통|쨈통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민|특검|대법|판사|김민석|투표|기소|장관|의원/
const LIMIT = 600
const cut = (s: string) => (s.length > LIMIT ? s.slice(0, LIMIT).replace(/\s+\S*$/, '') + '…' : s)
// a pair where only one side would be cut would give the answer away, so such pairs are left out
const fair = (h: string, a: string) => (h.length > LIMIT) === (a.length > LIMIT)
const score = (dir: string, judge: string, id: string, arm: string) => { const f = join(dir, judge, `${id}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).human[arm] ?? null : null }
const items: any[] = []
// English Reddit comments: fresh held-out set, round F1
{
  const D = join(K, 'reddit-voice-test'), posts = JSON.parse(readFileSync(join(D, 'posts-fresh.json'), 'utf8')) as any[]
  for (const p of posts) items.push({ qid: `rc-${p.id}`, lang: 'en', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
    rawHuman: String(p.human.body), rawAi: readFileSync(join(D, 'replies', `${p.id}__SKILL3.txt`), 'utf8').trim(), human: cut(String(p.human.body)), ai: cut(readFileSync(join(D, 'replies', `${p.id}__SKILL3.txt`), 'utf8').trim()),
    scores: Object.fromEntries(['codex', 'opus', 'sonnet'].map((j) => [j === 'codex' ? 'gpt' : j, { human: score(join(D, 'judged-F1'), j, p.id, 'HUMAN'), ai: score(join(D, 'judged-F1'), j, p.id, 'SKILL3') }])) })
}
// Korean Clien comments
{
  const D = join(K, 'korean-voice-test'), posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
  for (const p of posts) items.push({ qid: `kc-${p.id}`, lang: 'ko', kind: 'comment', place: `클리앙 ${p.boardName}`, title: p.title, body: cut(p.body), url: `https://www.clien.net/service/board/${p.board}/${p.id}`,
    rawHuman: String(p.human.body), rawAi: readFileSync(join(D, 'replies', `${p.id}__SKILL.txt`), 'utf8').trim(), human: cut(String(p.human.body)), ai: cut(readFileSync(join(D, 'replies', `${p.id}__SKILL.txt`), 'utf8').trim()),
    scores: Object.fromEntries(['codex', 'opus', 'sonnet'].map((j) => [j === 'codex' ? 'gpt' : j, { human: score(join(D, 'judged'), j, p.id, 'HUMAN'), ai: score(join(D, 'judged'), j, p.id, 'SKILL') }])) })
}
// Chinese (r/China_irl) and Spanish Reddit comments: held-out sets, SKILL; outputs and scores are in the repo
for (const [lang, dir, name] of [['zh', 'chinese-voice-test', 'chinese-comments'], ['es', 'spanish-voice-test', 'spanish-comments'], ['id', 'indonesian-voice-test', 'indonesian-comments'], ['ja', 'japanese-voice-test', 'japanese-comments']]) {
  const D = join(K, dir), B = new URL(`../../benchmark/${name}/`, import.meta.url).pathname, posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `${lang}c-${p.id}`, lang, kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['codex', 'opus', 'sonnet'].map((j) => [j === 'codex' ? 'gpt' : j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// Chinese extra pairs (2026-11-27, benchmark/chinese-comments/quiz-extra/): more r/China_irl threads (2026-08-01 to
// 11-26) picked for the quiz, the reply path with the Round P persona line, each pair judged on its own (Opus, Sonnet)
{
  const D = join(K, 'chinese-quiz-extra'), B = new URL('../../benchmark/chinese-comments/quiz-extra/', import.meta.url).pathname, posts = (existsSync(join(D, 'posts.json')) ? JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) : []) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `zhc-${p.id}`, lang: 'zh', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['codex', 'opus', 'sonnet'].map((j) => [j === 'codex' ? 'gpt' : j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// Japanese extra pairs (2026-11-28, benchmark/japanese-comments/quiz-extra/): more threads from the Japanese test's four
// subreddits (2026-07-01 to 11-26) picked for the quiz, the reply path with the candidate persona line, each pair judged
// on its own (Opus, Sonnet), read by hand and the hardest kept
{
  const D = join(K, 'japanese-quiz-extra'), B = new URL('../../benchmark/japanese-comments/quiz-extra/', import.meta.url).pathname, posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `jac-${p.id}`, lang: 'ja', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['opus', 'sonnet'].map((j) => [j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// Spanish extra pairs (2026-11-28, benchmark/spanish-comments/quiz-extra/): everyday Spanish-language subreddits
// (preguntaleareddit, mexico, argentina, Colombia; 2026-08-01 to 11-26) instead of the test's developer ones, picked for
// the quiz, the reply path with the candidate persona line, each pair judged on its own (Opus, Sonnet), read by hand,
// the hardest short ones kept (both replies under 400 characters)
{
  const D = join(K, 'spanish-quiz-extra'), B = new URL('../../benchmark/spanish-comments/quiz-extra/', import.meta.url).pathname, posts = (existsSync(join(D, 'posts.json')) ? JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) : []) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `esc-${p.id}`, lang: 'es', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['opus', 'sonnet'].map((j) => [j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// English extra pairs (2026-11-28, benchmark/reddit-comments/quiz-extra/): everyday subreddits (AskAnAmerican,
// BuyItForLife, AskEurope, HomeImprovement; 2026-08-01 to 11-26) instead of the test's developer ones, picked for the quiz,
// the reply path with the candidate persona line, each pair judged on its own (Opus, Sonnet), read by hand, the hardest
// short ones kept. Their ids are not F1 ids, so the Round P swap below leaves them alone.
{
  const D = join(K, 'english-quiz-extra'), B = new URL('../../benchmark/reddit-comments/quiz-extra/', import.meta.url).pathname, posts = (existsSync(join(D, 'posts.json')) ? JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) : []) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `rce-${p.id}`, lang: 'en', kind: 'comment', place: `r/${p.sub}`, title: p.title, body: cut(p.body ?? ''), url: `https://www.reddit.com/r/${p.sub}/comments/${p.id}/`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['opus', 'sonnet'].map((j) => [j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// Korean extra pairs (2026-11-28, benchmark/korean-comments/quiz-extra/): more Clien 모두의공원 and 아무거나질문 threads
// (2026-09-27 to 11-26, none the Korean tests used) picked for the quiz, the reply path with the candidate persona line,
// each pair judged on its own (Opus, Sonnet), read by hand, the hardest short ones kept. The Round P swap below finds no
// SKILLP output for these ids, so it leaves them alone.
{
  const D = join(K, 'korean-quiz-extra'), B = new URL('../../benchmark/korean-comments/quiz-extra/', import.meta.url).pathname, posts = (existsSync(join(D, 'posts.json')) ? JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) : []) as any[]
  for (const p of posts) {
    const ai = readFileSync(join(B, 'outputs', `${p.id}__SKILL.txt`), 'utf8').trim()
    items.push({ qid: `kce-${p.id}`, lang: 'ko', kind: 'comment', place: `클리앙 ${p.boardName}`, title: p.title, body: cut(p.body), url: `https://www.clien.net/service/board/${p.board}/${p.id}`,
      rawHuman: String(p.human.body), rawAi: ai, human: cut(String(p.human.body)), ai: cut(ai),
      scores: Object.fromEntries(['opus', 'sonnet'].map((j) => [j, { human: score(join(B, 'judged'), j, p.id, 'HUMAN'), ai: score(join(B, 'judged'), j, p.id, 'SKILL') }])) })
  }
}
// posts: held-out set, MESSY
{
  const D = join(K, 'post-voice-test', 'holdout'), posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
  for (const p of posts) {
    if (p.lang === 'ko' && (POL.test(p.title) || POL.test(p.body))) continue
    const url = p.lang === 'en' ? `https://www.reddit.com/${p.place}/comments/${p.id}/` : `https://www.clien.net/service/board/${p.group}/${p.id}`
    items.push({ qid: `${p.lang === 'en' ? 'rp' : 'kp'}-${p.id}`, lang: p.lang, kind: 'post', place: p.place, title: p.title, body: '', url,
      rawHuman: p.body, rawAi: readFileSync(join(D, 'replies', `${p.id}__MESSY.txt`), 'utf8').trim(), human: cut(p.body), ai: cut(readFileSync(join(D, 'replies', `${p.id}__MESSY.txt`), 'utf8').trim()),
      scores: Object.fromEntries(['codex', 'opus', 'sonnet'].map((j) => [j === 'codex' ? 'gpt' : j, { human: score(join(D, 'judged'), j, p.id, 'HUMAN'), ai: score(join(D, 'judged'), j, p.id, 'MESSY') }])) })
  }
}
// English and Korean comments: use the punctuated version from Round P (2026-11-27) instead. People spotted the old
// version at once because it never ends a sentence with punctuation; the AI judges didn't. New qids (-p) keep the
// answers to the two versions apart, so the quiz also tells which version people catch less often.
for (const [lang, name, arm] of [['en', 'reddit-comments', 'SKILL3P'], ['ko', 'korean-comments', 'SKILLP']] as const) {
  const B = new URL(`../../benchmark/${name}/`, import.meta.url).pathname
  for (const x of items.filter((x) => x.lang === lang && x.kind === 'comment')) {
    const id = x.qid.split('-')[1], f = join(B, 'outputs', `${id}__${arm}.txt`)
    if (!existsSync(f)) continue
    const ai = readFileSync(f, 'utf8').trim()
    x.qid += '-p'; x.rawAi = ai; x.ai = cut(ai)
    x.scores = Object.fromEntries(['opus', 'sonnet'].map((j) => [j, { human: score(join(B, 'judged-P'), j, id, 'HUMAN'), ai: score(join(B, 'judged-P'), j, id, arm) }]))
  }
}
// How hard a pair is: the judges' human score for the AI side minus the real side's (higher = harder). The worker
// serves the hardest pairs first.
for (const x of items) {
  const v = Object.values(x.scores as Record<string, { human: number | null; ai: number | null }>).filter((s) => s.ai != null && s.human != null)
  x.d = v.length ? Math.round(v.reduce((a, s) => a + (s.ai! - s.human!), 0) / v.length) : -100
}
// r/China_irl drifts into politics and one real person's scandal; the benchmark's guard let those through, the quiz doesn't.
// 1xnixty was read by hand: Taiwan and NVIDIA come up only as chip-industry examples.
const ZH_POL = /黄仁勋|老黄|黄皮|爱泼斯坦|萝莉岛|中共|共产党|习近平|政府|政治|台湾|香港|新疆|西藏|穆斯林|伊斯兰|性少数|间谍|认知战|地缘|粉红|润人|经济停止|经济恶化|身败名裂|川普|特朗普|拜登|战争|民主|社会主义|集权/
const ZH_OK = new Set(['zhc-1xnixty'])
const zh = items.filter((x) => x.lang === 'zh' && !ZH_OK.has(x.qid) && [x.title, x.body, x.rawHuman, x.rawAi].some((s) => ZH_POL.test(s)))
// Spanish: same idea, and a real reply that is only a link would give the answer away
const ES_POL = /nazi|fascis|comunis|\bvox\b|psoe|\bpp\b|sánchez|ayuso|amlo|morena|sheinbaum|milei|kirchner|peronis|elecci|gobierno|polític/i
const es = items.filter((x) => x.lang === 'es' && ([x.title, x.body, x.rawHuman, x.rawAi].some((s) => ES_POL.test(s)) || /^\s*https?:\/\/\S+\s*$/.test(x.rawHuman.split('\n')[0])))
// Indonesian: same idea
const ID_POL = /politik|pemilu|pilkada|pilpres|prabowo|jokowi|gibran|anies|ganjar|\bdpr\b|partai|pemerintah|presiden|menteri|korupsi|ormas|\bpki\b|komunis/i
// read by hand: 1xse85x (government meal programme) and 1xnj0zn (a preacher) are borderline, 1xp9s3h is about porn; 1xu8nw2 (wrong item from a seller) only trips the word list
const ID_SKIP = new Set(['idc-1xse85x', 'idc-1xnj0zn', 'idc-1xp9s3h']), ID_OK = new Set(['idc-1xu8nw2'])
const idp = items.filter((x) => x.lang === 'id' && !ID_OK.has(x.qid) && (ID_SKIP.has(x.qid) || [x.title, x.body, x.rawHuman, x.rawAi].some((s) => ID_POL.test(s))))
// Japanese: same idea
const JA_POL = /政治|選挙|自民|立憲|維新|公明|共産党|首相|総理|岸田|石破|高市|安倍|政府|国会|議員|天皇|皇室|靖国|移民|宗教|統一教会|創価|戦争|右翼|左翼|ネトウヨ|パヨク/
// read by hand: politics, sex, a real-person scandal, crude or drug threads, and one mean-spirited one
const JA_SKIP = new Set(['1xoxm0n', '1xqmd0w', '1xmpwyh', '1xzcxkz', '1xyk7i5', '1xmo5sd', '1xvn8if', '1xmtery', '1y4dsst', '1y4vwn6', '1xue0ts', '1xtc12z', '1xqk9fy', '1y4c4r2'].map((id) => 'jac-' + id))
const jap = items.filter((x) => x.lang === 'ja' && (JA_SKIP.has(x.qid) || [x.title, x.body, x.rawHuman, x.rawAi].some((s) => JA_POL.test(s))))
// a stray character from another script (e.g. Chinese 露 inside a Korean word) gives the answer away
const SCRIPT: Record<string, RegExp> = { ko: /[一-鿿぀-ヿ]/, ja: /[가-힣]/, zh: /[가-힣぀-ヿ]/, en: /[぀-ヿ一-鿿가-힣]/, es: /[぀-ヿ一-鿿가-힣]/, id: /[぀-ヿ一-鿿가-힣]/ }
const mixed = items.filter((x) => SCRIPT[x.lang] && (SCRIPT[x.lang].test(x.rawAi) || SCRIPT[x.lang].test(x.rawHuman)))
const ko = [...items.filter((x) => x.lang === 'ko' && (POL.test(x.title) || POL.test(x.human))), ...zh, ...es, ...idp, ...jap, ...mixed]
const unfair = items.filter((x) => !fair(x.rawHuman, x.rawAi))
// Native-reader review of every pair (2026-11-27, research/community-humanizer-launch/quiz-review/<lang>.md):
// sensitive topics, a "real" side that itself reads AI-written, answers that only make sense with an image,
// AI sides cut off mid-sentence or contradicting the post, posters who are minors.
const REVIEW_DROP = new Set([
  'rc-1xxmkig', 'rc-1y2u0ax', 'rc-1xwftge', 'rc-1y2w0kq', 'rp-1xt8215', 'rp-1xtkr5f', 'rp-1xqzk0w', 'rp-1xsf4kt',
  'kc-19296796', 'kc-19258962', 'kc-19297442', 'kp-19296188', 'kp-19295252', 'kp-19236320', 'kp-19232088', 'kp-19210883',
  'jac-1xp9gzm', 'jac-1xpo2tv', 'jac-1xp41zg', 'jac-1xls1ev', 'jac-1xnn3w2', 'jac-1xnodwz', 'jac-1y1vptm',
  'zhc-1xy7izp', 'zhc-1xnxlct', 'zhc-1xt8vyu', 'zhc-1xmd3vj', 'zhc-1xt9yjz', 'zhc-1xq953d',
  'esc-1xlfmlc', 'esc-1xorzbq', 'esc-1xx6qt7', 'esc-1xx6o70', 'esc-1y4nyeu', 'esc-1y4bdkq', 'esc-1xx2109', 'esc-1xr111l', 'esc-1xqp99u', 'esc-1xyizqg', 'esc-1xrezri',
  'idc-1xsaupa', 'idc-1y45n2r', 'idc-1xrqub1', 'idc-1xu8nw2', 'idc-1xu7vwa', 'idc-1y51nul', 'idc-1y4y1tc', 'idc-1xqa46r', 'idc-1xnp35g', 'idc-1xp1i7t',
])
// The page shows plain text: decode entities, drop markdown and scrape leftovers, hide usernames, and use plain quotes
// on both sides so typography can't give the answer away.
const clean = (s: string) => s
  .replace(/\s*(&lt;|<)div[\s\S]*$/, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&#x200B;|​/g, '')
  .replace(/\\([>*_\-#\[\]()~])/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|\s)\*([^*\s][^*]*)\*/g, '$1$2')
  .replace(/\bu\/[A-Za-z0-9_-]+/g, 'u/…')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .trim()
// Developer communities make the quiz a developer quiz; players are anyone (2026-11-28).
const DEV = new Set(['r/selfhosted', 'r/ClaudeAI', 'r/SaaS', 'r/indotech', 'r/devsarg', 'r/programacion'])
const usable = items.filter((x) => !ko.includes(x) && !unfair.includes(x) && !REVIEW_DROP.has(x.qid.replace(/-p$/, '')))
// developer subreddits only while a language would have fewer than 10 pairs without them (hardest first)
const devFill = Object.entries(Object.groupBy(usable, (x) => x.lang)).flatMap(([, xs]) => { const dev = xs.filter((x) => DEV.has(x.place)).sort((a, b) => b.d - a.d); return dev.slice(0, Math.max(0, 10 - (xs.length - dev.length))) })
const keep = usable.filter((x) => !DEV.has(x.place) || devFill.includes(x)).map(({ rawHuman, rawAi, ...x }) => ({ ...x, title: clean(x.title), body: clean(x.body), human: clean(x.human), ai: clean(x.ai) }))
writeFileSync(new URL('../src/items.json', import.meta.url), JSON.stringify(keep))
for (const [l, k] of [['en', 'comment'], ['en', 'post'], ['ko', 'comment'], ['ko', 'post'], ['zh', 'comment'], ['es', 'comment'], ['id', 'comment'], ['ja', 'comment']]) console.log(`${l} ${k}: ${keep.filter((x) => x.lang === l && x.kind === k).length}`)
console.log(`dropped as political: ${ko.length}, dropped because only one side would be cut: ${unfair.length}`)
