import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../firebase-service/auth.servic';
import { NavBarLoggedIn } from './nav-bar-logged-in/nav-bar-logged-in';
import { NavBarLoggedOut } from './nav-bar-logged-out/nav-bar-logged-out';

/**
 * Main navigation bar component.
 * Displays the appropriate navigation bar based on the user's login state.
 */
@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterModule, AsyncPipe, NavBarLoggedIn, NavBarLoggedOut],
  templateUrl: './nav-bar.html',
  styleUrls: ['./nav-bar.scss'],
})
export class NavBar {
  /** Authentication service used to track the user's login state. */
  private auth = inject(AuthService);
  /** Observable containing the current user's login state. */
  isLoggedIn$ = this.auth.isLoggedIn$;
}
