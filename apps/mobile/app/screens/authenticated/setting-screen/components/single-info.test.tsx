import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SingleInfo from './single-info';

jest.mock('../../../../components/toggle', () => {
	const { Pressable } = jest.requireActual('react-native');
	return {
		Toggle: ({
			value,
			onPress,
			accessibilityLabel
		}: {
			value: boolean;
			onPress?: () => void;
			accessibilityLabel?: string;
		}) => (
			<Pressable
				testID="settings-switch"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ checked: value }}
				onPress={onPress}
			/>
		)
	};
});

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useAppTheme: () => ({ dark: false }),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('light')
}));

jest.mock('../../../../i18n', () => ({ translate: (key: string) => key }));

describe('a settings row of Personal or Team', () => {
	it('keeps Detect on the time zone row, which detects without opening the row', async () => {
		const open = jest.fn();
		const detect = jest.fn();
		await render(
			<SingleInfo
				title="settingScreen.personalSection.timeZone"
				value="Africa/Lagos"
				onPress={open}
				onDetectTimezone={detect}
			/>
		);

		await fireEvent.press(screen.getByTestId('detect-timezone'));

		expect(detect).toHaveBeenCalledTimes(1);
		expect(open).not.toHaveBeenCalled();
	});

	it('opens its editor from a tap on its value, and shows the chevron', async () => {
		const open = jest.fn();
		await render(<SingleInfo title="settingScreen.personalSection.fullName" value="Kofi Arden" onPress={open} />);

		await fireEvent.press(screen.getByText('Kofi Arden'));

		expect(open).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('settings-row-chevron')).toBeTruthy();
	});

	it('changes the theme from the Themes row, which has no chevron', async () => {
		const toggleTheme = jest.fn();
		await render(
			<SingleInfo
				title="settingScreen.personalSection.themes"
				value="settingScreen.personalSection.lightModeToDark"
				onPress={toggleTheme}
			/>
		);

		await fireEvent.press(screen.getByText('settingScreen.personalSection.themes'));

		expect(toggleTheme).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('settings-row-chevron')).toBeNull();
	});

	it('changes the theme from its switch too, off in light mode', async () => {
		const toggleTheme = jest.fn();
		await render(
			<SingleInfo
				title="settingScreen.personalSection.themes"
				value="settingScreen.personalSection.lightModeToDark"
				onPress={toggleTheme}
			/>
		);

		expect(screen.getByTestId('settings-switch').props.accessibilityState.checked).toBe(false);

		await fireEvent.press(screen.getByTestId('settings-switch'));

		expect(toggleTheme).toHaveBeenCalledTimes(1);
	});

	it('names the theme switch after its row for screen readers', async () => {
		await render(
			<SingleInfo
				title="settingScreen.personalSection.themes"
				value="settingScreen.personalSection.lightModeToDark"
				onPress={jest.fn()}
			/>
		);

		expect(screen.getByLabelText('settingScreen.personalSection.themes')).toBeTruthy();
	});
});
