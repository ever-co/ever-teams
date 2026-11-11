'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	ArrowRight,
	Calendar,
	Copy,
	ExternalLink,
	Link,
	MoreHorizontal,
	Pencil,
	UserAdd,
	UserRemove,
	Users
} from '@/core/components/icons';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { CreateDailyPlanFormModal } from '@/core/components/features/daily-plan/create-daily-plan-form-modal';
import { useTeamMemberMutations } from '@/core/hooks';
import { useTaskMenuActions } from '@/core/hooks/tasks/use-task-menu-actions';
import { usePlanTaskForDay } from '@/core/hooks/daily-plans/use-plan-task-for-day';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useKanbanBoardContext, useKanbanBoardMembers } from './kanban-board-context';
import { isTaskAssignee, TaskAssigneeMenuItem } from '@/core/components/tasks/task-assignee-items';

const AT_LANE_END = Number.MAX_SAFE_INTEGER;

/**
 * The "..." menu of a card. The trigger is all an idle card renders; the content, and the mutation hooks it needs,
 * mount only while the menu is open.
 */
export function KanbanTaskMenu({ task, onRename }: Readonly<{ task: TTask; onRename: () => void }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id ?? user?.employeeId ?? '';

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t('common.MORE_OPTIONS')}
						className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
					>
						<MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-56">
					{isOpen && (
						<KanbanTaskMenuItems
							task={task}
							employeeId={employeeId}
							onRename={onRename}
							onPlanSomeDay={() => setIsPlanModalOpen(true)}
						/>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{isPlanModalOpen && (
				<CreateDailyPlanFormModal
					open={isPlanModalOpen}
					closeModal={() => setIsPlanModalOpen(false)}
					taskId={task.id}
					employeeId={employeeId}
					planMode={EDailyPlanMode.CUSTOM}
					chooseMember={true}
				/>
			)}
		</>
	);
}

function KanbanTaskMenuItems({
	task,
	employeeId,
	onRename,
	onPlanSomeDay
}: Readonly<{ task: TTask; employeeId: string; onRename: () => void; onPlanSomeDay: () => void }>) {
	const t = useTranslations();
	const router = useRouter();
	const { statuses, moveTask } = useKanbanBoardContext();
	const { currentMember, teamMembers } = useKanbanBoardMembers();
	const { assignTask, unassignTask } = useTeamMemberMutations(currentMember);
	const { planTaskForDay } = usePlanTaskForDay();
	const { copyTaskLink, copyTaskId, makeCopy } = useTaskMenuActions();

	const isAssignedToMe = isTaskAssignee(task, currentMember);
	const hasCurrentMember = Boolean(currentMember);
	const showsAssignToMe = hasCurrentMember && !isAssignedToMe;
	const showsUnassignMe = hasCurrentMember && isAssignedToMe;
	const fallbackStatusId = statuses[0]?.id;

	return (
		<>
			<DropdownMenuItem onClick={() => router.push(`/task/${task.id}`)}>
				<ExternalLink />
				{t('common.OPEN')}
			</DropdownMenuItem>
			<DropdownMenuItem onClick={onRename}>
				<Pencil />
				{t('common.EDIT_TASK')}
			</DropdownMenuItem>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<ArrowRight />
					{t('common.MOVE_TO')}
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent className="max-h-80 w-52">
					{statuses.map((status) => (
						<MoveToItem key={status.id} task={task} status={status} onMove={moveTask} />
					))}
				</DropdownMenuSubContent>
			</DropdownMenuSub>
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
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Users />
					{t('common.ASSIGNEE')}
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent className="max-h-80 w-56">
					{teamMembers.map((member) => (
						<TaskAssigneeMenuItem key={member.id} task={task} member={member} />
					))}
				</DropdownMenuSubContent>
			</DropdownMenuSub>
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

function MoveToItem({
	task,
	status,
	onMove
}: Readonly<{
	task: TTask;
	status: TTaskStatus;
	onMove: (task: TTask, toStatus: TTaskStatus, toIndex: number) => void;
}>) {
	const isCurrent = task.taskStatusId === status.id;
	return (
		<DropdownMenuCheckboxItem
			checked={isCurrent}
			disabled={isCurrent}
			onClick={() => onMove(task, status, AT_LANE_END)}
		>
			<TaskPropertyIcon kind="status" name={status.name} color={status.color} icon={status.icon} />
			<span className="min-w-0 flex-1 truncate capitalize">{status.name?.split('-').join(' ')}</span>
		</DropdownMenuCheckboxItem>
	);
}
