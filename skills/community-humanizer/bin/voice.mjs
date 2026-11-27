#!/usr/bin/env node
// Writes a reply or a post the way regulars in that community write. It never posts anything.
//   community-humanizer reply <reddit or clien post url> [--point "what you want to say"] [--fact "something that really happened to you"] [--json]
//   community-humanizer post --to r/<sub> | clien/<board> --title "..." --notes "your point, in a few lines" [--json]
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { claude, block, rng } from '../lib/claude.mjs'
import * as reddit from '../lib/reddit.mjs'
import * as clien from '../lib/clien.mjs'
import { LABEL, GUARD, ADDED, types, replyPrompt, replyPick, postPrompt } from '../lib/prompts.mjs'
import * as profiles from '../lib/profile.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE = join(homedir(), '.cache', 'community-humanizer')
mkdirSync(CACHE, { recursive: true })
const args = process.argv.slice(2)
const cmd = args[0]
const flag = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined)
const asJson = args.includes('--json')
const refresh = args.includes('--refresh') // read the community again instead of using the week-old copy
// the writer: Opus by default (equal or better on every held-out set, 2026-11-27); --fast uses Sonnet, the model in the main tables
const WRITER = args.includes('--fast') ? 'sonnet' : 'opus'
const log = (s) => { if (!asJson) console.error(s) }
const fail = (s) => { console.error(s); process.exit(1) }
const USAGE = `Usage:
  community-humanizer reply <reddit or clien post url> [--point "what you want to say"] [--fact "something that really happened to you"] [--fast] [--refresh] [--json]
  community-humanizer post --to r/<subreddit> | clien/<board> --title "..." --notes "your point, in a few lines" [--fast] [--refresh] [--json]
  community-humanizer profile r/<subreddit> | clien/<board>   measure a community and write its profile, for a PR
--fast writes with Sonnet instead of Opus: cheaper and quicker, and a little less human on most tests.
--refresh reads the community again instead of using the copy saved in the last week.
Nothing is ever posted. Read the draft, change what you want, and post it yourself.`

async function political(title, body) {
  const a = await claude('haiku', GUARD(title, body))
  return !/^\s*no\b/i.test(a) // anything but a clear no counts as political
}

