'use client';

import { useCallback, useState } from 'react';

interface OptimisticSetting<T> {
	value: T;
	isPending: boolean;
	change: (next: T) => Promise<void>;
}

export function useOptimisticSetting<T>(stored: T, save: (next: T) => Promise<unknown>): OptimisticSetting<T> {
	const [draft, setDraft] = useState<{ value: T } | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [seenStored, setSeenStored] = useState(stored);

	const storedChanged = !Object.is(seenStored, stored);
	if (storedChanged) {
		setSeenStored(stored);
	}
	const hasSettledDraft = draft !== null && !isPending;
	const storedCaughtUp = hasSettledDraft && Object.is(draft.value, stored);
	const serverMovedOn = hasSettledDraft && storedChanged;
	if (storedCaughtUp || serverMovedOn) {
		setDraft(null);
	}

	const change = useCallback(
		async (next: T) => {
			setDraft({ value: next });
			setIsPending(true);
			try {
				await save(next);
			} catch {
				setDraft(null);
			} finally {
				setIsPending(false);
			}
		},
		[save]
	);

	let value = stored;
	if (draft) {
		value = draft.value;
	}

	return { value, isPending, change };
}
