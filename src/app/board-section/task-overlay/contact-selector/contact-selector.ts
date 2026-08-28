import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  ElementRef,
  Renderer2,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contacts } from '../../../interfaces/contacts';
import { ContactService } from '../../../firebase-service/contact-service';

/**
 * Dropdown component for selecting one or more contacts from a searchable list.
 */
@Component({
  selector: 'app-contact-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-selector.html',
  styleUrls: ['./contact-selector.scss'],
})
export class ContactSelector implements OnInit, OnChanges, OnDestroy {
  /** Available contacts that can be selected. */
  @Input() contacts: Contacts[] = [];
  /** Names of the currently selected contacts. */
  @Input() selectedContactNames: string[] = [];
  /** Emits the names of the selected contacts when the selection changes. */
  @Output()
  selectedContactsChange = new EventEmitter<string[]>();
  /** Currently selected contact objects. */
  selectedContacts: Contacts[] = [];
  /** Indicates whether the dropdown is visible. */
  showDropdown = false;
  /** Current search term used to filter contacts. */
  searchTerm = '';

  private clickListener!: () => void;

  constructor(
    private contactService: ContactService,
    private elRef: ElementRef,
    private renderer: Renderer2,
  ) {}

  /** Syncs the initial selection and registers a global click listener to close the dropdown on outside clicks. */
  ngOnInit() {
    this.syncSelectedContacts();
    this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
      if (!this.elRef.nativeElement.contains(event.target)) {
        this.showDropdown = false;
      }
    });
  }

  /** Re-syncs the selected contacts whenever bound inputs change. */
  ngOnChanges() {
    this.syncSelectedContacts();
  }

  /** Removes the global click listener to prevent memory leaks. */
  ngOnDestroy() {
    if (this.clickListener) this.clickListener();
  }

  /** Matches `selectedContactNames` against the full contacts list to build `selectedContacts`. */
  private syncSelectedContacts() {
    if (!this.contacts || !this.selectedContactNames) return;
    this.selectedContacts = this.contacts.filter((c) => this.selectedContactNames.includes(c.name));
  }

  /**
   * Toggles the dropdown visibility.
   * @param event - Optional DOM event; propagation is stopped to avoid the global click listener.
   */
  toggleDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  /** Returns the contacts list filtered by the current search term. */
  get filteredContacts(): Contacts[] {
    if (!this.searchTerm) return this.contacts;
    return this.contacts.filter((c) =>
      c.name.toLowerCase().includes(this.searchTerm.toLowerCase()),
    );
  }

  /**
   * Adds or removes a contact from the selection and emits the updated list.
   * @param contact - The contact to toggle.
   */
  toggleContact(contact: Contacts) {
    const index = this.selectedContacts.findIndex((c) => c.id === contact.id);
    if (index > -1) this.selectedContacts.splice(index, 1);
    else this.selectedContacts.push(contact);
    this.emitSelection();
  }

  /**
   * Checks whether a given contact is currently selected.
   * @param contact - The contact to check.
   * @returns `true` if the contact is in the selection.
   */
  isContactSelected(contact: Contacts): boolean {
    return this.selectedContacts.some((c) => c.id === contact.id);
  }

  /** Emits the names of all currently selected contacts. */
  private emitSelection() {
    this.selectedContactsChange.emit(this.selectedContacts.map((c) => c.name));
  }

  /**
   * Derives uppercase initials from a full name (first + last).
   * @param name - The contact's display name.
   * @returns Up to two uppercase letters.
   */
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts.length > 1 ? parts[1].charAt(0) : '';
    return (first + second).toUpperCase();
  }

  /**
   * Retrieves the badge color assigned to a contact.
   * @param contact - The contact whose color is requested.
   * @returns A CSS-compatible color string.
   */
  getContactColor(contact: Contacts): string {
    return this.contactService.getContactColor(contact);
  }
}
