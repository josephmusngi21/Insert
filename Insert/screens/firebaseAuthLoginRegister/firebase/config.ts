import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
// @ts-expect-error Firebase exposes this from its React Native entry, but not its shared type declaration.
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Note: getAnalytics removed because it requires 'window' object which doesn't exist in React Native

// Optionally import the services that you want to use
// import {...} from 'firebase/auth';
// import {...} from 'firebase/database';
// import {...} from 'firebase/firestore';
// import {...} from 'firebase/functions';
// import {...} from 'firebase/storage';

const firebaseConfig = {
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persist the session in AsyncStorage so users stay signed in across app restarts.
// initializeAuth throws if Auth was already initialised (e.g. Fast Refresh), so fall back to getAuth.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);