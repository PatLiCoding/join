import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  User,
  deleteUser,
} from '@angular/fire/auth';
import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Service for handling user authentication via Firebase Authentication.
 * Provides signup, login, guest login, logout, and access to the current user.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** The Firebase Auth instance used for authentication operations. */
  private auth = inject(Auth);
  /** The Angular Injector, used to safely run Firebase calls within an injection context. */
  private injector = inject(Injector);

  /** Tracks whether a user is currently logged in. */
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  /** Observable stream of the current login state. */
  isLoggedIn$ = this.loggedInSubject.asObservable();

  /**
   * Registers a new user with email, password, and display name.
   * @param email The user's email address.
   * @param password The user's password.
   * @param name The user's display name.
   * @returns Promise resolving to success or error message.
   */
  async signup(
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cred = await runInInjectionContext(this.injector, () =>
        createUserWithEmailAndPassword(this.auth, email, password),
      );
      if (name && cred.user) {
        await runInInjectionContext(this.injector, () =>
          updateProfile(cred.user, { displayName: name }),
        );
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Logs in a user with email and password using Firebase Authentication.
   * @param email The user's email address.
   * @param password The user's password.
   * @returns Promise resolving to success or error message.
   */
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await runInInjectionContext(this.injector, () =>
        signInWithEmailAndPassword(this.auth, email, password),
      );
      this.loggedInSubject.next(true);
      return { success: true };
    } catch (error: any) {
      this.loggedInSubject.next(false);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulates a guest login by setting the logged-in state to true.
   * @returns Promise that resolves when login is simulated.
   */
  guestLogin(): Promise<void> {
    return new Promise((resolve) => {
      this.loggedInSubject.next(true);
      resolve();
    });
  }

  /**
   * Logs out the user by setting the logged-in state to false.
   */
  logout() {
    this.loggedInSubject.next(false);
  }

  /**
   * Returns whether the user is currently logged in.
   * @returns True if logged in, false otherwise.
   */
  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  /**
   * Returns the currently authenticated Firebase user, if any.
   * @returns The current Firebase user, or null if not logged in.
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Deletes the currently authenticated Firebase user permanently.
   * Requires a recent login; throws 'auth/requires-recent-login' otherwise.
   * @returns Promise resolving to success or an error message.
   */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    const user = this.auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user is currently logged in.' };
    }
    try {
      await runInInjectionContext(this.injector, () => deleteUser(user));
      this.loggedInSubject.next(false);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
