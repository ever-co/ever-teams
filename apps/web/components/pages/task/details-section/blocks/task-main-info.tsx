import { detailedTaskState } from '@app/stores';
import { ActiveTaskIssuesDropdown } from 'lib/features';
// import Image from 'next/image';
import { useRecoilState } from 'recoil';
import ProfileInfo from '../components/profile-info';
import { Fragment } from 'react';
import { formatDateTimeString, calculateRemainingTime } from '@app/helpers';
import TaskRow from '../components/task-row';
import { useTranslation } from 'lib/i18n';

// ---- MAIN COMPONENT ----
const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { trans } = useTranslation('settingsTeam');

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
				labelTitle="Assignees"
				wrapperClassName="mt-5"
			>
				<div className="flex flex-col gap-3">
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
					<div className="flex items-center text-black dark:text-white border-2 border-gray-200 rounded-full px-1 py-[2px] cursor-pointer">
						{/* <Image
							src={'/assets/svg/add-new-assignee.svg'}
							alt="add new assignee"
							width={20}
							height={20}
							style={{ height: '20px', cursor: 'pointer', fill: 'white' }}
						/> */}
						<span className="text-lg mr-1 leading-none">+</span>
						<p className="font-semibold text-[0.625rem] leading-none">
							{trans.ADD_NEW_MEMBER}
						</p>
					</div>
				</div>
			</TaskRow>
			<TaskRow
				labelIconPath="/assets/svg/calendar-2.svg"
				labelTitle="Start Date"
				wrapperClassName="mt-5"
			>
				<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.createdAt)}
				</div>
			</TaskRow>
			<TaskRow
				labelTitle="Due Date"
				wrapperClassName="mt-3"
				alignWithIconLabel={true}
			>
				<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{formatDateTimeString(task?.dueDate) || 'Not set'}
				</div>
			</TaskRow>
			{task?.dueDate && (
				<TaskRow
					labelTitle="Days Remaining"
					wrapperClassName="mt-3"
					alignWithIconLabel={true}
				>
					<div className="not-italic font-semibold text-[0.75rem] leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
						{calculateRemainingTime(task?.dueDate)}
					</div>
				</TaskRow>
			)}

			<hr className="text-[#F2F2F2] mt-[15px] dark:text-white" />
		</section>
	);
};

export default TaskMainInfo;
