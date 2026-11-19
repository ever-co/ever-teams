import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { translate } from '../../app/i18n';
import { useShellTheme } from '../components/screen-state';
import { opacityOf } from './surface';

/** A read that failed: what did not load, and a way to read it again. */
export function FailedRead({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
	const theme = useShellTheme();
	return (
		<View accessibilityLiveRegion="polite" style={styles.failedRead}>
			<Text style={[theme.type.hint, styles.failedMessage, { color: theme.colors['destructive-ink'] }]}>
				{message}
			</Text>
			<Pressable
				accessibilityRole="button"
				onPress={onRetry}
				style={({ pressed }) => [
					styles.retry,
					{ minHeight: theme.minimumTouchTarget, opacity: opacityOf(pressed, true) }
				]}
			>
				<Text style={[theme.type.label, { color: theme.colors['primary-ink'] }]}>
					{translate('shell.states.retry')}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	failedRead: {
		flexShrink: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		columnGap: 8
	},
	failedMessage: {
		flexShrink: 1
	},
	retry: {
		justifyContent: 'center',
		paddingHorizontal: 8
	}
});
