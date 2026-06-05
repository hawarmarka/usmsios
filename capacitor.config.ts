import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hawar.usms',
  appName: 'USMS',
  webDir: 'public',
  server: {
    url: 'https://usms.hawarserver.com',
    cleartext: false
  },
  ios: {
    scheme: 'USMS',
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    backgroundColor: '#0e1621'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0e1621',
      showSpinner: false
    }
  }
};

export default config;
