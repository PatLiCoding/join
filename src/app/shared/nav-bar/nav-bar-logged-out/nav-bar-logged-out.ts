import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

/**
 * Navigation bar component for users who are not logged in.
 * Handles navigation and the login animation state.
 */
@Component({
  selector: 'app-nav-bar-logged-out',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './nav-bar-logged-out.html',
  styleUrls: ['./nav-bar-logged-out.scss'],
})
export class NavBarLoggedOut implements OnInit {
  constructor(private router: Router) {}

  /** Initializes the login animation state in session storage. */
  ngOnInit(): void {
    if (!sessionStorage.getItem('loginAnimationPlayed')) {
      sessionStorage.setItem('loginAnimationPlayed', 'false');
    }
  }

  /**
   * Navigates to the specified route.
   *
   * @param url Route path to navigate to.
   */
  navigate(url: string): void {
    this.router.navigate([url]);
  }
}
