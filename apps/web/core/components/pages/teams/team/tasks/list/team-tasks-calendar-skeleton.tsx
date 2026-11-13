import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

export function TeamTasksCalendarSkeleton() {
	return (
		<div className="flex h-full flex-col" aria-hidden="true">
			<div className="flex h-11 items-center gap-3 hairline-b border-border px-4">
				<span className={cn(BAR, 'h-7 w-32')} />
				<span className={cn(BAR, 'h-2.5 w-28')} />
			</div>
			<div className="h-8 hairline-b border-border" />
		</div>
	);
}
