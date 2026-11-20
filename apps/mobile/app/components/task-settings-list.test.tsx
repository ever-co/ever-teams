import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { TaskSettingsList } from './task-settings-list';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('dark')
}));

const dark = themeFor('dark');
const renderRow = ({ item }: { item: string }) => <Text>{item}</Text>;

describe("a team's task settings list", () => {
	it('puts its rows on the settings surface with a hairline between them', async () => {
		await render(<TaskSettingsList testID="list" data={['Backlog', 'Open', 'Blocked']} renderItem={renderRow} />);

		const surface = StyleSheet.flatten(screen.getByTestId('list').props.style);
		expect(surface).toMatchObject({ backgroundColor: dark.colors.card, borderRadius: 14, flexGrow: 0 });
		expect(screen.getAllByTestId('task-settings-divider')).toHaveLength(2);
	});

	it('draws no frame around a list without rows', async () => {
		await render(<TaskSettingsList testID="list" data={[]} renderItem={renderRow} />);

		expect(StyleSheet.flatten(screen.getByTestId('list').props.style).backgroundColor).toBeUndefined();
	});
});
