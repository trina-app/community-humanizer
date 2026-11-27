// Holdout results with political posts removed (launch review, 2026-11-27): the same analysis on the remaining posts.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const D = join(import.meta.dir, 'holdout')
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민|특검|대법|판사|김민석|투표|기소|장관|의원/
const posts = (JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]).filter((p) => !(p.lang === 'ko' && (POL.test(p.title) || POL.test(p.body))))
const keep = new Set(posts.map((p) => p.id))
const ARMS = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'MESSY', 'HUMAN']
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
const boot = (d: number[]) => { let s = 12345; const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32); const m: number[] = []; for (let b = 0; b < 10000; b++) m.push(mean(d.map(() => d[Math.floor(rnd() * d.length)]!))); m.sort((a, b) => a - b); return [m[250]!, m[9749]!] }
for (const lang of ['en', 'ko']) for (const j of readdirSync(join(D, 'judged'))) {
  const rows = readdirSync(join(D, 'judged', j)).map((f) => JSON.parse(readFileSync(join(D, 'judged', j, f), 'utf8'))).filter((r) => r.lang === lang && keep.has(r.id))
  console.log(`${lang} ${j} (n=${rows.length}): ${ARMS.map((a) => `${a} ${mean(rows.map((r) => r.human[a])).toFixed(1)}`).join(', ')}`)
  for (const [x, y] of [['MESSY', 'HUMANIZER_S'], ['MESSY', 'SKILL'], ['MESSY', 'HUMAN']]) { const d = rows.map((r) => r.human[x] - r.human[y]); const [lo, hi] = boot(d); console.log(`  ${x} - ${y}: ${mean(d).toFixed(1)} [${lo.toFixed(1)}, ${hi.toFixed(1)}]`) }
  console.log(`  MESSY more human than the real post: ${rows.filter((r) => r.human.MESSY > r.human.HUMAN).length}/${rows.length}`)
}
