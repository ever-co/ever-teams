import {
	activeClientsOf,
	archivedClientsOf,
	buildClientRequest,
	buildClientUpdateRequest,
	clientAccessOf,
	clientMatchesSearch,
	clientsInScope,
	draftFromClient,
	emptyClientDraft,
	hasClientDraftErrors,
	hasClientNamed,
	holdsAnyPermission,
	isArchivedClient,
	listReadStateOf,
	projectCountByClient,
	sortClientsByName,
	validateClientDraft,
	type ClientLike
} from './clients';

const acme: ClientLike = { id: 'c1', name: 'Acme', primaryEmail: 'billing@acme.io', primaryPhone: '+33 1 02 03' };
const zenith: ClientLike = { id: 'c2', name: 'zenith', deletedAt: '2026-11-01T10:00:00.000Z' };
const borealis: ClientLike = { id: 'c3', name: 'Borealis', primaryEmail: null, deletedAt: null };

const scope = { organizationId: 'org-1', tenantId: 'tenant-1' };

describe('client permissions', () => {
	it('needs one of the wanted permissions', () => {
		expect(holdsAnyPermission(['A', 'B'], ['B', 'C'])).toBe(true);
		expect(holdsAnyPermission(['A'], ['B', 'C'])).toBe(false);
		expect(holdsAnyPermission([], ['B'])).toBe(false);
	});

	it('lets a holder of the edit permission create, edit, archive and restore', () => {
		expect(clientAccessOf(['ORG_CONTACT_EDIT'])).toEqual({ canCreate: true, canEdit: true, canArchive: true });
	});

	it('lets a holder of the add permission create only', () => {
		expect(clientAccessOf(['ORG_CONTACT_ADD'])).toEqual({ canCreate: true, canEdit: false, canArchive: false });
	});

	it('lets a holder of the delete permission archive and restore only', () => {
		expect(clientAccessOf(['ORG_CONTACT_DELETE'])).toEqual({ canCreate: false, canEdit: false, canArchive: true });
	});

	it('offers nothing to a member who can only view clients, or whose permissions are not read yet', () => {
		const nothing = { canCreate: false, canEdit: false, canArchive: false };
		expect(clientAccessOf(['ORG_CONTACT_VIEW', 'ORG_PROJECT_VIEW'])).toEqual(nothing);
		expect(clientAccessOf([])).toEqual(nothing);
	});
});

describe('client scopes', () => {
	const clients = [acme, zenith, borealis];

	it('reads a withdrawn client as archived', () => {
		expect(isArchivedClient(zenith)).toBe(true);
		expect(isArchivedClient(acme)).toBe(false);
		expect(isArchivedClient(borealis)).toBe(false);
	});

	it('splits active and archived clients', () => {
		expect(activeClientsOf(clients)).toEqual([acme, borealis]);
		expect(archivedClientsOf(clients)).toEqual([zenith]);
		expect(clientsInScope(clients, 'active')).toEqual([acme, borealis]);
		expect(clientsInScope(clients, 'archived')).toEqual([zenith]);
	});
});

describe('client search and order', () => {
	it('matches the name, the email and the phone, whatever the case', () => {
		expect(clientMatchesSearch(acme, ' ACM ')).toBe(true);
		expect(clientMatchesSearch(acme, 'billing@')).toBe(true);
		expect(clientMatchesSearch(acme, '02 03')).toBe(true);
		expect(clientMatchesSearch(acme, 'zen')).toBe(false);
		expect(clientMatchesSearch(borealis, 'billing')).toBe(false);
	});

	it('keeps every client for an empty search', () => {
		expect(clientMatchesSearch(borealis, '   ')).toBe(true);
	});

	it('sorts by name without minding the case, and leaves the given list as it was', () => {
		const clients = [zenith, borealis, acme];
		expect(sortClientsByName(clients).map((client) => client.name)).toEqual(['Acme', 'Borealis', 'zenith']);
		expect(clients[0]).toBe(zenith);
	});

	it('finds a client by its exact name, whatever the case and the spaces around', () => {
		expect(hasClientNamed([acme, zenith], ' acme ')).toBe(true);
		expect(hasClientNamed([acme, zenith], 'Acm')).toBe(false);
		expect(hasClientNamed([acme], '  ')).toBe(false);
	});
});

