/**
 * @jest-environment node
 */
jest.mock('./fetch', () => ({ ...jest.requireActual('./fetch'), serverFetch: jest.fn() }));
jest.mock('./client-ip', () => ({ clientIpHeaders: jest.fn(async () => ({})) }));
jest.mock('@/core/constants/config/constants', () => ({ GAUZY_API_SERVER_URL: 'https://api.example.test/api' }));

import { serverFetch } from './fetch';
import {
	proxyDownloadSharedInvoice,
	proxyInvoiceCheckout,
	proxyInvoicePayOption,
	proxyReadSharedInvoice
} from './public-invoice-proxy';

const fetchGauzy = serverFetch as jest.Mock;
const ID = '0b6e4c2a-1d3f-4e5a-8b7c-9d0e1f2a3b4c';
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IngifQ.c2lnbmF0dXJl';

/** A rejection as serverFetch gives one: Gauzy's error body inside a rejected promise. */
function gauzyRefusal(body: Record<string, unknown>) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('public invoice proxy (ever-co/ever-gauzy#11856)', () => {
	beforeEach(() => fetchGauzy.mockReset());

	it('reads the invoice its link opens, with what the page shows, and keeps no copy', async () => {
		fetchGauzy.mockResolvedValue({ data: { id: ID } });

		const answer = await proxyReadSharedInvoice(ID, TOKEN);

		expect(fetchGauzy).toHaveBeenCalledWith(
			expect.objectContaining({
				path: `/public/invoice/${ID}/${TOKEN}?relations=fromOrganization,organization,toContact,invoiceItems`,
				method: 'GET'
			})
		);
		expect(fetchGauzy.mock.calls[0][0]).not.toHaveProperty('bearer_token');
		expect(answer.status).toBe(200);
		expect(answer.headers.get('Cache-Control')).toBe('no-store');
	});

	it.each([
		['an id that is not one', '../employee', TOKEN],
		['a token that is not one', ID, 'abc/../x']
	])('refuses %s without asking the API', async (_label, id, token) => {
		const answers = await Promise.all([
			proxyReadSharedInvoice(id, token),
			proxyInvoicePayOption(id, token),
			proxyInvoiceCheckout(new Request('https://app.test', { method: 'POST', body: '{}' }), id, token),
			proxyDownloadSharedInvoice(new Request('https://app.test'), id, token)
		]);

		expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400, 400]);
		expect(fetchGauzy).not.toHaveBeenCalled();
	});

	it("passes the API's refusal of a revoked link on as it is", async () => {
		fetchGauzy.mockImplementation(async () => {
			throw gauzyRefusal({ statusCode: 403, message: 'Forbidden' });
		});

		const answer = await proxyInvoicePayOption(ID, TOKEN);

		expect(answer.status).toBe(403);
		expect(answer.headers.get('Cache-Control')).toBe('no-store');
	});

	it('opens the checkout with the return address only', async () => {
		fetchGauzy.mockResolvedValue({ data: { url: 'https://pay.example.com/c/1' } });
		const request = new Request('https://app.test', {
			method: 'POST',
			body: JSON.stringify({ returnUrl: 'https://app.test/shared-invoice/x?paid=1', amount: '0.01' })
		});

		const answer = await proxyInvoiceCheckout(request, ID, TOKEN);

		expect(fetchGauzy).toHaveBeenCalledWith(
			expect.objectContaining({
				path: `/public/invoice-payments/invoice/${ID}/${TOKEN}/checkout`,
				method: 'POST',
				body: { returnUrl: 'https://app.test/shared-invoice/x?paid=1' }
			})
		);
		expect(await answer.json()).toEqual({ url: 'https://pay.example.com/c/1' });
	});
});
