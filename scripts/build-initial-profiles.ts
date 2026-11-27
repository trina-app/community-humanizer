// The first community profiles, from the 2026-11-26/27 test data: comment types, comment lengths, post shape
// (post-voice-test corpus) and the subreddit rules read on 2026-10-31. Usage: bun scripts/build-initial-profiles.ts <test data dir> [rules.json]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [K, RULES] = process.argv.slice(2) as [string, string | undefined] // RULES: a JSON file of rules read from each subreddit's about/rules page
const ROOT = new URL('..', import.meta.url).pathname
const rates = JSON.parse(readFileSync(join(ROOT, 'skills/community-humanizer/rates.json'), 'utf8')).rates
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const pct = (v: boolean[]) => (v.length ? Math.round((100 * v.filter(Boolean).length) / v.length) : null)
const words = (t: string) => t.split(/\s+/).filter(Boolean).length
const corpus = JSON.parse(readFileSync(join(K, 'post-voice-test/corpus.json'), 'utf8')) as any[]
const subRules = RULES ? JSON.parse(readFileSync(RULES, 'utf8')) : {}
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
function postShape(lang: string, group: string) {
  const ps = corpus.filter((c) => c.lang === lang && c.group === group).map((c) => String(c.body))
  if (lang === 'en') return { n: ps.length, words_median: med(ps.map(words)), paragraphs_median: med(ps.map((t) => t.split(/\n\s*\n/).filter((s) => s.trim()).length)), list_pct: pct(ps.map((t) => /^\s*([-*•]|\d+[.)])\s/m.test(t))), bold_or_heading_pct: pct(ps.map((t) => /\*\*|^#+\s/m.test(t))), greeting_pct: pct(ps.map((t) => /^(hey|hi|hello)\b/i.test(t.trim()))), ends_with_question_pct: pct(ps.map((t) => /\?\s*$/.test(t.trim()))) }
  const lines = (t: string) => t.split('\n').filter((s) => s.trim()).length
  return { n: ps.length, chars_median: med(ps.map((t) => t.length)), lines_median: med(ps.map(lines)), dots_pct: pct(ps.map((t) => /\.\.(?!\.)|…/.test(t))), casual_ending_pct: pct(ps.map((t) => /(다|음|함|임|듯|네|지)[.?!~]*\s*$/.test(t.trim()))), greeting_pct: pct(ps.map((t) => /^안녕/.test(t.trim()))), ends_with_question_pct: pct(ps.map((t) => /\?\s*$/.test(t.trim()))) }
}
// English comment lengths from the Reddit test comments (2+ points)
const enComments = JSON.parse(readFileSync(join(K, 'reddit-voice-test/bd/comments.json'), 'utf8')) as any[]
const subOf = (c: any) => c.input.url.match(/\/r\/([^/]+)\//)[1]
const RULES_NOTE: Record<string, string[]> = {
  startups: ['Post titles here carry "(I will not promote)" or "[I will not promote]" (seen in the test threads).'],
  SaaS: [],
}
for (const sub of ['smallbusiness', 'SaaS', 'selfhosted', 'ClaudeAI', 'startups']) {
  const cs = enComments.filter((c) => subOf(c) === sub && c.num_upvotes >= 2 && c.comment).map((c) => String(c.comment))
  const r = subRules[sub] as any[] | undefined
  const promo = (r ?? []).filter((x) => /promot|advertis|spam|self-promo|link/i.test(`${x.name} ${x.text}`)).map((x) => String(x.name).trim())
  const ai = (r ?? []).filter((x) => /\bAI\b|LLM|ChatGPT|generated/i.test(`${x.name} ${x.text}`) && /(not allowed|no |banned|prohibit|remove)/i.test(x.text) && /(generated|written|post|comment)/i.test(x.text)).map((x) => String(x.name).trim())
  const profile = {
    community: `r/${sub}`, platform: 'reddit', measured: '2026-11-26',
    comments: { n: cs.length, source: 'top-level comments with 2+ points in the 16 busiest question threads of 2026-11-12 to 11-24', words_median: med(cs.map(words)), types: rates[sub.toLowerCase()] },
    posts: postShape('en', sub),
    rules: { ai_content: r ? (ai.length ? 'banned' : 'no rule found') : 'unknown', ai_rules: ai, self_promotion_rules: promo, notes: RULES_NOTE[sub] ?? [], checked: r ? '2026-10-31' : null, source: `https://www.reddit.com/r/${sub}/about/rules` },
  }
  writeFileSync(join(ROOT, 'communities/reddit', `${sub.toLowerCase()}.json`), JSON.stringify(profile, null, 1) + '\n')
}
// Clien boards: comment lengths from the saved pages (1+ 공감, non-political threads)
for (const [board, name] of [['park', '모두의공원'], ['kin', '아무거나질문']] as const) {
  const cs: string[] = []
  for (const f of readdirSync(join(K, 'korean-voice-test/raw')).filter((f) => f.startsWith(`${board}-`))) {
    const p = JSON.parse(readFileSync(join(K, 'korean-voice-test/raw', f), 'utf8'))
    if (POL.test(p.title ?? '')) continue
    for (const c of p.comments) if (!c.reply && !c.op && c.likes >= 1 && !POL.test(c.body)) cs.push(c.body)
  }
  const profile = {
    community: `클리앙 ${name}`, platform: 'clien', board, measured: '2026-11-26',
    comments: { n: cs.length, source: 'top-level comments with 1+ 공감 in non-political question threads, 2026-11', chars_median: med(cs.map((t) => t.length)), types: rates[`clien-${board}`] },
    posts: postShape('ko', board),
    rules: { ai_content: 'unknown', ai_rules: [], self_promotion_rules: [], notes: ['Political threads are refused by the tool.'], checked: null, source: 'https://www.clien.net/service/board/rule' },
  }
  writeFileSync(join(ROOT, 'communities/clien', `${board}.json`), JSON.stringify(profile, null, 1) + '\n')
}
writeFileSync(join(ROOT, 'communities/_defaults.json'), JSON.stringify({ note: 'type rates used when a community has no profile and fewer than 40 usable comments', en: rates._default, ko: rates._default_ko }, null, 1) + '\n')
console.log(readdirSync(join(ROOT, 'communities/reddit')).join(', '), '|', readdirSync(join(ROOT, 'communities/clien')).join(', '))
