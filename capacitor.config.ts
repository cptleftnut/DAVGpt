import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.davgpt.app',
  appName: 'DAVGpt',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
