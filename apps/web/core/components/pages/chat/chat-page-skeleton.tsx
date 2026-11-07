import { NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';

/** The page while its code or its first data loads: the three panes' outlines. */
export function ChatPageSkeleton() {
	return (
		<div aria-hidden="true" className="flex h-full min-h-0">
			<div className="hidden w-64 shrink-0 border-r border-border p-3 lg:block">
				<div className="mb-3 h-5 w-24 animate-pulse rounded-md bg-foreground/[0.06]" />
				<NotificationRowsSkeleton rows={6} />
			</div>
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="h-11 border-b border-border" />
				<div className="flex-1 p-4">
					<NotificationRowsSkeleton rows={8} />
				</div>
				<div className="mx-4 mb-3 h-10 animate-pulse rounded-lg bg-foreground/[0.04]" />
			</div>
		</div>
	);
}
