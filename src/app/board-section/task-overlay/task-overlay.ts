import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, Subtask } from '../../interfaces/task';
import { Contacts } from '../../interfaces/contacts';
import { ContactService } from '../../firebase-service/contact-service';
import { AssignedToSelectComponent } from '../../shared/assigned-to-select/assigned-to-select';
import { TaskService } from '../../firebase-service/task.service';
import { AttachmentsComponent } from '../../shared/attachments/attachments.component';
import { SubtaskComponent } from '../../shared/subtask/subtask.component';
import { ContactAvatar } from '../../shared/contact-avatar/contact-avatar';

/**
 * Overlay component for viewing and editing task details, including assignment,
 * subtasks, priority, category, due date, and attachments.
 */
@Component({
  selector: 'app-task-overlay',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AssignedToSelectComponent,
    AttachmentsComponent,
    SubtaskComponent,
    ContactAvatar,
  ],
  templateUrl: './task-overlay.html',
  styleUrls: ['./task-overlay.scss'],
})
export class TaskOverlay implements OnInit, OnChanges {
  /** The task object to display or edit. */
  @Input() task: (Task & { id: string }) | null = null;
  /** Event emitted when the overlay is closed. */
  @Output() close = new EventEmitter<void>();
  /** Event emitted when the task is deleted, passing the task ID. */
  @Output() delete = new EventEmitter<string>();
  /** Event emitted when the task updates are saved. */
  @Output() save = new EventEmitter<Omit<Task, 'id' | 'createdAt'>>();

  /** Indicates whether the overlay is in active edit mode. */
  isEditMode = false;
  /** Indicates whether a save operation is currently pending. */
  isSaving = false;
  /** Today's date in YYYY-MM-DD format, used for date comparisons. */
  today = new Date().toISOString().split('T')[0];
  /** Zero-based index of the subtask currently being edited, or null if none. */
  editingSubtaskIndex: number | null = null;
  /** Zero-based index of the subtask currently hovered by the user cursor. */
  hoveredSubtaskIndex: number | null = null;
  /** Title text input for adding a new subtask. */
  newSubtaskTitle = '';
  /** Backup copy of a subtask's original title before editing began. */
  subtaskBackup: string | null = null;
  /** Original task due date before editing, used to detect modifications. */
  originalDueDate: string | null = null;
  /** List of contact objects assigned to this task. */
  assignedContacts: Contacts[] = [];
  /** Error message displayed for attachment file validation issues. */
  attachmentError = '';
  /** Active hovered action icon. */
  hoveredIcon: string | null = null;

  /** Local working copy of task data for edit operations. */
  editedTask: Omit<Task, 'id' | 'createdAt'> = {
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    category: 'User Story',
    subtasks: [],
    status: 'todo',
    assignedTo: [],
    position: 0,
    attachments: [],
  };

  /**
   * Initializes a new instance of the TaskOverlay component.
   * @param contactService Service for fetching and managing user contacts.
   * @param taskService Service for persisting task modifications.
   */
  constructor(
    public contactService: ContactService,
    private taskService: TaskService,
  ) {}

  /**
   * Angular lifecycle hook called on component initialization.
   * Loads initial task details and assigned contacts.
   */
  ngOnInit(): void {
    this.loadTaskData();
    this.loadAssignedContacts();
  }

  /**
   * Angular lifecycle hook called when bound input properties change.
   * Reloads task details and assigned contacts.
   * @param _ Changes object containing property change metadata.
   */
  ngOnChanges(_: SimpleChanges): void {
    this.loadTaskData();
    this.loadAssignedContacts();
  }

  /**
   * Loads and transforms the input task into an editable local format.
   */
  private loadTaskData(): void {
    if (!this.task) return;
    this.editedTask = this.extractEditableTask(this.task);
    this.originalDueDate = this.editedTask.dueDate;
  }

  /**
   * Extracts editable field properties from a full task object.
   * @param task Target task instance.
   * @returns Cleaned editable task object without administrative metadata.
   */
  private extractEditableTask(task: Task & { id: string }): Omit<Task, 'id' | 'createdAt'> {
    const { id, createdAt, ...taskData } = task;
    return {
      ...taskData,
      dueDate: this.formatDateForInput(task.dueDate),
      assignedTo: task.assignedTo || [],
      attachments: task.attachments || [],
    };
  }

  /**
   * Resolves contact entity objects matching assigned contact names.
   */
  private loadAssignedContacts(): void {
    if (this.task?.assignedTo?.length) {
      this.assignedContacts = this.contactService.contactList.filter((c) =>
        (this.task?.assignedTo || []).includes(c.name),
      );
    } else {
      this.assignedContacts = [];
    }
  }

