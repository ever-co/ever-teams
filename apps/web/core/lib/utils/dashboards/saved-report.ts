import { endOfDay } from 'date-fns';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { SHARED_REPORT_PATH, sharedReportFragmentOf } from '@/core/lib/utils/shared-report-path';
import { DEFAULT_PERIOD_PRESETS, type Period, type WeekStart, presetOfPeriod } from '@/core/lib/utils/dashboard-period';
import {
	BILLABLE_ONLY_VALUE,
	isBillableOnly,
	readReportUrlFilters,
	writeReportUrlFilter
} from '@/core/lib/utils/dashboards/report-filters';
import {
	TIME_ACTIVITY_GROUPING_PARAM,
	type TimeActivityFilters,
	type TimeActivityGrouping,
	groupingParamOf
} from '@/core/lib/utils/dashboards/time-activity';
import {
	TIME_ACTIVITY_FROM_PARAM,
	TIME_ACTIVITY_PERIOD_PARAM,
	TIME_ACTIVITY_TO_PARAM,
	dayOfKey,
	periodOfDays,
	writeLinkedFilters
} from '@/core/lib/utils/dashboards/time-activity-link';
import { entryLabelFiltersOf, entryLabelsOfFilters } from '@/core/lib/utils/time-log-labels';
import type {
	ITimeLogGroupedDailyReport,
	ITimerEmployeeLog,
	ITimerProjectLog
} from '@/core/types/interfaces/activity/activity-report';
import type {
	IPublicSavedReport,
	IPublicSavedReportTask,
	ISavedReport,
	ISavedReportFilters,
	ISavedReportInput
} from '@/core/types/interfaces/timesheet/saved-report';

/** The page link names the saved report it was opened from, so the menu can update it and the Share action share it. */
export const SAVED_REPORT_PARAM = 'report';

/** The longest name Gauzy keeps. */
export const SAVED_REPORT_NAME_MAX_LENGTH = 100;

/** What the Time & activity page shows: the period, every filter and the grouping. */
export interface TimeActivityView {
	period: Period;
	filters: TimeActivityFilters;
	grouping: TimeActivityGrouping;
}

type SavedPeriod = Pick<ISavedReportInput, 'periodRule' | 'startDate' | 'endDate'>;

/** A period that matches a preset is kept as its rule, so "Last month" stays last month; any other as fixed days. */
export function savedPeriodOf(period: Period, weekStartsOn: WeekStart): SavedPeriod {
	const preset = presetOfPeriod(period, DEFAULT_PERIOD_PRESETS, weekStartsOn);
	if (preset) {
		return { periodRule: preset, startDate: null, endDate: null };
	}
	return { periodRule: null, startDate: localDayKeyOf(period.from), endDate: localDayKeyOf(period.to) };
}

/**
 * The filters a saved report stores. The entry Labels filter goes as the daily report takes it (`tagIds`, and "No label"
 * as `untagged`), only for a view narrowed by labels: the body of any other view is the one an older Gauzy takes.
 */
function savedFiltersOf(filters: TimeActivityFilters): ISavedReportFilters {
	return {
		teamIds: [...filters.teamIds],
		employeeIds: [...filters.employeeIds],
		projectIds: [...filters.projectIds],
		taskIds: [...filters.taskIds],
		clientIds: [...filters.clientIds],
		billableOnly: isBillableOnly(filters.billable),
		...entryLabelFiltersOf(filters.entryLabels)
	};
}

/** Whether the view is narrowed by the labels of entries, or grouped by label. */
export function viewUsesEntryLabels(view: TimeActivityView): boolean {
	const hasEntryLabels = view.filters.entryLabels.length > 0;
	const isGroupedByLabel = view.grouping === 'label';
	return hasEntryLabels || isGroupedByLabel;
}

/**
 * Whether the page link asks for labels of entries: a labels filter, or the Label grouping. The view shows them only
 * once the page knows that entries have labels; until then it shows the view without them (`effectiveGroupingOf`).
 */
export function linkUsesEntryLabels(params: Pick<URLSearchParams, 'get'>): boolean {
	const hasEntryLabels = readReportUrlFilters(params).entryLabels.length > 0;
	const isGroupedByLabel = params.get(TIME_ACTIVITY_GROUPING_PARAM) === 'label';
	return hasEntryLabels || isGroupedByLabel;
}

/** Whether a saved report keeps labels of entries: a labels filter, or the Label grouping. */
export function savedReportUsesEntryLabels(report: ISavedReport | null | undefined): boolean {
	if (!report) {
		return false;
	}
	const hasEntryLabels = entryLabelsOfFilters(report.filters).length > 0;
	const isGroupedByLabel = report.grouping === 'label';
	return hasEntryLabels || isGroupedByLabel;
}

