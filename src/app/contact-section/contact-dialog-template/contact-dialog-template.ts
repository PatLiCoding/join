import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { ContactAvatar } from '../../shared/contact-avatar/contact-avatar';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog';
import { AuthService } from '../../firebase-service/auth.servic';
import { ScrollLockService } from './utils/scroll-lock.service';
import { DelayedToast } from './utils/delayed-toast';
import { runOnAnimationEndOrTimeout } from './utils/animation-end';
import { DIALOG_TEXT, DialogMode, DialogTextKey } from './contact-dialog-text';

/**
 * Dialog component for adding or editing a contact.
 * Handles dialog open/close, form actions, and animations.
 */
@Component({
  selector: 'app-contact-dialog-template',
  standalone: true,
  imports: [FormsModule, ContactAvatar, ConfirmDialog],
  templateUrl: './contact-dialog-template.html',
  styleUrl: './contact-dialog-template.scss',
})
export class ContactDialogTemplate implements AfterViewInit, OnDestroy {
  /** Instance of ContactService used for contact data operations and state management. */
  contactsService = inject(ContactService);

  /** Mode of the dialog: 'open' for creating a contact, 'change' for editing. */
  @Input() mode: DialogMode = 'open';
  /** Event emitted when a contact is successfully created. */
  @Output() contactCreated = new EventEmitter<Contacts>();
  /** HTML dialog reference. */
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  /** NgForm template reference. */
  @ViewChild('f') contactForm?: NgForm;
  private cancelListener?: (event: Event) => void;
  private editedFromAccount = false;
  /** Instance of AuthService used for authentication and session handling. */
  private authService = inject(AuthService);
  /** Instance of Angular Router used for programmatic navigation. */
  private router = inject(Router);
  /** Instance of ScrollLockService used to manage background scrolling when overlays or dialogs are active. */
  private scrollLock = inject(ScrollLockService);
  /** Handles the delayed show/hide timing of the "contact created" toast. */
  private readonly successToast = new DelayedToast(
    (visible) => (this.showSuccessToast = visible),
    2400,
    1800,
  );

  /** Flag to display success toast feedback. */
  showSuccessToast = false;
  /** Active hovered action icon. */
  hoveredIcon: string | null = null;
  /** Flag to display the delete-account confirmation popup. */
  showDeleteAccountConfirm = false;
  /** Configurable UI text dictionary indexed by mode and key. */
  readonly dialogText = DIALOG_TEXT;

  /** Form model object for contact binding. */
  contact: { name: string; email: string; phone: string; photoUrl?: string } = {
    name: '',
    email: '',
    phone: '',
  };

  /**
   * Opens the dialog in a specific mode ('open' or 'change').
   * @param mode The dialog mode.
   */
  openWithMode(mode: DialogMode): void {
    this.mode = mode;
    this.editedFromAccount = false;
    this.open();
  }

  /**
   * Angular lifecycle: after view init, sets up cancel event listener.
   */
  ngAfterViewInit(): void {
    const dialogEl = this.dialog?.nativeElement;
    if (!dialogEl) {
      return;
    }
    this.cancelListener = (event) => {
      event.preventDefault();
      this.close();
    };
    dialogEl.addEventListener('cancel', this.cancelListener);
  }

  /**
   * Angular lifecycle: on destroy, cleans up listeners and timeouts.
   */
  ngOnDestroy(): void {
    const dialogEl = this.dialog?.nativeElement;
    if (dialogEl && this.cancelListener) {
      dialogEl.removeEventListener('cancel', this.cancelListener);
    }
    this.scrollLock.unlock();
    this.successToast.clear();
  }

  /**
   * Opens the dialog and prepares contact fields.
   */
  open(): void {
    this.prepareContactFields();
    const dialogEl = this.dialog?.nativeElement;
    if (!dialogEl) return;
    this.openDialogElement(dialogEl);
  }

  /**
   * Prepares the contact fields for the dialog depending on mode.
   */
  private prepareContactFields(): void {
    if (this.mode === 'open') {
      this.clearInputFields();
      return;
    }
    this.loadContactFieldsForMode();
  }

  /**
   * Loads name/email/phone/photo into the form for 'change' and 'account' mode.
   */
  private loadContactFieldsForMode(): void {
    const selected =
      this.mode === 'account' ? this.resolveOwnContact() : this.contactsService.selectedContact;
    if (!selected) return;
    this.contact.name = selected.name ?? '';
    this.contact.email = selected.email ?? '';
    this.contact.phone = selected.phone?.toString() ?? '';
    this.contact.photoUrl = selected.photoUrl;
  }

  /**
   * Finds the contact record matching the currently logged-in user's email
   * and marks it as selected so the reused 'change' mode can edit it.
   */
  private resolveOwnContact(): Contacts | null {
    const email = this.contactsService.currentUserEmail;
    const own = this.contactsService.contactList.find((c) => c.email === email) ?? null;
    if (own) this.contactsService.selectedContact = own;
    return own;
  }

