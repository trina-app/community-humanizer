// Quiz API on Cloudflare Workers + D1. The real side of each pair is derived from a server secret, so the page can't
// work it out; the page learns it only after answering. Sessions and rounds are signed, answers are accepted only for
// pairs the server handed out in that round, and nothing about the person is stored (no IP, no user agent).
//   GET  /api/config             { turnstile: site key or null }
//   GET  /api/round?lang=en|ko|ja|zh|es|id   ten pairs (optionally after a Turnstile check)
//   POST /api/answer             { round, qid, pick: "a" | "b", ms }
//   GET  /api/stats              how often people picked the real one (cached for a minute)
// Secrets: SECRET (required), TURNSTILE_SECRET and TURNSTILE_SITE_KEY (optional).
import ITEMS from './items.json'

const byId = new Map(ITEMS.map((x) => [x.qid, x]))
const enc = new TextEncoder()
const json = (v, init = {}) => new Response(JSON.stringify(v), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) } })
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
async function key(env) { return crypto.subtle.importKey('raw', enc.encode(env.SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) }
async function sign(env, s) { return b64(await crypto.subtle.sign('HMAC', await key(env), enc.encode(s))) }
async function signed(env, value) { return `${value}.${await sign(env, value)}` }
async function unsign(env, token) {
  if (!token || typeof token !== 'string') return null
  const i = token.lastIndexOf('.')
  if (i < 1) return null
  const value = token.slice(0, i)
  return (await sign(env, value)) === token.slice(i + 1) ? value : null
}
// which side the real text is on: one bit of a keyed hash, fixed per session and pair
async function humanSide(env, s, qid) { const h = await crypto.subtle.sign('HMAC', await key(env), enc.encode(`side:${s}:${qid}`)); return new Uint8Array(h)[0] % 2 === 0 ? 'a' : 'b' }
const cookie = (req) => (req.headers.get('cookie') || '').match(/(?:^|;\s*)s=([^;]+)/)?.[1]

function shuffle(xs) { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]] } return a }

async function turnstileOk(env, req, token) {
  if (!env.TURNSTILE_SECRET) return true
  const form = new FormData()
  form.append('secret', env.TURNSTILE_SECRET); form.append('response', token || '')
  const ip = req.headers.get('cf-connecting-ip'); if (ip) form.append('remoteip', ip) // sent to Cloudflare only, never stored
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  return (await r.json()).success === true
}


