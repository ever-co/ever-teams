/** @jest-environment jsdom */
/**
 * The presence a closing page reports goes out with this tab's token (#5134): its own for its organization while
 * another tab has the cookies on another one. Without one, nothing goes out: the cookies' session is the other
 * organization's, and a proxied request would act with it.
 */
const mockToken = { value: null as string | null };

jest.mock('@/core/lib/auth/tab-organization', () => ({
	requestAccessToken: () => mockToken.value
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'org-a',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/services/client/api.service', () => ({
	APIService: class {
		baseURL = 'https://api.example.test';
		axiosInstance = { defaults: { baseURL: 'https://api.example.test/api' } };
	}
}));

import { realtimeService } from './realtime.service';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	fetchMock = jest.fn().mockResolvedValue({ ok: true });
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
});

describe('realtimeService.presenceOnUnload', () => {
	it("reports the presence with this tab's token and organization", () => {
		mockToken.value = 'token-of-a';

		realtimeService.presenceOnUnload('offline');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.example.test/api/realtime/presence');
		expect(init.headers).toMatchObject({ Authorization: 'Bearer token-of-a', 'organization-id': 'org-a' });
	});

	it('reports nothing when this tab has no token for its organization', () => {
		mockToken.value = null;

		realtimeService.presenceOnUnload('offline');

		expect(fetchMock).not.toHaveBeenCalled();
	});
});
