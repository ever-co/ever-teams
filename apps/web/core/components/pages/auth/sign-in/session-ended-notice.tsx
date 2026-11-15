'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { STALE_TIMER_THRESHOLD } from '@/core/constants/config/constants';
import {
	parseSessionEndedNotice,
	storedSessionEndedNotice,
	type SessionEndedNotice as Notice
} from '@/core/lib/auth/session-ended-notice';
import { parseSavedStop, storedSavedStop } from '@/core/lib/utils/timer/saved-stop';

// The note is written as the page that ends the session goes away: it does not change while this page is shown
const subscribeToNothing = () => () => undefined;
const noNoteOnTheServer = () => null;

/** A time as the notice shows it: the time of day on the day the session ended, with its date on another day. */
function shownTimeOf(time: number, sessionEndedAt: number, locale: string): string {
	const moment = new Date(time);
	const isSameDay = moment.toDateString() === new Date(sessionEndedAt).toDateString();
	if (isSameDay) {
		return moment.toLocaleTimeString(locale, { timeStyle: 'short' });
	}
	return moment.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * What becomes of the timer that was running, by the closed-tab rule (isStaleTeamsTimer): a run of this app without
 * a heartbeat for longer than the delay is stopped at its last heartbeat when the app next opens, and a person back
 * before that keeps it running. Where the rule is off, and for a run that has had no heartbeat yet, the run goes on.
 */
function useTimerLine(notice: Notice | null): string | null {
	const t = useTranslations();
	const locale = useLocale();
	if (!notice?.timer) {
		return null;
	}

	const delay = STALE_TIMER_THRESHOLD.value;
	const savedUntil = Date.parse(notice.timer.savedUntil ?? '');
	const isStoppedWhenLeftAlone = delay > 0 && !Number.isNaN(savedUntil);
	if (!isStoppedWhenLeftAlone) {
		return t('auth.sessionEnded.TIMER_STILL_RUNNING');
	}
	return t('auth.sessionEnded.TIMER_RUNNING', {
		deadline: shownTimeOf(savedUntil + delay, notice.at, locale),
		savedUntil: shownTimeOf(savedUntil, notice.at, locale)
	});
}

/**
 * The stop the person asked for as the session ended, which the browser kept (saved-stop.ts): it is applied at their
 * next sign-in. Only the stop of the run this tab showed is theirs to hear about, and only when it ends that run at
 * the time it was pressed: for a run the app was no longer following then (the computer had slept), the closed-tab
 * rule ends it, which the timer line says.
 */
function useSavedStopLine(notice: Notice | null): string | null {
	const t = useTranslations();
	const locale = useLocale();
	const stored = useSyncExternalStore(subscribeToNothing, storedSavedStop, noNoteOnTheServer);
	const savedStop = useMemo(() => parseSavedStop(stored), [stored]);
	if (!notice?.timer || !savedStop || savedStop.timeLogId !== notice.timer.timeLogId) {
		return null;
	}

	const pressedAt = Date.parse(savedStop.pressedAt);
	const delay = STALE_TIMER_THRESHOLD.value;
	const savedUntil = Date.parse(notice.timer.savedUntil ?? '');
	const wasLeftAlone = delay > 0 && !Number.isNaN(savedUntil) && pressedAt - savedUntil > delay;
	if (wasLeftAlone) {
		return null;
	}
	return t('auth.sessionEnded.STOP_SAVED', { time: shownTimeOf(pressedAt, notice.at, locale) });
}

/**
 * Tells a person the app signed out by itself why they are on the sign-in page: their session ended, which the page
 * shown alone does not say. A timer that was running goes on in the API meanwhile, and the notice says what becomes
 * of it, or that the stop they asked for is saved. Renders nothing after a sign-out the person asked for, or on a
 * first visit.
 */
export function SessionEndedNotice({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	// Read once the page runs in the browser: the server's render has no storage of the tab
	const stored = useSyncExternalStore(subscribeToNothing, storedSessionEndedNotice, noNoteOnTheServer);
	const notice = useMemo(() => parseSessionEndedNotice(stored), [stored]);
	const timerLine = useTimerLine(notice);
	const savedStopLine = useSavedStopLine(notice);
	// A stop that is saved ends the run: what the timer would do left alone no longer applies
	const runLine = savedStopLine ?? timerLine;

	if (!notice) {
		return null;
	}

	return (
		<AuthNotice tone="warning" title={t('auth.sessionEnded.TITLE')} className={className}>
			<p>{t('auth.sessionEnded.TEXT')}</p>
			{runLine && <p className="mt-1">{runLine}</p>}
		</AuthNotice>
	);
}
