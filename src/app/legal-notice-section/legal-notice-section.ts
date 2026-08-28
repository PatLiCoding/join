import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-legal-notice-section',
  standalone: true,
  templateUrl: './legal-notice-section.html',
  styleUrls: ['./legal-notice-section.scss'],
})
export class LegalNoticeSection {
  /**
   * Contains the contact information displayed in the legal notice.
   * The values are loaded from the environment configuration.
   */
  imprint = environment.imprint;

  constructor(private location: Location) {}

  /**
   * Navigates back to the previous page.
   * Typically used to close the section.
   */
  close(): void {
    this.location.back();
  }
}
