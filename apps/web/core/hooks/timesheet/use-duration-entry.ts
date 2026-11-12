'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, subDays } from 'date-fns';
import { useAtomValue } from 'jotai';
import { useCallbackRef } from '@/core/hooks/common/use-callback-ref';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { timesheetPageLogsRequestOf } from '@/core/hooks/dashboards/timesheets/use-timesheet-page-logs';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	askedSecondsOf,
	type DurationPhase,
	IDLE_PHASE,
	intervalProposalOf,
	restingDurationTextOf,
	type ShownTimes,
	standingPhaseOf,
	typedDurationOf
} from '@/core/lib/utils/dashboards/manual-time-entry';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { memberIdOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const NO_CLAIMED: ReadonlyArray<TimeWindow> = [];

export interface DurationEntryInput {
	/** The member whose day is read for free time; null while none is picked. */
	employeeId: string | null;
	day: Date | null;
	startMinutes: number | null;
	endMinutes: number | null;
	/** Intervals the same form already holds elsewhere, kept out of the proposal like saved entries. */
	claimed?: ReadonlyArray<TimeWindow>;
	/** Shows an interval as the form's start and end; null empties them. */
	onInterval: (interval: TimeWindow | null) => void;
}

export interface DurationEntry {
	text: string;
	/** What the field says under itself; idle while the member types, and once they pick the times by hand. */
	phase: DurationPhase;
	change: (text: string) => void;
	commit: () => void;
	retry: () => void;
}

/**
 * A duration typed in an Add time form (`1:30`, `90m`). On leaving the field the form's start and end are emptied,
 * the member's entries are read again, and the first free stretch long enough becomes the start and the end, which
 * stay editable. The read spans the day before and the day after: the API lists entries by their start, in the
 * profile's time zone, and an entry begun the evening before can run into the day. The proposal follows the day and
 * the member while the form still shows it.
 */
export function useDurationEntry(input: DurationEntryInput): DurationEntry {
	const { employeeId, day, startMinutes, endMinutes, onInterval } = input;
	const claimed = input.claimed ?? NO_CLAIMED;
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const organization = useAtomValue(currentOrganizationState);
	const allowsFutureDates = organization?.futureDateAllowed === true;
	const [draft, setDraft] = useState<string | null>(null);
	const [phase, setPhase] = useState<DurationPhase>(IDLE_PHASE);
	const runIdRef = useRef(0);
	const onIntervalRef = useCallbackRef(onInterval);

	const shown = useMemo<ShownTimes>(() => ({ startMinutes, endMinutes }), [endMinutes, startMinutes]);
	const shownRef = useSyncRef(shown);
	const standingPhase = standingPhaseOf(phase, shown);
	const restingText = restingDurationTextOf(standingPhase, shown);

	const readMemberLogs = async (memberId: string, around: Date): Promise<ITimeLog[]> => {
		const period = { from: subDays(around, 1), to: addDays(around, 1) };
		const request = timesheetPageLogsRequestOf(period, {
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId,
			userTimeZone: user?.timeZone,
			employeeIds: [memberId]
		});
		const logs = await queryClient.fetchQuery({
			queryKey: request.queryKey,
			queryFn: request.queryFn,
			staleTime: 0,
			gcTime: request.gcTime
		});
		// The API answers with the caller's own entries when the caller may not read the member asked for: that
		// member's day is then unknown, and a proposal made on it could land on their entries
		const hasOtherMemberLog = logs.some((log) => memberIdOfLog(log) !== memberId);
		if (hasOtherMemberLog) {
			throw new Error('The entries read are not those of the member asked for');
		}
		return logs;
	};

	const propose = async (seconds: number) => {
		// Counted before the early returns too: a read still in flight answers the request this one replaces
		runIdRef.current += 1;
		const runId = runIdRef.current;
		if (!day) {
			setPhase(IDLE_PHASE);
			return;
		}
		if (!employeeId) {
			setPhase({ kind: 'noMember', seconds, shown: shownRef.current });
			return;
		}
		const reading: DurationPhase = { kind: 'reading', seconds };
		onIntervalRef.current(null);
		setPhase(reading);
		let memberLogs: ITimeLog[];
		try {
			memberLogs = await readMemberLogs(employeeId, day);
		} catch {
			const isCurrentRun = runIdRef.current === runId;
			if (isCurrentRun) {
				setPhase({ kind: 'failed', seconds });
			}
			return;
		}
		const isOutdated = runIdRef.current !== runId;
		if (isOutdated) {
			return;
		}
		const hasMemberTakenOver = standingPhaseOf(reading, shownRef.current) !== reading;
		if (hasMemberTakenOver) {
			setPhase(IDLE_PHASE);
			return;
		}
		const now = new Date();
		const proposal = intervalProposalOf({ seconds, day, memberLogs, claimed, now, allowsFutureDates });
		if (proposal.status === 'ready') {
			onIntervalRef.current(proposal.interval);
			setPhase({ kind: 'proposed', seconds, interval: proposal.interval });
			return;
		}
		if (proposal.status === 'noRoom') {
			setPhase({ kind: 'noRoom', seconds });
			return;
		}
		setPhase({ kind: 'closedDay', seconds });
	};

	const proposeAgain = () => {
		const askedSeconds = askedSecondsOf(standingPhase);
		if (askedSeconds === null) {
			return;
		}
		void propose(askedSeconds);
	};

	const proposeForNewDayOrMember = useEffectEvent(proposeAgain);
	let dayKey: string | null = null;
	if (day) {
		dayKey = localDayKeyOf(day);
	}
	useEffect(() => {
		proposeForNewDayOrMember();
	}, [dayKey, employeeId]);

	useEffect(() => {
		return () => {
			runIdRef.current += 1;
		};
	}, []);

	const change = (text: string) => {
		const isRestored = text === restingText;
		if (isRestored) {
			setDraft(null);
			return;
		}
		setDraft(text);
	};

	const commit = () => {
		if (draft === null) {
			return;
		}
		setDraft(null);
		// The read in flight answers the duration this text replaces: it must not fill the form once it arrives
		runIdRef.current += 1;
		const typed = typedDurationOf(draft);
		if (typed.kind === 'invalid') {
			setPhase({ kind: 'invalid', text: draft, shown });
			return;
		}
		if (typed.kind === 'empty') {
			setPhase(IDLE_PHASE);
			return;
		}
		void propose(typed.seconds);
	};

	const isTyping = draft !== null;
	let text = restingText;
	let shownPhase = standingPhase;
	if (isTyping) {
		text = draft;
		shownPhase = IDLE_PHASE;
	}

	return { text, phase: shownPhase, change, commit, retry: proposeAgain };
}
