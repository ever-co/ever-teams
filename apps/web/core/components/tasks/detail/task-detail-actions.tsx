'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Copy,
	Link as LinkIcon,
	MoreHorizontal,
	Star,
	UserAdd,
	UserRemove
} from '@/core/components/icons';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { CreateDailyPlanFormModal } from '@/core/components/features/daily-plan/create-daily-plan-form-modal';
import { TaskCardTimerButton, TaskTimerController } from '@/core/components/tasks/task-card';
import { usePlanTaskForDay } from '@/core/hooks/daily-plans/use-plan-task-for-day';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { useTaskMenuActions } from '@/core/hooks/tasks/use-task-menu-actions';
import { useTaskPagerKeys } from '@/core/hooks/tasks/use-task-pager-keys';
import { useTaskSelfAssignment } from '@/core/hooks/tasks/use-task-self-assignment';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { cn } from '@/core/lib/helpers';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_ICON_ACTION } from './task-detail-recipes';
import { taskNumberOf } from './task-picker-menu';

function IconAction({
	label,
	onClick,
	disabled = false,
	pressed,
	className,
	children
}: Readonly<{
	label: string;
	onClick: () => void;
	disabled?: boolean;
	pressed?: boolean;
	className?: string;
	children: ReactNode;
}>) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						aria-pressed={pressed}
						disabled={disabled}
						onClick={onClick}
						className={cn(DETAIL_ICON_ACTION, className)}
					>
						{children}
					</button>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function TaskFavoriteButton({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { isFavoriteTask, toggleFavoriteTask, addTaskToFavoriteLoading, deleteTaskFromFavoritesLoading } =
		useFavoriteTasks();
	const isFavorite = isFavoriteTask(task.id);
	const isSaving = addTaskToFavoriteLoading || deleteTaskFromFavoritesLoading;
	let label = t('common.ADD_FAVORITE_TASK');
	if (isFavorite) {
		label = t('common.REMOVE_FAVORITE_TASK');
	}
	return (
		<IconAction
			label={label}
			pressed={isFavorite}
			disabled={isSaving}
			onClick={() => toggleFavoriteTask(task)}
			className={cn(isFavorite && 'text-warning [&_path]:fill-current')}
		>
			<Star aria-hidden="true" />
		</IconAction>
	);
}

export function TaskCopyLinkButton({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { copyTaskLink } = useTaskMenuActions();
	return (
		<IconAction label={t('common.COPY_ISSUE_LINK')} onClick={() => void copyTaskLink(task)}>
			<LinkIcon aria-hidden="true" />
		</IconAction>
	);
}

export function TaskNumberButton({ task, className }: Readonly<{ task: TTask; className?: string }>) {
	const t = useTranslations();
	const { copyText } = useTaskMenuActions();
	const number = taskNumberOf(task);
	if (!number) {
		return null;
	}
	const label = t('taskDetail.header.COPY_NUMBER', { number });
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						onClick={() => void copyText(number)}
						className={cn(
							'inline-flex h-7 shrink-0 items-center rounded-md px-1.5 text-[13px] font-medium tabular-nums text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
							className
						)}
					>
						#{number}
					</button>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

interface PagerProps {
	previousId: string | null;
	nextId: string | null;
	position: number;
	total: number;
	onNavigate: (taskId: string) => void;
	keysEnabled?: boolean;
}

export function TaskDetailPager({ previousId, nextId, position, total, onNavigate, keysEnabled = true }: PagerProps) {
	const t = useTranslations();
	const pagerRef = useRef<HTMLDivElement>(null);
	useTaskPagerKeys({ previousId, nextId, onNavigate, enabled: keysEnabled, hostRef: pagerRef });
	const hasSiblings = total > 1;

	const showPrevious = () => {
		if (previousId) {
			onNavigate(previousId);
		}
	};

	const showNext = () => {
		if (nextId) {
			onNavigate(nextId);
		}
	};

	if (!hasSiblings) {
		return null;
	}
	return (
		<div ref={pagerRef} className="flex items-center gap-0.5">
			<span className="pr-1 text-xs tabular-nums text-muted-foreground">
				{position} / {total}
			</span>
			<IconAction
				label={t('taskDetail.header.PREVIOUS', { key: 'K' })}
				disabled={!previousId}
				onClick={showPrevious}
			>
				<ChevronUp aria-hidden="true" />
			</IconAction>
			<IconAction label={t('taskDetail.header.NEXT', { key: 'J' })} disabled={!nextId} onClick={showNext}>
				<ChevronDown aria-hidden="true" />
			</IconAction>
		</div>
	);
}

/** The task cards' controller, so starting here runs the same daily plan checks. */
export function TaskDetailTimerButton({ task }: Readonly<{ task: TTask }>) {
	return (
		<TaskTimerController task={task}>
			<TaskCardTimerButton className="size-8" />
		</TaskTimerController>
	);
}

function TaskDetailMenuItems({ task, onPlanSomeDay }: Readonly<{ task: TTask; onPlanSomeDay: () => void }>) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const { copyText, copyTaskLink, copyTaskId, makeCopy } = useTaskMenuActions();
	const { planTaskForDay } = usePlanTaskForDay();
	const { taskStatuses } = useTaskStatusesQuery();
	const { currentMember, isAssignedToMe, assignMe, unassignMe } = useTaskSelfAssignment(task);
	const employeeId = user?.employee?.id ?? user?.employeeId ?? undefined;
	const number = taskNumberOf(task);
	const hasCurrentMember = Boolean(currentMember);
	const showsAssignMe = hasCurrentMember && !isAssignedToMe;
	const showsUnassignMe = hasCurrentMember && isAssignedToMe;

	return (
		<>
			<DropdownMenuItem onClick={() => void copyTaskLink(task)}>
				<LinkIcon />
				{t('common.COPY_ISSUE_LINK')}
			</DropdownMenuItem>
			{number && (
				<DropdownMenuItem onClick={() => void copyText(number)}>
					<Copy />
					{t('taskDetail.header.COPY_NUMBER', { number })}
				</DropdownMenuItem>
			)}
			<DropdownMenuItem onClick={() => void copyText(task.title)}>
				<Copy />
				{t('pages.taskDetails.COPY_TITLE')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => void copyTaskId(task)}>
				<Copy />
				{t('taskDetail.header.COPY_ID')}
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => planTaskForDay('today', task.id, employeeId)}>
				<Calendar />
				{t('dailyPlan.PLAN_FOR_TODAY')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => planTaskForDay('tomorrow', task.id, employeeId)}>
				<Calendar />
				{t('dailyPlan.PLAN_FOR_TOMORROW')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={onPlanSomeDay}>
				<Calendar />
				{t('dailyPlan.PLAN_FOR_SOME_DAY')}
			</DropdownMenuItem>
			{hasCurrentMember && <DropdownMenuSeparator />}
			{showsAssignMe && (
				<DropdownMenuItem onClick={() => void assignMe()}>
					<UserAdd />
					{t('common.ASSIGN_TASK_TO_ME')}
				</DropdownMenuItem>
			)}
			{showsUnassignMe && (
				<DropdownMenuItem onClick={() => void unassignMe()}>
					<UserRemove />
					{t('common.UNASSIGN_TASK_FROM_ME')}
				</DropdownMenuItem>
			)}
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => void makeCopy(task, taskStatuses[0]?.id)}>
				<Copy />
				{t('common.MAKE_A_COPY')}
			</DropdownMenuItem>
		</>
	);
}

export function TaskDetailActionsMenu({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const [isOpen, setIsOpen] = useState(false);
	const [isPlanning, setIsPlanning] = useState(false);
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger aria-label={t('common.MORE_OPTIONS')} className={DETAIL_ICON_ACTION}>
					<MoreHorizontal aria-hidden="true" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-60">
					{isOpen && <TaskDetailMenuItems task={task} onPlanSomeDay={() => setIsPlanning(true)} />}
				</DropdownMenuContent>
			</DropdownMenu>
			{isPlanning && (
				<CreateDailyPlanFormModal
					open={isPlanning}
					closeModal={() => setIsPlanning(false)}
					taskId={task.id}
					employeeId={employeeId}
					planMode={EDailyPlanMode.CUSTOM}
					chooseMember={true}
				/>
			)}
		</>
	);
}
