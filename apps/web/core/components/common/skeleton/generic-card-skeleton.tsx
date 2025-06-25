import { FC } from 'react';
import { Skeleton } from '@/core/components/common/skeleton';
import { cn } from '@/core/lib/helpers';

interface GenericCardSkeletonProps {
	className?: string;
	variant?: 'project' | 'team' | 'task' | 'simple';
	showHeader?: boolean;
	showStatus?: boolean;
	showDates?: boolean;
	showTeam?: boolean;
	showActions?: boolean;
	showDescription?: boolean;
}

/**
 * Generic card skeleton component that can be customized for different card types
 */
export const GenericCardSkeleton: FC<GenericCardSkeletonProps> = ({
	className,
	variant = 'simple',
	showHeader = true,
	showStatus = true,
	showDates = true,
	showTeam = true,
	showActions = true,
	showDescription = false
}) => {
	// Preset configurations for common card types
	const presets = {
		project: {
			showHeader: true,
			showStatus: true,
			showDates: true,
			showTeam: true,
			showActions: true,
			showDescription: false
		},
		team: {
			showHeader: true,
			showStatus: false,
			showDates: false,
			showTeam: true,
			showActions: true,
			showDescription: true
		},
		task: {
			showHeader: true,
			showStatus: true,
			showDates: false,
			showTeam: true,
			showActions: false,
			showDescription: true
		},
		simple: {
			showHeader: true,
			showStatus: false,
			showDates: false,
			showTeam: false,
			showActions: false,
			showDescription: false
		}
	};

	// Apply preset configuration
	const config = {
		showHeader: showHeader ?? presets[variant].showHeader,
		showStatus: showStatus ?? presets[variant].showStatus,
		showDates: showDates ?? presets[variant].showDates,
		showTeam: showTeam ?? presets[variant].showTeam,
		showActions: showActions ?? presets[variant].showActions,
		showDescription: showDescription ?? presets[variant].showDescription
	};

	return (
		<div
			className={cn(
				'bg-white min-w-72 w-fit hover:border-primary dark:hover:border-primary dark:bg-dark--theme-light',
				'flex flex-col gap-4 p-4 rounded-lg border border-gray-200 dark:border-dark--theme-light',
				'animate-pulse',
				className
			)}
		>
			{/* Header Section */}
			{config.showHeader && (
				<div className="flex justify-between items-center w-full">
					<div className="flex gap-2 items-center">
						<Skeleton className="w-8 h-8 rounded" />
						<Skeleton className="w-24 h-4 rounded" />
					</div>
					{config.showActions && <Skeleton className="w-6 h-6 rounded" />}
				</div>
			)}

			{/* Status Section */}
			{config.showStatus && (
				<div className="flex gap-2 items-center w-full">
					<Skeleton className="w-16 h-5 rounded-full" />
				</div>
			)}

			{/* Description Section */}
			{config.showDescription && (
				<div className="space-y-2 w-full">
					<Skeleton className="w-full h-4 rounded" />
					<Skeleton className="w-3/4 h-4 rounded" />
				</div>
			)}

			{/* Dates Section */}
			{config.showDates && (
				<div className="flex gap-4 items-center w-full">
					<div className="flex flex-col gap-1">
						<Skeleton className="w-16 h-4 rounded" />
						<Skeleton className="w-20 h-4 rounded" />
					</div>
					<div className="flex flex-col gap-1">
						<Skeleton className="w-16 h-4 rounded" />
						<Skeleton className="w-20 h-4 rounded" />
					</div>
				</div>
			)}

			{/* Team Section */}
			{config.showTeam && (
				<div className="flex justify-between items-center w-full">
					<div className="flex flex-col gap-1">
						<Skeleton className="w-16 h-4 rounded" />
						<div className="flex -space-x-2">
							{[...Array(2)].map((_, i) => (
								<Skeleton
									key={i}
									className="w-8 h-8 rounded-full border-2 border-white dark:border-dark--theme-light"
								/>
							))}
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<Skeleton className="w-12 h-4 rounded" />
						<div className="flex -space-x-2">
							<Skeleton className="w-8 h-8 rounded-full border-2 border-white dark:border-dark--theme-light" />
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<Skeleton className="w-16 h-4 rounded" />
						<div className="flex -space-x-2">
							<Skeleton className="w-8 h-8 rounded-full border-2 border-white dark:border-dark--theme-light" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

/**
 * Grid of generic card skeletons
 */
interface GenericCardsGridSkeletonProps {
	count?: number;
	variant?: 'project' | 'team' | 'task' | 'simple';
	className?: string;
	gridCols?: 'auto' | '1' | '2' | '3' | '4' | '5' | '6' | number;
}

export const GenericCardsGridSkeleton: FC<GenericCardsGridSkeletonProps> = ({
	count = 12,
	variant = 'project',
	className,
	gridCols = 'auto'
}) => {
	const gridClasses = {
		auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
		'1': 'grid-cols-1',
		'2': 'grid-cols-2',
		'3': 'grid-cols-3',
		'4': 'grid-cols-4',
		'5': 'grid-cols-5',
		'6': 'grid-cols-6'
	};

	return (
		<div className={cn('grid gap-2', gridClasses[gridCols as keyof typeof gridClasses], className)}>
			{[...Array(count)].map((_, i) => (
				<GenericCardSkeleton key={i} variant={variant} />
			))}
		</div>
	);
};

/**
 * Single project card skeleton (backward compatibility)
 */
export const ProjectCardSkeleton: FC<{ className?: string }> = ({ className }) => (
	<GenericCardSkeleton variant="project" className={className} />
);

/**
 * Single team card skeleton
 */
export const TeamCardSkeleton: FC<{ className?: string }> = ({ className }) => (
	<GenericCardSkeleton variant="team" className={className} />
);

/**
 * Single task card skeleton
 */
export const TaskCardSkeleton: FC<{ className?: string }> = ({ className }) => (
	<GenericCardSkeleton variant="task" className={className} />
);
