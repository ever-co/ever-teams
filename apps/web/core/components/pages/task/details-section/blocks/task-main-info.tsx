/* eslint-disable no-mixed-spaces-and-tabs */
import { calculateRemainingDays, formatDateString } from '@/core/lib/helpers/index';
import { useSyncRef, useTeamTasks } from '@/core/hooks';
import { activeTeamState, detailedTaskState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { TrashIcon } from 'assets/svg';
import { forwardRef, useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import ProfileInfo from '../components/profile-info';
import TaskRow from '../components/task-row';

import { DatePicker } from '@/core/components/common/date-picker';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PencilSquareIcon } from '@heroicons/react/20/solid';
import { ActiveTaskIssuesDropdown } from '@/core/components/tasks/task-issue';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

import { useTaskMemberManagement } from '@/core/hooks/tasks/use-task-member-management';
import { MemberSection } from './member-section';

const TaskMainInfo = () => {
	const [task] = useAtom(detailedTaskState);
	const activeTeam = useAtomValue(activeTeamState);
	const t = useTranslations();

	return (
		<section className="flex flex-col gap-4 p-[0.9375rem]">
			<TaskRow labelIconPath="/assets/svg/calendar-2.svg" labelTitle={t('pages.taskDetails.TYPE_OF_ISSUE')}>
				<ActiveTaskIssuesDropdown
					key={task?.id}
					task={task}
					showIssueLabels
					sidebarUI
					taskStatusClassName="rounded-[0.1875rem] border-none h-5 text-[10px] 3xl:text-xs"
					forParentChildRelationship
				/>
			</TaskRow>
			<TaskRow labelIconPath="/assets/svg/profile.svg" labelTitle={t('pages.taskDetails.CREATOR')}>
				{task?.createdByUser && (
					<Link
						title={`${task?.createdByUser?.firstName || ''} ${task?.createdByUser?.lastName || ''}`}
						href={`/profile/${task.createdByUserId}`}
					>
						<ProfileInfo
							profilePicSrc={task?.createdByUser?.imageUrl}
							names={`${task?.createdByUser?.firstName || ''} ${task?.createdByUser?.lastName || ''}`}
						/>
					</Link>
				)}
			</TaskRow>
			<TaskRow labelIconPath="/assets/svg/people.svg" labelTitle={t('pages.taskDetails.ASSIGNEES')}>
				<div className="flex flex-col gap-3">
					{task?.members
						?.filter((m) => m?.userId !== task?.createdByUserId)
						?.map((member: any) => (
							<Link key={member.id} title={member.fullName} href={`/profile/${member.userId}`}>
								<ProfileInfo names={member.fullName} profilePicSrc={member.user?.imageUrl} />
							</Link>
						))}

					{ManageMembersPopover(activeTeam?.members || [], task)}
				</div>
			</TaskRow>

			<DueDates />
		</section>
	);
};

const DateCustomInput = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>((props, ref) => {
	return <div {...props} ref={ref} />;
});

DateCustomInput.displayName = 'DateCustomInput';

function DueDates() {
	const { updateTask } = useTeamTasks();
	const task = useAtomValue(detailedTaskState);
	const t = useTranslations();
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [dueDate, setDueDate] = useState<Date | null>(null);

	const $startDate = useSyncRef(startDate || (task?.startDate ? new Date(task.startDate) : null));

	const $dueDate = useSyncRef(dueDate || (task?.dueDate ? new Date(task.dueDate) : null));

	const remainingDays = task ? calculateRemainingDays(new Date().toISOString(), String(task.dueDate)) : undefined;

	const handleResetDate = useCallback(
		(date: 'startDate' | 'dueDate') => {
			if (date === 'startDate') {
				setStartDate(null);
				$startDate.current = null;
			}
			if (date === 'dueDate') {
				setDueDate(null);
				$dueDate.current = null;
			}

			if (task) {
				updateTask({ ...task, [date]: null });
			}
		},
		[$startDate, $dueDate, task, updateTask]
	);

	return (
		<div className="flex flex-col gap-[0.4375rem]">
			<TaskRow labelIconPath="/assets/svg/calendar-2.svg" labelTitle={t('pages.taskDetails.START_DATE')}>
				<DatePicker
					// Button Props
					buttonVariant={'link'}
					buttonClassName={'p-0 decoration-transparent h-[0.875rem] w-20'}
					// Calendar Props
					customInput={
						<div
							className={clsxm(
								'not-italic cursor-pointer font-semibold text-[0.625rem] 3xl:text-xs',
								'leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white'
							)}
						>
							{startDate ? (
								formatDateString(startDate.toISOString())
							) : task?.startDate ? (
								formatDateString(String(task?.startDate))
							) : (
								<PencilSquareIcon className="w-4 h-4 dark:text-white text-dark" />
							)}
						</div>
					}
					selected={$startDate.current ? (new Date($startDate.current) as Date) : undefined}
					onSelect={(date: Date | undefined) => {
						if (date && (!$dueDate.current || date <= $dueDate.current)) {
							setStartDate(date);

							if (task) {
								updateTask({ ...task, startDate: date });
							}
						}
					}}
					{...{
						mode: 'single'
					}}
				/>
				{task?.startDate ? (
					<span
						className="flex flex-row justify-center items-center text-xs border-0 cursor-pointer"
						onClick={() => {
							handleResetDate('startDate');
						}}
					>
						<TrashIcon className="w-[14px] h-[14px]" />
					</span>
				) : (
					<></>
				)}
			</TaskRow>

			<TaskRow labelTitle={t('pages.taskDetails.DUE_DATE')} alignWithIconLabel={true}>
				<DatePicker
					// Button Props
					buttonVariant={'link'}
					buttonClassName={'p-0 decoration-transparent h-[0.875rem] w-20'}
					// Calendar Props
					customInput={
						<div
							className={clsxm(
								'not-italic cursor-pointer font-semibold text-[0.625rem] 3xl:text-xs',
								'leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white'
							)}
						>
							{dueDate ? (
								formatDateString(dueDate.toISOString())
							) : task?.dueDate ? (
								formatDateString(String(task?.dueDate))
							) : (
								<PencilSquareIcon className="w-4 h-4 dark:text-white text-dark" />
							)}
						</div>
					}
					selected={$dueDate.current ? (new Date($dueDate.current) as Date) : undefined}
					onSelect={(date) => {
						if (
							(!$startDate.current && date) ||
							($startDate.current && date && date >= $startDate.current)
						) {
							setDueDate(date);
							if (task) {
								updateTask({ ...task, dueDate: date });
							}
						}
					}}
					mode={'single'}
				/>
				{task?.dueDate ? (
					<span
						className="flex flex-row justify-center items-center text-xs border-0 cursor-pointer"
						onClick={() => {
							handleResetDate('dueDate');
						}}
					>
						<TrashIcon className="w-[14px] h-[14px]" />
					</span>
				) : (
					<></>
				)}
			</TaskRow>

			{task?.dueDate && (
				<TaskRow labelTitle={t('pages.taskDetails.DAYS_REMAINING')} alignWithIconLabel={true}>
					<div className="not-italic font-semibold text-[0.625rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
						{remainingDays !== undefined && remainingDays < 0 ? 0 : remainingDays}
					</div>
				</TaskRow>
			)}
		</div>
	);
}

/**
 * Modern ManageMembersPopover with optimistic updates and improved UX
 * Uses custom hook for business logic and modular components for UI
 */
const ManageMembersPopover = (memberList: TOrganizationTeamEmployee[], task: TTask | null) => {
	const t = useTranslations();

	// Use the new custom hook for all member management logic
	const { assignedMembers, unassignedMembers, loadingStates, assignMember, unassignMember } = useTaskMemberManagement(
		task,
		memberList
	);

	return (
		<>
			{task && memberList.length > 1 ? (
				<Popover className="relative w-full no-underline border-none">
					<Transition
						as="div"
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<PopoverPanel
							className="z-10 absolute right-0 bg-white rounded-2xl min-w-[11.5rem] flex flex-col px-4 py-2 mt-10 mr-10  dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]"
							style={{ boxShadow: 'rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
						>
							{({ close }) => (
								<div className="overflow-y-auto max-h-72 scrollbar-hide">
									{/* Assigned Members Section */}
									<MemberSection
										title="Assigned Members"
										members={assignedMembers}
										loadingStates={loadingStates}
										onAction={unassignMember}
										actionType="unassign"
										onClose={close}
										emptyMessage="No members assigned to this task"
									/>

									{/* Divider if both sections have content */}
									{assignedMembers.length > 0 && unassignedMembers.length > 0 && (
										<div className="my-2 border-t border-gray-200 dark:border-gray-700" />
									)}

									{/* Available Members Section */}
									<MemberSection
										title="Available Members"
										members={unassignedMembers}
										loadingStates={loadingStates}
										onAction={assignMember}
										actionType="assign"
										onClose={close}
										emptyMessage="All team members are already assigned"
									/>
								</div>
							)}
						</PopoverPanel>
					</Transition>

					<PopoverButton className="flex items-center w-auto h-8 outline-none hover:cursor-pointer">
						<div className="flex justify-center items-center px-2 py-0 w-full text-black rounded-full border border-gray-200 cursor-pointer dark:text-white">
							<p className="font-semibold text-[0.625rem] leading-none m-[6px]">
								{t('pages.settingsTeam.MANAGE_ASSIGNEES')}
							</p>
						</div>
					</PopoverButton>
				</Popover>
			) : (
				<></>
			)}
		</>
	);
};

export default TaskMainInfo;
