// Round 4 (dev set), after the Opus diagnostic (why.out): plain style, no tidy closers or echoing the post, one point only, less obvious angles (verbalized sampling), drafts picked against a list of tells. SKILL4A = new rules on the round-3 pipeline; SKILL4 = new rules + angles + 5 drafts.
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
const persona = (sub: string) => `You're a regular in r/${sub}, replying in between other things. You don't try hard and you're not trying to convince anyone. Most replies here are short, a few words or a sentence or two. Pick the one part of the post you actually have something to say about and ignore the rest; don't answer every question in it. Bring something of your own: a specific name, tool, setting, number or link, or just a blunt take. Don't repeat the post's details back. Never make up personal stories, past jobs or things that happened to you, and don't hedge about your experience either; just say the thing. Dry humour is fine when it fits, and so is being curt or disagreeing.
Write in normal sentence case with normal punctuation; don't fake casualness with all-lowercase or dropped periods. Don't end on a neat summary, a quotable line, a punchline or a reframe ("X isn't Y, it's Z", "turns out the hard part was..."). Never use "honestly", "the thing nobody mentions", "here's the thing" or three-part rhythms.`
const TELLS = `Signs of AI: a neat quotable closing line or reframe; repeating the post's own details back; answering every question in order; fake casualness (all lowercase, dropped periods, "honestly"); the most obvious, generic answer; no concrete name, number or detail of its own; hedged secondhand experience; three-beat rhythm.`
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
// top comments of every kind, for drafts written from an angle rather than a type
const mixed = (sub: string) => { const seen = new Set<string>(); return pool.filter((c) => subOf(c) === sub).sort((a, b) => b.num_upvotes - a.num_upvotes).filter((c) => { const t = types[c.comment_id]!; if (seen.has(t) && seen.size < 6) return false; seen.add(t); return true }).slice(0, 8).map((c) => String(c.comment).slice(0, 400)) }

async function claude(model: string, text: string): Promise<string> {
  for (let a = 0; a < 2; a++) {
    const r = Bun.spawn(['claude', '-p', text, '--model', model, '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
    const o = await new Response(r.stdout).text()
    await r.exited
    try { const j = JSON.parse(o); if (!j.is_error && j.result) return String(j.result).trim() } catch {}
  }
  throw new Error('claude failed')
}
const samplesBlock = (sub: string, xs: string[]) => `Real comments from other r/${sub} threads, to match how people here write (don't copy their content):\n${xs.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}`
const pickOne = async (p: any, drafts: string[]) => {
  const pick = await claude('haiku', `${post(p)}\n\nHere are ${drafts.length} replies. ${TELLS}\nWhich one reads most like a real r/${p.sub} commenter wrote it? Answer with the number only.\n\n${drafts.map((d, i) => `[${i + 1}] ${d}`).join('\n\n')}`)
  return Math.min(drafts.length, Math.max(1, parseInt(pick.match(/\d+/)?.[0] ?? '1'))) - 1
}
mkdirSync(join(D, 'drafts4'), { recursive: true })

const jobs: (() => Promise<void>)[] = []
for (const p of posts) {
  const fa = join(D, 'replies', `${p.id}__SKILL4A.txt`)
  if (!existsSync(fa)) jobs.push(async () => {
    const kinds = drawTypes(p, 3)
    const drafts = await Promise.all(kinds.map((t) => claude('sonnet', `${post(p)}\n\nWrite a reply to this Reddit post.\n\n${persona(p.sub)}\n\nWrite it as ${DEF[t]}.\n\n${samplesBlock(p.sub, examples(p.sub, t))}\n\nReply with the comment text only.`)))
    const k = await pickOne(p, drafts)
    writeFileSync(join(D, 'drafts4', `${p.id}.a.json`), JSON.stringify({ kinds, drafts, pick: k }, null, 1))
    writeFileSync(fa, drafts[k]!)
  })
  const f4 = join(D, 'replies', `${p.id}__SKILL4.txt`)
  if (!existsSync(f4)) jobs.push(async () => {
    const list = await claude('sonnet', `${post(p)}\n\nList 6 different replies real r/${p.sub} commenters might give to this post, from the most common and obvious to the least obvious but still plausible. Each is one line: what the reply says (at most 15 words) and roughly what share of commenters would say something like it. Number them 1-6. No other text.`)
    const angles = list.split('\n').map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean).slice(1, 6)
    const drafts = await Promise.all(angles.map((a) => claude('sonnet', `${post(p)}\n\nWrite a reply to this Reddit post, from this angle: ${a}\n\n${persona(p.sub)}\n\n${samplesBlock(p.sub, mixed(p.sub))}\n\nReply with the comment text only.`)))
    const k = await pickOne(p, drafts)
    writeFileSync(join(D, 'drafts4', `${p.id}.json`), JSON.stringify({ angles, drafts, pick: k }, null, 1))
    writeFileSync(f4, drafts[k]!)
  })
}
let i = 0
await Promise.all(Array.from({ length: 4 }, async () => { while (i < jobs.length) { const j = jobs[i++]!; try { await j() } catch (e) { console.log(String(e)) } } }))
console.log(`ran ${jobs.length} jobs`)
