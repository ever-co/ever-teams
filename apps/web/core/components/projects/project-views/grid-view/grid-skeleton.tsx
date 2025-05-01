import { Skeleton } from '@/core/components/ui/skeleton';
import { cn } from '@/core/lib/helpers';
import { FC } from 'react';

/**
 * Project header component with skeleton elements for project icon and name.
 */
const ProjectHeader: FC = () => (
	<div className="w-full flex items-center justify-between">
		<div className="flex items-center gap-2">
			<Skeleton className="w-8 h-8 rounded" />
			<Skeleton className="h-4 w-24 rounded" />
		</div>
		<Skeleton className="h-6 w-6 rounded" />
	</div>
);

/**
 * Project status component with skeleton elements.
 */
const ProjectStatus: FC = () => (
	<div className="w-full flex items-center gap-2">
		<Skeleton className="h-5 w-16 rounded-full" />
	</div>
);

/**
 * Project dates component with skeleton elements.
 */
const ProjectDates: FC = () => (
	<div className="w-full flex items-center gap-4">
		<div className="flex flex-col gap-1">
			<Skeleton className="h-4 w-16 rounded" />
			<Skeleton className="h-4 w-20 rounded" />
		</div>
		<div className="flex flex-col gap-1">
			<Skeleton className="h-4 w-16 rounded" />
			<Skeleton className="h-4 w-20 rounded" />
		</div>
	</div>
);

/**
 * Project team members component with skeleton elements.
 */
const ProjectTeam: FC = () => (
	<div className="w-full flex items-center justify-between">
		<div className="flex flex-col gap-1">
			<Skeleton className="h-4 w-16 rounded" />
			<div className="flex -space-x-2">
				{[...Array(2)].map((_, i) => (
					<Skeleton
						key={i}
						className="h-8 w-8 rounded-full border-2 border-white dark:border-dark--theme-light"
					/>
				))}
			</div>
		</div>
		<div className="flex flex-col gap-1">
			<Skeleton className="h-4 w-12 rounded" />
			<div className="flex -space-x-2">
				<Skeleton className="h-8 w-8 rounded-full border-2 border-white dark:border-dark--theme-light" />
			</div>
		</div>
		<div className="flex flex-col gap-1">
			<Skeleton className="h-4 w-16 rounded" />
			<div className="flex -space-x-2">
				<Skeleton className="h-8 w-8 rounded-full border-2 border-white dark:border-dark--theme-light" />
			</div>
		</div>
	</div>
);

/**
 * Project grid item skeleton component.
 */
const ProjectGridItem: FC = () => (
	<div
		className={cn(
			'bg-white hover:border-primary dark:hover:border-primary dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-dark--theme-light p-4 flex flex-col gap-4'
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
export const ProjectsGridSkeleton: FC = () => (
	<>
		{[...Array(12)].map((_, i) => (
			<ProjectGridItem key={i} />
		))}
	</>
);
