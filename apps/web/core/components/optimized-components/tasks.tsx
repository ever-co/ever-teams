import dynamic from 'next/dynamic';
import { TaskCardSkeleton, UserProfileTaskSkeleton } from '../common/skeleton/profile-component-skeletons';
import { ProfileTabsSkeleton } from '../pages/profile/profile-band-skeleton';
import { RichTextEditorSkeleton } from '../common/skeleton/rich-text-editor-skeleton';
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
		loading: () => <ProfileTabsSkeleton />
	}
);

// Task Status & Properties Dropdowns
export const LazyEpicPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.EpicPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-md bg-foreground/5 min-h-6 px-2 max-h-full">
				<div className="w-24 h-6 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		)
	}
);

export const LazyStatusDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.StatusDropdown),
	{
		ssr: false,
		loading: () => <div className="w-20 h-6 bg-foreground/5 animate-pulse rounded-md" />
	}
);

export const LazyTaskLabelsDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskLabelsDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-md text-foreground bg-foreground/5 min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		)
	}
);

export const LazyTaskPropertiesDropdown = dynamic(
	() => import('@/core/components/tasks/task-status').then((mod) => mod.TaskPropertiesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="min-w-fit lg:mt-0 input-border rounded-md bg-foreground/5 flex flex-col justify-center">
				<div className="w-24 h-6 bg-foreground/5 animate-pulse rounded-md mx-2" />
			</div>
		)
	}
);

export const LazyTaskSizesDropdown = dynamic(
	() => import('@/core/components/tasks/task-sizes-dropdown').then((mod) => mod.TaskSizesDropdown),
	{
		ssr: false,
		loading: () => (
			<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-md bg-foreground/5 min-h-6 px-2 max-h-full">
				<div className="w-20 h-6 bg-foreground/5 animate-pulse rounded-md" />
			</div>
		)
	}
);

// Task Details Components
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
		loading: () => <div className="w-20 h-4 bg-foreground/5 animate-pulse rounded-sm" />
	}
);

export const LazyTaskInput = dynamic(() => import('../tasks/task-input').then((mod) => ({ default: mod.TaskInput })), {
	ssr: false,
	loading: () => <div className="w-full h-6 bg-foreground/5 animate-pulse rounded-md" />
});

export const LazyTaskIssueStatus = dynamic(
	() => import('../tasks/task-issue').then((mod) => ({ default: mod.TaskIssueStatus })),
	{
		ssr: false,
		loading: () => <div className="w-6 h-6 bg-foreground/5 animate-pulse rounded-sm" />
	}
);
