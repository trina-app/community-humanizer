// README figures in the "Quiet Evidence" style (PHILOSOPHY.md): HTML rendered to 2x PNG by headless Chrome,
// light and dark. Scores come from the judged benchmark files (see the comments on each number).
// Usage: node scripts/readme-art/build.mjs   (writes docs/img/*.png)
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs'
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
.card.zh { font-family: Inter, "PingFang SC", "Noto Sans SC", sans-serif; }
.card .kicker.zh { font: 500 13px "PingFang SC", "Noto Sans SC", sans-serif; letter-spacing: .04em; text-transform: none; }
.kicker i { width: 7px; height: 7px; border-radius: 50%; background: ${t.accent}; display: inline-block; }
h1 { font: 400 40px/1.12 'Instrument Serif', Pretendard, serif; letter-spacing: -.01em; margin-top: 14px; }
h1.long { font-size: 31px; line-height: 1.18; }
h1.ko { font: 600 31px/1.3 Pretendard, sans-serif; letter-spacing: -.02em; }
h1.zh { font: 600 31px/1.3 "PingFang SC", "Noto Sans SC", sans-serif; letter-spacing: .01em; }
.num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
.foot { margin-top: 26px; padding-top: 16px; border-top: 1px solid ${t.rule}; font-size: 12.5px; line-height: 1.6; color: ${t.ink2}; }
${body.css}
</style></head><body>${body.html}</body></html>`
}

// Chinese and Spanish numbers are read from the judged files, so the figures always match the data.
const JUDGES = [['codex', 'GPT'], ['opus', 'Claude Opus'], ['sonnet', 'Claude Sonnet']]
function judged(dir, thread) {
  const base = new URL(`../../benchmark/${dir}/judged/`, import.meta.url).pathname
  const js = JUDGES.filter(([j]) => existsSync(join(base, j)))
  const mean = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  const arms = ['PLAIN', 'HUMANIZER_S', 'SKILL', 'HUMAN']
  const all = js.map(([j]) => readdirSync(join(base, j)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(base, j, f), 'utf8'))))
  const one = js.map(([j]) => JSON.parse(readFileSync(join(base, j, `${thread}.json`), 'utf8')))
  return {
    judges: js.map(([, name]) => name),
    s: Object.fromEntries(arms.map((a) => [a, mean(all.map((rows) => rows.reduce((t, r) => t + r.human[a], 0) / rows.length))])),
    t: Object.fromEntries(arms.map((a) => [a, mean(one.map((r) => r.human[a]))])),
    // "above": judges whose upvote ranking put our reply ahead of the real top comment
    above: js.filter((_, k) => one[k].rank && one[k].rank.SKILL < one[k].rank.HUMAN).map(([, name]) => name),
  }
}
const ZH = judged('chinese-comments', '1xmd3vj')
const ES = judged('spanish-comments', '1xynq5l')
const ID = judged('indonesian-comments', '1xrgz1c')
ID.note = ID.t.SKILL >= ID.t.HUMAN ? 'Skornya sama dengan komentar asli teratas (399 poin)' : ID.above.length ? `${ID.above.join(' dan ')} lebih memilih meng-upvote balasan ini daripada komentar asli teratas` : 'Satu kalimat, 20 kata'
ID.headText = `community-humanizer ${(ID.s.SKILL / ID.s.HUMANIZER_S).toFixed(1).replace('.', ',')} kali lebih mirip manusia daripada humanizer-indonesia`
ZH.note = ZH.above.length ? `问“会给哪条点赞”时，${ZH.above.join('和')}把它排在真实最高赞评论前面` : '一句反问，只有 51 个字'
ES.note = ES.above.length ? `${ES.above.join(' y ')} la votarían antes que al comentario real más votado` : 'La misma idea que humanizer, en una sola frase'
ZH.headText = `community-humanizer 的真人分是 Humanizer-zh 的 ${(ZH.s.SKILL / ZH.s.HUMANIZER_S).toFixed(1)} 倍`
ES.headText = `community-humanizer suena ${(ES.s.SKILL / ES.s.HUMANIZER_S).toFixed(1).replace('.', ',')} veces más humano que humanizer`
console.log(JSON.stringify({ ZH, ES }))

// ---------- Figure 1: one thread, three writers ----------
const THREADS = {
  en: {
    kicker: 'r/ClaudeAI · same thread, three writers', title: "What would you do if there's a Claude outage?",
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
    kicker: '클리앙 모두의공원 · 같은 글, 세 가지 댓글', title: '교촌치킨 드시는분?', script: "ko",
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
  zh: {
    kicker: 'r/China_irl · 同一个帖子，三种回复', title: '我舅舅20年前在国内赚8000觉得工作不稳定赚不够出国了', script: 'zh',
    rows: [
      // benchmark/chinese-comments/judged/{codex,opus,sonnet}/1xmd3vj.json: PLAIN
      { who: '直接用 Claude', sub: '没有技能', score: ZH.t.PLAIN, lines: 3, text: '我觉得不能拿现在的8000人民币去比，得看20年前的汇率和物价。2006年美元兑人民币大概是8:1，当时的8000块只值1000刀出头，但购买力在国内算很高了，那时候城镇平均月薪也就两三千。他现在能拿8000刀，名义收入是当年的七八倍，同期国内工资涨幅远没有这么多。', more: '5 段' },
      // HUMANIZER_S
      { who: 'Humanizer-zh', sub: '2.4 万星技能 + 10 条真实评论', score: ZH.t.HUMANIZER_S, lines: 3, text: '这得看他图什么。当年国内8000一个月是真高薪，但那是2000年代初，现在的8000早就不是那个8000了，拿现在的购买力去比当时的选择有点不公平。而且8000刀mcol和8000人民币过得好不好，得看你怎么算。', more: '3 段' },
      // SKILL
      { who: 'community-humanizer', sub: '本仓库', score: ZH.t.SKILL, ours: true, text: '你舅舅现在还在国外吗？毕竟聪不聪明得看他后来是留下了还是回来了，而且8000刀是税前还是税后也差挺多的', note: ZH.note },
    ],
    real: ZH.t.HUMAN, realLabel: '真实最高赞评论', unit: '% 真人',
    foot: `真实最高赞评论的真人概率是 ${ZH.t.HUMAN}%。分数：0–100 的“真人写的概率”，${ZH.judges.join("、")} 盲评取平均，所有版本打乱顺序后一起给评委看。`,
  },
  es: {
    kicker: 'r/devsarg · mismo hilo, tres respuestas', title: 'Si desarrollo los tickets con Claude y casi no intervengo, ¿qué valor real estoy aportando como dev?',
    rows: [
      // benchmark/spanish-comments/judged/{codex,opus,sonnet}/1xynq5l.json: PLAIN
      { who: 'Claude sin skill', sub: 'sin skill', score: ES.t.PLAIN, lines: 4, text: 'Me parece una pregunta honesta y la respuesta incómoda es que tenés algo de razón: el piso bajó. Pero creo que estás midiendo el valor en el lugar equivocado. Que la AI te pregunte "¿querés una transacción acá?" solo sirve si quien responde sabe qué implica. Alguien sin criterio dice "sí, lo que te parezca" y después se entera en producción de lo que no le preguntaron.', more: '6 párrafos' },
      // HUMANIZER_S
      { who: 'humanizer', sub: 'skill de 74.000★ + 10 comentarios reales', score: ES.t.HUMANIZER_S, lines: 3, text: 'Lo que aportás es que sos el que responde cuando se rompe. Si hay un bug un viernes a las 6 en producción, nadie le va a reclamar a Claude, te lo reclaman a vos. Y para eso tenés que entender lo que se subió, aunque no lo hayas escrito.', more: '5 párrafos' },
      // SKILL
      { who: 'community-humanizer', sub: 'este repo', score: ES.t.SKILL, ours: true, text: 'Lo que aportás es que cuando se rompe algo a las 6 de la tarde del viernes, hay alguien a quien llamar', note: ES.note },
    ],
    real: ES.t.HUMAN, realLabel: 'comentario real más votado', unit: '% humano',
    foot: `El comentario real más votado (368 puntos) sacó ${ES.t.HUMAN} % humano. Puntuación: probabilidad de 0 a 100 de que lo haya escrito una persona, media de ${ES.judges.join(" y ")}, evaluado a ciegas con todas las versiones mezcladas.`,
  },
  id: {
    kicker: 'r/indonesia · satu thread, tiga balasan', title: 'Kayak gini sebenernya konsumennya siapa? Anggaplah semua manusia sudah diganti oleh AI 100% dan sudah tidak ada source of income. Logikanya bagaimana ini?',
    rows: [
      // benchmark/indonesian-comments/judged/{opus,sonnet}/1xrgz1c.json: PLAIN
      { who: 'Claude tanpa skill', sub: 'tanpa skill', score: ID.t.PLAIN, lines: 4, text: 'Secara logika ekonomi, skenario 100% itu nggak stabil, jadi nggak akan sampai ke titik itu tanpa sistemnya berubah dulu. Perusahaan butuh pembeli, pembeli butuh duit, duit datangnya dari gaji. Kalau gaji hilang semua, pendapatan perusahaan juga ikut hilang. Ini masalah yang sama dengan yang dulu dibilang Henry Ford: pekerjanya harus mampu beli produknya.', more: '224 kata' },
      // HUMANIZER_S
      { who: 'humanizer-indonesia', sub: 'skill 360★ + 10 komentar asli', score: ID.t.HUMANIZER_S, lines: 3, text: 'Ini sebenernya masalah klasik, tiap perusahaan cuma mikirin ongkos produksinya sendiri dan gak ada yang mikirin daya beli secara keseluruhan. Makanya tiap CEO bakal tetep mecat orang demi efisiensi, padahal kalau semua perusahaan ngelakuin hal yang sama, pasarnya ilang.', more: '91 kata' },
      // SKILL
      { who: 'community-humanizer', sub: 'repo ini', score: ID.t.SKILL, ours: true, text: 'Kalau semua orang udah ga punya income, yang jual produknya ke siapa? Emang perusahaannya mau jualan ke sesama robot doang', note: ID.note },
    ],
    real: ID.t.HUMAN, realLabel: 'komentar asli teratas', unit: '% manusia',
    foot: `Komentar asli teratas (399 poin) mendapat ${ID.t.HUMAN}% manusia. Skor: peluang 0–100 bahwa balasan ditulis orang, rata-rata ${ID.judges.join(' dan ')}, dinilai secara buta dengan semua versi diacak.`,
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
  const html = `<div class="card ${d.script || ""}">
