'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';

export interface ActivityReadFailure {
	onRetry: () => void;
}

/** The part of a read hook's result the blocks look at. */
interface ActivityReadState {
	loading: boolean;
	isError?: boolean;
	refetch?: () => unknown;
}

/** A failure the block can show with a retry when its read hook exposes `isError` and `refetch`. */
export function failureOfActivityRead(state: ActivityReadState): ActivityReadFailure | undefined {
	const refetch = state.refetch;
	if (!state.isError) {
		return undefined;
	}
	if (!refetch) {
		return undefined;
	}
	return {
		onRetry: () => {
			void refetch();
		}
	};
}

/** A failed read says so in place of its block, with a retry; the rest of the page keeps working. */
export function ActivityBlockError({
	title,
	onRetry,
	className
}: Readonly<{ title: string; onRetry: () => void; className?: string }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={title}
			description={t('profile.activity.ERROR_MESSAGE')}
			actions={
				<Button type="button" variant="outline" size="default" onClick={onRetry}>
					{t('pages.unauthorized.TRY_AGAIN')}
				</Button>
			}
			className={className}
		/>
	);
}

/** A label over its value, with no box: the figures of the profile band and of the activity views. */
export function ActivityFigurePair({
	label,
	children,
	hint
}: Readonly<{ label: string; children: ReactNode; hint?: ReactNode }>) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="flex min-h-5.5 items-center gap-1.5 text-[15px] font-medium tabular-nums text-foreground">
				{children}
				{hint && <span className="truncate text-xs font-normal text-muted-foreground">{hint}</span>}
			</dd>
		</div>
	);
}

const FIGURE_SKELETON_BAR = 'h-3.5 animate-pulse rounded-full bg-foreground/[0.06]';

export function ActivityFigurePulse({ className }: Readonly<{ className?: string }>) {
	return <span aria-hidden="true" className={cn(FIGURE_SKELETON_BAR, 'w-16', className)} />;
}
