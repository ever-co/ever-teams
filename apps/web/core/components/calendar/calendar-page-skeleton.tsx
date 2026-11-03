'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK, DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	calendarDaysOf,
	type CalendarDayPlan,
	DEFAULT_CALENDAR_VIEW,
	visibleRangeOf,
	weekStartOf
} from '@/core/lib/utils/calendar-view';
import { timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { CalendarMonthView } from './calendar-month-view';
import { CalendarLegend } from './calendar-toolbar';
import { CalendarWeekStrip } from './calendar-week-strip';
import type { EntryHandlers } from './calendar-entry-parts';

const ACTION_WIDTHS = ['w-24'];

const CONTROL_WIDTHS = ['w-30', 'w-40'];

const TRAILING_WIDTHS = ['w-44'];

const NO_PLANS = new Map<string, CalendarDayPlan>();

function doNothing() {
	return undefined;
}

const SKELETON_HANDLERS: EntryHandlers = {
	canEdit: () => false,
	onEdit: doNothing,
	onDelete: doNothing
};

/** The Calendar while it loads: the toolbar on its real rows and this month's grid with pale cells. */
export function CalendarPageSkeleton() {
	const t = useTranslations();
	const locale = useLocale();
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);
	const anchor = useMemo(() => new Date(), []);
	const weekStartsOn = weekStartOf(null);
	const days = useMemo(() => {
		const range = visibleRangeOf(DEFAULT_CALENDAR_VIEW, anchor, weekStartsOn);
		return calendarDaysOf(range, [], NO_PLANS);
	}, [anchor, weekStartsOn]);
	const todayKey = localDayKeyOf(anchor);
	const today = days.find((day) => day.key === todayKey) ?? null;

	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('common.CALENDAR')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<section className={DASHBOARD_SURFACE}>
					<div className="flex min-h-11 items-center justify-end hairline-b border-border px-4 py-2">
						<CalendarLegend />
					</div>
					<div className="max-sm:hidden">
						<CalendarMonthView
							days={days}
							anchor={anchor}
							formatters={formatters}
							isLoading
							onOpenDay={doNothing}
						/>
					</div>
					<div className="sm:hidden">
						<CalendarWeekStrip
							days={days}
							selectedDay={today}
							weekStartsOn={weekStartsOn}
							formatters={formatters}
							handlers={SKELETON_HANDLERS}
							isLoading
							onSelectDay={doNothing}
							onAddTime={doNothing}
						/>
					</div>
				</section>
			</div>
		</PageSkeletonFrame>
	);
}
