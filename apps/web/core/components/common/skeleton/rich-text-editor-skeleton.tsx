import { FC } from 'react';
import { clsxm } from '@/core/lib/utils';

const ACTIVITY_GROUP_KEYS = ['first-group', 'second-group', 'third-group'];

const CONTENT_ROW_KEYS = ['first-row', 'second-row'];

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
			<div className="flex gap-2 items-center p-2 hairline-b border-border">
				{/* Formatting buttons */}
				{[...Array(6)].map((_, i) => (
					<div key={i} className="w-8 h-8 bg-foreground/5 animate-pulse rounded-md" />
				))}

				{/* Separator */}
				<div className="mx-2 w-px h-6 bg-border" />

				{/* More buttons */}
				{[...Array(3)].map((_, i) => (
					<div key={i + 6} className="w-8 h-8 bg-foreground/5 animate-pulse rounded-md" />
				))}

				{/* Emoji button */}
				<div className="w-8 h-8 bg-foreground/5 animate-pulse rounded-md ml-auto" />
			</div>

			{/* Divider */}
			<div className="h-px bg-border" />

			{/* Content area skeleton */}
			<div className="p-4 space-y-3 h-64 bg-transparent">
				{/* Simulated text lines */}
				<div className="w-full h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-5/6 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-4/5 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-full h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-3/4 h-4 bg-foreground/5 animate-pulse rounded-md" />

				{/* Simulated paragraph break */}
				<div className="py-2" />

				<div className="w-full h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="w-2/3 h-4 bg-foreground/5 animate-pulse rounded-md" />
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
			className={clsxm('bg-card rounded-xl hairline-ring ring-border shadow-sm shadow-black/6.5 p-4', className)}
		>
			{/* Header */}
			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<div className="w-6 h-6 bg-foreground/5 animate-pulse rounded-sm" />
					<div className="w-24 h-5 bg-foreground/5 animate-pulse rounded-md" />
				</div>
				<div className="w-4 h-4 bg-foreground/5 animate-pulse rounded-sm" />
			</div>

			{/* Activity items */}
			<div className="space-y-3">
				{ACTIVITY_GROUP_KEYS.map((groupKey) => (
					<div key={groupKey} className="rounded-lg p-4 bg-foreground/[0.03]">
						{/* Date header */}
						<div className="w-32 h-4 bg-foreground/5 animate-pulse rounded-md mb-3" />

						{/* Activity entries */}
						{[...Array(2)].map((_, j) => (
							<div key={j} className="flex gap-3 items-center py-2">
								<div className="w-8 h-8 bg-foreground/5 animate-pulse rounded-full" />
								<div className="flex-1 space-y-1">
									<div className="w-48 h-3 bg-foreground/5 animate-pulse rounded-md" />
									<div className="w-32 h-3 bg-foreground/5 animate-pulse rounded-md" />
								</div>
								<div className="w-16 h-3 bg-foreground/5 animate-pulse rounded-md" />
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
		<div className={clsxm('rounded-xl p-4', className)}>
			{/* Header */}
			<div className="w-32 h-5 bg-foreground/5 animate-pulse rounded-md mb-4" />

			{/* Sections with dividers */}
			{[...Array(5)].map((_, i) => (
				<div key={i}>
					{/* Section content */}
					<div className="py-4 space-y-3">
						<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
						<div className="space-y-2">
							<div className="w-full h-3 bg-foreground/5 animate-pulse rounded-md" />
							<div className="w-3/4 h-3 bg-foreground/5 animate-pulse rounded-md" />
						</div>
					</div>

					{/* Divider (except for last item) */}
					{i < 4 && <div className="h-px bg-border w-[95%] mx-auto" />}
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
				'w-full pt-0 px-4 md:pt-0 md:px-4 bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 rounded-xl',
				className
			)}
		>
			{/* Header */}
			<div className="flex justify-between items-center gap-5 py-2 hairline-b border-border">
				<div className="w-24 h-4 bg-foreground/5 animate-pulse rounded-md" />
				<div className="flex gap-2 items-center">
					<div className="w-4 h-4 bg-foreground/5 animate-pulse rounded-sm" />
					<div className="w-4 h-4 bg-foreground/5 animate-pulse rounded-sm" />
				</div>
			</div>

			{/* Content */}
			<div className="py-4 space-y-3">
				{CONTENT_ROW_KEYS.map((rowKey) => (
					<div key={rowKey} className="flex gap-3 items-center p-3 rounded-lg bg-foreground/[0.03]">
						<div className="w-6 h-6 bg-foreground/5 animate-pulse rounded-sm" />
						<div className="flex-1 space-y-1">
							<div className="w-48 h-4 bg-foreground/5 animate-pulse rounded-md" />
							<div className="w-32 h-3 bg-foreground/5 animate-pulse rounded-md" />
						</div>
						<div className="w-16 h-6 bg-foreground/5 animate-pulse rounded-md" />
					</div>
				))}
			</div>
		</div>
	);
};
