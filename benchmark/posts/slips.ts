// How often real posts contain everyday slips (tuning corpus only): the rates the roughening step may use.
import { readFileSync } from 'node:fs'
const xs = JSON.parse(readFileSync('corpus.json', 'utf8')) as any[]
const rate = (ps: string[], re: RegExp) => `${Math.round((100 * ps.filter((t) => re.test(t)).length) / ps.length)}%`
const en = xs.filter((x) => x.lang === 'en').map((x) => String(x.body)), ko = xs.filter((x) => x.lang === 'ko').map((x) => String(x.body))
console.log(`English posts n=${en.length}`)
for (const [n, re] of [['no apostrophe (dont/im/cant/didnt/doesnt/isnt/wont/thats/ive)', /\b(dont|cant|didnt|doesnt|isnt|wont|thats|ive|im)\b/], ['lowercase " i "', /(^|\s)i(\s|$)/], ['sentence starting lower case', /(^|[.!?]\s+)[a-z]/], ['no final period', /[a-zA-Z0-9)]\s*$/], ['double space', /\S  \S/], ['"u" or "ur"', /\b(u|ur)\b/], ['typo-like (teh|recieve|seperate|definately|alot)', /\b(teh|recieve|seperate|definately|alot)\b/i], ['..', /\.\.(?!\.)/]] as [string, RegExp][]) console.log(`  ${n}: ${rate(en, re)}`)
console.log(`Korean posts n=${ko.length}`)
for (const [n, re] of [['흔한 맞춤법 실수 (됬|되요|안되요|몇일|어떻해|왠만|금새|희안|할께|어의없|않되|웬지)', /됬|되요|안되요|몇일|어떻해|왠만|금새|희안|할께|어의없|않되|웬지/], ['마침표 없이 끝남', /[가-힣a-zA-Z0-9)]\s*$/], ['줄 끝 마침표 없는 줄 비율>50%', /^/], ['.. 또는 …', /\.\.(?!\.)|…/], ['~ 물결', /~/], ['ㅋㅋ/ㅎㅎ', /[ㅋㅎ]{2}/], ['ㅠㅠ/ㅜㅜ', /[ㅠㅜ]{2}/], ['^^ 이모티콘', /\^\^|\^_\^|;;/], ['영어 섞임', /[a-zA-Z]{3,}/]] as [string, RegExp][]) {
  if (n.startsWith('줄 끝')) { const r = ko.filter((t) => { const ls = t.split('\n').filter(Boolean); return ls.filter((l) => !/[.?!]$/.test(l.trim())).length / ls.length > 0.5 }).length; console.log(`  ${n}: ${Math.round((100 * r) / ko.length)}%`); continue }
  console.log(`  ${n}: ${rate(ko, re)}`)
}
