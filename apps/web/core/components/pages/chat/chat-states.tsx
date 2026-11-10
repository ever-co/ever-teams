import type { ReactNode } from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { CircleAlert, Refresh } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

/** The conversation list while it loads: two short sections of rows of the list's own height. */
export function ChatListSkeleton() {
	const sections = [
		['w-3/5', 'w-2/5', 'w-1/2', 'w-1/3'],
		['w-1/2', 'w-3/5', 'w-2/5']
	];
	return (
		<div aria-hidden="true" className="flex flex-col gap-3 pt-1">
			{sections.map((rows, at) => (
				<div key={at} className="flex flex-col gap-px">
					<div className="flex h-7 items-center px-2">
						<span className={cn(BAR, 'h-2 w-20')} />
					</div>
					{rows.map((width, row) => (
						<div key={row} className="flex h-8 items-center gap-2 px-2">
							<span className="size-5 shrink-0 animate-pulse rounded-md bg-foreground/[0.06]" />
							<span className={cn(BAR, 'h-2.5', width)} />
						</div>
					))}
				</div>
			))}
		</div>
	);
}

/** The line widths of the placeholder messages: uneven, so they read as a conversation and not as a table. */
const MESSAGE_LINES: Array<[string, string | null]> = [
	['w-3/5', 'w-2/5'],
	['w-1/3', null],
	['w-4/5', 'w-1/2'],
	['w-2/5', null],
	['w-2/3', 'w-1/4'],
	['w-1/2', 'w-3/5'],
	['w-1/4', null],
	['w-3/4', 'w-1/3']
];

/** A timeline while it loads: rows shaped like messages (an avatar, a name, a line or two). */
export function ChatMessagesSkeleton({ rows = 6, className }: Readonly<{ rows?: number; className?: string }>) {
	return (
		<div aria-hidden="true" className={cn('flex flex-col gap-5 px-4 py-4', className)}>
			{MESSAGE_LINES.slice(0, rows).map(([first, second], at) => (
				<div key={at} className="flex gap-3">
					<span className="size-9 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
						<span className="flex items-center gap-2">
							<span className={cn(BAR, 'h-2.5 w-24 bg-foreground/[0.08]')} />
							<span className={cn(BAR, 'h-2 w-8 bg-foreground/[0.04]')} />
						</span>
						<span className={cn(BAR, 'h-2.5', first)} />
						{second && <span className={cn(BAR, 'h-2.5 bg-foreground/[0.04]', second)} />}
					</div>
				</div>
			))}
		</div>
	);
}

/** The Unreads and Threads lists while they load: the rows of their card. */
export function ChatCardRowsSkeleton({ rows = 4 }: Readonly<{ rows?: number }>) {
	const widths = ['w-2/5', 'w-1/2', 'w-1/3', 'w-3/5', 'w-1/4'];
	return (
		<div aria-hidden="true" className="overflow-hidden rounded-xl bg-card hairline-ring ring-border hairline-divide-y divide-border">
			{widths.slice(0, rows).map((width) => (
				<div key={width} className="flex items-center gap-3 px-4 py-3">
					<span className="size-7 shrink-0 animate-pulse rounded-lg bg-foreground/[0.06]" />
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<span className={cn(BAR, 'h-2.5', width)} />
						<span className={cn(BAR, 'h-2 w-1/5 bg-foreground/[0.04]')} />
					</div>
				</div>
			))}
		</div>
	);
}

/** Nothing to show here: an icon tile, what it means, and what to do about it when there is something to do. */
export function ChatEmptyState({ icon, title, message, action, className }: Readonly<{ icon: ReactNode; title: string; message?: string; action?: ReactNode; className?: string }>) {
	return (
		<div className={cn('flex flex-col items-center justify-center gap-1 px-6 py-12 text-center', className)}>
			<span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary [&_svg]:size-6" aria-hidden="true">
				{icon}
			</span>
			<p className="text-[15px] font-semibold text-foreground text-balance">{title}</p>
			{message && <p className="max-w-sm text-[13px] text-muted-foreground text-balance">{message}</p>}
			{action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
		</div>
	);
}

/** A pane that could not load, with the way to try again. `compact` is the form for the narrow list pane. */
export function ChatErrorState({ message, retryLabel, onRetry, compact = false }: Readonly<{ message: string; retryLabel: string; onRetry: () => void; compact?: boolean }>) {
	if (compact) {
		return (
			<div role="alert" className="mx-1 my-2 flex flex-col items-start gap-2 rounded-lg bg-destructive/[0.06] p-3">
				<p className="flex items-start gap-2 text-xs text-foreground">
					<CircleAlert className="mt-px size-3.5 shrink-0 text-destructive" aria-hidden="true" />
					{message}
				</p>
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					<Refresh className="size-3.5" />
					{retryLabel}
				</Button>
			</div>
		);
	}
	return (
		<div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
			<span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive" aria-hidden="true">
				<CircleAlert className="size-5" />
			</span>
			<p className="text-[13px] text-muted-foreground text-balance">{message}</p>
			<Button type="button" variant="outline" size="sm" onClick={onRetry}>
				<Refresh className="size-3.5" />
				{retryLabel}
			</Button>
		</div>
	);
}
