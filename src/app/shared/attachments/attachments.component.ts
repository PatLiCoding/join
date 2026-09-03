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
import { UploadErrorToastComponent } from '../upload-error-toast/upload-error-toast.component';

/**
 * Reusable component for displaying, compressing, and managing image attachments.
 * Integrates with Viewer.js for interactive full-screen image previews.
 */
@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [CommonModule, UploadErrorToastComponent],
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

  /** Validation or processing error message displayed to the user. */
  fileError = '';

  /** Index of the attachment currently hovered on its action icon, or null. */
  hoveredIconIndex: number | null = null;

  /** Reference to the gallery container DOM element used by Viewer.js. */
  @ViewChild('gallery') galleryRef?: ElementRef<HTMLDivElement>;

  /** Active Viewer.js instance used for full-screen gallery lightbox. */
  private viewerInstance: Viewer | null = null;

  /** Index of the attachment currently shown in the viewer, kept in sync via the 'viewed' event. */
  private currentViewerIndex = 0;

  private errorTimeoutId?: ReturnType<typeof setTimeout>;

  /** True while a file is being dragged over the dropzone (controls hover styling). */
  isDragOver = false;

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
    await this.handleFileList(input.files);
    input.value = '';
  }

  /**
   * Validates, compresses, and appends a single file to the target attachment list.
   * @param file Selected file object.
   * @param targetList Target attachment array to update.
   */
  private async processFile(file: File, targetList: Attachment[]): Promise<void> {
    if (!this.imageCompression.isTypeAllowed(file)) {
      this.showError('You can only upload JPEG and PNG.');
      return;
    }
    if (!this.imageCompression.isSizeAllowed(file)) {
      this.showError('File is too large (max. 5 MB).');
      return;
    }
    await this.compressAndAppend(file, targetList);
  }

  /**
   * Compresses a validated file and appends it to the target list,
   * rejecting it if the combined attachment size would exceed the Firestore limit.
   * @param file The validated image file.
   * @param targetList Target attachment array to update.
   */
  private async compressAndAppend(file: File, targetList: Attachment[]): Promise<void> {
    try {
      const base64 = await this.imageCompression.compressImage(file);
      const fileSize = this.imageCompression.getBase64SizeInBytes(base64);
      const candidate: Attachment = { filename: file.name, fileType: file.type, fileSize, base64 };
      if (!this.imageCompression.isTotalSizeAllowed([...targetList, candidate])) {
        this.showError('Attachments exceed the 900 KB storage limit for this task.');
        return;
      }
      targetList.push(candidate);
    } catch {
      this.showError('The file could not be processed.');
    }
  }

  /**
   * Handles a click on the attachment thumbnail (outside the action icons)
   * by opening the full-screen viewer.
   * @param index Zero-based index of the clicked attachment.
   */
  onThumbClick(index: number): void {
    this.openViewer(index);
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
   * Opens the Viewer.js lightbox at a specific attachment index.
   * @param index Zero-based index of the attachment to display.
   */
  openViewer(index: number): void {
    if (!this.viewerInstance) return;
    this.viewerInstance.view(index);
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
          toolbar: this.buildToolbar(),
          navbar: this.attachments.length > 1,
          title: () => this.buildImageTitle(this.currentViewerIndex),
          view: (event) => this.onImageView(event),
          filter: (image) => image.classList.contains('attachment-img'),
        });
      }
    });
  }

  /**
   * Updates the tracked viewer index when Viewer.js begins showing a new image,
   * ensuring the title callback reads the correct attachment metadata.
   * @param event The Viewer.js 'view' custom event.
   */
  private onImageView(event: CustomEvent<{ index: number }>): void {
    this.currentViewerIndex = event.detail.index;
  }

  /**
   * Builds the label shown above the viewed image, combining filename,
   * file type, and formatted file size.
   * @param index Index of the currently viewed attachment.
   * @returns The combined metadata label.
   */
  private buildImageTitle(index: number): string {
    const att = this.attachments[index];
    if (!att) return '';
    const size = this.imageCompression.formatFileSize(
      att.fileSize ?? this.imageCompression.getBase64SizeInBytes(att.base64),
    );
    return `${att.filename} · ${att.fileType} · ${size}`;
  }

  /**
   * Builds the Viewer.js toolbar configuration.
   * @returns The toolbar configuration object.
   */
  private buildToolbar(): NonNullable<Viewer.Options['toolbar']> {
    return {
      zoomIn: 1,
      zoomOut: 1,
      oneToOne: 1,
      reset: 1,
      prev: this.attachments.length > 1 ? 1 : 0,
      next: this.attachments.length > 1 ? 1 : 0,
      rotateLeft: 1,
      rotateRight: 1,
    };
  }

  /**
   * Triggers a browser download of the attachment at the given index.
   * @param index Zero-based index of the attachment to download.
   */
  downloadAttachment(index: number): void {
    const att = this.attachments[index];
    if (!att) return;
    const link = document.createElement('a');
    link.href = att.base64;
    link.download = att.filename;
    link.click();
  }

  /**
   * Triggers a browser download of the attachment currently shown in the viewer.
   */
  private downloadCurrentAttachment(): void {
    this.downloadAttachment(this.currentViewerIndex);
  }

  /**
   * Angular lifecycle hook called when the component is destroyed.
   * Destroys the Viewer.js instance to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.viewerInstance?.destroy();
    clearTimeout(this.errorTimeoutId);
  }
  /**
   * Handles dragover events on the dropzone, preventing the browser's default behavior.
   * @param event The drag event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  /**
   * Handles dragleave events on the dropzone.
   * @param event The drag event.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  /**
   * Handles files dropped onto the dropzone by delegating to the same
   * processing pipeline used for the file picker.
   * @param event The drop event.
   */
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragOver = false;
    if (!this.isEditable || !event.dataTransfer?.files.length) return;
    await this.handleFileList(event.dataTransfer.files);
  }

  /**
   * Removes all attachments at once and refreshes the gallery.
   */
  deleteAllAttachments(): void {
    if (!this.isEditable) return;
    this.attachments = [];
    this.attachmentsChange.emit(this.attachments);
    this.refreshViewer();
  }

  /**
   * Shared pipeline for processing a FileList from either the file picker or a drop event.
   * @param files The list of selected or dropped files.
   */
  private async handleFileList(files: FileList): Promise<void> {
    this.fileError = '';
    clearTimeout(this.errorTimeoutId);
    const currentList = [...(this.attachments ?? [])];
    for (const file of Array.from(files)) {
      await this.processFile(file, currentList);
    }
    this.attachments = currentList;
    this.attachmentsChange.emit(this.attachments);
    this.refreshViewer();
  }

  /**
   * Displays an error message as a toast and auto-dismisses it after a delay.
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

  /**
   * Marks the icon at the given index as hovered.
   * @param index Zero-based index of the attachment.
   */
  onIconEnter(index: number): void {
    this.hoveredIconIndex = index;
  }

  /**
   * Clears the hovered icon state.
   */
  onIconLeave(): void {
    this.hoveredIconIndex = null;
  }
}
