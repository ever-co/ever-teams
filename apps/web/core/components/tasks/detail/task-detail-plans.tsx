'use client';

import { useState } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations } from 'next-intl';
import { Calendar, ChevronDown } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { usePlanTaskForDay } from '@/core/hooks/daily-plans/use-plan-task-for-day';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskDailyPlans } from '@/core/hooks/tasks/use-task-daily-plans';
import { cn } from '@/core/lib/helpers';
import { nextPlannedDayOf, todayPlanDay, type PlannedMember } from '@/core/lib/utils/task-detail';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_GHOST_ACTION, DETAIL_MUTED_TEXT } from './task-detail-recipes';

const DAY_FORMAT = 'YYYY-MM-DD';

function dayOffsetOf(day: string, today: string) {
	return moment(day, DAY_FORMAT).diff(moment(today, DAY_FORMAT), 'days');
}

function usePlanDayLabel() {
	const t = useTranslations();
	const format = useFormatter();
	const today = todayPlanDay();
	return (day: string) => {
		const offset = dayOffsetOf(day, today);
		if (offset === 0) {
			return t('common.TODAY');
		}
		if (offset === 1) {
			return t('common.TOMORROW');
		}
		if (offset === -1) {
			return t('common.YESTERDAY');
		}
		const date = moment(day, DAY_FORMAT).toDate();
		return format.dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' });
	};
}

function DayChip({ day, isPast, label }: Readonly<{ day: string; isPast: boolean; label: string }>) {
	return (
		<time
			dateTime={day}
			className={cn(
				'inline-flex h-6 items-center rounded-md px-1.5 text-xs font-medium tabular-nums',
				isPast && 'text-muted-foreground',
				!isPast && 'bg-foreground/[0.04] text-foreground'
			)}
		>
			{label}
		</time>
	);
}

function PlannedMemberRow({ member }: Readonly<{ member: PlannedMember }>) {
	const t = useTranslations();
	const dayLabel = usePlanDayLabel();
	const [isOpen, setIsOpen] = useState(false);
	const today = todayPlanDay();
	const nextDay = nextPlannedDayOf(member.days, today);
	const lastDay = member.days.at(-1) ?? today;
	const otherCount = member.days.length - 1;
	const hasOtherDays = otherCount > 0;
	const person = { id: member.key, name: member.name, imageUrl: member.imageUrl };

	let summary: string = t('taskDetail.plans.LAST_PLANNED', { day: dayLabel(lastDay) });
	if (nextDay) {
		summary = dayLabel(nextDay);
	}

	return (
		<li className="flex flex-col">
			<div className="flex min-h-8 items-center gap-2">
				<PersonAvatar person={person} className="size-5 text-[9px] ring-0" />
				<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{member.name}</span>
				<span
					className={cn(
						'shrink-0 text-xs tabular-nums',
						nextDay && 'font-medium text-foreground',
						!nextDay && 'text-muted-foreground'
					)}
				>
					{summary}
				</span>
				{hasOtherDays && (
					<button
						type="button"
						aria-expanded={isOpen}
						onClick={() => setIsOpen((open) => !open)}
						className={cn(DETAIL_GHOST_ACTION, 'h-6 px-1.5 text-xs')}
					>
						{t('taskDetail.plans.MORE_DAYS', { count: otherCount })}
						<ChevronDown
							aria-hidden="true"
							className={cn('transition-transform duration-200', !isOpen && '-rotate-90')}
						/>
					</button>
				)}
			</div>
			<AnimatedHeight swapKey={String(isOpen)}>
				{isOpen && (
					<div className="flex flex-wrap gap-1 pt-1 pb-1.5 pl-7">
						{member.days.map((day) => (
							<DayChip key={day} day={day} isPast={day < today} label={dayLabel(day)} />
						))}
					</div>
				)}
			</AnimatedHeight>
		</li>
	);
}

function PlanForToday({ taskId }: Readonly<{ taskId: string }>) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const { planTaskForDay } = usePlanTaskForDay();
	const employeeId = user?.employee?.id ?? user?.employeeId ?? undefined;
	if (!employeeId) {
		return null;
	}
	return (
		<button
			type="button"
			onClick={() => planTaskForDay('today', taskId, employeeId)}
			className={cn(DETAIL_GHOST_ACTION, '-ml-2 w-fit')}
		>
			<Calendar aria-hidden="true" />
			{t('dailyPlan.PLAN_FOR_TODAY')}
		</button>
	);
}

export function TaskDetailPlans({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { members, isLoading, isError, refetch } = useTaskDailyPlans(task.id);
	const hasMembers = members.length > 0;
	const showsEmpty = !isLoading && !isError && !hasMembers;

	return (
		<div className="flex flex-col gap-1">
			{isLoading && <output className="h-8 w-full animate-pulse rounded-md bg-foreground/[0.04]" />}
			{isError && (
				<div className="flex items-center gap-2">
					<span className={DETAIL_MUTED_TEXT}>{t('taskDetail.plans.LOAD_FAILED')}</span>
					<button type="button" onClick={() => void refetch()} className={DETAIL_GHOST_ACTION}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</button>
				</div>
			)}
			{hasMembers && (
				<ul className="flex flex-col">
					{members.map((member) => (
						<PlannedMemberRow key={member.key} member={member} />
					))}
				</ul>
			)}
			{showsEmpty && (
				<>
					<span className={DETAIL_MUTED_TEXT}>{t('pages.taskDetails.TASK_NOT_PLANNED')}</span>
					<PlanForToday taskId={task.id} />
				</>
			)}
		</div>
	);
}
