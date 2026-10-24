import { atomWithStorage } from 'jotai/utils';

/**
 * Persists the chat panel open/closed state in localStorage.
 * This way, the user's preference survives page refreshes.
 */
export const chatPanelOpenAtom = atomWithStorage<boolean>(
	'chat-panel-open',
	false, // closed by default
	undefined,
	// Read the stored value on the first render: otherwise the panel layout collapses on mount (the atom
	// still says false) and its onCollapse writes false back over the stored true. The shell renders on
	// the client only, so there is no server value to mismatch.
	{ getOnInit: true }
);
