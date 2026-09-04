import { Contacts } from '../../interfaces/contacts';
import { Task, Subtask, Attachment } from '../../interfaces/task';

/**
 * Maps a raw Firestore contact document to the Contacts interface.
 * Contains no Angular or 'this' dependencies and can therefore be tested in isolation.
 * @param raw Raw document from the Firestore collection.
 */
export function mapToContact(raw: any): Contacts {
  return {
    id: raw.id?.toString(),
    name: raw.name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    photoUrl: raw.photoUrl || undefined,
    selected: false,
  };
}

/** Subset of task fields editable through the add/edit task form. */
export interface EditableTaskFields {
  title: string;
  description: string;
  dueDate: string;
  priority: 'urgent' | 'medium' | 'low';
  category: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  status: Task['status'];
  position: number;
}

/**
 * Extracts the form-editable fields from an existing task, cloning array
 * properties so the form can mutate them without affecting the original task.
 * @param task Existing task to read editable fields from.
 */
export function extractEditableFields(task: Task & { id: string }): EditableTaskFields {
  return {
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate,
    priority: task.priority,
    category: task.category,
    subtasks: task.subtasks ? [...task.subtasks] : [],
    attachments: task.attachments ? [...task.attachments] : [],
    status: task.status,
    position: task.position,
  };
}

/**
 * Filters a contact list down to the contacts whose name matches one of the
 * assigned contact names on a task.
 * @param contacts Full list of available contacts.
 * @param assignedNames Contact names assigned to the task.
 */
export function filterAssignedContacts(contacts: Contacts[], assignedNames: string[]): Contacts[] {
  return contacts.filter((c) => assignedNames.includes(c.name));
}

/**
 * Formats a raw date string into YYYY-MM-DD for standard HTML date inputs.
 * @param date Date input string.
 * @returns Formatted date string (YYYY-MM-DD) or empty string.
 */
export function formatDateForInput(date: string): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}
