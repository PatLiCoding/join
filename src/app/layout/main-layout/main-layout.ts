import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { Header } from '../../shared/header/header';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { AuthService } from '../../firebase-service/auth.servic';

/**
 * MainLayout component.
 *
 * This component acts as the main layout wrapper for the application.
 * It contains the navigation bar, header, and main content area.
 *
 * It also handles user access control:
 * - If the user is not logged in and tries to access a protected route,
 *   they will be redirected to the login page.
 * - Public routes like '/privacy' and '/legal' are accessible even for guests.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, NavBar, Header],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayout {
  /** Instance of the AuthService for authentication state. */
  private auth = inject(AuthService);

  /** Instance of Angular Router to handle navigation. */
  private router = inject(Router);

  /** Observable that emits the current login status of the user. */
  isLoggedIn$ = this.auth.isLoggedIn$;

  /**
   * MainLayout constructor.
   *
   * Subscribes to the login status and redirects the user to the login page
   * if they attempt to access a protected route while not logged in.
   */
  constructor() {
    this.isLoggedIn$.subscribe((loggedIn: boolean) => {
      const publicRoutes = ['/privacy', '/legal'];
      const currentRoute = this.router.url;
      if (!loggedIn && !publicRoutes.includes(currentRoute)) {
        this.router.navigate(['/login']);
      }
    });
  }
}
