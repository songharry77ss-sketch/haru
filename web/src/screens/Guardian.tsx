import { useEffect, useState } from 'react'
import { Phone } from '../components/Icons'
import { ApiError, api } from '../lib/api'
import { asset } from '../lib/store'
import { BehaviorTab, ReportTab } from './Analysis'

type Data = Awaited<ReturnType<typeof api.guardian>>

/** Read-only view for parents and teachers: trends and safety signals, never message content. */
export function Guardian({ code }: { code: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'report' | 'behavior'>('report')
  useEffect(() => {
    api
      .guardian(code)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? '코드를 찾을 수 없어요' : '잠시 후 다시 시도해 주세요'))
  }, [code])

  if (error)
    return (
      <div className="screen guardian center-col">
        <img src={asset('bunny_worried.webp')} alt="" style={{ width: 140 }} />
        <h2>{error}</h2>
        <a className="btn" href="/">
          하루 홈으로
        </a>
      </div>
    )
  if (!data) return <div className="screen guardian"><div className="skeleton tall" /></div>

  const high = data.alerts.filter((a) => a.level === 'high').length
  const watch = data.alerts.filter((a) => a.level === 'watch').length

  return (
    <div className="screen guardian">
      <header className="g-head">
        <span className="wordmark small">haru</span>
        <h1>
          {data.nickname}의 마음 리포트
          <small>
            {data.petName}와 {data.relationship.label} 사이
          </small>
        </h1>
      </header>
      <div className="scroll">
        {(high > 0 || watch > 0) && (
          <section className={`card alert ${high ? 'high' : ''}`}>
            <b>{high ? '꼭 확인이 필요한 신호가 있었어요' : '살펴봐 주면 좋은 신호가 있었어요'}</b>
            <p className="small">
              최근 14일 동안 {high ? `위험 신호 ${high}회` : ''}
              {high && watch ? ', ' : ''}
              {watch ? `관심 신호 ${watch}회` : ''}가 감지됐어요. 아이의 사생활 보호를 위해 대화 내용은 보여드리지 않아요.
              {high ? ' 오늘 아이와 따뜻하게 이야기 나눠 주시고, 필요하면 전문 기관의 도움을 받아주세요.' : ''}
            </p>
            <ul className="alert-days">
              {data.alerts.slice(0, 6).map((a, i) => (
                <li key={i}>
                  {a.day.slice(5).replace('-', '/')} {a.hour}시 · {a.level === 'high' ? '위험' : '관심'}
                </li>
              ))}
            </ul>
            <div className="help-list">
              {data.helplines.map((h) => (
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
        )}
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')}>
            마음 리포트
          </button>
          <button role="tab" aria-selected={tab === 'behavior'} onClick={() => setTab('behavior')}>
            행동 분석
          </button>
        </div>
        <div className="analysis-body">{tab === 'report' ? <ReportTab data={data.report} /> : <BehaviorTab data={data.behavior} />}</div>
        <p className="muted small center pad">
          하루는 의학적 진단 도구가 아니에요. 아이의 마음을 살피는 참고 자료로 활용해 주세요. 하루 사용 시간: {data.dailyLimitMin}분
        </p>
      </div>
    </div>
  )
}
