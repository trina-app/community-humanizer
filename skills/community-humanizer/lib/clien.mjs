// Clien (clien.net) through its public pages, one request every 2 seconds. Usernames are never kept.
import { sleep } from './claude.mjs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
const text = (h) => decode(h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')

async function html(url) {
  for (let i = 0; i < 4; i++) {
    await sleep(2000)
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) }); if (r.ok) return await r.text() } catch {}
    await sleep(5000)
  }
  throw new Error(`Clien did not answer: ${url}`)
}

export function parseUrl(url) {
  const m = url.match(/clien\.net\/service\/board\/([a-z_]+)\/(\d+)/i)
  return m ? { board: m[1], id: m[2] } : null
}

function parsePost(h) {
  const title = decode(h.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? '').replace(/\s*:\s*클리앙\s*$/, '')
  const boardName = text(h.match(/class="board_name"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '')
  const s = h.indexOf('class="post_article"'), e = h.indexOf('class="post_writer"', s)
  const body = s > 0 ? text(h.slice(h.indexOf('>', s) + 1, e > s ? h.lastIndexOf('<', e) : s + 20000)) : ''
  const op = h.match(/articleSingo\('([^']+)'\)/)?.[1] ?? ''
  const rows = [...h.matchAll(/<div class="(comment_row[^"]*)" data-role="comment-row" data-author-id="([^"]*)" data-comment-sn="(\d+)"/g)]
  const comments = rows.map((m, i) => {
    const chunk = h.slice(m.index, rows[i + 1]?.index ?? h.length)
    const likes = Number(chunk.match(new RegExp(`setLikeCount_${m[3]}"[^>]*>(\\d+)<`))?.[1] ?? 0)
    const t = chunk.match(/<div class="comment_view"[\s\S]*?<input type="hidden" value="([^"]*)"/)?.[1]
    return { likes, reply: /\bre\b/.test(m[1]), op: m[2] === op, body: t ? decode(t).trim() : '' }
  }).filter((c) => c.body)
  return { title, boardName, body: body.slice(0, 1500), comments }
}

export async function post(board, id) {
  const p = parsePost(await html(`https://www.clien.net/service/board/${board}/${id}`))
  return { id, board, boardName: p.boardName || board, title: p.title, body: p.body }
}

async function threads(board, skip) {
  const out = []
  for (let po = 1; po <= 8; po++) {
    const h = await html(`https://www.clien.net/service/board/${board}?&od=T31&po=${po}`)
    for (const blk of h.split('class="list_item').slice(1)) {
      const id = blk.match(new RegExp(`/service/board/${board}/(\\d+)`))?.[1]
      const n = Number(blk.match(/data-comment-count=(\d+)/)?.[1] ?? 0)
      if (id && id !== skip) out.push({ id, n })
    }
  }
  return out
}

// top-level comments with 1+ 공감 from the ten busiest threads on the board's recent pages, never the thread being answered
export async function comments(board, skip, log) {
  log(`Reading recent 클리앙 ${board} threads...`)
  const ts = (await threads(board, skip)).filter((t) => t.n >= 6).sort((a, b) => b.n - a.n).slice(0, 10)
  const out = []
  for (const t of ts) {
    const p = parsePost(await html(`https://www.clien.net/service/board/${board}/${t.id}`))
    for (const c of p.comments) if (!c.reply && !c.op && c.body.length >= 2 && c.likes >= 1) out.push({ thread: t.id, score: c.likes, body: c.body })
  }
  return out.sort((a, b) => b.score - a.score)
}

export async function posts(board, log, n = 6) {
  log(`Reading recent 클리앙 ${board} posts...`)
  const ts = (await threads(board)).filter((t) => t.n >= 6).sort((a, b) => b.n - a.n).slice(0, n * 2)
  const out = []
  for (const t of ts) {
    if (out.length >= n) break
    const p = parsePost(await html(`https://www.clien.net/service/board/${board}/${t.id}`))
    if (p.body.length >= 60) out.push(p.body.slice(0, 900))
  }
  return out
}

export async function boardName(board) {
  const h = await html(`https://www.clien.net/service/board/${board}`)
  return text(h.match(/class="board_name"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '') || board
}
