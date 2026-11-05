import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import {
	MONTH_ROW_GRID,
	WEEKDAY_COUNT,
	YEAR_CELL,
	YEAR_CELLS_GRID,
	YEAR_FIGURES_LINE,
	YEAR_MONTH_LABELS,
	YEAR_SCROLLER,
	YEAR_SURFACE_BODY
} from '@/core/components/activities/activity-year';
import { cn } from '@/core/lib/helpers';

const SKELETON_WEEKS = 53;

const SKELETON_DAY_COUNT = SKELETON_WEEKS * WEEKDAY_COUNT;

const SKELETON_DAYS = Array.from({ length: SKELETON_DAY_COUNT }, (_, index) => index);

const SKELETON_FIGURE_WIDTHS = ['w-16', 'w-10', 'w-14', 'w-20'];

const SKELETON_MONTHS = Array.from({ length: 12 }, (_, index) => index);

/** The year's figures, its grid of pulsing squares and its month rows, while the year loads under its header. */
export function ActivityCalendarBodySkeleton() {
	return (
		<div className="flex flex-col gap-5" aria-hidden="true">
			<div className={YEAR_FIGURES_LINE}>
				{SKELETON_FIGURE_WIDTHS.map((width) => (
					<div key={width} className="flex flex-col gap-2 py-0.5">
						<span className={cn('h-2.5 w-14', SKELETON_BAR)} />
						<span className={cn('h-3.5', width, SKELETON_BAR)} />
					</div>
				))}
			</div>
			<div className={YEAR_SCROLLER}>
				<div className="w-max">
					<div className={YEAR_MONTH_LABELS} />
					<div className="flex gap-1">
						<span className="w-8 shrink-0" />
						<div className={cn(YEAR_CELLS_GRID, 'animate-pulse')}>
							{SKELETON_DAYS.map((day) => (
								<span key={day} className={cn(YEAR_CELL, 'bg-foreground/[0.05]')} />
							))}
						</div>
					</div>
				</div>
			</div>
			<div className="flex flex-col">
				{SKELETON_MONTHS.map((month) => (
					<div key={month} className={MONTH_ROW_GRID}>
						<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
						<span className={cn('h-1 w-full max-sm:hidden', SKELETON_BAR)} />
						<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
						<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

/** The Stats card while its chunk or its data loads: the year and legend slots, then the body. */
export function ActivityCalendarSkeleton() {
	return (
		<div className={cn(DASHBOARD_SURFACE, YEAR_SURFACE_BODY)} aria-hidden="true">
			<div className="flex min-h-8 items-center justify-between gap-4">
				<span className={cn('h-4 w-12', SKELETON_BAR)} />
				<span className={cn('h-3 w-32', SKELETON_BAR)} />
			</div>
			<ActivityCalendarBodySkeleton />
		</div>
	);
}
