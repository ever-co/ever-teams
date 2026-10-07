import { AxiosAdapter, AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const mockCookieState = {
	accessToken: null as string | null,
	activeTeamId: 'team-1',
	organizationId: 'organization-1',
	tenantId: 'cookie-tenant'
};

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => mockCookieState.accessToken,
	getActiveTeamIdCookie: () => mockCookieState.activeTeamId,
	getOrganizationIdCookie: () => mockCookieState.organizationId,
	getTenantIdCookie: () => mockCookieState.tenantId
}));

jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));

jest.mock('../logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));

jest.mock('../logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));

import { APIService } from './api.service';

type PendingRequest = {
	config: InternalAxiosRequestConfig;
	release: () => void;
};

function ok(config: InternalAxiosRequestConfig): AxiosResponse {
	return {
		config,
		data: { ok: true },
		headers: {},
		status: 200,
		statusText: 'OK'
	};
}

function captureAdapter(capture: (config: InternalAxiosRequestConfig) => void): AxiosAdapter {
	return async (config) => {
		capture(config);
		return ok(config);
	};
}

function createPendingAdapter(): { adapter: AxiosAdapter; nextRequest: () => Promise<PendingRequest> } {
	const queued: PendingRequest[] = [];
	const waiters: Array<(request: PendingRequest) => void> = [];

	return {
		adapter: (config) =>
			new Promise((resolve) => {
				const signal = config.signal as AbortSignal | undefined;
				let settled = false;
				const release = () => {
					if (settled) return;
					settled = true;
					signal?.removeEventListener('abort', release);
					resolve(ok(config));
				};
				const request = { config, release };
				if (signal?.aborted) release();
				else signal?.addEventListener('abort', release, { once: true });

				const waiter = waiters.shift();
				if (waiter) waiter(request);
				else queued.push(request);
			}),
		nextRequest: () => {
			const request = queued.shift();
			return request ? Promise.resolve(request) : new Promise((resolve) => waiters.push(resolve));
		}
	};
}

function createService(): APIService {
	return new APIService('https://api.example.test', { enableLogging: false });
}

describe('APIService request transport', () => {
	beforeEach(() => {
		mockCookieState.accessToken = null;
		mockCookieState.tenantId = 'cookie-tenant';
		jest.spyOn(console, 'debug').mockImplementation(() => undefined);
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('preserves a mixed-case explicit tenant header through the APIService interceptor', async () => {
		const service = createService();
		let sentConfig: InternalAxiosRequestConfig | undefined;
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentConfig = config;
		});

		const request = service.axiosInstance.get('/captured-header', {
			headers: { 'TeNaNt-Id': 'captured-tenant' }
		});
		mockCookieState.tenantId = 'new-cookie-tenant';
		await request;

		expect((sentConfig?.headers as AxiosHeaders).get('tenant-id')).toBe('captured-tenant');
	});

	it('fills the tenant header from the current cookie when the caller omits it', async () => {
		const service = createService();
		let sentConfig: InternalAxiosRequestConfig | undefined;
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentConfig = config;
		});
		mockCookieState.tenantId = 'legacy-cookie-tenant';

		await service.axiosInstance.get('/legacy-cookie');

		expect((sentConfig?.headers as AxiosHeaders).get('tenant-id')).toBe('legacy-cookie-tenant');
	});

	it('preserves APIConfig.tenantId captured before the active cookie changes', async () => {
		const service = createService();
		let sentConfig: InternalAxiosRequestConfig | undefined;
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentConfig = config;
		});
		mockCookieState.tenantId = 'cookie-before-scheduling';

		const request = service.get('/captured-config', {
			tenantId: 'captured-tenant',
			params: { include: 'all' }
		});
		mockCookieState.tenantId = 'cookie-after-scheduling';
		await request;

		expect((sentConfig?.headers as AxiosHeaders).get('tenant-id')).toBe('captured-tenant');
		expect(sentConfig?.params).toEqual({ include: 'all' });
	});

	it('preserves a captured authorization header only when the scoped request pins it', async () => {
		const service = createService();
		let sentConfig: InternalAxiosRequestConfig | undefined;
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentConfig = config;
		});
		mockCookieState.accessToken = 'cookie-token-a';

		const request = service.get('/captured-auth', {
			headers: { Authorization: 'Bearer captured-token-a' },
			pinnedAuthorization: true
		});
		mockCookieState.accessToken = 'cookie-token-b';
		await request;

		expect((sentConfig?.headers as AxiosHeaders).get('Authorization')).toBe('Bearer captured-token-a');
	});

	it('retains legacy cookie-derived authorization overwrite when a request is not pinned', async () => {
		const service = createService();
		let sentConfig: InternalAxiosRequestConfig | undefined;
		service.axiosInstance.defaults.adapter = captureAdapter((config) => {
			sentConfig = config;
		});
		mockCookieState.accessToken = 'legacy-cookie-token';

		await service.get('/legacy-auth', { headers: { Authorization: 'Bearer legacy-explicit-token' } });

		expect((sentConfig?.headers as AxiosHeaders).get('Authorization')).toBe('Bearer legacy-cookie-token');
	});

	it('relays caller abort through the Axios signal and cleans the request state', async () => {
		const service = createService();
		const pending = createPendingAdapter();
		service.axiosInstance.defaults.adapter = pending.adapter;
		const caller = new AbortController();
		const addListener = jest.spyOn(caller.signal, 'addEventListener');
		const removeListener = jest.spyOn(caller.signal, 'removeEventListener');

		const requestPromise = service.get('/caller-cancel', { signal: caller.signal });
		const request = await pending.nextRequest();
		let callerListenerRemovedBeforeCompositeAbort = false;
		(request.config.signal as AbortSignal).addEventListener(
			'abort',
			() => {
				callerListenerRemovedBeforeCompositeAbort = removeListener.mock.calls.length > 0;
			},
			{ once: true }
		);
		caller.abort('caller changed scope');
		const adapterSawAbort = (request.config.signal as AbortSignal).aborted;
		const adapterAbortReason = (request.config.signal as AbortSignal).reason;
		request.release();
		const outcome = await requestPromise.then(
			() => 'fulfilled',
			() => 'rejected'
		);

		expect(adapterSawAbort).toBe(true);
		expect(adapterAbortReason).toBe('caller changed scope');
		expect(outcome).toBe('rejected');
		expect(callerListenerRemovedBeforeCompositeAbort).toBe(true);
		expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
		expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('relays caller abort through POST and cleans the composed signal listeners', async () => {
		const service = createService();
		const pending = createPendingAdapter();
		service.axiosInstance.defaults.adapter = pending.adapter;
		const caller = new AbortController();
		const removeListener = jest.spyOn(caller.signal, 'removeEventListener');

		const requestPromise = service.post('/caller-cancel', { value: true }, { signal: caller.signal });
		const request = await pending.nextRequest();
		caller.abort('caller changed scope');
		request.release();

		await expect(requestPromise).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		expect((request.config.signal as AbortSignal).aborted).toBe(true);
		expect((request.config.signal as AbortSignal).reason).toBe('caller changed scope');
		expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('cancelRequest aborts only its composed request and never the caller signal', async () => {
		const now = 1_777_000_000_001;
		jest.spyOn(Date, 'now').mockReturnValue(now);
		const service = createService();
		const pending = createPendingAdapter();
		service.axiosInstance.defaults.adapter = pending.adapter;
		const firstCaller = new AbortController();
		const secondCaller = new AbortController();
		const removeFirstListener = jest.spyOn(firstCaller.signal, 'removeEventListener');
		const removeSecondListener = jest.spyOn(secondCaller.signal, 'removeEventListener');

		const firstPromise = service.get('/first', { signal: firstCaller.signal });
		const first = await pending.nextRequest();
		const secondPromise = service.get('/second', { signal: secondCaller.signal });
		const second = await pending.nextRequest();

		service.cancelRequest(`GET:/first:${now}`, 'cancel first only');
		expect((first.config.signal as AbortSignal).aborted).toBe(true);
		expect((first.config.signal as AbortSignal).reason).toBe('cancel first only');
		expect((second.config.signal as AbortSignal).aborted).toBe(false);
		expect(firstCaller.signal.aborted).toBe(false);
		expect(secondCaller.signal.aborted).toBe(false);

		second.release();
		await expect(firstPromise).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		await expect(secondPromise).resolves.toMatchObject({ status: 200 });
		expect(removeFirstListener).toHaveBeenCalledTimes(1);
		expect(removeSecondListener).toHaveBeenCalledTimes(1);
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('cancelAllRequests aborts every composed request without aborting caller signals', async () => {
		const service = createService();
		const pending = createPendingAdapter();
		service.axiosInstance.defaults.adapter = pending.adapter;
		const firstCaller = new AbortController();
		const secondCaller = new AbortController();
		const removeFirstListener = jest.spyOn(firstCaller.signal, 'removeEventListener');
		const removeSecondListener = jest.spyOn(secondCaller.signal, 'removeEventListener');

		const firstPromise = service.get('/all-first', { signal: firstCaller.signal });
		const first = await pending.nextRequest();
		const secondPromise = service.get('/all-second', { signal: secondCaller.signal });
		const second = await pending.nextRequest();

		service.cancelAllRequests('cancel the batch');

		expect((first.config.signal as AbortSignal).aborted).toBe(true);
		expect((second.config.signal as AbortSignal).aborted).toBe(true);
		expect((first.config.signal as AbortSignal).reason).toBe('cancel the batch');
		expect((second.config.signal as AbortSignal).reason).toBe('cancel the batch');
		expect(firstCaller.signal.aborted).toBe(false);
		expect(secondCaller.signal.aborted).toBe(false);
		await expect(firstPromise).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		await expect(secondPromise).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		expect(removeFirstListener).toHaveBeenCalledTimes(1);
		expect(removeSecondListener).toHaveBeenCalledTimes(1);
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('caller abort on one request does not cross-cancel another request', async () => {
		const service = createService();
		const pending = createPendingAdapter();
		service.axiosInstance.defaults.adapter = pending.adapter;
		const firstCaller = new AbortController();
		const secondCaller = new AbortController();

		const firstPromise = service.get('/caller-first', { signal: firstCaller.signal });
		const first = await pending.nextRequest();
		const secondPromise = service.get('/caller-second', { signal: secondCaller.signal });
		const second = await pending.nextRequest();

		firstCaller.abort('first scope changed');

		expect((first.config.signal as AbortSignal).aborted).toBe(true);
		expect((first.config.signal as AbortSignal).reason).toBe('first scope changed');
		expect((second.config.signal as AbortSignal).aborted).toBe(false);
		expect(secondCaller.signal.aborted).toBe(false);
		second.release();
		await expect(firstPromise).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		await expect(secondPromise).resolves.toMatchObject({ status: 200 });
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('removes caller listeners after a successful request settles', async () => {
		const service = createService();
		service.axiosInstance.defaults.adapter = captureAdapter(() => undefined);
		const caller = new AbortController();
		const addListener = jest.spyOn(caller.signal, 'addEventListener');
		const removeListener = jest.spyOn(caller.signal, 'removeEventListener');

		await service.get('/settled', { signal: caller.signal });

		expect(addListener).toHaveBeenCalledTimes(1);
		expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
		expect(removeListener).toHaveBeenCalledTimes(1);
		expect(caller.signal.aborted).toBe(false);
	});

	it('removes caller listeners after the Axios adapter rejects', async () => {
		const service = createService();
		service.axiosInstance.defaults.adapter = async (config) => {
			throw new AxiosError('offline', 'ERR_NETWORK', config);
		};
		const caller = new AbortController();
		const addListener = jest.spyOn(caller.signal, 'addEventListener');
		const removeListener = jest.spyOn(caller.signal, 'removeEventListener');

		await expect(service.get('/rejected', { signal: caller.signal })).rejects.toMatchObject({
			isApiError: true,
			statusCode: 503
		});

		expect(addListener).toHaveBeenCalledTimes(1);
		expect(removeListener).toHaveBeenCalledTimes(1);
		expect(caller.signal.aborted).toBe(false);
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});

	it('synchronously relays a pre-aborted caller without installing listeners or invoking Axios adapter work', async () => {
		const service = createService();
		const adapter = jest.fn(captureAdapter(() => undefined));
		service.axiosInstance.defaults.adapter = adapter;
		const caller = new AbortController();
		const addListener = jest.spyOn(caller.signal, 'addEventListener');
		const removeListener = jest.spyOn(caller.signal, 'removeEventListener');
		caller.abort('already stale');

		const request = service.get('/already-cancelled', { signal: caller.signal });

		await expect(request).rejects.toMatchObject({ isApiError: true, statusCode: 499 });
		expect(adapter).not.toHaveBeenCalled();
		expect(addListener).not.toHaveBeenCalled();
		expect(removeListener).not.toHaveBeenCalled();
		expect(caller.signal.reason).toBe('already stale');
		expect(service.getRequestStats()).toEqual({ activeAbortControllers: 0 });
	});
});
