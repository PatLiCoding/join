import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  inject,
  ViewChild,
  ViewChildren,
  Output,
  EventEmitter,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ContactDialogTemplate } from '../contact-dialog-template/contact-dialog-template';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { ContactAvatar } from '../../shared/contact-avatar/contact-avatar';

type ContactGroup = {
  letter: string;
  contacts: Contacts[];
};

/**
 * Component for displaying and managing the contact list.
 */
@Component({
  selector: 'app-contact-list',
  imports: [ContactDialogTemplate, ContactAvatar],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.scss',
})
export class ContactList implements OnInit, OnDestroy {
  contactService = inject(ContactService);
  dialogMode: 'open' | 'change' = 'open';
  @Output() switch = new EventEmitter<void>();

  private editSubscription?: Subscription;
  @ViewChildren('contactRow') contactRows?: QueryList<ElementRef<HTMLElement>>;

  @ViewChild('contactDialog') contactDialog?: ContactDialogTemplate;

  constructor() {}

  /**
   * Angular lifecycle: subscribes to edit requests.
   */
  ngOnInit(): void {
    this.editSubscription = this.contactService.editRequest$.subscribe(() => {
      this.openContactDia('change');
    });
  }

  /**
   * Angular lifecycle: unsubscribes from edit requests.
   */
  ngOnDestroy(): void {
    this.editSubscription?.unsubscribe();
  }

  /**
   * Opens the contact dialog in the given mode.
   * @param action Dialog mode ('open' or 'change').
   */
  openContactDia(action: 'open' | 'change') {
    this.dialogMode = action;
    this.contactDialog?.openWithMode(action);
  }

  /**
   * Selects a contact and opens the contact view.
   * @param contact The contact to select.
   */
  selectContact(contact: Contacts): void {
    this.contactService.setSelectedContact(contact);
    this.openContact();
  }

  /**
   * Returns a display name, truncated if too long.
   * @param name The contact name.
   */
  getDisplayName(name?: string): string {
    if (!name) return '';
    return name.length >= 20 ? name.slice(0, 15) + '…' : name;
  }

  /**
   * Handles the event when a contact is created.
   * @param contact The created contact.
   */
  handleContactCreated(contact: Contacts): void {
    this.contactService.setSelectedContact(contact);
    this.openContact();
    this.scrollToContact(contact.id);
  }

  /**
   * Groups contacts alphabetically by first letter.
   * @returns Array of contact groups.
   */
  getContactGroups(): ContactGroup[] {
    const contacts = [...this.contactService.contactList]
      .filter((contact) => contact.name?.trim())
      .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
    const groups: ContactGroup[] = [];
    for (const contact of contacts) {
      const letter = contact.name.trim().charAt(0).toUpperCase();
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.letter !== letter) {
        groups.push({ letter, contacts: [contact] });
      } else {
        lastGroup.contacts.push(contact);
      }
    }
    return groups;
  }

  /**
   * Emits the switch event to open the contact view.
   */
  openContact() {
    this.switch.emit();
  }

  /**
   * Scrolls to the contact row with the given ID.
   * @param contactId The contact ID to scroll to.
   */
  private scrollToContact(contactId?: string): void {
    if (!contactId || !this.contactRows) return;
    if (this.tryScrollToContact(contactId)) return;
    this.waitForContactRowAndScroll(contactId);
  }

  /**
   * Tries to scroll to the contact row with the given ID.
   * @param contactId The contact ID.
   * @returns True if scrolled, false otherwise.
   */
  private tryScrollToContact(contactId: string): boolean {
    const target = this.contactRows?.find(
      (row) => row.nativeElement.dataset['contactId'] === contactId,
    );
    if (target) {
      target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }
    return false;
  }

  /**
   * Waits for the contact row to appear and then scrolls to it.
   * @param contactId The contact ID.
   */
  private waitForContactRowAndScroll(contactId: string): void {
    const changeSubscription = this.contactRows!.changes.subscribe(() => {
      if (this.tryScrollToContact(contactId)) {
        changeSubscription.unsubscribe();
      }
    });
    window.setTimeout(() => {
      if (!this.tryScrollToContact(contactId)) {
        changeSubscription.unsubscribe();
      }
    }, 1000);
  }
}
