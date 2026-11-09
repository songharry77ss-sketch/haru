import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HelpSheet, Toasts } from './components/Overlay'
import { initNative } from './lib/native'
import { HaruProvider, asset, useHaru } from './lib/store'
import { Analysis } from './screens/Analysis'
import { Chat } from './screens/Chat'
import { Quests, RestMode } from './screens/Extras'
import { Guardian } from './screens/Guardian'
import { Home, type Overlay } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { Play } from './screens/Play'
import { Settings } from './screens/Settings'
import { Shop, Wardrobe } from './screens/Wardrobe'

function Shell() {
  const { state, booting } = useHaru()
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [analysisTab, setAnalysisTab] = useState<'diary' | 'behavior' | 'report'>('diary')
  const [firstVisit] = useState(() => sessionStorage.getItem('haru.first') === '1')
  const close = useCallback(() => setOverlay(null), [])
  const open = useRef<Overlay>(null)
  open.current = overlay
  useEffect(() => {
    initNative(() => {
      if (open.current) {
        setOverlay(null)
        return true
      }
      return false
    })
  }, [])

  if (booting)
    return (
      <div className="screen splash">
        <motion.img src={asset('bunny_calm.webp')} alt="" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <span className="wordmark">haru</span>
      </div>
    )
  if (!state) return <Onboarding />

  const rest = state.usage.restMode
  return (
    <>
      <Home
        firstVisit={firstVisit}
        open={(o) => {
          if (o === 'analysis') setAnalysisTab('diary')
          setOverlay(o)
        }}
      />
      <AnimatePresence>
        {overlay === 'chat' && !rest && <Chat key="chat" onClose={close} />}
        {overlay === 'wardrobe' && <Wardrobe key="wardrobe" onClose={close} />}
        {overlay === 'shop' && <Shop key="shop" onClose={close} />}
        {overlay === 'analysis' && <Analysis key="analysis" onClose={close} initialTab={analysisTab} />}
        {overlay === 'settings' && <Settings key="settings" onClose={close} />}
        {overlay === 'play' && !rest && <Play key="play" onClose={close} />}
      </AnimatePresence>
      <Quests open={overlay === 'quests'} onClose={close} />
      {rest && overlay !== 'analysis' && overlay !== 'settings' && (
        <RestMode
          onDiary={() => {
            setAnalysisTab('diary')
            setOverlay('analysis')
          }}
        />
      )}
    </>
  )
}

export default function App() {
  const guardian = location.pathname.match(/^\/guardian\/([A-Za-z0-9-]+)/)
  return (
    <HaruProvider>
      <main className="frame">
        {guardian ? <Guardian code={guardian[1]} /> : <Shell />}
        <Toasts />
        <HelpSheet />
      </main>
    </HaruProvider>
  )
}
