import { ApiErrorService } from './api-error.service';

function axiosError({
	code,
	message = 'Request failed',
	responseStatus,
	status
}: {
	code?: string;
	message?: string;
	responseStatus?: number;
	status?: number;
}) {
	return {
		code,
		message,
		status,
		...(responseStatus === undefined
			? {}
			: {
					response: {
						data: {},
						headers: {},
						status: responseStatus,
						statusText: 'Error'
					}
				})
	};
}

describe('ApiErrorService HTTP response provenance', () => {
	it.each([404, 405, 501])('classifies a genuine HTTP %i response as endpoint unavailable', (responseStatus) => {
		const error = ApiErrorService.fromAxiosError(axiosError({ responseStatus }));

		expect(error.statusCode).toBe(responseStatus);
		expect(error.httpResponseStatus).toBe(responseStatus);
		expect(error.hasHttpResponseStatus(responseStatus)).toBe(true);
		expect(error.isEndpointUnavailable()).toBe(true);
	});

	it.each([400, 401, 403, 409, 422, 429, 500, 502, 503, 504])(
		'does not classify a genuine HTTP %i response as endpoint unavailable',
		(responseStatus) => {
			const error = ApiErrorService.fromAxiosError(axiosError({ responseStatus }));

			expect(error.statusCode).toBe(responseStatus);
			expect(error.httpResponseStatus).toBe(responseStatus);
			expect(error.hasHttpResponseStatus(404, 405, 501)).toBe(false);
			expect(error.isEndpointUnavailable()).toBe(false);
		}
	);

	it.each([
		['synthetic status', axiosError({ status: 404 }), 404],
		['message-derived 404', axiosError({ message: 'Request failed with HTTP 404' }), 404],
		['message-derived 405', axiosError({ message: 'Request failed with HTTP 405' }), 405],
		['message-derived 501', axiosError({ message: 'Request failed with HTTP 501' }), 501],
		['raw statusCode', { message: 'Request failed', statusCode: 404 }, 500],
		[
			'raw response.statusCode',
			{
				message: 'Request failed',
				response: { data: {}, headers: {}, statusCode: 501, statusText: 'Error' }
			},
			500
		],
		['ERR_BAD_REQUEST mapping', axiosError({ code: 'ERR_BAD_REQUEST' }), 404],
		['ERR_NOT_SUPPORT mapping', axiosError({ code: 'ERR_NOT_SUPPORT' }), 501],
		['network error', axiosError({ code: 'ERR_NETWORK' }), 503],
		['cancellation', axiosError({ code: 'ERR_CANCELED' }), 499],
		['aborted timeout', axiosError({ code: 'ECONNABORTED' }), 408],
		['elapsed timeout', axiosError({ code: 'ETIMEDOUT' }), 504]
	])('does not treat %s as HTTP response provenance', (_label, source, legacyStatusCode) => {
		const error = ApiErrorService.fromAxiosError(source);

		expect(error.statusCode).toBe(legacyStatusCode);
		expect(error.httpResponseStatus).toBeUndefined();
		expect(error.hasHttpResponseStatus(legacyStatusCode)).toBe(false);
		expect(error.isEndpointUnavailable()).toBe(false);
	});

	it('preserves the established transformed error shape and identity', () => {
		const before = Date.now();
		const error = ApiErrorService.fromAxiosError({
			message: 'Axios request failed',
			response: {
				data: {
					code: 'INVALID_SCOPE',
					details: { tenantId: 'tenant-1' },
					message: 'Scope is invalid'
				},
				headers: {},
				status: 422,
				statusText: 'Unprocessable Entity'
			}
		});

		expect(error).toBeInstanceOf(ApiErrorService);
		expect(error.name).toBe('ApiError');
		expect(error.message).toBe('Scope is invalid');
		expect(error.statusCode).toBe(422);
		expect(error.errorCode).toBe('INVALID_SCOPE');
		expect(error.details).toEqual({ tenantId: 'tenant-1' });
		expect(error.timestamp).toBeInstanceOf(Date);
		expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before);
		expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
		expect(error.isApiError).toBe(true);
		expect(ApiErrorService.isApiError(error)).toBe(true);
	});

	it('uses response.status for provenance when the legacy synthetic status conflicts', () => {
		const unavailableResponse = ApiErrorService.fromAxiosError(axiosError({ status: 500, responseStatus: 404 }));
		const availableResponse = ApiErrorService.fromAxiosError(axiosError({ status: 404, responseStatus: 500 }));

		// Legacy statusCode precedence remains untouched; only provenance follows response.status.
		expect(unavailableResponse.statusCode).toBe(500);
		expect(unavailableResponse.httpResponseStatus).toBe(404);
		expect(unavailableResponse.hasHttpResponseStatus(404)).toBe(true);
		expect(unavailableResponse.isEndpointUnavailable()).toBe(true);
		expect(availableResponse.statusCode).toBe(404);
		expect(availableResponse.httpResponseStatus).toBe(500);
		expect(availableResponse.hasHttpResponseStatus(404)).toBe(false);
		expect(availableResponse.isEndpointUnavailable()).toBe(false);
	});

	it('does not let direct construction or extra runtime arguments forge HTTP response provenance', () => {
		const error = Reflect.construct(ApiErrorService, [
			'legacy caller',
			404,
			undefined,
			undefined,
			404
		]) as ApiErrorService;

		expect(error.statusCode).toBe(404);
		expect(error.httpResponseStatus).toBeUndefined();
		expect(error.hasHttpResponseStatus(404)).toBe(false);
		expect(error.isEndpointUnavailable()).toBe(false);
	});

	it('does not let runtime properties forge endpoint-unavailable provenance', () => {
		const legacyPrivateName = new ApiErrorService('legacy private field name', 404);
		Reflect.set(legacyPrivateName, '_httpResponseStatus', 404);
		expect((legacyPrivateName as any)._httpResponseStatus).toBe(404);
		expect(legacyPrivateName.hasHttpResponseStatus(404)).toBe(false);
		expect(legacyPrivateName.isEndpointUnavailable()).toBe(false);

		const publicGetterName = new ApiErrorService('public getter name', 404);
		Object.defineProperty(publicGetterName, 'httpResponseStatus', {
			configurable: true,
			value: 405,
			writable: true
		});
		Reflect.set(publicGetterName, 'httpResponseStatus', 501);
		expect((publicGetterName as any).httpResponseStatus).toBe(501);
		expect(publicGetterName.hasHttpResponseStatus(404, 405, 501)).toBe(false);
		expect(publicGetterName.isEndpointUnavailable()).toBe(false);

		const rawProperties = new ApiErrorService('raw properties', 500);
		Object.assign(rawProperties, {
			response: { status: 404 },
			responseStatus: 405,
			status: 501,
			statusCode: 404
		});
		expect(rawProperties.hasHttpResponseStatus(404, 405, 501)).toBe(false);
		expect(rawProperties.isEndpointUnavailable()).toBe(false);
	});
});
