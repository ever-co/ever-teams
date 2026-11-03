'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { startOfDay } from 'date-fns';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useTeamDailyPlans } from '@/core/hooks/daily-plans/use-team-daily-plans';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isOrganizationRole } from '@/core/lib/utils/dashboards/timesheets';
import {
	calendarDaysOf,
	calendarEntriesOf,
	calendarMembersOf,
	type CalendarDay,
	type CalendarMember,
	type CalendarView,
	countedDaysOf,
	DEFAULT_CALENDAR_VIEW,
	defaultSelectedDayOf,
	plansByDayOf,
	shiftedAnchorOf,
	trackedTotalOf,
	visibleRangeOf,
	weekStartOf
} from '@/core/lib/utils/calendar-view';
import type { TDailyPlan } from '@/core/types/schemas';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { type CalendarLogsRequest, useCalendarLogs } from './use-calendar-logs';

const VIEW_STORAGE_KEY = 'calendar-view';

const NO_PLANS: TDailyPlan[] = [];

const NO_LOGS: ITimeLog[] = [];

const CALENDAR_VIEWS: ReadonlyArray<CalendarView> = ['month', 'week', 'day'];

function todayStart() {
	const now = new Date();
	return startOfDay(now);
}

function isCalendarView(value: string): value is CalendarView {
	return CALENDAR_VIEWS.some((view) => view === value);
}

function viewOf(stored: string): CalendarView {
	if (isCalendarView(stored)) {
		return stored;
	}
	return DEFAULT_CALENDAR_VIEW;
}

function shownEmployeeIdOf(
	canSwitchMember: boolean,
	pickedEmployeeId: string | null,
	members: ReadonlyArray<CalendarMember>,
	ownEmployeeId: string | null
) {
	if (!canSwitchMember) {
		return ownEmployeeId;
	}
	const isTeamMember = members.some((member) => member.employeeId === pickedEmployeeId);
	if (isTeamMember) {
		return pickedEmployeeId;
	}
	if (ownEmployeeId) {
		return ownEmployeeId;
	}
	const firstMember = members[0];
	return firstMember?.employeeId ?? null;
}

type ShownScope = Pick<CalendarLogsRequest, 'employeeId' | 'view' | 'anchor' | 'range'>;

/** What the shown days come from: the current choice, or the previous one kept on screen while the next loads. */
function shownScopeOf(
	current: ShownScope,
	loaded: CalendarLogsRequest | undefined,
	isPlaceholder: boolean
): ShownScope {
	if (!loaded) {
		return current;
	}
	if (!isPlaceholder) {
		return current;
	}
	return loaded;
}

function plansOrNone(items: TDailyPlan[] | undefined) {
	if (!items) {
		return NO_PLANS;
	}
	if (items.length === 0) {
		return NO_PLANS;
	}
	return items;
}

/** Running entries end at the time of the read that returned them, so they grow with each live read. */
function readTimeOf(dataUpdatedAt: number) {
	if (dataUpdatedAt > 0) {
		return new Date(dataUpdatedAt);
	}
	return new Date();
}

function entryCountOf(days: ReadonlyArray<CalendarDay>) {
	let count = 0;
	for (const day of days) {
		count += day.entries.length;
	}
	return count;
}

function memberOf(members: ReadonlyArray<CalendarMember>, employeeId: string | null) {
	if (!employeeId) {
		return null;
	}
	return members.find((member) => member.employeeId === employeeId) ?? null;
}

function dayWithKey(days: ReadonlyArray<CalendarDay>, dayKey: string | null) {
	if (!dayKey) {
		return null;
	}
	return days.find((day) => day.key === dayKey) ?? null;
}

/**
 * Everything the Calendar shows, computed once per data change: the view and its days, whose calendar it is (a
 * manager may switch to another member of the active team, anyone else sees their own), the member's logs and daily
 * plans laid on those days, the toolbar total and who may edit what.
 */