<div class="kicker case ${d.script || ""}"><i></i>${esc(d.kicker)}</div>
<h1 class="${d.script || ""} ${d.title.length > 90 ? "long" : ""}">${esc(d.title)}</h1>
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
    kicker: '28 held-out Reddit threads · judged blind', head: ['58', 'vs 24'],
    headText: 'community-humanizer scores more than twice as human as humanizer',
    tracks: [{ name: 'Reddit replies', marks: [['Plain Claude', 11], ['humanizer + 10 real comments', 24], ['community-humanizer', 58, 'ours'], ['real top comment', 80, 'real']] }],
    axis: '"A person wrote this", 0–100, average of GPT, Claude Opus and Claude Sonnet. 0 = surely AI, 100 = surely a person.',
  },
  ko: {
    kicker: '언어마다 시험용 글 28개 · 블라인드 채점', head: ['62', 'vs 30'], script: "ko",
    headText: 'community-humanizer는 기존 휴머나이저보다 두 배 넘게 사람 같아요',
    tracks: [
      { name: '클리앙 댓글', marks: [['그냥 Claude', 9], ['im-not-ai + 실제 댓글', 30], ['community-humanizer', 62, 'ours'], ['진짜 1위 댓글', 89, 'real']] },
      { name: 'Reddit 댓글', marks: [['그냥 Claude', 11], ['humanizer + 실제 댓글', 24], ['community-humanizer', 58, 'ours'], ['진짜 1위 댓글', 80, 'real']] },
    ],
    axis: '"사람이 썼을 확률"(0~100), GPT·Claude Opus·Claude Sonnet 평균. 0은 확실히 AI, 100은 확실히 사람이에요.',
  },
  zh: {
    kicker: 'r/China_irl 的 28 个测试帖子 · 盲评', head: [String(ZH.s.SKILL), `vs ${ZH.s.HUMANIZER_S}`], script: 'zh',
    headText: ZH.headText,
    tracks: [
      { name: 'r/China_irl 回复', marks: [['直接用 Claude', ZH.s.PLAIN], ['Humanizer-zh + 真实评论', ZH.s.HUMANIZER_S], ['community-humanizer', ZH.s.SKILL, 'ours'], ['真实最高赞评论', ZH.s.HUMAN, 'real']] },
    ],
    axis: `“真人写的概率”（0–100），${ZH.judges.join("、")} 平均。0 表示肯定是 AI，100 表示肯定是真人。`,
  },
  es: {
    kicker: '28 hilos de prueba en español · evaluación a ciegas', head: [String(ES.s.SKILL), `vs ${ES.s.HUMANIZER_S}`],
    headText: ES.headText,
    tracks: [
      { name: 'Respuestas en español', marks: [['Claude sin skill', ES.s.PLAIN], ['humanizer + comentarios reales', ES.s.HUMANIZER_S], ['community-humanizer', ES.s.SKILL, 'ours'], ['comentario real más votado', ES.s.HUMAN, 'real']] },
    ],
    axis: `"Lo escribió una persona", de 0 a 100, media de ${ES.judges.join(" y ")}. 0 = seguro que es IA, 100 = seguro que es una persona.`,
  },
  id: {
    kicker: '28 thread uji berbahasa Indonesia · dinilai secara buta',
    headText: ID.headText,
    tracks: [
      { name: 'Balasan berbahasa Indonesia', marks: [['Claude tanpa skill', ID.s.PLAIN], ['humanizer-indonesia + komentar asli', ID.s.HUMANIZER_S], ['community-humanizer', ID.s.SKILL, 'ours'], ['komentar asli teratas', ID.s.HUMAN, 'real']] },
    ],
    axis: `"Ditulis orang", 0–100, rata-rata ${ID.judges.join(' dan ')}. 0 = pasti AI, 100 = pasti orang.`,
  },
}

