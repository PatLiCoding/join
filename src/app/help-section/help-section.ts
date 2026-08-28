import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-help-section',
  standalone: true,
  templateUrl: './help-section.html',
  styleUrls: ['./help-section.scss'],
})
export class HelpSection {
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
  closeHelp(): void {
    this.location.back();
  }
}
