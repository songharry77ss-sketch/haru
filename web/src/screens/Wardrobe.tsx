import { useState } from 'react'
import { AccessoryIcon } from '../components/Accessory'
import { Check, Coin, Gem, Lock } from '../components/Icons'
import { Panel, Sheet } from '../components/Overlay'
import { Stage } from '../components/Stage'
import { api, type Item } from '../lib/api'
import { useHaru } from '../lib/store'

const CATS = [
  { key: 'all', label: '전체' },
  { key: 'hat', label: '모자' },
  { key: 'face', label: '얼굴' },
  { key: 'neck', label: '목' },
  { key: 'theme', label: '방' },
] as const

const THEME_SWATCH: Record<string, string> = {
  theme_sunny: 'linear-gradient(135deg,#fbe9d8,#f2d3b8)',
  theme_sunset: 'linear-gradient(135deg,#ffc79a,#f2847a)',
  theme_night: 'linear-gradient(135deg,#3b3f6b,#8c7bb8)',
  theme_blossom: 'linear-gradient(135deg,#ffd6e2,#f6a7bf)',
}

export function ItemThumb({ item }: { item: Item }) {
  if (item.kind === 'theme')
    return (
      <span className="theme-swatch" style={{ background: THEME_SWATCH[item.id] }}>
        {item.id === 'theme_night' ? '✦' : item.id === 'theme_blossom' ? '🌸' : item.id === 'theme_sunset' ? '☀' : '☼'}
      </span>
    )
  return <AccessoryIcon id={item.id} size={58} />
}

export function Price({ item }: { item: Item }) {
  if (item.price === 0) return <span className="price">무료</span>
  return (
    <span className="price">
      {item.currency === 'coins' ? <Coin size={14} /> : <Gem size={14} />} {item.price}
    </span>
  )
}

export function useBuy() {
  const { state, apply, toast, fail } = useHaru()
  const [pending, setPending] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const confirm = async (andEquip = false) => {
    if (!pending) return
    setBusy(true)
    try {
      apply(await api.buy(pending.id))
      if (andEquip) apply(await api.equip(pending.id))
      toast(`${pending.name}을(를) 얻었어요!`, 'reward')
      setPending(null)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  const balance = pending ? (pending.currency === 'coins' ? state!.user.coins : state!.user.gems) : 0
  const sheet = (andEquip: boolean) => (
    <Sheet open={pending !== null} onClose={() => setPending(null)} label="구매 확인">
      {pending && (
        <div className="buy">
          <div className="buy-thumb">
            <ItemThumb item={pending} />
          </div>
          <h2>{pending.name}</h2>
          <p className="muted">{pending.description}</p>
          <div className="buy-row">
            <span>가격</span>
            <Price item={pending} />
          </div>
          <div className="buy-row">
            <span>보유</span>
            <span className="price">
              {pending.currency === 'coins' ? <Coin size={14} /> : <Gem size={14} />} {balance}
            </span>
          </div>
          <button className="btn block" disabled={busy || balance < pending.price} onClick={() => confirm(andEquip)}>
            {balance < pending.price ? (pending.currency === 'coins' ? '코인이 부족해요' : '보석이 부족해요') : andEquip ? '사서 바로 입기' : '구매하기'}
          </button>
          {balance < pending.price && <p className="muted center small">하루를 돌보고 일기를 쓰면 코인과 보석을 모을 수 있어요</p>}
        </div>
      )}
    </Sheet>
  )
  return { setPending, sheet }
}

export function Wardrobe({ onClose }: { onClose: () => void }) {
  const { state, catalog, apply, fail } = useHaru()
  const [cat, setCat] = useState<(typeof CATS)[number]['key']>('all')
  const { setPending, sheet } = useBuy()
  if (!state || !catalog) return null
  const { pet, inventory } = state
  const items = catalog.items.filter((i) => i.kind !== 'food' && (cat === 'all' ? true : cat === 'theme' ? i.kind === 'theme' : i.slot === cat))

  const isOn = (i: Item) => (i.kind === 'theme' ? `theme_${pet.theme}` === i.id : Object.values(pet.equipped).includes(i.id))

  const tap = async (i: Item) => {
    if (!inventory.includes(i.id)) return setPending(i)
    try {
      apply(await api.equip(i.id))
    } catch (e) {
      fail(e)
    }
  }

  return (
    <Panel title="꾸미기" onClose={onClose} className="wardrobe">
      <div className="wardrobe-stage">
        <Stage mood={pet.mood === 'hurt' ? 'calm' : pet.mood} equipped={pet.equipped} theme={pet.theme} interactive={false} />
      </div>
      <div className="cat-row" role="tablist">
        {CATS.map((c) => (
          <button key={c.key} className="chip" aria-pressed={cat === c.key} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="scroll">
        <div className="item-grid">
          {items.map((i) => {
            const owned = inventory.includes(i.id)
            const on = isOn(i)
            return (
              <button key={i.id} className={`item ${on ? 'on' : ''} ${owned ? '' : 'locked'}`} onClick={() => tap(i)} aria-pressed={on}>
                {on && (
                  <span className="item-check">
                    <Check size={14} />
                  </span>
                )}
                {!owned && (
                  <span className="item-lock">
                    <Lock size={12} />
                  </span>
                )}
                <ItemThumb item={i} />
                <span className="item-name">{i.name}</span>
                {!owned && <Price item={i} />}
              </button>
            )
          })}
        </div>
      </div>
      {sheet(true)}
    </Panel>
  )
}

export function Shop({ onClose }: { onClose: () => void }) {
  const { state, catalog } = useHaru()
  const { setPending, sheet } = useBuy()
  if (!state || !catalog) return null
  const groups = [
    { title: '모자', items: catalog.items.filter((i) => i.slot === 'hat') },
    { title: '얼굴 · 목', items: catalog.items.filter((i) => i.slot === 'face' || i.slot === 'neck') },
    { title: '방 테마', items: catalog.items.filter((i) => i.kind === 'theme') },
  ]
  return (
    <Panel
      title="상점"
      onClose={onClose}
      right={
        <span className="pill small-pill">
          <Coin size={16} /> {state.user.coins} <Gem size={16} /> {state.user.gems}
        </span>
      }
    >
      <div className="scroll shop">
        <div className="shop-banner">
          <b>하루를 돌보면 코인이 쌓여요</b>
          <span>쓰다듬기 · 밥 시간 지키기 · 대화 · 마음 일기로 매일 모아보세요</span>
        </div>
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="section-title">{g.title}</h2>
            <div className="item-grid">
              {g.items.map((i) => {
                const owned = state.inventory.includes(i.id)
                return (
                  <button key={i.id} className={`item ${owned ? 'owned' : ''}`} onClick={() => !owned && setPending(i)} disabled={owned}>
                    <ItemThumb item={i} />
                    <span className="item-name">{i.name}</span>
                    {owned ? <span className="price owned-label">보유 중</span> : <Price item={i} />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {sheet(false)}
    </Panel>
  )
}
