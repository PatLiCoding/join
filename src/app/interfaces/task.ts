import { Timestamp } from '@angular/fire/firestore';

/**
 * Represents a single subtask belonging to a {@link Task}.
 */
export interface Subtask {
  title: string;
  completed: boolean;
}

/**
 * Represents a file attached to a {@link Task}.
 */
export interface Attachment {
  filename: string;
  fileType: string;
  fileSize: number;
  base64: string;
}

/**
 * Represents a task within the board (e.g. a Kanban-style task management app).
 */
export interface Task {
  id?: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'urgent' | 'medium' | 'low';
  assignedTo?: string[];
  category: string;
  subtasks: Subtask[];
  status: 'todo' | 'in-progress' | 'await-feedback' | 'done';
  createdAt: Timestamp;
  position: number;
  attachments?: Attachment[];
}
