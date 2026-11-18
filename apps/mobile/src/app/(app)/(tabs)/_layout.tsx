import React from 'react';
import type { Href } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import type { BottomTabNavigationOptions as RouterTabOptions } from 'expo-router/tabs';
import { useNavigation } from 'expo-router/react-navigation';
import { observer } from 'mobx-react-lite';
import { useAppLocale } from '../../../../app/i18n';
import { useStores } from '../../../../app/models';
import { navigateTo } from '../../../../app/navigators/routes';
import {
	tasksTabOptions,
	teamTabOptions,
	useTabBarScreenOptions,
	workTabOptions
} from '../../../../app/navigators/tab-bar';
import type { TabPressEvent } from '../../../../app/navigators/tab-bar';
import { useOrganizationTeam } from '../../../../app/services/hooks/use-organization';
import { useAppTheme } from '../../../../app/theme';

// The app opens on the team, as before, which is `/` as on the web
export const unstable_settings = { initialRouteName: 'index' };

/**
 * The tabs come back on the team after a screen of the menu, as with the old tab navigator, and Back from the team
 * still goes to the first tab (tabsInOrder). Expo Router keeps the tabs in their declared order and leaves initialRouteName
 * out of the Tabs props, but hands every prop on to the navigator: without it, the tabs came back on Work.
 */
const TEAM_AS_INITIAL_TAB = { initialRouteName: 'index' };

/** The Work tab shows only where the team tracks time; elsewhere it has no address in the tab bar. */
function workTabHref(isTrackingEnabled: boolean): null | undefined {
	if (isTrackingEnabled) {
		return undefined;
	}
	return null;
}

/**
 * The tabs in the order they show. Back from the team goes to the first one: Work where the team tracks time, else
 * Tasks, as the old tab navigator did, which left Work out. Expo Router keeps every route of the folder, a hidden Work
 * too, and puts the tabs in the order they are declared: without tracking, Work comes last, where Back never goes.
 */
function tabsInOrder<Tab>(isTrackingEnabled: boolean, work: Tab, tasks: Tab, team: Tab): Tab[] {
	if (isTrackingEnabled) {
		return [work, tasks, team];
	}
	return [tasks, team, work];
}

/**
 * The tab bar's options are typed with @react-navigation/bottom-tabs, which Expo CLI resolves to Expo Router's own copy
 * at run time: TypeScript sees two copies of the same types.
 */
function forRouter(options: object): RouterTabOptions {
	return options as RouterTabOptions;
}

function ownTasksHref(memberId: string | undefined): Href {
	return { pathname: '/profile/[memberId]', params: { memberId: memberId ?? '' } };
}

/** The three tabs of the current app, in its order: Work, Tasks (the person's own profile) and the team. */
export default observer(function SignedInTabs() {
	const { dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const { currentUser } = useOrganizationTeam();
	const screenOptions = useTabBarScreenOptions();
	const navigation = useNavigation();
	// the labels follow a new language
	useAppLocale();

	const work = (
		<Tabs.Screen
			key="timer"
			name="timer"
			options={{ ...forRouter(workTabOptions(dark)), href: workTabHref(isTrackingEnabled) }}
		/>
	);
	const tasks = (
		<Tabs.Screen
			key="profile/[memberId]"
			name="profile/[memberId]"
			options={{ ...forRouter(tasksTabOptions(dark)), href: ownTasksHref(currentUser?.id) }}
			listeners={{
				tabPress: (e: TabPressEvent) => {
					e.preventDefault();
					navigateTo(navigation, 'Profile', { userId: currentUser?.id, activeTab: 'worked' });
				}
			}}
		/>
	);
	const team = <Tabs.Screen key="index" name="index" options={forRouter(teamTabOptions(dark))} />;

	return (
		<Tabs {...TEAM_AS_INITIAL_TAB} screenOptions={forRouter(screenOptions)}>
			{tabsInOrder(isTrackingEnabled, work, tasks, team)}
		</Tabs>
	);
});