/**
 * Whether a saved report can keep the view as the page shows it. Only a Gauzy with ever-gauzy#12073 keeps labels of
 * entries (`keepsEntryLabels`, see `useSavedReportLabelsSupport`): an older one drops a labels filter and refuses the
 * Label grouping (#5368). There, a view narrowed or grouped by labels, saved anyway, would reopen and be shared as
 * another view: Save and Update stay off for it, and say why.
 */
export function canSaveView(view: TimeActivityView, keepsEntryLabels = false): boolean {
	return keepsEntryLabels || !viewUsesEntryLabels(view);
}

/**
 * Whether "Update with this view" may write the view over a report: the view can be saved (`canSaveView`), and a report
 * that keeps labels is written over only once labels are known to be kept. Until then the page shows a view without
 * them (it drops the labels of a link while it does not know whether entries have labels), which would take them off.
 */
export function canUpdateReport(report: ISavedReport, view: TimeActivityView, keepsEntryLabels = false): boolean {
	const keepsReportLabels = keepsEntryLabels || !savedReportUsesEntryLabels(report);
	return canSaveView(view, keepsEntryLabels) && keepsReportLabels;
}

/** The body that saves the view, or that updates a saved report with it. */
export function savedReportInputOf(
	view: TimeActivityView,
	weekStartsOn: WeekStart,
	timeZone: string
): Omit<ISavedReportInput, 'name'> {
	return {
		...savedPeriodOf(view.period, weekStartsOn),
		timeZone,
		filters: savedFiltersOf(view.filters),
		grouping: view.grouping
	};
}

function idsOf(values: ReadonlyArray<string> | null | undefined): string[] {
	return [...(values ?? [])];
}

function writeSavedPeriod(params: URLSearchParams, report: ISavedReport) {
	if (report.periodRule) {
		params.set(TIME_ACTIVITY_PERIOD_PARAM, report.periodRule);
		return;
	}
	const period = periodOfDays(report.startDate, report.endDate);
	if (!period) {
		return;
	}
	params.set(TIME_ACTIVITY_FROM_PARAM, localDayKeyOf(period.from));
	params.set(TIME_ACTIVITY_TO_PARAM, localDayKeyOf(period.to));
}

/**
 * The page link of a saved report: its period, every filter (the entry Labels filter included), its grouping and its id.
 * Opening it replaces the whole view, so nothing of the view it replaces is left behind.
 */
export function linkParamsOfSavedReport(report: ISavedReport): URLSearchParams {
	const params = new URLSearchParams();
	writeSavedPeriod(params, report);
	const filters = report.filters ?? {};
	writeLinkedFilters(params, {
		teamIds: idsOf(filters.teamIds),
		employeeIds: idsOf(filters.employeeIds),
		projectIds: idsOf(filters.projectIds),
		taskIds: idsOf(filters.taskIds)
	});
	writeReportUrlFilter(params, 'clients', idsOf(filters.clientIds));
	if (filters.billableOnly) {
		params.set('billable', BILLABLE_ONLY_VALUE);
	}
	writeReportUrlFilter(params, 'entryLabels', entryLabelsOfFilters(filters));
	const groupingParam = groupingParamOf(report.grouping ?? 'date');
	if (groupingParam) {
		params.set(TIME_ACTIVITY_GROUPING_PARAM, groupingParam);
	}
	params.set(SAVED_REPORT_PARAM, report.id);
	return params;
}

function sameIds(first: ReadonlyArray<string> | null | undefined, second: ReadonlyArray<string> | null | undefined) {
	const firstSorted = idsOf(first).sort((a, b) => a.localeCompare(b));
	const secondSorted = idsOf(second).sort((a, b) => a.localeCompare(b));
	const sameLength = firstSorted.length === secondSorted.length;
	return sameLength && firstSorted.every((value, index) => value === secondSorted[index]);
}

function sameFilters(saved: ISavedReportFilters, shown: ISavedReportFilters) {
	const sameTeams = sameIds(saved.teamIds, shown.teamIds);
	const sameMembers = sameIds(saved.employeeIds, shown.employeeIds);
	const sameProjects = sameIds(saved.projectIds, shown.projectIds);
	const sameTasks = sameIds(saved.taskIds, shown.taskIds);
	const sameClients = sameIds(saved.clientIds, shown.clientIds);
	const sameBillable = Boolean(saved.billableOnly) === Boolean(shown.billableOnly);
	const sameEntryLabels = sameIds(entryLabelsOfFilters(saved), entryLabelsOfFilters(shown));
	return sameTeams && sameMembers && sameProjects && sameTasks && sameClients && sameBillable && sameEntryLabels;
}

/**
 * Whether the page shows the period of a report: its rule for a report saved as a rule, its very days for one saved as
 * fixed days, even on days a preset also covers (a fixed report is never read as a rule).
 */
