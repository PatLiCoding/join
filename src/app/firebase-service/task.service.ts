import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  collectionData,
  Timestamp,
  DocumentData,
  CollectionReference,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from '../interfaces/task';

export type GroupedTasks = {
  todo: (Task & { id: string })[];
  inProgress: (Task & { id: string })[];
  awaitFeedback: (Task & { id: string })[];
  done: (Task & { id: string })[];
};

/**
 * Service for managing tasks in Firestore.
 * Provides CRUD operations, filtering, and grouping of tasks by status.
 */
@Injectable({
  providedIn: 'root',
})
export class TaskService {
  /** Firestore collection reference for tasks, created once in the constructor. */
  private tasksCollection: CollectionReference<DocumentData>;

  /**
   * Creates an instance of TaskService.
   * @param firestore The Firestore instance used for database operations.
   * @param injector The Angular Injector, used to safely run Firebase calls within an injection context.
   */
  constructor(
    private firestore: Firestore,
    private injector: Injector,
  ) {
    this.tasksCollection = runInInjectionContext(this.injector, () =>
      collection(this.firestore, 'tasks'),
    );
  }

  /** The currently active status filter for tasks. */
  private currentStatusFilter: Task['status'] | 'all' = 'all';

  /**
   * Sets the current status filter for tasks.
   * @param status The status to filter by ('todo', 'in-progress', 'await-feedback', 'done', or 'all').
   */
  setStatusFilter(status: Task['status'] | 'all') {
    this.currentStatusFilter = status;
  }

  /**
   * Gets the current status filter for tasks.
   * @returns The current status filter.
   */
  getStatusFilter(): Task['status'] | 'all' {
    return this.currentStatusFilter;
  }

  /**
   * Returns all tasks as a realtime observable.
   * @returns Observable of all tasks with their IDs.
   */
  getTasks(): Observable<(Task & { id: string })[]> {
    return runInInjectionContext(this.injector, () =>
      collectionData(this.tasksCollection, { idField: 'id' }),
    ) as Observable<(Task & { id: string })[]>;
  }

  /**
   * Returns tasks filtered by the current status filter as an observable.
   * @returns Observable of filtered tasks.
   */
  getTasksFiltered(): Observable<(Task & { id: string })[]> {
    return this.getTasks().pipe(
      map((tasks) => {
        if (this.currentStatusFilter === 'all') return tasks;
        return tasks.filter((t) => t.status === this.currentStatusFilter);
      }),
    );
  }

  /**
   * Returns tasks grouped by their status as an observable.
   * @returns Observable of grouped tasks.
   */
  getTasksGroupedByStatus(): Observable<GroupedTasks> {
    return this.getTasks().pipe(
      map((tasks) => ({
        todo: tasks.filter((t) => t.status === 'todo'),
        inProgress: tasks.filter((t) => t.status === 'in-progress'),
        awaitFeedback: tasks.filter((t) => t.status === 'await-feedback'),
        done: tasks.filter((t) => t.status === 'done'),
      })),
    );
  }

  /**
   * Creates a new task in Firestore.
   * @param task The task data to create (without createdAt).
   * @returns Promise resolving to the created document reference.
   */
  async createTask(task: Omit<Task, 'createdAt'> & { position: number }) {
    return runInInjectionContext(this.injector, () =>
      addDoc(this.tasksCollection, {
        ...task,
        createdAt: Timestamp.now(),
      }),
    );
  }

  /**
   * Updates a task with new data.
   * @param taskId The ID of the task to update.
   * @param taskData The partial task data to update.
   */
  async updateTaskStatus(taskId: string, status: Task['status']) {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `tasks/${taskId}`);
      await updateDoc(docRef, { status });
    });
  }

  /**
   * Deletes a task from Firestore.
   * @param taskId The ID of the task to delete.
   */
  async updateTask(taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `tasks/${taskId}`);
      await updateDoc(docRef, taskData as DocumentData);
    });
  }

  /**
   * Deletes a task from Firestore.
   * @param taskId The ID of the task to delete.
   */
  async deleteTask(taskId: string) {
    await runInInjectionContext(this.injector, async () => {
      const docRef = doc(this.firestore, `tasks/${taskId}`);
      await deleteDoc(docRef);
    });
  }

  /**
   * Updates the positions of multiple tasks in Firestore.
   * @param tasks Array of tasks with their IDs.
   */
  async updateTasksPositions(tasks: (Task & { id: string })[]) {
    for (let i = 0; i < tasks.length; i++) {
      await this.updateTask(tasks[i].id, { position: i });
    }
  }

  /**
   * Calculates the progress of subtasks as a percentage (0-100).
   * @param task The task to calculate progress for.
   * @returns The progress percentage.
   */
  getSubtaskProgress(task: Task): number {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter((st) => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  }

  /**
   * Returns the number of completed subtasks for a task.
   * @param task The task to count completed subtasks for.
   * @returns The number of completed subtasks.
   */
  getCompletedCount(task: Task): number {
    return task.subtasks?.filter((st) => st.completed).length || 0;
  }
}
