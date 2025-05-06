import { BottomTabScreenProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components';
import { translate } from '../i18n';
import { DemoCommunityScreen, DemoShowroomScreen, DemoDebugScreen } from '../screens';
import { DemoPodcastListScreen } from '../screens/demo-podcast-list-screen';
import { colors, spacing, typography } from '../theme';
import { AppStackParamList, AppStackScreenProps } from './app-navigator';

export type DemoTabParamList = {
	DemoCommunity: undefined;
	DemoShowroom: undefined;
	DemoDebug: undefined;
	DemoPodcastList: undefined;
};

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type DemoTabScreenProps<T extends keyof DemoTabParamList> = CompositeScreenProps<
	BottomTabScreenProps<DemoTabParamList, T>,
	AppStackScreenProps<keyof AppStackParamList>
>;

const Tab = createBottomTabNavigator<DemoTabParamList>();

export function DemoNavigator() {
	const { bottom } = useSafeAreaInsets();

	return (
		<Tab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarHideOnKeyboard: true,
				tabBarStyle: [$tabBar, { height: bottom + 70 }],
				tabBarActiveTintColor: colors.text,
				tabBarInactiveTintColor: colors.text,
				tabBarLabelStyle: $tabBarLabel,
				tabBarItemStyle: $tabBarItem
			}}
		>
			<Tab.Screen
				name="DemoShowroom"
				component={DemoShowroomScreen}
				options={{
					tabBarLabel: translate('demoNavigator.componentsTab'),
					tabBarIcon: ({ focused }) => <Icon icon="components" color={focused && colors.tint} />
				}}
			/>

			<Tab.Screen
				name="DemoCommunity"
				component={DemoCommunityScreen}
				options={{
					tabBarLabel: translate('demoNavigator.communityTab'),
					tabBarIcon: ({ focused }) => <Icon icon="community" color={focused && colors.tint} />
				}}
			/>

			<Tab.Screen
				name="DemoPodcastList"
				component={DemoPodcastListScreen}
				options={{
					tabBarLabel: translate('demoNavigator.podcastListTab'),
					tabBarIcon: ({ focused }) => <Icon icon="podcast" color={focused && colors.tint} />
				}}
			/>

			<Tab.Screen
				name="DemoDebug"
				component={DemoDebugScreen}
				options={{
					tabBarLabel: translate('demoNavigator.debugTab'),
					tabBarIcon: ({ focused }) => <Icon icon="debug" color={focused && colors.tint} />
				}}
			/>
		</Tab.Navigator>
	);
}

const $tabBar: ViewStyle = {
	backgroundColor: colors.background,
	borderTopColor: colors.transparent
};

const $tabBarItem: ViewStyle = {
	paddingTop: spacing.medium
};

const $tabBarLabel: TextStyle = {
	fontSize: 12,
	fontFamily: typography.primary.medium,
	lineHeight: 16,
	flex: 1
};

// @demo remove-file
