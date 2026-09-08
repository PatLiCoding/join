import { Component, OnInit, signal } from '@angular/core';
import { TaskService } from '../firebase-service/task.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Task } from '../interfaces/task';
import { Taskcard } from './taskcard/taskcard';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragMove,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskOverlay } from './task-overlay/task-overlay';
import { AddTaskDialog } from '../add-task-section/add-task-dialog/add-task-dialog';
type ColumnKey = 'todo' | 'inProgress' | 'awaitFeedback' | 'done';

/**
 * BoardSection Component
 *
 * Manages the Kanban board including drag & drop,
 * task creation, editing, deletion and filtering.
 * Tasks are loaded from Firebase via TaskService
 * and grouped by status for display.
 */
@Component({
  selector: 'app-board-section',
  imports: [
    FormsModule,
    CommonModule,
    Taskcard,
    AddTaskDialog,
    CdkDrag,
    CdkDragPreview,
    CdkDropList,
    TaskOverlay,
  ],
  templateUrl: './board-section.html',
  styleUrl: './board-section.scss',
})
export class BoardSection implements OnInit {
  hoveredIcon: string | null = null;
  searchTerm = '';
  showTaskOverlay = false;
  isAddTaskDialogOpen = false;
  selectedTask: (Task & { id: string }) | null = null;
  addTaskDialogColumn: Task['status'] = 'todo';
  connectedLists: ColumnKey[] = ['todo', 'inProgress', 'awaitFeedback', 'done'];
  tasks = signal<Record<ColumnKey, (Task & { id: string })[]>>({
    todo: [],
    inProgress: [],
    awaitFeedback: [],
    done: [],
  });
  allTasks: Record<ColumnKey, (Task & { id: string })[]> = {
    todo: [],
    inProgress: [],
    awaitFeedback: [],
    done: [],
  };
  showAddTask: Record<ColumnKey, boolean> = {
    todo: false,
    inProgress: false,
    awaitFeedback: false,
    done: false,
  };
  columnToStatus: Record<ColumnKey, Task['status']> = {
    todo: 'todo',
    inProgress: 'in-progress',
    awaitFeedback: 'await-feedback',
    done: 'done',
  };
  lastPointerX = 0;
  private statusToColumn: Record<string, ColumnKey> = {
    todo: 'todo',
    'in-progress': 'inProgress',
    'await-feedback': 'awaitFeedback',
    done: 'done',
  };

  constructor(
    private taskService: TaskService,
    private router: Router,
  ) {}

  /**
   * Loads all tasks on component initialization,
   * groups them by status and stores them in the signal state.
   */
  ngOnInit(): void {
    this.taskService.getTasks().subscribe((allTasks) => {
      const grouped = this.groupTasksByStatus(allTasks);
      this.allTasks = grouped;
      this.applyFilters();
    });
  }

  /**
   * Applies the currently selected status filter and search term to the task list.
   *
   * This method retrieves the active status filter from the TaskService
   * and filters the `allTasks` collection accordingly. If a specific status
   * (e.g., 'todo', 'in-progress', 'await-feedback', 'done') is selected,
   * only the corresponding task array is kept while the others are cleared.
   *
   * After adjusting the filtered task structure, it calls `filterTasks()`
   * to apply additional filtering logic (e.g., search term filtering).
   *
   * @private
   * @returns {void}
   */
  private applyFilters() {
    const statusFilter = this.taskService.getStatusFilter();
    const term = this.searchTerm.toLowerCase();
    let filtered = this.allTasks;
    if (statusFilter !== 'all') {
      filtered = {
        todo: statusFilter === 'todo' ? this.allTasks.todo : [],
        inProgress: statusFilter === 'in-progress' ? this.allTasks.inProgress : [],
        awaitFeedback: statusFilter === 'await-feedback' ? this.allTasks.awaitFeedback : [],
        done: statusFilter === 'done' ? this.allTasks.done : [],
      };
    }
    this.filterTasks();
  }

  /**
   * Filters all tasks based on the current search term
   * and updates the signal state.
   */
  filterTasks() {
    const term = this.searchTerm.toLowerCase();
    const filtered: Record<ColumnKey, (Task & { id: string })[]> = {
      todo: this.allTasks.todo.filter((t) => this.matchesSearchTerm(t, term)),
      inProgress: this.allTasks.inProgress.filter((t) => this.matchesSearchTerm(t, term)),
      awaitFeedback: this.allTasks.awaitFeedback.filter((t) => this.matchesSearchTerm(t, term)),
      done: this.allTasks.done.filter((t) => this.matchesSearchTerm(t, term)),
    };
    this.tasks.set(filtered);
  }

  /**
   * Opens the task overlay for the selected task.
   * @param task The selected task including its ID
   */
  openTaskOverlay(task: Task & { id: string }) {
    this.selectedTask = task;
    this.showTaskOverlay = true;
  }

  /**
   * Closes the task overlay and clears the selected task.
   */
  closeTaskOverlay() {
    this.showTaskOverlay = false;
    this.selectedTask = null;
    this.applyFilters();
  }

  /**
   * Updates an existing task in the database.
   * @param updatedTask Updated task data (without id and createdAt)
   * @returns Promise<void>
   */
  async saveTask(updatedTask: Omit<Task, 'id' | 'createdAt'>) {
    if (this.selectedTask?.id) {
      try {
        await this.taskService.updateTask(this.selectedTask.id, updatedTask);
      } catch (error) {
        console.error(' Error updating task:', error);
      }
    }
  }

  /**
   * Deletes a task by its ID.
   * @param taskId The ID of the task to delete
   * @returns Promise<void>
   */
  async deleteTask(taskId: string) {
    try {
      await this.taskService.deleteTask(taskId);
      this.closeTaskOverlay();
    } catch (error) {
      console.error(' Error deleting task:', error);
    }
  }

