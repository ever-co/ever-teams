/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { BottomTabScreenProps, createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
	CompositeScreenProps,
	CompositeNavigationProp,
	RouteProp,
	useIsFocused,
	useNavigation
} from '@react-navigation/native';

// COMPONENTS
import { AppStackParamList, AppStackScreenProps } from './app-navigator';
import {
	AuthenticatedProfileScreen,
	AuthenticatedTeamScreen,
	AuthenticatedTimerScreen,
	AuthenticatedSettingScreen,
	TaskStatusScreen,
	TaskLabelScreen,
	TaskSizeScreen,
	TaskPriorityScreen,
	MembersSettingsScreen,
	AuthenticatedTaskScreen,
	TaskVersionScreen
} from '../screens';

// HELPERS
import { useAppTheme } from '../theme';
import HamburgerMenu from '../components/hamburger-menu';
import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../services/hooks/use-organization';
import { TimeCounterHost } from '../services/hooks/use-timer';
import { navigateTo } from './routes';
import { tasksTabOptions, teamTabOptions, useTabBarScreenOptions, workTabOptions } from './tab-bar';
import type { TabPressEvent } from './tab-bar';

export type AuthenticatedTabParamList = {
	Timer: undefined;
	Team: undefined;
	Setting: { activeTab?: 1 | 2 };
	Profile: { userId: string; activeTab: 'worked' | 'assigned' | 'unassigned' };
	TaskScreen: { taskId: string };
};

export type AuthenticatedDrawerParamList = {
	Setting: { activeTab?: 1 | 2 };
	AuthenticatedTab: undefined;
	TaskLabelScreen: { previousTab?: number };
	TaskSizeScreen: { previousTab?: number };
	TaskStatus: { previousTab?: number };
	TaskPriority: { previousTab?: number };
	TaskVersion: { previousTab?: number };
	MembersSettingsScreen: { previousTab?: number };
	TaskScreen: { taskId: string };
};

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AuthenticatedTabScreenProps<T extends keyof AuthenticatedTabParamList> = CompositeScreenProps<
	BottomTabScreenProps<AuthenticatedTabParamList, T>,
	AppStackScreenProps<keyof AppStackParamList>
>;

export type AuthenticatedDrawerScreenProps<T extends keyof AuthenticatedDrawerParamList> = CompositeScreenProps<
	DrawerScreenProps<AuthenticatedDrawerParamList, T>,
	AppStackScreenProps<keyof AppStackParamList>
>;

export type SettingScreenNavigationProp<T extends keyof AuthenticatedTabParamList> = CompositeNavigationProp<
	BottomTabNavigationProp<AuthenticatedTabParamList, T>,
	NativeStackNavigationProp<AppStackParamList>
>;

export type DrawerNavigationProp<T extends keyof AuthenticatedDrawerParamList> = CompositeNavigationProp<
	BottomTabNavigationProp<AuthenticatedDrawerParamList, T>,
	NativeStackNavigationProp<AppStackParamList>
>;

// Define route props for each screen that needs route parameters
export type SettingScreenRouteProp<T extends keyof AuthenticatedTabParamList> = RouteProp<AuthenticatedTabParamList, T>;
export type TaskVersionRouteProp = RouteProp<AuthenticatedDrawerParamList, 'TaskVersion'>;
export type TaskStatusRouteProp = RouteProp<AuthenticatedDrawerParamList, 'TaskStatus'>;
export type TaskLabelScreenRouteProp = RouteProp<AuthenticatedDrawerParamList, 'TaskLabelScreen'>;
export type TaskSizeScreenRouteProp = RouteProp<AuthenticatedDrawerParamList, 'TaskSizeScreen'>;
export type TaskPriorityRouteProp = RouteProp<AuthenticatedDrawerParamList, 'TaskPriority'>;
export type MembersSettingsScreenRouteProp = RouteProp<AuthenticatedDrawerParamList, 'MembersSettingsScreen'>;

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>();

const TabNavigator = observer(function TabNavigator() {
	const { dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const { currentUser } = useOrganizationTeam();
	const screenOptions = useTabBarScreenOptions();

	const navigation = useNavigation<SettingScreenNavigationProp<'Profile'>>();

	return (
		<Tab.Navigator
			// No id, as before: see the app stack in app-navigator.tsx
			id={undefined}
			screenOptions={screenOptions}
			initialRouteName="Team"
		>
			{isTrackingEnabled ? (
				<Tab.Screen name="Timer" component={AuthenticatedTimerScreen} options={workTabOptions(dark)} />
			) : null}

			<Tab.Screen
				name="Profile"
				component={AuthenticatedProfileScreen}
				options={tasksTabOptions(dark)}
				listeners={{
					tabPress: (e: TabPressEvent) => {
						e.preventDefault();

						navigateTo(navigation, 'Profile', {
							userId: currentUser?.id,
							activeTab: 'worked'
						});
					}
				}}
			/>

			<Tab.Screen name="Team" component={AuthenticatedTeamScreen} options={teamTabOptions(dark)} />
		</Tab.Navigator>
	);
});

const drawer = createDrawerNavigator<AuthenticatedDrawerParamList>();

/**
 * React Navigation 7 removed `unmountOnBlur`: a drawer screen still unmounts once another one is shown, so it reads
 * its data again when it comes back, as it did before.
 */
function UnmountOnBlur({ children }: Readonly<{ children: React.ReactNode }>) {
	const isFocused = useIsFocused();
	if (!isFocused) {
		return null;
	}
	return <>{children}</>;
}

export const AuthenticatedNavigator = observer(function AuthenticatedNavigator() {
	return (
		<drawer.Navigator
			// No id, as before: see the app stack in app-navigator.tsx
			id={undefined}
			drawerContent={(props) => <HamburgerMenu {...props} />}
			screenLayout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
			screenOptions={{
				headerShown: false,
				drawerPosition: 'right',
				drawerStyle: { width: '83%' }
			}}
		>
			<drawer.Screen name="AuthenticatedTab" component={TabNavigator} />
			<drawer.Screen name="TaskScreen" component={AuthenticatedTaskScreen} />
			<drawer.Screen name="Setting" component={AuthenticatedSettingScreen} />
			<drawer.Screen name="TaskVersion" component={TaskVersionScreen} />
			<drawer.Screen name="TaskStatus" component={TaskStatusScreen} />
			<drawer.Screen name="TaskLabelScreen" component={TaskLabelScreen} />
			<drawer.Screen name="TaskSizeScreen" component={TaskSizeScreen} />
			<drawer.Screen name="TaskPriority" component={TaskPriorityScreen} />
			<drawer.Screen name="MembersSettingsScreen" component={MembersSettingsScreen} />
		</drawer.Navigator>
	);
});

/** The signed-in part of the app, with the one counter of the running time beside its screens. */
export function SignedInArea() {
	return (
		<>
			<TimeCounterHost />
			<AuthenticatedNavigator />
		</>
	);
}
