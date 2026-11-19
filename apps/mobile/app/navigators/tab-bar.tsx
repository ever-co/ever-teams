/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationEventMap, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { EventArg } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from 'react-native-skeletons';
import { translate } from '../i18n';
import { useStores } from '../models';
import { spacing, useAppTheme } from '../theme';
import { tabBarColorsFor } from '../../src/navigation/tab-bar-colors';
import { themeFor } from '../../src/theme/use-theme';
import { colorSchemeOf } from '../../src/theme/color-scheme';
import { useTabButtonsLoading } from './use-tab-buttons-loading';

/**
 * The tab bar sends `tabPress` as an event a listener can prevent (`canPreventDefault` in the bottom tabs' event map),
 * but without strictNullChecks the React Navigation 7 typings drop `preventDefault` from every event, so the listener
 * names the event the tab bar sends.
 */
export type TabPressEvent = EventArg<
	'tabPress',
	BottomTabNavigationEventMap['tabPress']['canPreventDefault'],
	BottomTabNavigationEventMap['tabPress']['data']
>;

function TabButtonPlaceholder() {
	return (
		<View style={{ width: '30%', alignItems: 'center' }}>
			<Skeleton height={24} width={24} borderRadius={12} style={{ marginBottom: 13 }} />
			<Skeleton height={8} width={63} borderRadius={30} />
		</View>
	);
}

function TabButtonsPlaceholder({ withTimer }: Readonly<{ withTimer: boolean }>) {
	return (
		<View
			style={{
				width: '100%',
				flexDirection: 'row',
				justifyContent: withTimer ? 'space-between' : 'space-around',
				paddingVertical: 25
			}}
		>
			<TabButtonPlaceholder />
			<TabButtonPlaceholder />
			{withTimer ? <TabButtonPlaceholder /> : null}
		</View>
	);
}

/** The tab bar's colors in the web's tokens, for the theme shown. */
export function barColorsOf(dark: boolean) {
	const scheme = colorSchemeOf(dark);
	return tabBarColorsFor(themeFor(scheme));
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface TabIconProps {
	name: FeatherName;
	focused: boolean;
	color: string;
	dark: boolean;
}

/** A tab's icon, tinted by the navigator; the selected tab's icon sits on the primary tint, as on the web. */
function TabIcon({ name, focused, color, dark }: Readonly<TabIconProps>) {
	const indicator = barColorsOf(dark).indicatorColor;
	return (
		<View testID={`tab-icon-${name}`} style={[$iconPill, focused && { backgroundColor: indicator }]}>
			<Feather name={name} size={20} color={color} />
		</View>
	);
}

/** The signed-in tab bar's look; while the first screens load, placeholders stand for its buttons. */
export function useTabBarScreenOptions(): BottomTabNavigationOptions {
	const { bottom } = useSafeAreaInsets();
	const { colors, dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const isLoading = useTabButtonsLoading();
	const bar = barColorsOf(dark);
	return {
		headerShown: false,
		tabBarHideOnKeyboard: true,
		tabBarStyle: [
			{
				backgroundColor: bar.backgroundColor,
				borderTopColor: colors.border,
				borderTopWidth: StyleSheet.hairlineWidth
			},
			{ height: bottom + 60 }
		],
		tabBarActiveTintColor: bar.tintColor,
		tabBarInactiveTintColor: bar.iconColor.default,
		tabBarLabelStyle: $tabBarLabel,
		tabBarItemStyle: $tabBarItem,
		...(isLoading ? { tabBarButton: () => <TabButtonsPlaceholder withTimer={isTrackingEnabled} /> } : null)
	};
}

/** The Work tab: the timer. */
export function workTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('myWorkScreen.name'),
		tabBarButtonTestID: 'tab-work',
		tabBarIcon: ({ focused, color }) => <TabIcon name="user" focused={focused} color={color} dark={dark} />
	};
}

/** The Tasks tab: the person's own tasks, on their profile. */
export function tasksTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('tasksScreen.name'),
		tabBarButtonTestID: 'tab-tasks',
		tabBarIcon: ({ focused, color }) => <TabIcon name="briefcase" focused={focused} color={color} dark={dark} />
	};
}

/** The Teams tab: the active team's members. */
export function teamTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('teamScreen.name'),
		tabBarButtonTestID: 'tab-team',
		tabBarIcon: ({ focused, color }) => <TabIcon name="users" focused={focused} color={color} dark={dark} />
	};
}

const $tabBarItem: ViewStyle = {
	paddingTop: Platform.OS === 'ios' ? spacing.medium : spacing.extraSmall
};

const $tabBarLabel: TextStyle = {
	fontSize: 12,
	lineHeight: 16,
	fontWeight: '500',
	flex: 1
};

const $iconPill: ViewStyle = {
	alignItems: 'center',
	justifyContent: 'center',
	width: 52,
	height: 28,
	borderRadius: 14
};
