// Labels every usable top-level comment with one comment type (online-voice-papers.md taxonomy), 40 per call.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const D = import.meta.dir
const TYPES = ['answer', 'one-liner', 'anecdote', 'disagree', 'question-back', 'side-point', 'agree', 'joke', 'thanks', 'complaint']
const raw = JSON.parse(readFileSync(join(D, 'bd/comments.json'), 'utf8')) as any[]
const ok = (c: any) => c.comment && !/^\[(removed|deleted)\]$/.test(c.comment.trim()) && c.user_posted && c.user_posted !== 'AutoModerator' && c.user_posted !== '[deleted]' && !c.has_bot_in_username && c.comment.length >= 2
const cs = raw.filter(ok)
const out = join(D, 'types.json')
const done: Record<string, string> = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {}
const todo = cs.filter((c) => !done[c.comment_id])

const PROMPT = `Each numbered item is a top-level Reddit comment replying to a post. Label each with exactly one type:
- answer: answers the post with an explanation, advice or steps (more than about 20 words)
- one-liner: a very short answer, a tool or product name, a link, or a few words (about 20 words or fewer) that answers the post
- anecdote: mostly tells the commenter's own experience or story
- disagree: pushes back on the post or its premise, corrects it
- question-back: mainly asks the poster a question
- side-point: about something related but not the post's main question
- agree: agrees or adds "same here" without much more
- joke: humour, sarcasm, a quip
- thanks: thanks or praise
- complaint: venting or a rant
Reply with JSON only, mapping item number to type: {"1":"answer","2":"joke"}`

const jobs: (() => Promise<void>)[] = []
for (let i = 0; i < todo.length; i += 40) {
  const batch = todo.slice(i, i + 40)
  jobs.push(async () => {
    const text = `${PROMPT}\n\n${batch.map((c, k) => `[${k + 1}] ${String(c.comment).slice(0, 400).replace(/\s+/g, ' ')}`).join('\n')}`
    for (let a = 0; a < 2; a++) {
      const r = Bun.spawn(['claude', '-p', text, '--model', 'sonnet', '--output-format', 'json', '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', 'project'], { cwd: join(D, 'empty'), stdout: 'pipe', stderr: 'ignore', stdin: 'ignore', env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1' } })
      const o = await new Response(r.stdout).text()
      await r.exited
      try {
        const res = String(JSON.parse(o).result)
        const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1))
        batch.forEach((c, k) => { const t = j[String(k + 1)]; if (TYPES.includes(t)) done[c.comment_id] = t })
        return
      } catch {}
    }
    console.log(`failed batch at ${i}`)
  })
}
let n = 0
await Promise.all(Array.from({ length: 6 }, async () => { while (n < jobs.length) await jobs[n++]!() }))
writeFileSync(out, JSON.stringify(done, null, 1))
const posts = JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]
const sub = (c: any) => c.input.url.match(/\/r\/([^/]+)\//)[1]
console.log(`labelled ${Object.keys(done).length}/${cs.length}`)
for (const s of [...new Set(posts.map((p) => p.sub))]) {
  const mine = cs.filter((c) => sub(c) === s && done[c.comment_id] && c.num_upvotes >= 2)
  const count = Object.fromEntries(TYPES.map((t) => [t, mine.filter((c) => done[c.comment_id] === t).length]))
  console.log(`${s} (n=${mine.length}): ${TYPES.map((t) => `${t} ${Math.round(100 * count[t]! / mine.length)}%`).join(', ')}`)
}
