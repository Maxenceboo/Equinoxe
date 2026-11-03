import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.objectifsperso.app',
  appName: 'Équinoxe',
  webDir: 'dist/frontend/browser',
  server: {
    // En développement le serveur est en http : l'app doit l'être aussi (sinon contenu mixte bloqué).
    // Passer à 'https' quand le serveur sera en ligne en https.
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#ffffff',
    },
  },
};

export default config;
