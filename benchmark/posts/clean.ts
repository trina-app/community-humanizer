// Data fix before any optimisation (2026-11-27): English bodies from BrightData had their line breaks removed, so they are
// re-read from Arctic Shift (the original markdown); Korean bodies had scrape leftovers (a trailing "<div", leading spaces
// on every line), which are cleaned. Samples are rebuilt from the cleaned bodies. Test ids and notes stay the same.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const D = import.meta.dir
const cleanKo = (s: string) => s.replace(/<[^>]*$/, '').replace(/<[^>]+>/g, ' ').split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
async function selftext(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (let i = 0; i < ids.length; i += 50) {
    for (let a = 0; a < 5; a++) {
      try { const j = await (await fetch(`https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${ids.slice(i, i + 50).join(',')}&fields=id,selftext`)).json(); for (const p of j.data ?? []) out[p.id] = String(p.selftext ?? '').trim(); break } catch { await Bun.sleep(4000) }
    }
    await Bun.sleep(1500)
  }
  return out
}
const R = join(D, '..', 'reddit-voice-test')
const enPool = [...JSON.parse(readFileSync(join(R, 'posts.json'), 'utf8')), ...JSON.parse(readFileSync(join(R, 'posts-fresh.json'), 'utf8'))]
const st = await selftext(enPool.map((p: any) => p.id))
console.log(`selftext for ${Object.keys(st).length}/${enPool.length} English posts`)
const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const enBodies = enPool.filter((p: any) => st[p.id] && !/\[(removed|deleted)\]/.test(st[p.id]!) && words(st[p.id]!) >= 60).map((p: any) => ({ id: p.id, group: p.sub, body: st[p.id]! }))
for (const file of ['posts.json', 'holdout.json']) {
  const xs = JSON.parse(readFileSync(join(D, file), 'utf8')) as any[]
  const koPool = (JSON.parse(readFileSync(join(D, 'posts.json'), 'utf8')) as any[]).filter((p) => p.lang === 'ko').map((p) => ({ id: p.id, group: p.group, body: cleanKo(p.body) }))
  for (const p of xs) {
    if (p.lang === 'en' && file === 'posts.json') { if (!st[p.id]) { console.log(`no selftext ${p.id}`); continue } p.body = st[p.id] }
    if (p.lang === 'ko') p.body = cleanKo(p.body)
    const pool = p.lang === 'en' ? enBodies : koPool
    p.samples = pool.filter((q) => q.group === p.group && q.id !== p.id).map((q) => q.body.slice(0, 900)).slice(0, 9)
  }
  writeFileSync(join(D, file), JSON.stringify(xs, null, 1))
  console.log(`${file}: ${xs.length} posts, leftover "<div": ${xs.filter((p) => /<div/.test(p.body) || p.samples.some((s: string) => /<div/.test(s))).length}, English one-line bodies: ${xs.filter((p) => p.lang === 'en' && !p.body.includes('\n')).length}`)
}
