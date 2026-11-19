/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, TextStyle, View, ViewStyle } from 'react-native';
import type { BottomTabNavigationEventMap, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { EventArg } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from 'react-native-skeletons';
import { SvgXml } from 'react-native-svg';
import { translate } from '../i18n';
import { useStores } from '../models';
import { spacing, typography, useAppTheme } from '../theme';
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

/** The signed-in tab bar's look; while the first screens load, placeholders stand for its buttons. */
export function useTabBarScreenOptions(): BottomTabNavigationOptions {
	const { bottom } = useSafeAreaInsets();
	const { colors, dark } = useAppTheme();
	const {
		teamStore: { isTrackingEnabled }
	} = useStores();
	const isLoading = useTabButtonsLoading();
	return {
		headerShown: false,
		tabBarHideOnKeyboard: true,
		tabBarStyle: [{ backgroundColor: dark ? '#1E2025' : colors.background }, { height: bottom + 60 }],
		tabBarActiveTintColor: colors.primary,
		tabBarInactiveTintColor: colors.tertiary,
		tabBarLabelStyle: $tabBarLabel,
		tabBarItemStyle: $tabBarItem,
		...(isLoading ? { tabBarButton: () => <TabButtonsPlaceholder withTimer={isTrackingEnabled} /> } : null)
	};
}

const ACTIVE_TINT_DARK = '#8C7AE4';
const ACTIVE_TINT_LIGHT = '#3826A6';

/** The Work tab: the timer. */
export function workTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('myWorkScreen.name'),
		tabBarButtonTestID: 'tab-work',
		tabBarIcon: ({ focused }) =>
			!focused ? (
				<SvgXml xml={dark ? userNotFocusedDark : userNotFocusedLight} />
			) : (
				<SvgXml xml={dark ? userFocusedDark : userFocusedLight} />
			),
		tabBarActiveTintColor: dark ? ACTIVE_TINT_DARK : ACTIVE_TINT_LIGHT
	};
}

/** The Tasks tab: the person's own tasks, on their profile. */
export function tasksTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('tasksScreen.name'),
		tabBarButtonTestID: 'tab-tasks',
		tabBarIcon: ({ focused }) =>
			focused ? (
				<SvgXml xml={dark ? briefCaseFocusedDark : briefCaseFocusedLight} />
			) : (
				<SvgXml xml={dark ? briefCaseNotFocusedDark : briefCaseNotFocusedLight} />
			),
		tabBarActiveTintColor: dark ? ACTIVE_TINT_DARK : ACTIVE_TINT_LIGHT
	};
}

/** The Teams tab: the active team's members. */
export function teamTabOptions(dark: boolean): BottomTabNavigationOptions {
	return {
		tabBarLabel: translate('teamScreen.name'),
		tabBarButtonTestID: 'tab-team',
		tabBarIcon: ({ focused }) =>
			!focused ? (
				<SvgXml xml={dark ? peopleNotFocusedDark : peopleNotFocusedLight} />
			) : (
				<SvgXml xml={dark ? peopleFocusedDark : peopleFocusedLight} />
			),
		tabBarActiveTintColor: dark ? ACTIVE_TINT_DARK : ACTIVE_TINT_LIGHT
	};
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
