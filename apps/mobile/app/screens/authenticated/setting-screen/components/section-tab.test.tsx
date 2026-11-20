import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import SectionTab from './section-tab';
import { themeFor } from '../../../../../src/theme/use-theme';

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ dark: true }),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('dark')
}));

jest.mock('../../../../i18n', () => ({ translate: (key: string) => key }));

const mockTeam = { activeTeam: { id: 'field-crew-north' } as { id: string } | undefined };
jest.mock('../../../../services/hooks/use-organization', () => ({
	useOrganizationTeam: () => mockTeam
}));

const dark = themeFor('dark');

function lineColorOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID).props.style).borderBottomColor;
}

describe('the Personal and Team tabs of Settings', () => {
	beforeEach(() => {
		mockTeam.activeTeam = { id: 'field-crew-north' };
	});

	it('underlines the open tab in primary-ink, the other without a line', async () => {
		await render(<SectionTab activeTabId={2} toggleTab={jest.fn()} />);

		expect(lineColorOf('settings-tab-2')).toBe(dark.colors['primary-ink']);
		expect(lineColorOf('settings-tab-1')).toBeUndefined();
	});

	it('opens Team on a tap', async () => {
		const toggleTab = jest.fn();
		await render(<SectionTab activeTabId={1} toggleTab={toggleTab} />);

		await fireEvent.press(screen.getByText('settingScreen.teamSection.name'));

		expect(toggleTab).toHaveBeenCalledWith(2);
	});

	it('keeps Personal open outside a team, where Team opens nothing', async () => {
		mockTeam.activeTeam = undefined;
		const toggleTab = jest.fn();
		await render(<SectionTab activeTabId={1} toggleTab={toggleTab} />);
		toggleTab.mockClear();

		await fireEvent.press(screen.getByText('settingScreen.teamSection.name'));

		expect(toggleTab).not.toHaveBeenCalled();
	});
});
