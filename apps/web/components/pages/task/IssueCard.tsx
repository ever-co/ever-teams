// import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Card } from 'lib/components';
// import Image from 'next/image';
import { PlusIcon } from '@heroicons/react/20/solid';
// import bugIcon from '../../../public/assets/svg/bug.svg';
// import ideaIcon from '../../../public/assets/svg/idea.svg';
import { TaskStatusDropdown } from 'lib/features';
import { useRecoilValue } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { useLinkedTasks } from '@app/hooks';
import { ITeamTask } from '@app/interfaces';

const IssueCard = ({ related }: { related: boolean }) => {
	const task = useRecoilValue(detailedTaskState);
	const { tasks } = useLinkedTasks(task);

	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex justify-between">
				{related ? (
					<h4 className="text-lg font-semibold pb-2">Related Issues</h4>
				) : (
					<h4 className="text-lg font-semibold pb-2">Child Issues</h4>
				)}

				<div className="flex items-center">
					{/* <ToolButton iconSource="/assets/svg/add.svg" />
					<ToolButton iconSource="/assets/svg/more.svg" /> */}

					<PlusIcon className="h-5 w-5 dark:text-[#292D32] cursor-pointer" />
					<ChevronUpIcon className="h-5 w-5 dark:text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<hr />

			<div className="flex flex-col">
				{tasks.map((task) => {
					return <RelatedTask key={task.id} task={task} />;
				})}
			</div>
		</Card>
	);
};

function RelatedTask({ task }: { task: ITeamTask }) {
	return (
		<Card shadow="custom" className="flex justify-between">
			<div></div>
			<div>{task.taskNumber}</div>
			<div>{task.title}</div>

			<TaskStatusDropdown defaultValue={task.status} />
		</Card>
	);
}

export default IssueCard;
