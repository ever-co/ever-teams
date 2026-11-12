'use client';

import { useCallback, useState } from 'react';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

interface BulkEditTarget {
	/** The entries ticked when the dialog opened: a refetch behind the open dialog does not change what it edits. */
	logs: ReadonlyArray<ITimeLog>;
	/** Raised by every opening, so the dialog starts over on "Keep as is". */
	opening: number;
}

const NO_TARGET: BulkEditTarget = { logs: [], opening: 0 };

/** Whether the bulk edit dialog is open and what it edits. A closed dialog keeps its last entries while it leaves. */
export function useBulkEditDialog() {
	const [target, setTarget] = useState<BulkEditTarget>(NO_TARGET);
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback((logs: ReadonlyArray<ITimeLog>) => {
		const hasNoEntry = logs.length === 0;
		if (hasNoEntry) {
			return;
		}
		setTarget((current) => ({ logs, opening: current.opening + 1 }));
		setIsOpen(true);
	}, []);
	const close = useCallback(() => setIsOpen(false), []);

	return { logs: target.logs, opening: target.opening, isOpen, open, close };
}

export type BulkEditDialogState = ReturnType<typeof useBulkEditDialog>;
