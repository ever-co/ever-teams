import type { useTranslations } from 'next-intl';
import { type CsvColumn, downloadCsv, localDayKeyOf, periodFileNameOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	clockTimeOf,
	endOfLog,
	hoursMinutesOf,
	logDurationSeconds,
	startOfLog,
	statusOfLog,
	workDayOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { STATUS_LABEL_KEYS } from './timesheet-status';

type Translate = ReturnType<typeof useTranslations>;

const FILE_PREFIX = 'timesheets';

function dayOf(log: ITimeLog) {
	const day = workDayOfLog(log);
	if (!day) {
		return '';
	}
	return localDayKeyOf(day);
}

function startTimeValueOf(log: ITimeLog) {
	const start = startOfLog(log);
	if (!start) {
		return 0;
	}
	return start.getTime();
}

function startClockOf(log: ITimeLog) {
	const start = startOfLog(log);
	return clockTimeOf(start);
}

function endClockOf(log: ITimeLog) {
	const end = endOfLog(log);
	return clockTimeOf(end);
}

function durationTextOf(log: ITimeLog) {
	const seconds = logDurationSeconds(log);
	return hoursMinutesOf(seconds);
}

function statusLabelOf(log: ITimeLog, t: Translate) {
	const status = statusOfLog(log);
	if (!status) {
		return '';
	}
	return t(STATUS_LABEL_KEYS[status]);
}

function billableLabelOf(log: ITimeLog, t: Translate) {
	if (log.isBillable) {
		return t('pages.timesheet.BILLABLE.YES');
	}
	return t('pages.timesheet.BILLABLE.NO');
}

/**
 * The logs on screen as a CSV file, one row per log in the order they started: local day, start and end in 24-hour
 * time, member, project, task, status, billable and the duration as `h:mm`. Built on the click only.
 */
export function downloadTimesheetCsv(logs: ReadonlyArray<ITimeLog>, period: Period, t: Translate) {
	const rows = [...logs].sort((first, second) => startTimeValueOf(first) - startTimeValueOf(second));
	const columns: CsvColumn<ITimeLog>[] = [
		{ header: t('dashboard.timesheets.COLUMNS.DATE'), valueOf: dayOf },
		{ header: t('dashboard.timesheets.COLUMNS.START'), valueOf: startClockOf },
		{ header: t('dashboard.timesheets.COLUMNS.END'), valueOf: endClockOf },
		{ header: t('dashboard.timesheets.COLUMNS.MEMBER'), valueOf: (log) => log.employee?.fullName ?? '' },
		{ header: t('dashboard.timesheets.COLUMNS.PROJECT'), valueOf: (log) => log.project?.name ?? '' },
		{ header: t('dashboard.timesheets.COLUMNS.TASK'), valueOf: (log) => log.task?.title ?? '' },
		{ header: t('dashboard.timesheets.COLUMNS.STATUS'), valueOf: (log) => statusLabelOf(log, t) },
		{ header: t('dashboard.timesheets.COLUMNS.BILLABLE'), valueOf: (log) => billableLabelOf(log, t) },
		{ header: t('dashboard.timesheets.COLUMNS.DURATION'), valueOf: durationTextOf }
	];
	const fileName = periodFileNameOf(FILE_PREFIX, period.from, period.to, 'csv');
	downloadCsv(rows, columns, fileName);
}
