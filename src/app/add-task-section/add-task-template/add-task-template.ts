import {
  Component,
  HostListener,
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
import { collectionData } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

import { TaskService } from '../../firebase-service/task.service';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { Task, Subtask, Attachment } from '../../interfaces/task';
import { AssignedToSelectComponent } from '../../shared/assigned-to-select/assigned-to-select';
import { AttachmentsComponent } from '../../shared/attachments/attachments.component';
import {
  mapToContact,
  extractEditableFields,
  filterAssignedContacts,
  formatDateForInput,
} from './add-task-form.helpers';
import { SubtaskComponent } from '../../shared/subtask/subtask.component';

/**
 * Component for creating or editing a task, including title, description, due date,
 * priority, category, assigned contacts, subtasks, and file attachments.
 * Driven by the `mode` input, it is reused both for task creation (inline or as a
 * modal dialog) and for editing an existing task inside the task overlay.
 */
@Component({
  selector: 'app-add-task-template',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AssignedToSelectComponent,
    AttachmentsComponent,
    SubtaskComponent,
  ],
  templateUrl: './add-task-template.html',
  styleUrls: ['./add-task-template.scss'],
})
export class AddTaskTemplate implements OnInit {
  /** Target status column where the new task will be created (e.g., 'todo'). */
  @Input() column: Task['status'] = 'todo';
  /** Indicates whether the component is rendered inside a modal dialog. */
  @Input() isDialogMode = false;
  /** Whether the form creates a new task or edits an existing one. */
  @Input() mode: 'create' | 'edit' = 'create';
  /** Existing task to prefill the form with when `mode` is 'edit'. */
  @Input() taskToEdit: (Task & { id: string }) | null = null;
  /** Emits when the modal dialog should be closed (create/dialog mode only). */
  @Output() closeDialog = new EventEmitter<void>();
  /** Emits the edited task payload for the parent to persist (edit mode only). */
  @Output() taskUpdated = new EventEmitter<Omit<Task, 'createdAt'>>();

  /** Injection context reference used to run Firestore reactive queries. */
  private injector = inject(Injector);

  /** Task title entered by the user. */
  title = '';
  /** Optional task description. */
  description = '';
  /** Due date formatted as YYYY-MM-DD. */
  dueDate = '';
  /** Due date the form was initialized with, used to allow saving unchanged past dates. */
  private originalDueDate = '';
  /** Indicates whether the due date currently fails validation. */
  dueDateInvalid = false;
  /** Indicates whether the title currently fails validation. */
  titleInvalid = false;
  /** Selected priority level ('urgent', 'medium', or 'low'). */
  priority: 'urgent' | 'medium' | 'low' = 'medium';
  /** Selected category for the task. */
  category = '';
  /** Indicates whether the category selection fails validation. */
  categoryInvalid = false;
  /** Array of subtasks added to the task. */
  subtasks: Subtask[] = [];
  /** Input value for creating a new subtask. */
  newSubtask = '';
  /** Index of the subtask currently being edited, or null if none. */
  editingSubtaskIndex: number | null = null;
  /** Temporary title buffer for the subtask currently being edited. */
  editingSubtaskTitle = '';
  /** Indicates whether the "Task saved" toast notification is visible. */
  taskSavedMessage = false;
  /** Array of contacts assigned to the task. */
  assignedToContacts: Contacts[] = [];
  /** Array of all contacts available for assignment. */
  allContacts: Contacts[] = [];
  /** Today's date in YYYY-MM-DD format, used as the minimum selectable date. */
  today: string;
  /** Indicates whether the category dropdown menu is open. */
  isCategoryDropdownOpen = false;
  /** File attachments added to the task. */
  attachments: Attachment[] = [];
  /** Validation or processing error message for attachments. */
  fileError = '';
  /** Original board position of the task being edited, preserved on save. */
  private originalPosition = 0;

  /**
   * Initializes a new instance of the AddTaskTemplate component.
   * @param taskService Service for creating and managing tasks in Firestore.
   * @param contactService Service for loading user contact data.
   */
  constructor(
    private taskService: TaskService,
    public contactService: ContactService,
  ) {
    this.today = new Date().toISOString().split('T')[0];
  }

  /**
   * Indicates whether the form currently operates in edit mode.
   */
  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  /**
   * Angular lifecycle hook called after component initialization.
   * Loads the contact list and, in edit mode, prefills the form.
   */
  ngOnInit(): void {
    this.loadContacts();
    if (this.isEditMode && this.taskToEdit) this.populateFromExistingTask(this.taskToEdit);
  }

