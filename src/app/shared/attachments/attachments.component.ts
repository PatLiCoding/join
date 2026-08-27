import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Viewer from 'viewerjs';
import { Attachment } from '../../interfaces/task';
import { ImageCompressionService } from '../../firebase-service/image-compression.service';

/**
 * Reusable component for displaying, compressing, and managing image attachments.
 * Integrates with Viewer.js for interactive full-screen image previews.
 */
@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attachments.component.html',
  styleUrls: ['./attachments.component.scss'],
})
export class AttachmentsComponent implements OnDestroy, OnChanges {
  /** Array of file attachments. Supports two-way binding via [(attachments)]. */
  @Input() attachments: Attachment[] = [];
  /** Emits when the attachment list changes. */
  @Output() attachmentsChange = new EventEmitter<Attachment[]>();
  /** Controls whether file uploads and deletions are enabled (e.g. true in edit mode, false in view mode). */
  @Input() isEditable = true;
  /** Optional header label text displayed above the attachment component. */
  @Input() label = 'Attachments (images)';

  /** Validation or processing error message displayed to the user. */
  fileError = '';

  /** Reference to the gallery container DOM element used by Viewer.js. */
  @ViewChild('gallery') galleryRef?: ElementRef<HTMLDivElement>;

  /** Active Viewer.js instance used for full-screen gallery lightbox. */
  private viewerInstance: Viewer | null = null;

  /**
   * Initializes a new instance of the AttachmentsComponent.
   * @param imageCompression Service for compressing uploaded images and validating file types/sizes.
   */
  constructor(private imageCompression: ImageCompressionService) {}

  /**
   * Angular lifecycle hook called when input properties change.
   * Refreshes the Viewer.js gallery instance when `attachments` input is updated.
   * @param changes Object containing simple changes metadata.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attachments']) {
      this.refreshViewer();
    }
  }

  /**
   * Event handler triggered when a user selects file(s) for upload.
   * @param event Native file input change event.
   */
  async onFilesSelected(event: Event): Promise<void> {
    if (!this.isEditable) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.fileError = '';
    const currentList = [...(this.attachments ?? [])];
    for (const file of Array.from(input.files)) {
      await this.processFile(file, currentList);
    }
    input.value = '';
    this.attachments = currentList;
    this.attachmentsChange.emit(this.attachments);
    this.refreshViewer();
  }

  /**
   * Validates, compresses, and appends a single file to the target attachment list.
   * @param file Selected file object.
   * @param targetList Target attachment array to update.
   */
  private async processFile(file: File, targetList: Attachment[]): Promise<void> {
    if (!this.imageCompression.isTypeAllowed(file)) {
      this.fileError = 'Only PNG, JPG, or WEBP files are allowed.';
      return;
    }
    if (!this.imageCompression.isSizeAllowed(file)) {
      this.fileError = 'File is too large (max. 5 MB).';
      return;
    }
    try {
      const base64 = await this.imageCompression.compressImage(file);
      targetList.push({ filename: file.name, fileType: file.type, base64 });
    } catch {
      this.fileError = 'The file could not be processed.';
    }
  }

  /**
   * Removes an attachment at the specified index and updates the gallery preview.
   * @param index Zero-based index of the attachment to remove.
   */
  removeAttachment(index: number): void {
    if (!this.isEditable) return;
    const updated = [...(this.attachments ?? [])];
    updated.splice(index, 1);
    this.attachments = updated;
    this.attachmentsChange.emit(this.attachments);
    this.refreshViewer();
  }

  /**
   * Destroys and re-initializes the Viewer.js instance on the updated gallery DOM element.
   */
  private refreshViewer(): void {
    setTimeout(() => {
      this.viewerInstance?.destroy();
      if (this.galleryRef?.nativeElement && this.attachments?.length) {
        this.viewerInstance = new Viewer(this.galleryRef.nativeElement, {
          inline: false,
          toolbar: true,
          navbar: this.attachments.length > 1,
        });
      }
    });
  }

  /**
   * Angular lifecycle hook called when the component is destroyed.
   * Destroys the Viewer.js instance to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.viewerInstance?.destroy();
  }
}
