import { FC } from 'react';
import { GenericCardsGridSkeleton } from '@/core/components/common/skeleton/generic-card-skeleton';
import { Skeleton } from '@/core/components/common/skeleton';
import { cn } from '@/core/lib/helpers';

/**
 * Project header component with skeleton elements for project icon and name.
 */
const ProjectHeader: FC = () => (
	<div className="flex justify-between items-center w-full">
		<div className="flex gap-2 items-center">
			<Skeleton className="w-8 h-8 rounded" />
			<Skeleton className="w-24 h-4 rounded" />
		</div>
		<Skeleton className="w-6 h-6 rounded" />
	</div>
);

/**
 * Project status component with skeleton elements.
 */
const ProjectStatus: FC = () => (
	<div className="flex gap-2 items-center w-full">
		<Skeleton className="w-16 h-5 rounded-full" />
	</div>
);

/**
 * Project dates component with skeleton elements.
 */
const ProjectDates: FC = () => (
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
);

/**
 * Project team members component with skeleton elements.
 */
const ProjectTeam: FC = () => (
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
);

/**
 * Project grid item skeleton component.
 */
export const ProjectGridItem: FC = () => (
	<div
		className={cn(
			'flex flex-col gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary dark:hover:border-primary dark:bg-dark--theme-light dark:border-dark--theme-light'
		)}
	>
		<ProjectHeader />
		<ProjectStatus />
		<ProjectDates />
		<ProjectTeam />
	</div>
);

/**
 * Projects grid skeleton component that displays multiple loading items.
 */
export const ProjectsGridSkeleton: FC = () => <GenericCardsGridSkeleton count={12} variant="project" />;
