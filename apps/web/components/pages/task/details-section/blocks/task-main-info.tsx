import { detailedTaskState } from '@app/stores';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import { useRecoilState } from 'recoil';
import ProfileInfo from '../components/profile-info';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useOrganizationTeams, useTeamMemberCard } from '@app/hooks';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { Popover, Transition } from '@headlessui/react';
import { formatDateTimeString, calculateRemainingDays } from '@app/helpers';
import TaskRow from '../components/task-row';
import { useTranslation } from 'lib/i18n';
import { TrashIcon } from 'lib/components/svgs';
// import { PlusIcon } from 'lib/components/svgs';

// ---- MAIN COMPONENT ----
const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { activeTeam } = useOrganizationTeams();
	const { translations } = useTranslation('settingsTeam');

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow
				labelIconPath="/assets/svg/calendar-2.svg"
				labelTitle={translations.pages.taskDetails.TYPE_OF_ISSUE}
			>
				<ActiveTaskIssuesDropdown
					key={task?.id}
					task={task}
					showIssueLabels={true}
					sidebarUI={true}
				/>
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/profile.svg"
				labelTitle={translations.pages.taskDetails.CREATOR}
				wrapperClassName="mt-5"
			>
				{task?.creator && (
					<ProfileInfo
						profilePicSrc={task?.creator?.imageUrl}
						names={`${task?.creator?.firstName} ${
							task?.creator?.lastName || ''
						}`}
					/>
				)}
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/people.svg"
				labelTitle={translations.pages.taskDetails.ASSIGNEES}
				wrapperClassName="mt-5"
			>
				<div className="flex flex-col gap-3">
					{task?.members?.map((member: any) => (
						<Fragment key={member.id}>
							<ProfileInfo
								names={member.fullName}
								profilePicSrc={member.user?.imageUrl}
								// wrapperClassName={
								// 	task?.members?.length > 1 ? 'mb-3' : undefined
								// }
							/>
						</Fragment>
					))}

					{ManageMembersPopover(activeTeam?.members || [], task)}
				</div>
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/calendar-2.svg"
				labelTitle={translations.pages.taskDetails.START_DATE}
				wrapperClassName="mt-5"
			>
				<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.createdAt)}
				</div>
			</TaskRow>
			<TaskRow
				labelTitle={translations.pages.taskDetails.DUE_DATE}
				wrapperClassName="mt-3"
				alignWithIconLabel={true}
			>
				<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.dueDate) || 'Not set'}
				</div>
			</TaskRow>
			{task?.dueDate && (
				<TaskRow
					labelTitle={translations.pages.taskDetails.DAYS_REMAINING}
					wrapperClassName="mt-3"
					alignWithIconLabel={true}
				>
					<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
						{calculateRemainingDays(task?.dueDate)}
					</div>
				</TaskRow>
			)}

			<hr className="text-[#F2F2F2] mt-[15px] dark:text-white" />
		</section>
	);
};

const ManageMembersPopover = (
	memberList: OT_Member[],
	task: ITeamTask | null
) => {
	const { trans } = useTranslation('settingsTeam');
	const [member, setMember] = useState<OT_Member>();
	const [memberToRemove, setMemberToRemove] = useState<boolean>(false);
	const [memberToAdd, setMemberToAdd] = useState<boolean>(false);

	const memberInfo = useTeamMemberCard(member);

	const unassignedMembers = useMemo(
		() =>
			memberList.filter(
				(member) =>
					!task?.members
						.map((item) => item.userId)
						.includes(member.employee.userId)
			),
		[memberList, task?.members]
	);
	const assignedTaskMembers = useMemo(
		() =>
			memberList.filter((member) =>
				task?.members
					.map((item) => item.userId)
					.includes(member.employee.userId)
			),
		[memberList, task?.members]
	);

	useEffect(() => {
		if (task && member && memberToRemove) {
			memberInfo
				.unassignTask(task)
				.then(() => {
					setMember(undefined);
					setMemberToRemove(false);
				})
				.catch(() => {
					setMember(undefined);
					setMemberToRemove(false);
				});
		} else if (task && member && memberToAdd) {
			memberInfo
				.assignTask(task)
				.then(() => {
					setMember(undefined);
					setMemberToRemove(false);
				})
				.catch(() => {
					setMember(undefined);
					setMemberToRemove(false);
				});
		}
	}, [task, member, memberInfo, memberToAdd, memberToRemove]);

	return (
		<>
			{task && memberList.length > 1 ? (
				<Popover className="relative border-none no-underline w-full">
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel
							className="z-10 absolute right-0 bg-white dark:bg-[#202023] rounded-2xl min-w-[9.5rem] flex flex-col pl-4 pr-4 pt-2 pb-2 mt-10 mr-10"
							style={{ boxShadow: 'rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
						>
							{({ close }) => (
								<div className="">
									{assignedTaskMembers.slice(1).map((member, index) => (
										<div
											className="flex items-center justify-between gap-1 h-8 w-auto hover:cursor-pointer hover:brightness-95 dark:hover:brightness-105 mt-1"
											onClick={() => {
												setMember(member);
												setMemberToRemove(true);
												close();
											}}
											key={index}
										>
											<ProfileInfo
												profilePicSrc={member?.employee?.user?.imageUrl}
												names={member.employee.fullName}
											/>

											<TrashIcon />
										</div>
									))}
									{unassignedMembers.map((member, index) => (
										<div
											className="flex items-center justify-between h-8 w-auto hover:cursor-pointer hover:brightness-95 dark:hover:brightness-105 border-b mt-1"
											onClick={() => {
												setMember(member);
												setMemberToAdd(true);
												close();
											}}
											key={index}
										>
											<ProfileInfo
												profilePicSrc={member?.employee?.user?.imageUrl}
												names={member.employee.fullName}
											/>
										</div>
									))}
								</div>
							)}
						</Popover.Panel>
					</Transition>
					{task && memberList.length > 1 ? (
						<Popover.Button className="flex items-center h-8 w-auto hover:cursor-pointer outline-none">
							<div className="flex w-full items-center justify-center text-black dark:text-white border border-gray-200 rounded-full px-2 py-0 cursor-pointer">
								{/* <PlusIcon className=" dark:stroke-white" /> */}
								<p className="font-semibold text-[0.625rem] leading-none m-[6px]">
									{trans.MANAGE_ASSIGNEES}
								</p>
							</div>
						</Popover.Button>
					) : (
						<></>
					)}
				</Popover>
			) : (
				<></>
			)}
		</>
	);
};

export default TaskMainInfo;
