import { useState, useCallback, useEffect } from 'react'
import styles from './App.module.css'
import Auth from './Auth.jsx'
import { supabase } from './supabase.js'

// ─── ACSF levels ─────────────────────────────────────────────────────────────

const LEVELS = [
  { id: 'pla-low',  label: 'PLA',     sublabel: 'Low',  qCount: 3, desc: 'Pre-Level A (early). Single very short sentences, 3-5 word sentences only, the most common 100 words, one simple concrete idea. Example topics: a pet, the weather, food. Maximum 2-3 sentences total.' },
  { id: 'pla-mid',  label: 'PLA',     sublabel: 'Mid',  qCount: 3, desc: 'Pre-Level A (mid). Short simple sentences of 5-8 words. High-frequency words. One clear idea per sentence. 3-4 sentences total. Example topics: daily routines, animals, simple actions.' },
  { id: 'pla-high', label: 'PLA',     sublabel: 'High', qCount: 4, desc: "Pre-Level A (high). Simple sentences up to 10 words, very familiar vocabulary, 1 short paragraph (4-5 sentences). Some connecting words like 'and', 'but', 'so'. Example topics: family, school, seasons." },
  { id: 'plb-low',  label: 'PLB',     sublabel: 'Low',  qCount: 4, desc: 'Pre-Level B (low). Simple sentences in a short paragraph (5-6 sentences). Familiar everyday vocabulary, minimal complex words. Simple narrative or factual structure. Example topics: community, animals, simple events.' },
  { id: 'plb-mid',  label: 'PLB',     sublabel: 'Mid',  qCount: 5, desc: 'Pre-Level B (mid). 1-2 short paragraphs. Some compound sentences. Mostly familiar vocabulary with a few new words in context. Clear topic sentence. Example topics: local environment, sports, basic science.' },
  { id: 'plb-high', label: 'PLB',     sublabel: 'High', qCount: 5, desc: 'Pre-Level B (high). 2 paragraphs. Mix of simple and compound sentences. Mostly common vocabulary with some less familiar words. Logical sequencing. Example topics: technology, history events, health.' },
  { id: 'l1-low',   label: 'Level 1', sublabel: 'Low',  qCount: 6, desc: 'ACSF Level 1 (low). 2-3 paragraphs. Compound and some complex sentences. General vocabulary with some specialised terms explained in context. Clear structure with introduction and conclusion. Example topics: environment, social issues, Australian history.' },
  { id: 'l1-high',  label: 'Level 1', sublabel: 'High', qCount: 6, desc: 'ACSF Level 1 (high). 3 paragraphs. Complex sentences with subordinate clauses. Broader vocabulary including some technical terms. Clear argument or narrative arc. Example topics: current events, science concepts, cultural topics.' },
  { id: 'l2-low',   label: 'Level 2', sublabel: 'Low',  qCount: 7, desc: "ACSF Level 2 (low). 3-4 paragraphs. Complex sentence structures. Moderately specialised vocabulary. Texts require some inference. Author's position may be implied. Example topics: policy, science, history, media." },
  { id: 'l2-high',  label: 'Level 2', sublabel: 'High', qCount: 8, desc: "ACSF Level 2 (high). 4 paragraphs. Sophisticated sentence variety. Specialised vocabulary used accurately. Texts require inference and interpretation. Nuanced argument or perspective. Example topics: economics, ethics, scientific debate." },
  { id: 'l3',       label: 'Level 3', sublabel: '',     qCount: 9, desc: "ACSF Level 3. 4-5 dense paragraphs. Complex, varied syntax. Extensive specialised vocabulary. Abstract concepts. Requires critical analysis, evaluation of author's purpose, tone and bias. Example topics: academic argument, complex policy analysis, philosophical or scientific theory." },
]

const SCREEN = {
  HOME: 'home', LOADING: 'loading', QUESTIONS: 'questions',
  RESULT: 'result', HISTORY: 'history', HISTORY_ITEM: 'history_item',
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function callClaude(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) { const txt = await res.text(); throw new Error(`API ${res.status}: ${txt}`) }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function loadProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

async function saveProfile(userId, { levelIndex, textsRead, scores, history }) {
  await supabase.from('profiles').upsert({
    id: userId,
    level_index: levelIndex,
    texts_read: textsRead,
    scores,
    history,
    updated_at: new Date().toISOString(),
  })
}

// ─── UI components ────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  )
}

function LevelPill({ lv }) {
  return (
    <span className={styles.levelPill}>
      {lv.label}{lv.sublabel ? ' · ' + lv.sublabel : ''}
    </span>
  )
}

