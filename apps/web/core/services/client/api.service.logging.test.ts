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

	it('hides password fields at any depth, inside objects and lists', () => {
		const body = {
			user: { email: 'a@b.co', password: 'p' },
			accounts: [{ hash: 'h', name: 'Acme' }]
		};

		expect(requestBodyForLog(body)).toEqual({
			user: { email: 'a@b.co', password: '[hidden]' },
			accounts: [{ hash: '[hidden]', name: 'Acme' }]
		});
	});

	it('reads a body already serialized as JSON and hides its passwords', () => {
		const body = JSON.stringify({ email: 'a@b.co', user: { confirmPassword: 'p' } });

		expect(requestBodyForLog(body)).toEqual({ email: 'a@b.co', user: { confirmPassword: '[hidden]' } });
	});

	it('leaves out a text body it cannot read', () => {
		expect(requestBodyForLog('password=p&email=a')).toBe('[not logged]');
	});

	it('stops on a body that refers to itself', () => {
		const body: Record<string, unknown> = { password: 'p' };
		body.self = body;

		expect(requestBodyForLog(body)).toEqual({ password: '[hidden]', self: '[circular]' });
	});

	it('leaves out any object that is not plain data, at any depth', () => {
		const form = new URLSearchParams('email=a@b.co&password=p');

		expect(requestBodyForLog(form)).toBe('[not logged]');
		expect(requestBodyForLog({ email: 'a@b.co', form })).toEqual({ email: 'a@b.co', form: '[not logged]' });
		expect(JSON.stringify(requestBodyForLog([form]))).not.toContain('password=p');
	});

	it('keeps primitives as they are', () => {
		expect(requestBodyForLog(undefined)).toBeUndefined();
		expect(requestBodyForLog({ count: 2, active: true, note: null })).toEqual({
			count: 2,
			active: true,
			note: null
		});
	});
});
