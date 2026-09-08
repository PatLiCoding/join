/** Dialog mode: 'open' for creating a contact, 'change' for editing, 'account' for the profile view. */
export type DialogMode = 'open' | 'change' | 'account';

/** Keys of the configurable dialog text dictionary. */
export type DialogTextKey = 'title' | 'subtitle' | 'primaryAction' | 'secondaryAction';

/**
 * Configurable UI text for the contact dialog, indexed by mode and key.
 */
export const DIALOG_TEXT: Record<DialogMode, Record<DialogTextKey, string>> = {
  open: {
    title: 'Add contact',
    subtitle: 'Tasks are better with a team!',
    primaryAction: 'Create Contact',
    secondaryAction: 'Cancel',
  },
  change: {
    title: 'Edit contact',
    subtitle: '',
    primaryAction: 'Save ✓',
    secondaryAction: 'Delete',
  },
  account: {
    title: 'My account',
    subtitle: '',
    primaryAction: 'Edit',
    secondaryAction: 'Delete my account',
  },
};
