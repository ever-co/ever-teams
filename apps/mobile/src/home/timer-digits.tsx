import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { translate } from '../../app/i18n';
import { useShellTheme } from '../components/screen-state';
import { clockOf, hoursAndMinutes, liveSeconds } from './duration';
import { useNow } from './use-now';

interface TimerDigitsProps {
	/** Today's seconds as the API counted them. */
	counted: number;
	/** When the API answered, in milliseconds. */
	countedAt: number;
	running: boolean;
}

/** Today's tracked time, counting each second while the timer runs. The only part of Home that renders each second. */
export function TimerDigits({ counted, countedAt, running }: TimerDigitsProps) {
	const theme = useShellTheme();
	const now = useNow(running);
	const seconds = liveSeconds(counted, countedAt, now, running);
	const { hours, minutes } = hoursAndMinutes(seconds);
	const spoken = `${translate('shell.home.today')}, ${translate('shell.home.duration', { hours, minutes })}`;
	return (
		<Text accessibilityLabel={spoken} style={[theme.type.timer, styles.digits, { color: theme.colors.foreground }]}>
			{clockOf(seconds)}
		</Text>
	);
}

const styles = StyleSheet.create({
	// digits read left to right in Arabic and Hebrew too
	digits: {
		writingDirection: 'ltr',
		textAlign: 'center'
	}
});
