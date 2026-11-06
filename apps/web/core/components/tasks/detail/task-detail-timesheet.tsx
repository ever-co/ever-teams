'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { UserTaskActivity } from '@/core/components/tasks/user-task-activity';
import { useTaskTimeSheets } from '@/core/hooks/tasks/use-task-activity';
import { cn } from '@/core/lib/helpers';
import { groupByTime } from '@/core/lib/helpers/array-data';
import { DETAIL_ICON_ACTION, DETAIL_MUTED_TEXT, DETAIL_SECTION_TITLE } from './task-detail-recipes';

function TimesheetEntries({ taskId }: Readonly<{ taskId: string }>) {
	const t = useTranslations();
	const { getTaskTimesheets, loading } = useTaskTimeSheets(taskId);
	if (loading) {
		return <div className="h-16 animate-pulse rounded-xl bg-foreground/[0.04]" aria-busy="true" />;
	}
	const days = groupByTime(getTaskTimesheets());
	if (days.length === 0) {
		return <p className={DETAIL_MUTED_TEXT}>{t('pages.taskDetails.NO_ACTIVITY')}</p>;
	}
	return (
		<div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
			{days.map((day) => (
				<div key={day.date} className="flex flex-col gap-1">
					<h3 className="text-xs font-medium tabular-nums text-muted-foreground">{day.date}</h3>
					<div className="flex flex-col hairline-divide-y divide-border">
						{day.items.map((item) => (
							<UserTaskActivity key={item.id} timesheet={item} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export function TaskDetailTimesheet({ taskId }: Readonly<{ taskId: string }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const contentId = useId();
	return (
		<section className="flex flex-col gap-2.5">
			<div className="flex min-h-7 items-center justify-between gap-2">
				<h2 className={DETAIL_SECTION_TITLE}>{t('common.timesheets.SINGULAR')}</h2>
				<button
					type="button"
					aria-expanded={isOpen}
					aria-controls={contentId}
					aria-label={t('common.timesheets.SINGULAR')}
					onClick={() => setIsOpen((open) => !open)}
					className={DETAIL_ICON_ACTION}
				>
					<ChevronDown
						aria-hidden="true"
						className={cn('transition-transform duration-200', !isOpen && '-rotate-90')}
					/>
				</button>
			</div>
			<AnimatedHeight swapKey={String(isOpen)}>
				{isOpen && (
					<div id={contentId}>
						<TimesheetEntries taskId={taskId} />
					</div>
				)}
			</AnimatedHeight>
		</section>
	);
}
