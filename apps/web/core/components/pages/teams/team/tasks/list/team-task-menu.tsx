'use client';

import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut
} from '@/core/components/common/dropdown-menu';
import {
	Calendar,
	Copy,
	ExternalLink,
	FileText,
	Link,
	Star,
	Tag,
	UserAdd,
	UserRemove,
	Users
} from '@/core/components/icons';
import { TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { isTaskAssignee } from '@/core/components/tasks/task-assignee-items';
import { useTeamMemberMutations } from '@/core/hooks';
import { useFavoriteTasks } from '@/core/hooks/tasks/use-favorites-task';
import { usePlanTaskForDay } from '@/core/hooks/daily-plans/use-plan-task-for-day';
import { useTaskMenuActions } from '@/core/hooks/tasks/use-task-menu-actions';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { activeTeamState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TeamTaskPickerKind } from './team-tasks-list-context';

/** A point on screen for a right click, or the "..." button: what the menu opens against. */
export type TeamTaskMenuAnchor = Element | { getBoundingClientRect: () => DOMRect };

export interface TeamTaskMenuTarget {
	taskId: string;
	anchor: TeamTaskMenuAnchor;
}

interface TeamTaskMenuProps {
	target: TeamTaskMenuTarget | null;
	isOpen: boolean;
	task: TTask | undefined;
	fallbackStatusId: string | undefined;
	onOpenChange: (isOpen: boolean) => void;
	onClosed: () => void;
	onOpenTask: (taskId: string) => void;
	onEdit: (kind: TeamTaskPickerKind, taskId: string) => void;
	onPlanSomeDay: (taskId: string) => void;
}

function favoriteLabelKey(isFavorite: boolean) {
	if (isFavorite) {
		return 'common.REMOVE_FAVORITE_TASK' as const;
	}
	return 'common.ADD_FAVORITE_TASK' as const;
}

function placeholderGlyph(kind: 'status' | 'priority' | 'size' | 'issueType') {
	return <TaskPropertyPlaceholderIcon kind={kind} />;
}

/**
 * The single action menu of the list, opened by a row's "..." or by a right click on the row. Its items, and the
 * mutation hooks behind them, mount only while it is open.
 */
export function TeamTaskMenu({
	target,
	isOpen,
	task,
	fallbackStatusId,
	onOpenChange,
	onClosed,
	onOpenTask,
	onEdit,
	onPlanSomeDay
}: Readonly<TeamTaskMenuProps>) {
	const handleOpenChangeComplete = (open: boolean) => {
		if (!open) {
			onClosed();
		}
	};
	const showsItems = isOpen && Boolean(task);
	return (
		<DropdownMenu open={isOpen} onOpenChange={onOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
			<DropdownMenuContent anchor={target?.anchor} align="start" sideOffset={4} className="w-60">
				{showsItems && (
					<TeamTaskMenuItems
						task={task as TTask}
						fallbackStatusId={fallbackStatusId}
						onOpenTask={onOpenTask}
						onEdit={onEdit}
						onPlanSomeDay={onPlanSomeDay}
					/>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TeamTaskMenuItems({
	task,
	fallbackStatusId,
	onOpenTask,
	onEdit,
	onPlanSomeDay
}: Readonly<{
	task: TTask;
	fallbackStatusId: string | undefined;
	onOpenTask: (taskId: string) => void;
	onEdit: (kind: TeamTaskPickerKind, taskId: string) => void;
	onPlanSomeDay: (taskId: string) => void;
}>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const members = activeTeam?.members ?? [];
	const currentMember = members.find((member) => member.employee?.userId === user?.id);
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';
	const { assignTask, unassignTask } = useTeamMemberMutations(currentMember);
	const { toggleFavoriteTask, isFavoriteTask } = useFavoriteTasks();
	const { planTaskForDay } = usePlanTaskForDay();
	const { copyTaskLink, copyTaskId, makeCopy } = useTaskMenuActions();

	const isAssignedToMe = isTaskAssignee(task, currentMember);
	const hasCurrentMember = Boolean(currentMember);
	const showsAssignToMe = hasCurrentMember && !isAssignedToMe;
	const showsUnassignMe = hasCurrentMember && isAssignedToMe;
	const isFavorite = isFavoriteTask(task.id);
	const openInNewTab = () => window.open(`/task/${task.id}`, '_blank', 'noopener');

	return (
		<>
			<DropdownMenuItem onClick={() => onOpenTask(task.id)}>
				<FileText />
				{t('common.TASK_DETAILS')}
				<DropdownMenuShortcut>↵</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={openInNewTab}>
				<ExternalLink />
				{t('pages.teamTasks.OPEN_IN_NEW_TAB')}
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => onEdit('status', task.id)}>
				{placeholderGlyph('status')}
				{t('taskMenus.search.status')}
				<DropdownMenuShortcut>S</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('priority', task.id)}>
				{placeholderGlyph('priority')}
				{t('taskMenus.search.priority')}
				<DropdownMenuShortcut>P</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('size', task.id)}>
				{placeholderGlyph('size')}
				{t('taskMenus.search.size')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('issueType', task.id)}>
				{placeholderGlyph('issueType')}
				{t('taskMenus.search.issueType')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('labels', task.id)}>
				<Tag />
				{t('taskMenus.search.label')}
				<DropdownMenuShortcut>L</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('assignees', task.id)}>
				<Users />
				{t('pages.teamTasks.ASSIGN_TO')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => onEdit('dueDate', task.id)}>
				<Calendar />
				{t('pages.teamTasks.SET_DUE_DATE')}
				<DropdownMenuShortcut>D</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			{showsAssignToMe && (
				<DropdownMenuItem onClick={() => assignTask(task)}>
					<UserAdd />
					{t('common.ASSIGN_TASK_TO_ME')}
				</DropdownMenuItem>
			)}
			{showsUnassignMe && (
				<DropdownMenuItem onClick={() => unassignTask(task)}>
					<UserRemove />
					{t('common.UNASSIGN_TASK_FROM_ME')}
				</DropdownMenuItem>
			)}
			<DropdownMenuItem onClick={() => toggleFavoriteTask(task)}>
				<Star />
				{t(favoriteLabelKey(isFavorite))}
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
			<DropdownMenuItem onClick={() => onPlanSomeDay(task.id)}>
				<Calendar />
				{t('dailyPlan.PLAN_FOR_SOME_DAY')}
			</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={() => copyTaskLink(task)}>
				<Link />
				{t('common.COPY_ISSUE_LINK')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => copyTaskId(task)}>
				<Copy />
				{t('common.COPY_TASK_ID')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={() => makeCopy(task, fallbackStatusId)}>
				<Copy />
				{t('common.MAKE_A_COPY')}
			</DropdownMenuItem>
		</>
	);
}
