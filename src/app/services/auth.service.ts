import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirebaseError, initializeApp, getApps } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseConfig } from '../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly isBrowser: boolean;
  private authInitialized = false;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private ensureInitialized(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.authInitialized) {
      if (getApps().length === 0) {
        initializeApp(firebaseConfig);
      }
      this.authInitialized = true;
    }
  }

  onAuthChange(handler: (user: User | null) => void): void {
    if (!this.isBrowser) {
      return;
    }
    this.ensureInitialized();
    onAuthStateChanged(getAuth(), handler);
  }

  async signInWithGoogle(): Promise<User> {
    if (!this.isBrowser) {
      throw new Error('Google sign-in is only available in the browser.');
    }
    this.ensureInitialized();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(getAuth(), provider);
      return result.user;
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(getAuth(), provider);
          throw new Error('Redirecting to Google sign-in…');
        }
        if (error.code === 'auth/unauthorized-domain') {
          throw new Error(
            'This domain is not authorized for Google sign-in. Add it in Firebase Auth > Settings > Authorized domains.'
          );
        }
        if (error.code === 'auth/invalid-api-key') {
          throw new Error('Firebase config is missing or invalid. Update src/app/firebase.config.ts.');
        }
      }
      throw error instanceof Error ? error : new Error('Google sign-in failed.');
    }
  }

  async signOut(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.ensureInitialized();
    await signOut(getAuth());
  }
}
