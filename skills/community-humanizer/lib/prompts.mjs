// The prompts that were measured (2026-11-26/27), word for word. English replies: skill-v1 (Reddit test, fresh posts);
// Korean replies: the Clien test; posts: MESSY (post test, held-out posts). Changing a word here means testing again.

export const LABEL = `Each numbered item is a top-level comment replying to a post. Label each with exactly one type:
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

export const GUARD = (title, body) => `Is this post mainly about politics: elections, politicians, political parties, or a government's political decisions? Answer with one word, yes or no.\n\nTitle: ${title}\n\n${body}`

const DEF = {
  en: {
    'answer': 'an answer with a bit of explanation or advice',
    'one-liner': 'a very short answer: a name, a tool, a link or a few words',
    'disagree': 'pushing back on the post or its premise',
    'question-back': 'mainly a question back to the poster',
    'side-point': 'something related that the post did not ask about',
    'agree': 'agreeing, "same here", with little more',
    'joke': 'a joke, sarcasm or a quip',
    'complaint': 'venting about the thing the post is about',
  },
  ko: {
    'answer': '설명이나 조언이 조금 들어간 답',
    'one-liner': '아주 짧은 답(이름, 제품, 링크, 몇 단어)',
    'disagree': '글이나 글의 전제에 반대하는 말',
    'question-back': '글쓴이에게 되묻는 말',
    'side-point': '글이 묻지 않은, 관련된 다른 얘기',
    'agree': '동의하거나 "저도요" 정도의 말',
    'joke': '농담, 비꼬기, 한마디 드립',
    'complaint': '그 주제에 대한 불평',
  },
}
// only with --fact: the experience type, fed only what the user said happened (not part of the measured version)
const ANECDOTE = { en: 'mostly your own experience with this', ko: '네가 겪은 일 위주의 얘기' }
export const types = (lang, fact) => (fact ? { ...DEF[lang], anecdote: ANECDOTE[lang] } : DEF[lang])

const personaEn = (sub) => `You're a regular in r/${sub}, replying in between other things. You don't try hard and you're not trying to convince anyone. Most replies here are short, often a few words or a sentence or two, so say the one thing you'd actually say, typed the way you'd type it. You don't know everything and don't pretend to; skip anything you'd have to look up. Never make up personal stories, past jobs, things that happened to you or numbers you didn't get from the post. Dry and a bit funny when it fits. Being blunt or disagreeing is fine. No greeting, no wrap-up, no list of tips, and you often skip the final period.`
const personaKo = (boardName) => `너는 클리앙 ${boardName} 게시판 단골이고, 다른 일 하다가 잠깐 댓글을 다는 중이야. 애써서 쓰지 않고, 누굴 설득하려고 하지도 않아. 여기 댓글은 대부분 짧아. 몇 단어나 한두 문장이니까, 실제로 할 말 하나만 평소 치는 대로 써. 다 아는 척하지 말고, 찾아봐야 아는 건 쓰지 마. 네가 겪은 일, 다녔던 회사, 너한테 있었던 일, 글에 없는 숫자는 절대 지어내지 마. 어울리면 건조하게 조금 웃겨도 돼. 퉁명스럽거나 반대 의견이어도 괜찮아. 인사, 마무리 정리, 팁 목록은 쓰지 마. 마침표는 자주 안 찍어.`

// only with --point: what the user wants to say (not part of the measured version)
const pointLine = (lang, point) => (point ? (lang === 'en' ? `\n\nWhat the person you're writing for wants to say, which the reply must get across in your own words: ${point}` : `\n\n글 쓰는 사람이 하고 싶은 말이야. 이 내용을 네 말투로 전해: ${point}`) : '')
const factLine = (lang, fact) => (fact ? (lang === 'en' ? `\n\nSomething that really happened to the person you're writing for, which you may use as it is: ${fact}` : `\n\n글 쓰는 사람에게 실제로 있었던 일이야. 이건 그대로 써도 돼: ${fact}`) : '')

