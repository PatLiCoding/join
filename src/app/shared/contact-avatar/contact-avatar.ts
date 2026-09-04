import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ContactService } from '../../firebase-service/contact-service';
import { ImageCompressionService } from '../../firebase-service/image-compression.service';
import { Contacts } from '../../interfaces/contacts';
import { UploadErrorToastComponent } from '../upload-error-toast/upload-error-toast.component';

/**
 * Displays a contact's avatar: their uploaded photo if present,
 * otherwise a colored circle with their initials, or a default
 * placeholder icon if no contact is bound at all.
 * In editable mode, allows uploading, compressing, and removing the photo.
 */
@Component({
  selector: 'app-contact-avatar',
  standalone: true,
  imports: [UploadErrorToastComponent],
  templateUrl: './contact-avatar.html',
  styleUrl: './contact-avatar.scss',
})
export class ContactAvatar {
  private contactsService = inject(ContactService);
  private imageCompression = inject(ImageCompressionService);

  /** The contact to display an avatar for (view mode). */
  @Input() contact: Contacts | null = null;
  /** Avatar diameter in pixels (desktop / default). */
  @Input() size = 40;
  /** Avatar diameter in pixels for mobile viewports (≤1000px). Defaults to `size` if not set. */
  @Input() mobileSize?: number;
  /** Whether upload/remove controls are shown. Defaults to false (view only). */
  @Input() editable = false;
  /** Current photo value, used in editable mode instead of `contact.photoUrl`. */
  @Input() photoUrl?: string;
  /** Path to the default placeholder icon shown when no contact/photo is set. */
  @Input() defaultIconUrl = 'assets/imgs/contact-list/person.png';
  /** Optional override for the initials background color, bypassing the contact's assigned color. */
  @Input() colorOverride?: string;
  /** Emits the new base64 photo (or undefined on removal) in editable mode. */
  @Output() photoUrlChange = new EventEmitter<string | undefined>();

  /** Active hover state for the upload icon, used to swap in the hover image asset. */
  hoveredIcon = false;
  /** Validation or processing error message displayed to the user via the error toast. */
  fileError = '';

  /**
   * Resolves the photo to display, from the `photoUrl` input in editable mode
   * or from the bound `contact` in view mode.
   */
  get displayPhoto(): string | undefined {
    return this.editable ? this.photoUrl : this.contact?.photoUrl;
  }

  /** Returns the background color assigned to the bound contact for the initials fallback. */
  get color(): string {
    return this.contactsService.getContactColor(this.contact);
  }

  /** Returns the initials derived from the bound contact's name. */
  get initials(): string {
    return this.contactsService.getInitials(this.contact?.name);
  }

  /** Whether initials can be shown (a contact with a name is bound). */
  get hasInitials(): boolean {
    return !!this.contact?.name;
  }

  /** Whether a contact is currently bound to the component. */
  get hasContact(): boolean {
    return !!this.contact;
  }

  /** Resolves the background color: transparent behind a photo, contact color for initials, neutral gray for the placeholder. */
  get backgroundColor(): string {
    if (this.displayPhoto) return 'transparent';
    return this.hasContact ? this.color : '#E7E7E7';
  }

  /**
   * Handles the file input change event for photo uploads.
   * Validates the selected file, compresses it, and emits the result.
   * @param event The change event from the file input.
   */
  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.validatePhotoFile(file)) return;
    const compressed = await this.imageCompression.compressImage(file, 300, 300, 0.8);
    this.closeError();
    this.photoUrlChange.emit(compressed);
  }

  /**
   * Validates a selected photo file against type and size constraints.
   * @param file The file to validate.
   * @returns True if the file passes validation.
   */
  private validatePhotoFile(file: File): boolean {
    if (!this.imageCompression.isTypeAllowed(file)) {
      this.showError('Only PNG, JPEG or WEBP images are allowed.');
      return false;
    }
    if (!this.imageCompression.isSizeAllowed(file)) {
      this.showError('Image must be smaller than 5 MB.');
      return false;
    }
    return true;
  }

  /**
   * Removes the currently selected photo by emitting undefined.
   */
  removePhoto(): void {
    this.closeError();
    this.photoUrlChange.emit(undefined);
  }

  /**
   * Displays an error message as a toast. Auto-dismiss is handled by the
   * toast component itself, so no local timer is needed here.
   * @param message The error message to display.
   */
  private showError(message: string): void {
    this.fileError = message;
  }

  /**
   * Closes the currently displayed error toast.
   */
  closeError(): void {
    this.fileError = '';
  }
}
