/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { useTabButtonsLoading } from './use-tab-buttons-loading';
import { Platform, TextStyle, View, ViewStyle } from 'react-native';
import {
	BottomTabNavigationEventMap,
	BottomTabScreenProps,
	createBottomTabNavigator,
	BottomTabNavigationProp
} from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
	CompositeScreenProps,
	CompositeNavigationProp,
	EventArg,
	RouteProp,
	useIsFocused,
	useNavigation
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { translate } from '../i18n';
import { spacing, typography, useAppTheme } from '../theme';
import HamburgerMenu from '../components/hamburger-menu';
import { Skeleton } from 'react-native-skeletons';
import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { SvgXml } from 'react-native-svg';
import {
	briefCaseFocusedDark,
	briefCaseFocusedLight,
	briefCaseNotFocusedDark,
	briefCaseNotFocusedLight,
	peopleFocusedDark,
	peopleFocusedLight,
	peopleNotFocusedDark,
	peopleNotFocusedLight,
	userFocusedDark,
	userFocusedLight,
	userNotFocusedDark,
	userNotFocusedLight
} from '../components/svgs/icons';
import { useOrganizationTeam } from '../services/hooks/use-organization';
import { TimeCounterHost } from '../services/hooks/use-timer';

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

/**
 * The tab bar sends `tabPress` as an event a listener can prevent (`canPreventDefault` in the bottom tabs' event map),
 * but without strictNullChecks the React Navigation 7 typings drop `preventDefault` from every event, so the listener
 * names the event the tab bar sends.
 */
type TabPressEvent = EventArg<
	'tabPress',
	BottomTabNavigationEventMap['tabPress']['canPreventDefault'],
	BottomTabNavigationEventMap['tabPress']['data']
>;

const TabNavigator = observer(function TabNavigator() {
	const { bottom } = useSafeAreaInsets();
	const { colors, dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const isLoading = useTabButtonsLoading();
	const { currentUser } = useOrganizationTeam();

	const navigation = useNavigation<SettingScreenNavigationProp<'Profile'>>();

	return (
		<Tab.Navigator
			// No id, as before: see the app stack in app-navigator.tsx
			id={undefined}
			screenOptions={{
				headerShown: false,
				tabBarHideOnKeyboard: true,
				tabBarStyle: [{ backgroundColor: dark ? '#1E2025' : colors.background }, { height: bottom + 60 }],
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.tertiary,
				tabBarLabelStyle: $tabBarLabel,
				tabBarItemStyle: $tabBarItem,
				...(isLoading
					? {
							tabBarButton: () => (
								<View
									style={{
										width: '100%',
										flexDirection: 'row',
										justifyContent: isTrackingEnabled ? 'space-between' : 'space-around',
										paddingVertical: 25
									}}
								>
									<View style={{ width: '30%', alignItems: 'center' }}>
										<Skeleton
											height={24}
											width={24}
											borderRadius={12}
											style={{ marginBottom: 13 }}
										/>
										<Skeleton height={8} width={63} borderRadius={30} />
									</View>
									<View style={{ width: '30%', alignItems: 'center' }}>
										<Skeleton
											height={24}
											width={24}
											borderRadius={12}
											style={{ marginBottom: 13 }}
										/>
										<Skeleton height={8} width={63} borderRadius={30} />
									</View>
									{isTrackingEnabled ? (
										<View style={{ width: '30%', alignItems: 'center' }}>
											<Skeleton
												height={24}
												width={24}
												borderRadius={12}
												style={{ marginBottom: 13 }}
											/>
											<Skeleton height={8} width={63} borderRadius={30} />
										</View>
									) : null}
								</View>
							)
					  }
					: null)
			}}
			initialRouteName="Team"
		>
			{isTrackingEnabled ? (
				<Tab.Screen
					name="Timer"
					component={AuthenticatedTimerScreen}
					options={{
						tabBarLabel: translate('myWorkScreen.name'),
						tabBarButtonTestID: 'tab-work',
						tabBarIcon: ({ focused }) =>
							!focused ? (
								<SvgXml xml={dark ? userNotFocusedDark : userNotFocusedLight} />
							) : (
								<SvgXml xml={dark ? userFocusedDark : userFocusedLight} />
							),

						tabBarActiveTintColor: dark ? '#8C7AE4' : '#3826A6'
					}}
				/>
			) : null}

			<Tab.Screen
				name="Profile"
				component={AuthenticatedProfileScreen}
				options={{
					tabBarLabel: translate('tasksScreen.name'),
					tabBarButtonTestID: 'tab-tasks',
					tabBarIcon: ({ focused }) =>
						focused ? (
							<SvgXml xml={dark ? briefCaseFocusedDark : briefCaseFocusedLight} />
						) : (
							<SvgXml xml={dark ? briefCaseNotFocusedDark : briefCaseNotFocusedLight} />
						),
					tabBarActiveTintColor: dark ? '#8C7AE4' : '#3826A6'
				}}
				listeners={{
					tabPress: (e: TabPressEvent) => {
						e.preventDefault();

						navigation.navigate('Profile', {
							userId: currentUser?.id,
							activeTab: 'worked'
						});
					}
				}}
			/>

			<Tab.Screen
				name="Team"
				component={AuthenticatedTeamScreen}
				options={{
					tabBarLabel: translate('teamScreen.name'),
					tabBarButtonTestID: 'tab-team',
					tabBarIcon: ({ focused }) =>
						!focused ? (
							<SvgXml xml={dark ? peopleNotFocusedDark : peopleNotFocusedLight} />
						) : (
							<SvgXml xml={dark ? peopleFocusedDark : peopleFocusedLight} />
						),
					tabBarActiveTintColor: dark ? '#8C7AE4' : '#3826A6'
				}}
			/>
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

const $tabBarItem: ViewStyle = {
	paddingTop: Platform.OS === 'ios' ? spacing.medium : spacing.extraSmall
};

const $tabBarLabel: TextStyle = {
	fontSize: 12,
	fontFamily: typography.fonts.PlusJakartaSans.semiBold,
	lineHeight: 16,
	fontWeight: '500',
	flex: 1
};
