import { useOrganizationTeams, useTaskStatus, useTeamMemberCard, useTeamTasks } from '@app/hooks';
import { activeTeamTaskId } from '@app/stores';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { HorizontalSeparator, SpinnerLoader } from 'lib/components';
import { PlanTask } from 'lib/features/task/task-card';
import { useTranslations } from 'next-intl';
import { useSetAtom } from 'jotai';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { Combobox, Transition } from '@headlessui/react';
import { Fragment, useCallback } from 'react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

export default function MenuKanbanCard({ item: task, member }: { item: ITeamTask; member: any }) {
	const t = useTranslations();
	const setActiveTask = useSetAtom(activeTeamTaskId);
	const { createTask, createLoading } = useTeamTasks();
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading } = useTeamMemberCard(member);
	const { taskStatuses } = useTaskStatus();
	const { activeTeam } = useOrganizationTeams();
	const menu = [
		{
			name: t('common.EDIT_TASK'),
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
			closable: true,
			action: 'estimate',
			onClick: () => {
				// TODO: Implement estimate task after fixing the time estimate issue
			},
			active: true
		},
		{
			name: t('common.ASSIGN_TASK'),
			action: 'assign',
			active: true,
			onClick: () => {
				assignTask(task);
			},
			loading: assignTaskLoading
		},
		{
			name: t('common.UNASSIGN_TASK'),
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
			closable: true,
			action: 'male_a_copy',
			active: true,
			onClick: async () => {
				try {
					await createTask({
						...task,
						taskStatusId: task.taskStatusId ?? taskStatuses[0].id,
						title: `Copy ${task.title}`,
						issueType: task.issueType ?? 'Bug'
					});
				} catch (error) {
					console.log(error);
				}
			},
			loading: createLoading
		},
		{
			name: t('common.ASSIGNEE'),
			closable: true,
			action: 'assignee',
			active: true
		},
		{
			name: t('common.CHANGE_PARENT'),
			closable: true,
			action: 'change_parent',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.CHANGE_RELATIONS'),
			closable: true,
			action: 'change_relations',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.SET_AS_NEXT'),
			closable: true,
			action: 'set_as_next',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		},
		{
			name: t('common.MOVE_TO'),
			closable: true,
			action: 'move_to',
			onClick: () => {
				// TODO: Implement the logic here
			},
			active: true
		}
	].filter((item) => item.active || item.active === undefined);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button>
					<ThreeCircleOutlineVerticalIcon className="w-4 h-4 z-50" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className=" w-44 border-[0.125rem] dark:border-[#26272C] bg-white dark:bg-dark--theme-light p-0"
			>
				<ul>
					{menu.map((item) => {
						return (
							<li key={item.name} onClick={async () => await item?.onClick?.()}>
								{item.action == 'assignee' ? (
									<div className="font-normal flex justify-between capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm py-1 px-2">
										<TeamMembersSelect task={task} teamMembers={activeTeam?.members ?? []} />
									</div>
								) : (
									<button className="font-normal flex justify-between items-center capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm hover:font-semibold hover:transition-all py-1 px-2">
										<p>{item.name}</p>
										{item.loading && <SpinnerLoader size={15} />}
									</button>
								)}
							</li>
						);
					})}
				</ul>
				<HorizontalSeparator />
				<ul className="list-none">
					<li className="font-normal flex justify-between capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm hover:font-semibold hover:transition-all py-1 px-2">
						<PlanTask planMode="today" taskId={task.id} chooseMember={true} />
					</li>
					<li className="font-normal flex justify-between capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm hover:font-semibold hover:transition-all py-1 px-2">
						<PlanTask planMode="tomorrow" taskId={task.id} chooseMember={true} />
					</li>
					<li className="font-normal flex justify-between capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm hover:font-semibold hover:transition-all py-1 px-2">
						<PlanTask planMode="custom" taskId={task.id} chooseMember={true} />
					</li>
				</ul>
			</PopoverContent>
		</Popover>
	);
}

/**
 * --------------------------------------------------
 * 		--------- TEAM MEMBER SELECT -----------
 * --------------------------------------------------
 */

interface ITeamMemberSelectProps {
	teamMembers: OT_Member[];
	task: ITeamTask;
}

/**
 * A multi select component that allows to assign members to a task
 *
 * @param {object} props - The props object
 * @param {OT_Member[]} props.teamMembers - Members of the current team
 * @param {ITeamTask} props.task - The task
 *
 * @return {JSX.Element} The multi select component
 */
export function TeamMembersSelect(props: ITeamMemberSelectProps): JSX.Element {
	const { teamMembers, task } = props;
	const t = useTranslations();

	return (
		<div className="w-full">
			<Combobox multiple={true}>
				<div className="relative">
					<div className="relative w-full cursor-default overflow-hidden rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:text-sm">
						<Combobox.Input readOnly className="w-0 h-0" />
						<Combobox.Button className="absolute hover:font-semibold hover:transition-all inset-y-0 right-0 flex justify-between w-full items-center pr-2">
							<span>{t('common.ASSIGNEE')}</span>
							<ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
						</Combobox.Button>
					</div>
					<Transition
						as={Fragment}
						leave="transition ease-in duration-100"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Combobox.Options className="absolute mt-1 max-h-60 h-auto w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
							{teamMembers.map((member) => (
								<Combobox.Option
									key={member.id}
									className={({ active }) =>
										`relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary/5' : 'text-gray-900'
										}`
									}
									value={member}
								>
									<TeamMemberOption
										task={task}
										member={member}
										isAssignee={task.members.some((el) => el.user?.id == member.employee.user?.id)}
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
	member: OT_Member;
	task: ITeamTask;
}
/**
 * The team member list option (allow to handle member specific actions)
 *
 * @param {object} props - The props object
 * @param {boolean} props.isAssignee - true if the task/issue is assigned to the member
 * @param {OT_Member} props.member - The team member
 * @param {ITeamTask} props.task - The task
 *
 * @returns {JSX.Element} - The list option
 */
function TeamMemberOption({ isAssignee, member, task }: ITeamMemberOptionProps): JSX.Element {
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading } = useTeamMemberCard(member);

	// Assign or unassign the task
	const handleAssignTask = useCallback(() => {
		if (isAssignee) {
			unassignTask(task);
		} else {
			assignTask(task);
		}
	}, [assignTask, isAssignee, task, unassignTask]);

	return (
		<div className="cursor-pointer" onClick={handleAssignTask}>
			<span className={`block truncate`}>{member.employee.fullName}</span>
			{!(assignTaskLoading || unAssignTaskLoading) && isAssignee ? (
				<span className={`absolute inset-y-0 left-0 flex items-center pl-3 `}>
					<CheckIcon className="h-5 w-5" aria-hidden="true" />
				</span>
			) : null}

			{(assignTaskLoading || unAssignTaskLoading) && (
				<span className={`absolute inset-y-0 left-0 flex items-center pl-3 `}>
					<SpinnerLoader size={15} />
				</span>
			)}
		</div>
	);
}
