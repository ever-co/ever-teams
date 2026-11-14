/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useTimeZoneSetting } from './use-time-zone-setting';

const mockUpdateAvatar = jest.fn();

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', timeZone: 'Africa/Kinshasa (UTC +01:00)' } })
}));
jest.mock('@/core/hooks/users/use-settings', () => ({
	useSettings: () => ({ updateAvatar: mockUpdateAvatar })
}));
jest.mock('@/core/hooks/common/use-timezone-settings', () => ({
	useTimezoneSettings: () => ({ setActiveTimezone: jest.fn() })
}));

beforeEach(() => {
	mockUpdateAvatar.mockReset();
});

async function save(zone: string): Promise<boolean> {
	const { result } = renderHook(() => useTimeZoneSetting());
	let isSaved = false;
	await act(async () => {
		isSaved = await result.current.saveZone(zone);
	});
	return isSaved;
}

describe('useTimeZoneSetting saveZone', () => {
	it('counts a zone as saved when the profile the API answers holds it', async () => {
		mockUpdateAvatar.mockImplementation(async ({ timeZone }: { timeZone: string }) => ({ id: 'user-1', timeZone }));

		expect(await save('America/New_York')).toBe(true);
	});

	it('does not count a save the API answered while keeping the old zone', async () => {
		// An API whose update does not take `timeZone` answers success with the profile unchanged
		mockUpdateAvatar.mockResolvedValue({ id: 'user-1', timeZone: 'Africa/Kinshasa (UTC +01:00)' });

		expect(await save('America/New_York')).toBe(false);
	});

	it('does not count a refused save', async () => {
		mockUpdateAvatar.mockRejectedValue(new Error('500'));

		expect(await save('America/New_York')).toBe(false);
	});
});
