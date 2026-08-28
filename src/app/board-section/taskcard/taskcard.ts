/**
 * Taskcard Component
 *
 * Represents a single task card within the board.
 * Displays task details, progress, assigned contacts,
 * and allows status changes via a context menu.
 */
import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Task } from '../../interfaces/task';
import { ContactService } from '../../firebase-service/contact-service';
import { CommonModule, SlicePipe } from '@angular/common';
import { TaskService } from '../../firebase-service/task.service';
import { BurgermenuStateService } from '../../firebase-service/burgermenu-state.service';

/**
 * Taskcard Component
 *
 * Represents a single task card within the board.
 * Displays task details, progress, assigned contacts,
 * and allows status changes via a context menu.
 */
@Component({
  selector: 'app-taskcard',
  standalone: true,
  imports: [SlicePipe, CommonModule],
  templateUrl: './taskcard.html',
  styleUrls: ['./taskcard.scss'],
})
export class Taskcard {
  /** Task entity displayed on this card. */
  @Input() task!: Task;
  /** Emitted when the task card is clicked to view details. */
  @Output() openTask = new EventEmitter<Task>();
  /** Injected service for contact metadata. */
  contactService = inject(ContactService);
  /** Injected task service for status management. */
  private taskService = inject(TaskService);
  /** Injected state service for menu popovers. */
  private menuState = inject(BurgermenuStateService);
  /** Reference to component's host element. */
  private elementRef = inject(ElementRef);

  /** Standard sequential ordering of status states. */
  statusOrder: Task['status'][] = ['todo', 'in-progress', 'await-feedback', 'done'];

  /**
   * Emits the selected task when the card is clicked.
   */
  onCardClick() {
    this.openTask.emit(this.task);
  }

  /**
   * Returns the completion progress percentage of subtasks.
   *
   * @param task Optional task (defaults to component task)
   * @returns Progress percentage (0–100)
   */
  getSubtaskProgress(task?: Task): number {
    const t = task || this.task;
    if (!t) return 0;
    return this.calculateProgress(t as Task & { id: string });
  }

  /**
   * Returns the number of completed subtasks.
   *
   * @param task Optional task (defaults to component task)
   * @returns Number of completed subtasks
   */
  getCompletedCount(task?: Task): number {
    const t = task || this.task;
    return t?.subtasks?.filter((st) => st.completed).length || 0;
  }

  /**
   * Calculates the progress percentage of a task's subtasks.
   *
   * @param task Task including its ID
   * @returns Progress percentage (0–100)
   */
  private calculateProgress(task: Task & { id: string }): number {
    if (!task.subtasks?.length) return 0;
    const completed = task.subtasks.filter((st) => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  }

  /**
   * Generates initials from a full name.
   *
   * @param name Full name string
   * @returns Uppercase initials
   */
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ');
    const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
    return initials.toUpperCase();
  }

  /**
   * Retrieves a contact by name from the contact service.
   *
   * @param name Contact name
   * @returns Matching contact object or undefined
   */
  getContactByName(name: string) {
    return this.contactService.contactList.find((c) => c.name === name);
  }

  /**
   * Truncates the task title if it exceeds 25 characters.
   *
   * @param title Optional title string
   * @returns Truncated title with ellipsis if necessary
   */
  getDisplayTitle(title?: string): string {
    return title && title.length >= 25 ? title.slice(0, 25) + '…' : (title ?? '');
  }

  /**
   * Truncates the task description if it exceeds 50 characters.
   *
   * @param description Optional description string
   * @returns Truncated description with ellipsis if necessary
   */
  getDisplayDescription(description?: string): string {
    return description && description.length >= 50
      ? description.slice(0, 50) + '…'
      : (description ?? '');
  }

  /**
   * Toggles the visibility of the task menu.
   */
  toggleMenu() {
    if (!this.task?.id) return;
    if (this.menuState.isOpen(this.task.id)) {
      this.menuState.close();
    } else {
      this.menuState.open(this.task.id);
    }
  }

  /**
   * Checks if the menu is open for this task.
   */
  isMenuOpen(): boolean {
    return this.task?.id ? this.menuState.isOpen(this.task.id) : false;
  }

  /**
   * Closes the menu when clicking outside the component.
   *
   * @param event Mouse click event
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuState.close();
    }
  }

  /**
   * Moves the task status up or down in the predefined status order.
   *
   * @param direction Direction to move ('up' or 'down')
   */
  async moveStatus(direction: 'up' | 'down') {
    if (!this.task?.id) return;
    const currentIndex = this.statusOrder.indexOf(this.task.status);
    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) newIndex = currentIndex - 1;
    if (direction === 'down' && currentIndex < this.statusOrder.length - 1)
      newIndex = currentIndex + 1;
    const newStatus = this.statusOrder[newIndex];
    if (newStatus !== this.task.status) {
      await this.taskService.updateTaskStatus(this.task.id, newStatus);
    }
  }
  get movesForTemplate() {
    return this.task ? this.getAvailableMoves() : [];
  }

  /**
   * Returns available statuses for this task based on current status.
   */
  getAvailableStatuses(): Task['status'][] {
    const currentIndex = this.statusOrder.indexOf(this.task.status);
    const available: Task['status'][] = [];
    if (currentIndex > 0) available.push(this.statusOrder[currentIndex - 1]);
    if (currentIndex < this.statusOrder.length - 1)
      available.push(this.statusOrder[currentIndex + 1]);
    return available;
  }

  /**
   * Moves task to a specific status.
   */
  async moveToStatus(newStatus: Task['status']) {
    if (!this.task?.id) return;
    if (newStatus !== this.task.status) {
      await this.taskService.updateTaskStatus(this.task.id, newStatus);
    }
  }

  /**
   * Returns available moves with direction for menu display.
   */
  getAvailableMoves(): { status: Task['status']; direction: 'up' | 'down' }[] {
    if (!this.task) return [];
    const currentIndex = this.statusOrder.indexOf(this.task.status);
    const moves: { status: Task['status']; direction: 'up' | 'down' }[] = [];
    if (currentIndex > 0) {
      moves.push({ status: this.statusOrder[currentIndex - 1], direction: 'up' });
    }
    if (currentIndex < this.statusOrder.length - 1) {
      moves.push({ status: this.statusOrder[currentIndex + 1], direction: 'down' });
    }
    return moves;
  }

  /**
   * Returns the display label for a status.
   */
  getStatusLabel(status: Task['status']): string {
    const labels: Record<Task['status'], string> = {
      todo: 'To Do',
      'in-progress': 'In Progress',
      'await-feedback': 'Await Feedback',
      done: 'Done',
    };
    return labels[status] ?? status;
  }
}
