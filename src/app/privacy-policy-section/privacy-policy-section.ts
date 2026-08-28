import { Component } from '@angular/core';
import { Location } from '@angular/common';

/**
 * Displays the privacy policy section.
 * Provides functionality to return to the previous page.
 */
@Component({
  selector: 'app-privacy-policy-section',
  standalone: true,
  templateUrl: './privacy-policy-section.html',
  styleUrls: ['./privacy-policy-section.scss'],
})
export class PrivacyPolicySection {
  constructor(private location: Location) {}

  /** Returns to the previously visited page. */
  closeHelp() {
    this.location.back();
  }
}
