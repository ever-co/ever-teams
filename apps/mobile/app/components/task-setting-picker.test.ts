import { settingOptionOf } from './task-setting-picker';

jest.mock('../services/hooks/features/use-task-settings-access', () => ({
	useTaskSettingsAccess: () => ({ canCreate: true, readOnlyHint: '' })
}));

describe('a task setting as a picker row', () => {
	const medium = {
		id: 'size-2',
		name: 'medium',
		value: 'medium',
		color: '#F5E6B8',
		fullIconUrl: 'https://example.com/medium.svg'
	};

	it('reads its formatted name with its color and icon, under its id', () => {
		expect(settingOptionOf(medium, 'large')).toEqual({
			key: 'size-2',
			name: 'Medium',
			color: '#F5E6B8',
			iconUrl: 'https://example.com/medium.svg',
			isSelected: false
		});
	});

	it('is checked when the task holds its value', () => {
		expect(settingOptionOf(medium, 'medium').isSelected).toBe(true);
	});
});
