/**
 * Proxy mode twins of Gauzy's invoice routes. Each one first reads the session's own role permissions and is refused
 * here, before Gauzy is asked for an invoice, unless the role reads invoices and client rates: Gauzy's default member
 * role reads invoices, and an invoice states what a client is billed per hour.
 */
import { gauzyUrl, idParams, restoreFetch, signedInRequest } from '@/test/api/forward-to-gauzy';
import { POST as createInvoice } from './route';
import { GET as listInvoices } from './pagination/route';
import { GET as readHighestNumber } from './highest/route';
import { GET as downloadInvoice } from './download/[id]/route';
import { PUT as emailInvoice } from './email/[email]/route';
import { PUT as changeInvoiceStatus } from './[id]/action/route';
import { DELETE as deleteInvoice } from './[id]/route';

const ORIGIN = 'https://app.ever.team';

const ADMIN = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

/** What Gauzy grants its member role by default: invoices, and no client rate. */
const MEMBER = ['INVOICES_VIEW', 'INVOICES_EDIT', 'TIME_TRACKER', 'ORG_CONTACT_VIEW'];

/** Edits invoices without reading everyone's time: it may change one, not create one. */
const EDITOR = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT'];

const READ_ONLY = ['INVOICES_VIEW', 'ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];

const invoiceBody = { id: 'inv-1', invoiceNumber: 13, currency: 'USD', organizationId: 'org-1', tenantId: 'tenant-1' };

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function permissionRows(permissions: string[]) {
	return permissions.map((permission) => ({ permission, enabled: true }));
}

/** Gauzy answers the permissions read first, then the forwarded call. */
function gauzyAnswersInOrder(...answers: Response[]) {
	const fetchMock = jest.fn();
	for (const answer of answers) {
		fetchMock.mockResolvedValueOnce(answer);
	}
	global.fetch = fetchMock;
	return fetchMock;
}

function callOf(fetchMock: jest.Mock, index: number) {
	const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
	return { url, method: init.method, body: init.body };
}

afterEach(restoreFetch);

describe('GET /api/invoices/pagination', () => {
	it('forwards the page of invoices asked for to a role that reads invoices and client rates', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({ items: [], total: 0 }));
		const query = '?where%5BisEstimate%5D=false&relations%5B0%5D=toContact&take=50&skip=1';
		const request = signedInRequest(`${ORIGIN}/api/invoices/pagination${query}`);

		const response = await listInvoices(request);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(callOf(fetchMock, 0).url).toBe(gauzyUrl('/role-permissions/me'));
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl(`/invoices/pagination${query}`));
		expect(callOf(fetchMock, 1).method).toBe('GET');
		await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
	});

	it('refuses a member, who reads invoices on Gauzy but no client rate, without asking for an invoice', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/pagination`);

		const response = await listInvoices(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not count a permission the role holds switched off', async () => {
		const rows = [...permissionRows(['INVOICES_VIEW']), { permission: 'ORG_EMPLOYEES_EDIT', enabled: false }];
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(rows));
		const request = signedInRequest(`${ORIGIN}/api/invoices/pagination`);

		const response = await listInvoices(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('answers 401 without a session, and calls nothing', async () => {
		const fetchMock = gauzyAnswersInOrder();
		const request = new Request(`${ORIGIN}/api/invoices/pagination`);

		const response = await listInvoices(request);

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('passes on the refusal of the permissions read, such as an expired session', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer({ statusCode: 401, message: 'Unauthorized' }, 401));
		const request = signedInRequest(`${ORIGIN}/api/invoices/pagination`);

		const response = await listInvoices(request);

		expect(response.status).toBe(401);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('GET /api/invoices/highest', () => {
	it('forwards the highest invoice number to a role that reads invoices and client rates', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({ max: '12' }));
		const request = signedInRequest(`${ORIGIN}/api/invoices/highest`);

		const response = await readHighestNumber(request);

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/highest'));
		await expect(response.json()).resolves.toEqual({ max: '12' });
	});

	it('refuses a member', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/highest`);

		const response = await readHighestNumber(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('POST /api/invoices', () => {
	it('creates the invoice for a role that edits invoices and reads everyone’s time', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({ id: 'inv-1' }, 201));
		const request = signedInRequest(`${ORIGIN}/api/invoices`, 'POST', invoiceBody);

		const response = await createInvoice(request);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices'));
		expect(callOf(fetchMock, 1).method).toBe('POST');
		expect(JSON.parse(callOf(fetchMock, 1).body as string)).toEqual(invoiceBody);
		expect(response.status).toBe(201);
	});

	it('refuses a member without asking Gauzy to write', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices`, 'POST', invoiceBody);

		const response = await createInvoice(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refuses a role that reads the invoices but may not edit them', async () => {
		const readOnly = ['INVOICES_VIEW', 'ORG_EMPLOYEES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'];
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(readOnly)));
		const request = signedInRequest(`${ORIGIN}/api/invoices`, 'POST', invoiceBody);

		const response = await createInvoice(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refuses a role that cannot read everyone’s time: its invoice would hold its own time only', async () => {
		const ownTimeOnly = ['INVOICES_VIEW', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT'];
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ownTimeOnly)));
		const request = signedInRequest(`${ORIGIN}/api/invoices`, 'POST', invoiceBody);

		const response = await createInvoice(request);

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('GET /api/invoices/download/:id', () => {
	it('hands the PDF on as Gauzy answers it', async () => {
		const pdf = new Response('%PDF-1.3', { status: 202, headers: { 'Content-Type': 'application/pdf' } });
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), pdf);
		const request = signedInRequest(`${ORIGIN}/api/invoices/download/inv-1`);

		const response = await downloadInvoice(request, idParams('inv-1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/download/inv-1'));
		expect(callOf(fetchMock, 1).method).toBe('GET');
		expect(response.status).toBe(202);
		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		await expect(response.text()).resolves.toBe('%PDF-1.3');
	});

	it('refuses a member', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/download/inv-1`);

		const response = await downloadInvoice(request, idParams('inv-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('keeps an id that looks like a path inside its own segment', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(ADMIN)), jsonAnswer({}, 404));
		const request = signedInRequest(`${ORIGIN}/api/invoices/download/x`);

		await downloadInvoice(request, idParams('../employee'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/download/..%2Femployee'));
	});
});

function emailParams(email: string) {
	return { params: Promise.resolve({ email }) };
}

/** Gauzy's e-mail route answers 202 and no body, whatever its mail server did. */
function acceptedAnswer() {
	return new Response(null, { status: 202 });
}

describe('PUT /api/invoices/email/:email', () => {
	const sendBody = {
		params: {
			invoiceNumber: 42,
			invoiceId: 'inv-1',
			isEstimate: false,
			organizationId: 'org-1',
			tenantId: 'tenant-1'
		}
	};

	it('e-mails the invoice for a role that edits invoices, and answers as Gauzy does', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)), acceptedAnswer());
		const request = signedInRequest(`${ORIGIN}/api/invoices/email/billing%40acme.test`, 'PUT', sendBody);

		const response = await emailInvoice(request, emailParams('billing@acme.test'));

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/email/billing%40acme.test'));
		expect(callOf(fetchMock, 1).method).toBe('PUT');
		expect(JSON.parse(callOf(fetchMock, 1).body as string)).toEqual(sendBody);
		expect(response.status).toBe(202);
	});

	it('refuses a member without asking Gauzy to send anything', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/email/billing%40acme.test`, 'PUT', sendBody);

		const response = await emailInvoice(request, emailParams('billing@acme.test'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refuses a role that reads the invoices but may not edit them', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(READ_ONLY)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/email/billing%40acme.test`, 'PUT', sendBody);

		const response = await emailInvoice(request, emailParams('billing@acme.test'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('keeps an address that looks like a path inside its own segment', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)), acceptedAnswer());
		const request = signedInRequest(`${ORIGIN}/api/invoices/email/x`, 'PUT', sendBody);

		await emailInvoice(request, emailParams('../employee'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/email/..%2Femployee'));
	});
});

