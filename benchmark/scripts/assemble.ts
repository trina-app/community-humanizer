// Copies the three tests into benchmark/: protocols, results, scripts, the generated texts and every judge's scores.
// Real comments and posts are not copied (they belong to their authors): ids.json links to each source thread instead.
// Usage: bun benchmark/scripts/assemble.ts ~/.trina/know-raw
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
const K = process.argv[2]!, OUT = new URL('..', import.meta.url).pathname
const copyDir = (from: string, to: string, keep: (f: string) => boolean = () => true) => {
  if (!existsSync(from)) return 0
  mkdirSync(to, { recursive: true }); let n = 0
  for (const f of readdirSync(from)) { const p = join(from, f); if (statSync(p).isDirectory()) n += copyDir(p, join(to, f), keep); else if (keep(f)) { copyFileSync(p, join(to, f)); n++ } }
  return n
}
// political Korean posts that slipped into the post holdout are left out (launch review, 2026-11-27)
const POLITICAL = new Set(['19294640', '19294945', '19295898', '19294930', '19227047'])
const political = (f: string) => [...POLITICAL].some((id) => f.startsWith(id))
const notCopiedText = (f: string) => !/__(PARA|HUMAN)\.txt$/.test(f) && !political(f) // rewrites of real comments are derived from their authors' text
const tests: [string, string, string[], [string, string][]][] = [
  ['reddit-comments', 'reddit-voice-test', ['PROTOCOL.md', 'RESULTS.md', 'gfix.ts', 'writer-judge.ts', 'gen3-opus.ts', 'gen.ts', 'gen2.ts', 'gen3.ts', 'gen4.ts', 'gen5.ts', 'judge.ts', 'analyze.ts', 'classify.ts', 'build.ts', 'build-fresh-as.ts', 'collect.ts', 'para.ts', 'rnd.ts', 'why.ts', 'length.ts', 'blader-SKILL.md'], [['posts.json', 'dev'], ['posts-fresh.json', 'fresh']]],
  ['korean-comments', 'korean-voice-test', ['PROTOCOL.md', 'RESULTS.md', 'collect.ts', 'ko.ts', 'ko-w.ts', 'imnotai-SKILL.md'], [['posts.json', 'test']]],
  ['posts', 'post-voice-test', ['PROTOCOL.md', 'RESULTS.md', 'holdout-nopol.ts', 'post3-opus.ts', 'build.ts', 'clean.ts', 'posts.ts', 'post2.ts', 'post3.ts', 'post4.ts', 'para.ts', 'style.ts', 'slips.ts', 'corpus.ts', 'corpus-style.ts', 'collect-holdout.ts', 'holdout-judge.ts'], [['posts.json', 'dev'], ['holdout/posts.json', 'holdout']]],
]
for (const [name, dir, files, sets] of tests) {
  const src = join(K, dir), dst = join(OUT, name)
  mkdirSync(dst, { recursive: true })
  for (const f of files) if (existsSync(join(src, f))) copyFileSync(join(src, f), join(dst, f))
  const ids: any[] = []
  for (const [file, set] of sets) for (const p of JSON.parse(readFileSync(join(src, file), 'utf8'))) {
    if (POLITICAL.has(p.id)) continue
    const url = p.sub ? `https://www.reddit.com/r/${p.sub}/comments/${p.id}/` : p.lang === 'en' ? `https://www.reddit.com/${p.place}/comments/${p.id}/` : `https://www.clien.net/service/board/${p.board ?? p.group}/${p.id}`
    ids.push({ set, id: p.id, community: p.sub ? `r/${p.sub}` : p.place ?? `clien/${p.board}`, url })
  }
  writeFileSync(join(dst, 'ids.json'), JSON.stringify(ids, null, 1))
  let n = copyDir(join(src, 'replies'), join(dst, 'outputs'), notCopiedText)
  for (const d of readdirSync(src)) if (/^judged/.test(d) && statSync(join(src, d)).isDirectory() && !/raw/.test(d)) n += copyDir(join(src, d), join(dst, d))
  if (existsSync(join(src, 'holdout'))) { n += copyDir(join(src, 'holdout', 'replies'), join(dst, 'holdout-outputs'), notCopiedText); n += copyDir(join(src, 'holdout', 'judged'), join(dst, 'holdout-judged'), (f) => !political(f)); n += copyDir(join(src, 'holdout', 'judged-W'), join(dst, 'holdout-judged-W'), (f) => !political(f)) }
  console.log(`${name}: ${ids.length} posts listed, ${n} files`)
}
