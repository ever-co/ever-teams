/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Platform, TextStyle, View, ViewStyle } from 'react-native';
import { BottomTabScreenProps, createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerScreenProps } from '@react-navigation/drawer';
import type { StackNavigationProp } from '@react-navigation/stack';
import { CompositeScreenProps, CompositeNavigationProp, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// COMPONENTS
import { AppStackParamList, AppStackScreenProps } from './AppNavigator';
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
import HamburgerMenu from '../components/HamburgerMenu';
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
import { useOrganizationTeam } from '../services/hooks/useOrganization';

export type AuthenticatedTabParamList = {
	Timer: undefined;
	Team: undefined;
	Setting: { activeTab: 1 | 2 };
	Profile: { userId: string; activeTab: 'worked' | 'assigned' | 'unassigned' };
	TaskScreen: { taskId: string };
};

export type AuthenticatedDrawerParamList = {
	Setting: undefined;
	AuthenticatedTab: undefined;
	TaskLabelScreen: undefined;
	TaskSizeScreen: undefined;
	TaskStatus: undefined;
	TaskPriority: undefined;
	TaskVersion: undefined;
	MembersSettingsScreen: undefined;
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
	StackNavigationProp<AppStackParamList>
>;

export type DrawerNavigationProp<T extends keyof AuthenticatedDrawerParamList> = CompositeNavigationProp<
	BottomTabNavigationProp<AuthenticatedDrawerParamList, T>,
	StackNavigationProp<AppStackParamList>
>;

export type SettingScreenRouteProp<T extends keyof AuthenticatedTabParamList> = RouteProp<AuthenticatedTabParamList, T>;

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>();

const TabNavigator = observer(function TabNavigator() {
	const { bottom } = useSafeAreaInsets();
	const { colors, dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const [isLoading, setIsLoading] = useState(true);
	const { currentUser } = useOrganizationTeam();

	const navigation = useNavigation<SettingScreenNavigationProp<'Profile'>>();

	useEffect(() => {
		setTimeout(() => setIsLoading(false), 3000);
	}, []);

	return (
		<Tab.Navigator
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
					tabBarIcon: ({ focused }) =>
						focused ? (
							<SvgXml xml={dark ? briefCaseFocusedDark : briefCaseFocusedLight} />
						) : (
							<SvgXml xml={dark ? briefCaseNotFocusedDark : briefCaseNotFocusedLight} />
						),
					tabBarActiveTintColor: dark ? '#8C7AE4' : '#3826A6'
				}}
				listeners={{
					tabPress: (e) => {
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

export const AuthenticatedNavigator = observer(function AuthenticatedNavigator() {
	return (
		<drawer.Navigator
			drawerContent={(props) => <HamburgerMenu {...props} />}
			screenOptions={{
				headerShown: false,
				drawerPosition: 'right',
				drawerStyle: { width: '83%' }
			}}
		>
			<drawer.Screen name="AuthenticatedTab" component={TabNavigator} options={{ unmountOnBlur: true }} />
			<drawer.Screen name="TaskScreen" component={AuthenticatedTaskScreen} options={{ unmountOnBlur: true }} />
			<drawer.Screen
				name="Setting"
				component={AuthenticatedSettingScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="TaskVersion"
				component={TaskVersionScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="TaskStatus"
				component={TaskStatusScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="TaskLabelScreen"
				component={TaskLabelScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="TaskSizeScreen"
				component={TaskSizeScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="TaskPriority"
				component={TaskPriorityScreen}
				options={{ unmountOnBlur: true }}
			/>
			<drawer.Screen
				name="MembersSettingsScreen"
				component={MembersSettingsScreen}
				options={{ unmountOnBlur: true }}
			/>
		</drawer.Navigator>
	);
});

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
