import { useState } from 'react'
import { Check, Phone } from '../components/Icons'
import { Panel, Sheet } from '../components/Overlay'
import { PUBLIC_URL, api } from '../lib/api'
import { useHaru } from '../lib/store'

export function Settings({ onClose }: { onClose: () => void }) {
  const { state, catalog, apply, toast, fail, signOut } = useHaru()
  const [petName, setPetName] = useState(state?.user.petName ?? '')
  const [nickname, setNickname] = useState(state?.user.nickname ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!state) return null
  const { user } = state
  const guardianUrl = `${PUBLIC_URL}/guardian/${user.guardianCode}`

  const save = async (body: Parameters<typeof api.settings>[0]) => {
    try {
      apply(await api.settings(body))
      toast('저장했어요')
    } catch (e) {
      fail(e)
    }
  }

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label}을(를) 복사했어요`)
    } catch {
      toast(text)
    }
  }

  return (
    <Panel title="설정" onClose={onClose}>
      <div className="scroll settings">
        <section className="card">
          <h2 className="section-title">프로필</h2>
          <label className="lbl">
            친구 이름
            <div className="inline">
              <input className="field" value={petName} maxLength={10} onChange={(e) => setPetName(e.target.value)} />
              <button className="btn small" disabled={!petName.trim() || petName === user.petName} onClick={() => save({ petName: petName.trim() })}>
                저장
              </button>
            </div>
          </label>
          <label className="lbl">
            내 이름
            <div className="inline">
              <input className="field" value={nickname} maxLength={12} onChange={(e) => setNickname(e.target.value)} />
              <button className="btn small" disabled={!nickname.trim() || nickname === user.nickname} onClick={() => save({ nickname: nickname.trim() })}>
                저장
              </button>
            </div>
          </label>
        </section>

        <section className="card">
          <h2 className="section-title">건강한 사용</h2>
          <p className="muted small">하루와 너무 오래 있지 않도록, 정한 시간이 지나면 {user.petName}가 잠자리에 들어요.</p>
          <div className="seg-control" role="radiogroup" aria-label="하루 사용 시간">
            {[20, 30, 45, 60].map((m) => (
              <button key={m} role="radio" aria-checked={user.dailyLimitMin === m} className={user.dailyLimitMin === m ? 'on' : ''} onClick={() => save({ dailyLimitMin: m })}>
                {m}분
              </button>
            ))}
          </div>
          <p className="muted small">
            오늘 {Math.floor(state.usage.usedSec / 60)}분 사용 · {Math.ceil(state.usage.remainingSec / 60)}분 남음
          </p>
        </section>

        <section className="card">
          <h2 className="section-title">보호자 · 선생님 연결</h2>
          <p className="muted small">
            보호자는 마음 리포트와 위험 신호 알림만 볼 수 있어요. <b>대화 내용과 일기는 절대 보이지 않아요.</b>
          </p>
          <div className="code-box">
            <span>보호자 코드</span>
            <b>{user.guardianCode}</b>
          </div>
          <button className="btn block soft" onClick={() => copy(guardianUrl, '보호자 링크')}>
            보호자 링크 복사
          </button>
        </section>

        <section className="card">
          <h2 className="section-title">다른 기기에서 이어하기</h2>
          <p className="muted small">이 코드를 안전한 곳에 적어두면, 새 기기에서도 {user.petName}를 다시 만날 수 있어요.</p>
          <div className="code-box">
            <span>복구 코드</span>
            <b>{user.recoveryCode}</b>
          </div>
          <button className="btn block soft" onClick={() => copy(user.recoveryCode, '복구 코드')}>
            복구 코드 복사
          </button>
        </section>

        <section className="card">
          <h2 className="section-title">도움이 필요할 때</h2>
          <div className="help-list">
            {(catalog?.helplines ?? []).map((h) => (
              <a key={h.tel} className="help-item" href={`tel:${h.tel}`}>
                <span className="help-icon">
                  <Phone />
                </span>
                <span>
                  <b>{h.name}</b>
                  <small>{h.note}</small>
                </span>
                <span className="help-tel">{h.tel}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="card about">
          <p className="small muted">
            대화 모드: {state.ai === 'model' ? 'AI 대화 (Claude)' : '간단한 대화 모드'}
            <br />
            하루는 상담·치료를 대신하지 않아요. 마음이 많이 힘들 땐 꼭 주변 어른이나 전문가와 이야기해 주세요.
          </p>
          <p className="small links">
            <a href={`${PUBLIC_URL}/privacy`} target="_blank" rel="noreferrer">
              개인정보처리방침
            </a>
            {' · '}
            <a href={`${PUBLIC_URL}/terms`} target="_blank" rel="noreferrer">
              이용약관
            </a>
            {' · '}
            <a href={`${PUBLIC_URL}/support`} target="_blank" rel="noreferrer">
              고객지원
            </a>
          </p>
          <button className="link danger" onClick={() => setConfirmDelete(true)}>
            모든 기록 지우고 처음부터 시작하기
          </button>
        </section>
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} label="계정 삭제 확인">
        <div className="buy">
          <h2>정말 모든 기록을 지울까요?</h2>
          <p className="muted">{user.petName}와의 추억, 대화, 일기, 리포트가 모두 지워지고 되돌릴 수 없어요.</p>
          <button
            className="btn block"
            style={{ background: '#d9534f' }}
            onClick={async () => {
              try {
                await api.deleteAccount()
                signOut()
              } catch (e) {
                fail(e)
              }
            }}
          >
            <Check /> 모두 지우기
          </button>
          <button className="btn block ghost" onClick={() => setConfirmDelete(false)}>
            취소
          </button>
        </div>
      </Sheet>
    </Panel>
  )
}
