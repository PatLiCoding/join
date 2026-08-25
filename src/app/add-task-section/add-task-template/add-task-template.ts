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
import { TaskService } from '../../firebase-service/task.service';
import { ContactService } from '../../firebase-service/contact-service';
import { Contacts } from '../../interfaces/contacts';
import { Task, Subtask } from '../../interfaces/task';
import { AssignedToSelectComponent } from '../../shared/assigned-to-select/assigned-to-select';

import { collectionData } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

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
  @Input() column: Task['status'] = 'todo';
  @Input() isDialogMode = false;
  @Output() closeDialog = new EventEmitter<void>();

  private injector = inject(Injector);

  title = '';
  description = '';
  dueDate = '';
  dueDateInvalid = false;
  titleInvalid = false;
  priority: 'urgent' | 'medium' | 'low' = 'medium';
  category = '';
  categoryInvalid = false;
  subtasks: Subtask[] = [];
  newSubtask = '';
  editingSubtaskIndex: number | null = null;
  editingSubtaskTitle = '';
  taskSavedMessage = false;

  assignedToContacts: Contacts[] = [];
  allContacts: Contacts[] = [];
  today: string;
  isCategoryDropdownOpen = false;

  /**
   * Creates an instance of AddTaskTemplate.
   * @param taskService Service used to create tasks in Firestore.
   * @param contactService Service used to access the list of contacts.
   */
  constructor(
    private taskService: TaskService,
    public contactService: ContactService,
  ) {
    this.today = new Date().toISOString().split('T')[0];
  }

  /**
   * Initializes the component and loads all contacts from the service.
   */
  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      collectionData(this.contactService.getContactsRef(), { idField: 'id' })
        .pipe(
          map((contacts: any[]) =>
            contacts.map(
              (c) =>
                ({
                  id: c.id?.toString(),
                  name: c.name || '',
                  email: c.email || '',
                  phone: c.phone || '',
                  selected: false,
                }) as Contacts,
            ),
          ),
        )
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

    if (this.isDialogMode) this.closeDialog.emit();
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

    const task: Omit<Task, 'createdAt'> = {
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      priority: this.priority,
      assignedTo: this.assignedToContacts.map((c) => c.name),
      category: this.category,
      subtasks: this.subtasks,
      status: this.column,
      position: 0,
    };

    try {
      await this.taskService.createTask(task);
      this.handleTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
    }
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
