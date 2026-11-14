import { useSyncExternalStore } from 'react';
import { isPresenting, subscribePresenting } from '../services/presentation.js';

/** True while presentation mode is on. */
export const usePresenting = () => useSyncExternalStore(subscribePresenting, isPresenting);
