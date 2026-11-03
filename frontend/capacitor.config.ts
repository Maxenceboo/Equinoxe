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
  // Fond noir derrière la page, y compris sous les barres système
  backgroundColor: '#000000',
  plugins: {
    // Barres système : icônes claires sur fond noir, marges gérées en CSS (safe-area)
    SystemBars: {
      style: 'DARK',
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    LocalNotifications: {
      iconColor: '#ffffff',
    },
  },
};

export default config;
