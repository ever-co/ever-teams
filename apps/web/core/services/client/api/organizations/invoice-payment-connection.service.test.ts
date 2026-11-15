/**
 * `invoicePaymentConnectionService` as the requests leave the client (ever-co/ever-gauzy#11856): the workspace's
 * connection to its payment connector, written with its own fields only (the API refuses any other there, the tenant
 * and organization ids `APIService` adds by default included), and the answers that may hold the signing secret kept
 * out of the development log, in direct mode (the Gauzy API) and in proxy mode (this app's /api routes).
 */
import { InternalAxiosRequestConfig } from 'axios';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'team-1',
	getOrganizationIdCookie: () => 'organization-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/lib/auth/handle-unauthorized', () => ({ handleUnauthorized: jest.fn() }));
jest.mock('@/core/services/logs/logger.service', () => ({
	Logger: { getInstance: () => ({ debug: jest.fn() }) }
}));
jest.mock('@/core/services/logs/logger-adapter.service', () => ({
	HttpLoggerAdapter: jest.fn().mockImplementation(() => ({ logError: jest.fn() }))
}));
// Proxy mode: the requests go through the fallback client this app's /api routes answer.
const mockFallback = { get: jest.fn(), post: jest.fn(), put: jest.fn() };
jest.mock('@/core/services/client/axios', () => ({
	getAPI: async () => ({ axiosInstance: mockFallback })
}));

import { invoicePaymentConnectionService } from './invoice-payment-connection.service';

type SentConfig = InternalAxiosRequestConfig & { secretResponse?: boolean };

const INPUT = { checkoutEndpoint: 'https://connector.example.com/checkout', isEnabled: true, isTestMode: false };
const CONNECTED = {
	connected: true,
	isEnabled: true,
	isTestMode: false,
	checkoutEndpoint: INPUT.checkoutEndpoint,
	notificationUrl: 'https://api.example.test/api/public/invoice-payments/p1/notifications',
	signingSecret: 'signing-secret-1'
};

function setBaseUrl(baseURL: string | undefined): void {
	(invoicePaymentConnectionService as unknown as { baseURL?: string }).baseURL = baseURL;
}

/** Direct mode: every request the client sends, answered with `data`. */
function directRequests(data: unknown): SentConfig[] {
	setBaseUrl('https://api.example.test');
	const sent: SentConfig[] = [];
	invoicePaymentConnectionService.axiosInstance.defaults.adapter = async (config) => {
		sent.push(config);
		return { config, data, headers: {}, status: 200, statusText: 'OK' };
	};
	return sent;
}

const bodyOf = (config: SentConfig | undefined) =>
	config?.data === undefined ? undefined : JSON.parse(String(config.data));

describe('invoicePaymentConnectionService', () => {
	const original = (invoicePaymentConnectionService as unknown as { baseURL?: string }).baseURL;
	afterEach(() => {
		setBaseUrl(original);
		jest.clearAllMocks();
	});

	describe('direct mode', () => {
		it("connects with the connection's fields only, and keeps the answer out of the log", async () => {
			const sent = directRequests(CONNECTED);

			await expect(invoicePaymentConnectionService.connect(INPUT)).resolves.toEqual(CONNECTED);

			expect([sent[0].method, sent[0].url]).toEqual(['put', '/invoice-payments/connection']);
			expect(bodyOf(sent[0])).toEqual(INPUT);
			expect(sent[0].secretResponse).toBe(true);
		});

		it('asks a new signing secret with an empty body, and keeps the answer out of the log', async () => {
			const sent = directRequests(CONNECTED);

			await invoicePaymentConnectionService.rotateSecret();

			expect([sent[0].method, sent[0].url]).toEqual(['post', '/invoice-payments/connection/rotate-secret']);
			expect(bodyOf(sent[0])).toEqual({});
			expect(sent[0].secretResponse).toBe(true);
		});

		it("leaves the caller's input as it was", async () => {
			directRequests(CONNECTED);
			const input = { ...INPUT };

			await invoicePaymentConnectionService.connect(input);

			expect(input).toEqual(INPUT);
		});
	});

	describe('proxy mode', () => {
		beforeEach(() => setBaseUrl(undefined));

		it("sends the same requests to this app's /api routes", async () => {
			mockFallback.put.mockResolvedValue({ data: CONNECTED, status: 200 });
			mockFallback.post.mockResolvedValue({ data: CONNECTED, status: 200 });

			await invoicePaymentConnectionService.connect(INPUT);
			await invoicePaymentConnectionService.rotateSecret();

			expect(mockFallback.put.mock.calls[0].slice(0, 2)).toEqual(['/invoice-payments/connection', INPUT]);
			expect(mockFallback.put.mock.calls[0][2].secretResponse).toBe(true);
			expect(mockFallback.post.mock.calls[0].slice(0, 2)).toEqual([
				'/invoice-payments/connection/rotate-secret',
				{}
			]);
			expect(mockFallback.post.mock.calls[0][2].secretResponse).toBe(true);
		});
	});
});
