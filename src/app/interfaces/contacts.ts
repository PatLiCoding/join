/**
 * Represents a contact that can be assigned to tasks.
 */
export interface Contacts {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  selected?: boolean;
}
