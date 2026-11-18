import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';
import { TimerDescription } from './timer-description';

/**
 * What the basic, custom, essential and extra timers give their button. `action` goes before the host's props, so a
 * host can still name the button its own way; `state` goes after them, as the timer decides it. `description` holds the
 * time the button shows, which its aria-label (Start timer, Stop timer) replaces as its name. `caption` goes after the
 * host's props: "Today" before the time (the time tracked today) unless `hostCaption`, the caption the host gave the
 * timer, replaces it or drops it with null, so the timer shows what screen readers hear.
 */
export function useTimerControl(hostCaption?: ReactNode) {
	const { authenticatedUser } = useTeamsContext();
	const {
		todayTrackedTime: { hours, minutes, seconds, totalSeconds },
		startTimer,
		stopTimer,
		timerActionLabel,
		isRunning,
		timerLoading
	} = useTimer();
	const timeId = useId();
	const { t } = useTranslation();
	let shownCaption: ReactNode = t('COMMON.today');
	if (hostCaption !== undefined) {
		shownCaption = hostCaption;
	}
	// A caption that is not text (an icon, an element) has no words to read: the time is read alone.
	let spokenCaption: string | undefined;
	if (typeof shownCaption === 'string') {
		spokenCaption = shownCaption;
	}

	return {
		isRunning,
		seconds,
		action: {
			onClick: isRunning ? stopTimer : startTimer,
			'aria-label': timerActionLabel,
			'aria-describedby': timeId
		},
		state: {
			isRunning,
			time: { hours, minutes, seconds, totalSeconds },
			disabled: timerLoading || !authenticatedUser
		},
		caption: shownCaption,
		description: (
			<TimerDescription id={timeId} caption={spokenCaption} hours={hours} minutes={minutes} seconds={seconds} />
		)
	};
}
