// Loads the emergency contacts and offers add / update / remove. The list is reloaded after each change
// so the "primary" marker always matches the server.
import { useCallback, useEffect, useState } from 'react';
import { addContact, deleteContact, getContacts, updateContact } from '../services/api';

export default function useContacts(patientId) {
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const load = useCallback(() => {
    setStatus('loading');
    getContacts(patientId).then((list) => { setContacts(list); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [patientId]);
  useEffect(load, [load]);

  // Each action returns a promise; the screen shows the error if it fails.
  const refresh = (promise) => promise.then(() => getContacts(patientId)).then(setContacts);
  return {
    contacts, status, load,
    add: (c) => refresh(addContact(patientId, c)),
    update: (id, c) => refresh(updateContact(patientId, id, c)),
    remove: (id) => refresh(deleteContact(patientId, id)),
  };
}
