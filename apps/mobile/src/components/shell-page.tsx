import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAtomValue } from 'jotai';
import { translate } from '../../app/i18n';
import { themePreferenceAtom } from '../state/preferences';
import { useTheme } from '../theme';
import { EmptyState, OfflineNotice } from './screen-state';

interface ShellPageProps {
	title: string;
	emptyTitle?: string;
	emptyMessage?: string;
}

/** A page of the new app while its screen is being built: its title, the offline notice, and what comes next. */
export function ShellPage({ title, emptyTitle, emptyMessage }: ShellPageProps) {
	const preference = useAtomValue(themePreferenceAtom);
	const theme = useTheme(preference);
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.page, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
			<Text
				accessibilityRole="header"
				style={[theme.type.title, styles.title, { color: theme.colors.foreground }]}
			>
				{title}
			</Text>
			<OfflineNotice />
			<EmptyState
				title={emptyTitle ?? translate('shell.states.comingTitle')}
				message={emptyMessage ?? translate('shell.states.comingMessage')}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	page: {
		flex: 1
	},
	title: {
		paddingHorizontal: 16,
		paddingTop: 12
	}
});
