'use client';

import { useCallback, useState } from 'react';
import { timesheetIdsOf } from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/** Where a reject or a delete was asked from: a row speaks for one log, the selection bar for the selection. */
export type TimesheetActionSource = 'row' | 'bulk';

export interface RejectTarget {
	timesheetIds: string[];
	source: TimesheetActionSource;
}

export interface DeleteTarget {
	logIds: string[];
	source: TimesheetActionSource;
}

const NO_REJECT_TARGET: RejectTarget = { timesheetIds: [], source: 'row' };
const NO_DELETE_TARGET: DeleteTarget = { logIds: [], source: 'row' };

/**
 * The page's dialogs, each mounted once for the whole page: which one is open and what it acts on. A closed
 * dialog keeps its last target so its closing transition still shows the right content.
 */
export function useTimesheetDialogs() {
	const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
	const [editedLog, setEditedLog] = useState<ITimeLog | null>(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [rejectTarget, setRejectTarget] = useState<RejectTarget>(NO_REJECT_TARGET);
	const [isRejectOpen, setIsRejectOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(NO_DELETE_TARGET);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);

	const openAddTime = useCallback(() => setIsAddTimeOpen(true), []);
	const closeAddTime = useCallback(() => setIsAddTimeOpen(false), []);

	const openEdit = useCallback((log: ITimeLog) => {
		setEditedLog(log);
		setIsEditOpen(true);
	}, []);
	const closeEdit = useCallback(() => setIsEditOpen(false), []);

	const openReject = useCallback((logs: ReadonlyArray<ITimeLog>, source: TimesheetActionSource) => {
		const timesheetIds = timesheetIdsOf(logs);
		if (timesheetIds.length === 0) {
			return;
		}
		setRejectTarget({ timesheetIds, source });
		setIsRejectOpen(true);
	}, []);
	const closeReject = useCallback(() => setIsRejectOpen(false), []);

	const openDelete = useCallback((logs: ReadonlyArray<ITimeLog>, source: TimesheetActionSource) => {
		const logIds = logs.map((log) => log.id);
		if (logIds.length === 0) {
			return;
		}
		setDeleteTarget({ logIds, source });
		setIsDeleteOpen(true);
	}, []);
	const closeDelete = useCallback(() => setIsDeleteOpen(false), []);

	return {
		isAddTimeOpen,
		openAddTime,
		closeAddTime,
		editedLog,
		isEditOpen,
		openEdit,
		closeEdit,
		rejectTarget,
		isRejectOpen,
		openReject,
		closeReject,
		deleteTarget,
		isDeleteOpen,
		openDelete,
		closeDelete
	};
}

export type TimesheetDialogsState = ReturnType<typeof useTimesheetDialogs>;
