import { FC } from 'react';
import { clsxm } from '@/core/lib/utils';
import {
	RichTextEditorSkeleton,
	TaskActivitySkeleton,
	DetailsAsideSkeleton,
	IssueCardSkeleton
} from './rich-text-editor-skeleton';

interface TaskDetailsPageSkeletonProps {
	className?: string;
}

/**
 * Complete skeleton for the Task Details page
 * Matches the exact structure of TaskDetailsComponent
 */
export const TaskDetailsPageSkeleton: FC<TaskDetailsPageSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex flex-col w-full min-h-screen', className)}>
			<section className="flex flex-col justify-between lg:flex-row gap-2.5 lg:items-start 3xl:gap-8">
				{/* Main Content Section */}
				<section className="md:max-w-[57rem] w-full 3xl:max-w-none xl:w-full mb-4 md:mb-0">
					{/* Task Title Block Skeleton */}
					<TitleBlockSkeleton />

					{/* Main Content Area */}
					<div className="bg-[#F9F9F9] dark:bg-dark--theme-light p-2 md:p-6 pt-0 flex flex-col gap-8 rounded-sm">
						{/* RichTextEditor Skeleton */}
						<RichTextEditorSkeleton />

						{/* Child Issues Card Skeleton */}
						<IssueCardSkeleton title="Child Issues" />

						{/* Related Issues Card Skeleton */}
						<IssueCardSkeleton title="Related Issues" />

						{/* Task Activity Skeleton */}
						<TaskActivitySkeleton />
					</div>
				</section>

				{/* Sidebar Section */}
				<div className="flex flex-col my-4 lg:mt-0 3xl:min-w-[24rem] gap-3 w-full lg:w-[30%]">
					{/* Task Details Aside Skeleton */}
					<div className="flex flex-col bg-white rounded-xl dark:bg-dark--theme-light">
						<DetailsAsideSkeleton />
					</div>

					{/* Task Properties Skeleton */}
					<TaskPropertiesSkeleton />
				</div>
			</section>
		</div>
	);
};

/**
 * Skeleton for TaskTitleBlock component
 */
export const TitleBlockSkeleton: FC = () => {
	return (
		<div className="flex flex-col gap-4 mb-6">
			{/* Task number and status */}
			<div className="flex gap-3 items-center">
				<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
			</div>

			{/* Task title */}
			<div className="space-y-2">
				<div className="w-full h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-3/4 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Task meta info */}
			<div className="flex gap-4 items-center">
				<div className="flex gap-2 items-center">
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="flex gap-2 items-center">
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="flex gap-2 items-center">
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for TaskProperties component
 */
const TaskPropertiesSkeleton: FC = () => {
	return (
		<div className="bg-white dark:bg-dark--theme-light rounded-xl border border-[#00000014] dark:border-[#26272C] p-4">
			{/* Header */}
			<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-4" />

			{/* Properties list */}
			<div className="space-y-4">
				{[...Array(6)].map((_, i) => (
					<div key={i} className="flex justify-between items-center">
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>

			{/* Action buttons */}
			<div className="flex gap-2 mt-6">
				<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};

/**
 * Skeleton for the entire page header (breadcrumb area)
 */
export const TaskDetailsHeaderSkeleton: FC = () => {
	return (
		<div className="py-5 bg-white dark:bg-dark--theme">
			<div className="flex gap-8 items-center">
				{/* Back arrow */}
				<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Breadcrumb */}
				<div className="flex gap-2 items-center">
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-2 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

/**
 * Compact skeleton for quick loading states
 */
export const TaskDetailsCompactSkeleton: FC = () => {
	return (
		<div className="flex flex-col w-full min-h-screen animate-pulse">
			{/* Header skeleton */}
			<div className="h-16 bg-[#F0F0F0] dark:bg-[#353741] rounded mb-4" />

			{/* Content skeleton */}
			<div className="flex gap-4">
				{/* Main content */}
				<div className="flex-1 space-y-4">
					<div className="h-32 bg-[#F0F0F0] dark:bg-[#353741] rounded" />
					<div className="h-64 bg-[#F0F0F0] dark:bg-[#353741] rounded" />
					<div className="h-48 bg-[#F0F0F0] dark:bg-[#353741] rounded" />
				</div>

				{/* Sidebar */}
				<div className="space-y-4 w-80">
					<div className="h-96 bg-[#F0F0F0] dark:bg-[#353741] rounded" />
					<div className="h-32 bg-[#F0F0F0] dark:bg-[#353741] rounded" />
				</div>
			</div>
		</div>
	);
};