describe('the read state of a list', () => {
	it('is loading until the list arrives or fails', () => {
		expect(listReadStateOf(false, false)).toBe('loading');
	});

	it('is failed when the list never arrived', () => {
		expect(listReadStateOf(false, true)).toBe('failed');
	});

	it('is ready once the list arrived, even when reading it again failed since', () => {
		expect(listReadStateOf(true, false)).toBe('ready');
		expect(listReadStateOf(true, true)).toBe('ready');
	});
});

describe('project count by client', () => {
	it('counts the projects of each client and skips the projects without one', () => {
		const counts = projectCountByClient([
			{ organizationContactId: 'c1' },
			{ organizationContactId: 'c1' },
			{ organizationContactId: 'c2' },
			{ organizationContactId: null },
			{}
		]);
		expect(counts.get('c1')).toBe(2);
		expect(counts.get('c2')).toBe(1);
		expect(counts.has('c3')).toBe(false);
		expect(counts.size).toBe(2);
	});
});

describe('client draft', () => {
	it('starts empty, or with the name typed in the project form', () => {
		expect(emptyClientDraft()).toEqual({ name: '', primaryEmail: '', primaryPhone: '', notes: '' });
		expect(emptyClientDraft('Acme').name).toBe('Acme');
	});

	it('reads a stored client, null fields as empty text', () => {
		expect(draftFromClient(borealis)).toEqual({ name: 'Borealis', primaryEmail: '', primaryPhone: '', notes: '' });
	});

	it('requires a name', () => {
		const errors = validateClientDraft(emptyClientDraft('   '));
		expect(errors).toEqual({ name: 'nameRequired' });
		expect(hasClientDraftErrors(errors)).toBe(true);
	});

	it('accepts an empty email and refuses a malformed one', () => {
		const valid = validateClientDraft({ ...emptyClientDraft('Acme'), primaryEmail: ' billing@acme.io ' });
		const empty = validateClientDraft(emptyClientDraft('Acme'));
		const invalid = validateClientDraft({ ...emptyClientDraft('Acme'), primaryEmail: 'billing@' });
		expect(hasClientDraftErrors(valid)).toBe(false);
		expect(hasClientDraftErrors(empty)).toBe(false);
		expect(invalid).toEqual({ primaryEmail: 'emailInvalid' });
	});

	it.each(['alex+invoices@example.com', 'alex@example.technology', 'billing@acme.agency'])(
		'accepts the email %s, as the API does',
		(primaryEmail) => {
			const errors = validateClientDraft({ ...emptyClientDraft('Acme'), primaryEmail });
			expect(errors).toEqual({});
		}
	);
});

describe('client request', () => {
	it('trims the texts, sends empty contact details as null and types the contact as a client', () => {
		const request = buildClientRequest(
			{ name: '  Acme  ', primaryEmail: ' billing@acme.io ', primaryPhone: '  ', notes: '' },
			scope
		);
		expect(request).toEqual({
			name: 'Acme',
			primaryEmail: 'billing@acme.io',
			primaryPhone: null,
			notes: null,
			contactType: 'CLIENT',
			organizationId: 'org-1',
			tenantId: 'tenant-1'
		});
	});

	it('names the stored contact details on an update, so they stay linked', () => {
		const request = buildClientUpdateRequest(emptyClientDraft('Acme'), scope, { contactId: 'contact-9' });
		expect(request.contact).toEqual({ id: 'contact-9' });
	});

	it('leaves the contact details out of an update when the client has none', () => {
		const request = buildClientUpdateRequest(emptyClientDraft('Acme'), scope, { contactId: null });
		expect(request).not.toHaveProperty('contact');
	});
});