function scaleFigure(lang, t) {
  const d = SCALES[lang]
  const W = 880, LAB = 250 // label column width
  // Horizontal bars, highest first like a leaderboard; ours in the accent colour, the real comment hatched.
  const ticks = [0, 25, 50, 75, 100]
  const panel = (tr, k) => {
    const rows = [...tr.marks].sort((x, y) => y[1] - x[1]).map(([label, v, kind]) => `
<div class="hrow ${kind || ''}"><div class="hlab">${esc(label)}</div><div class="htrack"><div class="hbar" style="width:${v}%"></div><span class="hval num" style="left:calc(${v}% + 12px)">${v}</span></div></div>`).join('')
    const grid = ticks.slice(1).map((g) => `<div class="vgrid" style="left:calc(${LAB}px + (100% - ${LAB}px) * ${g / 100})"></div>`).join('')
    const axis = k === d.tracks.length - 1 ? `<div class="haxis">${ticks.map((g) => `<span class="num" style="left:calc(${LAB}px + (100% - ${LAB}px) * ${g / 100})">${g}</span>`).join('')}</div>` : ''
    return `<div class="panel">${d.tracks.length > 1 ? `<div class="tname">${esc(tr.name)}</div>` : ''}<div class="hbody">${grid}${rows}</div>${axis}</div>`
  }
  const css = `
.headtext { font: 400 30px/1.2 'Instrument Serif', serif; margin-top: 14px; max-width: 800px; }
.headtext.ko { font: 600 23px/1.4 Pretendard, sans-serif; letter-spacing: -.02em; }
.headtext.zh { font: 600 23px/1.45 "PingFang SC", "Noto Sans SC", sans-serif; }
.panel { margin-top: 30px; }
.panel + .panel { margin-top: 34px; }
.tname { font-size: 13.5px; font-weight: 600; color: ${t.ink}; margin-bottom: 10px; }
.hbody { position: relative; }
.vgrid { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed ${t.track}; }
.hrow { position: relative; display: grid; grid-template-columns: ${LAB}px 1fr; align-items: center; height: 54px; }
.hlab { font-size: 15px; color: ${t.ink2}; padding-right: 18px; text-align: right; line-height: 1.3; }
.hrow.ours .hlab { color: ${t.accent}; font-weight: 600; }
.htrack { position: relative; height: 100%; border-left: 1.5px solid ${t.ink3}; }
.hbar { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 34px; background: ${t.ghost}; border-radius: 0 6px 6px 0; }
.hrow.ours .hbar { background: ${t.accent}; }
.hrow.real .hbar { background: repeating-linear-gradient(135deg, ${t.ink3} 0 1.5px, transparent 1.5px 7px); border: 1.5px solid ${t.ink2}; border-left: none; }
.hval { position: absolute; top: 50%; transform: translateY(-50%); font-size: 20px; font-weight: 500; color: ${t.ink}; }
.hrow.ours .hval { font-size: 26px; font-weight: 600; color: ${t.accent}; }
.haxis { position: relative; height: 22px; margin-top: 8px; }
.haxis span { position: absolute; transform: translateX(-50%); font-size: 11px; color: ${t.ink3}; }`
  const html = `<div class="card ${d.script || ""}">
<div class="kicker ${d.script || ""}"><i></i>${esc(d.kicker)}</div>
<div class="headtext ${d.script || ""}">${esc(d.headText).replace(/(\S+-\S+)/g, '<span style="white-space:nowrap">$1</span>')}</div>
${d.tracks.map(panel).join('')}
<div class="foot">${esc(d.axis)}</div>
</div>`
  return page(t, W + 120, { css, html })
}

