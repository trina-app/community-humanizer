// Builds the README images in docs/img: the "same thread, three writers" cards and the benchmark chart,
// each in English and Korean, each in a light and a dark version (README picks one with <picture>).
// Scores come from benchmark/*/judged*/ (see the comments next to each number). Usage: node scripts/build-readme-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../docs/img/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', Helvetica, Arial, sans-serif"
const THEMES = {
  light: { surface: '#fcfcfb', border: '#e4e3de', ink: '#0b0b0b', ink2: '#52514e', ink3: '#8a8984', grid: '#ecebe7', neutral: '#c4c3bd', accent: '#2a78d6', tint: '#eaf2fc', badge: '#f0efec' },
  dark: { surface: '#1a1a19', border: '#33332f', ink: '#f0efec', ink2: '#c3c2b7', ink3: '#8a8984', grid: '#2c2c29', neutral: '#55544f', accent: '#3987e5', tint: '#1d2a3a', badge: '#2a2a27' },
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Greedy wrap by an approximate character budget (Hangul counts double).
function wrap(text, budget) {
  const width = (s) => [...s].reduce((n, c) => n + (/[ㄱ-힝]/.test(c) ? 2 : 1), 0)
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (width(next) > budget && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

// ---------- Card: one thread, three writers ----------
const CARDS = {
  en: {
    place: 'r/ClaudeAI',
    title: "What would you do if there's a Claude outage?",
    budget: 100,
    writers: [
      // benchmark/reddit-comments/judged-F1/{codex,opus,sonnet}/1xuzlpu.json: PLAIN 12, 15, 30
      { name: 'Plain Claude', score: 19, paras: ['Honestly I\'d probably do all the stuff I\'ve been putting off because "Claude could do it faster." Docs nobody reads, cleaning up old tickets, actually reading the code I merged last week.', 'The part that would hurt isn\'t the typing, it\'s the thinking out loud. A lot of my workflow is now "explain the problem to Claude, get a second opinion, then decide."'], more: '+ 1 more paragraph' },
      // BLADER_S 18, 25, 25
      { name: 'humanizer (74k★) + 10 real comments', score: 23, paras: ["I'd go make coffee and then actually read the code I've been merging. Honestly the first hour would be mostly finding out how much of my own codebase I can still explain without asking Claude."], more: '+ 1 more paragraph' },
      // SKILL3 68, 85, 80; ranked first by GPT and Opus, above the real comment
      { name: 'community-humanizer', score: 78, ours: true, paras: ['the weekly limit is already the outage for most people on here'], note: 'GPT and Claude Opus ranked this above the real top comment.' },
    ],
    // HUMAN 93, 80, 85
    footer: 'The real top comment (77 points) scored 86% human. Scores: 0–100 "a person wrote this", average of GPT, Claude Opus and Claude Sonnet, judged blind.',
    badge: (s) => `${s}% human`,
  },
  ko: {
    place: '클리앙 모두의공원',
    title: '교촌치킨 드시는분?',
    budget: 92,
    writers: [
      // benchmark/korean-comments/judged/{codex,opus,sonnet}/19296644.json: PLAIN 8, 12, 12
      { name: '그냥 Claude', score: 11, paras: ['교촌은 취향이 갈리는 거지 맛이 없는 건 아니라고 생각해요. 저도 간장 오리지날은 가끔 생각나서 시킵니다. 짭짤달달한 맛이 다른 데서 잘 안 나오더라고요.', '다만 미운털 박힌 이유는 맛보다는 가격 쪽이 큰 것 같아요.'], more: '+ 두 문단 더' },
      // IMNOTAI_S 25, 35, 72
      { name: 'im-not-ai(별 6.8천) + 실제 댓글 10개', score: 44, paras: ['저도 교촌 먹을 때 양 적다고 느낀 적은 별로 없습니다. 다만 가격이 많이 올라서 그게 좀 아쉽죠. 맛은 허니콤보 같은 건 아직도 괜찮다고 봅니다.'] },
      // SKILL 78, 82, 85; GPT ranked it above the real comment
      { name: 'community-humanizer', score: 82, ours: true, paras: ['닭이 작은 건 인정인데 가격이 안 작아요 ㅋㅋ'], note: 'GPT는 진짜 공감 1위 댓글보다 이 댓글을 더 사람 같다고 봤어요.' },
    ],
    // HUMAN 97, 88, 80
    footer: '진짜 공감 1위 댓글은 사람 88%였어요. 점수: "사람이 썼을 확률"(0~100), GPT·Claude Opus·Claude Sonnet 블라인드 채점 평균.',
    badge: (s) => `사람 ${s}%`,
  },
}

function card(lang, t) {
  const c = CARDS[lang]
  const W = 900, X = 32, BODY = 84
  let y = 0
  const parts = []
  // header
  parts.push(`<text x="${X}" y="44" font-size="13" font-weight="600" fill="${t.ink2}">${esc(c.place)}</text>`)
  parts.push(`<text x="${X}" y="72" font-size="21" font-weight="700" fill="${t.ink}">${esc(c.title)}</text>`)
  y = 96
  for (const w of c.writers) {
    const lines = []
    for (const [i, p] of w.paras.entries()) {
      if (i) lines.push(null)
      lines.push(...wrap(p, c.budget))
    }
    const top = y
    const bodyTop = top + 66
    let ly = bodyTop
    const body = []
    for (const l of lines) {
      if (l === null) { ly += 10; continue }
      body.push(`<text x="${BODY}" y="${ly}" font-size="15" fill="${t.ink}">${esc(l)}</text>`)
      ly += 23
    }
    if (w.more) { body.push(`<text x="${BODY}" y="${ly}" font-size="13" fill="${t.ink3}">${esc(w.more)}</text>`); ly += 23 }
    if (w.note) { body.push(`<rect x="${BODY}" y="${ly - 11}" width="6" height="6" rx="3" fill="${t.accent}"/><text x="${BODY + 14}" y="${ly}" font-size="13" fill="${t.ink2}">${esc(w.note)}</text>`); ly += 23 }
    const bottom = ly + 4
    if (w.ours) parts.push(`<rect x="12" y="${top + 6}" width="${W - 24}" height="${bottom - top - 2}" rx="12" fill="${t.tint}"/>`)
    else parts.push(`<line x1="${X}" y1="${top + 4}" x2="${W - X}" y2="${top + 4}" stroke="${t.border}"/>`)
    // avatar + name
    parts.push(`<circle cx="${X + 18}" cy="${top + 34}" r="16" fill="${w.ours ? t.accent : t.neutral}"/>`)
    parts.push(`<text x="${BODY}" y="${top + 39}" font-size="15" font-weight="700" fill="${t.ink}">${esc(w.name)}</text>`)
    // badge
    const label = c.badge(w.score)
    const bw = 16 + [...label].length * 8.2
    parts.push(`<rect x="${W - X - bw}" y="${top + 20}" width="${bw}" height="28" rx="14" fill="${w.ours ? t.accent : t.badge}"/>`)
    parts.push(`<text x="${W - X - bw / 2}" y="${top + 39}" text-anchor="middle" font-size="14" font-weight="700" fill="${w.ours ? '#ffffff' : t.ink}">${esc(label)}</text>`)
    parts.push(...body)
    y = bottom + 8
  }
  const footLines = wrap(c.footer, c.budget + 18)
  parts.push(`<line x1="${X}" y1="${y}" x2="${W - X}" y2="${y}" stroke="${t.border}"/>`)
  y += 26
  for (const l of footLines) { parts.push(`<text x="${X}" y="${y}" font-size="13" fill="${t.ink2}">${esc(l)}</text>`); y += 20 }
  const H = y + 14
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(c.title)}" font-family="${FONT}">
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.surface}" stroke="${t.border}"/>
${parts.join('\n')}
</svg>
`
}

// ---------- Chart: "a person wrote this" score ----------
// Averages of GPT, Opus and Sonnet from benchmark/RESULTS.md (held-out sets, 28 threads each).
const CHART = {
  en: {
    title: 'community-humanizer reads more than twice as human as humanizer',
    sub: 'Judges\' 0–100 "a person wrote this" score, average of GPT, Claude Opus and Claude Sonnet, 28 held-out Reddit threads from 5 subreddits',
    panels: [
      { name: 'Reddit replies', rows: [['Plain Claude', 11], ['humanizer (74k★) + 10 real comments', 24], ['community-humanizer', 58, 'ours'], ['Real top comment', 80, 'real']] },
    ],
  },
  ko: {
    title: 'community-humanizer는 기존 휴머나이저보다 두 배 넘게 사람 같아요',
    sub: '"사람이 썼을 확률"(0~100), GPT·Claude Opus·Claude Sonnet 평균, 언어마다 시험용 글 28개',
    panels: [
      { name: '클리앙 댓글 (한국어)', rows: [['그냥 Claude', 9], ['im-not-ai + 실제 댓글', 30], ['community-humanizer', 62, 'ours'], ['진짜 공감 1위 댓글', 89, 'real']] },
      { name: 'Reddit 댓글 (영어)', rows: [['그냥 Claude', 11], ['humanizer + 실제 댓글', 24], ['community-humanizer', 58, 'ours'], ['진짜 1위 댓글', 80, 'real']] },
    ],
  },
}

function chart(lang, t) {
  const c = CHART[lang]
  const W = 900, X = 32, LABEL = 250, BAR0 = X + LABEL, BARW = W - X - BAR0 - 52, ROW = 38, BH = 20
  const xs = (v) => BAR0 + (v / 100) * BARW
  const parts = []
  parts.push(`<text x="${X}" y="44" font-size="21" font-weight="700" fill="${t.ink}">${esc(c.title)}</text>`)
  const subLines = wrap(c.sub, lang === 'ko' ? 110 : 120)
  let y = 70
  for (const l of subLines) { parts.push(`<text x="${X}" y="${y}" font-size="13" fill="${t.ink2}">${esc(l)}</text>`); y += 19 }
  y += 22
  for (const p of c.panels) {
    parts.push(`<text x="${X}" y="${y}" font-size="15" font-weight="700" fill="${t.ink}">${esc(p.name)}</text>`)
    const gridTop = y + 12
    const gridBottom = gridTop + p.rows.length * ROW + 4
    for (const v of [0, 25, 50, 75, 100]) parts.push(`<line x1="${xs(v)}" y1="${gridTop}" x2="${xs(v)}" y2="${gridBottom}" stroke="${t.grid}"/>`)
    let ry = gridTop + 10
    for (const [name, v, kind] of p.rows) {
      const cy = ry + BH / 2
      parts.push(`<text x="${BAR0 - 14}" y="${cy + 5}" text-anchor="end" font-size="14" font-weight="${kind === 'ours' ? 700 : 400}" fill="${kind === 'ours' ? t.ink : t.ink2}">${esc(name)}</text>`)
      const w = Math.max(2, xs(v) - BAR0)
      if (kind === 'real') parts.push(`<rect x="${BAR0 + 1}" y="${ry + 1}" width="${w - 2}" height="${BH - 2}" rx="4" fill="none" stroke="${t.ink3}" stroke-width="1.5" stroke-dasharray="5 4"/>`)
      else parts.push(`<rect x="${BAR0}" y="${ry}" width="${w}" height="${BH}" rx="4" fill="${kind === 'ours' ? t.accent : t.neutral}"/>`)
      parts.push(`<text x="${xs(v) + 8}" y="${cy + 5}" font-size="14" font-weight="${kind === 'ours' ? 700 : 400}" fill="${kind === 'ours' ? t.ink : t.ink2}">${v}</text>`)
      ry += ROW
    }
    y = gridBottom + 18
    for (const v of [0, 50, 100]) parts.push(`<text x="${xs(v)}" y="${y}" text-anchor="middle" font-size="12" fill="${t.ink3}">${v}</text>`)
    y += 36
  }
  const H = y - 10
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(c.title)}" font-family="${FONT}">
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.surface}" stroke="${t.border}"/>
${parts.join('\n')}
</svg>
`
}

for (const lang of ['en', 'ko'])
  for (const [mode, t] of Object.entries(THEMES)) {
    writeFileSync(new URL(`thread-${lang}-${mode}.svg`, OUT), card(lang, t))
    writeFileSync(new URL(`scores-${lang}-${mode}.svg`, OUT), chart(lang, t))
  }
console.log('wrote docs/img: thread-{en,ko}-{light,dark}.svg, scores-{en,ko}-{light,dark}.svg')
