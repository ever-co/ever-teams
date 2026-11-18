import React, { useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { translate } from '../../app/i18n';
import { useTheme } from '../theme';
import { themePreferenceAtom } from '../state/preferences';

const PRESSED_OPACITY = 0.85;

function opacityWhen(pressed: boolean): number {
	if (pressed) {
		return PRESSED_OPACITY;
	}
	return 1;
}

export function useShellTheme() {
	const preference = useAtomValue(themePreferenceAtom);
	return useTheme(preference);
}

export function LoadingState() {
	const theme = useShellTheme();
	return (
		<View
			style={styles.centered}
			accessibilityRole="progressbar"
			accessibilityLabel={translate('shell.states.loading')}
		>
			<ActivityIndicator color={theme.colors.primary} />
		</View>
	);
}

export function EmptyState({ title, message }: { title: string; message: string }) {
	const theme = useShellTheme();
	return (
		<View style={styles.centered}>
			<Text style={[theme.type.heading, styles.title, { color: theme.colors.foreground }]}>{title}</Text>
			<Text style={[theme.type.body, styles.message, { color: theme.colors['muted-foreground'] }]}>
				{message}
			</Text>
		</View>
	);
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
	const theme = useShellTheme();
	return (
		<View style={styles.centered}>
			<Text style={[theme.type.heading, styles.title, { color: theme.colors.foreground }]}>
				{translate('shell.states.errorTitle')}
			</Text>
			<Pressable
				accessibilityRole="button"
				onPress={onRetry}
				style={({ pressed }) => [
					styles.retry,
					{
						minHeight: theme.minimumTouchTarget,
						borderRadius: theme.radius.control,
						backgroundColor: theme.colors.primary,
						opacity: opacityWhen(pressed)
					}
				]}
			>
				<Text style={[theme.type.label, { color: theme.colors['primary-foreground'] }]}>
					{translate('shell.states.retry')}
				</Text>
			</Pressable>
		</View>
	);
}

function subscribeToConnection(onChange: () => void) {
	return onlineManager.subscribe(onChange);
}

function isOnline() {
	return onlineManager.isOnline();
}

/** Whether the phone has a connection, as the query client follows it. */
export function useIsOnline(): boolean {
	return useSyncExternalStore(subscribeToConnection, isOnline);
}

/** Says the phone is offline and what the screen shows meanwhile; nothing while it is online. */
export function OfflineNotice() {
	const theme = useShellTheme();
	const online = useIsOnline();
	if (online) {
		return null;
	}
	return (
		<View
			accessibilityLiveRegion="polite"
			style={[styles.offline, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}
		>
			<Text style={[theme.type.hint, { color: theme.colors.foreground }]}>
				{translate('shell.states.offline')}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		gap: 12
	},
	title: {
		textAlign: 'center'
	},
	message: {
		textAlign: 'center'
	},
	retry: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20
	},
	offline: {
		marginHorizontal: 16,
		marginTop: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: StyleSheet.hairlineWidth,
		borderRadius: 8
	}
});
