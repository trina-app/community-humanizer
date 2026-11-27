// README figures in the "Quiet Evidence" style (PHILOSOPHY.md): HTML rendered to 2x PNG by headless Chrome,
// light and dark. Scores come from the judged benchmark files (see the comments on each number).
// Usage: node scripts/readme-art/build.mjs   (writes docs/img/*.png)
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT = new URL('../../docs/img/', import.meta.url).pathname
const TMP = join(tmpdir(), 'readme-art')
mkdirSync(TMP, { recursive: true })
mkdirSync(OUT, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const THEMES = {
  light: { paper: '#fbfaf7', ink: '#141414', ink2: '#5d5b55', ink3: '#9a978f', rule: '#e6e3dc', track: '#e1ded6', accent: '#2f5bea', accentSoft: '#eef2fe', ghost: '#c9c6be' },
  dark: { paper: '#121314', ink: '#ecebe7', ink2: '#a9a7a0', ink3: '#6f6d67', rule: '#26272a', track: '#2c2d30', accent: '#7b9cff', accentSoft: '#1a2140', ghost: '#4a4b4f' },
}
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function page(t, width, body) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
* { box-sizing: border-box; margin: 0; }
html, body { background: transparent; }
body { width: ${width}px; font-family: Inter, Pretendard, system-ui, sans-serif; color: ${t.ink}; -webkit-font-smoothing: antialiased; }
.card { background: ${t.paper}; border: 1px solid ${t.rule}; border-radius: 22px; padding: 44px 52px 34px; }
.kicker { font: 500 12px 'JetBrains Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: ${t.ink2}; display: flex; align-items: center; gap: 10px; }
.card .kicker.ko { font: 500 13px Pretendard, sans-serif; letter-spacing: 0; }
.kicker i { width: 7px; height: 7px; border-radius: 50%; background: ${t.accent}; display: inline-block; }
h1 { font: 400 40px/1.12 'Instrument Serif', Pretendard, serif; letter-spacing: -.01em; margin-top: 14px; }
h1.ko { font: 600 31px/1.3 Pretendard, sans-serif; letter-spacing: -.02em; }
.num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.foot { margin-top: 26px; padding-top: 16px; border-top: 1px solid ${t.rule}; font-size: 12.5px; line-height: 1.6; color: ${t.ink2}; }
${body.css}
</style></head><body>${body.html}</body></html>`
}

// ---------- Figure 1: one thread, three writers ----------
const THREADS = {
  en: {
    kicker: 'r/ClaudeAI · same thread, three writers', title: "What would you do if there's a Claude outage?", ko: false,
    rows: [
      // benchmark/reddit-comments/judged-F1/{codex,opus,sonnet}/1xuzlpu.json: PLAIN 12, 15, 30
      { who: 'Plain Claude', sub: 'no skill', score: 19, lines: 4, text: 'Honestly I\'d probably do all the stuff I\'ve been putting off because "Claude could do it faster." Docs nobody reads, cleaning up old tickets, actually reading the code I merged last week. The part that would hurt isn\'t the typing, it\'s the thinking out loud. A lot of my workflow is now "explain the problem to Claude, get a second opinion, then decide." Without that I\'d be slower at the decisions, not just the output.', more: '3 paragraphs' },
      // BLADER_S 18, 25, 25
      { who: 'humanizer', sub: '74k★ skill + 10 real comments', score: 23, lines: 3, text: "I'd go make coffee and then actually read the code I've been merging. Honestly the first hour would be mostly finding out how much of my own codebase I can still explain without asking Claude. After that I'd probably do the boring stuff I've been putting off.", more: '2 paragraphs' },
      // SKILL3 68, 85, 80; GPT and Opus ranked it first, above the real comment
      { who: 'community-humanizer', sub: 'this repo', score: 78, ours: true, text: 'the weekly limit is already the outage for most people on here', note: 'GPT and Claude Opus ranked it above the real top comment' },
    ],
    // HUMAN 93, 80, 85
    real: 86, realLabel: 'real top comment', unit: '% human',
    foot: 'The real top comment (77 points) scored 86% human. Score: 0–100 chance that a person wrote it, average of GPT, Claude Opus and Claude Sonnet, judged blind with all versions shuffled.',
  },
  ko: {
    kicker: '클리앙 모두의공원 · 같은 글, 세 가지 댓글', title: '교촌치킨 드시는분?', ko: true,
    rows: [
      // benchmark/korean-comments/judged/{codex,opus,sonnet}/19296644.json: PLAIN 8, 12, 12
      { who: '그냥 Claude', sub: '스킬 없음', score: 11, lines: 3, text: '교촌은 취향이 갈리는 거지 맛이 없는 건 아니라고 생각해요. 저도 간장 오리지날은 가끔 생각나서 시킵니다. 짭짤달달한 맛이 다른 데서 잘 안 나오더라고요. 다만 미운털 박힌 이유는 맛보다는 가격 쪽이 큰 것 같아요.', more: '세 문단' },
      // IMNOTAI_S 25, 35, 72
      { who: 'im-not-ai', sub: '별 6.8천 스킬 + 실제 댓글 10개', score: 44, text: '저도 교촌 먹을 때 양 적다고 느낀 적은 별로 없습니다. 다만 가격이 많이 올라서 그게 좀 아쉽죠. 맛은 허니콤보 같은 건 아직도 괜찮다고 봅니다.' },
      // SKILL 78, 82, 85; GPT ranked it above the real comment
      { who: 'community-humanizer', sub: '이 레포', score: 82, ours: true, text: '닭이 작은 건 인정인데 가격이 안 작아요 ㅋㅋ', note: 'GPT는 진짜 공감 1위 댓글보다 더 사람 같다고 봤어요' },
    ],
    // HUMAN 97, 88, 80
    real: 88, realLabel: '진짜 1위 댓글', unit: '% 사람',
    foot: '진짜 공감 1위 댓글은 사람 88%였어요. 점수: "사람이 썼을 확률"(0~100), GPT·Claude Opus·Claude Sonnet 블라인드 채점 평균, 모든 버전을 섞어서 보여 줬어요.',
  },
}

function threadFigure(lang, t) {
  const d = THREADS[lang]
  const meter = (v, ours) => `<div class="meter"><div class="trk"></div><div class="real" style="left:${d.real}%"></div><div class="fill" style="width:${v}%;background:${ours ? t.accent : t.ghost}"></div></div>`
  const rows = d.rows.map((r) => `
<div class="row${r.ours ? ' ours' : ''}">
  <div class="who"><div class="name">${esc(r.who)}</div><div class="sub">${esc(r.sub)}</div></div>
  <div class="text${r.ours ? ' short' : ''}"><div class="clamp" style="-webkit-line-clamp:${r.lines || 9}">${esc(r.text)}</div>${r.more ? `<div class="more">${esc(r.more)}</div>` : ''}${r.note ? `<div class="note"><i></i>${esc(r.note)}</div>` : ''}</div>
  <div class="score"><div class="big num">${r.score}<span>${esc(d.unit)}</span></div>${meter(r.score, r.ours)}</div>
</div>`).join('')
  const css = `
.rows { margin-top: 28px; border-top: 1px solid ${t.rule}; }
.row { display: grid; grid-template-columns: 196px 1fr 176px; gap: 28px; padding: 22px 0; border-bottom: 1px solid ${t.rule}; align-items: start; }
.row.ours { background: ${t.accentSoft}; margin: 0 -24px; padding: 24px 24px; border-radius: 14px; border-bottom: none; }
.name { font-weight: 600; font-size: 15px; }
.ours .name { color: ${t.accent}; }
.sub { font-size: 12.5px; color: ${t.ink3}; margin-top: 4px; line-height: 1.45; }
.text { font-size: 15.5px; line-height: 1.6; color: ${t.ink2}; }
.clamp { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
.kicker.case { text-transform: none; letter-spacing: .06em; }
.text.short { font-size: 19px; color: ${t.ink}; font-weight: 500; }
.more { font: 400 11.5px 'JetBrains Mono', monospace; color: ${t.ink3}; margin-top: 8px; letter-spacing: .04em; }
.note { font-size: 12.5px; color: ${t.ink2}; margin-top: 10px; display: flex; align-items: center; gap: 8px; font-weight: 400; }
.note i { width: 6px; height: 6px; border-radius: 50%; background: ${t.accent}; display: inline-block; }
.score { text-align: right; }
.big { font-size: 40px; font-weight: 500; line-height: 1; letter-spacing: -.02em; }
.ours .big { color: ${t.accent}; }
.big span { font: 500 12px Inter, Pretendard, sans-serif; color: ${t.ink3}; margin-left: 5px; letter-spacing: 0; }
.meter { position: relative; height: 14px; margin-top: 14px; }
.trk { position: absolute; left: 0; right: 0; top: 6px; height: 2px; background: ${t.track}; border-radius: 1px; }
.fill { position: absolute; left: 0; top: 5px; height: 4px; border-radius: 2px; }
.real { position: absolute; top: 0; width: 2px; height: 14px; background: ${t.ink}; opacity: .55; transform: translateX(-1px); }
.legend { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 14px; font-size: 12px; color: ${t.ink3}; }
.legend b { width: 2px; height: 12px; background: ${t.ink}; opacity: .55; display: inline-block; }`
  const html = `<div class="card">
<div class="kicker case ${d.ko ? "ko" : ""}"><i></i>${esc(d.kicker)}</div>
<h1 class="${d.ko ? 'ko' : ''}">${esc(d.title)}</h1>
<div class="rows">${rows}</div>
<div class="legend"><b></b>${esc(d.realLabel)} ${d.real}</div>
<div class="foot">${esc(d.foot)}</div>
</div>`
  return page(t, 1000, { css, html })
}

// ---------- Figure 2: the scale ----------
// Averages of GPT, Opus and Sonnet from benchmark/RESULTS.md (held-out sets, 28 threads each).
const SCALES = {
  en: {
    kicker: '28 held-out Reddit threads · judged blind', head: ['58', 'vs 24'], ko: false,
    headText: 'community-humanizer scores more than twice as human as humanizer',
    tracks: [{ name: 'Reddit replies', marks: [['Plain Claude', 11], ['humanizer + 10 real comments', 24], ['community-humanizer', 58, 'ours'], ['real top comment', 80, 'real']] }],
    axis: '"A person wrote this", 0–100, average of GPT, Claude Opus and Claude Sonnet',
  },
  ko: {
    kicker: '언어마다 시험용 글 28개 · 블라인드 채점', head: ['62', 'vs 30'], ko: true,
    headText: 'community-humanizer는 기존 휴머나이저보다 두 배 넘게 사람 같아요',
    tracks: [
      { name: '클리앙 댓글', marks: [['그냥 Claude', 9], ['im-not-ai + 실제 댓글', 30], ['community-humanizer', 62, 'ours'], ['진짜 1위 댓글', 89, 'real']] },
      { name: 'Reddit 댓글', marks: [['그냥 Claude', 11], ['humanizer + 실제 댓글', 24], ['community-humanizer', 58, 'ours'], ['진짜 1위 댓글', 80, 'real']] },
    ],
    axis: '"사람이 썼을 확률"(0~100), GPT·Claude Opus·Claude Sonnet 평균',
  },
}

function scaleFigure(lang, t) {
  const d = SCALES[lang]
  const W = 880
  const track = (tr) => {
    // Labels alternate above and below so close marks never collide.
    const marks = tr.marks.map(([label, v, kind], k) => {
      const up = k % 2 === 1
      const cls = kind === 'ours' ? 'ours' : kind === 'real' ? 'realm' : ''
      return `<div class="mk ${cls}" style="left:${v}%"><div class="dot"></div><div class="lab ${up ? 'up' : 'down'}"><span class="v num">${v}</span>${esc(label)}</div></div>`
    }).join('')
    const ticks = [0, 25, 50, 75, 100].map((v) => `<div class="tick" style="left:${v}%"><span class="num">${v}</span></div>`).join('')
    return `<div class="trackwrap"><div class="tname">${esc(tr.name)}</div><div class="line">${ticks}<div class="base"></div>${marks}</div></div>`
  }
  const css = `
.head { display: flex; align-items: baseline; gap: 14px; margin-top: 18px; }
.head .n { font: 500 76px/1 'JetBrains Mono', monospace; color: ${t.accent}; letter-spacing: -.04em; }
.head .vs { font: 400 30px/1 'JetBrains Mono', monospace; color: ${t.ink3}; }
.headtext { font: 400 26px/1.25 'Instrument Serif', serif; margin-top: 12px; max-width: 760px; }
.headtext.ko { font: 600 21px/1.4 Pretendard, sans-serif; letter-spacing: -.02em; }
.trackwrap { margin-top: 30px; }
.tname { font-size: 13px; font-weight: 600; color: ${t.ink}; margin-bottom: 6px; }
.line { position: relative; height: 118px; margin: 0 18px; }
.base { position: absolute; left: 0; right: 0; top: 58px; height: 2px; background: ${t.track}; }
.tick { position: absolute; top: 52px; width: 1px; height: 14px; background: ${t.track}; }
.tick span { position: absolute; top: 46px; left: 50%; transform: translateX(-50%); font-size: 10.5px; color: ${t.ink3}; opacity: 0; }
.mk { position: absolute; top: 0; width: 0; }
.dot { position: absolute; top: 51px; left: -8px; width: 16px; height: 16px; border-radius: 50%; background: ${t.ghost}; border: 3px solid ${t.paper}; }
.ours .dot { background: ${t.accent}; width: 20px; height: 20px; left: -10px; top: 49px; }
.realm .dot { background: ${t.paper}; border: 2px solid ${t.ink}; }
.lab { position: absolute; left: 0; transform: translateX(-50%); white-space: nowrap; font-size: 12.5px; color: ${t.ink2}; text-align: center; line-height: 1.3; }
.lab .v { display: block; font-size: 17px; font-weight: 500; color: ${t.ink}; }
.lab.down { top: 76px; }
.lab.up { top: -4px; }
.ours .lab { color: ${t.accent}; font-weight: 600; }
.ours .lab .v { color: ${t.accent}; font-size: 20px; }
.axis { font-size: 12px; color: ${t.ink3}; margin-top: 8px; display: flex; justify-content: space-between; }`
  const html = `<div class="card">
<div class="kicker ${d.ko ? "ko" : ""}"><i></i>${esc(d.kicker)}</div>
<div class="head"><span class="n">${d.head[0]}</span><span class="vs">${esc(d.head[1])}</span></div>
<div class="headtext ${d.ko ? 'ko' : ''}">${esc(d.headText)}</div>
${d.tracks.map(track).join('')}
<div class="foot">${esc(d.axis)}. 0 = surely AI, 100 = surely a person.</div>
</div>`.replace('. 0 = surely AI, 100 = surely a person.', lang === 'ko' ? '. 0은 확실히 AI, 100은 확실히 사람이에요.' : '. 0 = surely AI, 100 = surely a person.')
  return page(t, W + 120, { css, html })
}

function measure(file, width) {
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', `--window-size=${width},4000`, '--virtual-time-budget=4000', '--dump-dom', `file://${file}`], { encoding: 'utf8' })
  return Number((dom.match(/<title>(\d+)<\/title>/) || [])[1]) || 1200
}
function shoot(name, html, width) {
  const file = join(TMP, `${name}.html`)
  writeFileSync(file, html.replace('</body>', '<script>document.fonts.ready.then(() => { document.title = Math.ceil(document.body.getBoundingClientRect().height) })</script></body>'))
  const height = measure(file, width)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--default-background-color=00000000',
    `--window-size=${width},${height}`, '--virtual-time-budget=4000', `--screenshot=${join(OUT, `${name}.png`)}`, `file://${file}`], { stdio: 'ignore' })
}

for (const lang of ['en', 'ko'])
  for (const [mode, t] of Object.entries(THEMES)) {
    shoot(`thread-${lang}-${mode}`, threadFigure(lang, t), 1000)
    shoot(`scores-${lang}-${mode}`, scaleFigure(lang, t), 1000)
  }
console.log('wrote docs/img/{thread,scores}-{en,ko}-{light,dark}.png')
