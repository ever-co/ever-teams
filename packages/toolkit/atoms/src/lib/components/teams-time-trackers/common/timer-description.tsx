import { getTimeDigits } from '@ever-teams/toolkit-ui';

interface TimerDescriptionProps {
	id: string;
	// What the time is (Today), read before it.
	caption?: string;
	hours: number;
	minutes: number;
	seconds: number;
}

/**
 * The time a timer shows, as the description of its button: the button's aria-label (Start timer, Stop timer) replaces
 * its text, so screen readers reach the time through aria-describedby. Hidden inline, so no host rule can show it.
 */
export function TimerDescription({ id, caption, hours, minutes, seconds }: Readonly<TimerDescriptionProps>) {
	const time = `${getTimeDigits(hours)}:${getTimeDigits(minutes)}:${getTimeDigits(seconds)}`;
	let text = time;
	if (caption) {
		text = `${caption} ${time}`;
	}
	return (
		<span id={id} hidden style={{ display: 'none' }}>
			{text}
		</span>
	);
}
