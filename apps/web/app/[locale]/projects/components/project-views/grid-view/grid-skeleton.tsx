import { Skeleton } from '@/components/ui/skeleton';
import { FC } from 'react';
import { cn } from '@/lib/utils';

/**
 * Project header component with skeleton elements for project icon and name.
 */
const ProjectHeader: FC = () => (
	<div className="w-full flex items-center justify-between">
		<div className="flex items-center font-medium gap-2">
			<Skeleton className="w-9 h-9 rounded-lg border" />
			<Skeleton className="h-4 w-32 rounded" />
		</div>
		<Skeleton className="h-7 w-20 rounded" />
	</div>
);

/**
 * Project status component with skeleton elements for status indicators.
 */
const ProjectStatus: FC = () => (
	<div className="w-full items-center flex gap-4">
		<Skeleton className="h-4 w-14 rounded" />
		<Skeleton className="h-4 w-16 rounded" />
	</div>
);

/**
 * Project dates component with skeleton elements for start and end dates.
 */
const ProjectDates: FC = () => (
	<div className="w-full flex items-center gap-8">
		{/* Start Date */}
		<div className="flex flex-col gap-1.5">
			<Skeleton className="h-4 w-16 rounded" />
			<div className="flex items-center gap-1">
				<Skeleton className="h-4 w-20 rounded" />
			</div>
		</div>
		{/* End Date */}
		<div className="flex flex-col gap-1.5">
			<Skeleton className="h-4 w-16 rounded" />
			<div className="flex items-center gap-1">
				<Skeleton className="h-4 w-20 rounded" />
			</div>
		</div>
	</div>
);

/**
 * Avatar group component with skeleton elements for avatars.
 */
interface AvatarGroupProps {
	/**
	 * Number of avatars to display.
	 */
	count: number;
	/**
	 * Width of the label skeleton element.
	 */
	labelWidth?: number;
}

const AvatarGroup: FC<AvatarGroupProps> = ({ count, labelWidth = 14 }) => (
	<div className="w-full flex flex-col gap-1.5">
		<Skeleton className={`h-4 w-${labelWidth} rounded`} />
		<div className="flex -space-x-2">
			{Array.from({ length: count }).map((_, index) => (
				<Skeleton key={index} className="h-7 w-7 rounded-full border" />
			))}
		</div>
	</div>
);

/**
 * Project team info component with avatar groups for members, teams, and managers.
 */
const ProjectTeamInfo: FC = () => (
	<div className="w-full flex items-center justify-between">
		<AvatarGroup count={3} labelWidth={14} />
		<AvatarGroup count={2} labelWidth={12} />
		<AvatarGroup count={2} labelWidth={16} />
	</div>
);

/**
 * Project grid item component with skeleton elements for project information.
 */
const ProjectGridItem: FC = () => (
	<div
		className={cn(
			'w-full bg-white dark:bg-dark--theme-light rounded-lg overflow-hidden border border-gray-200 dark:border-dark--theme-light',
			'hover:border-primary dark:hover:border-primary transition-colors duration-200'
		)}
	>
		<div className="w-full shrink-0 p-3 flex">
			<Skeleton className="h-4 w-4 mt-1 rounded border" />
			<div className="h-full flex flex-col gap-6 grow ml-3">
				<ProjectHeader />
				<ProjectStatus />
				<ProjectDates />
				<ProjectTeamInfo />
			</div>
		</div>
	</div>
);

/**
 * Projects grid skeleton component with multiple project grid items.
 */
export const ProjectsGridSkeleton: FC = () => {
	return (
		<>
			{Array.from({ length: 12 }).map((_, index) => (
				<ProjectGridItem key={index} />
			))}
			<span>Bonjour bukavu</span>
		</>
	);
};
