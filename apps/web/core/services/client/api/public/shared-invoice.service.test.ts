/**
 * `sharedInvoiceService` as the requests leave the client (ever-co/ever-gauzy#11856): every address holds the token of
 * the invoice's link, so none goes to a log (`secretAddress`); the checkout is asked with the page to come back to only,
 * never an amount nor the visitor's own workspace; and the page is sent to an https checkout only.
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
jest.mock('@/core/services/client/axios', () => ({ getAPI: jest.fn() }));

import { sharedInvoiceService } from './shared-invoice.service';

type SentConfig = InternalAxiosRequestConfig & { secretAddress?: boolean };

const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const TOKEN = 'test-header.test-payload.test-signature';
const RETURN_URL = 'https://app.ever.team/shared-invoice?paid=1';

/** Direct mode: every request the client sends, answered with `answerOf(config)`. */
function directRequests(answerOf: (config: SentConfig) => unknown): SentConfig[] {
	(sharedInvoiceService as unknown as { baseURL?: string }).baseURL = 'https://api.example.test';
	const sent: SentConfig[] = [];
	sharedInvoiceService.axiosInstance.defaults.adapter = async (config) => {
		sent.push(config);
		return { config, data: answerOf(config), headers: {}, status: 200, statusText: 'OK' };
	};
	return sent;
}

function answerOfRoute(config: SentConfig): unknown {
	const url = config.url ?? '';
	if (url.endsWith('/checkout')) return { url: 'https://pay.example.com/c/1' };
	if (url.startsWith('/public/invoice-payments/')) return { payable: true, amountDue: 1, currency: 'EUR' };
	if (url.endsWith('/download')) return new Blob(['%PDF']);
	return { id: ID, status: 'SENT' };
}

const bodyOf = (config: SentConfig | undefined) =>
	config?.data === undefined ? undefined : JSON.parse(String(config.data));

describe('sharedInvoiceService', () => {
	it('keeps the address of every call, which holds the token, out of the logs', async () => {
		const sent = directRequests(answerOfRoute);

		await sharedInvoiceService.getSharedInvoice(ID, TOKEN);
		await sharedInvoiceService.getPayOption(ID, TOKEN);
		await sharedInvoiceService.downloadSharedInvoicePdf(ID, TOKEN);
		await sharedInvoiceService.startCheckout(ID, TOKEN, RETURN_URL);

		expect(sent.map((config) => config.url)).toEqual([
			`/public/invoice/${ID}/${TOKEN}?relations=fromOrganization,organization,toContact,invoiceItems`,
			`/public/invoice-payments/invoice/${ID}/${TOKEN}`,
			`/public/invoice/${ID}/${TOKEN}/download`,
			`/public/invoice-payments/invoice/${ID}/${TOKEN}/checkout`
		]);
		expect(sent.map((config) => config.secretAddress)).toEqual([true, true, true, true]);
	});

	it('asks the checkout with the page to come back to only: no amount, no workspace of the visitor', async () => {
		const sent = directRequests(answerOfRoute);

		await expect(sharedInvoiceService.startCheckout(ID, TOKEN, RETURN_URL)).resolves.toBe(
			'https://pay.example.com/c/1'
		);

		expect(bodyOf(sent[0])).toEqual({ returnUrl: RETURN_URL });
	});

	it.each([
		['a script address', 'javascript:alert(document.cookie)'],
		['a page without https', 'http://pay.example.com/c/1'],
		['a data address', 'data:text/html,<p>pay</p>']
	])('never sends the page to %s', async (_label, url) => {
		directRequests(() => ({ url }));

		await expect(sharedInvoiceService.startCheckout(ID, TOKEN, RETURN_URL)).rejects.toThrow();
	});
});
