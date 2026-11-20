import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskFilter from './task-filter';
import { ITaskFilter } from '../../../../services/hooks/features/use-task-filters';
import { IUserProfile } from '../logics/use-profile-screen-logic';
import type { MenuRect } from '../../../../../src/components/menu-placement';

let mockAnchor: MenuRect | null = null;

jest.mock('../../../../../src/components/menu-anchor', () => ({
	useMenuAnchor: () => ({
		anchorRef: { current: null },
		anchor: mockAnchor,
		openFromAnchor: (open: () => void) => open()
	})
}));
jest.mock('./profile-filter-menu', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		ProfileFilterMenu: ({ visible }: { visible: boolean }) => (visible ? <MockText>filter menu</MockText> : null)
	};
});
jest.mock('./filter-popup', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: ({ visible }: { visible: boolean }) => (visible ? <MockText>filter sheet</MockText> : null)
	};
});
jest.mock('./assign-task-section', () => ({ __esModule: true, default: () => null }));
jest.mock('./profile-tabs', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../../components/svgs/icons', () => ({ filterDarkIcon: '', filterLightIcon: '' }));
jest.mock('react-native-svg', () => ({ SvgXml: () => null }));
jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('light'),
	useAppTheme: () => ({
		colors: { background: '#ffffff', border: '#e5e5e5', primary: '#282048', secondary: '#3826A6' },
		dark: false
	})
}));

const profile = {
	isAuthUser: true,
	userProfile: { isEmailVerified: true },
	onCreateNewTask: jest.fn()
} as unknown as IUserProfile;

function hookHolding(applied: Record<string, string[]>) {
	return { appliedStatusFilter: applied } as unknown as ITaskFilter;
}

describe("the profile's Filter button", () => {
	it("opens the web's filter menu under it", async () => {
		mockAnchor = { x: 190, y: 250, width: 150, height: 44 };
		await render(<TaskFilter profile={profile} hook={hookHolding({})} />);

		await fireEvent.press(screen.getByText('tasksScreen.filter undefined'));

		expect(screen.getByText('filter menu')).toBeTruthy();
		expect(screen.queryByText('filter sheet')).toBeNull();
	});

	it('opens the filter sheet while the button has no place on screen', async () => {
		mockAnchor = null;
		await render(<TaskFilter profile={profile} hook={hookHolding({})} />);

		await fireEvent.press(screen.getByText('tasksScreen.filter undefined'));

		expect(screen.getByText('filter sheet')).toBeTruthy();
	});

	it('shows how many values its filters hold, as the web does', async () => {
		mockAnchor = null;
		await render(<TaskFilter profile={profile} hook={hookHolding({ status: ['open', 'blocked'], label: [] })} />);

		expect(screen.getByText('2')).toBeTruthy();
	});
});
