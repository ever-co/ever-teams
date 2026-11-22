import { useCallback, useRef, useState } from 'react';

/**
 * Runs one save at a time: a save asked while another is pending does not run and answers undefined. `isSaving` lets
 * the screen show its controls waiting meanwhile.
 */
export function useOneSaveAtATime() {
	const isPending = useRef(false);
	const [isSaving, setSaving] = useState(false);

	const runAlone = useCallback(async <T>(save: () => Promise<T>): Promise<T | undefined> => {
		if (isPending.current) {
			return undefined;
		}
		isPending.current = true;
		setSaving(true);
		try {
			return await save();
		} finally {
			isPending.current = false;
			setSaving(false);
		}
	}, []);

	return { isSaving, runAlone };
}
