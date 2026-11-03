import { FC } from 'react';
import { Skeleton } from '@/core/components/common/skeleton';

const AVATAR_SKELETON_KEYS = ['first-avatar', 'second-avatar'];

const GRID_SKELETON_KEYS = Array.from({ length: 12 }, (_, position) => `project-skeleton-${position}`);

/**
 * Project header component with skeleton elements for project icon and name.
 */
const ProjectHeader: FC = () => (
	<div className="flex justify-between items-center w-full">
		<div className="flex gap-2.5 items-center">
			<Skeleton className="size-8 rounded-md" />
			<Skeleton className="w-24 h-4" />
		</div>
		<Skeleton className="size-7" />
	</div>
);

/**
 * Project status component with skeleton elements.
 */
const ProjectStatus: FC = () => (
	<div className="flex gap-2 items-center w-full">
		<Skeleton className="w-10 h-3" />
		<Skeleton className="w-16 h-5 rounded-sm" />
	</div>
);

/**
 * Project dates component with skeleton elements.
 */
const ProjectDates: FC = () => (
	<div className="grid grid-cols-2 gap-4 w-full">
		<div className="flex flex-col gap-1">
			<Skeleton className="w-16 h-3" />
			<Skeleton className="w-20 h-4" />
		</div>
		<div className="flex flex-col gap-1">
			<Skeleton className="w-16 h-3" />
			<Skeleton className="w-20 h-4" />
		</div>
	</div>
);

/**
 * Project team members component with skeleton elements.
 */
const ProjectTeam: FC = () => (
	<div className="grid grid-cols-3 gap-4 w-full hairline-t border-dashed border-border pt-4">
		<div className="flex flex-col gap-1.5">
			<Skeleton className="w-14 h-3" />
			<div className="flex -space-x-2">
				{AVATAR_SKELETON_KEYS.map((key) => (
					<Skeleton key={key} className="size-8 rounded-full ring-2 ring-card" />
				))}
			</div>
		</div>
		<div className="flex flex-col gap-1.5">
			<Skeleton className="w-12 h-3" />
			<div className="flex -space-x-2">
				<Skeleton className="size-8 rounded-full ring-2 ring-card" />
			</div>
		</div>
		<div className="flex flex-col gap-1.5">
			<Skeleton className="w-14 h-3" />
			<div className="flex -space-x-2">
				<Skeleton className="size-8 rounded-full ring-2 ring-card" />
			</div>
		</div>
	</div>
);

/**
 * Project grid item skeleton component.
 */
export const ProjectGridItem: FC = () => (
	<div className="flex gap-3 p-4 w-full rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
		<Skeleton className="mt-2 size-4 shrink-0 rounded-[4px]" />
		<div className="flex flex-col gap-4 min-w-0 grow">
			<ProjectHeader />
			<ProjectStatus />
			<ProjectDates />
			<ProjectTeam />
		</div>
	</div>
);

/**
 * Projects grid skeleton component that displays multiple loading items.
 */
export const ProjectsGridSkeleton: FC = () => (
	<div className="grid col-span-full grid-cols-1 gap-4 w-full sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{GRID_SKELETON_KEYS.map((key) => (
			<ProjectGridItem key={key} />
		))}
	</div>
);
