import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { activeFilterCountOf, FilterCategory, FilterMenu, toggledValues } from './filter-menu';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

type Field = 'status' | 'label';

const CATEGORIES: FilterCategory<Field>[] = [
	{
		field: 'status',
		kind: 'status',
		label: 'Status',
		options: [
			{ value: 'open', name: 'open' },
			{ value: 'in-progress', name: 'in progress' }
		]
	},
	{ field: 'label', kind: 'label', label: 'Labels', options: [], keepsCase: true }
];

const BUTTON = { x: 190, y: 250, width: 150, height: 44 };

async function renderFilter(selection: Partial<Record<Field, string[]>>) {
	const onChange = jest.fn();
	const onClear = jest.fn();
	await render(
		<FilterMenu
			anchor={BUTTON}
			categories={CATEGORIES}
			selection={selection}
			onChange={onChange}
			onClear={onClear}
			onDismiss={jest.fn()}
		/>
	);
	return { onChange, onClear };
}

describe("a profile's filter menu", () => {
	it('lists a row per property, and Clear filters only while a filter is on', async () => {
		await renderFilter({});

		expect(screen.getAllByTestId('filter-category').map((row) => row.props.accessibilityLabel)).toEqual([
			'Status',
			'Labels'
		]);
		expect(screen.queryByTestId('filter-clear')).toBeNull();

		await renderFilter({ status: ['open'] });

		expect(screen.getByText('1')).toBeTruthy();
		expect(screen.getByTestId('filter-clear')).toBeTruthy();
	});

	it("opens a property's values beside the menu, each checked or unchecked at once", async () => {
		const { onChange } = await renderFilter({ status: ['open'] });

		await fireEvent.press(screen.getByLabelText('Status'));

		expect(screen.getByTestId('filter-submenu')).toBeTruthy();
		expect(screen.getByLabelText('open')).toBeChecked();
		expect(screen.getByText('in progress')).toHaveStyle({ textTransform: 'capitalize' });

		await fireEvent.press(screen.getByLabelText('in progress'));
		await fireEvent.press(screen.getByLabelText('open'));

		expect(onChange.mock.calls).toEqual([
			['status', ['open', 'in-progress']],
			['status', []]
		]);
		expect(screen.getByTestId('filter-submenu')).toBeTruthy();
	});

	it('leaves a property without values out of reach, and clears every filter from Clear filters', async () => {
		const { onClear } = await renderFilter({ status: ['open'] });

		expect(screen.getByLabelText('Labels')).toBeDisabled();

		await fireEvent.press(screen.getByTestId('filter-clear'));

		expect(onClear).toHaveBeenCalledTimes(1);
	});
});

describe('the values a filter holds', () => {
	it('count across its properties, and take a value in or out', () => {
		expect(activeFilterCountOf({ status: ['open', 'blocked'], label: ['Outdoor'] })).toBe(3);
		expect(toggledValues(['open'], 'blocked')).toEqual(['open', 'blocked']);
		expect(toggledValues(['open', 'blocked'], 'open')).toEqual(['blocked']);
	});
});
