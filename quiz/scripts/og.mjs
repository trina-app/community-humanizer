// Link-preview cards for quiz.trina.app (1200×630, one per language): node quiz/scripts/og.mjs → quiz/public/og/<lang>.png
import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = new URL('../public/og/', import.meta.url).pathname
const TMP = join(tmpdir(), 'quiz-og'); mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true })
const L = {
  en: ['Spot the AI', 'Two replies from a real thread. One was written by a person.'],
  ko: ['AI가 쓴 댓글 찾기', '실제 글에 달린 댓글 두 개, 하나는 사람이 썼어요.'],
  ja: ['AIが書いたのはどっち？', '本物のスレッドの返信2つ。片方は人が書きました。'],
  zh: ['找出 AI 写的回复', '同一个帖子下的两条回复，其中一条是真人写的。'],
  es: ['Encuentra la IA', 'Dos respuestas de un hilo real. Una la escribió una persona.'],
  id: ['Temukan balasan AI', 'Dua balasan dari thread asli. Satu ditulis orang.'],
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
for (const [lang, [title, sub]] of Object.entries(L)) {
  const opt = (k, w1, w2, pick) => `<div class="opt${pick ? ' pick' : ''}"><b>${k}</b><div class="ln"><i style="width:${w1}%"></i><i style="width:${w2}%"></i></div></div>`
  const html = `<!doctype html><html lang="${lang === 'zh' ? 'zh-CN' : lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>*{margin:0;box-sizing:border-box}html,body{width:1200px;height:630px;background:#121314}
body{font-family:Pretendard,"Hiragino Sans","PingFang SC",sans-serif;color:#ecebe7;padding:72px 80px;display:grid;grid-template-columns:1fr 360px;gap:56px;align-items:center}
.k{display:flex;align-items:center;gap:12px;font-size:28px;font-weight:600;color:#a9a7a0}.k i{width:14px;height:14px;border-radius:50%;background:#7b9cff;display:inline-block}
h1{margin-top:26px;font-size:${lang === 'en' ? 92 : 72}px;font-weight:800;letter-spacing:-.03em;line-height:1.1}
p{margin-top:24px;font-size:32px;line-height:1.4;color:#a9a7a0;font-weight:500}
.opt{display:flex;align-items:center;gap:18px;border:2px solid #2a2b2e;border-radius:20px;padding:22px 24px;background:#1a1b1d}.opt+.opt{margin-top:18px}
.opt b{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:22px;background:#2c2d30;color:#a9a7a0}
.opt.pick{border-color:#7b9cff;background:#1a2140}.opt.pick b{background:#7b9cff;color:#0b1020}
.ln{flex:1}.ln i{display:block;height:12px;border-radius:6px;background:#2c2d30}.ln i+i{margin-top:12px}</style></head>
<body><div><div class="k"><i></i>quiz.trina.app</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div>${opt('A', 84, 56)}${opt('B', 66, 40, true)}</div></body></html>`
  const f = join(TMP, `${lang}.html`); writeFileSync(f, html)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630', '--virtual-time-budget=4000', `--screenshot=${join(OUT, `${lang}.png`)}`, `file://${f}`], { stdio: 'ignore' })
}
console.log('wrote quiz/public/og/{en,ko,ja,zh,es,id}.png')