  /**
   * Prefills all form fields from an existing task for editing.
   * @param task Task instance to load into the form.
   */
  private populateFromExistingTask(task: Task & { id: string }): void {
    const fields = extractEditableFields(task);
    this.title = fields.title;
    this.description = fields.description;
    this.dueDate = formatDateForInput(fields.dueDate);
    this.originalDueDate = this.dueDate;
    this.priority = fields.priority;
    this.category = fields.category;
    this.subtasks = fields.subtasks;
    this.attachments = fields.attachments;
    this.column = fields.status;
    this.originalPosition = fields.position;
  }

  /**
   * Subscribes to the contacts collection in Firestore and syncs allContacts.
   * Executed within an injection context required by collectionData().
   */
  private loadContacts(): void {
    runInInjectionContext(this.injector, () => {
      collectionData(this.contactService.getContactsRef(), { idField: 'id' })
        .pipe(map((contacts: any[]) => contacts.map(mapToContact)))
        .subscribe((contacts: Contacts[]) => {
          this.allContacts = contacts;
          this.syncAssignedContactsIfEditing();
        });
    });
  }

  /**
   * Matches assigned contact names from the edited task against the loaded contact list.
   */
  private syncAssignedContactsIfEditing(): void {
    if (!this.isEditMode || !this.taskToEdit) return;
    this.assignedToContacts = filterAssignedContacts(
      this.allContacts,
      this.taskToEdit.assignedTo || [],
    );
  }

  /**
   * Updates the priority of the task.
   * @param value Priority level ('urgent', 'medium', or 'low').
   */
  setPriority(value: 'urgent' | 'medium' | 'low'): void {
    this.priority = value;
  }

  /**
   * Toggles the category selection dropdown menu open or closed.
   * @param event Optional DOM click event to prevent event bubbling.
   */
  toggleCategoryDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (!this.isCategoryDropdownOpen) this.validateCategory();
  }

  /**
   * Selects a task category and closes the dropdown menu.
   * @param value Selected category name.
   * @param event DOM click event to prevent event bubbling.
   */
  selectCategory(value: string, event: Event): void {
    event.stopPropagation();
    this.category = value;
    this.isCategoryDropdownOpen = false;
    this.categoryInvalid = false;
  }

  /**
   * Closes dropdowns or subtask edit modes when clicking outside designated container elements.
   * @param event Mouse click event listener object.
   */
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
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
   * Resets all form fields and validation indicators to initial values (create mode).
   */
  clearForm(): void {
    this.resetFormFields();
    this.resetAttachments();
    if (this.isDialogMode) this.closeDialog.emit();
  }

  /**
   * Resets all main input field states to their defaults.
   */
  private resetFormFields(): void {
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
   * Clears attachments and attachment-related error messages.
   */
  private resetAttachments(): void {
    this.attachments = [];
    this.fileError = '';
  }

  /**
   * Validates the task title field.
   */
  validateTitle(): void {
    const trimmed = this.title ? this.title.trim() : '';
    this.titleInvalid = !trimmed || trimmed.length < 2 || /^\d+$/.test(trimmed);
  }

  /**
   * Validates the task due date. An unchanged date is always accepted (relevant when
   * editing a task whose original due date already lies in the past); a changed date
   * must not lie before today.
   */
  validateDueDate(): void {
    const todayIso = new Date().toISOString().split('T')[0];
    const changed = this.dueDate !== this.originalDueDate;
    this.dueDateInvalid = !this.dueDate || (changed && this.dueDate < todayIso);
  }

  /**
   * Validates the task category selection.
   */
  validateCategory(): void {
    this.categoryInvalid = !this.category || !this.category.trim();
  }

  /**
   * Evaluates overall form validity based on required fields and date constraints.
   * @returns True if all required form inputs are valid; false otherwise.
   */
  get isFormValid(): boolean {
    const todayIso = new Date().toISOString().split('T')[0];
    const dateOk =
      !!this.dueDate && (this.dueDate === this.originalDueDate || this.dueDate >= todayIso);
    return !!this.title && dateOk && !!this.category?.trim();
  }

  /**
   * Submits and creates a new task in Firestore if validation passes (create mode).
   */
  async createTask(): Promise<void> {
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
   * Validates the form and emits the edited task payload for the parent to persist (edit mode).
   */
  saveEdit(): void {
    this.validateTitle();
    this.validateCategory();
    if (this.titleInvalid || !this.isFormValid || this.categoryInvalid) return;
    this.taskUpdated.emit(this.buildTaskPayload());
  }

  /**
   * Constructs the task payload object from current component state.
   * @returns Task object ready for persistence, excluding the createdAt timestamp.
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
      position: this.isEditMode ? this.originalPosition : 0,
      attachments: this.attachments,
    };
  }

  /**
   * Handles post-task creation steps such as showing confirmation toasts and closing dialogs.
   */
  private handleTaskCreated(): void {
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
