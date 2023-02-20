import { detailedTaskState, tasksFetchingState } from '@app/stores';
import clsx from 'clsx';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import Image from 'next/image';
import { useRecoilState } from 'recoil';
import ProfileInfo from '../components/ProfileInfo';
import { Fragment } from 'react';
import { formatDateTimeString } from '@app/helpers';

type TaskLabelProps = {
	iconSrc?: string;
	label: string;
};

const TaskLabel: React.FC<TaskLabelProps> = ({ iconSrc, label }) => {
	return (
		<div className="flex">
			{iconSrc ? (
				<Image
					src={iconSrc}
					alt="issue type"
					width={14}
					height={14}
					style={{ marginRight: '5px', height: '14px' }}
				/>
			) : (
				<div
					style={{ height: '14px', width: '14px', marginRight: '5px' }}
				></div>
			)}
			<div className="details-label">{label}</div>
		</div>
	);
};

type TaskRowProps = {
	labelPath?: string;
	labelTitle: string;
	children?: JSX.Element | JSX.Element[];
	wrapperClassName?: string;
};

const TaskRow: React.FC<TaskRowProps> = ({
	children,
	labelPath,
	labelTitle,
	wrapperClassName,
}) => {
	return (
		<div className={clsx('flex justify-between', wrapperClassName)}>
			<div className="flex items-top w-[47%]">
				<TaskLabel iconSrc={labelPath} label={labelTitle} />
			</div>
			<div className="w-[47%]">
				<div className="flex">{children}</div>
			</div>
		</div>
	);
};

// ---- MAIN COMPONENT ----
const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);
	const [tasksFetching] = useRecoilState(tasksFetchingState);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow
				labelPath="/assets/svg/calendar-2.svg"
				labelTitle="Type of issue"
			>
				<ActiveTaskIssuesDropdown
					key={task?.id}
					task={task}
					showIssueLabels={true}
				/>
			</TaskRow>
			<TaskRow
				labelPath="/assets/svg/profile.svg"
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
				labelPath="/assets/svg/people.svg"
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
				labelPath="/assets/svg/calendar-2.svg"
				labelTitle="Start date"
				wrapperClassName="mt-4"
			>
				<div className="not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048]">
					{formatDateTimeString(task?.createdAt)}
				</div>
			</TaskRow>
			<TaskRow labelTitle="Due date" wrapperClassName="mt-4">
				<div className="not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048]">
					{formatDateTimeString(task?.dueDate) || 'Not set'}
				</div>
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px]" />
		</section>
	);
};

export default TaskMainInfo;
