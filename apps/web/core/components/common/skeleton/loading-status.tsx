import { cn } from '@/core/lib/helpers';

/** The container carries the `status` role: a page frame around it may already be the status region. */
export function LoadingStatusLine({ label, className }: Readonly<{ label: string; className?: string }>) {
	return (
		<div className={cn('flex flex-col items-center gap-2 text-center text-muted-foreground', className)}>
			<span
				aria-hidden="true"
				className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			/>
			<span className="text-sm text-balance">{label}</span>
		</div>
	);
}
