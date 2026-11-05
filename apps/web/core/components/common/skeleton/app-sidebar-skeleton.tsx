'use client';

import { cn } from '@/core/lib/helpers';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarRail } from '@/core/components/common/sidebar';
import { APP_RAIL_SIDEBAR_OFFSET } from '@/core/components/common/app-switcher/app-rail';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { useHasMounted } from '@/core/hooks/common/use-has-mounted';

interface AppSidebarSkeletonProps {
	className?: string;
}

function GroupSkeleton({ rows }: Readonly<{ rows: number }>) {
	const rowKeys = Array.from({ length: rows }, (_, index) => index);
	return (
		<div className="space-y-1.5">
			<div className="h-7 animate-pulse rounded-md bg-foreground/5" />
			<div className="ml-4 space-y-1">
				{rowKeys.map((key) => (
					<div key={key} className="h-6 animate-pulse rounded-md bg-foreground/5" />
				))}
			</div>
		</div>
	);
}

/** Same geometry as AppSidebar, so the shell does not jump when the real sidebar mounts. */
export function AppSidebarSkeleton({ className }: AppSidebarSkeletonProps) {
	// The placement lives in this browser's storage, unknown to the server render: the rail's room is reserved once
	// mounted, still under the skeleton, so the real sidebar takes it over without moving the page
	const { mounted } = useHasMounted();
	const placement = useAppSwitcherPlacement();
	const isRailPicked = placement === 'rail';
	const reservesRail = mounted && isRailPicked;

	return (
		<>
			{reservesRail && <div aria-hidden="true" className="hidden h-dvh w-14 shrink-0 md:block" />}
			<Sidebar
				variant="inset"
				className={cn('z-[1000]', reservesRail && APP_RAIL_SIDEBAR_OFFSET, className)}
				collapsible="icon"
				aria-busy="true"
			>
				<SidebarHeader className="gap-2 p-2">
					<div className="flex items-center gap-1">
						<div className="h-12 flex-1 animate-pulse rounded-md bg-foreground/5" />
						<div className="size-7 shrink-0 animate-pulse rounded-md bg-foreground/5" />
					</div>
					<div className="flex items-center gap-1.5">
						<div className="h-8 flex-1 animate-pulse rounded-md bg-foreground/5" />
						<div className="size-8 shrink-0 animate-pulse rounded-md bg-foreground/5" />
						<div className="size-8 shrink-0 animate-pulse rounded-md bg-foreground/5" />
					</div>
				</SidebarHeader>

				<SidebarContent>
					<div className="space-y-4 p-2">
						<div className="space-y-1">
							<div className="h-8 animate-pulse rounded-md bg-foreground/5" />
						</div>
						<GroupSkeleton rows={2} />
						<GroupSkeleton rows={3} />
						<GroupSkeleton rows={2} />
						<GroupSkeleton rows={3} />
						<GroupSkeleton rows={2} />
					</div>
				</SidebarContent>

				<SidebarFooter className="mt-auto gap-2 p-2">
					<div className="h-12 animate-pulse rounded-md bg-foreground/5" />
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>
		</>
	);
}