  /**
   * Handles selection changes in the assigned contacts picker.
   * @param selectedContacts Updated array of selected contact objects.
   */
  onContactsChange(selectedContacts: Contacts[]): void {
    this.editedTask.assignedTo = selectedContacts.map((c) => c.name);
    this.assignedContacts = [...selectedContacts];
  }

  /**
   * Toggles the completion state of a subtask and updates backend storage.
   * @param subtask Target subtask instance.
   */
  toggleSubtask(subtask: Subtask): void {
    subtask.completed = !subtask.completed;
    this.updateSubtasksInTask();
  }

  /**
   * Persists subtask state changes to Firestore.
   */
  private updateSubtasksInTask(): void {
    if (!this.task?.id) return;
    this.taskService
      .updateTask(this.task.id, { subtasks: this.editedTask.subtasks })
      .catch(console.error);
  }

  /**
   * Switches the overlay panel to edit mode and populates the form controls.
   */
  enableEdit(): void {
    if (!this.task) return;
    this.editedTask = this.extractEditableTask(this.task);
    this.isEditMode = true;
  }

  /**
   * Exits edit mode without persisting unsaved modifications.
   */
  cancelEdit(): void {
    this.isEditMode = false;
  }

  /**
   * Validates required form fields for task updating.
   * @returns True if title and due date inputs are valid; false otherwise.
   */
  private isFormValid(): boolean {
    return !!(this.editedTask.title?.trim() && this.editedTask.dueDate);
  }

  /**
   * Emits the updated task payload if validation succeeds and updates local reference.
   */
  onSave(): void {
    if (!this.isFormValid()) return;

    this.isSaving = true;
    if (this.task) Object.assign(this.task, this.editedTask);
    this.save.emit(this.editedTask);
    this.isEditMode = false;
    this.resetSavingFlag();
  }

  /**
   * Resets the `isSaving` flag after a brief timeout delay.
   */
  private resetSavingFlag(): void {
    setTimeout(() => (this.isSaving = false), 500);
  }

  /**
   * Triggers task deletion and emits the delete event with task ID.
   */
  onDelete(): void {
    if (!this.task?.id) return;
    this.delete.emit(this.task.id);
    this.onClose();
  }

  /**
   * Emits the close event to dismiss the overlay modal.
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Formats a raw date string into YYYY-MM-DD for standard HTML date inputs.
   * @param date Date input string.
   * @returns Formatted date string (YYYY-MM-DD) or empty string.
   */
  formatDateForInput(date: string): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Returns a safe task representation with fallback default values for missing properties.
   */
  get safeTask() {
    const t = this.task;
    return {
      title: t?.title || 'Untitled Task',
      description: t?.description || 'No description provided',
      dueDate: t?.dueDate || this.today,
      priority: t?.priority?.toLowerCase() || 'medium',
      category: t?.category || 'User Story',
      assignedTo: t?.assignedTo || [],
      subtasks: t?.subtasks || [],
      attachments: t?.attachments || [],
    };
  }

  /**
   * Checks whether the selected due date is in the past relative to today.
   * @returns True if the newly selected date precedes today's date; false otherwise.
   */
  isDateInPast(): boolean {
    if (!this.editedTask.dueDate) return false;
    if (this.editedTask.dueDate === this.originalDueDate) return false;
    const selected = new Date(this.editedTask.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }

  /**
   * Calculates the accent color corresponding to the current task category.
   * @returns Hex color code string.
   */
  get categoryColor(): string {
    return this.safeTask.category === 'Technical Task' ? '#1FD7C1' : '#0038FF';
  }

  /**
   * TrackBy function for optimizing contact rendering in ngFor loops.
   * @param index Item index.
   * @param contact Contact item.
   * @returns Unique contact identifier or fallback string index.
   */
  trackByContactId(index: number, contact: Contacts): string {
    return contact.id ?? index.toString();
  }

  /**
   * TrackBy function for optimizing subtask rendering in ngFor loops.
   * @param index Subtask index.
   * @param subtask Subtask item.
   * @returns Subtask index.
   */
  trackBySubtask(index: number, subtask: Subtask): number {
    return index;
  }

  /**
   * Closes the overlay when a click occurs outside the overlay and image viewer containers.
   * @param event DOM MouseEvent listener object.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const overlay = document.querySelector('.task-overlay');
    const viewerEl = document.querySelector('.viewer-container');
    const target = event.target as Node;
    const clickedInsideOverlay = overlay?.contains(target);
    const clickedInsideViewer = viewerEl?.contains(target);
    if (!clickedInsideOverlay && !clickedInsideViewer) {
      this.onClose();
    }
  }
}
