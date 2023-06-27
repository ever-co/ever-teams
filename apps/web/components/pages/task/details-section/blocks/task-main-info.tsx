import { detailedTaskState } from '@app/stores';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import Image from 'next/image';
import { useRecoilState } from 'recoil';
import ProfileInfo from '../components/profile-info';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { formatDateTimeString } from '@app/helpers';
import TaskRow from '../components/task-row';
import { useOrganizationTeams, useTeamMemberCard } from '@app/hooks';
import { ITeamTask, OT_Member } from '@app/interfaces';
import { Popover, Transition } from '@headlessui/react';

// ---- MAIN COMPONENT ----
const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { activeTeam } = useOrganizationTeams();

	const unassignedMembers = useMemo(
		() =>
			activeTeam?.members.filter(
				(member) =>
					!task?.members
						.map((item) => item.userId)
						.includes(member.employee.userId)
			),
		[
			activeTeam?.members,
			activeTeam?.members?.length,
			task?.members,
			task?.members?.length,
		]
	);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow
				labelIconPath="/assets/svg/calendar-2.svg"
				labelTitle="Type of issue"
			>
				<ActiveTaskIssuesDropdown
					key={task?.id}
					task={task}
					showIssueLabels={true}
				/>
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/profile.svg"
				labelTitle="Creator"
				wrapperClassName="mt-4"
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
				labelTitle="Assignees"
				wrapperClassName="mt-4"
			>
				<div className="flex flex-wrap">
					{task?.members?.map((member: any) => (
						<Fragment key={member.id}>
							<ProfileInfo
								names={member.fullName}
								profilePicSrc={member.user?.imageUrl}
								wrapperClassName={
									task?.members?.length > 1 ? 'mb-3' : undefined
								}
							/>
						</Fragment>
					))}
					{AssignMemberPopover(unassignedMembers || [], task)}
				</div>
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/calendar-2.svg"
				labelTitle="Start date"
				wrapperClassName="mt-4"
			>
				<div className="not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.createdAt)}
				</div>
			</TaskRow>
			<TaskRow
				labelTitle="Due date"
				wrapperClassName="mt-4"
				alignWithIconLabel={true}
			>
				<div className="not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.dueDate) || 'Not set'}
				</div>
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px] dark:text-white" />
		</section>
	);
};

const AssignMemberPopover = (
	memberList: OT_Member[],
	task: ITeamTask | null
) => {
	const [member, setMember] = useState<OT_Member>();
	const memberInfo = useTeamMemberCard(member);
	useEffect(() => {
		if (task && member) {
			memberInfo
				.assignTask(task)
				.then(() => {
					setMember(undefined);
				})
				.catch(() => {
					setMember(undefined);
				});
		}
	}, [task, member, memberInfo]);

	return (
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
					className="z-10 absolute right-0 bg-white dark:bg-[#202023] rounded-2xl w-[9.5rem] flex flex-col pl-5 pr-5 pt-2 pb-2 mt-10 mr-10"
					style={{ boxShadow: 'rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
				>
					{memberList.map((member) => (
						<div
							className="flex items-center h-8 w-auto hover:cursor-pointer"
							onClick={() => {
								setMember(member);
							}}
						>
							<span className="text-[#282048] text-xs font-semibold dark:text-white">
								{member.employee.fullName}
							</span>
						</div>
					))}
				</Popover.Panel>
			</Transition>
			{task && memberList.length ? (
				<Popover.Button className="flex items-center h-8 w-auto hover:cursor-pointer outline-none">
					<span className="text-[#282048] text-xs font-semibold dark:text-white">
						<Image
							src={'/assets/svg/add-new-assignee.svg'}
							alt="add new assignee"
							width={20}
							height={20}
							style={{ height: '20px', marginLeft: '10px', cursor: 'pointer' }}
						/>
					</span>
				</Popover.Button>
			) : (
				<></>
			)}
		</Popover>
	);
};

export default TaskMainInfo;
