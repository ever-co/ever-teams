'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { endOfDay, startOfDay } from 'date-fns';
import { useLocale } from 'next-intl';
import { queryKeys } from '@/core/query/keys';
import {
	timeLogReportService,
	type TimeLogReportRange
} from '@/core/services/client/api/timesheets/time-log-report.service';
import { activeTeamState } from '@/core/stores';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { holdsEmployeeRatesPermission } from '@/core/lib/utils/rates';
import { useEmployeePayRates } from '@/core/hooks/organizations/rates/use-rates';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { daysOfPeriod, periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import {
	chartDaysOf,
	chartKeyOfCurrency,
	currencyRankOf,
	dayGroupsOf,
	isCurrencyChartKey,
	MAX_CURRENCY_FIGURES,
	memberGroupsOf,
	owedFiguresOf,
	owedLinesOf,
	payLineEmployeeIdsOf,
	owedTilesOf,
	PAYMENTS_WEEK_START,
	type ChartDayLabels,
	type OwedCurrencyTotal,
	type OwedDayGroup,
	type OwedFigures,
	type OwedLine,
	type OwedMemberGroup,
	type OwedTile,
	type PaymentsChartKey,
	type PaymentsGrouping,
	type PaymentsMember
} from '@/core/lib/utils/dashboards/payments-due';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TOwedReportDay } from '@/core/types/schemas/timer/time-log-reports.schema';

interface PaymentsDueRequest {
	range: TimeLogReportRange;
	period: Period;
	/** Tenant, organisation and team: the previous figures stay on screen only while these do not change. */
	scopeKey: string;
}

interface PaymentsDueResult {
	request: PaymentsDueRequest;
	report: TOwedReportDay[];
}

export interface PaymentsDueShown {
	period: Period;
	figures: OwedFigures;
	memberGroups: OwedMemberGroup[];
	dayGroups: OwedDayGroup[];
	lines: OwedLine[];
}

export type PaymentsChartKind = 'amount' | 'tracked' | 'unpriced';

export interface PaymentsChart {
	key: PaymentsChartKey;
	kind: PaymentsChartKind;
	currency: string | null;
	days: DayBarDatum[];
}

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

async function fetchPaymentsDue(request: PaymentsDueRequest): Promise<PaymentsDueResult> {
	const report = await timeLogReportService.getOwedAmountReport(request.range);
	return { request, report };
}

function memberNameOf(member: TeamMember) {
	const employeeName = member.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = member.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return member.fullName?.trim() ?? '';
}

function memberImageOf(member: TeamMember) {
	const employeeImage = member.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return member.user?.imageUrl ?? null;
}

function teamMembersOf(members: TOrganizationTeam['members']): PaymentsMember[] {
	const byEmployee = new Map<string, PaymentsMember>();
	for (const member of members ?? []) {
		const employeeId = member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		byEmployee.set(employeeId, {
			employeeId,
			name: memberNameOf(member),
			imageUrl: memberImageOf(member)
		});
	}
	const list = [...byEmployee.values()];
	list.sort((first, second) => first.name.localeCompare(second.name));
	return list;
}

function membersByIdOf(members: PaymentsMember[]) {
	const byId = new Map<string, PaymentsMember>();
	for (const member of members) {
		byId.set(member.employeeId, member);
	}
	return byId;
}

function scopeKeyOf(tenantId: string | null | undefined, organizationId: string | null | undefined, teamId: string) {
	const tenantPart = tenantId ?? '';
	const organizationPart = organizationId ?? '';
	return `${tenantPart}:${organizationPart}:${teamId}`;
}

function reportedEmployeeIdsOf(appliedIds: string[], members: PaymentsMember[]) {
	if (appliedIds.length > 0) {
		return appliedIds;
	}
	return members.map((member) => member.employeeId);
}

function previousOfSameScope(previous: PaymentsDueResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= 7) {
		return { weekday: 'short' };
	}
	return { day: 'numeric' };
}

