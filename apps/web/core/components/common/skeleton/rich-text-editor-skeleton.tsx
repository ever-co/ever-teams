import { FC } from 'react';
import { clsxm } from '@/core/lib/utils';

interface RichTextEditorSkeletonProps {
	className?: string;
}

/**
 * Skeleton for RichTextEditor component
 * Mimics the structure of the Slate.js editor with toolbar and content area
 */
export const RichTextEditorSkeleton: FC<RichTextEditorSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex flex-col prose dark:prose-invert', className)}>
			{/* Toolbar skeleton */}
			<div className="flex gap-2 items-center p-2 border-b border-gray-200 dark:border-gray-700">
				{/* Formatting buttons */}
				{[...Array(6)].map((_, i) => (
					<div key={i} className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				))}

				{/* Separator */}
				<div className="mx-2 w-px h-6 bg-gray-300 dark:bg-gray-600" />

				{/* More buttons */}
				{[...Array(3)].map((_, i) => (
					<div key={i + 6} className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				))}

				{/* Emoji button */}
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded ml-auto" />
			</div>

			{/* Divider */}
			<div className="h-[0.0625rem] bg-[#0000001A] dark:bg-[#FFFFFF29]" />

			{/* Content area skeleton */}
			<div className="p-4 space-y-3 h-64 bg-transparent">
				{/* Simulated text lines */}
				<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-5/6 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-4/5 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-3/4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Simulated paragraph break */}
				<div className="py-2" />

				<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-2/3 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};

/**
 * Skeleton for TaskActivity component
 * Mimics the collapsible activity section with grouped timesheets
 */
export const TaskActivitySkeleton: FC<{ className?: string }> = ({ className }) => {
	return (
		<div
			className={clsxm(
				'bg-white dark:bg-dark--theme-light rounded-xl border border-[#00000014] dark:border-[#26272C] p-4',
				className
			)}
		>
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Activity items */}
			<div className="space-y-3">
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]"
					>
						{/* Date header */}
						<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-3" />

						{/* Activity entries */}
						{[...Array(2)].map((_, j) => (
							<div key={j} className="flex gap-3 items-center py-2">
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="flex-1 space-y-1">
									<div className="w-48 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								<div className="w-16 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for TaskDetailsAside component
 * Mimics the sidebar with multiple sections
 */
export const DetailsAsideSkeleton: FC<{ className?: string }> = ({ className }) => {
	return (
		<div
			className={clsxm(
				'border border-solid border-[#00000014] dark:border-[#26272C] dark:bg-dark--theme rounded-xl p-4',
				className
			)}
		>
			{/* Header */}
			<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-4" />

			{/* Sections with dividers */}
			{[...Array(5)].map((_, i) => (
				<div key={i}>
					{/* Section content */}
					<div className="py-4 space-y-3">
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="space-y-2">
							<div className="w-full h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Divider (except for last item) */}
					{i < 4 && <div className="h-[0.0625rem] bg-[#F2F2F2] dark:bg-[#26272C] w-[95%] mx-auto" />}
				</div>
			))}
		</div>
	);
};

/**
 * Skeleton for issue cards (ChildIssueCard, RelatedIssueCard)
 */
export const IssueCardSkeleton: FC<{ className?: string; title?: string }> = ({ className, title = 'Issues' }) => {
	return (
		<div
			className={clsxm(
				'w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] border border-[#00000014] dark:border-[#26272C] rounded-xl',
				className
			)}
		>
			{/* Header */}
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="flex gap-2 items-center">
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Content */}
			<div className="py-4 space-y-3">
				{[...Array(2)].map((_, i) => (
					<div key={i} className="flex gap-3 items-center p-3 bg-white rounded-lg dark:bg-dark--theme">
						<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="flex-1 space-y-1">
							<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>
		</div>
	);
};
