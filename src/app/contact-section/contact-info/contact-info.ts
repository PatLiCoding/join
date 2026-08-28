/**
 * ContactInfo Component
 *
 * Displays detailed information about a selected contact.
 * Handles editing, deletion, menu toggling, and provides
 * helper methods for initials, color, and display names.
 * Emits events to switch back to the contact list view.
 */
import {
  AfterViewInit,
  Component,
  inject,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
} from '@angular/core';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { ContactDialogTemplate } from '../contact-dialog-template/contact-dialog-template';

/**
 * ContactInfo Component
 *
 * Displays detailed information about a selected contact.
 * Handles editing, deletion, menu toggling, and provides
 * helper methods for initials, color, and display names.
 * Emits events to switch back to the contact list view.
 */
@Component({
  selector: 'app-contact-info',
  imports: [ContactDialogTemplate],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss',
})
export class ContactInfo implements AfterViewInit {
  /** Injected contact management service. */
  contactService = inject(ContactService);
  /** Emits to notify parent component to return to contact list view. */
  @Output() switch = new EventEmitter<void>();
  /** Reference to contact modal dialog template. */
  @ViewChild('contactDialog') contactDialog?: ContactDialogTemplate;

  /** Active hovered action icon. */
  hoveredIcon: string | null = null;
  /** Controls context menu visibility state. */
  menuOpen = false;
  /** Animation active state flag for back navigation. */
  isActive = false;
  /** Visibility flag for rendering content after init. */
  showContactContent = false;

  /**
   * Returns the currently selected contact from the contact service.
   */
  get selectedContact(): Contacts | null {
    return this.contactService.selectedContact;
  }

  /**
   * AfterViewInit lifecycle hook.
   * Shows the contact content after the view has been initialized.
   */
  ngAfterViewInit(): void {
    window.setTimeout(() => {
      this.showContactContent = true;
    }, 0);
  }

  /**
   * Opens the contact dialog in edit mode for the selected contact.
   */
  editContact(): void {
    if (this.selectedContact) {
      this.contactDialog?.openWithMode('change');
    }
  }

  /**
   * Deletes the currently selected contact and emits a switch event.
   */
  deleteContact(): void {
    this.contactService.deleteSelectedContact();
    this.switch.emit();
  }

  /**
   * Returns the display color associated with the selected contact.
   * @returns Hex color string or default color
   */
  getSelectedColor(): string {
    return this.contactService.getContactColor(this.selectedContact);
  }

  /**
   * Returns initials for a given name.
   * Delegates to the contact service.
   *
   * @param name Optional full name
   * @returns Uppercase initials
   */
  getInitials(name?: string): string {
    return this.contactService.getInitials(name);
  }

  /**
   * Returns a truncated display name if it exceeds 20 characters.
   *
   * @param name Optional name string
   * @returns Truncated name with ellipsis if necessary
   */
  getDisplayName(name?: string): string {
    if (!name) return '';
    return name.length >= 20 ? name.slice(0, 20) + '…' : name;
  }

  /**
   * Toggles the visibility of the context menu.
   */
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Closes the menu when clicking outside the component.
   *
   * @param event Mouse click event
   */
  @HostListener('document:click', ['$event'])
  onComponentClick(event: MouseEvent) {
    const target = event.target;
    if (target instanceof Element && target.closest('app-contact-info')) {
      return;
    }
    if (this.menuOpen) {
      this.menuOpen = false;
    }
  }

  /**
   * Handles editing a contact from the menu.
   * Stops propagation and closes the menu.
   *
   * @param event Menu click event
   */
  onEditFromMenu(event: Event) {
    event.stopPropagation();
    this.editContact();
    this.menuOpen = false;
  }

  /**
   * Handles deleting a contact from the menu.
   * Stops propagation and closes the menu.
   *
   * @param event Menu click event
   */
  onDeleteFromMenu(event: Event) {
    event.stopPropagation();
    this.deleteContact();
    this.menuOpen = false;
  }

  /**
   * Switches back to the contact list view.
   * Animates the transition and emits the switch event after 500ms.
   */
  backToList() {
    this.isActive = true;

    setTimeout(() => {
      this.switch.emit();
      this.isActive = false;
    }, 500);
  }
}
