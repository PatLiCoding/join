import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../firebase-service/auth.servic';
import { ContactService } from '../../firebase-service/contact-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  loginError = false;
  passwordVisible = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private contactService: ContactService,
  ) {}

  /**
   * Authenticates the user with email and password.
   * On success, loads the corresponding contact and navigates to the summary page.
   */
  async login() {
    const trimmedEmail = this.email.trim();
    const trimmedPassword = this.password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      this.loginError = true;
      return;
    }
    try {
      const result = await this.auth.login(trimmedEmail, trimmedPassword);
      if (result.success) {
        this.handleLoginSuccess(trimmedEmail);
        await this.router.navigate(['/summary'], { state: { fromLogin: true } });
      } else {
        this.loginError = true;
      }
    } catch (error) {
      this.loginError = true;
    }
  }

  /**
   * Handles post-login setup after a successful authentication.
   * Resolves the current user's display name and email from the contact
   * list or Firebase user data, then sets them as the active contact.
   *
   * @param trimmedEmail - The trimmed email used for login.
   */
  private handleLoginSuccess(trimmedEmail: string): void {
    this.loginError = false;
    const foundContact = this.contactService.contactList.find(
      (contact) => contact.email === trimmedEmail,
    );
    const firebaseUser = this.auth.getCurrentUser();
    const resolvedName = this.resolveUserName(foundContact, firebaseUser, trimmedEmail);
    const resolvedEmail = foundContact?.email || firebaseUser?.email || trimmedEmail;
    this.contactService.setCurrentUser(resolvedName, resolvedEmail, foundContact?.photoUrl);
  }

  /**
   * Resolves the display name to use for the logged-in user, preferring
   * the contact list entry, then the Firebase display name, then the
   * Firebase email, and finally falling back to the trimmed login email.
   *
   * @param foundContact - Matching contact from the contact list, if any.
   * @param firebaseUser - The currently authenticated Firebase user.
   * @param trimmedEmail - The trimmed email used for login.
   * @returns The resolved display name.
   */
  private resolveUserName(
    foundContact: { name?: string } | undefined,
    firebaseUser: { displayName?: string | null; email?: string | null } | null,
    trimmedEmail: string,
  ): string {
    return foundContact?.name || firebaseUser?.displayName || firebaseUser?.email || trimmedEmail;
  }

  /**
   * Logs in the user as a guest and navigates to the summary page.
   */
  async guestLogin() {
    await this.auth.guestLogin();
    this.contactService.setCurrentUser('Guest', 'guest@local');
    await this.router.navigate(['/summary'], {
      state: { fromLogin: true, guest: true },
    });
  }

  /**
   * Resets the login error flag when the user modifies the input fields.
   */
  clearLoginError() {
    if (this.loginError) {
      this.loginError = false;
    }
  }

  /**
   * Toggles the visibility of the password field.
   */
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
}
