import { ITeamTask } from '@app/interfaces';
import { detailedTaskState } from '@app/stores';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import Image from 'next/image';
import { useRecoilState } from 'recoil';

type TaskLabelWithIconProps = {
	iconSrc: string;
	label: string;
};

const TaskLabelWithIcon: React.FC<TaskLabelWithIconProps> = ({
	iconSrc,
	label,
}) => {
	return (
		<div className="flex">
			<Image
				src={iconSrc}
				alt="issue type"
				width={14}
				height={14}
				style={{ marginRight: '5px' }}
			/>
			<div className="details-label">{label}</div>
		</div>
	);
};

const TaskMainInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

	return (
		<section className="flex flex-col p-[15px]">
			<div className="flex justify-between">
				<div className="flex items-center w-[47%]">
					<TaskLabelWithIcon
						iconSrc="/assets/svg/calendar-2.svg"
						label="Type of issue"
					/>
				</div>
				<div className="w-[47%]">
					<div className="flex">
						<ActiveTaskIssuesDropdown
							key={task?.id}
							task={task}
							showIssueLabels={true}
						/>
					</div>
				</div>
			</div>
			<div className="flex justify-between mt-4">
				<div className="flex items-center w-[47%]">
					<TaskLabelWithIcon
						iconSrc="/assets/svg/profile.svg"
						label="Creator"
					/>
				</div>
				<div className="w-[47%]">
					<div className="flex">
						<Image
							src={task?.creator?.imageUrl || ''}
							alt="creator profile"
							width={20}
							height={20}
							style={{ marginRight: '5px', borderRadius: '9999px' }}
						/>
						<div className="flex items-center not-italic font-semibold text-[12px] leading-[140%] tracking-[-0.02em] text-[#282048]">
							{task?.creator?.firstName} {task?.creator?.lastName}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default TaskMainInfo;
