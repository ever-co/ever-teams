import { NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';

/** The page while its code or its first page of entries loads. */
export function InboxPageSkeleton() {
	return (
		<div aria-hidden="true" className="flex h-full flex-col gap-3 p-4">
			<div className="h-7 w-40 animate-pulse rounded-md bg-foreground/[0.06]" />
			<div className="h-9 w-full max-w-lg animate-pulse rounded-lg bg-foreground/[0.04]" />
			<NotificationRowsSkeleton rows={8} />
		</div>
	);
}