function Tag({ children }) {
  return <span className={styles.tag}>{children}</span>
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button className={styles.primaryBtn} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function OutlineBtn({ onClick, children }) {
  return <button className={styles.outlineBtn} onClick={onClick}>{children}</button>
}

function GhostBtn({ onClick, children }) {
  return <button className={styles.ghostBtn} onClick={onClick}>{children}</button>
}

function Spinner({ text }) {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
      <div className={styles.spinnerText}>{text || 'Generating your reading...'}</div>
    </div>
  )
}

function RadioOption({ label, state, onClick }) {
  const cls = [styles.radioOption, styles['radioOption_' + state]].filter(Boolean).join(' ')
  return (
    <div className={cls} onClick={state === 'idle' ? onClick : undefined}
      role="button" tabIndex={state === 'idle' ? 0 : -1}
      onKeyDown={e => { if (state === 'idle' && (e.key === 'Enter' || e.key === ' ')) onClick() }}>
      <div className={styles.radioDot}><div className={styles.radioDotInner} /></div>
      <span className={styles.radioLabel}>
        {label}
        {state === 'correct' && <span className={styles.radioHint}> ✓ Correct</span>}
        {state === 'wrong'   && <span className={styles.radioHint}> ✗ Incorrect</span>}
        {state === 'reveal'  && <span className={styles.radioHint}> ← Correct answer</span>}
      </span>
    </div>
  )
}

function QuestionBlock({ q, qi, picked, onPick }) {
  return (
    <div className={styles.questionBlock}>
      <div className={styles.questionText}>{qi + 1}. {q.question}</div>
      {q.options.map((opt, oi) => {
        let state = 'idle'
        if (picked !== undefined) {
          if (oi === q.correct)   state = picked === oi ? 'correct' : 'reveal'
          else if (oi === picked) state = 'wrong'
        }
        return <RadioOption key={oi} label={opt} state={state} onClick={() => onPick(qi, oi)} />
      })}
    </div>
  )
}

