import { router } from 'expo-router';
import type { Href } from 'expo-router';

/** The screens of the current app, by the names their navigation calls use, and what each one takes. */
export interface RouteParams {
	AuthenticatedTab: undefined;
	Timer: undefined;
	Team: undefined;
	Profile: { userId?: string; activeTab?: 'worked' | 'assigned' | 'unassigned'; tabIndex?: number };
	TaskScreen: { taskId?: string };
	Setting: { activeTab?: 1 | 2 } | undefined;
	TaskVersion: { previousTab?: number } | undefined;
	TaskStatus: { previousTab?: number } | undefined;
	TaskLabelScreen: { previousTab?: number } | undefined;
	TaskSizeScreen: { previousTab?: number } | undefined;
	TaskPriority: { previousTab?: number } | undefined;
	MembersSettingsScreen: { previousTab?: number } | undefined;
}

export type RouteName = keyof RouteParams;

const TEAM_SETTINGS_TAB = 2;

// The settings screens of the team, at the web's addresses
const TEAM_SETTINGS_PATHS = {
	TaskVersion: '/settings/team/versions',
	TaskStatus: '/settings/team/statuses',
	TaskLabelScreen: '/settings/team/labels',
	TaskSizeScreen: '/settings/team/sizes',
	TaskPriority: '/settings/team/priorities',
	MembersSettingsScreen: '/settings/team/members'
} as const;

function profileHref(params: RouteParams['Profile']): Href {
	if (!params?.activeTab) {
		return { pathname: '/profile/[memberId]', params: { memberId: params?.userId ?? '' } };
	}
	return { pathname: '/profile/[memberId]', params: { memberId: params.userId ?? '', activeTab: params.activeTab } };
}

function settingsHref(params: RouteParams['Setting']): Href {
	if (params?.activeTab === TEAM_SETTINGS_TAB) {
		return '/settings/team';
	}
	return '/settings/personal';
}

/**
 * The address of a screen of the current app, with what its navigation call passed: the web's, `/` being the team as
 * on the web and the app's first screen, and `/timer` the Work tab, which the web shows in its header instead.
 */
export function hrefOf<Name extends RouteName>(name: Name, params?: RouteParams[Name]): Href {
	if (name === 'Timer') {
		return '/timer';
	}
	if (name === 'Profile') {
		return profileHref(params as RouteParams['Profile']);
	}
	if (name === 'TaskScreen') {
		return { pathname: '/task/[id]', params: { id: (params as RouteParams['TaskScreen'])?.taskId ?? '' } };
	}
	if (name === 'Setting') {
		return settingsHref(params as RouteParams['Setting']);
	}
	if (name in TEAM_SETTINGS_PATHS) {
		return TEAM_SETTINGS_PATHS[name as keyof typeof TEAM_SETTINGS_PATHS];
	}
	return '/';
}

/** A navigation of the current app's screens, as React Navigation hands it to them. */
interface NamedNavigation {
	navigate(name: string, params?: object): void;
}

let routerMounted = false;

/** The Expo Router app says it is the one running: from then on a screen opens at its address. */
export function markRouterMounted(): void {
	routerMounted = true;
}

/**
 * Opens a screen of the current app. Under Expo Router it opens its web address; in the React Navigation app it
 * opens by name, as the screen's own navigation did.
 */
export function navigateTo<Name extends RouteName>(navigation: unknown, name: Name, params?: RouteParams[Name]): void {
	if (routerMounted) {
		router.navigate(hrefOf(name, params));
		return;
	}
	(navigation as NamedNavigation).navigate(name, params);
}
