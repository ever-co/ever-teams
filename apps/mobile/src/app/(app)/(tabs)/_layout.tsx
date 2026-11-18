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
 * still goes to the first tab. Expo Router keeps the tabs in their declared order and leaves initialRouteName out of
 * the Tabs props, but hands every prop on to the navigator: without it, the tabs came back on Work.
 */
const TEAM_AS_INITIAL_TAB = { initialRouteName: 'index' };

/** What the override below reads of the tabs' state. */
interface TabsState {
	index: number;
	routes: { key: string }[];
	history: { type: string; key: string }[];
}

interface TabsRouter {
	getStateForRouteNamesChange(state: TabsState, options: object): TabsState;
}

/**
 * When the tabs change (Work comes or goes with tracking), the Back history is built again from the tabs left, as
 * develop's tab router did (@react-navigation/routers 7.6.6): Back from the team then goes to the first tab, Tasks
 * without tracking. Expo Router's copy of the router keeps what is left of the old history instead, and Back from the
 * team then left the tabs.
 */
function historyFromTheTabsLeft(original: TabsRouter): Partial<TabsRouter> {
	return {
		getStateForRouteNamesChange(state, options) {
			const next = original.getStateForRouteNamesChange(state, options);
			const focused = { type: 'route', key: next.routes[next.index].key };
			if (next.index === 0) {
				return { ...next, history: [focused] };
			}
			return { ...next, history: [{ type: 'route', key: next.routes[0].key }, focused] };
		}
	};
}

/** Typed loosely, as the tab bar's options are: the router's types are those of Expo Router's own copy. */
const TAB_HISTORY_AS_ON_DEVELOP: object = { UNSTABLE_router: historyFromTheTabsLeft };

/**
 * The tab bar's options are typed with @react-navigation/bottom-tabs, which Expo CLI resolves to Expo Router's own copy
 * at run time: TypeScript sees two copies of the same types.
 */
function forRouter(options: object): RouterTabOptions {
	return options as RouterTabOptions;
}

/** The person's own tasks, on their profile; without an id it has no address, and the tab does not show. */
function ownTasksHref(memberId: string | undefined): Href | null {
	if (!memberId) {
		return null;
	}
	return { pathname: '/profile/[memberId]', params: { memberId } };
}

/** The three tabs of the current app, in its order: Work, Tasks (the person's own profile) and the team. */
export default observer(function SignedInTabs() {
	const { dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled },
		authenticationStore: { user }
	} = useStores();
	const { currentUser } = useOrganizationTeam();
	// Without a membership in the active team, the person signed in: on develop the tab then named no one, and the
	// profile screen showed that person
	const ownId = currentUser?.id ?? user?.id;
	const screenOptions = useTabBarScreenOptions();
	const navigation = useNavigation();
	// the labels follow a new language
	useAppLocale();

	return (
		<Tabs {...TEAM_AS_INITIAL_TAB} {...TAB_HISTORY_AS_ON_DEVELOP} screenOptions={forRouter(screenOptions)}>
			{/* Work is a tab only where the team tracks time. Elsewhere it is no route of the tabs, as the old tab
			    navigator left it out: Back from the team goes to Tasks, and a switch of tracking builds the tabs'
			    history again (historyFromTheTabsLeft) */}
			<Tabs.Protected guard={isTrackingEnabled}>
				<Tabs.Screen name="timer" options={forRouter(workTabOptions(dark))} />
			</Tabs.Protected>
			<Tabs.Screen
				name="profile/[memberId]"
				options={{ ...forRouter(tasksTabOptions(dark)), href: ownTasksHref(ownId) }}
				listeners={{
					tabPress: (e: TabPressEvent) => {
						e.preventDefault();
						if (ownId) {
							navigateTo(navigation, 'Profile', { userId: ownId, activeTab: 'worked' });
						}
					}
				}}
			/>
			<Tabs.Screen name="index" options={forRouter(teamTabOptions(dark))} />
		</Tabs>
	);
});
