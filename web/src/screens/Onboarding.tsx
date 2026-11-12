import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Character, type CharacterHandle } from '../components/Character'
import { FriendFace } from '../components/FriendFace'
import { Back, Check } from '../components/Icons'
import { Sheet } from '../components/Overlay'
import { api } from '../lib/api'
import { CHARACTERS, type CharacterId } from '../lib/characters'
import { tap } from '../lib/native'
import { asset, useHaru } from '../lib/store'

/** The order the friends stand in on the picker. */
const FRIENDS: CharacterId[] = ['bunny', 'otter', 'puppy', 'pinkbunny']
const DEFAULT_NAMES = new Set(Object.values(CHARACTERS).map((c) => c.defaultName))

const AGES = [
  { id: 'child', label: '초등학생' },
  { id: 'teen', label: '중·고등학생' },
  { id: 'adult', label: '어른' },
] as const

export function Onboarding() {
  const { signIn, fail, toast } = useHaru()
  const [step, setStep] = useState(0)
  const [friend, setFriend] = useState<CharacterId>('bunny')
  const [petName, setPetName] = useState('하루')
  const preview = useRef<CharacterHandle>(null)
  const def = CHARACTERS[friend]

  const choose = (id: CharacterId) => {
    if (id === friend) {
      preview.current?.bounce()
      return
    }
    setFriend(id)
    // The suggested name follows the friend until the child types one of their own.
    setPetName((n) => (!n.trim() || DEFAULT_NAMES.has(n) ? CHARACTERS[id].defaultName : n))
    tap()
    window.setTimeout(() => preview.current?.pose('wave_hello', 1900), 60)
  }
  const [nickname, setNickname] = useState('')
  const [age, setAge] = useState<(typeof AGES)[number]['id']>('teen')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [code, setCode] = useState('')

  const start = async () => {
    setBusy(true)
    try {
      const r = await api.register({ nickname: nickname.trim(), ageGroup: age, character: friend, petName: petName.trim() })
      sessionStorage.setItem('haru.first', '1')
      signIn(r.token, r)
    } catch (e) {
      fail(e)
      setBusy(false)
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      const r = await api.restore(code.trim().toUpperCase())
      signIn(r.token, r)
    } catch {
      toast('코드를 다시 확인해 주세요', 'warn')
      setBusy(false)
    }
  }

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="screen onboarding">
      {step > 0 && (
        <div className="topbar">
          <button className="icon-btn" onClick={back} aria-label="뒤로">
            <Back />
          </button>
          <div className="steps" aria-label={`${step} / 4 단계`}>
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          <span style={{ width: 40 }} />
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="ob-body"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="welcome">
              <div className="brand">
                <span className="wordmark">haru</span>
                <span className="wordmark-ko">하루</span>
              </div>
              <i className="brand-rule" />
              <h1 className="tagline">
                <em>말하지 못한 마음</em>을<br />
                가장 먼저 알아주는
                <br />
                AI 친구
              </h1>
              <motion.img
                className="welcome-pet"
                src={asset('friends.webp')}
                alt="하루의 친구들: 토끼, 수달, 강아지, 분홍토끼"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="ob-actions">
                <button className="btn block" onClick={next}>
                  시작하기
                </button>
                <button className="btn block ghost" onClick={() => setRestoring(true)}>
                  이미 친구가 있어요
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="ob-step">
              <h1 className="ob-title">
                Haru와 함께할
                <br />
                친구를 골라줘
              </h1>
              <p className="ob-sub">마음에 드는 친구를 선택해보세요.</p>
              <div className="pick-stage">
                <div className="pick-glow" aria-hidden />
                <div className="pick-pet">
                  <Character ref={preview} character={friend} mood="happy" equipped={{}} interactive={false} quiet />
                </div>
              </div>
              <motion.div className="pick-who" key={friend} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                <b>{def.name}</b>
                <span>{def.blurb}</span>
              </motion.div>
              <div className="friends" role="radiogroup" aria-label="친구 고르기">
                {FRIENDS.map((id) => {
                  const f = CHARACTERS[id]
                  return (
                    <button key={id} role="radio" aria-checked={friend === id} className={`friend ${friend === id ? 'on' : ''}`} onClick={() => choose(id)} aria-label={f.name}>
                      <FriendFace id={id} />
                      {friend === id && (
                        <span className="friend-check">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="ob-actions">
                <button className="btn block" onClick={next}>
                  다음
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ob-step">
              <h1 className="ob-title">친구의 이름을 지어줘</h1>
              <p className="ob-sub">언제든 설정에서 바꿀 수 있어요.</p>
              <img className="name-pet" src={asset(def.calm)} alt="" />
              <input className="field big" value={petName} maxLength={10} onChange={(e) => setPetName(e.target.value)} aria-label="친구 이름" autoFocus />
              <div className="ob-actions">
                <button className="btn block" disabled={!petName.trim()} onClick={next}>
                  좋아요
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="ob-step">
              <h1 className="ob-title">
                {petName}가 너를
                <br />
                뭐라고 부르면 될까?
              </h1>
              <p className="ob-sub">진짜 이름 대신 별명도 좋아요.</p>
              <input className="field big" value={nickname} maxLength={12} placeholder="별명" onChange={(e) => setNickname(e.target.value)} aria-label="내 별명" autoFocus />
              <p className="lbl-sm">나는</p>
              <div className="age-row" role="radiogroup" aria-label="나이대">
                {AGES.map((a) => (
                  <button key={a.id} role="radio" aria-checked={age === a.id} className={`chip ${age === a.id ? 'big-on' : ''}`} aria-pressed={age === a.id} onClick={() => setAge(a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="ob-actions">
                <button className="btn block" disabled={!nickname.trim()} onClick={next}>
                  다음
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="ob-step">
              <h1 className="ob-title">{petName}와의 약속</h1>
              <p className="ob-sub">{age === 'child' ? '보호자와 함께 읽어주세요.' : '시작하기 전에 꼭 읽어주세요.'}</p>
              <ul className="promises">
                <li>
                  <b>🔒 나만의 이야기</b>
                  <span>대화와 일기는 나만 볼 수 있어요. 보호자에게는 마음 리포트만 보여져요.</span>
                </li>
                <li>
                  <b>🤝 힘들 땐 어른과 함께</b>
                  <span>위험한 마음이 느껴지면 {petName}가 도움 받을 수 있는 곳을 알려줄게요.</span>
                </li>
                <li>
                  <b>🌙 하루 30분, 건강하게</b>
                  <span>정해진 시간이 지나면 {petName}는 잠자리에 들어요. 내일 또 만나요!</span>
                </li>
                <li>
                  <b>
                    {def.emoji} {petName}는 AI 친구예요
                  </b>
                  <span>사람이 아니고, 상담이나 치료를 대신하지 않아요.</span>
                </li>
              </ul>
              <label className="agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>{age === 'child' ? '보호자와 함께 읽었어요' : '모두 읽었고 약속할게요'}</span>
              </label>
              <div className="ob-actions">
                <button className="btn block" disabled={!agree || busy} onClick={start}>
                  {busy ? '방을 꾸미는 중…' : `${petName} 만나러 가기`}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Sheet open={restoring} onClose={() => setRestoring(false)} label="복구 코드로 이어하기">
        <div className="buy">
          <h2>복구 코드로 이어하기</h2>
          <p className="muted">설정에서 받은 HARU-로 시작하는 코드를 입력해 주세요.</p>
          <input className="field big mono" placeholder="HARU-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
          <button className="btn block" disabled={code.trim().length < 8 || busy} onClick={restore}>
            이어하기
          </button>
        </div>
      </Sheet>
    </div>
  )
}
