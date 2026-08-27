import {
  Component,
  HostListener,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnInit,
  Injector,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../firebase-service/task.service';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { Task, Subtask } from '../../interfaces/task';
import { AssignedToSelectComponent } from '../../shared/assigned-to-select/assigned-to-select';
import Viewer from 'viewerjs';
import { ImageCompressionService } from '../../firebase-service/image-compression.service';
import { Attachment } from '../../interfaces/task';

import { collectionData } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { mapToContact } from './add-task-form.helpers';

/**
 * Component for creating a new task, including title, description, due date,
 * priority, category, assigned contacts, and subtasks.
 * Can be used inline or as a dialog (see isDialogMode).
 */
@Component({
  selector: 'app-add-task-template',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignedToSelectComponent],
  templateUrl: './add-task-template.html',
  styleUrls: ['./add-task-template.scss'],
})
export class AddTaskTemplate implements OnInit {
  /** Status column the new task is created in (e.g. 'todo'). */
  @Input() column: Task['status'] = 'todo';
  /** Whether this component is rendered inside a modal dialog. */
  @Input() isDialogMode = false;
  /** Emitted when the dialog should be closed (only relevant in dialog mode). */
  @Output() closeDialog = new EventEmitter<void>();

  /** Injector used to run Firestore calls inside a valid injection context. */
  private injector = inject(Injector);

  /** Title entered by the user. */
  title = '';
  /** Optional description entered by the user. */
  description = '';
  /** Due date in ISO format (YYYY-MM-DD). */
  dueDate = '';
  /** Whether the due date currently fails validation. */
  dueDateInvalid = false;
  /** Whether the title currently fails validation. */
  titleInvalid = false;
  /** Selected task priority. */
  priority: 'urgent' | 'medium' | 'low' = 'medium';
  /** Selected task category. */
  category = '';
  /** Whether the category currently fails validation. */
  categoryInvalid = false;
  /** Subtasks added to the new task. */
  subtasks: Subtask[] = [];
  /** Text currently typed into the "new subtask" input. */
  newSubtask = '';
  /** Index of the subtask currently being edited, or null if none. */
  editingSubtaskIndex: number | null = null;
  /** Working copy of the title of the subtask currently being edited. */
  editingSubtaskTitle = '';
  /** Whether the "task saved" confirmation message is currently shown. */
  taskSavedMessage = false;

  /** Contacts currently assigned to the new task. */
  assignedToContacts: Contacts[] = [];
  /** All contacts available for assignment. */
  allContacts: Contacts[] = [];
  /** Today's date in ISO format, used as the minimum selectable due date. */
  today: string;
  /** Whether the category dropdown is currently open. */
  isCategoryDropdownOpen = false;

  /** Attachments added to the new task, stored as base64. */
  attachments: Attachment[] = [];
  /** Current file-upload validation/processing error message, if any. */
  fileError = '';

  /** Reference to the attachment thumbnail gallery, used to (re-)init Viewer.js. */
  @ViewChild('gallery') galleryRef?: ElementRef<HTMLDivElement>;
  /** Active Viewer.js instance for previewing attachments, if any. */
  private viewerInstance: Viewer | null = null;

  /**
   * Creates an instance of AddTaskTemplate.
   * @param taskService Service used to create tasks in Firestore.
   * @param contactService Service used to access the list of contacts.
   */
  constructor(
    private taskService: TaskService,
    public contactService: ContactService,
    private imageCompression: ImageCompressionService,
  ) {
    this.today = new Date().toISOString().split('T')[0];
  }

  /**
   * Handles the file-input change event and processes every selected file.
   * @param event The change event from the file input.
   */
  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.fileError = '';

