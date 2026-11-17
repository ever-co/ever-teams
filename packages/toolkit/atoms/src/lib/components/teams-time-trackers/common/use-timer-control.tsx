import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTimer } from '@hooks/useTimer';
import { TimerDescription } from './timer-description';

/**
 * What the basic, custom, essential and extra timers give their button. `action` goes before the host's props, so a
 * host can still name the button its own way; `state` goes after them, as the timer decides it. `description` holds the
 * time the button shows, which its aria-label (Start timer, Stop timer) replaces as its name. `defaults` goes before the
 * host's props too: the caption "Today" before the time (the time tracked today), which a host can replace or drop.
 */
export function useTimerControl() {
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
	const caption = t('COMMON.today');

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
		defaults: { caption },
		description: (
			<TimerDescription id={timeId} caption={caption} hours={hours} minutes={minutes} seconds={seconds} />
		)
	};
}
