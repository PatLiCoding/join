/**
 * Example environment configuration.
 *
 * Copy this file to `environment.ts` (and `environment.prod.ts` for production)
 * inside `src/environments/` and fill in your own Firebase project credentials.
 *
 * `environment.ts` is gitignored and must never be committed with real keys.
 * You can find these values in the Firebase Console under:
 * Project Settings -> General -> Your apps -> SDK setup and configuration.
 */
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
  imprint: {
    name: 'Max Mustermann',
    street: 'Musterstraße 123',
    zip: '12345',
    city: 'Musterstadt',
    email: 'max.mustermann@example.com',
  },
};
