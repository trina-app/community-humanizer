// Reddit through the Arctic Shift archive (free, no key). Threads 2-14 days old, so their scores have settled.
import { sleep } from './claude.mjs'

const API = 'https://arctic-shift.photon-reddit.com/api'

async function get(path) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(API + path, { signal: AbortSignal.timeout(60_000) })
      const j = await r.json()
      if (Array.isArray(j?.data)) return j.data
    } catch {}
    await sleep(3000 * (i + 1)) // the archive asks callers to slow down under load
  }
  throw new Error(`The Reddit archive (Arctic Shift) did not answer. Try again in a minute.`)
}

export function parseUrl(url) {
  const m = url.match(/reddit\.com\/r\/([^/]+)\/comments\/([a-z0-9]+)/i)
  return m ? { sub: m[1], id: m[2] } : null
}

export async function post(id) {
  const p = (await get(`/posts/ids?ids=${id}`))[0]
  if (!p) throw new Error('That post is not in the archive yet. Try again in a few minutes.')
  return { id, sub: p.subreddit, author: p.author, title: p.title, body: String(p.selftext ?? '').slice(0, 1500) }
}

async function recentPosts(sub, skip) {
  const now = Math.floor(Date.now() / 1000)
  const ps = await get(`/posts/search?subreddit=${sub}&after=${now - 30 * 86400}&before=${now - 2 * 86400}&limit=100&sort=desc&fields=id,title,selftext,num_comments,author`)
  return ps.filter((p) => p.id !== skip)
}

// top-level comments with 2+ points from the ten busiest recent threads, never the thread being answered
export async function comments(sub, skip, log) {
  log(`Reading recent r/${sub} threads...`)
  const threads = (await recentPosts(sub, skip)).filter((p) => p.num_comments >= 10).sort((a, b) => b.num_comments - a.num_comments).slice(0, 10)
  const out = []
  for (const t of threads) {
    const tree = await get(`/comments/tree?link_id=t3_${t.id}&limit=200`)
    for (const c of tree.map((x) => x?.data).filter(Boolean)) {
      if (!c.body || /^\[(removed|deleted)\]/.test(c.body) || c.author === t.author || c.author === 'AutoModerator' || c.author === '[deleted]' || (c.score ?? 0) < 2) continue
      out.push({ thread: t.id, score: c.score, body: String(c.body) })
    }
    await sleep(1500)
  }
  return out.sort((a, b) => b.score - a.score)
}

// bodies of real posts in the subreddit, for writing a post
export async function posts(sub, log, n = 6) {
  log(`Reading recent r/${sub} posts...`)
  return (await recentPosts(sub))
    .filter((p) => p.selftext && !/\[(removed|deleted)\]/.test(p.selftext) && p.selftext.split(/\s+/).length >= 30 && p.num_comments >= 5)
    .sort((a, b) => b.num_comments - a.num_comments)
    .slice(0, n)
    .map((p) => String(p.selftext).trim().slice(0, 900))
}
