import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddTaskTemplate } from '../add-task-template/add-task-template';

/**
 * Dialog wrapper component for task creation.
 * Displays the task creation template in a modal context and provides
 * inputs for open state and initial target status column.
 */
@Component({
  selector: 'app-add-task-dialog',
  standalone: true,
  imports: [CommonModule, AddTaskTemplate],
  templateUrl: './add-task-dialog.html',
  styleUrls: ['./add-task-dialog.scss'],
})
export class AddTaskDialog {
  /**
   * Event emitted when the dialog is requested to close.
   */
  @Output() close = new EventEmitter<void>();
  /**
   * Controls the visibility state of the modal dialog.
   */
  @Input() isDialogOpen: boolean = false;
  /**
   * Defines the initial status column context for the newly created task.
   */
  @Input() column: 'todo' | 'in-progress' | 'await-feedback' | 'done' = 'todo';

  /**
   * Emits the close event to notify parent component to close the dialog.
   */
  onClose() {
    this.close.emit();
  }
}
