import React from 'react';
import type { ReactNode } from 'react';
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
	/** The screen, once it is built; until then the page says what comes next. */
	children?: ReactNode;
}

/** A page of the new app: its title, the offline notice, and its screen or, while it is being built, what comes next. */
export function ShellPage({ title, emptyTitle, emptyMessage, children }: ShellPageProps) {
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
			{children ?? (
				<EmptyState
					title={emptyTitle ?? translate('shell.states.comingTitle')}
					message={emptyMessage ?? translate('shell.states.comingMessage')}
				/>
			)}
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
