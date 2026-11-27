// Korean test posts (PROTOCOL.md): Clien 모두의공원 (park) and 아무거나질문 (kin), plain HTTP with 2 s between requests.
// Writes raw/<board>-<id>.json per thread (no usernames kept), then posts.json with up to 14 test posts per board.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const BOARDS = [
  { board: 'park', name: '모두의공원', pages: [10, 60], minComments: 15, minLikes: 2 },
  { board: 'kin', name: '아무거나질문', pages: [1, 25], minComments: 6, minLikes: 1 },
]
const QUESTION = /\?|나요|까요|는지|어떻게|어떤|추천|궁금/
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const strip = (s: string) => decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()

async function html(url: string): Promise<string> {
  for (let i = 0; i < 4; i++) {
    await Bun.sleep(2000)
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) }); if (r.ok) return await r.text() } catch {}
    await Bun.sleep(5000 * (i + 1))
  }
  throw new Error(url)
}

type C = { likes: number; reply: boolean; op: boolean; body: string }
function parsePost(h: string) {
  const title = strip(h.match(/<h3 class="post_subject"[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '')
  const a = h.indexOf('class="post_article"'), b = h.indexOf('class="post_writer"', a)
  const body = a > 0 ? strip(h.slice(h.indexOf('>', a) + 1, b > a ? b : a + 20000).replace(/<div class="post_[\s\S]*$/, '')) : ''
  const op = h.match(/articleSingo\('([^']+)'\)/)?.[1] ?? ''
  const rows = [...h.matchAll(/<div class="(comment_row[^"]*)" data-role="comment-row" data-author-id="([^"]*)" data-comment-sn="(\d+)"/g)]
  const comments: C[] = rows.map((m, i) => {
    const chunk = h.slice(m.index!, rows[i + 1]?.index ?? h.length)
    const likes = Number(chunk.match(new RegExp(`setLikeCount_${m[3]}"[^>]*>(\\d+)<`))?.[1] ?? 0)
    const text = chunk.match(/<div class="comment_view"[\s\S]*?<input type="hidden" value="([^"]*)"/)?.[1]
    return { likes, reply: /\bre\b/.test(m[1]!), op: m[2] === op, body: text ? decode(text).trim() : '' }
  }).filter((c) => c.body)
  return { title, body, comments }
}

const cands: any[] = []
for (const B of BOARDS) {
  for (let po = B.pages[0]!; po <= B.pages[1]!; po++) {
    const h = await html(`https://www.clien.net/service/board/${B.board}?&od=T31&po=${po}`)
    for (const block of h.split('class="list_item').slice(1)) {
      const id = block.match(new RegExp(`/service/board/${B.board}/(\\d+)`))?.[1]
      const title = decode(block.match(/data-role="list-title-text"[^>]*title="([^"]*)"/)?.[1] ?? '')
      const replies = Number(block.match(/data-comment-count=(\d+)/)?.[1] ?? 0)
      if (id && title && QUESTION.test(title) && replies >= B.minComments) cands.push({ board: B.board, id, title, replies })
    }
  }
  console.log(`${B.board}: ${cands.filter((c) => c.board === B.board).length} candidates`)
}
const uniq = [...new Map(cands.map((c) => [`${c.board}-${c.id}`, c])).values()]
writeFileSync(join(D, 'cands.json'), JSON.stringify(uniq, null, 1))

// Political threads are left out: writing human-sounding political comments is the use this tool must not serve.
const POL = /국힘|민주당|이재명|잼통|윤석열|윤두창|대통령|정부|탄핵|정치|선거|국회|검찰|조희대|보수|진보|좌파|우파|한동훈|조국|여당|야당|정권|지지율|민생지원금|리박|일베|호남|영남|지역화폐|전국민/
const posts: any[] = []
for (const B of BOARDS) {
  const mine = uniq.filter((c) => c.board === B.board && !POL.test(c.title)).sort((a, b) => b.replies - a.replies).slice(0, 40)
  for (const c of mine) {
    const f = join(D, 'raw', `${c.board}-${c.id}.json`)
    const p = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : parsePost(await html(`https://www.clien.net/service/board/${c.board}/${c.id}`))
    writeFileSync(f, JSON.stringify(p))
    if (posts.filter((x) => x.board === c.board).length >= 14) continue
    const human = p.comments.filter((x: C) => !x.reply && !x.op && x.body.length >= 2 && x.likes >= B.minLikes).sort((a: C, b: C) => b.likes - a.likes)[0]
    if (!human || POL.test(human.body) || POL.test(p.body)) continue
    posts.push({ id: c.id, board: c.board, boardName: B.name, title: c.title, body: p.body.slice(0, 1500), comments: p.comments.length, human: { likes: human.likes, body: human.body } })
  }
}
writeFileSync(join(D, 'posts.json'), JSON.stringify(posts, null, 1))
for (const B of BOARDS) console.log(`${B.board}: ${posts.filter((p) => p.board === B.board).length} test posts`)
