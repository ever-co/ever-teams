import React from 'react';
import { render, renderHook, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
	barColorsOf,
	tabBarHeightOf,
	tasksTabOptions,
	teamTabOptions,
	useTabBarScreenOptions,
	workTabOptions
} from './tab-bar';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../models', () => ({ useStores: () => ({ teamStore: { isTrackingEnabled: true } }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('./use-tab-buttons-loading', () => ({ useTabButtonsLoading: () => false }));

type IconOf = (props: { focused: boolean; color: string; size: number }) => React.ReactElement;

async function drawIcon(options: { tabBarIcon?: unknown }, focused: boolean) {
	const icon = options.tabBarIcon as IconOf;
	return render(icon({ focused, color: 'hsl(243, 75%, 59%)', size: 24 }));
}

describe('the tab bar', () => {
	it("takes the web's colors: the selected tab in primary-ink, the others muted, on the card", () => {
		const web = themeFor('light').colors;

		expect(barColorsOf(false).tintColor).toBe(web['primary-ink']);
		expect(barColorsOf(false).iconColor.default).toBe(web['muted-foreground']);
		expect(barColorsOf(false).backgroundColor).toBe(web.card);
		expect(barColorsOf(true).backgroundColor).toBe(themeFor('dark').colors.card);
	});

	it.each([
		['Work', workTabOptions, 'User'],
		['Tasks', tasksTabOptions, 'Task'],
		['Team', teamTabOptions, 'Users']
	] as const)('draws the %s icon in the color the navigator gives it', async (_tab, optionsOf, name) => {
		await drawIcon(optionsOf(false), false);

		expect(screen.getByTestId(`icon-${name}`)).toHaveStyle({ color: 'hsl(243, 75%, 59%)' });
	});

	it('gives the Tasks tab, which has an address, the same item style as the other tabs', async () => {
		const { result } = await renderHook(() => useTabBarScreenOptions());

		expect(result.current.tabBarItemStyle).toBeDefined();
		expect(tasksTabOptions(false).tabBarItemStyle).toEqual(result.current.tabBarItemStyle);
	});

	it("puts the selected tab's icon on the primary tint, and only that one", async () => {
		await drawIcon(workTabOptions(false), true);
		const pillOfSelected = StyleSheet.flatten(screen.getByTestId('tab-icon-user').props.style);
		expect(pillOfSelected.backgroundColor).toBe(barColorsOf(false).indicatorColor);

		await drawIcon(workTabOptions(false), false);
		const pillOfOther = StyleSheet.flatten(screen.getByTestId('tab-icon-user').props.style);
		expect(pillOfOther.backgroundColor).toBeUndefined();
	});

	// At 200 % the labels Work, Tasks and Teams showed only their top half under a bar of a fixed height
	it("keeps its height at the phone's usual font size and grows with the label at a larger one", () => {
		expect(tabBarHeightOf(0, 1)).toBe(60);
		expect(tabBarHeightOf(34, 1)).toBe(94);
		expect(tabBarHeightOf(0, 0.85)).toBe(60);
		expect(tabBarHeightOf(0, 1.3)).toBe(65);
		expect(tabBarHeightOf(0, 2)).toBe(76);
	});
});
