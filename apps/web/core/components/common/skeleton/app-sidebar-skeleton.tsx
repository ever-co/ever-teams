import { cn } from '@/core/lib/helpers';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarFooter,
	SidebarRail,
	SidebarTrigger,
	SidebarSeparator
} from '@/core/components/common/sidebar';

interface AppSidebarSkeletonProps {
	className?: string;
}

export function AppSidebarSkeleton({ className }: AppSidebarSkeletonProps) {
	return (
		<Sidebar className={cn('z-[1000]', className)} collapsible="icon">
			{/* Sidebar Trigger Skeleton */}
			<SidebarTrigger className="absolute right-[-5%] top-[8%] size-7 !bg-[#F0F0F0] dark:!bg-[#353741] animate-pulse !rounded-full transition-all duration-300 z-[55]" />

			{/* Sidebar Header Skeleton */}
			<SidebarHeader>
				{/* Workspace Switcher Skeleton */}
				<div className="p-2">
					<div className="h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md" />
				</div>

				<SidebarSeparator />

				{/* Command Modal Skeleton */}
				<div className="p-2">
					<div className="h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md" />
				</div>

				{/* Home Navigation Skeleton */}
				<div className="space-y-2 p-2">
					<div className="h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
					<div className="h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
				</div>

				<SidebarSeparator />
			</SidebarHeader>

			{/* Sidebar Content Skeleton */}
			<SidebarContent>
				<div className="space-y-4 p-2">
					{/* Dashboard Section */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						</div>
					</div>

					{/* Favorites Section */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						</div>
					</div>

					{/* Tasks Section */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						</div>
					</div>

					{/* Projects Section */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							{/* Project items with circular icons */}
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center space-x-2">
									<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="h-5 flex-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
								</div>
							))}
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						</div>
					</div>

					{/* My Works Section */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							<div className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						</div>
					</div>

					{/* Reports Section (for managers) */}
					<div className="space-y-2">
						<div className="h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
						<div className="ml-4 space-y-1">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm" />
							))}
						</div>
					</div>
				</div>
			</SidebarContent>

			{/* Sidebar Footer Skeleton */}
			<SidebarFooter className="p-1 mt-auto">
				<div className="h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md" />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
