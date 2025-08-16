import dynamic from 'next/dynamic';
import {
	TaskCardSkeleton,
	TaskFilterSkeleton,
	UserProfileTaskSkeleton
} from '../common/skeleton/profile-component-skeletons';
import {
	RichTextEditorSkeleton,
	DetailsAsideSkeleton,
	TaskActivitySkeleton,
	IssueCardSkeleton
} from '../common/skeleton/rich-text-editor-skeleton';
// import { ModalSkeleton } from '../common/skeleton/modal-skeleton';

// Task Card Components
export const LazyTaskCard = dynamic(
	() => import('@/core/components/tasks/task-card').then((mod) => ({ default: mod.TaskCard })),
	{
		ssr: false,
		loading: () => <TaskCardSkeleton />
	}
);

// Task Profile Components
export const LazyUserProfileTask = dynamic(
	() =>
		import('@/core/components/pages/profile/user-profile-tasks').then((mod) => ({
			default: mod.UserProfileTask
		})),
	{
		ssr: false,
		loading: () => <UserProfileTaskSkeleton />
	}
);

export const LazyTaskFilter = dynamic(
	() => import('@/core/components/pages/profile/task-filters').then((mod) => ({ default: mod.TaskFilter })),
	{
		ssr: false,
		loading: () => <TaskFilterSkeleton />
	}
);

// Task Status & Properties Dropdowns
export const LazyEpicPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.EpicPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

export const LazyStatusDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.StatusDropdown),
	{
		ssr: false,
		loading: () => <div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyTaskLabelsDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskLabelsDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl text-gray-900 dark:text-white bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

export const LazyTaskPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center">
				<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-2" />
			</div>
		)
	}
);

export const LazyTaskSizesDropdown = dynamic(
	() => import('@/core/components/tasks/task-sizes-dropdown').then((mod) => mod.TaskSizesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		)
	}
);

// Task Details Components
export const LazyTaskDetailsComponent = dynamic(
	() => import('@/core/components/pages/task/task-details').then((mod) => mod.TaskDetailsComponent),
	{
		ssr: false,
		loading: () => (
			<div className="w-full h-96 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg flex items-center justify-center">
				<div className="text-gray-500">Loading Task Details...</div>
			</div>
		)
	}
);

export const LazyRichTextEditor = dynamic(
	() =>
		import('@/core/components/pages/task/description-block/task-description-editor').then((mod) => ({
			default: mod.default
		})),
	{
		ssr: false,
		loading: () => <RichTextEditorSkeleton />
	}
);

export const LazyTaskActivity = dynamic(
	() => import('@/core/components/pages/task/task-activity').then((mod) => ({ default: mod.TaskActivity })),
	{
		ssr: false,
		loading: () => <TaskActivitySkeleton />
	}
);

export const LazyTaskDetailsAside = dynamic(
	() => import('@/core/components/pages/task/task-details-aside').then((mod) => ({ default: mod.default })),
	{
		ssr: false,
		loading: () => <DetailsAsideSkeleton />
	}
);

export const LazyChildIssueCard = dynamic(
	() => import('@/core/components/pages/task/child-issue-card').then((mod) => ({ default: mod.ChildIssueCard })),
	{
		ssr: false,
		loading: () => <IssueCardSkeleton title="Child Issues" />
	}
);

export const LazyRelatedIssueCard = dynamic(
	() => import('@/core/components/pages/task/issue-card').then((mod) => ({ default: mod.RelatedIssueCard })),
	{
		ssr: false,
		loading: () => <IssueCardSkeleton title="Related Issues" />
	}
);

// Task Modals
export const LazyCreateTaskModal = dynamic(() => import('../features/tasks/create-task-modal'), {
	ssr: false
	// Note: No loading property for conditional modals
});

export const LazyEditStatusModal = dynamic(() => import('../features/tasks/edit-status-modal'), {
	ssr: false
	// Note: No loading property for conditional modals
});

// Task Kanban Card Components
export const LazyTaskAllStatusTypes = dynamic(
	() => import('../tasks/task-all-status-type').then((mod) => ({ default: mod.TaskAllStatusTypes })),
	{
		ssr: false,
		loading: () => <div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);

export const LazyTaskInput = dynamic(() => import('../tasks/task-input').then((mod) => ({ default: mod.TaskInput })), {
	ssr: false,
	loading: () => <div className="w-full h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
});

export const LazyTaskIssueStatus = dynamic(
	() => import('../tasks/task-issue').then((mod) => ({ default: mod.TaskIssueStatus })),
	{
		ssr: false,
		loading: () => <div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
	}
);