function chartLabelsOf(locale: string, dayCount: number): ChartDayLabels {
	const labelFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' });
	const axisFormat = new Intl.DateTimeFormat(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

export function figureCurrenciesOf(figures: OwedFigures | null | undefined): OwedCurrencyTotal[] {
	const currencies = figures?.currencies ?? [];
	return currencies.slice(0, MAX_CURRENCY_FIGURES);
}

function chartKeysOf(currencies: ReadonlyArray<OwedCurrencyTotal>): PaymentsChartKey[] {
	const currencyKeys = currencies.map((total) => chartKeyOfCurrency(total.currency));
	return [...currencyKeys, 'tracked', 'unpriced'];
}

function resolvedChartKeyOf(picked: PaymentsChartKey | null, available: ReadonlyArray<PaymentsChartKey>) {
	const fallback = available[0] ?? 'tracked';
	if (picked === null) {
		return fallback;
	}
	if (available.includes(picked)) {
		return picked;
	}
	return fallback;
}

function chartKindOf(key: PaymentsChartKey): PaymentsChartKind {
	if (key === 'tracked') {
		return 'tracked';
	}
	if (key === 'unpriced') {
		return 'unpriced';
	}
	return 'amount';
}

function chartCurrencyOf(key: PaymentsChartKey, currencies: ReadonlyArray<OwedCurrencyTotal>) {
	if (!isCurrencyChartKey(key)) {
		return null;
	}
	const match = currencies.find((total) => chartKeyOfCurrency(total.currency) === key);
	return match?.currency ?? null;
}

/** Everything shown derives from the data's own request, so a period kept on screen is never drawn as the next. */
export function usePaymentsDueReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const locale = useLocale();
	const activeTeam = useAtomValue(activeTeamState);
	const organization = useAtomValue(currentOrganizationState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisMonth', PAYMENTS_WEEK_START));
	const [grouping, setGrouping] = useState<PaymentsGrouping>('member');
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
	const [pickedChartKey, setPickedChartKey] = useState<PaymentsChartKey | null>(null);

	const teamMembers = activeTeam?.members;
	const members = useMemo(() => teamMembersOf(teamMembers), [teamMembers]);
	const membersById = useMemo(() => membersByIdOf(members), [members]);

	const appliedEmployeeIds = useMemo(
		() => selectedEmployeeIds.filter((employeeId) => membersById.has(employeeId)),
		[membersById, selectedEmployeeIds]
	);
	const reportedEmployeeIds = useMemo(
		() => reportedEmployeeIdsOf(appliedEmployeeIds, members),
		[appliedEmployeeIds, members]
	);

	const teamId = activeTeam?.id ?? '';

	const request = useMemo<PaymentsDueRequest>(() => {
		const employeeIds = [...reportedEmployeeIds].sort((first, second) => first.localeCompare(second));
		const requestPeriod = { from: startOfDay(period.from), to: endOfDay(period.to) };
		return {
			range: { from: requestPeriod.from, to: requestPeriod.to, timeZone, employeeIds },
			period: requestPeriod,
			scopeKey: scopeKeyOf(tenantId, organizationId, teamId)
		};
	}, [organizationId, period, reportedEmployeeIds, teamId, tenantId, timeZone]);

	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	const hasMembers = reportedEmployeeIds.length > 0;
	const isEnabled = hasScope && hasMembers;

	const requestPeriod = request.period;
	const isLive = isLiveDayRange(localDayKeyOf(requestPeriod.from), localDayKeyOf(requestPeriod.to));
	const query = useQuery({
		queryKey: queryKeys.timesheet.reports.owedAmounts({
			tenantId,
			organizationId,
			teamId,
			employeeIds: request.range.employeeIds,
			from: requestPeriod.from.toISOString(),
			to: requestPeriod.to.toISOString(),
			timeZone
		}),
		queryFn: () => fetchPaymentsDue(request),
		enabled: isEnabled,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});

	const result = query.data;
	const organizationCurrency = organization?.currency ?? null;
	const { myPermissions } = useMyRolePermissionsQuery();
	const readsPayRates = holdsEmployeeRatesPermission(myPermissions);
	const reportDays = result?.report;
	const payLineEmployeeIds = useMemo(() => payLineEmployeeIdsOf(reportDays ?? []), [reportDays]);
	const knownPayRates = useEmployeePayRates(payLineEmployeeIds);

	const shown = useMemo<PaymentsDueShown | null>(() => {
		if (!result) {
			return null;
		}
		const lines = owedLinesOf({
			report: result.report,
			members: membersById,
			organizationCurrency,
			unnamedLabel,
			readsPayRates,
			knownPayRates
		});
		const figures = owedFiguresOf(lines);
		const rankOf = currencyRankOf(figures.currencies);
		return {
			period: result.request.period,
			figures,
			memberGroups: memberGroupsOf(lines, rankOf),
			dayGroups: dayGroupsOf(lines, rankOf),
			lines
		};
	}, [knownPayRates, membersById, organizationCurrency, readsPayRates, result, unnamedLabel]);

	const shownFigures = shown?.figures;
	const figureCurrencies = useMemo(() => figureCurrenciesOf(shownFigures), [shownFigures]);
	const availableChartKeys = useMemo(() => chartKeysOf(figureCurrencies), [figureCurrencies]);
	const chartKey = resolvedChartKeyOf(pickedChartKey, availableChartKeys);

	const chart = useMemo<PaymentsChart | null>(() => {
		if (!shown) {
			return null;
		}
		const days = daysOfPeriod(shown.period);
		const labels = chartLabelsOf(locale, days.length);
		return {
			key: chartKey,
			kind: chartKindOf(chartKey),
			currency: chartCurrencyOf(chartKey, figureCurrencies),
			days: chartDaysOf(days, shown.lines, chartKey, labels)
		};
	}, [chartKey, figureCurrencies, locale, shown]);

	const tiles = useMemo<OwedTile[]>(() => {
		if (!shown) {
			return [];
		}
		const days = daysOfPeriod(shown.period);
		return owedTilesOf({ currencies: shown.figures.currencies, lines: shown.lines, days });
	}, [shown]);

	const isTeamReady = activeTeam !== null;
	const isOrganizationReady = organization !== null;
	const hasData = result !== undefined;
	const isWaitingForData = isEnabled && !hasData && !query.isError;
	const isLoading = !isTeamReady || !isOrganizationReady || isWaitingForData;
	const showsNoMembers = isTeamReady && !hasMembers;
	const isUpdating = query.isFetching && hasData;
	const showsError = query.isError && !hasData;

	const refetchQuery = query.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const clearMembers = useCallback(() => setSelectedEmployeeIds([]), []);
	const removeMember = useCallback((employeeId: string) => {
		setSelectedEmployeeIds((current) => current.filter((id) => id !== employeeId));
	}, []);

	return {
		teamName: activeTeam?.name ?? '',
		period,
		setPeriod,
		grouping,
		setGrouping,
		members,
		appliedEmployeeIds,
		setSelectedEmployeeIds,
		clearMembers,
		removeMember,
		requestPeriod,
		populationCount: reportedEmployeeIds.length,
		isTeamReady,
		shown,
		figureCurrencies,
		tiles,
		chart,
		setChartKey: setPickedChartKey,
		isLoading,
		isUpdating,
		showsError,
		showsNoMembers,
		refetch
	};
}

export type PaymentsDueReportState = ReturnType<typeof usePaymentsDueReport>;
