import TaskTitleBlock from '@/core/components/pages/task/title-block/task-title-block';
import TaskProperties from '@/core/components/pages/task/task-properties';
import { TTask } from '@/core/types/schemas/task/task.schema';
import {
	LazyRichTextEditor,
	LazyTaskActivity,
	LazyTaskDetailsAside,
	LazyChildIssueCard,
	LazyRelatedIssueCard
} from '@/core/components/optimized-components/tasks';

interface ITaskDetailsComponentProps {
	task: TTask;
}

/**
 * Task details component
 *
 * @param {object} props - The props object
 * @param {TTask} props.task - The task to show details about
 *
 * @returns {JSX.Element} The Task details component
 */
export function TaskDetailsComponent(props: ITaskDetailsComponentProps) {
	const { task } = props;
	return (
		<div className="flex flex-col w-full min-h-screen">
			<section className="flex flex-col justify-between lg:flex-row gap-2.5 lg:items-start 3xl:gap-8">
				<section className="md:max-w-[57rem] w-full 3xl:max-w-none xl:w-full mb-4 md:mb-0">
					<TaskTitleBlock />

					<div className="bg-[#F9F9F9] dark:bg-dark--theme-light p-2 md:p-6 pt-0 flex flex-col gap-8 rounded-sm">
						{/* Pass task prop to ensure proper state synchronization */}
						<LazyRichTextEditor key={task?.id ?? ''} />
						{/* <TaskDescriptionBlock /> */}
						<LazyChildIssueCard key={`child-${task?.id}`} task={task} />
						<LazyRelatedIssueCard key={`related-${task?.id}`} task={task} />

						{/* <IssueCard related={true} /> */}

						{/* <CompletionBlock /> */}
						{task && <LazyTaskActivity task={task} key={`activity-${task?.id}`} />}
					</div>
				</section>
				<div className="flex flex-col my-4 lg:mt-0 3xl:min-w-[24rem] gap-3 w-full lg:w-[30%]">
					<div className="flex flex-col bg-white rounded-xl dark:bg-dark--theme-light">
						<LazyTaskDetailsAside key={`aside-${task?.id}`} />
					</div>
					<TaskProperties task={task} />
				</div>
			</section>
		</div>
	);
}
