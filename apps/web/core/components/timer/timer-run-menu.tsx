'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/core/components/common/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button, buttonVariants } from '@/core/components/duplicated-components/_button';
import { MoreHorizontal, Spinner, Trash } from '@/core/components/icons';
import { useTimerDiscard } from '@/core/hooks/timer/use-timer-discard';
import { cn } from '@/core/lib/helpers';
import type { TimerDiscardFailure } from '@/core/lib/utils/timer/timer-discard';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { TIMER_ENTRY_TOGGLE, TIMER_ENTRY_TOGGLE_GLYPH, TIMER_TOOLTIP_DELAY_MS } from './timer-toggle-recipe';

/** The confirmation's Discard, drawn as the destructive action of the app's other confirmations. */
const DISCARD_ACTION_CLASS_NAME = cn(
	buttonVariants({ size: 'default' }),
	'rounded-full px-3.5 text-[13px]',
	buttonVariants({ variant: 'destructive', size: 'lg' })
);

const FAILURE_KEYS = {
	NOT_RUNNING: 'timer.discard.failures.NOT_RUNNING',
	DISABLED: 'timer.discard.failures.DISABLED',
	TOO_LATE: 'timer.discard.failures.TOO_LATE',
	FORBIDDEN: 'timer.discard.failures.FORBIDDEN',
	NOT_SUPPORTED: 'timer.discard.failures.NOT_SUPPORTED',
	CHANGED: 'timer.discard.failures.CHANGED',
	GENERIC: 'timer.discard.failures.GENERIC'
} as const satisfies Record<TimerDiscardFailure, string>;

/** The app a run started from, when it is not this web app: the confirmation says it stops there too. */
function sourceKeyOf(source: ETimeLogSource | undefined) {
	if (!source || source === ETimeLogSource.TEAMS) {
		return null;
	}
	if (source === ETimeLogSource.DESKTOP) {
		return 'timer.discard.sources.DESKTOP' as const;
	}
	if (source === ETimeLogSource.MOBILE) {
		return 'timer.discard.sources.MOBILE' as const;
	}
	if (source === ETimeLogSource.BROWSER_EXTENSION) {
		return 'timer.discard.sources.BROWSER_EXTENSION' as const;
	}
	return 'timer.discard.sources.OTHER' as const;
}

/**
 * The running timer's small menu (#5219): "Discard this run", behind one toggle beside the timer's controls so the
 * timer row keeps its controls, height and alignment. It shows only while the running timer may be discarded; the
 * confirmation stays open while the discard runs and when it fails, with the reason.
 */
export function TimerRunMenu({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const { availability, runningSource, discard, discarding, failure, resetFailure } = useTimerDiscard();
	const [confirming, setConfirming] = useState(false);

	const openConfirmation = useCallback(() => {
		resetFailure();
		setConfirming(true);
	}, [resetFailure]);

	const changeConfirmation = useCallback(
		(open: boolean) => {
			// The discard runs to its answer: the confirmation is not dismissed meanwhile.
			if (!open && discarding) {
				return;
			}
			setConfirming(open);
		},
		[discarding]
	);

	const confirmDiscard = useCallback(async () => {
		const discarded = await discard();
		if (discarded) {
			setConfirming(false);
		}
	}, [discard]);

	const sourceKey = sourceKeyOf(runningSource);
	let description = t('timer.discard.DESCRIPTION');
	if (sourceKey) {
		description = t('timer.discard.DESCRIPTION_ELSEWHERE', { source: t(sourceKey) });
	}
	const menuLabel = t('timer.discard.MENU');
	let actionLabel = t('timer.discard.CONFIRM');
	if (discarding) {
		actionLabel = t('timer.discard.DISCARDING');
	}

	return (
		<>
			{availability.available && (
				<DropdownMenu>
					<Tooltip>
						<TooltipTrigger
							delay={TIMER_TOOLTIP_DELAY_MS}
							render={
								<DropdownMenuTrigger
									render={
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											aria-label={menuLabel}
											className={cn(TIMER_ENTRY_TOGGLE, className)}
										/>
									}
								/>
							}
						>
							<MoreHorizontal aria-hidden="true" className={TIMER_ENTRY_TOGGLE_GLYPH} />
						</TooltipTrigger>
						<TooltipContent>{menuLabel}</TooltipContent>
					</Tooltip>
					<DropdownMenuContent align="end" sideOffset={8} className="min-w-44">
						<DropdownMenuItem variant="destructive" onClick={openConfirmation}>
							<Trash aria-hidden="true" />
							{t('timer.discard.ACTION')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			<AlertDialog open={confirming} onOpenChange={changeConfirmation}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('timer.discard.TITLE')}</AlertDialogTitle>
						<AlertDialogDescription>{description}</AlertDialogDescription>
					</AlertDialogHeader>
					{failure && (
						<p role="alert" className="text-sm text-destructive-ink">
							{t(FAILURE_KEYS[failure])}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={discarding} autoFocus>
							{t('common.CANCEL')}
						</AlertDialogCancel>
						<Button
							type="button"
							className={DISCARD_ACTION_CLASS_NAME}
							disabled={discarding}
							aria-busy={discarding || undefined}
							onClick={confirmDiscard}
						>
							{discarding && <Spinner aria-hidden="true" className="size-4 animate-spin" />}
							{actionLabel}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
