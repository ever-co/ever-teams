'use client';

import { useTranslations } from 'next-intl';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { CalendarProjectTotal } from '@/core/lib/utils/calendar-view';
import { ProjectDot } from './calendar-entry-parts';

const WITHOUT_PROJECT_ITEM_KEY = 'without-project';

function ProjectTotal({ total }: Readonly<{ total: CalendarProjectTotal }>) {
	const t = useTranslations();
	const name = total.name ?? t('dashboard.timesheets.NO_PROJECT');
	const duration = formatDurationShort(total.seconds);
	return (
		<li className="flex min-w-0 items-center gap-1.5 text-xs">
			<ProjectDot color={total.color} projectKey={total.key} />
			<span className="max-w-40 truncate text-foreground">{name}</span>
			<span className="shrink-0 tabular-nums text-muted-foreground">{duration}</span>
		</li>
	);
}

/**
 * The projects of the days shown, each with the colour its blocks are drawn in and the time it took, the largest
 * first: the legend of the colours, and where the range went. Nothing is drawn for a range without time.
 */
export function CalendarProjectLegend({ totals }: Readonly<{ totals: ReadonlyArray<CalendarProjectTotal> }>) {
	const t = useTranslations();
	if (totals.length === 0) {
		return null;
	}
	return (
		<ul
			aria-label={t('dashboard.calendar.PROJECTS_LABEL')}
			className="flex max-h-19 flex-wrap items-center gap-x-4 gap-y-1.5 overflow-y-auto hairline-b border-border px-4 py-2 custom-scrollbar"
		>
			{totals.map((total) => (
				<ProjectTotal key={total.key ?? WITHOUT_PROJECT_ITEM_KEY} total={total} />
			))}
		</ul>
	);
}
