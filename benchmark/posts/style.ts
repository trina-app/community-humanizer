// No-AI shape of real posts vs generated ones: lines, paragraphs, openers, closers, markers. Usage: bun style.ts [ARM...]
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const arms = process.argv.slice(2).length ? process.argv.slice(2) : ['HUMAN']
const text = (p: any, a: string) => (a === 'HUMAN' ? p.body : existsSync(join(D, 'replies', `${p.id}__${a}.txt`)) ? readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8') : '')
const pct = (xs: boolean[]) => `${Math.round((100 * xs.filter(Boolean).length) / xs.length)}%`
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
for (const lang of ['en', 'ko']) {
  console.log(`\n## ${lang}`)
  const F: [string, (t: string) => number | boolean][] = lang === 'en' ? [
    ['paragraphs', (t) => t.split(/\n\s*\n/).filter((s) => s.trim()).length], ['words', (t) => t.split(/\s+/).filter(Boolean).length],
    ['greeting', (t) => /^(hey|hi|hello)\b/i.test(t.trim())], ['thanks at end', (t) => /(thanks|thank you|appreciate)[^\n]{0,40}$/i.test(t.trim())],
    ['list', (t) => /^\s*([-*•]|\d+[.)])\s/m.test(t)], ['bold/heading', (t) => /\*\*|^#+\s/m.test(t)], ['TL;DR/edit', (t) => /tl;?dr|^edit\b/im.test(t)],
    ['ends with ?', (t) => /\?\s*$/.test(t.trim())], ['lowercase i', (t) => /(^|\s)i(\s|')/.test(t)], ['em dash', (t) => /—/.test(t)], ['..', (t) => /\.\.(?!\.)/.test(t)],
  ] : [
    ['lines', (t) => t.split('\n').filter((s) => s.trim()).length], ['chars', (t) => t.length],
    ['안녕하세요', (t) => /^안녕/.test(t.trim())], ['감사 at end', (t) => /(감사|고맙)[^\n]{0,20}$/.test(t.trim())],
    ['ㅠ/ㅜ', (t) => /[ㅠㅜ]{2}/.test(t)], ['ㅎ/ㅋ', (t) => /[ㅎㅋ]{2}/.test(t)], ['..', (t) => /\.\.(?!\.)|…/.test(t)], ['list', (t) => /^\s*([-*•]|\d+[.)])\s/m.test(t)],
    ['ends ~요?', (t) => /요\?*\s*$/.test(t.trim())], ['ends ?', (t) => /\?\s*$/.test(t.trim())], ['존댓말 비율', (t) => /(요|니다)[.?!~]*\s*$/m.test(t)],
  ]
  console.log(`feature`.padEnd(14) + arms.map((a) => a.padStart(13)).join(''))
  for (const [name, f] of F) {
    console.log(name.padEnd(14) + arms.map((a) => { const ps = posts.filter((p) => p.lang === lang && text(p, a)); const v = ps.map((p) => f(text(p, a))); return (typeof v[0] === 'number' ? `${med(v as number[])}` : pct(v as boolean[])).padStart(13) }).join(''))
  }
}
