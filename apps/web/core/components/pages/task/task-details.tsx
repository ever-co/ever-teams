import { ChildIssueCard } from '@/core/components/pages/task/child-issue-card';
import RichTextEditor from '@/core/components/pages/task/description-block/task-description-editor';
import { RelatedIssueCard } from '@/core/components/pages/task/issue-card';
import TaskDetailsAside from '@/core/components/pages/task/task-details-aside';
import TaskProperties from '@/core/components/pages/task/task-properties';
import TaskTitleBlock from '@/core/components/pages/task/title-block/task-title-block';
import { TaskActivity } from '@/core/components/pages/task/task-activity';
import { TTask } from '@/core/types/schemas/task/task.schema';

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
						<RichTextEditor />
						{/* <TaskDescriptionBlock /> */}
						<ChildIssueCard />
						<RelatedIssueCard />

						{/* <IssueCard related={true} /> */}

						{/* <CompletionBlock /> */}
						{task && <TaskActivity task={task} />}
					</div>
				</section>
				<div className="flex flex-col my-4 lg:mt-0 3xl:min-w-[24rem] gap-3 w-full lg:w-[30%]">
					<div className="flex flex-col bg-white dark:bg-dark--theme-light rounded-xl">
						<TaskDetailsAside />
					</div>
					<TaskProperties task={task} />
				</div>
			</section>
		</div>
	);
}
