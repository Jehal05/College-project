// The values the person confirmed from their reports (kept on this device). Reads on mount; add/remove update the list.
import { useCallback, useState } from 'react';
import { addLab, loadLabs, removeLab } from '../utils/labs';

export default function useLabValues(patientId) {
  const [labs, setLabs] = useState(() => loadLabs(patientId));
  const add = useCallback((entry) => { const list = addLab(patientId, entry); if (list) setLabs(list); return !!list; }, [patientId]);
  const remove = useCallback((id) => { const list = removeLab(patientId, id); if (list) setLabs(list); return !!list; }, [patientId]);
  return { labs, add, remove };
}
