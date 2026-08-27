import {
  Component,
  ViewChild,
  ElementRef,
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
import { Task } from '../../interfaces/task';
import { Contacts } from '../../interfaces/contacts';
import { ContactService } from '../../firebase-service/contact-service';
import { AssignedToSelectComponent } from '../../shared/assigned-to-select/assigned-to-select';
import { TaskService } from '../../firebase-service/task.service';
import Viewer from 'viewerjs';
import { ImageCompressionService } from '../../firebase-service/image-compression.service';
import { Attachment } from '../../interfaces/task';

/** Interface representing a subtask */
interface Subtask {
  title: string;
  completed: boolean;
}

/**
 * Component representing a task overlay panel.
 * Handles task editing, subtasks management, assignment to contacts, and saving/deleting tasks.
 */
@Component({
  selector: 'app-task-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignedToSelectComponent],
  templateUrl: './task-overlay.html',
  styleUrls: ['./task-overlay.scss'],
})
export class TaskOverlay implements OnInit, OnChanges {
  /** Task to display or edit */
  @Input() task: (Task & { id: string }) | null = null;

  /** Event emitted when overlay is closed */
  @Output() close = new EventEmitter<void>();

  /** Event emitted when the task is deleted */
  @Output() delete = new EventEmitter<string>();

  /** Event emitted when the task is saved */
  @Output() save = new EventEmitter<Omit<Task, 'id' | 'createdAt'>>();

  /** Whether the overlay is currently in edit mode (vs. read-only view). */
  isEditMode = false;
  /** Whether a save operation is currently in progress. */
  isSaving = false;
  /** Today's date in ISO format, used for date validation. */
  today = new Date().toISOString().split('T')[0];
  /** Index of the subtask currently being edited, or null if none. */
  editingSubtaskIndex: number | null = null;
  /** Index of the subtask currently hovered, used for UI hover states. */
  hoveredSubtaskIndex: number | null = null;
  /** Text currently typed into the "new subtask" input. */
  newSubtaskTitle = '';
  /** Backup of a subtask's title while it is being edited, used on cancel. */
  subtaskBackup: string | null = null;
  /** Due date of the task before editing started, used to detect changes. */
  originalDueDate: string | null = null;
  /** Contacts currently assigned to the task. */
  assignedContacts: Contacts[] = [];
  /** Current attachment validation/processing error message, if any. */
  attachmentError = '';

  /** Reference to the read-only attachment gallery. */
  @ViewChild('viewGallery') viewGalleryRef?: ElementRef<HTMLDivElement>;
  /** Reference to the edit-mode attachment gallery. */
  @ViewChild('editGallery') editGalleryRef?: ElementRef<HTMLDivElement>;
  /** Active Viewer.js instance for previewing attachments, if any. */
  private viewerInstance: Viewer | null = null;

  /** Task data being edited */
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
   * Constructor for TaskOverlay component.
   * @param contactService Service for managing contacts
   * @param taskService Service for managing tasks
   */
  constructor(
    public contactService: ContactService,
    private taskService: TaskService,
    private imageCompression: ImageCompressionService,
  ) {}

  /**
   * Handles the file-input change event and processes every selected file.
   * @param event The change event from the file input.
   */
  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.attachmentError = '';

    for (const file of Array.from(input.files)) {
      await this.processFile(file);
    }
    input.value = '';
    this.refreshViewer('edit');
  }

  /**
   * Validates and compresses a single file, then appends it to editedTask.attachments.
   * Sets attachmentError if the file is rejected or cannot be processed.
   * @param file The file to process.
   */
  private async processFile(file: File) {
    if (!this.imageCompression.isTypeAllowed(file)) {
      this.attachmentError = 'Only PNG, JPG, or WEBP files are allowed.';
      return;
    }
    if (!this.imageCompression.isSizeAllowed(file)) {
      this.attachmentError = 'File is too large (max. 5 MB).';
      return;
    }
    try {
      const base64 = await this.imageCompression.compressImage(file);
      this.editedTask.attachments = [
        ...(this.editedTask.attachments || []),
        { filename: file.name, fileType: file.type, base64 },
      ];
    } catch {
      this.attachmentError = 'The file could not be processed.';
    }
  }

  /**
   * Removes an attachment at the given index and refreshes the edit-mode viewer.
   * @param index The index of the attachment to remove.
   */
  removeAttachment(index: number) {
    this.editedTask.attachments = (this.editedTask.attachments || []).filter((_, i) => i !== index);
    this.refreshViewer('edit');
  }

  /**
   * (Re-)initializes Viewer.js for either the read-only view gallery or the
   * edit-mode gallery. The setTimeout defers execution until Angular has
   * updated the DOM (e.g. after *ngIf toggles visibility of the gallery).
   * @param target Which gallery to attach the viewer to.
   */
  private refreshViewer(target: 'edit' | 'view') {
    setTimeout(() => {
      const ref = target === 'edit' ? this.editGalleryRef : this.viewGalleryRef;
      this.viewerInstance?.destroy();
      if (ref?.nativeElement) {
        this.viewerInstance = new Viewer(ref.nativeElement, { inline: false, toolbar: true });
      }
    });
  }

  /**
   * Lifecycle hook called on component initialization.
   * Loads task data and assigned contacts.
   */
  ngOnInit() {
    this.loadTaskData();
    this.loadAssignedContacts();
  }

  /**
   * Lifecycle hook called when input properties change.
   * Reloads task data and assigned contacts.
   * @param _ Changes object
   */
  ngOnChanges(_: SimpleChanges) {
    this.loadTaskData();
    this.loadAssignedContacts();
    this.refreshViewer('edit');
  }

  /**
   * Lifecycle hook called when the component is destroyed.
   * Destroys the Viewer.js instance to avoid leaking DOM nodes/listeners.
   */
  ngOnDestroy() {
    this.viewerInstance?.destroy();
  }

  /**
   * Loads editable data from the input task.
   */
  private loadTaskData() {
    if (!this.task) return;

    this.editedTask = this.extractEditableTask(this.task);
    this.originalDueDate = this.editedTask.dueDate;
  }

  /**
   * Extracts editable task data from a Task object.
   * @param task Original task
   * @returns Editable task object
   */
  private extractEditableTask(task: Task & { id: string }) {
    const { id, createdAt, ...taskData } = task;
    return {
      ...taskData,
      dueDate: this.formatDateForInput(task.dueDate),
      assignedTo: task.assignedTo || [],
    };
  }

  /**
   * Loads assigned contacts from the contact service based on the task.
   */
  private loadAssignedContacts() {
    if (this.task?.assignedTo?.length) {
      this.assignedContacts = this.contactService.contactList.filter((c) =>
        (this.task?.assignedTo || []).includes(c.name),
      );
    } else {
      this.assignedContacts = [];
    }
  }

  /**
   * Updates the list of assigned contacts when changed.
   * @param selectedContacts Array of selected contacts
   */
  onContactsChange(selectedContacts: Contacts[]) {
    this.editedTask.assignedTo = selectedContacts.map((c) => c.name);
    this.assignedContacts = [...selectedContacts];
  }

  /**
   * Gets the color associated with a contact.
   * @param contact Contact object
   * @returns Color string
   */
  getContactColor(contact: Contacts): string {
    return this.contactService.getContactColor(contact);
  }

  /**
   * Returns the initials for a contact name.
   * @param name Contact name
   * @returns Initials (2 letters)
   */
  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Starts editing a subtask.
   * @param index Index of the subtask
   */
  startSubtaskEdit(index: number) {
    this.editingSubtaskIndex = index;
    this.subtaskBackup = this.editedTask.subtasks[index]?.title || '';
  }

  /**
   * Saves changes to a subtask.
   * @param index Index of the subtask
   */
  saveSubtaskEdit(index: number) {
    const title = this.editedTask.subtasks[index]?.title?.trim();
    if (!title) this.removeSubtask(index);
    this.editingSubtaskIndex = null;
    this.subtaskBackup = null;
  }

  /**
   * Cancels editing a subtask and restores its previous title.
   */
  cancelSubtaskEdit() {
    if (this.editingSubtaskIndex !== null && this.subtaskBackup !== null) {
      this.editedTask.subtasks[this.editingSubtaskIndex].title = this.subtaskBackup;
      this.editingSubtaskIndex = null;
      this.subtaskBackup = null;
    }
  }

  /**
   * Handles keyboard events for subtasks (Enter/Escape).
   * @param event Keyboard event
   * @param index Index of the subtask
   */
  handleSubtaskKey(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter') this.saveSubtaskEdit(index);
    if (event.key === 'Escape') this.cancelSubtaskEdit();
  }

  /**
   * Adds a new subtask to the task.
   */
  addSubtask() {
    if (!this.newSubtaskTitle.trim()) return;
    this.editedTask.subtasks.push({ title: this.newSubtaskTitle.trim(), completed: false });
    this.newSubtaskTitle = '';
  }

  /**
   * Removes a subtask from the task.
   * @param index Index of the subtask to remove
   */
  removeSubtask(index: number) {
    this.editedTask.subtasks.splice(index, 1);
    if (this.editingSubtaskIndex === index) {
      this.editingSubtaskIndex = null;
      this.subtaskBackup = null;
    }
  }

  /**
   * Toggles completion status of a subtask.
   * @param subtask Subtask object
   */
  toggleSubtask(subtask: Subtask) {
    subtask.completed = !subtask.completed;
    this.updateSubtasksInTask();
  }

  /**
   * Updates the subtasks in the backend task.
   */
  private updateSubtasksInTask() {
    if (!this.task?.id) return;
    this.taskService
      .updateTask(this.task.id, { subtasks: this.editedTask.subtasks })
      .catch(console.error);
  }

  /**
   * Enables edit mode for the task.
   */
  enableEdit() {
    if (!this.task) return;
    this.editedTask = this.extractEditableTask(this.task);
    this.isEditMode = true;
    this.refreshViewer('edit');
  }

  /**
   * Cancels edit mode without saving changes.
   */
  cancelEdit() {
    this.isEditMode = false;
  }

  /**
   * Checks if the task form is valid.
   * @returns Boolean indicating form validity
   */
  private isFormValid(): boolean {
    return !!(this.editedTask.title?.trim() && this.editedTask.dueDate);
  }

  /**
   * Saves the task if the form is valid.
   */
  onSave() {
    if (!this.isFormValid()) return;

    this.isSaving = true;
    if (this.task) Object.assign(this.task, this.editedTask);
    this.save.emit(this.editedTask);
    this.isEditMode = false;
    this.resetSavingFlag();
  }

  /**
   * Resets the saving flag after a short delay.
   */
  private resetSavingFlag() {
    setTimeout(() => (this.isSaving = false), 500);
  }

  /**
   * Deletes the task.
   */
  onDelete() {
    if (!this.task?.id) return;
    this.delete.emit(this.task.id);
    this.onClose();
  }

  /**
   * Closes the overlay.
   */
  onClose() {
    this.close.emit();
  }

  /**
   * Formats a date string for HTML input elements.
   * @param date Date string
   * @returns Formatted date string (YYYY-MM-DD)
   */
  formatDateForInput(date: string): string {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Returns a safe task object with default values for missing fields.
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
   * Checks if the selected due date is in the past.
   * @returns Boolean indicating whether date is past
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
   * Returns the color associated with the task category.
   */
  get categoryColor(): string {
    return this.safeTask.category === 'Technical Task' ? '#1FD7C1' : '#0038FF';
  }

  /**
   * TrackBy function for contacts in ngFor.
   */
  trackByContactId(index: number, contact: Contacts) {
    return contact.id;
  }

  /**
   * TrackBy function for subtasks in ngFor.
   */
  trackBySubtask(index: number, subtask: Subtask) {
    return index;
  }

  /**
   * Handles clicks outside the overlay to close it.
   * @param event MouseEvent object
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
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
