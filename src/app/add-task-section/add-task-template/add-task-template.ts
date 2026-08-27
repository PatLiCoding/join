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
import { mapToContact } from './add-task-form.helpers';

/**
 * Component for creating a new task, including title, description, due date,
 * priority, category, assigned contacts, subtasks, and file attachments.
 * Can be rendered inline or as a modal dialog.
 */
@Component({
  selector: 'app-add-task-template',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignedToSelectComponent, AttachmentsComponent],
  templateUrl: './add-task-template.html',
  styleUrls: ['./add-task-template.scss'],
})
export class AddTaskTemplate implements OnInit {
  /** Target status column where the new task will be created (e.g., 'todo'). */
  @Input() column: Task['status'] = 'todo';
  /** Indicates whether the component is rendered inside a modal dialog. */
  @Input() isDialogMode = false;
  /** Emits when the modal dialog should be closed (dialog mode only). */
  @Output() closeDialog = new EventEmitter<void>();

  /** Injection context reference used to run Firestore reactive queries. */
  private injector = inject(Injector);

  /** Task title entered by the user. */
  title = '';
  /** Optional task description. */
  description = '';
  /** Due date formatted as YYYY-MM-DD. */
  dueDate = '';
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
  /** File attachments added to the new task. */
  attachments: Attachment[] = [];
  /** Validation or processing error message for attachments. */
  fileError = '';

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
   * Angular lifecycle hook called after component initialization.
   * Loads the contact list.
   */
  ngOnInit(): void {
    this.loadContacts();
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
        });
    });
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
   * Adds a new subtask to the subtasks list if the input text is not empty.
   */
  addSubtask(): void {
    if (this.newSubtask.trim()) {
      this.subtasks.push({ title: this.newSubtask.trim(), completed: false });
      this.newSubtask = '';
    }
  }

  /**
   * Removes a subtask by index and updates editing state accordingly.
   * @param index Zero-based index of the subtask to remove.
   */
  removeSubtask(index: number): void {
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
   * Sets a subtask into inline edit mode.
   * @param index Zero-based index of the subtask to edit.
   * @param title Current title of the subtask.
   */
  startEditSubtask(index: number, title: string): void {
    this.editingSubtaskIndex = index;
    this.editingSubtaskTitle = title;
  }

  /**
   * Saves changes to an edited subtask, or removes it if the updated title is empty.
   * @param index Zero-based index of the subtask being edited.
   */
  saveSubtaskEdit(index: number): void {
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
   * Resets all form fields and validation indicators to initial values.
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
   * Validates the task due date against today's date.
   */
  validateDueDate(): void {
    const todayIso = new Date().toISOString().split('T')[0];
    this.dueDateInvalid = !this.dueDate || this.dueDate < todayIso;
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
    return !!this.title && !!this.dueDate && this.dueDate >= todayIso && !!this.category?.trim();
  }

  /**
   * Submits and creates a new task in Firestore if validation passes.
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
      position: 0,
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
