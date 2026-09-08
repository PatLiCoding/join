import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Small reusable Yes/No confirmation popup, e.g. for destructive actions.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  /** Message text shown inside the popup. */
  @Input() message = 'Are you sure?';
  /** Emitted when the user confirms the action. */
  @Output() confirmed = new EventEmitter<void>();
  /** Emitted when the user cancels the action. */
  @Output() cancelled = new EventEmitter<void>();

  /** Emits the confirmed event. */
  onConfirm(): void {
    this.confirmed.emit();
  }

  /** Emits the cancelled event. */
  onCancel(): void {
    this.cancelled.emit();
  }
}
