import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../firebase-service/auth.servic';
import { ContactService } from '../firebase-service/contact-service';

/**
 * Component representing the login section.
 * Handles animations, signup link visibility, and responsiveness.
 */
@Component({
  selector: 'app-login-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login-section.html',
  styleUrls: ['./login-section.scss'],
})
export class LoginSection implements OnInit {
  startAnimation = false;
  showSignupLink = true;
  animationShouldPlay = false;
  animationPlayed = false;
  isMobile = false;

  /**
   * Constructor for LoginSection component.
   * @param router Angular Router instance for listening to route changes
   */
  constructor(
    private router: Router,
    private auth: AuthService,
    private contactService: ContactService,
  ) {}

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   * Handles:
   *  - Mobile detection
   *  - Animation state management
   *  - Signup link visibility based on the current route
   */
  ngOnInit(): void {
    this.contactService.clearCurrentUser();
    this.auth.logout();
    this.isMobile = window.innerWidth < 768;
    this.initAnimationState();
    this.subscribeToSignupLinkVisibility();
  }

  /**
   * Initializes the login animation state based on whether the animation
   * has already played in the current session. If it hasn't played yet,
   * it is triggered after a short delay and marked as played in
   * sessionStorage so it won't repeat on subsequent navigations. If it
   * has already played, the animation state is set to its final state
   * immediately without replaying it.
   */
  private initAnimationState(): void {
    const played = sessionStorage.getItem('loginAnimationPlayed') === 'true';
    this.animationShouldPlay = !played;
    this.animationPlayed = played;
    if (!played) {
      setTimeout(() => this.playLoginAnimation(), 400);
    } else {
      this.startAnimation = true;
    }
  }

  /**
   * Marks the login animation as started and completed, and persists
   * that state in sessionStorage so it is not replayed again during
   * the current session.
   */
  private playLoginAnimation(): void {
    this.startAnimation = true;
    this.animationPlayed = true;
    sessionStorage.setItem('loginAnimationPlayed', 'true');
  }

  /**
   * Subscribes to router navigation events and updates the visibility
   * of the signup link based on whether the current route is the
   * login page.
   */
  private subscribeToSignupLinkVisibility(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showSignupLink = event.urlAfterRedirects === '/login';
      });
  }
}
