// Builds quiz/src/items.json from the held-out test sets only (never the development set): real top comment or post vs
// the skill's version, with each judge's human probability. Real texts are cut to 600 chars; no usernames.
// Usage: bun quiz/scripts/build-items.ts ~/.trina/know-raw
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const K = process.argv[2]!
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민|특검|대법|판사|김민석|투표|기소|장관|의원/
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
const ko = items.filter((x) => x.lang === 'ko' && (POL.test(x.title) || POL.test(x.human)))
const unfair = items.filter((x) => !fair(x.rawHuman, x.rawAi))
const keep = items.filter((x) => !ko.includes(x) && !unfair.includes(x)).map(({ rawHuman, rawAi, ...x }) => x)
writeFileSync(new URL('../src/items.json', import.meta.url), JSON.stringify(keep))
for (const [l, k] of [['en', 'comment'], ['en', 'post'], ['ko', 'comment'], ['ko', 'post']]) console.log(`${l} ${k}: ${keep.filter((x) => x.lang === l && x.kind === k).length}`)
console.log(`dropped as political: ${ko.length}, dropped because only one side would be cut: ${unfair.length}`)
