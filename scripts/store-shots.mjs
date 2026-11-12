#!/usr/bin/env node
/**
 * Retakes the store screenshots that show the pet (home, feeding, chat, wardrobe) from the running app and sets
 * them into the existing store pictures: the caption and the phone frame stay as they are, only the screen changes.
 *
 *   npm run dev                                   (in another terminal)
 *   node scripts/store-shots.mjs [http://localhost:5173]
 *
 * Needs Google Chrome (set CHROME to its path if it is somewhere unusual). It signs up a throwaway account on the
 * app it is pointed at and deletes it when done, so point it at the local dev server, not at production.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const APP = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const CHROME =
  process.env.CHROME ??
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STORE = path.join(ROOT, 'store')
const PORT = 9377

/** Each store size: the picture, the screen inside its phone frame, and the viewport that has the same shape. */
const FRAMES = {
  ios: { W: 1290, H: 2796, x: 129, y: 478, w: 1032, h: 2236, r: 76, view: 'tall' },
  'ios-6.3': { W: 1206, H: 2622, x: 119, y: 448, w: 968, h: 2097, r: 71, view: 'tall' },
  android: { W: 1080, H: 1920, x: 108, y: 364, w: 864, h: 1536, r: 62, view: 'wide' },
}
const VIEWS = { tall: [430, 932], wide: [432, 768] }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- the account the pictures are taken with ----------
let token = null
async function api(route, { method = 'POST', body } = {}) {
  const res = await fetch(`${APP}/api${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
  return json
}
const gentle = { strokes: 4, taps: 0, avgSpeed: 0.8, peakRate: 2, durationMs: 3000 }
const friend = (character, petName) => api('/settings', { method: 'PATCH', body: { character, petName } })

// ---------- Chrome, driven over its debugging socket ----------
const profile = mkdtempSync(path.join(os.tmpdir(), 'haru-shots-'))
const chrome = spawn(
  CHROME,
  ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', 'about:blank'],
  { stdio: 'ignore' },
)
let send
async function connect() {
  let page
  for (let i = 0; i < 60 && !page; i++) {
    await sleep(250)
    page = await fetch(`http://127.0.0.1:${PORT}/json`)
      .then((r) => r.json())
      .then((list) => list.find((t) => t.type === 'page'))
      .catch(() => undefined)
  }
  if (!page) throw new Error('Chrome did not start. Is CHROME set to the right path?')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((ok, bad) => {
    ws.onopen = ok
    ws.onerror = () => bad(new Error('could not reach Chrome'))
  })
  let seq = 0
  const waiting = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    const w = waiting.get(m.id)
    if (!w) return
    waiting.delete(m.id)
    if (m.error) w.bad(new Error(m.error.message))
    else w.ok(m.result)
  }
  send = (method, params = {}) =>
    new Promise((ok, bad) => {
      const id = ++seq
      waiting.set(id, { ok, bad })
      ws.send(JSON.stringify({ id, method, params }))
    })
  await send('Page.enable')
  await send('Runtime.enable')
}
const run = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result.value
}
async function open(url, [width, height], scale) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: scale > 1 })
  await send('Page.navigate', { url })
  for (let i = 0; i < 80; i++) {
    await sleep(150)
    if ((await run('document.readyState').catch(() => '')) === 'complete') return
  }
  throw new Error(`timed out loading ${url}`)
}
const snap = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')

/** One screen of the app at one viewport; `act` is run in the page once the home screen is up. */
async function screen(view, act, settle = 900) {
  await open(APP, VIEWS[view], 3)
  if ((await run("localStorage.getItem('haru.token')")) !== token) {
    await run(`localStorage.setItem('haru.token', ${JSON.stringify(token)}); localStorage.setItem('haru.seen', String(Date.now()))`)
    await open(APP, VIEWS[view], 3)
  }
  await run("new Promise((ok) => { const t = setInterval(() => { if (document.querySelector('.home')) { clearInterval(t); ok(1) } }, 100) })")
  await run('document.fonts.ready.then(() => 1)')
  // The local server answers without the AI model and says so under the chat box; the released app does not show that line.
  await run("document.head.insertAdjacentHTML('beforeend', '<style>.ai-note{visibility:hidden}</style>')")
  await sleep(1400)
  if (act) {
    await run(act)
    await sleep(settle)
  }
  return snap()
}
const tapNav = (label) => `[...document.querySelectorAll('.nav-btn')].find((b) => b.textContent.includes(${JSON.stringify(label)})).click()`

/** Sets a capture into the store picture of each size that uses this viewport. */
async function place(name, shots) {
  for (const [size, f] of Object.entries(FRAMES)) {
    const raw = path.join(profile, `${f.view}.png`)
    writeFileSync(raw, shots[f.view])
    const target = path.join(STORE, size, `${name}.png`)
    const html = path.join(profile, 'compose.html')
    writeFileSync(
      html,
      `<!doctype html><body style="margin:0;background:#fff">
<img src="${pathToFileURL(target).href}?${Date.now()}" style="position:absolute;left:0;top:0;width:${f.W}px;height:${f.H}px">
<img src="${pathToFileURL(raw).href}?${Date.now()}" style="position:absolute;left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;border-radius:${f.r}px">
</body>`,
    )
    await open(pathToFileURL(html).href, [f.W, f.H], 1)
    await run('Promise.all([...document.images].map((i) => i.decode())).then(() => 1)')
    writeFileSync(target, await snap())
    console.log(`store/${size}/${name}.png`)
  }
}

try {
  mkdirSync(STORE, { recursive: true })
  const reg = await api('/auth/register', { body: { nickname: '솔이', ageGroup: 'teen', character: 'bunny', petName: '하루' } })
  token = reg.token
  for (let i = 0; i < 3; i++) await api('/pet/touch', { body: gentle })
  await api('/pet/feed', { body: { food: 'carrot' } })
  await connect()

  const both = async (act, settle) => ({ tall: await screen('tall', act, settle), wide: await screen('wide', act, settle) })

  await place('1-home', await both())

  await friend('puppy', '콩이')
  await place('2-feed', await both(tapNav('먹이주기'), 700))

  await friend('otter', '모모')
  for (const text of ['오늘 발표했는데 너무 떨렸어', '그래도 끝까지 해냈어!']) await api('/chat', { body: { text } })
  await place('3-chat', await both("document.querySelector('form.chat-bar').requestSubmit()", 1800))

  await friend('pinkbunny', '봄이')
  await api('/shop/buy', { body: { itemId: 'round_glasses' } })
  await api('/pet/equip', { body: { itemId: 'round_glasses' } })
  await place('7-dress', await both(tapNav('꾸미기'), 1300))
} finally {
  if (token) await api('/account', { method: 'DELETE' }).catch((e) => console.error('could not delete the throwaway account:', e.message))
  chrome.kill()
  await sleep(500)
  // Chrome can hold its profile for a moment after it is told to quit; a leftover temp folder is harmless.
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
  } catch {
    console.error(`left a temporary folder behind: ${profile}`)
  }
}
