import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

interface KanbanCardSkeletonProps {
	className?: string;
}

/** A kanban card: the chips row, the title, a hairline, then the avatars and the worked time. */
export function KanbanCardSkeleton({ className }: KanbanCardSkeletonProps) {
	return (
		<div
			className={cn(
				'relative mb-2 flex w-full flex-col gap-3 rounded-xl bg-card p-3 hairline-ring ring-border shadow-sm shadow-black/6.5',
				className
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<div className={cn(BAR, 'h-5 w-16')} />
					<div className={cn(BAR, 'h-5 w-12')} />
					<div className={cn(BAR, 'h-5 w-14')} />
				</div>
				<div className={cn(BAR, 'size-7 shrink-0')} />
			</div>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className={cn(BAR, 'h-4 w-full')} />
					<div className={cn(BAR, 'h-4 w-2/3')} />
				</div>
				<div className={cn(BAR, 'size-8 shrink-0 rounded-full')} />
			</div>
			<div className="h-px w-full bg-border" />
			<div className="flex h-8 items-center justify-between">
				<div className="flex -space-x-2">
					<div className={cn(BAR, 'size-7.5 rounded-full ring-2 ring-card')} />
					<div className={cn(BAR, 'size-7.5 rounded-full ring-2 ring-card')} />
				</div>
				<div className={cn(BAR, 'h-4 w-24')} />
			</div>
		</div>
	);
}
