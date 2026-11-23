import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import DropDown from './drop-down';
import { themeFor } from '../../../src/theme/use-theme';

const fieldCrew = { id: 'team-1', name: 'Field Crew North', members: [{}, {}, {}, {}] };
const harbour = { id: 'team-2', name: 'Harbour Works', members: [{}, {}] };
const mockStores = {
	teamStore: {
		teams: { items: [fieldCrew, harbour] },
		activeTeam: fieldCrew,
		activeTeamId: fieldCrew.id,
		setActiveTeam: jest.fn()
	},
	TaskStore: { setActiveTask: jest.fn(), setActiveTaskId: jest.fn() }
};

jest.mock('../../models', () => ({ useStores: () => mockStores }));
jest.mock('../../theme', () => ({
	useWebTheme: () => jest.requireActual('../../../src/theme/use-theme').themeFor('light')
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}) }));
jest.mock('../../navigators/routes', () => ({ navigateTo: jest.fn() }));
jest.mock('../../../src/components/icons', () => jest.requireActual('../../../test/icons-stand-in').iconsStandIn());

function drawSwitcher(isOpen: boolean, isAccountVerified = true) {
	const handlers = { setIsOpen: jest.fn(), onCreateTeam: jest.fn() };
	const drawing = render(
		<DropDown
			isOpen={isOpen}
			setIsOpen={handlers.setIsOpen}
			onCreateTeam={handlers.onCreateTeam}
			resized={false}
			isAccountVerified={isAccountVerified}
		/>
	);
	return { drawing, handlers };
}

describe('the team switcher', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("is the web's 44-tall control with the team's name and its member count", async () => {
		const { drawing } = drawSwitcher(false);
		await drawing;

		const control = StyleSheet.flatten(screen.getByTestId('team-switcher').props.style);
		expect(control.height).toBe(44);
		expect(control.backgroundColor).toBe(themeFor('light').colors.card);
		expect(screen.getByText(/Field Crew North/)).toBeTruthy();
		expect(screen.getByText('(4)')).toBeTruthy();
	});

	it('opens its list from the control', async () => {
		const { drawing, handlers } = drawSwitcher(false);
		await drawing;

		await fireEvent.press(screen.getByTestId('team-switcher'));

		expect(handlers.setIsOpen).toHaveBeenCalledWith(true);
	});

	it('lists every team and switches to the one chosen', async () => {
		const { drawing, handlers } = drawSwitcher(true);
		await drawing;

		expect(screen.getAllByTestId('team-switcher-team')).toHaveLength(2);

		await fireEvent.press(screen.getByText(/Harbour Works/));

		expect(mockStores.teamStore.setActiveTeam).toHaveBeenCalledWith(harbour);
		expect(mockStores.TaskStore.setActiveTask).toHaveBeenCalledWith(null);
		expect(handlers.setIsOpen).toHaveBeenCalledWith(false);
	});

	it('gives each team a full-height row, a named settings button and its selected state', async () => {
		const { drawing } = drawSwitcher(true);
		await drawing;

		const rows = screen.getAllByTestId('team-switcher-team');
		expect(rows.map((row) => row.props.accessibilityState?.selected)).toEqual([true, false]);
		for (const row of rows) {
			expect(StyleSheet.flatten(row.props.style).alignSelf).toBe('stretch');
		}
		const settings = screen.getAllByTestId('team-switcher-settings');
		expect(settings).toHaveLength(2);
		for (const button of settings) {
			expect(button.props.accessibilityLabel).toMatch(/settingScreen\.name/);
			expect(StyleSheet.flatten(button.props.style).width).toBeGreaterThanOrEqual(44);
		}
	});

	it('still offers to create a team, once the account is verified', async () => {
		const { drawing, handlers } = drawSwitcher(true);
		await drawing;

		await fireEvent.press(screen.getByTestId('team-switcher-create'));

		expect(handlers.onCreateTeam).toHaveBeenCalledTimes(1);
	});

	it('keeps Create new team out of reach before the account is verified', async () => {
		const { drawing, handlers } = drawSwitcher(true, false);
		await drawing;

		await fireEvent.press(screen.getByTestId('team-switcher-create'));

		expect(handlers.onCreateTeam).not.toHaveBeenCalled();
	});

	it('keeps a long team name on one line that shrinks before the chevron', async () => {
		await drawSwitcher(false).drawing;

		const name = await screen.findByText(/Field Crew North/);

		expect(name.props.numberOfLines).toBe(1);
		expect(StyleSheet.flatten(name.props.style).flexShrink).toBe(1);
	});

	it("closes on the web's up-down chevrons, in muted-foreground", async () => {
		await drawSwitcher(false).drawing;

		expect(await screen.findByTestId('icon-ChevronsUpDown')).toHaveStyle({
			color: themeFor('light').colors['muted-foreground']
		});
	});
});
