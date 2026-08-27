import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subtask } from '../../interfaces/task';

/**
 * Component for managing, adding, editing, and displaying subtasks.
 */
@Component({
  selector: 'app-subtask',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subtask.component.html',
  styleUrls: ['./subtask.component.scss'],
})
export class SubtaskComponent {
  /** Array of subtask objects associated with the task. */
  @Input() subtasks: Subtask[] = [];

  /** Indicates whether subtasks can be edited or modified. */
  @Input() isEditMode: boolean = true;

  /** Emits the updated subtasks array whenever a subtask is added, updated, or removed. */
  @Output() subtasksChange = new EventEmitter<Subtask[]>();

  /** Current input value for creating a new subtask. */
  newSubtaskTitle: string = '';

  /** Zero-based index of the subtask currently being edited, or null if none. */
  editingIndex: number | null = null;

  /** Temporary buffer title for the subtask currently being edited. */
  editedTitle: string = '';

  constructor(private elementRef: ElementRef) {}

  /**
   * Listens for global document clicks to auto-save pending subtask edits
   * when the user clicks outside this component.
   *
   * @param event The native DOM mouse event.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside && this.editingIndex !== null) {
      this.saveEdit(this.editingIndex);
    }
  }

  /**
   * Clears the new subtask input field.
   */
  clearInput(): void {
    this.newSubtaskTitle = '';
  }

  /**
   * Adds a new subtask to the subtask list if the input title is non-empty.
   *
   * @param event Optional DOM event to prevent default form submission.
   */
  addSubtask(event?: Event): void {
    if (event) event.preventDefault();
    if (!this.newSubtaskTitle.trim()) return;
    const updated = [...this.subtasks, { title: this.newSubtaskTitle.trim(), completed: false }];
    this.newSubtaskTitle = '';
    this.subtasksChange.emit(updated);
  }

  /**
   * Removes a subtask at the specified index.
   *
   * @param index Zero-based index of the subtask to remove.
   */
  removeSubtask(index: number): void {
    const updated = this.subtasks.filter((_, i) => i !== index);
    if (this.editingIndex === index) {
      this.editingIndex = null;
    }
    this.subtasksChange.emit(updated);
  }

  /**
   * Enables inline editing mode for a subtask at the specified index.
   *
   * @param index Zero-based index of the subtask to edit.
   */
  startEdit(index: number): void {
    if (!this.isEditMode) return;
    this.editingIndex = index;
    this.editedTitle = this.subtasks[index].title;
  }

  /**
   * Saves changes to an edited subtask, or removes it if the updated title is empty.
   *
   * @param index Zero-based index of the subtask being saved.
   * @param event Optional DOM event to prevent default form submission.
   */
  saveEdit(index: number, event?: Event): void {
    if (event) event.preventDefault();
    if (this.editingIndex === null) return;
    if (this.editedTitle.trim()) {
      const updated = [...this.subtasks];
      updated[index] = { ...updated[index], title: this.editedTitle.trim() };
      this.subtasksChange.emit(updated);
    } else {
      this.removeSubtask(index);
    }
    this.editingIndex = null;
  }

  /**
   * Cancels active inline editing and discards unsaved changes.
   */
  cancelEdit(): void {
    this.editingIndex = null;
  }
}
