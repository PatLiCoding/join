import { Component, HostListener } from '@angular/core';
import { ContactInfo } from './contact-info/contact-info';
import { ContactList } from './contact-list/contact-list';

/**
 * ContactSection Component
 *
 * Manages the contact view layout.
 * Handles responsive behavior between mobile and desktop
 * and controls whether the contact list or contact details
 * are displayed.
 */
@Component({
  selector: 'app-contact-section',
  imports: [ContactList, ContactInfo],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.scss',
})
export class ContactSection {
  /** Indicates whether the current viewport width qualifies as a mobile device (<= 1000px). */
  isMobile = window.innerWidth <= 1000;
  /** Controls the visibility of the contact list view. */
  showList = true;

  /**
   * Listens to window resize events and updates
   * the mobile state accordingly.
   *
   * Ensures that the contact list is always visible
   * on desktop screens.
   */
  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 1000;
    if (!this.isMobile) {
      this.showList = true;
    }
  }

  /**
   * Toggles between contact list and contact details view
   * on mobile devices.
   *
   * Does nothing on desktop screens.
   */
  switchView() {
    if (this.isMobile) {
      this.showList = !this.showList;
    }
  }
}
