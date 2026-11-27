// Held-out posts for confirming any post-prompt changes (never used while tuning). English from Arctic Shift (11/1-11/11),
// Korean from older Clien list pages; same filters as build.ts. Usernames are not kept.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const used = new Set((JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]).map((p) => p.id))
const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const QUESTION = /\?|^(how|what|which|any|is|are|should|does|do|can|best|looking for|need)\b/i
const out: any[] = []
async function arctic(path: string): Promise<any[]> {
  for (let i = 0; i < 6; i++) { await Bun.sleep(1500); try { const j = await (await fetch('https://arctic-shift.photon-reddit.com/api' + path, { signal: AbortSignal.timeout(60_000) })).json(); if (Array.isArray(j?.data)) return j.data } catch {} await Bun.sleep(5000 * (i + 1)) }
  return []
}
const a = Math.floor(Date.parse('2026-11-01T00:00:00Z') / 1000), b = Math.floor(Date.parse('2026-11-12T00:00:00Z') / 1000)
for (const sub of ['smallbusiness', 'SaaS', 'selfhosted', 'ClaudeAI', 'startups']) {
  const ps = await arctic(`/posts/search?subreddit=${sub}&after=${a}&before=${b}&limit=100&sort=desc&fields=id,title,selftext,num_comments`)
  const ok = ps.filter((p) => !used.has(p.id) && p.num_comments >= 10 && QUESTION.test(p.title) && p.selftext && !/\[(removed|deleted)\]/.test(p.selftext) && words(p.selftext) >= 60 && words(p.selftext) <= 400).sort((x, y) => y.num_comments - x.num_comments).slice(0, 6)
  for (const p of ok) out.push({ id: p.id, lang: 'en', place: `r/${sub}`, group: sub, title: p.title, body: String(p.selftext).trim() })
  console.log(`${sub}: ${ok.length}`)
}
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const KQ = /\?|나요|까요|는지|어떻게|어떤|추천|궁금/
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const strip = (s: string) => decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
async function html(url: string) { for (let i = 0; i < 4; i++) { await Bun.sleep(2000); try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) }); if (r.ok) return await r.text() } catch {} await Bun.sleep(5000) } return '' }
for (const [board, name, from, to, min] of [['park', '클리앙 모두의공원', 61, 110, 15], ['kin', '클리앙 아무거나질문', 26, 50, 6]] as const) {
  const cands: any[] = []
  for (let po = from; po <= to; po++) {
    const h = await html(`https://www.clien.net/service/board/${board}?&od=T31&po=${po}`)
    for (const blk of h.split('class="list_item').slice(1)) {
      const id = blk.match(new RegExp(`/service/board/${board}/(\\d+)`))?.[1]
      const title = decode(blk.match(/data-role="list-title-text"[^>]*title="([^"]*)"/)?.[1] ?? '')
      const n = Number(blk.match(/data-comment-count=(\d+)/)?.[1] ?? 0)
      if (id && !used.has(id) && title && KQ.test(title) && !POL.test(title) && n >= min) cands.push({ id, title, n })
    }
  }
  let got = 0
  for (const c of cands.sort((x, y) => y.n - x.n)) {
    if (got >= 15) break
    const h = await html(`https://www.clien.net/service/board/${board}/${c.id}`)
    const s = h.indexOf('class="post_article"'), e = h.indexOf('class="post_writer"', s)
    const body = s > 0 ? strip(h.slice(h.indexOf('>', s) + 1, e > s ? e : s + 20000).replace(/<div class="post_[\s\S]*$/, '')) : ''
    if (body.length < 120 || body.length > 1500 || POL.test(body)) continue
    out.push({ id: c.id, lang: 'ko', place: name, group: board, title: c.title, body }); got++
  }
  console.log(`${board}: ${got} (of ${cands.length} candidates)`)
}
const cur = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
for (const p of out) p.samples = cur.filter((q) => q.group === p.group).map((q) => q.body.slice(0, 900)).slice(0, 9)
writeFileSync(join(D, 'holdout.json'), JSON.stringify(out, null, 1))
console.log(`holdout ${out.length}`)