// Link previews: the card image and title follow the language, and a shared result (?s=7&n=10&t=12) puts the score in the title.
const OG = {
  en: { title: 'Spot the AI', desc: 'Two replies from a real thread. One was written by a person. Can you tell which?', shared: (s, n, x) => `${s}/${n} right, top ${x}%. Can you spot the AI?` },
  ko: { title: 'AI가 쓴 댓글 찾기', desc: '실제 글에 달린 댓글 두 개, 하나는 사람이 썼어요. 어느 쪽일까요?', shared: (s, n, x) => `${n}문제 중 ${s}개, 상위 ${x}%. AI가 쓴 댓글, 찾을 수 있어요?` },
  ja: { title: 'AIが書いたのはどっち？', desc: '本物のスレッドの返信2つ。片方は人が書きました。どっちでしょう？', shared: (s, n, x) => `${n}問中${s}問正解、上位${x}%。AIが書いたのはどっち？` },
  zh: { title: '找出 AI 写的回复', desc: '同一个帖子下的两条回复，其中一条是真人写的。你能分辨吗？', shared: (s, n, x) => `${n} 题答对 ${s} 题，前 ${x}%。你能找出 AI 写的回复吗？` },
  es: { title: 'Encuentra la IA', desc: 'Dos respuestas de un hilo real. Una la escribió una persona. ¿Cuál?', shared: (s, n, x) => `${s} de ${n}, top ${x}\u00a0%. ¿Encuentras la IA?` },
  id: { title: 'Temukan balasan AI', desc: 'Dua balasan dari thread asli. Satu ditulis orang. Yang mana?', shared: (s, n, x) => `Benar ${s} dari ${n}, top ${x}%. Bisa temukan balasan AI?` },
}
function preview(url, res) {
  const lang = OG[url.searchParams.get('lang')] ? url.searchParams.get('lang') : 'en', o = OG[lang]
  const v = ['s', 'n', 't'].map((k) => Number(url.searchParams.get(k))), [sc, n, x] = v
  const ok = v.every(Number.isInteger) && n > 0 && n <= 10 && sc >= 0 && sc <= n && x >= 1 && x <= 99
  const title = ok ? o.shared(sc, n, x) : o.title
  const set = (v) => ({ element: (e) => e.setAttribute('content', v) })
  return new HTMLRewriter()
    .on('title', { element: (e) => e.setInnerContent(title) })
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(o.desc))
    .on('meta[name="description"]', set(o.desc))
    .on('meta[property="og:image"]', set(`${url.origin}/og/${lang}.png`))
    .on('meta[property="og:url"]', set(url.href))
    .transform(res)
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname === '/api/config') return json({ turnstile: env.TURNSTILE_SITE_KEY || null })

    if (url.pathname === '/api/round' && req.method === 'GET') {
      if (!(await turnstileOk(env, req, url.searchParams.get('cf')))) return json({ error: 'Check failed. Reload the page.' }, { status: 403 })
      const lang = ['ko', 'ja', 'zh', 'es', 'id'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'en'
      let s = await unsign(env, decodeURIComponent(cookie(req) || ''))
      const headers = {}
      if (!s) { s = crypto.randomUUID(); headers['set-cookie'] = `s=${encodeURIComponent(await signed(env, s))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly` }
      const pool = ITEMS.filter((x) => x.lang === lang)
      // the hardest half of each kind (x.d: AI side's human score minus the real side's), then a random draw from it
      const hardest = (xs, n) => shuffle(xs.sort((a, b) => b.d - a.d).slice(0, Math.max(n, Math.ceil(xs.length / 2)))).slice(0, n)
      // 6 comments and 4 posts; languages without posts get 10 comments
      const posts = hardest(pool.filter((x) => x.kind === 'post'), 4)
      const picked = shuffle([...hardest(pool.filter((x) => x.kind === 'comment'), 10 - posts.length), ...posts])
      const round = await signed(env, `${s}|${Date.now()}|${picked.map((x) => x.qid).join(',')}`)
      const items = []
      for (const x of picked) {
        const side = await humanSide(env, s, x.qid)
        items.push({ qid: x.qid, kind: x.kind, place: x.place, title: x.title, body: x.body, a: side === 'a' ? x.human : x.ai, b: side === 'a' ? x.ai : x.human })
      }
      return json({ round, items }, { headers })
    }

    if (url.pathname === '/api/answer' && req.method === 'POST') {
      const s = await unsign(env, decodeURIComponent(cookie(req) || ''))
      if (!s) return json({ error: 'Start a round first.' }, { status: 400 })
      let body
      try { body = await req.json() } catch { return json({ error: 'Bad request.' }, { status: 400 }) }
      const round = await unsign(env, body.round)
      const [rs, rt, rq] = (round || '').split('|')
      const x = byId.get(String(body.qid))
      if (!round || rs !== s || Date.now() - Number(rt) > 3600_000 || !rq.split(',').includes(String(body.qid)) || !x || !['a', 'b'].includes(body.pick)) return json({ error: 'Bad request.' }, { status: 400 })
      const side = await humanSide(env, s, x.qid)
      const correct = body.pick === side ? 1 : 0
      const ms = Math.max(0, Math.min(600000, Number(body.ms) || 0))
      await env.DB.prepare('INSERT OR IGNORE INTO answers (session, qid, lang, kind, correct, ms, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(s, x.qid, x.lang, x.kind, correct, ms, Date.now()).run()
      const agg = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(correct) AS right FROM answers WHERE qid = ?').bind(x.qid).first()
      return json({ correct: !!correct, human: side, url: x.url, scores: x.scores, crowd: { n: agg?.n ?? 0, right: agg?.right ?? 0 } })
    }

    if (url.pathname === '/api/stats' && req.method === 'GET') {
      const cache = caches.default, hit = await cache.match(req)
      if (hit) return hit
      // answers faster than 1.5 s are left out: nobody reads two replies that fast
      const rows = await env.DB.prepare('SELECT lang, kind, COUNT(*) AS n, SUM(correct) AS right, COUNT(DISTINCT session) AS people FROM answers WHERE ms >= 1500 GROUP BY lang, kind').all()
      const all = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(correct) AS right, COUNT(DISTINCT session) AS people FROM answers WHERE ms >= 1500').first()
      const res = json({ all, by: rows.results }, { headers: { 'cache-control': 'public, max-age=60' } })
      ctx.waitUntil(cache.put(req, res.clone()))
      return res
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return preview(url, await env.ASSETS.fetch(req))
    return env.ASSETS.fetch(req)
  },
}
