import { Component, HostListener, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../firebase-service/auth.servic';
import { ContactService } from '../../../firebase-service/contact-service';
import { ContactDialogTemplate } from '../../../contact-section/contact-dialog-template/contact-dialog-template';

/** 
 * Header component displayed for authenticated users. 
 *Handles navigation, user information, responsive behavior, 
 and the header popup. 
 */
@Component({
  selector: 'app-header-logged-in',
  imports: [RouterModule, ContactDialogTemplate],
  templateUrl: './header-logged-in.html',
  styleUrl: './header-logged-in.scss',
})
export class HeaderLoggedIn implements AfterViewInit {
  /** Flag indicating if the device is mobile */
  isMobile = false;
  /** Flag indicating if the help section is open */
  isHelpOpen = false;
  /** Flag for showing the header popup */
  showPopup: boolean = false;
  /** Application title */
  appTitle: string = 'Kanban Project Management Tool';

  /** Route paths */
  helpRoute: string = '/help';
  legalNoticeRoute: string = '/legal';
  privacyPolicyRoute: string = '/privacy';

  /** Asset paths */
  logoPath: string = 'assets/icon/header/logo_grey.png';
  helpIconPath: string = 'assets/icon/header/help.png';

  /** Reference to the contact/account dialog rendered in this template. */
  @ViewChild(ContactDialogTemplate) contactDialog?: ContactDialogTemplate;
  @ViewChild('desktopPopup') desktopPopup?: ElementRef;
  @ViewChild('mobilePopup') mobilePopup?: ElementRef;

  /**
   * Constructor for HeaderLoggedIn component
   * @param router Angular router service
   * @param auth AuthService for authentication handling
   * @param contactService ContactService to manage user data
   */
  constructor(
    private router: Router,
    public auth: AuthService,
    private contactService: ContactService,
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isHelpOpen = event.url.includes('help');
      });
  }

  /**
   * Initials of the current user, read live from the ContactService so
   * header and dialog stay in sync without a re-login.
   */
  get userInitials(): string {
    const name = this.contactService.currentUserName;
    if (!name) return 'G';
    return this.contactService.getInitials(name) || 'G';
  }

  /**
   * Photo URL of the current user, read live from the ContactService.
   */
  get userPhotoUrl(): string | null {
    return this.contactService.currentUserPhotoUrl;
  }

  /**
   * Logs out the current user and resets relevant states
   */
  logout() {
    this.contactService.clearCurrentUser();
    this.showPopup = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** Lifecycle hook that runs after the view has been initialized */
  ngAfterViewInit() {
    this.setupPopupAutoClose();
  }

  /** Checks the screen width to determine if the device is mobile */
  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  /** Toggles the header popup visibility */
  toggleHeaderPopup() {
    this.showPopup = !this.showPopup;
    if (this.showPopup) {
      setTimeout(() => {
        this.setupPopupAutoClose();
      }, 0);
    }
  }

  /** Sets up automatic closing of the popup when a link is clicked */
  setupPopupAutoClose() {
    const popup = this.isMobile
      ? this.mobilePopup?.nativeElement
      : this.desktopPopup?.nativeElement;
    if (popup && this.showPopup) {
      const links = popup.querySelectorAll('a');
      links.forEach((link: HTMLAnchorElement) => {
        link.addEventListener('click', () => {
          this.showPopup = false;
        });
      });
    }
  }

  /**
   * Opens the account dialog, blocking access for the guest test account.
   */
  onViewAccount(): void {
    if (this.auth.isGuestUser()) {
      alert('The guest account cannot be edited or deleted.');
      return;
    }
    this.contactDialog?.openWithMode('account');
  }

  /**
   * Closes the popup when clicking outside of it
   * @param event Mouse click event
   */
  @HostListener('document:click', ['$event'])
  closePopupOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.header-right') && !target.closest('.header-popup')) {
      this.showPopup = false;
    }
  }
}