function SplitLayout({ topBar, leftContent, rightContent }) {
  return (
    <div className={styles.splitRoot}>
      {topBar && <div className={styles.splitTopBar}>{topBar}</div>}
      <div className={styles.splitBody}>
        <div className={styles.splitLeft}>{leftContent}</div>
        <div className={styles.splitRight}>{rightContent}</div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]           = useState(SCREEN.HOME)
  const [levelIndex, setLevelIndex]   = useState(0)
  const [textsRead, setTextsRead]     = useState(0)
  const [scores, setScores]           = useState([])
  const [passage, setPassage]         = useState(null)
  const [answers, setAnswers]         = useState({})
  const [answered, setAnswered]       = useState(0)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [history, setHistory]         = useState([])
  const [historyItem, setHistoryItem] = useState(null)

  // Auth state
  const [user, setUser]               = useState(null)
  const [authReady, setAuthReady]     = useState(false)
  const [showAuth, setShowAuth]       = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const lv      = LEVELS[levelIndex]
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const lvLabel  = lv.label + (lv.sublabel ? ' ' + lv.sublabel : '')

  // ── Auth listener — runs once on mount ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load profile when user logs in ──
  useEffect(() => {
    if (!user) return
    setProfileLoading(true)
    loadProfile(user.id).then(profile => {
      if (profile) {
        setLevelIndex(profile.level_index ?? 0)
        setTextsRead(profile.texts_read ?? 0)
        setScores(profile.scores ?? [])
        setHistory(profile.history ?? [])
      }
      setProfileLoading(false)
    })
  }, [user])

  // ── Save profile whenever progress changes (only if logged in) ──
  useEffect(() => {
    if (!user || profileLoading) return
    saveProfile(user.id, { levelIndex, textsRead, scores, history })
  }, [user, levelIndex, textsRead, scores, history])

  async function handleSignOut() {
    await supabase.auth.signOut()
    // Reset progress to defaults on sign out
    setLevelIndex(0)
    setTextsRead(0)
    setScores([])
    setHistory([])
    setScreen(SCREEN.HOME)
  }

  // ── Generate reading ──
  const generateReading = useCallback(async (idx) => {
    const level = LEVELS[idx]
    setError('')
    setScreen(SCREEN.LOADING)
    const genre = Math.random() < 0.5 ? 'fiction' : 'non-fiction'

    const prompt = `Generate a ${genre} reading passage for an Australian adult literacy student at ACSF level: ${level.label}${level.sublabel ? ' ' + level.sublabel : ''}.

Level description: ${level.desc}

Produce exactly ${level.qCount} multiple-choice questions with 4 options each, appropriate for this level:
- PLA levels: basic recall only, very simple question wording.
- PLB levels: recall and simple comprehension, straightforward question wording.
- Level 1: comprehension and simple inference, some vocabulary questions.
- Level 2+: inference, vocabulary in context, author's purpose/tone, critical analysis.

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "title": "...",
  "genre": "${genre}",
  "passage": "paragraph1\\n\\nparagraph2\\n\\nparagraph3",
  "questions": [
    {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 0}
  ]
}
"correct" is 0-indexed (0=A, 1=B, 2=C, 3=D). Produce exactly ${level.qCount} questions.`

    try {
      const data = await callClaude(prompt)
      setPassage(data)
      setAnswers({})
      setAnswered(0)
      setScreen(SCREEN.QUESTIONS)
    } catch (e) {
      setError('Error: ' + e.message)
      setScreen(SCREEN.HOME)
    }
  }, [])

  function pickAnswer(qi, oi) {
    if (answers[qi] !== undefined) return
    setAnswers(prev => ({ ...prev, [qi]: oi }))
    setAnswered(prev => prev + 1)
  }

  function submitAnswers() {
    const total   = passage.questions.length
    const correct = passage.questions.filter((q, i) => answers[i] === q.correct).length
    const pct     = Math.round((correct / total) * 100)

    const newScores = [...scores, pct]
    const newTextsRead = textsRead + 1
    const newHistory = [
      { passage, answers: { ...answers }, pct, correct, total, levelLabel: lvLabel, date: new Date().toLocaleString() },
      ...history,
    ]

    let badge, badgeType, msg, newIndex = levelIndex
    if (pct > 80) {
      newIndex = Math.min(levelIndex + 1, LEVELS.length - 1)
      if (newIndex > levelIndex) {
        const nl = LEVELS[newIndex]
        badge = `Level up! → ${nl.label}${nl.sublabel ? ' ' + nl.sublabel : ''}`
        badgeType = 'up'; msg = 'Excellent! Moving you to a higher level.'
      } else {
        badge = "You've reached the highest level!"; badgeType = 'up'; msg = 'Outstanding — Level 3 mastered!'
      }
    } else if (pct >= 60) {
      badge = `Staying at ${lvLabel}`; badgeType = 'same'; msg = 'Good effort. Keep practising at this level.'
    } else {
      newIndex = Math.max(levelIndex - 1, 0)
      if (newIndex < levelIndex) {
        const nl = LEVELS[newIndex]
        badge = `Adjusting down → ${nl.label}${nl.sublabel ? ' ' + nl.sublabel : ''}`
        badgeType = 'down'; msg = "Let's try something a little easier next."
      } else {
        badge = 'Staying at PLA Low'; badgeType = 'same'; msg = "Keep reading — you'll improve!"
      }
    }

    setScores(newScores)
    setTextsRead(newTextsRead)
    setHistory(newHistory)
    setLevelIndex(newIndex)
    setResult({ pct, correct, total, badge, badgeType, msg, newIndex })
    setScreen(SCREEN.RESULT)
  }

  const makePassagePane = (p) => (
    <div>
      <h2 className={styles.passageTitle}>{p.title}</h2>
      {p.passage.split('\n').filter(Boolean).map((para, i) => (
        <p key={i} className={styles.passagePara}>{para}</p>
      ))}
    </div>
  )

  const progressDots = passage ? (
    <div className={styles.progressDots}>
      {passage.questions.map((q, i) => {
        const a = answers[i]
        const state = a === undefined ? 'unanswered' : a === q.correct ? 'correct' : 'wrong'
        return <div key={i} className={[styles.dot, styles['dot_' + state]].join(' ')} />
      })}
    </div>
  ) : null

  // ── Auth bar shown at top of home screen ──
  const authBar = (
    <div className={styles.authBar}>
      {user ? (
        <>
          <span className={styles.authEmail}>{user.email}</span>
          <button className={styles.authLink} onClick={handleSignOut}>Sign out</button>
        </>
      ) : (
        <>
          <span className={styles.authGuest}>Not signed in — progress won't be saved</span>
          <button className={styles.authLink} onClick={() => setShowAuth(true)}>Log in / Sign up</button>
        </>
      )}
    </div>
  )

  // ── Wait for Supabase to check session before rendering ──
  if (!authReady || profileLoading) return (
    <div className={styles.pageCenter}><Spinner text="Loading..." /></div>
  )

  // ─────────────────────────────────────────────────────────────────────────

  if (screen === SCREEN.LOADING) return (
    <div className={styles.pageCenter}><Spinner /></div>
  )

  if (screen === SCREEN.HOME) return (
    <div className={styles.pageCenter}>
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      <div className={styles.homeWrap}>
        {authBar}
        <div className={styles.homeHero}>
          <h1 className={styles.homeTitle}>Adaptive Reading</h1>
          <p className={styles.homeSub}>Texts that grow with you — ACSF levels</p>
        </div>
        <div className={styles.statsGrid}>
          <StatCard label="ACSF level" value={lvLabel} />
          <StatCard label="Texts read" value={textsRead} />
          <StatCard label="Avg score"  value={avgScore !== null ? avgScore + '%' : '—'} />
        </div>
        <div className={styles.homeActions}>
          <PrimaryBtn onClick={() => generateReading(levelIndex)}>Next reading</PrimaryBtn>
          <OutlineBtn onClick={() => { setHistoryItem(null); setScreen(SCREEN.HISTORY) }}>
            History{history.length > 0 ? ` (${history.length})` : ''}
          </OutlineBtn>
        </div>
        {error && <div className={styles.errorBox}>{error}</div>}
      </div>
    </div>
  )

  if (screen === SCREEN.QUESTIONS && passage) {
    const allAnswered = answered >= passage.questions.length
    return (
      <SplitLayout
        topBar={<><LevelPill lv={lv} /><Tag>{passage.genre}</Tag>{progressDots}</>}
        leftContent={makePassagePane(passage)}
        rightContent={
          <div>
            <div className={styles.questionsHeader}>
              Questions — {answered} of {passage.questions.length} answered
            </div>
            {passage.questions.map((q, qi) => (
              <QuestionBlock key={qi} q={q} qi={qi} picked={answers[qi]} onPick={pickAnswer} />
            ))}
            <div className={styles.submitRow}>
              <PrimaryBtn onClick={submitAnswers} disabled={!allAnswered}>Submit answers</PrimaryBtn>
            </div>
          </div>
        }
      />
    )
  }

  if (screen === SCREEN.RESULT && result) return (
    <div className={styles.pageCenter}>
      <div className={styles.resultCard}>
        <div className={styles.resultScoreLabel}>Your score</div>
        <div className={styles.resultScore}>{result.pct}%</div>
        <div className={styles.resultMsg}>{result.correct} of {result.total} correct — {result.msg}</div>
        <div className={[styles.resultBadge, styles['resultBadge_' + result.badgeType]].join(' ')}>
          {result.badge}
        </div>
        {user && <div className={styles.savedNote}>Progress saved</div>}
        <div className={styles.resultActions}>
          <PrimaryBtn onClick={() => generateReading(result.newIndex)}>Next reading</PrimaryBtn>
          <OutlineBtn onClick={() => setScreen(SCREEN.HOME)}>Home</OutlineBtn>
        </div>
      </div>
    </div>
  )

  if (screen === SCREEN.HISTORY) return (
    <div className={styles.pageCenter}>
      <div className={styles.historyWrap}>
        <div className={styles.historyHeader}>
          <h2 className={styles.historyTitle}>Reading history</h2>
          <GhostBtn onClick={() => setScreen(SCREEN.HOME)}>← Back</GhostBtn>
        </div>
        {history.length === 0
          ? <div className={styles.historyEmpty}>No readings yet. Complete a reading to see it here.</div>
          : history.map((item, i) => (
            <div key={i} className={styles.historyRow} onClick={() => { setHistoryItem(item); setScreen(SCREEN.HISTORY_ITEM) }}>
              <div className={styles.historyRowLeft}>
                <div className={styles.historyRowTitle}>{item.passage.title}</div>
                <div className={styles.historyRowMeta}>{item.levelLabel} · {item.passage.genre} · {item.date}</div>
              </div>
              <div className={styles.historyRowScore}>
                <div className={styles.historyRowPct}>{item.pct}%</div>
                <div className={styles.historyRowFrac}>{item.correct}/{item.total}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )

  if (screen === SCREEN.HISTORY_ITEM && historyItem) {
    const scoreBadgeType = historyItem.pct > 80 ? 'up' : historyItem.pct >= 60 ? 'same' : 'down'
    return (
      <SplitLayout
        topBar={
          <>
            <GhostBtn onClick={() => setScreen(SCREEN.HISTORY)}>← History</GhostBtn>
            <span className={styles.levelPill}>{historyItem.levelLabel}</span>
            <Tag>{historyItem.passage.genre}</Tag>
            <span className={[styles.resultBadge, styles['resultBadge_' + scoreBadgeType]].join(' ')} style={{ fontSize: 12, padding: '3px 10px' }}>
              {historyItem.pct}%
            </span>
            <Tag>{historyItem.date}</Tag>
          </>
        }
        leftContent={makePassagePane(historyItem.passage)}
        rightContent={
          <div>
            <div className={styles.questionsHeader}>
              Questions — scored {historyItem.pct}% ({historyItem.correct}/{historyItem.total})
            </div>
            {historyItem.passage.questions.map((q, qi) => (
              <QuestionBlock key={qi} q={q} qi={qi} picked={historyItem.answers[qi]} onPick={() => {}} />
            ))}
          </div>
        }
      />
    )
  }

  return null
}
