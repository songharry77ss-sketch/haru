import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

/** Light haptic tap on supported devices; silently does nothing on the web. */
export async function tap(kind: 'light' | 'medium' = 'light') {
  if (!isNative) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium })
  } catch {
    /* haptics unavailable */
  }
}

/** Status bar styling and the Android back button: close the open panel first, then leave the app. */
export async function initNative(onBack: () => boolean) {
  if (!isNative) return
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ])
  StatusBar.setStyle({ style: Style.Light }).catch(() => undefined)
  if (Capacitor.getPlatform() === 'android') StatusBar.setBackgroundColor({ color: '#fbf6f0' }).catch(() => undefined)
  App.addListener('backButton', () => {
    if (!onBack()) App.minimizeApp()
  })
  SplashScreen.hide().catch(() => undefined)
}
