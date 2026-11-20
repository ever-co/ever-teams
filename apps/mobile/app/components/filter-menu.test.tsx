import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { activeFilterCountOf, FilterCategory, FilterMenu, labelOptionsOf, toggledValues } from './filter-menu';
import { ITaskLabelItem } from '../services/interfaces/ITaskLabel';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
// The glyphs as plain views naming what they draw, so the test reads the rows without drawing SVG
jest.mock('../../src/components/task-property-icon', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		TaskPropertyPlaceholderIcon: ({ kind }: { kind: string }) =>
			createElement(View, { testID: `placeholder-${kind}` })
	};
});
jest.mock('../../src/components/chip-icon', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		ChipIcon: ({ kind, item }: { kind: string; item: { name: string } }) =>
			createElement(View, { testID: 'option-glyph', kind, name: item.name })
	};
});
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

	it("closes a property's values from its row, as a phone's submenu covers part of the menu", async () => {
		await renderFilter({});

		await fireEvent.press(screen.getByLabelText('Status'));

		expect(screen.getByLabelText('Status')).toBeExpanded();

		await fireEvent.press(screen.getByLabelText('Status'));

		expect(screen.queryByTestId('filter-submenu')).toBeNull();
		expect(screen.getByLabelText('Status')).toBeCollapsed();
	});

	it('leaves a property without values out of reach, and clears every filter from Clear filters', async () => {
		const { onClear } = await renderFilter({ status: ['open'] });

		expect(screen.getByLabelText('Labels')).toBeDisabled();

		await fireEvent.press(screen.getByTestId('filter-clear'));

		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it("marks the values a filter holds with the web's mark", async () => {
		await renderFilter({ status: ['open'] });

		await fireEvent.press(screen.getByLabelText('Status'));

		expect(screen.getAllByTestId('selected-mark')).toHaveLength(1);
		expect(screen.getByLabelText('open').props.accessibilityState).toMatchObject({ checked: true });
	});
});

describe('the values a filter holds', () => {
	it('count across its properties, and take a value in or out', () => {
		expect(activeFilterCountOf({ status: ['open', 'blocked'], label: ['Outdoor'] })).toBe(3);
		expect(toggledValues(['open'], 'blocked')).toEqual(['open', 'blocked']);
		expect(toggledValues(['open', 'blocked'], 'open')).toEqual(['blocked']);
	});
});

describe('the labels a filter offers', () => {
	it('keep the names their tasks hold, one option per name', () => {
		const labels: Partial<ITaskLabelItem>[] = [
			{ name: 'QA-Team', color: '#ffcc00' },
			{ name: 'QA Team' },
			{ name: 'QA-Team' },
			{ name: '' }
		];

		const options = labelOptionsOf(labels as ITaskLabelItem[]);

		expect(options.map((option) => [option.value, option.name, option.color])).toEqual([
			['QA-Team', 'QA-Team', '#ffcc00'],
			['QA Team', 'QA Team', undefined]
		]);
	});
});
