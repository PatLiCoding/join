import { Contacts } from '../../interfaces/contacts';

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
