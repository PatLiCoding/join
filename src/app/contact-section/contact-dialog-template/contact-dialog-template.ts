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

type DialogMode = 'open' | 'change' | 'account';
type DialogTextKey = 'title' | 'subtitle' | 'primaryAction' | 'secondaryAction';

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
  /** Injected contact service. */
  contactsService = inject(ContactService);
  private authService = inject(AuthService);
  private router = inject(Router);
  /** Mode of the dialog: 'open' for creating a contact, 'change' for editing. */
  @Input() mode: DialogMode = 'open';
  /** Event emitted when a contact is successfully created. */
  @Output() contactCreated = new EventEmitter<Contacts>();
  /** HTML dialog reference. */
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  /** NgForm template reference. */
  @ViewChild('f') contactForm?: NgForm;
  private cancelListener?: (event: Event) => void;
  private readonly bodyScrollLockClass = 'dialog-scroll-lock';
  private readonly mobileBreakpoint = 1000;
  private isScrollLocked = false;
  private toastShowTimeoutId?: number;
  private toastHideTimeoutId?: number;
  private editedFromAccount = false;

  /** Flag to display success toast feedback. */
  showSuccessToast = false;
  /** Active hovered action icon. */
  hoveredIcon: string | null = null;
  /** Flag to display the delete-account confirmation popup. */
  showDeleteAccountConfirm = false;
  /** Configurable UI text dictionary indexed by mode and key. */
  dialogText: Record<DialogMode, Record<DialogTextKey, string>> = {
    open: {
      title: 'Add contact',
      subtitle: 'Tasks are better with a team!',
      primaryAction: 'Create Contact',
      secondaryAction: 'Cancel',
    },
    change: {
      title: 'Edit contact',
      subtitle: '',
      primaryAction: 'Save ✓',
      secondaryAction: 'Delete',
    },
    account: {
      title: 'My account',
      subtitle: '',
      primaryAction: 'Edit',
      secondaryAction: 'Delete my account',
    },
  };

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
    this.unlockBodyScroll();
    this.clearToastTimeouts();
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
    this.lockBodyScroll();
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
    this.unlockBodyScroll();
    this.contactForm?.resetForm();
    this.editedFromAccount = false;
  }

  /**
   * Sets up the close animation and fallback for the dialog.
   * @param dialogEl The dialog HTML element.
   */
  private setupDialogCloseAnimation(dialogEl: HTMLDialogElement): void {
    const animationDuration = 400;
    let fallbackId: number | undefined;
    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== dialogEl) return;
      if (event.animationName !== 'dialog-exit-right' && event.animationName !== 'dialog-exit-up')
        return;
      if (fallbackId !== undefined) window.clearTimeout(fallbackId);
      dialogEl.removeEventListener('animationend', handleAnimationEnd);
      this.finishClose(dialogEl);
    };
    fallbackId = window.setTimeout(() => {
      dialogEl.removeEventListener('animationend', handleAnimationEnd);
      this.finishClose(dialogEl);
    }, animationDuration);
    dialogEl.addEventListener('animationend', handleAnimationEnd);
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
   * Gets the color for a contact.
   * @param contact The contact object.
   */
  getContactColor(contact: any): string {
    return this.contactsService.getContactColor(contact);
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
    this.scheduleSuccessToast();
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

  /**
   * Schedules the success toast after closing the dialog.
   */
  private scheduleSuccessToast(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.clearToastTimeouts();
    const closeAnimationDuration = 400;
    const delayBeforeShow = closeAnimationDuration + 2000;
    const animationDuration = 1800;
    this.toastShowTimeoutId = window.setTimeout(() => {
      this.showSuccessToast = true;
      this.toastHideTimeoutId = window.setTimeout(() => {
        this.showSuccessToast = false;
      }, animationDuration);
    }, delayBeforeShow);
  }

  /**
   * Clears any toast timeouts.
   */
  private clearToastTimeouts(): void {
    if (this.toastShowTimeoutId !== undefined) {
      window.clearTimeout(this.toastShowTimeoutId);
    }
    if (this.toastHideTimeoutId !== undefined) {
      window.clearTimeout(this.toastHideTimeoutId);
    }
    this.toastShowTimeoutId = undefined;
    this.toastHideTimeoutId = undefined;
  }

  /**
   * Locks body scroll for mobile viewports.
   */
  private lockBodyScroll(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (!this.isMobileViewport()) {
      return;
    }
    document.body.classList.add(this.bodyScrollLockClass);
    this.isScrollLocked = true;
  }

  /**
   * Unlocks body scroll if it was locked.
   */
  private unlockBodyScroll(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (!this.isScrollLocked) {
      return;
    }
    document.body.classList.remove(this.bodyScrollLockClass);
    this.isScrollLocked = false;
  }

  /**
   * Checks if the viewport is mobile size.
   * @returns True if mobile viewport.
   */
  private isMobileViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= this.mobileBreakpoint;
  }
}
