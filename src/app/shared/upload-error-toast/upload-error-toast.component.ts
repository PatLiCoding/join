import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Toast notification component that displays upload error messages.
 * Automatically closes after a set timeout (4 seconds) or upon component destruction.
 */
@Component({
  selector: 'app-upload-error-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-error-toast.component.html',
  styleUrls: ['./upload-error-toast.component.scss'],
})
export class UploadErrorToastComponent implements OnDestroy {
  /** Internal storage for the active error message. */
  private _message: string | null = '';
  /** Timeout reference for the auto-dismiss timer. */
  private timer?: ReturnType<typeof setTimeout>;

  /** Event emitted when the toast requests to be closed (e.g., when the auto-dismiss timer expires). */
  @Output() close = new EventEmitter<void>();
  /**
   * Sets the error message to display.
   * Resets any existing auto-dismiss timer and starts a new 4-second timer if a message is provided.
   */
  @Input()
  set errorMessage(val: string | null) {
    this._message = val;
    clearTimeout(this.timer);
    if (val) {
      this.timer = setTimeout(() => this.close.emit(), 4000);
    }
  }

  /**
   * Gets the current error message.
   * @returns The active error message or null/empty string if none.
   */
  get errorMessage(): string | null {
    return this._message;
  }

  /**
   * Cleans up active timers when the component is destroyed to prevent memory leaks.
   */
  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
