import { ITeamTask } from '@app/interfaces';
import { ActiveTaskIssuesDropdown } from 'lib/features';
import Image from 'next/image';

type Props = {
	task: ITeamTask | null;
};

const TaskMainInfoDetailsBlock: React.FC<Props> = ({ task }) => {
	return (
		<section className="flex justify-between p-[15px]">
			<div className="flex items-center w-[47%]">
				<div className="flex">
					<Image
						src="/assets/svg/calendar-2.svg"
						alt="issue type"
						width={14}
						height={14}
						style={{ marginRight: '5px' }}
					/>
					<div className="details-label">Type of issue</div>
				</div>
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
		</section>
	);
};

export default TaskMainInfoDetailsBlock;
