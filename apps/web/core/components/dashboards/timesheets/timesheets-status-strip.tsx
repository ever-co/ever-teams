'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	ALL_STATUSES,
	type StatusSummary,
	TIMESHEET_STATUS_ORDER,
	type TimesheetStatusFilter
} from '@/core/lib/utils/dashboards/timesheets';
import { STATUS_LABEL_KEYS, TimesheetStatusGlyph } from './timesheet-status';

const STRIP_KEYS: ReadonlyArray<TimesheetStatusFilter> = [ALL_STATUSES, ...TIMESHEET_STATUS_ORDER];

const MISSING_VALUE = '–';

function StatusCount({ status, count }: Readonly<{ status: TimesheetStatusFilter; count: number }>) {
	const isAll = status === ALL_STATUSES;
	return (
		<span className="inline-flex items-center gap-2">
			{!isAll && <TimesheetStatusGlyph status={status} className="size-4" />}
			<span>{count}</span>
		</span>
	);
}

/**
 * The status filter written as figures: each status with its number of logs and their time over the whole period
 * (after the search and the filters), the picked one underlined. Picking narrows the list in place.
 */
export function TimesheetsStatusStrip({
	summary,
	selected,
	onSelect,
	isLoading,
	isUnavailable
}: Readonly<{
	summary: StatusSummary;
	selected: TimesheetStatusFilter;
	onSelect: (status: TimesheetStatusFilter) => void;
	isLoading: boolean;
	/** The logs could not be read: the figures say "–" rather than a zero nobody returned. */
	isUnavailable: boolean;
}>) {
	const t = useTranslations();
	const items = useMemo<MetricItem<TimesheetStatusFilter>[]>(
		() =>
			STRIP_KEYS.map((key) => {
				const label = t(STATUS_LABEL_KEYS[key]);
				if (isUnavailable) {
					return { key, label, value: MISSING_VALUE };
				}
				return {
					key,
					label,
					value: <StatusCount status={key} count={summary[key].count} />,
					hint: formatDurationShort(summary[key].seconds)
				};
			}),
		[isUnavailable, summary, t]
	);
	return (
		<MetricStrip<TimesheetStatusFilter>
			items={items}
			ariaLabel={t('dashboard.timesheets.STATUS_STRIP_LABEL')}
			isLoading={isLoading}
			selectedKey={selected}
			onSelect={onSelect}
		/>
	);
}
