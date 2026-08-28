import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-header-logged-out',
  standalone: true,
  templateUrl: './header-logged-out.html',
  styleUrls: ['./header-logged-out.scss'],
})
export class HeaderLoggedOut {
  /** Application title displayed in the header. */
  @Input() appTitle: string = 'Kanban Project Management Tool';
  /** Path to the application logo. */
  logoPath: string = 'assets/icon/header/logo_grey.png';
}