export function useCalendarPage() {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const organization = useAtomValue(currentOrganizationState);
	const { isTeamManager } = useIsMemberManager(user);
	const { allTeamDailyPlans } = useTeamDailyPlans();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const [storedView, setStoredView] = useLocalStorageState<string>(VIEW_STORAGE_KEY, DEFAULT_CALENDAR_VIEW);
	const [anchor, setAnchor] = useState<Date>(todayStart);
	const [pickedEmployeeId, setPickedEmployeeId] = useState<string | null>(null);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [panelDayKey, setPanelDayKey] = useState<string | null>(null);

	const view = viewOf(storedView);
	const weekStartsOn = weekStartOf(organization?.startWeekOn);
	const range = useMemo(() => visibleRangeOf(view, anchor, weekStartsOn), [anchor, view, weekStartsOn]);

	const roleName = user?.role?.name;
	const hasOrganizationRole = isOrganizationRole(roleName);
	const canSwitchMember = hasOrganizationRole || isTeamManager;
	const ownEmployeeId = user?.employee?.id ?? null;
	const userId = user?.id ?? null;

	const teamMembers = activeTeam?.members;
	const members = useMemo(() => calendarMembersOf(teamMembers), [teamMembers]);
	const employeeId = shownEmployeeIdOf(canSwitchMember, pickedEmployeeId, members, ownEmployeeId);
	const shownMember = memberOf(members, employeeId);

	const permissions = useMemo<TimesheetPermissions>(
		() => ({
			hasOrganizationRole,
			isManage: canSwitchMember,
			canApprove: false,
			userId,
			employeeId: ownEmployeeId
		}),
		[canSwitchMember, hasOrganizationRole, ownEmployeeId, userId]
	);

	const isUserReady = user !== undefined;
	const logsQuery = useCalendarLogs({
		tenantId,
		organizationId,
		employeeId,
		view,
		anchor,
		range,
		timeZone,
		isEnabled: isUserReady
	});

	const result = logsQuery.data;
	const loadedRequest = result?.request;
	const isPlaceholder = logsQuery.isPlaceholderData;
	const shownScope = useMemo(() => {
		const current: ShownScope = { employeeId: employeeId ?? '', view, anchor, range };
		return shownScopeOf(current, loadedRequest, isPlaceholder);
	}, [anchor, employeeId, isPlaceholder, loadedRequest, range, view]);

	const shownView = shownScope.view;
	const shownAnchor = shownScope.anchor;
	const shownRange = shownScope.range;
	const shownEmployeeId = shownScope.employeeId;
	const dataUpdatedAt = logsQuery.dataUpdatedAt;
	const resultLogs = result?.logs;
	const teamPlans = plansOrNone(allTeamDailyPlans.items);

	const entries = useMemo(() => {
		const readTime = readTimeOf(dataUpdatedAt);
		const logs = resultLogs ?? NO_LOGS;
		return calendarEntriesOf(logs, shownRange, shownEmployeeId, readTime);
	}, [dataUpdatedAt, resultLogs, shownEmployeeId, shownRange]);

	const plansByDay = useMemo(
		() => plansByDayOf(teamPlans, shownEmployeeId, shownRange),
		[shownEmployeeId, shownRange, teamPlans]
	);

	const days = useMemo(() => calendarDaysOf(shownRange, entries, plansByDay), [entries, plansByDay, shownRange]);

	const countedDays = useMemo(() => countedDaysOf(shownView, days, shownAnchor), [days, shownAnchor, shownView]);
	const trackedSeconds = useMemo(() => trackedTotalOf(countedDays), [countedDays]);
	const countedEntryCount = useMemo(() => entryCountOf(countedDays), [countedDays]);

	const defaultSelectedKey = useMemo(() => {
		const now = new Date();
		const day = defaultSelectedDayOf(shownView, shownAnchor, shownRange, now);
		return localDayKeyOf(day);
	}, [shownAnchor, shownRange, shownView]);

	const pickedDay = dayWithKey(days, selectedDayKey);
	const defaultDay = dayWithKey(days, defaultSelectedKey);
	const selectedDay = pickedDay ?? defaultDay;
	const panelDay = dayWithKey(days, panelDayKey);

	const hasData = result !== undefined;
	const isWaitingForData = !logsQuery.isError && !hasData;
	const hasEmployee = Boolean(employeeId);
	const isMemberUnknown = isUserReady && !hasEmployee;
	const isFirstLoad = isWaitingForData && hasEmployee;
	const isLoading = !isUserReady || isFirstLoad;
	const showsError = logsQuery.isError && !hasData;
	const isUpdating = logsQuery.isFetching && hasData;
	const isEmpty = hasData && countedEntryCount === 0;

	const changeView = useCallback(
		(nextView: CalendarView) => {
			setStoredView(nextView);
			setPanelDayKey(null);
		},
		[setStoredView]
	);

	const showPrevious = useCallback(() => {
		setAnchor((current) => shiftedAnchorOf(view, current, -1));
		setSelectedDayKey(null);
	}, [view]);

	const showNext = useCallback(() => {
		setAnchor((current) => shiftedAnchorOf(view, current, 1));
		setSelectedDayKey(null);
	}, [view]);

	const showToday = useCallback(() => {
		const today = todayStart();
		const todayKey = localDayKeyOf(today);
		setAnchor(today);
		setSelectedDayKey(todayKey);
	}, []);

	const selectDay = useCallback((date: Date) => {
		const day = startOfDay(date);
		const dayKey = localDayKeyOf(day);
		setSelectedDayKey(dayKey);
		setAnchor(day);
	}, []);

	const openDayPanel = useCallback((dayKey: string) => setPanelDayKey(dayKey), []);
	const closeDayPanel = useCallback(() => setPanelDayKey(null), []);

	const openDayView = useCallback(
		(date: Date) => {
			const day = startOfDay(date);
			setAnchor(day);
			setStoredView('day');
			setPanelDayKey(null);
		},
		[setStoredView]
	);

	const pickMember = useCallback((nextEmployeeId: string) => {
		setPickedEmployeeId(nextEmployeeId);
		setPanelDayKey(null);
	}, []);

	const refetchQuery = logsQuery.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const isTeamReady = activeTeam !== null;

	return {
		teamName: activeTeam?.name ?? '',
		isTeamReady,
		view,
		changeView,
		anchor,
		range,
		weekStartsOn,
		timeZone,
		showPrevious,
		showNext,
		showToday,
		canSwitchMember,
		members,
		employeeId,
		ownEmployeeId,
		shownMember,
		pickMember,
		permissions,
		shownView,
		shownAnchor,
		shownRange,
		days,
		trackedSeconds,
		selectedDay,
		selectDay,
		panelDay,
		openDayPanel,
		closeDayPanel,
		openDayView,
		isLoading,
		isUpdating,
		isEmpty,
		isMemberUnknown,
		showsError,
		refetch
	};
}

export type CalendarPageState = ReturnType<typeof useCalendarPage>;
