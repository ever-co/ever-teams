import React from 'react';
import type { ComponentType } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation, useRoute } from 'expo-router/react-navigation';
import { useAppLocale } from '../../app/i18n';

type SearchParams = Record<string, string | string[] | undefined>;

/** What the current app's screens take from React Navigation: the navigation they are in, and their route. */
interface CurrentScreenProps {
	navigation: unknown;
	route: { key: string; name: string; params?: object };
}

function firstOf(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
}

/** A member's profile, as the Profile screen read its params: `userId` and the tab, from `/profile/[memberId]`. */
export function profileParamsOf(search: SearchParams): { userId?: string; activeTab?: string } {
	return { userId: firstOf(search.memberId), activeTab: firstOf(search.activeTab) ?? 'worked' };
}

/** A task, as the task screen read its params: `taskId`, from `/task/[id]`. */
export function taskParamsOf(search: SearchParams): { taskId?: string } {
	return { taskId: firstOf(search.id) };
}

function paramsFor(
	routeParams: object | undefined,
	search: SearchParams,
	paramsOf?: (search: SearchParams) => object
): object | undefined {
	if (paramsOf) {
		return paramsOf(search);
	}
	return routeParams;
}

/**
 * A screen of the current app under an Expo Router route: it gets the navigation of the navigator it is in, and the
 * params it received by name before, read from its address. A new language mounts it again on the same address.
 *
 * @param screen - The current screen; typed for React Navigation's props, which this gives in the same shape.
 * @param paramsOf - Its params from the address, when it takes any.
 */
export function routeOf(screen: unknown, paramsOf?: (search: SearchParams) => object) {
	const Screen = screen as ComponentType<CurrentScreenProps>;
	return function CurrentScreenRoute() {
		const navigation = useNavigation();
		const route = useRoute();
		const search = useLocalSearchParams();
		const locale = useAppLocale();
		const params = paramsFor(route.params, search, paramsOf);
		return <Screen key={locale} navigation={navigation} route={{ ...route, params }} />;
	};
}
