'use client';

import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { controlGroupRecipe } from '@/core/components/common/input';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { Search, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { Period, PeriodPresetKey } from '@/core/lib/utils/dashboard-period';
import { TIMESHEET_WEEK_START, type TimesheetView } from '@/core/lib/utils/dashboards/timesheets';

const SEARCH_DEBOUNCE_MS = 150;

/** The presets of the old date filter that a timesheet review needs, today first as before. */
const TIMESHEET_PRESETS: ReadonlyArray<PeriodPresetKey> = [
	'today',
	'yesterday',
	'thisWeek',
	'lastWeek',
	'last7Days',
	'thisMonth',
	'lastMonth'
];

function TimesheetsSearchField({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
	const t = useTranslations();
	const [draft, setDraft] = useState(value);
	const [lastValue, setLastValue] = useState(value);

	if (value !== lastValue) {
		setLastValue(value);
		setDraft(value);
	}

	useEffect(() => {
		const isPending = draft !== value;
		if (!isPending) {
			return;
		}
		const timeout = window.setTimeout(() => onChange(draft), SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timeout);
	}, [draft, onChange, value]);

	const hasDraft = draft.length > 0;
	const placeholder = t('dashboard.timesheets.SEARCH_PLACEHOLDER');

	return (
		<label className={cn(controlGroupRecipe, 'h-8 w-full gap-2 bg-card px-2.5 sm:w-64')}>
			<Search className="size-4 shrink-0 text-muted-foreground" />
			<input
				type="search"
				value={draft}
				onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75 [&::-webkit-search-cancel-button]:hidden"
			/>
			{hasDraft && (
				<button
					type="button"
					aria-label={t('dashboard.timesheets.CLEAR_SEARCH')}
					onClick={() => setDraft('')}
					className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<X className="size-3.5" />
				</button>
			)}
		</label>
	);
}

/**
 * The toolbar band of the page: title and its figures with Export and Add time on the first row; the period, the
 * filter menu and the search on the second, the Sheet / List / Week / Month switch at its right; the applied
 * filters under it only when there are some.
 */
export function TimesheetsToolbar({
	title,
	meta,
	isMetaLoading,
	isUpdating,
	period,
	onPeriodChange,
	view,
	onViewChange,
	search,
	onSearchChange,
	filterMenu,
	appliedFilters,
	actions
}: Readonly<{
	title: string;
	meta: string;
	isMetaLoading: boolean;
	isUpdating: boolean;
	period: Period;
	onPeriodChange: (period: Period) => void;
	view: TimesheetView;
	onViewChange: (view: TimesheetView) => void;
	search: string;
	onSearchChange: (value: string) => void;
	filterMenu: ReactNode;
	appliedFilters: ReactNode;
	actions: ReactNode;
}>) {
	const t = useTranslations();
	const viewItems = [
		{ value: 'sheet' as const, label: t('dashboard.timesheets.VIEWS.SHEET') },
		{ value: 'list' as const, label: t('dashboard.timesheets.VIEWS.LIST') },
		{ value: 'week' as const, label: t('dashboard.timesheets.VIEWS.WEEK') },
		{ value: 'month' as const, label: t('dashboard.timesheets.VIEWS.MONTH') },
		{ value: 'screenshots' as const, label: t('dashboard.timesheets.VIEWS.SCREENSHOTS') }
	];

	return (
		<DashboardToolbar
			title={title}
			meta={meta}
			isMetaLoading={isMetaLoading}
			isUpdating={isUpdating}
			updatingLabel={t('dashboard.timesheets.UPDATING')}
			actions={actions}
			controls={
				<>
					<PeriodPicker
						value={period}
						onChange={onPeriodChange}
						presets={TIMESHEET_PRESETS}
						weekStartsOn={TIMESHEET_WEEK_START}
					/>
					{filterMenu}
					<TimesheetsSearchField value={search} onChange={onSearchChange} />
				</>
			}
			trailingControls={
				<SegmentedControl<TimesheetView>
					items={viewItems}
					value={view}
					onValueChange={onViewChange}
					ariaLabel={t('dashboard.timesheets.VIEW_LABEL')}
				/>
			}
			belowControls={appliedFilters}
		/>
	);
}
