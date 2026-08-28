import { Component } from '@angular/core';
import { AuthService } from '../../firebase-service/auth.servic';
import { ContactService } from '../../firebase-service/contact-service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss'],
})
export class SignupComponent {
  constructor(
    private router: Router,
    private authService: AuthService,
    private contactService: ContactService,
  ) {}

  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  acceptedPrivacy: boolean = false;

  isLoading: boolean = false;
  signupSuccess: boolean = false;
  emailAlreadyInUse: boolean = false;

  nameFocused: boolean = false;
  emailFocused: boolean = false;
  passwordFocused: boolean = false;
  confirmFocused: boolean = false;

  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  securePasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;

  /**
   * Normalizes the name input so that it only contains letters and spaces.
   * This prevents numbers or other symbols from being entered.
   *
   * @param {Event} event - The input event from the name field.
   * @returns {void}
   */
  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    const cleaned = target.value.replace(/[^A-Za-zÄÖÜäöüß ]+/g, '');
    if (cleaned !== target.value) {
      target.value = cleaned;
    }
    this.name = cleaned;
  }

  /**
   * Checks whether the current password meets the security requirements.
   *
   * @returns {boolean} True if the password is secure, otherwise false.
   */
  get isPasswordSecure(): boolean {
    return this.securePasswordRegex.test(this.password);
  }

  /**
   * Indicates whether the password and confirm password fields do not match.
   *
   * @returns {boolean} True if the passwords differ and confirmPassword is not empty.
   */
  get passwordMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  /**
   * Validates the entire signup form based on name, email, password,
   * confirm password and privacy acceptance.
   *
   * @returns {boolean} True if the form is valid, otherwise false.
   */
  isFormValid(): boolean {
    const nameValid = this.name.trim().length >= 5;
    const emailValid = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(this.email);
    const passwordValid = this.isPasswordSecure;
    const confirmValid = this.confirmPassword.length > 0 && this.password === this.confirmPassword;

    return nameValid && emailValid && passwordValid && confirmValid && this.acceptedPrivacy;
  }

  /**
   * Toggles the visibility of the password input field.
   *
   * @returns {void}
   */
  togglePasswordVisibility() {
    if (!this.password || this.password.length === 0) {
      return;
    }
    this.passwordVisible = !this.passwordVisible;
  }

  /**
   * Toggles the visibility of the confirm password input field.
   *
   * @returns {void}
   */
  toggleConfirmPasswordVisibility() {
    if (!this.confirmPassword || this.confirmPassword.length === 0) {
      return;
    }
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  /**
   * Handles the signup process: validates the form, calls the AuthService,
   * optionally creates a contact entry and navigates to the login page on success.
   *
   * @returns {void}
   */
  signup(): void {
    if (!this.isFormValid()) {
      return;
    }
    this.isLoading = true;
    this.signupSuccess = false;
    this.emailAlreadyInUse = false;
    this.authService.signup(this.email, this.password, this.name).then(async (result) => {
      this.isLoading = false;
      if (result.success) {
        await this.handleSignupSuccess();
      } else {
        this.handleSignupError(result.error);
      }
    });
  }

  /**
   * Handles successful signup: creates a contact entry and redirects
   * to the login page after a short delay.
   *
   * @returns {Promise<void>} A promise that resolves when handling is complete.
   */
  private async handleSignupSuccess(): Promise<void> {
    await this.contactService.addContactToDataBase({
      name: this.name,
      email: this.email,
    });
    this.signupSuccess = true;
    setTimeout(() => {
      this.signupSuccess = false;
      this.router.navigate(['/login']);
    }, 3000);
  }

  /**
   * Handles signup errors by either setting the "email already in use"
   * flag or displaying a generic error message.
   *
   * @param {string} [error] Optional error message returned from AuthService.
   * @returns {void}
   */
  private handleSignupError(error?: string): void {
    if (error?.includes('auth/email-already-in-use')) {
      this.emailAlreadyInUse = true;
    } else if (error) {
      alert('Fehler beim Erstellen des Accounts: ' + error);
    }
  }
}
