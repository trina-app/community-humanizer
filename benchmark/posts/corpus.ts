// Style corpus for tuning (never the held-out posts): English posts 11/12-11/24 from Arctic Shift, Korean Clien posts from
// the pages read for the test. Bodies only, no usernames. Output corpus.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const hold = new Set((JSON.parse(readFileSync(join(D, 'holdout.json'), 'utf8')) as any[]).map((p) => p.id))
const out: any[] = []
async function arctic(path: string): Promise<any[]> { for (let i = 0; i < 6; i++) { await Bun.sleep(1500); try { const j = await (await fetch('https://arctic-shift.photon-reddit.com/api' + path, { signal: AbortSignal.timeout(60_000) })).json(); if (Array.isArray(j?.data)) return j.data } catch {} await Bun.sleep(5000 * (i + 1)) } return [] }
const a = Math.floor(Date.parse('2026-11-12T00:00:00Z') / 1000), b = Math.floor(Date.parse('2026-11-25T00:00:00Z') / 1000)
for (const sub of ['smallbusiness', 'SaaS', 'selfhosted', 'ClaudeAI', 'startups']) {
  let before = b, got: any[] = []
  for (let page = 0; page < 6 && got.length < 400; page++) { const ps = await arctic(`/posts/search?subreddit=${sub}&after=${a}&before=${before}&limit=100&sort=desc&fields=id,title,selftext,num_comments,created_utc`); if (!ps.length) break; got.push(...ps); before = ps[ps.length - 1].created_utc }
  const ok = got.filter((p) => !hold.has(p.id) && p.num_comments >= 5 && p.selftext && !/\[(removed|deleted)\]/.test(p.selftext) && p.selftext.split(/\s+/).length >= 30).sort((x, y) => y.num_comments - x.num_comments).slice(0, 60)
  for (const p of ok) out.push({ lang: 'en', group: sub, title: p.title, body: String(p.selftext).trim() })
  console.log(`${sub}: ${ok.length}`)
}
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const cleanKo = (h: string) => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
const cands = (JSON.parse(readFileSync(join(D, '..', 'korean-voice-test', 'cands.json'), 'utf8')) as any[]).filter((c) => !hold.has(c.id) && !POL.test(c.title))
for (const board of ['park', 'kin']) {
  let got = 0
  for (const c of cands.filter((c) => c.board === board).sort((x, y) => y.replies - x.replies)) {
    if (got >= 75) break
    await Bun.sleep(2000)
    let h = ''
    try { const r = await fetch(`https://www.clien.net/service/board/${board}/${c.id}`, { headers: { 'User-Agent': UA } }); if (r.ok) h = await r.text() } catch {}
    const s = h.indexOf('class="post_article"'); if (s < 0) continue
    const e = h.indexOf('class="post_writer"', s)
    const body = cleanKo(h.slice(h.indexOf('>', s) + 1, e > s ? h.lastIndexOf('<', e) : s + 20000))
    if (body.length < 60 || POL.test(body)) continue
    out.push({ lang: 'ko', group: board, title: c.title, body }); got++
  }
  console.log(`${board}: ${got}`)
}
writeFileSync(join(D, 'corpus.json'), JSON.stringify(out, null, 1))
console.log(`corpus ${out.length}`)
