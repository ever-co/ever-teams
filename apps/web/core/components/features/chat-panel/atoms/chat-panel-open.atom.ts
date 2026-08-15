import { atomWithStorage } from 'jotai/utils';

/**
 * Persists the chat panel open/closed state in localStorage.
 * This way, the user's preference survives page refreshes.
 */
export const chatPanelOpenAtom = atomWithStorage<boolean>(
	'chat-panel-open',
	false // closed by default
);
