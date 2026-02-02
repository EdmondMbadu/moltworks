import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
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
    const result = await signInWithPopup(getAuth(), provider);
    return result.user;
  }

  async signOut(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.ensureInitialized();
    await signOut(getAuth());
  }
}
