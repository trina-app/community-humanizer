// Post-writing test inputs: real posts with a body, from the Reddit sets (dev + fresh) and the Korean Clien set.
// Samples are other real posts from the same community, never the post itself. Usernames are not kept.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const [R, K] = process.argv.slice(2) as [string, string]
const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const en = [...JSON.parse(readFileSync(join(R, 'posts.json'), 'utf8')), ...JSON.parse(readFileSync(join(R, 'posts-fresh.json'), 'utf8'))]
  .filter((p: any) => p.body && words(p.body) >= 60 && words(p.body) <= 400 && !/\[(removed|deleted)\]/.test(p.body))
  .map((p: any) => ({ id: p.id, lang: 'en', place: `r/${p.sub}`, group: p.sub, title: p.title, body: p.body.trim() }))
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const BOARD: Record<string, string> = { park: '클리앙 모두의공원', kin: '클리앙 아무거나질문' }
const cands = JSON.parse(readFileSync(join(K, 'cands.json'), 'utf8')) as any[]
const ko = readdirSync(join(K, 'raw')).map((f) => { const [board, id] = f.replace('.json', '').split('-') as [string, string]; const p = JSON.parse(readFileSync(join(K, 'raw', f), 'utf8')); return { id, lang: 'ko', place: BOARD[board]!, group: board, title: cands.find((c) => c.id === id)?.title ?? '', body: String(p.body).trim() } })
  .filter((p) => p.title && p.body.length >= 120 && p.body.length <= 1500 && !POL.test(p.title) && !POL.test(p.body))
const all = [...en, ...ko]
const pick = (xs: any[], n: number) => { const by = new Map<string, any[]>(); for (const x of xs) by.set(x.group, [...(by.get(x.group) ?? []), x]); const out: any[] = []; for (let i = 0; out.length < n && i < 50; i++) for (const g of by.values()) if (g[i] && out.length < n) out.push(g[i]); return out }
const test = [...pick(en, 24), ...pick(ko, 24)]
const ids = new Set(test.map((p) => p.id))
for (const p of test) p.samples = all.filter((q) => q.group === p.group && q.id !== p.id).map((q) => q.body.slice(0, 900)).slice(0, 9)
writeFileSync('posts.json', JSON.stringify(test, null, 1))
console.log(`en ${test.filter((p) => p.lang === 'en').length} (of ${en.length}), ko ${test.filter((p) => p.lang === 'ko').length} (of ${ko.length}); samples per post: min ${Math.min(...test.map((p) => p.samples.length))}; leak ${test.some((p) => p.samples.includes(p.body.slice(0, 900)))}`)
