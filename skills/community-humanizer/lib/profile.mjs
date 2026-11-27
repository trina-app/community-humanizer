// Community profiles: one small JSON file per community in communities/ (measured shape of comments and posts, plus the
// rules that matter). Numbers come from `community-humanizer profile`; rules are added by people, with a link to the source.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'communities')
const file = (platform, name) => join(ROOT, platform, `${name.toLowerCase()}.json`)

export function load(platform, name) {
  const f = file(platform, name)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null
}

export function defaults(lang) {
  const f = join(ROOT, '_defaults.json')
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8'))[lang] : null
}

const med = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const pct = (v) => (v.length ? Math.round((100 * v.filter(Boolean).length) / v.length) : null)
const TYPES = ['answer', 'one-liner', 'anecdote', 'disagree', 'question-back', 'side-point', 'agree', 'joke', 'complaint']

// numbers from freshly read comments and posts; the rules part of an existing profile is kept as it is
export function build({ platform, name, community, lang, comments, posts, measured = new Date().toISOString().slice(0, 10) }) {
  const typed = comments.filter((c) => TYPES.includes(c.type))
  const types = Object.fromEntries(TYPES.map((t) => [t, typed.length ? +(typed.filter((c) => c.type === t).length / typed.length).toFixed(3) : 0]))
  const words = (t) => t.split(/\s+/).filter(Boolean).length
  const lines = (t) => t.split('\n').filter((s) => s.trim()).length
  const shape = lang === 'en'
    ? { n: posts.length, words_median: med(posts.map(words)), paragraphs_median: med(posts.map((t) => t.split(/\n\s*\n/).filter((s) => s.trim()).length)), list_pct: pct(posts.map((t) => /^\s*([-*•]|\d+[.)])\s/m.test(t))), bold_or_heading_pct: pct(posts.map((t) => /\*\*|^#+\s/m.test(t))), greeting_pct: pct(posts.map((t) => /^(hey|hi|hello)\b/i.test(t.trim()))), ends_with_question_pct: pct(posts.map((t) => /\?\s*$/.test(t.trim()))) }
    : { n: posts.length, chars_median: med(posts.map((t) => t.length)), lines_median: med(posts.map(lines)), dots_pct: pct(posts.map((t) => /\.\.(?!\.)|…/.test(t))), casual_ending_pct: pct(posts.map((t) => /(다|음|함|임|듯|네|지)[.?!~]*\s*$/.test(t.trim()))), greeting_pct: pct(posts.map((t) => /^안녕/.test(t.trim()))), ends_with_question_pct: pct(posts.map((t) => /\?\s*$/.test(t.trim()))) }
  const old = load(platform, name)
  return {
    community, platform, ...(platform === 'clien' ? { board: name } : {}), measured,
    comments: { n: typed.length, source: `top-level comments from the busiest recent threads, read ${measured}`, ...(lang === 'en' ? { words_median: med(typed.map((c) => words(c.body))) } : { chars_median: med(typed.map((c) => c.body.length)) }), types },
    posts: shape,
    rules: old?.rules ?? { ai_content: 'unknown', ai_rules: [], self_promotion_rules: [], notes: [], checked: null, source: platform === 'reddit' ? `https://www.reddit.com/r/${name}/about/rules` : 'https://www.clien.net/service/board/rule' },
  }
}

export function save(profile, platform, name) {
  const f = file(platform, name)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, JSON.stringify(profile, null, 1) + '\n')
  return f
}
