import { useAuthenticateUser, useModal, useTeamMemberMutations, useCreateTask } from '@/core/hooks';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { activeTeamState, activeTeamTaskId } from '@/core/stores';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import {
	ArrowRight,
	ArrowUp,
	Calendar,
	Check,
	ChevronsUpDown,
	Copy,
	Layers,
	Link,
	MoreVertical,
	Pencil,
	Share,
	Timer,
	UserAdd,
	UserRemove,
	Users
} from '@/core/components/icons';
import { SpinnerLoader } from '@/core/components';
import { PlanTask } from '@/core/components/tasks/task-card';
import { useTranslations } from 'next-intl';
import { useAtomValue, useSetAtom } from 'jotai';
import { Combobox, Transition } from '@headlessui/react';
import React, { JSX, useCallback } from 'react';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { EIssueType, ETaskPriority } from '@/core/types/generics/enums/task';
import { CreateDailyPlanFormModal } from '../../features/daily-plan/create-daily-plan-form-modal';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';

const MENU_ROW_CLASS =
	'flex justify-between px-2 py-1.5 w-full text-sm text-left capitalize whitespace-nowrap rounded-md transition-colors hover:bg-foreground/5';

const MENU_ICON_CLASS = 'size-4 shrink-0 text-muted-foreground';

/** `PlanTask` renders its own button, which the row can only style from outside. */
const PLAN_ROW_CLASS = cn(MENU_ROW_CLASS, '[&_button]:flex [&_button]:items-center [&_button]:gap-2.5');

export default function MenuKanbanCard({ item: task, member }: { item: TTask; member: any }) {
	const t = useTranslations();
	const setActiveTask = useSetAtom(activeTeamTaskId);
	const { createTask, createLoading } = useCreateTask();
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading } = useTeamMemberMutations(member);
	const { taskStatuses } = useTaskStatusesQuery();
	const { closeModal, isOpen, openModal } = useModal();
	const authUser = useAuthenticateUser();

	const activeTeam = useAtomValue(activeTeamState);

	// Use the authenticated user's employee ID (prefer employeeId FK over employee.id relation)
	const employeeId = authUser?.user?.employeeId ?? authUser?.user?.employee?.id ?? '';

	const menu = [
		{
			name: t('common.EDIT_TASK'),
			icon: <Pencil className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'edit',
			active: true,
			onClick: () => {
				setActiveTask({
					id: task.id
				});
			}
		},
		{
			name: t('common.ESTIMATE'),
			icon: <Timer className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'estimate',
			onClick: () => {
				// TODO: Implement estimate task after fixing the time estimate issue
			},
			active: true
		},
		{
			name: t('common.ASSIGN_TASK'),
			icon: <UserAdd className={MENU_ICON_CLASS} />,
			action: 'assign',
			active: true,
			onClick: () => {
				assignTask(task);
			},
			loading: assignTaskLoading
		},
		{
			name: t('common.UNASSIGN_TASK'),
			icon: <UserRemove className={MENU_ICON_CLASS} />,
			action: 'unassign',
			closable: true,
			active: true,
			onClick: () => {
				unassignTask(task);
			},
			loading: unAssignTaskLoading
		},
		{
			name: t('common.COPY_ISSUE_LINK'),
			icon: <Link className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'copy_issue_link',
			active: true,
			onClick: async () => {
				try {
					const baseUrl = window?.location.origin;
					await navigator.clipboard.writeText(`${baseUrl}/task/${task.id}`);
				} catch (error) {
					console.log(error);
				}
			}
		},
		{
			name: t('common.MAKE_A_COPY'),
			icon: <Copy className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'male_a_copy',
			active: true,
			onClick: async () => {
				try {
					const { priority, ...taskWithoutPriority } = task;
					await createTask({
						...taskWithoutPriority,
						taskStatusId: task.taskStatusId ?? taskStatuses[0].id,
						title: `Copy ${task.title}`,
						issueType: task.issueType ?? EIssueType.BUG,
						priority: priority as ETaskPriority | null | undefined
					});
				} catch (error) {
					console.log(error);
				}
			},
			loading: createLoading
		},
		{
			name: t('common.ASSIGNEE'),
			icon: <Users className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'assignee',
			active: true
		},
		{
			name: t('common.CHANGE_PARENT'),
			icon: <Layers className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'change_parent',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.CHANGE_RELATIONS'),
			icon: <Share className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'change_relations',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.SET_AS_NEXT'),
			icon: <ArrowUp className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'set_as_next',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.MOVE_TO'),
			icon: <ArrowRight className={MENU_ICON_CLASS} />,
			closable: true,
			action: 'move_to',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		}
	].filter((item) => item.active || item.active === undefined);

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground"
						aria-label={t('common.MORE_OPTIONS')}
					>
						<MoreVertical className="z-50 size-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-48 p-1">
					<ul>
						{menu.map((item) => {
							return (
								<li key={item.name} onClick={async () => await item?.onClick?.()}>
									{item.action == 'assignee' ? (
										<div className={cn(MENU_ROW_CLASS, 'items-center gap-2.5')}>
											{item.icon}
											<TeamMembersSelect
												key={item.name}
												task={task}
												teamMembers={activeTeam?.members ?? []}
											/>
										</div>
									) : (
										<button className={cn(MENU_ROW_CLASS, 'items-center')}>
											<span className="flex items-center gap-2.5">
												{item.icon}
												<span>{item.name}</span>
											</span>
											{item.loading && <SpinnerLoader size={15} />}
										</button>
									)}
								</li>
							);
						})}
					</ul>
					<HorizontalSeparator className="my-1" />
					<ul className="list-none">
						<li className={PLAN_ROW_CLASS}>
							<PlanTask
								planMode={EDailyPlanMode.TODAY}
								icon={<Calendar className={MENU_ICON_CLASS} />}
								taskId={task.id}
								employeeId={employeeId}
								chooseMember={true}
							/>
						</li>
						<li className={PLAN_ROW_CLASS}>
							<PlanTask
								planMode={EDailyPlanMode.TOMORROW}
								icon={<Calendar className={MENU_ICON_CLASS} />}
								taskId={task.id}
								employeeId={employeeId}
								chooseMember={true}
							/>
						</li>
						<li className={PLAN_ROW_CLASS}>
							<PlanTask
								openModal={openModal}
								planMode={EDailyPlanMode.CUSTOM}
								icon={<Calendar className={MENU_ICON_CLASS} />}
								taskId={task.id}
								employeeId={employeeId}
								chooseMember={true}
							/>
						</li>
					</ul>
				</PopoverContent>
			</Popover>

			<CreateDailyPlanFormModal
				open={isOpen}
				closeModal={closeModal}
				taskId={task.id}
				employeeId={employeeId}
				planMode={EDailyPlanMode['CUSTOM']}
			/>
		</>
	);
}

