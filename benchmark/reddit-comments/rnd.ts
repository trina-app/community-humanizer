// F3 pick control: a seeded random one of SKILL3's own three drafts (drafts3/<id>.json).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, process.env.POSTS ?? 'posts.json'), 'utf8')) as any[]
let same = 0
for (const p of posts) {
  const d = JSON.parse(readFileSync(join(D, 'drafts3', `${p.id}.json`), 'utf8'))
  let h = 2166136261; for (const c of `${p.id}:rnd`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const k = (h >>> 0) % d.drafts.length
  if (k === d.pick) same++
  writeFileSync(join(D, 'replies', `${p.id}__SKILL3RND.txt`), d.drafts[k])
}
console.log(`random pick equals Haiku pick on ${same}/${posts.length}`)
