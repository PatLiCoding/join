import { inject, Injectable, Injector, OnDestroy, runInInjectionContext } from '@angular/core';
import { Subject } from 'rxjs';
import {
  Firestore,
  collection,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { Contacts } from '../interfaces/contacts';

/**
 * Service for managing contacts in Firestore.
 * Keeps a realtime-synced local list of contacts and provides CRUD operations,
 * color assignment, and the currently selected/logged-in contact state.
 */
@Injectable({
  providedIn: 'root',
})
export class ContactService implements OnDestroy {
  unsubscribe;
  firebaseDB: Firestore = inject(Firestore);
  private injector = inject(Injector);

  contactList: Contacts[] = [];
  selectedContact: Contacts | null = null;

  currentUserName: string | null = null;
  currentUserEmail: string | null = null;

  editRequest$ = new Subject<void>();

  /** Fixed palette of colors used to assign a consistent color per contact. */
  private readonly colorPalette = [
    '#FF7A00',
    '#FF5EB3',
    '#6E52FF',
    '#9327FF',
    '#00BEE8',
    '#1FD7C1',
    '#FF745E',
    '#FFA35E',
    '#FC71FF',
    '#FFC701',
    '#0038FF',
    '#C3FF2B',
    '#FFE62B',
    '#FF4646',
    '#FFBB2B',
  ];

  /** Maps each contact's unique key to its assigned color. */
  private contactColorMap = new Map<string, string>();

  /**
   * Creates an instance of ContactService and subscribes to realtime
   * updates of the 'contacts' collection in Firestore.
   */
  constructor() {
    this.unsubscribe = runInInjectionContext(this.injector, () =>
      onSnapshot(collection(this.firebaseDB, 'contacts'), (contactsListObject) => {
        this.contactList = [];
        contactsListObject.forEach((docObject) => {
          this.contactList.push(this.getContactsObject(docObject.id, docObject.data() as Contacts));
        });
        this.rebuildColorMap();
      }),
    );
  }

  /**
   * Sets the current user's name and email globally.
   * @param name The user's name.
   * @param email The user's email address.
   */
  setCurrentUser(name: string, email: string) {
    this.currentUserName = name;
    this.currentUserEmail = email;
  }

  /**
   * Clears the current user's name and email (logout).
   */
  clearCurrentUser() {
    this.currentUserName = null;
    this.currentUserEmail = null;
  }

  /**
   * Adds a new contact to the database.
   * @param contact The contact to add.
   * @returns Promise resolving to the created contact or null on error.
   */
  async addContactToDataBase(contact: Contacts): Promise<Contacts | null> {
    try {
      const docRef = await runInInjectionContext(this.injector, () =>
        addDoc(collection(this.firebaseDB, 'contacts'), contact),
      );
      const createdContact = {
        id: docRef.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      };
      this.selectedContact = createdContact;
      return createdContact;
    } catch (error) {
      console.error('Error adding contact: ', error);
      return null;
    }
  }

  /**
   * Deletes a contact from the database.
   * @param contact The contact to delete.
   */
  async deleteContactOnDatabase(contact: Contacts) {
    if (contact.id) {
      await runInInjectionContext(this.injector, () =>
        deleteDoc(doc(this.firebaseDB, 'contacts', contact.id!)),
      );
    }
  }

  /**
   * Updates a contact in the database.
   * @param contact The contact to update.
   */
  async updateContact(contact: Contacts) {
    if (!contact.id) return;

    try {
      await this.persistContactUpdate(contact);
      this.syncLocalStateAfterUpdate(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  }

  /**
   * Persists the updated contact data to Firestore.
   * @param contact The contact with updated data (must have an id).
   */
  private async persistContactUpdate(contact: Contacts) {
    await runInInjectionContext(this.injector, async () => {
      const docRef = this.getSingleDoc('contacts', contact.id!);
      await updateDoc(docRef, this.getCleanJson(contact));
    });
  }

  /**
   * Syncs local state (selected contact and current user name) after a successful update.
   * @param contact The contact that was updated.
   */
  private syncLocalStateAfterUpdate(contact: Contacts) {
    this.updateSelectedContactIfMatching(contact);
    this.updateCurrentUserNameIfMatching(contact);
  }

  /**
   * Updates the locally cached selected contact if it matches the given contact.
   * @param contact The contact that was updated.
   */
  private updateSelectedContactIfMatching(contact: Contacts) {
    if (this.selectedContact?.id !== contact.id) return;
    this.selectedContact = {
      ...this.selectedContact,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    };
  }

  /**
   * Updates the current user's display name if the given contact matches the current user's email.
   * @param contact The contact that was updated.
   */
  private updateCurrentUserNameIfMatching(contact: Contacts) {
    if (this.currentUserEmail && contact.email === this.currentUserEmail) {
      this.currentUserName = contact.name;
    }
  }

  /**
   * Returns a plain object with only the contact's name, email, and phone.
   * @param contact The contact to clean.
   * @returns An object with name, email, and phone.
   */
  getCleanJson(contact: Contacts): {} {
    return {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    };
  }

  /**
   * Sets the selected contact.
   * @param contact The contact to select.
   */
  setSelectedContact(contact: Contacts): void {
    this.selectedContact = contact;
  }

  /**
   * Emits an edit request event.
   */
  requestEdit(): void {
    this.editRequest$.next();
  }

  /**
   * Returns the color assigned to a contact.
   * @param contact The contact to get the color for.
   * @returns The color as a string.
   */
  getContactColor(contact: Contacts | null | undefined): string {
    if (!contact) return this.colorPalette[0];

    const key = this.getContactKey(contact);
    return this.contactColorMap.get(key) ?? this.colorPalette[0];
  }

  /**
   * Returns the initials for a given name.
   * @param name The name to extract initials from.
   * @returns The initials as a string.
   */
  getInitials(name?: string): string {
    if (!name?.trim()) return '';

    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';

    return (first + last).toUpperCase();
  }

  /**
   * Deletes a contact from the contact list and database by index.
   * @param index The index of the contact to delete.
   */
  deleteContact(index: number) {
    const contact = this.contactList[index];
    this.deleteContactOnDatabase(contact);
  }

  /**
   * Deletes the currently selected contact from the database and clears selection.
   */
  deleteSelectedContact(): void {
    if (!this.selectedContact) return;

    this.deleteContactOnDatabase(this.selectedContact);
    this.selectedContact = null;
  }

  /**
   * Cleans up the Firestore realtime subscription when the service is destroyed.
   */
  ngOnDestroy() {
    this.unsubscribe();
  }

  /**
   * Returns the Firestore collection reference for contacts.
   * @returns The Firestore collection reference for the 'contacts' collection.
   */
  getContactsRef() {
    return runInInjectionContext(this.injector, () => collection(this.firebaseDB, 'contacts'));
  }

  /**
   * Returns a Contacts object with the given id and data.
   * @param id The contact's id.
   * @param obj The contact data.
   * @returns The Contacts object.
   */
  getContactsObject(id: string, obj: Contacts): Contacts {
    return {
      id: id,
      name: obj.name,
      email: obj.email,
      phone: obj.phone,
    };
  }

  /**
   * Returns a Firestore document reference for a single document.
   * @param colId The collection id.
   * @param docId The document id.
   * @returns The document reference.
   */
  getSingleDoc(colId: string, docId: string) {
    return runInInjectionContext(this.injector, () =>
      doc(collection(this.firebaseDB, colId), docId),
    );
  }

  /**
   * Rebuilds the color map for all contacts based on their sorted order.
   */
  private rebuildColorMap(): void {
    const sorted = [...this.contactList].sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
    );

    this.contactColorMap.clear();

    sorted.forEach((contact, index) => {
      const key = this.getContactKey(contact);
      const color = this.colorPalette[index % this.colorPalette.length];
      this.contactColorMap.set(key, color);
    });
  }

  /**
   * Returns a unique key for a contact based on id or name/email.
   * @param contact The contact to get the key for.
   * @returns The unique key as a string.
   */
  private getContactKey(contact: Contacts): string {
    return contact.id ?? `${contact.name}|${contact.email}`;
  }
}