  /**
   * Opens the dialog element and locks body scroll.
   * @param dialogEl The dialog HTML element.
   */
  private openDialogElement(dialogEl: HTMLDialogElement): void {
    dialogEl.removeAttribute('data-dialog-state');
    this.scrollLock.lock();
    dialogEl.showModal();
  }

  /**
   * Closes the dialog with animation and resets form.
   */
  close(): void {
    const dialogEl = this.dialog?.nativeElement;
    if (!dialogEl) return;
    if (!dialogEl.open) return this.finishClose(dialogEl);
    if (dialogEl.getAttribute('data-dialog-state') === 'closing') return;
    this.setupDialogCloseAnimation(dialogEl);
  }

  /**
   * Finishes closing the dialog, unlocks scroll, resets form.
   * @param dialogEl The dialog HTML element.
   */
  private finishClose(dialogEl: HTMLDialogElement): void {
    dialogEl.removeAttribute('data-dialog-state');
    dialogEl.close();
    this.scrollLock.unlock();
    this.contactForm?.resetForm();
    this.editedFromAccount = false;
  }

  /**
   * Sets up the close animation and fallback for the dialog.
   * @param dialogEl The dialog HTML element.
   */
  private setupDialogCloseAnimation(dialogEl: HTMLDialogElement): void {
    const animationDuration = 400;
    const closeAnimations = ['dialog-exit-right', 'dialog-exit-up'];
    runOnAnimationEndOrTimeout(dialogEl, closeAnimations, animationDuration, () =>
      this.finishClose(dialogEl),
    );
    dialogEl.setAttribute('data-dialog-state', 'closing');
  }

  /**
   * Handles click on the backdrop to close the dialog.
   * @param event Mouse event.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog?.nativeElement) {
      this.close();
    }
  }

  /**
   * Gets the dialog text for a given key and mode.
   * @param key The dialog text key.
   */
  getText(key: DialogTextKey): string {
    if (key === 'secondaryAction' && this.editedFromAccount) {
      return this.dialogText['account'].secondaryAction;
    }
    return this.dialogText[this.mode][key];
  }

  /**
   * Handles the primary action (create or save contact) from the dialog.
   * @param form The NgForm instance.
   */
  handlePrimaryAction(form: NgForm): void {
    if (this.mode === 'account') {
      this.mode = 'change';
      this.editedFromAccount = true;
      return;
    }
    if (!form.valid) {
      Object.keys(form.controls).forEach((key) => form.controls[key].markAsTouched());
      return;
    }
    if (this.mode === 'open') {
      this.submitContact(form);
      return;
    }
    this.saveChanges();
  }

  /**
   * Saves changes to an existing contact.
   */
  async saveChanges(): Promise<void> {
    const selected = this.contactsService.selectedContact;
    if (!selected?.id) {
      return;
    }
    await this.contactsService.updateContact({
      id: selected.id,
      name: this.contact.name,
      email: this.contact.email,
      phone: this.contact.phone,
      photoUrl: this.contact.photoUrl,
    });
    this.close();
  }

  /**
   * Handles the secondary action (cancel or delete contact).
   */
  handleSecondaryAction(): void {
    if (this.mode === 'open') {
      this.close();
      return;
    }
    if (this.mode === 'account' || this.editedFromAccount) {
      this.showDeleteAccountConfirm = true;
      return;
    }
    this.contactsService.deleteSelectedContact();
    this.close();
  }

  /**
   * Confirms account deletion: removes the contact record, deletes the
   * Firebase Auth user, closes everything, and redirects to login.
   */
  async confirmDeleteAccount(): Promise<void> {
    if (this.authService.isGuestUser()) {
      this.showDeleteAccountConfirm = false;
      return;
    }
    this.contactsService.deleteSelectedContact();
    const result = await this.authService.deleteAccount();
    this.showDeleteAccountConfirm = false;
    this.close();
    if (!result.success) {
      console.error('Account deletion failed:', result.error);
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Cancels the pending account deletion, closing only the confirm popup.
   */
  cancelDeleteAccount(): void {
    this.showDeleteAccountConfirm = false;
  }

  /**
   * Submits a new contact to the database.
   * @param form The NgForm instance.
   */
  async submitContact(form: NgForm): Promise<void> {
    const createdContact = await this.contactsService.addContactToDataBase(this.contact);
    form.resetForm();
    this.clearInputFields();
    this.close();
    this.successToast.schedule();
    if (createdContact) {
      this.contactCreated.emit(createdContact);
    }
  }

  /**
   * Clears the contact input fields.
   */
  clearInputFields(): void {
    this.contact.name = '';
    this.contact.email = '';
    this.contact.phone = '';
    this.contact.photoUrl = undefined;
  }
}
