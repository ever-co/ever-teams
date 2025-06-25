import TaskTitleBlock from '@/core/components/pages/task/title-block/task-title-block';
import TaskProperties from '@/core/components/pages/task/task-properties';
import { TTask } from '@/core/types/schemas/task/task.schema';
import dynamic from 'next/dynamic';
import {
	RichTextEditorSkeleton,
	TaskActivitySkeleton,
	TaskDetailsAsideSkeleton,
	IssueCardSkeleton
} from '@/core/components/common/skeleton/rich-text-editor-skeleton';

// Lazy load heavy components for Task Details page optimization
// Priority 1: RichTextEditor (heaviest component with Slate.js)
const LazyRichTextEditor = dynamic(
	() =>
		import('@/core/components/pages/task/description-block/task-description-editor').then((mod) => ({
			default: mod.default
		})),
	{
		ssr: false,
		loading: () => <RichTextEditorSkeleton />
	}
);

// Priority 2: TaskActivity (complex component with timesheets)
const LazyTaskActivity = dynamic(
	() => import('@/core/components/pages/task/task-activity').then((mod) => ({ default: mod.TaskActivity })),
	{
		ssr: false,
		loading: () => <TaskActivitySkeleton />
	}
);

// Priority 3: TaskDetailsAside (sidebar with multiple sections)
const LazyTaskDetailsAside = dynamic(
	() => import('@/core/components/pages/task/task-details-aside').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <TaskDetailsAsideSkeleton />
	}
);

// Priority 4: Issue cards (conditional components)
const LazyChildIssueCard = dynamic(
	() => import('@/core/components/pages/task/child-issue-card').then((mod) => ({ default: mod.ChildIssueCard })),
	{
		ssr: false,
		loading: () => <IssueCardSkeleton title="Child Issues" />
	}
);

const LazyRelatedIssueCard = dynamic(
	() => import('@/core/components/pages/task/issue-card').then((mod) => ({ default: mod.RelatedIssueCard })),
	{
		ssr: false,
		loading: () => <IssueCardSkeleton title="Related Issues" />
	}
);

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
						<LazyRichTextEditor key={task?.id} />
						{/* <TaskDescriptionBlock /> */}
						<LazyChildIssueCard key={`child-${task?.id}`} />
						<LazyRelatedIssueCard key={`related-${task?.id}`} />

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
