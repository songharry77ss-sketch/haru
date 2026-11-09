import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'kr.haru.companion',
  appName: '하루',
  webDir: 'dist',
  backgroundColor: '#fbf6f0',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never', scheme: 'Haru' },
  plugins: {
    SplashScreen: { launchShowDuration: 900, backgroundColor: '#fbf6f0', showSpinner: false },
    StatusBar: { style: 'LIGHT', backgroundColor: '#fbf6f0', overlaysWebView: false },
  },
}

export default config