// ---------- Quiz button: two answer options and a call to action ----------
const QUIZ = {
  en: { q: 'Which one did a person write?', sub: '10 rounds · 3 min · quiz.trina.app', cta: 'Take the quiz →' },
  ko: { q: '어느 쪽이 사람이 쓴 걸까요?', sub: '10문제 · 3분 · quiz.trina.app', cta: '퀴즈 풀기 →', script: 'ko' },
  zh: { q: '哪一条是真人写的？', sub: '约 3 分钟 · quiz.trina.app', cta: '来答题 →', script: 'zh' },
  es: { q: '¿Cuál escribió una persona?', sub: '10 preguntas · 3 min · quiz.trina.app', cta: 'Haz el test →' },
  id: { q: 'Mana yang ditulis orang?', sub: '10 soal · 3 menit · quiz.trina.app', cta: 'Ikut kuis →' },
}
function quizButton(lang, t) {
  const d = QUIZ[lang]
  const onAccent = t.paper === '#121314' ? '#0b1020' : '#ffffff'
  const opt = (letter, w1, w2, pick) => `<div class="opt${pick ? ' pick' : ''}"><b>${letter}</b><div class="lines"><i style="width:${w1}%"></i><i style="width:${w2}%"></i></div></div>`
  const css = `
.qcard { display: grid; grid-template-columns: 190px 1fr auto; gap: 26px; align-items: center; background: ${t.paper}; border: 1px solid ${t.rule}; border-radius: 20px; padding: 22px 24px 22px 22px; }
.opt { display: flex; align-items: center; gap: 10px; border: 1.5px solid ${t.rule}; border-radius: 12px; padding: 9px 12px; }
.opt + .opt { margin-top: 8px; }
.opt b { flex: none; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 600 12px Inter, sans-serif; background: ${t.track}; color: ${t.ink2}; }
.opt.pick { border-color: ${t.accent}; background: ${t.accentSoft}; }
.opt.pick b { background: ${t.accent}; color: ${onAccent}; }
.lines { flex: 1; }
.lines i { display: block; height: 6px; border-radius: 3px; background: ${t.track}; }
.lines i + i { margin-top: 6px; }
.q { font: 400 29px/1.15 'Instrument Serif', serif; color: ${t.ink}; }
.ko .q { font: 600 21px/1.35 Pretendard, sans-serif; letter-spacing: -.02em; }
.zh .q { font: 600 21px/1.35 "PingFang SC", "Noto Sans SC", sans-serif; }
.sub { font: 500 12px 'JetBrains Mono', monospace; color: ${t.ink3}; margin-top: 8px; letter-spacing: .03em; }
.ko .sub, .zh .sub { font-family: 'JetBrains Mono', Pretendard, "PingFang SC", monospace; }
.cta { background: ${t.accent}; color: ${onAccent}; font: 600 16px Inter, Pretendard, "PingFang SC", sans-serif; padding: 14px 22px; border-radius: 999px; white-space: nowrap; }`
  const html = `<div class="qcard ${d.script || ''}">
<div class="opts">${opt('A', 82, 55, false)}${opt('B', 64, 38, true)}</div>
<div><div class="q">${esc(d.q)}</div><div class="sub">${esc(d.sub)}</div></div>
<div class="cta">${esc(d.cta)}</div>
</div>`
  return page(t, 760, { css, html })
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

for (const lang of ['en', 'ko', 'zh', 'es', 'id'])
  for (const [mode, t] of Object.entries(THEMES)) {
    shoot(`thread-${lang}-${mode}`, threadFigure(lang, t), 1000)
    shoot(`scores-${lang}-${mode}`, scaleFigure(lang, t), 1000)
    shoot(`quiz-${lang}-${mode}`, quizButton(lang, t), 760)
  }
console.log('wrote docs/img/{thread,scores,quiz}-{en,ko,zh,es,id}-{light,dark}.png')
