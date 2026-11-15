'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/core/components/common/alert-dialog';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import {
	answerUnfollowedTime,
	subscribeToUnfollowedTimeQuestion,
	unfollowedTimeQuestion
} from '@/core/lib/utils/timer/unfollowed-time';
import { dateFormatOf } from '@/core/lib/utils/workspace-formats';

/** Keeping the time is the second choice: stopping at the last heartbeat counts nothing the app did not see. */
const KEEP_CLASS_NAME = buttonVariants({ variant: 'outline', size: 'default' });

const noQuestionOnTheServer = () => null;

/**
 * The question the app puts when a web timer ran for a few minutes without the app following it (#5123): the tab was
 * reopened, the computer woke up, the browser had paused the tab. The person keeps that time, or stops the run at
 * its last heartbeat. Until they answer, no heartbeat is sent, so nothing of that time is counted yet.
 *
 * It closes on an answer only, here or in another tab, or once the closed-tab delay is reached, when the run is
 * stopped at its last heartbeat as that rule has it (use-stale-timer-guard.ts).
 */
export function UnfollowedTimeQuestion() {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const question = useSyncExternalStore(
		subscribeToUnfollowedTimeQuestion,
		unfollowedTimeQuestion,
		noQuestionOnTheServer
	);
	const stopButtonRef = useRef<HTMLButtonElement | null>(null);
	// Enter stops the run at its last heartbeat: the answer that keeps nothing by accident
	const focusStopFirst = useCallback(() => stopButtonRef.current, []);
	// Escape is not an answer
	const stayOpen = useCallback(() => undefined, []);
	const keep = useCallback(() => answerUnfollowedTime('keep'), []);
	const stop = useCallback(() => answerUnfollowedTime('stop'), []);

	if (!question) {
		return null;
	}

	// The two times are minutes apart: the hour says it all
	const time = dateFormatOf(locale, { timeStyle: 'short' });
	const from = time.format(new Date(question.from));
	const until = time.format(new Date(question.until));

	return (
		<AlertDialog open onOpenChange={stayOpen}>
			<AlertDialogContent initialFocus={focusStopFirst}>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('timer.unfollowed.TITLE')}</AlertDialogTitle>
					<AlertDialogDescription>{t('timer.unfollowed.TEXT', { from, until })}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogAction className={KEEP_CLASS_NAME} onClick={keep}>
						{t('timer.unfollowed.KEEP')}
					</AlertDialogAction>
					<AlertDialogAction ref={stopButtonRef} onClick={stop}>
						{t('timer.unfollowed.STOP', { from })}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