describe('PUT /api/invoices/:id/action', () => {
	const paid = { status: 'FULLY_PAID', paid: true, alreadyPaid: 1080, amountDue: 0 };

	it('changes the invoice for a role that edits invoices', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)), jsonAnswer({ id: 'inv-1' }, 202));
		const request = signedInRequest(`${ORIGIN}/api/invoices/inv-1/action`, 'PUT', paid);

		const response = await changeInvoiceStatus(request, idParams('inv-1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/inv-1/action'));
		expect(callOf(fetchMock, 1).method).toBe('PUT');
		expect(JSON.parse(callOf(fetchMock, 1).body as string)).toEqual(paid);
		expect(response.status).toBe(202);
	});

	it('refuses a member without asking Gauzy to write', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/inv-1/action`, 'PUT', paid);

		const response = await changeInvoiceStatus(request, idParams('inv-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refuses a role that reads the invoices but may not edit them', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(READ_ONLY)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/inv-1/action`, 'PUT', paid);

		const response = await changeInvoiceStatus(request, idParams('inv-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('keeps an id that looks like a path inside its own segment', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)), jsonAnswer({}, 404));
		const request = signedInRequest(`${ORIGIN}/api/invoices/x/action`, 'PUT', paid);

		await changeInvoiceStatus(request, idParams('../employee'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/..%2Femployee/action'));
	});
});

describe('DELETE /api/invoices/:id', () => {
	it('deletes the invoice for a role that edits invoices', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(EDITOR)), jsonAnswer({ affected: 1 }, 202));
		const request = signedInRequest(`${ORIGIN}/api/invoices/inv-1`, 'DELETE');

		const response = await deleteInvoice(request, idParams('inv-1'));

		expect(callOf(fetchMock, 1).url).toBe(gauzyUrl('/invoices/inv-1'));
		expect(callOf(fetchMock, 1).method).toBe('DELETE');
		expect(response.status).toBe(202);
	});

	it('refuses a member without asking Gauzy to delete anything', async () => {
		const fetchMock = gauzyAnswersInOrder(jsonAnswer(permissionRows(MEMBER)));
		const request = signedInRequest(`${ORIGIN}/api/invoices/inv-1`, 'DELETE');

		const response = await deleteInvoice(request, idParams('inv-1'));

		expect(response.status).toBe(403);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
