import { detailedTaskState } from '@app/stores';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import Image from 'next/image';
import { useRecoilState } from 'recoil';
import ProfileInfo from '../components/profile-info';
import { Fragment } from 'react';
import { formatDateTimeString } from '@app/helpers';
import TaskRow from '../components/task-row';

// ---- MAIN COMPONENT ----
const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

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
					<Image
						src={'/assets/svg/add-new-assignee.svg'}
						alt="add new assignee"
						width={20}
						height={20}
						style={{ height: '20px', marginLeft: '10px', cursor: 'pointer' }}
					/>
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

export default TaskMainInfo;
