// Round 5 (dev set): round 3 plus a target length per draft, drawn from the word counts of real comments in the same subreddit (other threads).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const types: Record<string, string> = JSON.parse(readFileSync(join(D, 'types.json'), 'utf8'))
const raw = JSON.parse(readFileSync(join(D, 'bd/comments.json'), 'utf8')) as any[]
mkdirSync(join(D, 'replies'), { recursive: true })
mkdirSync(join(D, 'drafts'), { recursive: true })
const subOf = (c: any) => c.input.url.match(/\/r\/([^/]+)\//)[1]
const idOf = (c: any) => c.input.url.match(/\/comments\/([^/]+)/)[1]
const testIds = new Set(posts.map((p) => p.id))
const pool = raw.filter((c) => types[c.comment_id] && !testIds.has(idOf(c)) && c.num_upvotes >= 2)

const DEF: Record<string, string> = {
  'answer': 'an answer with a bit of explanation or advice',
  'one-liner': 'a very short answer: a name, a tool, a link or a few words',

  'disagree': 'pushing back on the post or its premise',
  'question-back': 'mainly a question back to the poster',
  'side-point': 'something related that the post did not ask about',
  'agree': 'agreeing, "same here", with little more',
  'joke': 'a joke, sarcasm or a quip',
  'complaint': 'venting about the thing the post is about',
}
const persona = (sub: string) => `You're a regular in r/${sub}, replying in between other things. You don't try hard and you're not trying to convince anyone. Most replies here are short, often a few words or a sentence or two, so say the one thing you'd actually say, typed the way you'd type it. You don't know everything and don't pretend to; skip anything you'd have to look up. Never make up personal stories, past jobs, things that happened to you or numbers you didn't get from the post. Dry and a bit funny when it fits. Being blunt or disagreeing is fine. No greeting, no wrap-up, no list of tips, and you often skip the final period.`
const post = (p: any) => `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()

function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 2 ** 32) }
function drawTypes(p: any, k: number): string[] {
  const rate = new Map<string, number>()
  for (const c of pool) if (subOf(c) === p.sub && DEF[types[c.comment_id]!]) rate.set(types[c.comment_id]!, (rate.get(types[c.comment_id]!) ?? 0) + 1)
  const r = rng(p.id), out: string[] = []
  while (out.length < k && rate.size) {
    const total = [...rate.values()].reduce((a, b) => a + b, 0)
    let x = r() * total
    for (const [t, n] of rate) { x -= n; if (x <= 0) { out.push(t); rate.delete(t); break } }
  }
  return out
}
const examples = (sub: string, type: string) => pool.filter((c) => subOf(c) === sub && types[c.comment_id] === type).sort((a, b) => b.num_upvotes - a.num_upvotes).slice(0, 6).map((c) => String(c.comment).slice(0, 400))

async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 2; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const o = await new Response(r.stdout).text()
    await r.exited
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}

const lengths = (sub: string) => pool.filter((c) => subOf(c) === sub).map((c) => String(c.comment).split(/\s+/).filter(Boolean).length)
const drawLength = (p: any, k: number) => { const ls = lengths(p.sub), r = rng(`${p.id}:len:${k}`); return ls[Math.floor(r() * ls.length)]! }
const draft = (p: any, t: string, n: number) => claude('sonnet', `${post(p)}\n\nWrite a reply to this Reddit post.\n\n${persona(p.sub)}\n\nWrite it as ${DEF[t]}. Use about ${n} words${n <= 12 ? ' (yes, that short)' : ''}, never more than ${Math.ceil(n * 1.3)}.\n\nReal comments of that kind from other r/${p.sub} threads, to match how people here write it (don't copy their content):\n${examples(p.sub, t).map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}\n\nReply with the comment text only.`)
mkdirSync(join(D, 'drafts5'), { recursive: true })

const jobs: (() => Promise<void>)[] = []
for (const p of posts) {
  const f5 = join(D, 'replies', `${p.id}__SKILL5.txt`)
  if (!existsSync(f5)) jobs.push(async () => {
    const kinds = drawTypes(p, 3)
    const ns = kinds.map((_, k) => drawLength(p, k))
    const drafts = await Promise.all(kinds.map((t, k) => draft(p, t, ns[k]!)))
    const pick = await claude('haiku', `${post(p)}\n\nHere are ${drafts.length} replies. Which one reads most like a real r/${p.sub} commenter wrote it, not an AI? Answer with the number only.\n\n${drafts.map((d, i) => `[${i + 1}] ${d}`).join('\n\n')}`)
    const k = Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
    writeFileSync(join(D, 'drafts5', `${p.id}.json`), JSON.stringify({ kinds, lengths: ns, drafts, pick: k }, null, 1))
    writeFileSync(f5, drafts[k]!)
  })
}
let i = 0
await Promise.all(Array.from({ length: 4 }, async () => { while (i < jobs.length) { const j = jobs[i++]!; try { await j() } catch (e) { console.log(String(e)) } } }))
console.log(`ran ${jobs.length} jobs`)
