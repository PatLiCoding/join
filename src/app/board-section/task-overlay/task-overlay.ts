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
import { Task, Subtask } from '../../interfaces/task';
import { Contacts } from '../../interfaces/contacts';
import { ContactService } from '../../firebase-service/contact-service';
import { TaskService } from '../../firebase-service/task.service';
import { AttachmentsComponent } from '../../shared/attachments/attachments.component';
import { ContactAvatar } from '../../shared/contact-avatar/contact-avatar';
import { AddTaskTemplate } from '../../add-task-section/add-task-template/add-task-template';

/**
 * Overlay component for viewing and editing task details. Editing is delegated to
 * `AddTaskTemplate` in 'edit' mode so task creation and task editing share one form.
 */
@Component({
  selector: 'app-task-overlay',
  standalone: true,
  imports: [CommonModule, AttachmentsComponent, ContactAvatar, AddTaskTemplate],
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
  @Output() save = new EventEmitter<Omit<Task, 'createdAt'>>();

  /** Indicates whether the overlay is in active edit mode. */
  isEditMode = false;
  /** Indicates whether a save operation is currently pending. */
  isSaving = false;
  /** Today's date in YYYY-MM-DD format, used as a fallback for missing due dates. */
  today = new Date().toISOString().split('T')[0];
  /** List of contact objects assigned to this task. */
  assignedContacts: Contacts[] = [];
  /** Active hovered action icon. */
  hoveredIcon: string | null = null;

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
   * Loads assigned contacts for the current task.
   */
  ngOnInit(): void {
    this.loadAssignedContacts();
  }

  /**
   * Angular lifecycle hook called when bound input properties change.
   * Leaves edit mode and reloads assigned contacts for the new task.
   * @param _ Changes object containing property change metadata.
   */
  ngOnChanges(_: SimpleChanges): void {
    this.isEditMode = false;
    this.loadAssignedContacts();
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
   * Toggles the completion state of a subtask and updates backend storage.
   * @param subtask Target subtask instance.
   */
  toggleSubtask(subtask: Subtask): void {
    subtask.completed = !subtask.completed;
    this.updateSubtasksInTask();
  }

  /**
   * Persists the current subtask list of the displayed task to Firestore.
   */
  private updateSubtasksInTask(): void {
    if (!this.task?.id) return;
    this.taskService
      .updateTask(this.task.id, { subtasks: this.task.subtasks })
      .catch(console.error);
  }

  /**
   * Switches the overlay panel to edit mode.
   */
  enableEdit(): void {
    if (!this.task) return;
    this.isEditMode = true;
  }

  /**
   * Persists the edited task payload emitted by the embedded add-task form
   * and returns the overlay to view mode.
   * @param updatedTask Edited task payload from `AddTaskTemplate`.
   */
  onSave(updatedTask: Omit<Task, 'createdAt'>): void {
    if (!this.task) return;
    this.isSaving = true;
    Object.assign(this.task, updatedTask);
    this.save.emit(updatedTask);
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
