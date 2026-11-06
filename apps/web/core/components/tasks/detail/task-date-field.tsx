'use client';

import { useState } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Plus, X } from '@/core/components/icons';
import { Calendar } from '@/core/components/common/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { MENU_ROW_RECIPE } from '@/core/components/tasks/task-property-menu';
import { useUpdateTask } from '@/core/hooks/organizations/teams/use-update-task';
import { useTaskQueries } from '@/core/hooks/organizations/teams/use-task-queries';
import { cn } from '@/core/lib/helpers';
import { acceptsDueDate, acceptsStartDate, daysUntilDue } from '@/core/lib/utils/task-detail';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_EMPTY_VALUE } from './task-detail-recipes';

type TaskDateKind = 'start' | 'due';

type Preset = 'today' | 'tomorrow' | 'endOfWeek' | 'inOneWeek';

const PRESETS: Preset[] = ['today', 'tomorrow', 'endOfWeek', 'inOneWeek'];

const FRIDAY = 5;

const DAYS_IN_WEEK = 7;

const VALUE_TRIGGER =
	'inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 -ml-1.5 text-[13px] font-medium tabular-nums text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-expanded:bg-foreground/5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

function daysUntilFriday(today: moment.Moment) {
	const weekday = today.isoWeekday();
	if (weekday <= FRIDAY) {
		return FRIDAY - weekday;
	}
	return DAYS_IN_WEEK - weekday + FRIDAY;
}

function presetDate(preset: Preset) {
	const today = moment().startOf('day');
	if (preset === 'tomorrow') {
		return today.add(1, 'day').toDate();
	}
	if (preset === 'endOfWeek') {
		return today.add(daysUntilFriday(today), 'day').toDate();
	}
	if (preset === 'inOneWeek') {
		return today.add(DAYS_IN_WEEK, 'day').toDate();
	}
	return today.toDate();
}

const PRESET_LABEL_KEYS = {
	today: 'common.TODAY',
	tomorrow: 'common.TOMORROW',
	endOfWeek: 'taskDetail.dates.END_OF_WEEK',
	inOneWeek: 'taskDetail.dates.IN_ONE_WEEK'
} as const;

const REFUSED_DATE_KEYS = {
	start: 'taskDetail.dates.START_AFTER_DUE',
	due: 'taskDetail.dates.DUE_BEFORE_START'
} as const;

const DATE_LABEL_KEYS = {
	start: 'pages.taskDetails.START_DATE',
	due: 'pages.taskDetails.DUE_DATE'
} as const;

function dateChangesOf(kind: TaskDateKind, picked: Date | null): Partial<TTask> {
	if (kind === 'start') {
		return { startDate: picked };
	}
	return { dueDate: picked };
}

function asDate(value: Date | string | null) {
	if (!value) {
		return null;
	}
	return new Date(value);
}

function dateValueOf(task: TTask, kind: TaskDateKind) {
	if (kind === 'start') {
		return task.startDate ?? null;
	}
	return task.dueDate ?? null;
}

function isSameYear(date: Date) {
	return date.getFullYear() === new Date().getFullYear();
}

function useShortDate() {
	const format = useFormatter();
	return (value: Date) => {
		if (isSameYear(value)) {
			return format.dateTime(value, { weekday: 'short', day: 'numeric', month: 'short' });
		}
		return format.dateTime(value, { day: 'numeric', month: 'short', year: 'numeric' });
	};
}

function DueHint({ dueDate }: Readonly<{ dueDate: Date | string }>) {
	const t = useTranslations();
	const days = daysUntilDue(dueDate);
	if (days === null) {
		return null;
	}
	if (days < 0) {
		const lateDays = Math.abs(days);
		return <span className="text-xs text-destructive-ink">{t('taskDetail.dates.LATE', { count: lateDays })}</span>;
	}
	if (days === 0) {
		return <span className="text-xs text-warning-foreground">{t('taskDetail.dates.DUE_TODAY')}</span>;
	}
	return <span className="text-xs text-muted-foreground">{t('taskDetail.dates.DUE_IN', { count: days })}</span>;
}

export function TaskDateField({ task, kind }: Readonly<{ task: TTask; kind: TaskDateKind }>) {
	const t = useTranslations();
	const shortDate = useShortDate();
	const { updateTask } = useUpdateTask();
	const { getTaskById } = useTaskQueries();
	const [open, setOpen] = useState(false);
	const value = dateValueOf(task, kind);
	const date = asDate(value);
	const isDue = kind === 'due';
	let dueHintDate: Date | null = null;
	if (isDue) {
		dueHintDate = date;
	}

	const isAccepted = (picked: Date) => {
		if (kind === 'start') {
			return acceptsStartDate(picked, task.dueDate);
		}
		return acceptsDueDate(picked, task.startDate);
	};

	const save = async (picked: Date | null) => {
		setOpen(false);
		const changes = dateChangesOf(kind, picked);
		try {
			await updateTask({ ...task, ...changes, id: task.id });
		} catch {
			toast.error(t('toasts.tasks.PROPERTY_UPDATE_FAILED', { field: t(DATE_LABEL_KEYS[kind]) }));
			getTaskById(task.id);
		}
	};

	const pick = (picked: Date | undefined) => {
		if (!picked) {
			return;
		}
		if (!isAccepted(picked)) {
			toast.warning(t(REFUSED_DATE_KEYS[kind]));
			return;
		}
		void save(picked);
	};

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={t(DATE_LABEL_KEYS[kind])}
						className={cn(date && VALUE_TRIGGER, !date && DETAIL_EMPTY_VALUE)}
					>
						{date && (
							<>
								<CalendarIcon aria-hidden="true" />
								{shortDate(date)}
							</>
						)}
						{!date && (
							<>
								<Plus aria-hidden="true" />
								{t('taskDetail.dates.ADD_DATE')}
							</>
						)}
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-1">
					<div className="flex flex-col">
						{PRESETS.map((preset) => {
							const presetDay = presetDate(preset);
							return (
								<button
									key={preset}
									type="button"
									onClick={() => pick(presetDay)}
									className={cn(
										MENU_ROW_RECIPE,
										'hover:bg-foreground/5 focus-visible:bg-foreground/5'
									)}
								>
									<span className="flex-1 text-left">{t(PRESET_LABEL_KEYS[preset])}</span>
									<span className="text-xs tabular-nums text-muted-foreground">
										{shortDate(presetDay)}
									</span>
								</button>
							);
						})}
					</div>
					<div className="my-1 hairline-t border-border" />
					<Calendar
						mode="single"
						selected={date ?? undefined}
						onSelect={pick}
						defaultMonth={date ?? undefined}
					/>
					{date && (
						<>
							<div className="my-1 hairline-t border-border" />
							<button
								type="button"
								onClick={() => void save(null)}
								className={cn(
									MENU_ROW_RECIPE,
									'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
								)}
							>
								<X aria-hidden="true" className="size-4" />
								<span>{t('taskDetail.dates.CLEAR')}</span>
							</button>
						</>
					)}
				</PopoverContent>
			</Popover>
			{dueHintDate && <DueHint dueDate={dueHintDate} />}
		</>
	);
}
