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
    const played = sessionStorage.getItem('loginAnimationPlayed') === 'true';
    this.animationShouldPlay = !played;
    this.animationPlayed = played;
    if (!played) {
      setTimeout(() => {
        this.startAnimation = true;
        this.animationPlayed = true;
        sessionStorage.setItem('loginAnimationPlayed', 'true');
      }, 400);
    } else {
      this.startAnimation = true;
    }
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showSignupLink = event.urlAfterRedirects === '/login';
      });
  }
}