/**
 * --------------------------------------------------
 * 		--------- TEAM MEMBER SELECT -----------
 * --------------------------------------------------
 */

interface ITeamMemberSelectProps {
	teamMembers: TOrganizationTeamEmployee[];
	task: TTask;
	key?: string;
}

/**
 * A multi select component that allows to assign members to a task
 *
 * @param {object} props - The props object
 * @param {IOrganizationTeamMember[]} props.teamMembers - Members of the current team
 * @param {TTask} props.task - The task
 *
 * @return {ReactNode} The multi select component
 */
export function TeamMembersSelect(props: ITeamMemberSelectProps): JSX.Element {
	const { teamMembers, task } = props;
	const t = useTranslations();

	return (
		<div className="w-full">
			<Combobox multiple={true}>
				<div className="relative">
					<div className="overflow-hidden relative w-full text-left rounded-md cursor-default focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 sm:text-sm">
						<Combobox.Input readOnly className="w-0 h-0" />
						<Combobox.Button className="flex absolute inset-y-0 right-0 justify-between items-center pr-0.5 w-full">
							<span>{t('common.ASSIGNEE')}</span>
							<ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
						</Combobox.Button>
					</div>
					<Transition
						as="div"
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Combobox.Options className="overflow-auto absolute p-1 mt-1 w-full h-auto max-h-60 text-sm bg-popover text-popover-foreground rounded-xl hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none">
							{teamMembers.map((member) => (
								<Combobox.Option
									key={member.id}
									className={({ active }) =>
										cn(
											'relative cursor-default select-none rounded-md py-1.5 pl-9 pr-3 text-foreground transition-colors',
											active && 'bg-foreground/5'
										)
									}
									value={member}
								>
									{/* @ts-ignore */}
									<TeamMemberOption
										task={task}
										member={member}
										isAssignee={
											task.members?.some((el) => el.user?.id == member?.employee?.user?.id) ??
											false
										}
									/>
								</Combobox.Option>
							))}
						</Combobox.Options>
					</Transition>
				</div>
			</Combobox>
		</div>
	);
}

/**
 * --------------------------------------------------
 * 		------- TEAM MEMBER LIST OPTION --------
 * --------------------------------------------------
 */

interface ITeamMemberOptionProps {
	isAssignee: boolean;
	member: TOrganizationTeamEmployee;
	task: TTask;
	key?: string;
}

function TeamMemberOption({ isAssignee, member, task }: ITeamMemberOptionProps): React.ReactElement {
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading } = useTeamMemberMutations(member);

	const handleAssignTask = useCallback(() => {
		if (isAssignee) {
			unassignTask(task);
		} else {
			assignTask(task);
		}
	}, [assignTask, isAssignee, task, unassignTask]);

	return (
		<div className="cursor-pointer" onClick={handleAssignTask}>
			<span className="block truncate">{member?.employee?.fullName}</span>
			{!(assignTaskLoading || unAssignTaskLoading) && isAssignee ? (
				<span className="flex absolute inset-y-0 left-0 items-center pl-2.5">
					<Check className="size-4" aria-hidden="true" />
				</span>
			) : null}

			{(assignTaskLoading || unAssignTaskLoading) && (
				<span className="flex absolute inset-y-0 left-0 items-center pl-2.5">
					<SpinnerLoader size={15} />
				</span>
			)}
		</div>
	);
}
