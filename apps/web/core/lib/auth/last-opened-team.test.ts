/** @jest-environment jsdom */
/**
 * The team this browser last opened is a convenience kept in local storage. A browser that refuses its storage must
 * not stop a team, organization or workspace switch halfway (Greptile on ever-co/ever-teams#5345): neither the read nor
 * the write throws.
 */
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { readLastOpenedTeamId, storeLastOpenedTeamId } from './last-opened-team';

beforeEach(() => window.localStorage.clear());

afterEach(() => jest.restoreAllMocks());

describe('the last opened team', () => {
	it('is kept and read back', () => {
		expect(readLastOpenedTeamId()).toBeNull();

		expect(storeLastOpenedTeamId('team-a')).toBe(true);

		expect(window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM)).toBe('team-a');
		expect(readLastOpenedTeamId()).toBe('team-a');
	});

	it('reads none for an empty value', () => {
		window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, '');

		expect(readLastOpenedTeamId()).toBeNull();
	});

	it('answers false, without throwing, when the storage is full', () => {
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
		});

		expect(storeLastOpenedTeamId('team-a')).toBe(false);
	});

	it('answers false and none, without throwing, when the browser blocks the storage', () => {
		jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('Access is denied for this document.', 'SecurityError');
		});

		expect(storeLastOpenedTeamId('team-a')).toBe(false);
		expect(readLastOpenedTeamId()).toBeNull();
	});

	it('reads none, without throwing, when the storage refuses the read', () => {
		jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('Access is denied for this document.', 'SecurityError');
		});

		expect(readLastOpenedTeamId()).toBeNull();
	});
});
