// Shape of the real-post corpus by community (the same features as style.ts), for the post skill's targets.
import { readFileSync } from 'node:fs'
const xs = JSON.parse(readFileSync('corpus.json', 'utf8')) as any[]
const pct = (v: boolean[]) => `${Math.round((100 * v.filter(Boolean).length) / v.length)}%`
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const EN: [string, (t: string) => number | boolean][] = [['paras', (t) => t.split(/\n\s*\n/).filter((s) => s.trim()).length], ['words', (t) => t.split(/\s+/).filter(Boolean).length], ['greet', (t) => /^(hey|hi|hello)\b/i.test(t.trim())], ['thanks', (t) => /(thanks|thank you|appreciate)[^\n]{0,40}$/i.test(t.trim())], ['list', (t) => /^\s*([-*•]|\d+[.)])\s/m.test(t)], ['bold', (t) => /\*\*|^#+\s/m.test(t)], ['tldr/edit', (t) => /tl;?dr|^edit\b/im.test(t)], ['end?', (t) => /\?\s*$/.test(t.trim())], ['..', (t) => /\.\.(?!\.)/.test(t)], ['I-start', (t) => /^I\b/.test(t.trim())], ['typo-ish lower', (t) => /(^|[.!?]\s+)[a-z]/.test(t)]]
const KO: [string, (t: string) => number | boolean][] = [['lines', (t) => t.split('\n').filter((s) => s.trim()).length], ['chars', (t) => t.length], ['안녕', (t) => /^안녕/.test(t.trim())], ['감사', (t) => /(감사|고맙)[^\n]{0,20}$/.test(t.trim())], ['ㅠㅜ', (t) => /[ㅠㅜ]{2}/.test(t)], ['ㅎㅋ', (t) => /[ㅎㅋ]{2}/.test(t)], ['..', (t) => /\.\.(?!\.)|…/.test(t)], ['list', (t) => /^\s*([-*•]|\d+[.)])\s/m.test(t)], ['end요?', (t) => /요\?*\s*$/.test(t.trim())], ['end?', (t) => /\?\s*$/.test(t.trim())], ['반말끝', (t) => /(다|음|함|임|듯|네|지)[.?!~]*\s*$/.test(t.trim())], ['줄당 글자', (t) => Math.round(t.length / Math.max(1, t.split('\n').length))]]
for (const g of [...new Set(xs.map((x) => `${x.lang}:${x.group}`))]) {
  const [lang, group] = g.split(':'); const ps = xs.filter((x) => x.lang === lang && x.group === group).map((x) => x.body as string)
  const F = lang === 'en' ? EN : KO
  console.log(`${g.padEnd(18)} n=${String(ps.length).padStart(3)} ` + F.map(([n, f]) => { const v = ps.map(f); return `${n} ${typeof v[0] === 'number' ? med(v as number[]) : pct(v as boolean[])}` }).join(' | '))
}
