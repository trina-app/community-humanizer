// Results (PROTOCOL.md + amendment): per judge, mean human probability, pass rate (50+), mean upvote rank; the primary
// paired comparison SKILL vs BLADER_S with a bootstrap 95% interval; and a no-AI style check against the human comments.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, process.env.POSTS ?? 'posts.json'), 'utf8')) as any[]
const ARMS = (process.env.ARMS ?? 'PLAIN,RULE,BLADER,BLADER_S,SKILL,HUMAN').split(',')
const OUT = process.env.OUT ?? 'judged'
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const f1 = (x: number) => x.toFixed(1)

function boot(diffs: number[]): [number, number] {
  let s = 12345
  const rnd = () => ((s = Math.imul(s, 1103515245) + 12345 >>> 0) / 2 ** 32)
  const m: number[] = []
  for (let b = 0; b < 10000; b++) m.push(mean(diffs.map(() => diffs[Math.floor(rnd() * diffs.length)]!)))
  m.sort((a, b) => a - b)
  return [m[250]!, m[9749]!]
}

for (const judge of readdirSync(join(D, OUT))) {
  const rows = readdirSync(join(D, OUT, judge)).map((f) => JSON.parse(readFileSync(join(D, OUT, judge, f), 'utf8')))
  console.log(`\n## ${judge} (n=${rows.length} posts)\narm       human%  pass%  upvote-rank`)
  for (const a of ARMS) console.log(`${a.padEnd(9)} ${f1(mean(rows.map((r) => r.human[a]))).padStart(6)} ${f1(100 * mean(rows.map((r) => (r.human[a] >= 50 ? 1 : 0)))).padStart(6)} ${f1(mean(rows.map((r) => r.rank[a]))).padStart(8)}`)
  for (const [x, y] of [...(process.env.PAIRS ?? 'SKILL:BLADER_S,SKILL:RULE,BLADER_S:BLADER').split(',').map((s) => s.split(':'))]) {
    const pass = rows.map((r) => 100 * ((r.human[x] >= 50 ? 1 : 0) - (r.human[y] >= 50 ? 1 : 0)))
    const prob = rows.map((r) => r.human[x] - r.human[y])
    const rank = rows.map((r) => r.rank[y] - r.rank[x])
    const [pl, ph] = boot(pass), [ql, qh] = boot(prob)
    console.log(`${x} - ${y}: pass ${f1(mean(pass))}pt [${f1(pl)}, ${f1(ph)}], human ${f1(mean(prob))} [${f1(ql)}, ${f1(qh)}], upvote rank better by ${f1(mean(rank))}`)
  }
  console.log(`judged more human than the real comment: ${ARMS.filter((a) => a !== 'HUMAN').map((a) => `${a} ${rows.filter((r) => r.human[a] > r.human.HUMAN).length}/${rows.length}`).join(', ')}`)
}

// no-AI style check: how far each arm's shape is from the real comments
const text = (p: any, a: string) => a === 'HUMAN' ? String(p.human.body) : existsSync(join(D, 'replies', `${p.id}__${a}.txt`)) ? readFileSync(join(D, 'replies', `${p.id}__${a}.txt`), 'utf8') : ''
console.log(`\n## style (no AI), n=${posts.length}\narm       words(median)  paragraphs  bullets%  bold%  emdash%`)
for (const a of ARMS) {
  const t = posts.map((p) => text(p, a)).filter(Boolean)
  const w = t.map((x) => x.split(/\s+/).filter(Boolean).length).sort((x, y) => x - y)
  console.log(`${a.padEnd(9)} ${String(w[Math.floor(w.length / 2)]).padStart(8)}      ${f1(mean(t.map((x) => x.split(/\n\s*\n/).filter((s) => s.trim()).length))).padStart(6)}    ${f1(100 * mean(t.map((x) => (/^\s*([-*•]|\d+\.)\s/m.test(x) ? 1 : 0)))).padStart(6)}  ${f1(100 * mean(t.map((x) => (/\*\*[^*]+\*\*/.test(x) ? 1 : 0)))).padStart(5)}  ${f1(100 * mean(t.map((x) => (/—/.test(x) ? 1 : 0)))).padStart(6)}`)
}
