'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	defaultSheetMemberOf,
	pendingLogsOf,
	type SheetMember,
	sheetDaysOf,
	sheetMembersOf,
	totalDurationOf,
	weekSheetOf
} from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const NO_LOGS: ITimeLog[] = [];

export interface SheetCellTarget {
	rowKey: string;
	dayKey: string;
	anchor: HTMLElement;
}

function pickedMemberOf(members: ReadonlyArray<SheetMember>, pickedMemberId: string | null) {
	if (pickedMemberId) {
		const picked = members.find((member) => member.id === pickedMemberId);
		if (picked) {
			return picked;
		}
	}
	return defaultSheetMemberOf(members);
}

/**
 * The week sheet view, derived from the logs the page already shows: the members with time in them, the one whose
 * sheet is open (picked in the rail, otherwise the first with time waiting for approval), the sheet's rows and
 * day columns, the member's logs waiting for approval, and the cell whose entries are open in the popover.
 */
export function useTimesheetSheet(shownLogs: ReadonlyArray<ITimeLog>, period: Period) {
	const [pickedMemberId, setPickedMemberId] = useState<string | null>(null);
	const [openCell, setOpenCell] = useState<SheetCellTarget | null>(null);
	const [isCellOpen, setIsCellOpen] = useState(false);

	const members = useMemo(() => sheetMembersOf(shownLogs), [shownLogs]);
	const member = useMemo(() => pickedMemberOf(members, pickedMemberId), [members, pickedMemberId]);
	const memberLogs = member?.logs ?? NO_LOGS;
	const days = useMemo(() => sheetDaysOf(period, memberLogs), [memberLogs, period]);
	const sheet = useMemo(() => weekSheetOf(memberLogs), [memberLogs]);
	const pendingLogs = useMemo(() => pendingLogsOf(memberLogs), [memberLogs]);
	const pendingSeconds = useMemo(() => totalDurationOf(pendingLogs), [pendingLogs]);

	const pickMember = useCallback((memberId: string) => {
		setPickedMemberId(memberId);
		setIsCellOpen(false);
	}, []);

	const openCellEntries = useCallback((target: SheetCellTarget) => {
		setOpenCell(target);
		setIsCellOpen(true);
	}, []);

	/** The cell stays known after closing, so the popover keeps its content while it fades out. */
	const closeCellEntries = useCallback(() => {
		setIsCellOpen(false);
	}, []);

	return {
		members,
		member,
		days,
		sheet,
		pendingLogs,
		pendingSeconds,
		pickMember,
		openCell,
		isCellOpen,
		openCellEntries,
		closeCellEntries
	};
}

export type TimesheetSheetState = ReturnType<typeof useTimesheetSheet>;