  /**
   * Opens the add-task dialog for a specific column.
   * @param column The target column
   */
  openAddTaskDialog(column: ColumnKey) {
    this.isAddTaskDialogOpen = true;
    this.addTaskDialogColumn = this.columnToStatus[column];
  }

  /**
   * Closes the add-task dialog.
   */
  closeAddTaskDialog() {
    this.isAddTaskDialogOpen = false;
  }

  /**
   * Triggered when a task is dropped.
   * Handles reordering or moving between columns,
   * updates positions and persists changes.
   * @param event Angular CDK drag & drop event
   */
  drop(event: CdkDragDrop<(Task & { id: string })[]>) {
    const current = this.tasks();
    if (this.isSameContainer(event)) {
      this.reorderWithinColumn(event);
    } else {
      this.moveBetweenColumns(event);
    }
    const updatedTasks = this.collectAffectedTasks(event);
    this.updatePositions(updatedTasks);
    this.persistTasks(updatedTasks);
    this.tasks.set({ ...current });
  }

  /**
   * Checks whether the task was moved within the same container.
   * @param event DragDrop event
   * @returns True if the source and target containers are the same
   */
  private isSameContainer(event: CdkDragDrop<any>): boolean {
    return event.previousContainer === event.container;
  }

  /**
   * Reorders tasks within the same column.
   * @param event DragDrop event
   */
  private reorderWithinColumn(event: CdkDragDrop<any>) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }

  /**
   * Moves a task between two columns
   * and updates its status.
   * @param event DragDrop event
   */
  private moveBetweenColumns(event: CdkDragDrop<any>) {
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    const movedTask = event.container.data[event.currentIndex];
    movedTask.status = this.columnToStatus[event.container.id as ColumnKey];
  }

  /**
   * Collects all affected tasks after a drag operation.
   * @param event DragDrop event
   * @returns Array of affected tasks
   */
  private collectAffectedTasks(event: CdkDragDrop<any>) {
    return [...event.previousContainer.data, ...event.container.data];
  }

  /**
   * Updates the position property of the given tasks.
   * @param tasks List of tasks to update
   */
  private updatePositions(tasks: (Task & { id: string })[]) {
    tasks.forEach((task, index) => {
      task.position = index;
    });
  }

  /**
   * Persists position and status updates to the database.
   * @param tasks List of tasks to persist
   */
  private persistTasks(tasks: (Task & { id: string })[]) {
    tasks.forEach((task) => {
      this.taskService.updateTask(task.id, {
        position: task.position,
        status: task.status,
      });
    });
  }

  /**
   * Applies a small rotation effect while dragging,
   * based on horizontal pointer movement.
   * @param event CdkDragMove event
   */
  onDragMove(event: CdkDragMove) {
    const currentX = event.pointerPosition.x;
    if (this.lastPointerX === 0) {
      this.lastPointerX = currentX;
      return;
    }
    const deltaX = currentX - this.lastPointerX;
    const rotation = Math.max(-8, Math.min(8, deltaX * 0.5));
    const rotationEl = document.querySelector('.cdk-drag-preview .rotation-wrapper') as HTMLElement;
    rotationEl?.style.setProperty('transform', `rotate(${rotation}deg)`);
    this.lastPointerX = currentX;
  }

  /**
   * Toggles the visibility of the add-task section
   * for a specific column.
   * @param column Target column
   */
  toggleAddTask(column: ColumnKey) {
    this.showAddTask[column] = !this.showAddTask[column];
  }

  /**
   * Wrapper method for toggling the add-task form.
   * @param column Target column
   */
  addTaskToColumn(column: ColumnKey) {
    this.toggleAddTask(column);
  }

  /**
   * Creates a new task from form data
   * and stores it in the selected column.
   * @param column Target column
   * @param formData Partial task data from the form
   * @returns Promise<void>
   */
  async createTaskFromForm(column: ColumnKey, formData: Partial<Task>) {
    const newTask: Omit<Task, 'createdAt'> = {
      title: formData.title || 'Neue Aufgabe',
      description: formData.description || '',
      dueDate: formData.dueDate || new Date().toISOString(),
      priority: formData.priority || 'medium',
      category: formData.category || 'User Story',
      subtasks: formData.subtasks || [],
      status: this.columnToStatus[column],
      position: this.tasks()[column].length,
    };
    await this.taskService.createTask(newTask);
    this.showAddTask[column] = false;
  }

  /**
   * TrackBy function for ngFor to improve rendering performance.
   * @param _index Array index
   * @param task Task object
   * @returns Task ID
   */
  trackById(_index: number, task: Task & { id: string }) {
    return task.id;
  }

  /**
   * Groups tasks by their status and sorts them by position.
   * @param tasks All loaded tasks
   * @returns Object containing tasks grouped by column
   */
  private groupTasksByStatus(
    tasks: (Task & { id: string })[],
  ): Record<ColumnKey, (Task & { id: string })[]> {
    const grouped: Record<ColumnKey, (Task & { id: string })[]> = {
      todo: [],
      inProgress: [],
      awaitFeedback: [],
      done: [],
    };
    tasks.forEach((task) => {
      const key = this.statusToColumn[task.status] ?? 'todo';
      grouped[key].push(task);
    });
    Object.values(grouped).forEach((list) => list.sort((a, b) => a.position - b.position));
    return grouped;
  }

  /**
   * Checks whether a task matches the given search term.
   * @param task Task object
   * @param term Search term (already lowercase)
   * @returns True if the task matches the search term
   */
  private matchesSearchTerm(task: Task, term: string): boolean {
    return (
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      false
    );
  }
}
