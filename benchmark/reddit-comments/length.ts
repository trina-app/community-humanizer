// Does length drive the judges' human score? Every AI reply in rounds 1-4, bucketed by word count.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = new Map((JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]).map((p) => [p.id, p]))
const rows: { w: number; s: number; arm: string; judge: string }[] = []
for (const out of ['judged', 'judged2', 'judged3', 'judged4']) for (const judge of readdirSync(join(D, out))) for (const f of readdirSync(join(D, out, judge))) {
  const r = JSON.parse(readFileSync(join(D, out, judge, f), 'utf8'))
  for (const [arm, s] of Object.entries(r.human) as [string, number][]) {
    const t = arm === 'HUMAN' ? String(posts.get(r.id).human.body) : existsSync(join(D, 'replies', `${r.id}__${arm}.txt`)) ? readFileSync(join(D, 'replies', `${r.id}__${arm}.txt`), 'utf8') : ''
    rows.push({ w: t.split(/\s+/).filter(Boolean).length, s, arm, judge })
  }
}
const buckets = [[0, 10], [11, 25], [26, 40], [41, 60], [61, 90], [91, 150], [151, 9999]]
for (const who of ['AI', 'HUMAN']) for (const judge of ['opus', 'sonnet']) {
  const xs = rows.filter((r) => r.judge === judge && (who === 'HUMAN' ? r.arm === 'HUMAN' : r.arm !== 'HUMAN'))
  console.log(`${who} replies, ${judge}: ${buckets.map(([a, b]) => { const b2 = xs.filter((r) => r.w >= a! && r.w <= b!); return `${a}-${b! > 999 ? '' : b}w ${b2.length ? Math.round(b2.reduce((s, r) => s + r.s, 0) / b2.length) : '-'} (n=${b2.length})` }).join(' | ')}`)
}
