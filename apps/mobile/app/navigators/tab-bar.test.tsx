import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { barColorsOf, tasksTabOptions, teamTabOptions, workTabOptions } from './tab-bar';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('@expo/vector-icons', () => {
	const { createElement } = jest.requireActual('react');
	const { Text } = jest.requireActual('react-native');
	return {
		Feather: ({ name, color }: { name: string; color: string }) => createElement(Text, null, `${name} ${color}`)
	};
});
jest.mock('../models', () => ({ useStores: () => ({ teamStore: { isTrackingEnabled: true } }) }));

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
		['Work', workTabOptions, 'user'],
		['Tasks', tasksTabOptions, 'briefcase'],
		['Team', teamTabOptions, 'users']
	] as const)('draws the %s icon in the color the navigator gives it', async (_tab, optionsOf, name) => {
		await drawIcon(optionsOf(false), false);

		expect(screen.getByText(`${name} hsl(243, 75%, 59%)`)).toBeTruthy();
	});

	it("puts the selected tab's icon on the primary tint, and only that one", async () => {
		await drawIcon(workTabOptions(false), true);
		const pillOfSelected = StyleSheet.flatten(screen.getByTestId('tab-icon-user').props.style);
		expect(pillOfSelected.backgroundColor).toBe(barColorsOf(false).indicatorColor);

		await drawIcon(workTabOptions(false), false);
		const pillOfOther = StyleSheet.flatten(screen.getByTestId('tab-icon-user').props.style);
		expect(pillOfOther.backgroundColor).toBeUndefined();
	});
});