function showsSavedPeriod(report: ISavedReport, period: Period, weekStartsOn: WeekStart): boolean {
	if (!report.periodRule) {
		const sameStart = (report.startDate ?? null) === localDayKeyOf(period.from);
		const sameEnd = (report.endDate ?? null) === localDayKeyOf(period.to);
		return sameStart && sameEnd;
	}
	return report.periodRule === savedPeriodOf(period, weekStartsOn).periodRule;
}

/**
 * Whether the view shown is the one the report saved: when it is not, the menu offers to update the report. The labels
 * of entries count as every other filter: a report saved without them (on an older Gauzy, all of them) is never the view
 * of a page narrowed or grouped by them.
 */
export function showsSavedView(report: ISavedReport, view: TimeActivityView, weekStartsOn: WeekStart): boolean {
	const shown = savedReportInputOf(view, weekStartsOn, report.timeZone ?? '');
	const samePeriod = showsSavedPeriod(report, view.period, weekStartsOn);
	const sameGrouping = (report.grouping ?? 'date') === shown.grouping;
	return samePeriod && sameGrouping && sameFilters(report.filters ?? {}, shown.filters ?? {});
}

/**
 * The address of a shared report, with the locale prefix when the author does not use the default one. The token is
 * its fragment (`#token=<token>`), so no server, proxy or error report in between ever records it with the address.
 */
export function sharedReportUrlOf(origin: string, token: string, locale?: string | null, defaultLocale = 'en'): string {
	let base = origin;
	while (base.endsWith('/')) base = base.slice(0, -1);
	const prefix = locale && locale !== defaultLocale ? `/${locale}` : '';
	return `${base}${prefix}${SHARED_REPORT_PATH}${sharedReportFragmentOf(token)}`;
}

/** A link that ends on a day stops working at the end of that day, in the author's time zone. */
export function shareExpiryOf(dayKey: string | null | undefined): string | null {
	const day = dayOfKey(dayKey);
	if (!day) {
		return null;
	}
	return endOfDay(day).toISOString();
}

/** The day a link ends on, as the share panel shows it. */
export function shareExpiryDayOf(expiresAt: string | null | undefined): string | null {
	if (!expiresAt) {
		return null;
	}
	const date = new Date(expiresAt);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return localDayKeyOf(date);
}

/** A saved report's period as the menu names it: the period of today for a rule, the fixed days otherwise. */
export function periodOfSavedReport(report: Pick<ISavedReport, 'startDate' | 'endDate'>): Period | null {
	return periodOfDays(report.startDate, report.endDate);
}

/** The period a shared report was computed for, in its own days. */
export function periodOfPublicReport(report: IPublicSavedReport): Period | null {
	return periodOfDays(report.period.startDate, report.period.endDate);
}

/** The team of an entry, stated only when the report counts the time without a team (as the daily report does). */
function teamOfTaskLog(taskLog: IPublicSavedReportTask) {
	if (taskLog.organizationTeamId === undefined) {
		return {};
	}
	return { organizationTeamId: taskLog.organizationTeamId };
}

/** The labels of an entry, stated by a shared report grouped by label only: its rows then group by them. */
function labelsOfTaskLog(taskLog: IPublicSavedReportTask) {
	if (!Array.isArray(taskLog.tags)) {
		return {};
	}
	return { tags: taskLog.tags as ITimerEmployeeLog['tasks'][number]['tags'] };
}

/**
 * The rate an entry states, so its row is priced as on the report page (`statedRateOf`): the rate the entry stores, else
 * the member's current one. An API that states only the member's rate gives none, and the row takes the member's.
 */
function rateOfTaskLog(taskLog: IPublicSavedReportTask) {
	if (!('billRateValue' in taskLog)) {
		return {};
	}
	return { billRateValue: taskLog.billRateValue ?? null, billRateCurrency: taskLog.billRateCurrency ?? null };
}

/**
 * A shared report in the shape of the daily report, so the public page draws it with the report page's own rows,
 * chart and table. The link states no activity: every member's activity reads 0 and the page shows no activity.
 */
export function dailyReportOfPublic(report: IPublicSavedReport): ITimeLogGroupedDailyReport[] {
	return report.days.map((day) => ({
		date: day.date,
		logs: day.logs.map((projectLog) => ({
			project: (projectLog.project ?? {}) as ITimerProjectLog['project'],
			employeeLogs: projectLog.employeeLogs.map((employeeLog) => ({
				employee: employeeLog.employee as unknown as ITimerEmployeeLog['employee'],
				sum: employeeLog.sum,
				activity: 0,
				tasks: employeeLog.tasks.map((taskLog) => ({
					task: (taskLog.task ?? null) as unknown as ITimerEmployeeLog['tasks'][number]['task'],
					description: '',
					duration: taskLog.duration,
					client: (taskLog.client ?? null) as unknown as ITimerEmployeeLog['tasks'][number]['client'],
					...teamOfTaskLog(taskLog),
					...rateOfTaskLog(taskLog),
					...labelsOfTaskLog(taskLog)
				}))
			}))
		}))
	}));
}
