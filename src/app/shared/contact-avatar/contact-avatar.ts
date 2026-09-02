import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ContactService } from '../../firebase-service/contact-service';
import { ImageCompressionService } from '../../firebase-service/image-compression.service';
import { Contacts } from '../../interfaces/contacts';

/**
 * Displays a contact's avatar: their uploaded photo if present,
 * otherwise a colored circle with their initials.
 * In editable mode, allows uploading or removing the photo.
 */
@Component({
  selector: 'app-contact-avatar',
  standalone: true,
  templateUrl: './contact-avatar.html',
  styleUrl: './contact-avatar.scss',
})
export class ContactAvatar {
  private contactsService = inject(ContactService);
  private imageCompression = inject(ImageCompressionService);
  private errorTimeoutId?: ReturnType<typeof setTimeout>;

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
  @Input() colorOverride?: string;
  /** Emits the new base64 photo (or undefined on removal) in editable mode. */
  @Output() photoUrlChange = new EventEmitter<string | undefined>();

  /** Active hover state for the upload icon. */
  hoveredIcon = false;
  /** Error message for invalid uploads. */
  photoError: string | null = null;
  /** Validation or processing error message displayed to the user. */
  fileError = '';

  /** Resolves the photo to display, from input or bound contact. */
  get displayPhoto(): string | undefined {
    return this.editable ? this.photoUrl : this.contact?.photoUrl;
  }

  /** Returns the background color for the initials fallback. */
  get color(): string {
    return this.contactsService.getContactColor(this.contact);
  }

  /** Returns the initials for the fallback display. */
  get initials(): string {
    return this.contactsService.getInitials(this.contact?.name);
  }

  /** Whether initials can be shown (a contact with a name is bound). */
  get hasInitials(): boolean {
    return !!this.contact?.name;
  }

  get hasContact(): boolean {
    return !!this.contact;
  }

  /** Resolves the background color: contact color for initials, neutral gray for the placeholder. */
  get backgroundColor(): string {
    if (this.displayPhoto) return 'transparent';
    return this.hasContact ? this.color : '#E7E7E7';
  }

  /**
   * Handles the file input change event for photo uploads.
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
   * Removes the currently selected photo.
   */
  removePhoto(): void {
    this.closeError();
    this.photoUrlChange.emit(undefined);
  }

  /**
   * Displays an error message as a toast and auto-dismisses it after a delay.
   * @param message The error message to display.
   */
  private showError(message: string): void {
    this.photoError = message;
    clearTimeout(this.errorTimeoutId);
    this.errorTimeoutId = setTimeout(() => this.closeError(), 4000);
  }

  /**
   * Closes the currently displayed error toast.
   */
  closeError(): void {
    this.photoError = null;
    clearTimeout(this.errorTimeoutId);
  }
}
