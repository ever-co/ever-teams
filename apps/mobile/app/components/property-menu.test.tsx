import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MenuOption, placementInArea, PropertyMenu, PropertyMenuAction } from './property-menu';

jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));

const CHIP = { x: 16, y: 300, width: 120, height: 30 };

function statuses(selectedKey: string): MenuOption[] {
	return ['Open', 'In Progress', 'Blocked'].map((label) => ({
		key: label,
		label,
		icon: <Text>{`glyph ${label}`}</Text>,
		isSelected: label === selectedKey
	}));
}

async function renderMenu(options: MenuOption[], footer?: React.ReactNode) {
	const onSelect = jest.fn();
	const onDismiss = jest.fn();
	await render(
		<PropertyMenu
			anchor={CHIP}
			options={options}
			onSelect={onSelect}
			onDismiss={onDismiss}
			searchPlaceholder="Change status…"
			footer={footer}
		/>
	);
	return { onSelect, onDismiss };
}

describe("a property's menu", () => {
	it('lists each value with its glyph and name, the one the task holds checked', async () => {
		await renderMenu(statuses('In Progress'));

		const rows = screen.getAllByTestId('menu-option');
		expect(rows.map((row) => row.props.accessibilityLabel)).toEqual(['Open', 'In Progress', 'Blocked']);
		expect(screen.getByText('glyph Blocked')).toBeTruthy();
		expect(screen.getByLabelText('In Progress')).toBeSelected();
		expect(screen.getAllByTestId('icon-Check')).toHaveLength(1);
	});

	it('keeps the values whose name holds what was typed, whatever its case', async () => {
		await renderMenu(statuses('Open'));

		await fireEvent.changeText(screen.getByPlaceholderText('Change status…'), ' progr');

		expect(screen.getAllByTestId('menu-option').map((row) => row.props.accessibilityLabel)).toEqual([
			'In Progress'
		]);
	});

	it('says there is no result, or nothing to pick yet', async () => {
		await renderMenu(statuses('Open'));
		await fireEvent.changeText(screen.getByPlaceholderText('Change status…'), 'done');

		expect(screen.getByText('taskMenus.noResults undefined')).toBeTruthy();

		await renderMenu([]);

		expect(screen.getByText('taskMenus.noOptions undefined')).toBeTruthy();
	});

	it('hands the picked value over, and closes on a tap outside', async () => {
		const { onSelect, onDismiss } = await renderMenu(statuses('Open'));

		await fireEvent.press(screen.getByLabelText('Blocked'));
		await fireEvent.press(screen.getByTestId('menu-backdrop'));

		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'Blocked' }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("closes on VoiceOver's escape from a row or the search line, both inside the area that takes it", async () => {
		const { onDismiss } = await renderMenu(statuses('Open'));
		const area = screen.getByTestId('menu-area');

		expect(within(area).getByLabelText('Blocked')).toBeTruthy();
		expect(within(area).getByPlaceholderText('Change status…')).toBeTruthy();
		await fireEvent(area, 'accessibilityEscape');

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('keeps a row of values in sight however little room the keyboard leaves it', async () => {
		await renderMenu(statuses('Open'));

		expect(screen.getByTestId('menu-list')).toHaveStyle({ minHeight: 40 });
	});

	it('stays hidden until it knows where to open', async () => {
		await renderMenu(statuses('Open'));

		expect(screen.getByTestId('property-menu')).toHaveStyle({ opacity: 0 });
	});

	it('opens 4 under its chip on the screen it lives on', () => {
		const area = { x: 0, y: 24, width: 360, height: 616 };

		const placement = placementInArea(area, {
			anchor: CHIP,
			listHeight: 112,
			footerHeight: 0,
			keyboardTop: null,
			bars: { top: 0, bottom: 0 },
			screenHeight: 640
		});

		expect(placement).toMatchObject({ top: 310, left: 16, width: 240 });
	});

	it('runs a footer action, or shows why it is out of reach', async () => {
		const onCreate = jest.fn();
		await renderMenu(
			statuses('Open'),
			<PropertyMenuAction icon={<Text>+</Text>} label="Create status" onPress={onCreate} />
		);
		await fireEvent.press(screen.getByLabelText('Create status'));

		expect(onCreate).toHaveBeenCalledTimes(1);

		await renderMenu(
			statuses('Open'),
			<PropertyMenuAction
				icon={<Text>+</Text>}
				label="Create status"
				onPress={onCreate}
				disabled
				hint="Only a manager can create one"
			/>
		);

		expect(screen.getByLabelText('Create status')).toBeDisabled();
		expect(screen.getByText('Only a manager can create one')).toBeTruthy();
	});

	it('keeps clear of the status bar when it opens above a low chip', () => {
		const area = { x: 0, y: 0, width: 360, height: 640 };
		const lowChip = { x: 162, y: 446, width: 116, height: 30 };

		const placement = placementInArea(area, {
			anchor: lowChip,
			listHeight: 400,
			footerHeight: 150,
			keyboardTop: null,
			bars: { top: 24, bottom: 24 },
			screenHeight: 640
		});

		expect(placement.top).toBe(32);
	});

	it('shows the names capitalized when asked, as the chips do', async () => {
		await render(
			<PropertyMenu
				anchor={CHIP}
				options={[{ key: 'open', label: 'in progress', isSelected: false }]}
				onSelect={jest.fn()}
				onDismiss={jest.fn()}
				searchPlaceholder="Change status…"
				capitalizesLabels
			/>
		);

		expect(screen.getByText('in progress')).toHaveStyle({ textTransform: 'capitalize' });
	});
});
