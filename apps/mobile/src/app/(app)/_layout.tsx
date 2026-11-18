import React from 'react';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAtomValue } from 'jotai';
import { translate } from '../../../app/i18n';
import { LoadingState } from '../../components/screen-state';
import { tabBarColorsFor } from '../../navigation/tab-bar-colors';
import { themePreferenceAtom } from '../../state/preferences';
import { sessionAtom } from '../../state/session';
import { useTheme } from '../../theme';

/** The signed-in part: its four tabs, after the session was read; without one, the sign-in. */
export default function SignedInLayout() {
	const session = useAtomValue(sessionAtom);
	const preference = useAtomValue(themePreferenceAtom);
	const theme = useTheme(preference);
	if (session.status === 'loading') {
		return <LoadingState />;
	}
	if (session.status === 'signed-out') {
		return <Redirect href="/auth/passcode" />;
	}
	return (
		<NativeTabs labelVisibilityMode="labeled" {...tabBarColorsFor(theme)}>
			<NativeTabs.Trigger name="(home)">
				<NativeTabs.Trigger.Icon sf="house" md="home" />
				<NativeTabs.Trigger.Label>{translate('shell.tabs.home')}</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="(tasks)">
				<NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
				<NativeTabs.Trigger.Label>{translate('shell.tabs.tasks')}</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="(week)">
				<NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
				<NativeTabs.Trigger.Label>{translate('shell.tabs.week')}</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="(team)">
				<NativeTabs.Trigger.Icon sf="person.3" md="groups" />
				<NativeTabs.Trigger.Label>{translate('shell.tabs.team')}</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