    for (const file of Array.from(input.files)) {
      await this.processFile(file);
    }
    input.value = '';
    this.refreshViewer();
  }

  /**
   * Validates and compresses a single file, then adds it as an attachment.
   * Sets fileError if the file is rejected or cannot be processed.
   * @param file The file to process.
   */
  private async processFile(file: File) {
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
      this.attachments.push({ filename: file.name, fileType: file.type, base64 });
    } catch {
      this.fileError = 'The file could not be processed.';
    }
  }

  /**
   * Removes an attachment at the given index and refreshes the viewer.
   * @param index The index of the attachment to remove.
   */
  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
    this.refreshViewer();
  }

  /**
   * (Re-)initializes Viewer.js after the attachment gallery has changed.
   * The setTimeout defers execution until Angular has updated the DOM.
   */
  private refreshViewer() {
    setTimeout(() => {
      this.viewerInstance?.destroy();
      if (this.galleryRef?.nativeElement) {
        this.viewerInstance = new Viewer(this.galleryRef.nativeElement, {
          inline: false,
          toolbar: true,
          navbar: this.attachments.length > 1,
        });
      }
    });
  }

  /**
   * Lifecycle hook called when the component is destroyed.
   * Destroys the Viewer.js instance to avoid leaking DOM nodes/listeners.
   */
  ngOnDestroy() {
    this.viewerInstance?.destroy();
  }

  /**
   * Initializes the component and loads all contacts from the service.
   */
  ngOnInit(): void {
    this.loadContacts();
  }

  /**
   * Subscribes to the contacts collection and keeps allContacts in sync.
   * Runs inside the injection context, as required by collectionData().
   */
  private loadContacts(): void {
    runInInjectionContext(this.injector, () => {
      collectionData(this.contactService.getContactsRef(), { idField: 'id' })
        .pipe(map((contacts: any[]) => contacts.map(mapToContact)))
        .subscribe((contacts: Contacts[]) => {
          this.allContacts = contacts;
        });
    });
  }

  /**
   * Sets the priority of the task.
   * @param value The priority value ('urgent', 'medium', or 'low').
   */
  setPriority(value: 'urgent' | 'medium' | 'low') {
    this.priority = value;
  }

  /**
   * Toggles the category dropdown open or closed.
   * @param event Optional event to stop propagation.
   */
  toggleCategoryDropdown(event?: Event) {
    if (event) event.stopPropagation();
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (!this.isCategoryDropdownOpen) this.validateCategory();
  }

  /**
   * Selects a category and closes the dropdown.
   * @param value The selected category value.
   * @param event The click event to stop propagation.
   */
  selectCategory(value: string, event: Event) {
    event.stopPropagation();
    this.category = value;
    this.isCategoryDropdownOpen = false;
    this.categoryInvalid = false;
  }

  /**
   * Adds a new subtask to the subtasks array if not empty.
   */
  addSubtask() {
    if (this.newSubtask.trim()) {
      this.subtasks.push({ title: this.newSubtask.trim(), completed: false });
      this.newSubtask = '';
    }
  }

  /**
   * Removes a subtask at the given index and updates editing state if necessary.
   * @param index The index of the subtask to remove.
   */
  removeSubtask(index: number) {
    this.subtasks.splice(index, 1);
    if (this.editingSubtaskIndex !== null) {
      if (this.editingSubtaskIndex === index) {
        this.editingSubtaskIndex = null;
        this.editingSubtaskTitle = '';
      } else if (this.editingSubtaskIndex > index) {
        this.editingSubtaskIndex--;
      }
    }
  }

  /**
   * Starts editing a subtask at the given index.
   * @param index The index of the subtask to edit.
   * @param title The current title of the subtask.
   */
  startEditSubtask(index: number, title: string) {
    this.editingSubtaskIndex = index;
    this.editingSubtaskTitle = title;
  }

  /**
   * Saves the edited subtask title or removes the subtask if the title is empty.
   * @param index The index of the subtask being edited.
   */
  saveSubtaskEdit(index: number) {
    if (this.editingSubtaskIndex !== index) return;
    const trimmedTitle = this.editingSubtaskTitle.trim();
    if (!trimmedTitle) {
      this.removeSubtask(index);
      return;
    }
    this.subtasks[index] = { ...this.subtasks[index], title: trimmedTitle };
    this.editingSubtaskIndex = null;
    this.editingSubtaskTitle = '';
  }

  /**
   * Handles clicks outside certain elements to close dropdowns or stop editing.
   * @param event The mouse event.
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-select')) {
      if (this.isCategoryDropdownOpen) {
        this.isCategoryDropdownOpen = false;
        this.validateCategory();
      }
    }
    if (!target.closest('.subtask-item')) {
      this.editingSubtaskIndex = null;
      this.editingSubtaskTitle = '';
    }
  }

  /**
   * Clears the form fields and resets the component state.
   */
  clearForm() {
    this.resetFormFields();
    this.resetAttachments();
    if (this.isDialogMode) this.closeDialog.emit();
  }

  /**
   * Resets all plain form fields and validation flags to their defaults.
   */
  private resetFormFields() {
    this.title = '';
    this.description = '';
    this.dueDate = '';
    this.priority = 'medium';
    this.category = '';
    this.subtasks = [];
    this.newSubtask = '';
    this.assignedToContacts = [];
    this.allContacts.forEach((c) => ((c as any).selected = false));
    this.titleInvalid = false;
    this.dueDateInvalid = false;
    this.categoryInvalid = false;
    this.editingSubtaskIndex = null;
    this.editingSubtaskTitle = '';
  }

  /**
   * Resets attachments, the file error, and destroys the image viewer.
   */
  private resetAttachments() {
    this.attachments = [];
    this.fileError = '';
    this.viewerInstance?.destroy();
  }

  /**
   * Validates the title field and sets the invalid state.
   */
  validateTitle() {
    const trimmed = this.title ? this.title.trim() : '';
    this.titleInvalid = !trimmed || trimmed.length < 2 || /^\d+$/.test(trimmed);
  }

  /**
   * Validates the due date field and sets the invalid state.
   */
  validateDueDate() {
    const todayIso = new Date().toISOString().split('T')[0];
    this.dueDateInvalid = !this.dueDate || this.dueDate < todayIso;
  }

  /**
   * Validates the category field and sets the invalid state.
   */
  validateCategory() {
    this.categoryInvalid = !this.category || !this.category.trim();
  }

  /**
   * Returns whether the form is valid based on required fields.
   * @returns True if the form is valid, otherwise false.
   */
  get isFormValid(): boolean {
    const todayIso = new Date().toISOString().split('T')[0];
    return !!this.title && !!this.dueDate && this.dueDate >= todayIso && !!this.category?.trim();
  }

  /**
   * Creates a new task if the form is valid and handles errors.
   */
  async createTask() {
    this.validateTitle();
    this.validateCategory();
    if (this.titleInvalid || !this.isFormValid || this.categoryInvalid) return;

    try {
      await this.taskService.createTask(this.buildTaskPayload());
      this.handleTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  /**
   * Builds the task payload from the current form state.
   * @returns The task object ready to be persisted (without createdAt).
   */
  private buildTaskPayload(): Omit<Task, 'createdAt'> {
    return {
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      priority: this.priority,
      assignedTo: this.assignedToContacts.map((c) => c.name),
      category: this.category,
      subtasks: this.subtasks,
      status: this.column,
      position: 0,
      attachments: this.attachments,
    };
  }

  /**
   * Handles UI updates after a task is created.
   */
  private handleTaskCreated() {
    this.clearForm();
    this.taskSavedMessage = true;
    const hideMessage = () => (this.taskSavedMessage = false);
    if (this.isDialogMode)
      setTimeout(() => {
        hideMessage();
        this.closeDialog.emit();
      }, 1000);
    else
      setTimeout(() => {
        hideMessage();
      }, 1000);
  }
}
