import { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const mockDebug = jest.fn();

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('../logs/logger.service', () => ({ Logger: { getInstance: () => ({ debug: mockDebug }) } }));
jest.mock('../logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import { APIService } from './api.service';
import { requestBodyForLog } from './request-log-body';

function captureAdapter(capture: (config: InternalAxiosRequestConfig) => void): AxiosAdapter {
	return async (config) => {
		capture(config);
		return { config, data: {}, headers: {}, status: 202, statusText: 'Accepted' } as AxiosResponse;
	};
}

describe('development request log', () => {
	beforeEach(() => mockDebug.mockReset());

	it('sends the new password but never writes it to the log', async () => {
		const service = new APIService('https://api.example.test', { enableLogging: true });
		let sentBody = '';
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentBody = String(config.data);
		});

		await service.axiosInstance.put('/user/user-1', { hash: 'secret-password', firstName: 'Marie' });

		expect(sentBody).toContain('secret-password');
		const requestLog = mockDebug.mock.calls.find(([message]) => String(message).includes('Request'));
		expect(requestLog?.[1].data).toEqual({ hash: '[hidden]', firstName: 'Marie' });
		expect(JSON.stringify(mockDebug.mock.calls)).not.toContain('secret-password');
	});
});

describe('requestBodyForLog', () => {
	it('hides every password field and keeps the others', () => {
		expect(requestBodyForLog({ email: 'a@b.co', password: 'p', confirmPassword: 'p', hash: 'h' })).toEqual({
			email: 'a@b.co',
			password: '[hidden]',
			confirmPassword: '[hidden]',
			hash: '[hidden]'
		});
	});

	it('leaves a body that is not a plain object as it is', () => {
		const form = new URLSearchParams('a=1');

		expect(requestBodyForLog(form)).toBe(form);
		expect(requestBodyForLog('raw')).toBe('raw');
		expect(requestBodyForLog(undefined)).toBeUndefined();
	});
});