// comments from the community, labelled by type, cached for a week
async function labelled(key, fetchComments) {
  const f = join(CACHE, `${key}.v2.json`)
  if (!refresh && existsSync(f) && Date.now() - statSync(f).mtimeMs < 7 * 864e5) return JSON.parse(readFileSync(f, 'utf8'))
  const top = (await fetchComments()).slice(0, 160)
  log(`Labelling ${top.length} comments by type...`)
  for (let i = 0; i < top.length; i += 40) {
    const batch = top.slice(i, i + 40)
    try {
      const res = await claude('sonnet', `${LABEL}\n\n${batch.map((c, k) => `[${k + 1}] ${c.body.slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`)
      const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
      batch.forEach((c, k) => { c.type = j[String(k + 1)] })
    } catch {}
  }
  const out = top.filter((c) => c.type)
  writeFileSync(f, JSON.stringify(out))
  return out
}

function drawTypes(seed, rates, defs, examples) {
  const r = rng(seed), kinds = []
  const left = new Map(Object.entries(rates).filter(([t, v]) => defs[t] && v > 0 && examples(t).length >= 2))
  while (kinds.length < 3 && left.size) {
    let x = r() * [...left.values()].reduce((a, b) => a + b, 0)
    for (const [t, v] of left) { x -= v; if (x <= 0) { kinds.push(t); left.delete(t); break } }
  }
  return kinds
}

// rules from the community profile: refuse where AI-written content is banned, remind about self-promotion rules
function checkRules(profile, lang) {
  const r = profile?.rules
  if (!r) return
  if (r.ai_content === 'banned') fail(lang === 'en'
    ? `${profile.community} bans AI-written content (${r.ai_rules.join('; ')}). community-humanizer does not write for it. Rules: ${r.source}`
    : `${profile.community}은 AI로 쓴 글을 금지해요(${r.ai_rules.join('; ')}). community-humanizer는 여기에는 쓰지 않아요. 규칙: ${r.source}`)
  if (r.self_promotion_rules?.length) log(lang === 'en'
    ? `Heads up: ${profile.community} has rules on self-promotion (${r.self_promotion_rules.join('; ')}). ${r.source}`
    : `참고: ${profile.community}에는 홍보 규칙이 있어요(${r.self_promotion_rules.join('; ')}). ${r.source}`)
  for (const n of r.notes ?? []) log(n)
}

async function reply() {
  const url = args.find((a) => /reddit\.com|clien\.net/.test(a))
  if (!url) fail(USAGE)
  const fact = flag('--fact'), point = flag('--point')
  const rd = reddit.parseUrl(url), cl = clien.parseUrl(url)
  if (!rd && !cl) fail('Only Reddit and Clien post links work for now.')
  const lang = rd ? 'en' : 'ko'
  const p = rd ? await reddit.post(rd.id) : await clien.post(cl.board, cl.id)
  if (await political(p.title, p.body)) fail(lang === 'en' ? 'This looks like a political thread. community-humanizer does not write for political threads.' : '정치 글로 보여요. community-humanizer는 정치 글에는 쓰지 않아요.')
  const profile = rd ? profiles.load('reddit', p.sub) : profiles.load('clien', p.board)
  checkRules(profile, lang)
  const key = rd ? `reddit-${p.sub.toLowerCase()}` : `clien-${p.board}`
  const pool = (await labelled(key, () => (rd ? reddit.comments(p.sub, p.id, log) : clien.comments(p.board, p.id, log)))).filter((c) => c.thread !== p.id)
  const defs = types(lang, fact)
  // comment-type rates: the community profile if there is one, else counted from the comments just read, else the average
  const fallback = profiles.defaults(lang)
  let rates = profile?.comments?.types
  if (!rates) {
    if (pool.length < 40) log(`Only ${pool.length} usable comments here; using average type rates.`)
    rates = pool.length >= 40 ? Object.fromEntries(Object.keys(fallback).map((t) => [t, pool.filter((c) => c.type === t).length / pool.length])) : fallback
    log('This community has no profile yet. Run "community-humanizer profile" for it and send the file as a PR.')
  }
  if (fact) rates = { ...rates, anecdote: rates.anecdote || 0.1 }
  const examples = (t) => pool.filter((c) => c.type === t).slice(0, 6).map((c) => c.body.slice(0, 400))
  const kinds = drawTypes(p.id, rates, defs, examples)
  if (!kinds.length) fail('Not enough real comments in this community to learn from yet.')
  log(`Writing ${kinds.length} drafts (${kinds.join(', ')})...`)
  const drafts = await Promise.all(kinds.map((t) => claude(WRITER, replyPrompt(lang, p, t, examples(t), fact, block, point))))
  const pick = await claude('haiku', replyPick(lang, p, drafts, block))
  const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
  return { kind: 'reply', community: rd ? `r/${p.sub}` : `클리앙 ${p.boardName}`, post: url, pick: k, drafts: drafts.map((text, i) => ({ type: kinds[i], text })) }
}

async function post() {
  const to = flag('--to'), title = flag('--title'), notes = flag('--notes')
  if (!to || !title || !notes) fail(USAGE)
  const sub = to.match(/^r\/([A-Za-z0-9_]+)$/)?.[1], board = to.match(/^clien\/([a-z_]+)$/i)?.[1]
  if (!sub && !board) fail('--to takes r/<subreddit> or clien/<board>, for example r/selfhosted or clien/park.')
  if (await political(title, notes)) fail(sub ? 'This looks political. community-humanizer does not write political posts.' : '정치 글로 보여요. community-humanizer는 정치 글은 쓰지 않아요.')
  const lang = sub ? 'en' : 'ko'
  checkRules(sub ? profiles.load('reddit', sub) : profiles.load('clien', board), lang)
  const place = sub ? `r/${sub}` : `클리앙 ${await clien.boardName(board)}`
  // real posts of the community, cached for a week like the comments
  const pf = join(CACHE, `${sub ? `reddit-${sub.toLowerCase()}` : `clien-${board}`}.posts.json`)
  const samples = !refresh && existsSync(pf) && Date.now() - statSync(pf).mtimeMs < 7 * 864e5 ? JSON.parse(readFileSync(pf, 'utf8')) : await (sub ? reddit.posts(sub, log) : clien.posts(board, log))
  writeFileSync(pf, JSON.stringify(samples))
  if (samples.length < 3) fail('Not enough real posts in this community to learn from yet.')
  // the post must say only what the notes say: check, write once more if needed, and show what is still added
  const added = async (draft) => { try { const r = await claude('sonnet', ADDED(title, notes, draft)); return JSON.parse(r.slice(r.indexOf('{'), r.lastIndexOf('}') + 1)).added.filter(Boolean) } catch { return null } }
  log('Writing the post...')
  let text = await claude(WRITER, postPrompt(lang, place, title, notes, samples, block))
  let extra = await added(text)
  if (extra && extra.length) {
    log('Writing it once more: the first draft added things that are not in the notes...')
    const again = await claude(WRITER, postPrompt(lang, place, title, notes, samples, block))
    const extra2 = await added(again)
    if (extra2 && extra2.length < extra.length) { text = again; extra = extra2 }
  }
  return { kind: 'post', community: place, title, pick: 0, drafts: [{ type: 'post', text }], notInNotes: extra }
}

// measure a community and write communities/<platform>/<name>.json, keeping the rules already written there
async function profile() {
  const to = args[1]
  const sub = to?.match(/^r\/([A-Za-z0-9_]+)$/)?.[1], board = to?.match(/^clien\/([a-z_]+)$/i)?.[1]
  if (!sub && !board) fail('Usage: community-humanizer profile r/<subreddit> | clien/<board>')
  const lang = sub ? 'en' : 'ko'
  const key = sub ? `reddit-${sub.toLowerCase()}` : `clien-${board}`
  const pool = await labelled(key, () => (sub ? reddit.comments(sub, null, log) : clien.comments(board, null, log)))
  const posts = sub ? await reddit.posts(sub, log, 40) : await clien.posts(board, log, 30)
  const community = sub ? `r/${sub}` : `클리앙 ${await clien.boardName(board)}`
  const p = profiles.build({ platform: sub ? 'reddit' : 'clien', name: sub ?? board, community, lang, comments: pool, posts })
  const f = profiles.save(p, sub ? 'reddit' : 'clien', sub ?? board)
  console.log(`Wrote ${f} (${p.comments.n} comments, ${p.posts.n} posts).`)
  console.log(`Next: read ${p.rules.source}, fill in the rules part (does it ban AI-written content? its self-promotion rules?), then open a PR.`)
}

if (cmd === 'profile') { await profile(); process.exit(0) }
if (cmd !== 'reply' && cmd !== 'post') fail(USAGE)
const res = cmd === 'reply' ? await reply() : await post()
if (asJson) console.log(JSON.stringify(res, null, 1))
else {
  console.log(res.drafts[res.pick].text)
  const rest = res.drafts.filter((_, i) => i !== res.pick)
  if (rest.length) { console.error('\n--- other drafts ---'); for (const d of rest) console.error(`[${d.type}] ${d.text}\n`) }
  if (res.kind === 'post' && res.notInNotes === null) console.error('\n(Could not check the post against your notes this time. Read it for anything you did not say.)')
  if (res.notInNotes?.length) { console.error('\n--- not in your notes: remove or fix these if they aren\'t true for you ---'); for (const s of res.notInNotes) console.error(`- ${s}`) }
  console.error('Nothing was posted. Read it, change what you want, and post it yourself.')
}