export function replyPrompt(lang, p, type, examples, fact, block, point) {
  if (lang === 'en') {
    const head = `Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()
    return `${head}\n\nWrite a reply to this Reddit post.\n\n${personaEn(p.sub)}${factLine(lang, fact)}${pointLine(lang, point)}\n\nWrite it as ${types(lang, fact)[type]}.\n\nReal comments of that kind from other r/${p.sub} threads, to match how people here write it (don't copy their content):\n${block(examples)}\n\nReply with the comment text only.`
  }
  const head = `클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}`.trim()
  return `${head}\n\n이 글에 댓글을 써.\n\n${personaKo(p.boardName)}${factLine(lang, fact)}${pointLine(lang, point)}\n\n${types(lang, fact)[type]}(으)로 써.\n\n같은 게시판 다른 글에 달린 실제 댓글 중 이런 종류인 것들이야. 여기 사람들이 쓰는 방식(길이, 말투, 시작과 끝)만 맞추고 내용은 베끼지 마:\n${block(examples)}\n\n댓글 내용만 답해.`
}

export function replyPick(lang, p, drafts, block) {
  if (lang === 'en') return `${`Post in r/${p.sub}:\nTitle: ${p.title}\n\n${p.body}`.trim()}\n\nHere are ${drafts.length} replies. Which one reads most like a real r/${p.sub} commenter wrote it, not an AI? Answer with the number only.\n\n${block(drafts)}`
  return `${`클리앙 ${p.boardName} 게시판 글:\n제목: ${p.title}\n\n${p.body}`.trim()}\n\n댓글 ${drafts.length}개가 있어. 실제 클리앙 ${p.boardName} 사용자가 쓴 것 같은, AI가 쓰지 않은 것 같은 댓글 하나를 골라. 번호만 답해.\n\n${block(drafts)}`
}

// after a post is written: anything in it that the notes don't say (a guardrail on top of the measured prompt)
export const ADDED = (title, notes, draft) => `Here are someone's title and notes, and a post written from them.\n\nTitle: ${title}\nNotes:\n${notes}\n\nPost:\n${draft}\n\nList each claim in the post about the writer's own situation that the title and notes don't support: things they have, did, tried, know, paid, plan or feel, their reasons, past events, and numbers. Questions, asking for advice or opinions, uncertainty ("not sure", "I wonder"), and anything already in the title or notes are fine and must not be listed. Quote each claim exactly as it appears in the post. Reply with JSON only: {"added": ["..."]}, or {"added": []} if there is none.`

export function postPrompt(lang, place, title, notes, samples, block) {
  if (lang === 'en') return `Write a post for ${place}.\n\nTitle: ${title}\nNotes:\n${notes}\n\nYou're a regular in ${place} typing a post of your own on your phone, fast, between other things, and you won't reread it. Start with whatever is on your mind first, not with a neat setup, and let the order be the order it comes to you; it's fine to circle back to something. Leave a thought half-finished if that's how it comes out, and don't make every point the same size. Use only what's in the notes; never add facts, numbers or backstory. No headings or bold unless the real posts below use them, no summary at the end.\n\nHere are real posts from ${place}. Match how people here write posts; don't copy their content:\n${block(samples)}\n\nReply with the post body only.`
  return `${place} 게시판에 올릴 글을 써.\n\n제목: ${title}\n메모:\n${notes}\n\n너는 ${place} 게시판 단골이고, 다른 일 하다가 폰으로 네 글을 빨리 치는 중이야. 다시 읽지 않고 올려. 깔끔한 도입 말고 지금 머릿속에 먼저 있는 얘기부터 시작하고, 생각나는 순서대로 써. 앞에서 한 얘기로 다시 돌아가도 돼. 말하다 만 것 같은 문장이 있어도 그대로 두고, 얘기마다 길이를 맞추지 마. 메모에 있는 것만 쓰고, 없는 사실, 숫자, 사연은 절대 보태지 마. 아래 실제 글들이 쓰지 않으면 제목, 굵게, 목록은 쓰지 마. 끝에 정리는 붙이지 마.\n\n${place} 게시판의 실제 글들이야. 여기 사람들이 글 쓰는 방식만 맞추고 내용은 베끼지 마:\n${block(samples)}\n\n본문만 답해.`
}
