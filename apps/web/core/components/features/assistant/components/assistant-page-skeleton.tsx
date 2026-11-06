'use client';

import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';
import { ASSISTANT_COLUMN } from '../assistant-helpers';
import { AssistantExamples, AssistantWelcome } from './assistant-empty-state';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

function ignoreExample() {
	return undefined;
}

function ignoreConfigRequest() {
	return undefined;
}

export function AssistantComposerSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="w-full rounded-2xl bg-card p-2 shadow-md shadow-black/6.5 hairline-ring ring-border dark:ring-foreground/15"
		>
			<div className="flex min-h-11 items-center px-2 py-1.5">
				<span className={cn(BAR, 'h-3 w-44')} />
			</div>
			<div className="flex items-center justify-between gap-2 pt-1 pl-0.5">
				<span className={cn(BAR, 'h-7 w-28')} />
				<div className="flex items-center gap-1.5">
					<span className={cn(BAR, 'size-7')} />
					<span className={cn(BAR, 'size-8')} />
				</div>
			</div>
		</div>
	);
}

/** No "add a key" notice until the deployment's own AI availability is known. */
export function AssistantBodySkeleton({
	onPickExample = ignoreExample
}: Readonly<{ onPickExample?: (prompt: string) => void }>) {
	return (
		<div className="absolute inset-0 flex flex-col overflow-y-auto custom-scrollbar">
			<AssistantWelcome isConfigured={true} onOpenConfig={ignoreConfigRequest} />
			<div className="shrink-0 px-4">
				<div className={ASSISTANT_COLUMN}>
					<AssistantComposerSkeleton />
				</div>
			</div>
			<AssistantExamples onPickExample={onPickExample} />
		</div>
	);
}

export function AssistantPageSkeleton() {
	return (
		<PageSkeletonFrame className="flex-1 p-0">
			<AssistantBodySkeleton />
		</PageSkeletonFrame>
	);
}
