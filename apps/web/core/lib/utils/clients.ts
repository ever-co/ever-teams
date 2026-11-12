import { isEmail } from 'class-validator';

export const CLIENT_CONTACT_TYPE = 'CLIENT';

/** The permissions the API asks for on each write of a client, any one of them being enough. */
export const CLIENT_CREATE_PERMISSIONS = ['ORG_CONTACT_ADD', 'ORG_CONTACT_EDIT'] as const;
export const CLIENT_EDIT_PERMISSIONS = ['ORG_CONTACT_EDIT'] as const;
export const CLIENT_ARCHIVE_PERMISSIONS = ['ORG_CONTACT_DELETE', 'ORG_CONTACT_EDIT'] as const;

export const CLIENT_NAME_MAX_LENGTH = 255;
export const CLIENT_PHONE_MAX_LENGTH = 50;
export const CLIENT_NOTES_MAX_LENGTH = 2000;

export type ClientScope = 'active' | 'archived';

export interface ClientLike {
	id: string;
	name: string;
	primaryEmail?: string | null;
	primaryPhone?: string | null;
	notes?: string | null;
	contactId?: string | null;
	deletedAt?: string | null;
}

export interface ClientAccess {
	canCreate: boolean;
	canEdit: boolean;
	canArchive: boolean;
}

export function holdsAnyPermission(held: readonly string[], wanted: readonly string[]) {
	return wanted.some((permission) => held.includes(permission));
}

export function clientAccessOf(permissions: readonly string[]): ClientAccess {
	return {
		canCreate: holdsAnyPermission(permissions, CLIENT_CREATE_PERMISSIONS),
		canEdit: holdsAnyPermission(permissions, CLIENT_EDIT_PERMISSIONS),
		canArchive: holdsAnyPermission(permissions, CLIENT_ARCHIVE_PERMISSIONS)
	};
}

/** An archived client is a withdrawn one: the API keeps the row and stamps the day it was withdrawn. */
export function isArchivedClient(client: Pick<ClientLike, 'deletedAt'>) {
	return Boolean(client.deletedAt);
}

export function activeClientsOf<T extends ClientLike>(clients: T[]) {
	return clients.filter((client) => !isArchivedClient(client));
}

export function archivedClientsOf<T extends ClientLike>(clients: T[]) {
	return clients.filter((client) => isArchivedClient(client));
}

export function clientsInScope<T extends ClientLike>(clients: T[], scope: ClientScope) {
	if (scope === 'archived') {
		return archivedClientsOf(clients);
	}
	return activeClientsOf(clients);
}

function includesNeedle(value: string | null | undefined, needle: string) {
	if (!value) {
		return false;
	}
	return value.toLocaleLowerCase().includes(needle);
}

export function clientMatchesSearch(client: ClientLike, term: string) {
	const needle = term.trim().toLocaleLowerCase();
	if (!needle) {
		return true;
	}
	const nameMatches = includesNeedle(client.name, needle);
	const emailMatches = includesNeedle(client.primaryEmail, needle);
	const phoneMatches = includesNeedle(client.primaryPhone, needle);
	return nameMatches || emailMatches || phoneMatches;
}

export function sortClientsByName<T extends ClientLike>(clients: T[]) {
	const sorted = [...clients];
	sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	return sorted;
}

export function clientsById<T extends ClientLike>(clients: T[]) {
	const byId = new Map<string, T>();
	for (const client of clients) {
		byId.set(client.id, client);
	}
	return byId;
}

interface ProjectOfClient {
	organizationContactId?: string | null;
}

/** How many of the given projects each client has; a client without a project is absent from the map. */
export function projectCountByClient(projects: ProjectOfClient[]) {
	const counts = new Map<string, number>();
	for (const project of projects) {
		const clientId = project.organizationContactId;
		if (!clientId) {
			continue;
		}
		const current = counts.get(clientId) ?? 0;
		counts.set(clientId, current + 1);
	}
	return counts;
}

/** What is known of the client list a picker offers: a name can be told new only against a list that was read. */
export type ClientListState = 'loading' | 'failed' | 'ready';

export function clientListStateOf(isLoaded: boolean, hasFailed: boolean): ClientListState {
	if (isLoaded) {
		return 'ready';
	}
	if (hasFailed) {
		return 'failed';
	}
	return 'loading';
}

export function hasClientNamed(clients: ClientLike[], name: string) {
	const wanted = name.trim().toLocaleLowerCase();
	if (!wanted) {
		return false;
	}
	return clients.some((client) => client.name.trim().toLocaleLowerCase() === wanted);
}

export interface ClientDraft {
	name: string;
	primaryEmail: string;
	primaryPhone: string;
	notes: string;
}

export type ClientDraftErrorKey = 'name' | 'primaryEmail';

export type ClientDraftError = 'nameRequired' | 'emailInvalid';

export type ClientDraftErrors = Partial<Record<ClientDraftErrorKey, ClientDraftError>>;

export function emptyClientDraft(name = ''): ClientDraft {
	return { name, primaryEmail: '', primaryPhone: '', notes: '' };
}

export function draftFromClient(client: ClientLike): ClientDraft {
	return {
		name: client.name,
		primaryEmail: client.primaryEmail ?? '',
		primaryPhone: client.primaryPhone ?? '',
		notes: client.notes ?? ''
	};
}

export function validateClientDraft(draft: ClientDraft): ClientDraftErrors {
	const errors: ClientDraftErrors = {};
	const name = draft.name.trim();
	if (!name) {
		errors.name = 'nameRequired';
	}
	const email = draft.primaryEmail.trim();
	const hasEmail = email.length > 0;
	const isEmailInvalid = hasEmail && !isEmail(email);
	if (isEmailInvalid) {
		errors.primaryEmail = 'emailInvalid';
	}
	return errors;
}

export function hasClientDraftErrors(errors: ClientDraftErrors) {
	return Object.keys(errors).length > 0;
}

/** The API reads an empty text as a value to validate, so a field left empty is sent as null. */
function textOrNull(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed;
}

export interface ClientRequestScope {
	organizationId: string;
	tenantId: string;
}

export interface ClientRequest extends ClientRequestScope {
	name: string;
	primaryEmail: string | null;
	primaryPhone: string | null;
	notes: string | null;
	contactType: typeof CLIENT_CONTACT_TYPE;
	contact?: { id: string };
}

export function buildClientRequest(draft: ClientDraft, scope: ClientRequestScope): ClientRequest {
	return {
		name: draft.name.trim(),
		primaryEmail: textOrNull(draft.primaryEmail),
		primaryPhone: textOrNull(draft.primaryPhone),
		notes: textOrNull(draft.notes),
		contactType: CLIENT_CONTACT_TYPE,
		organizationId: scope.organizationId,
		tenantId: scope.tenantId
	};
}

/**
 * An update without the client's contact details makes the API create empty ones and link them in place of the
 * stored ones (address, website), so the stored details are named and stay linked.
 */
export function buildClientUpdateRequest(
	draft: ClientDraft,
	scope: ClientRequestScope,
	client: Pick<ClientLike, 'contactId'>
): ClientRequest {
	const request = buildClientRequest(draft, scope);
	if (client.contactId) {
		request.contact = { id: client.contactId };
	}
	return request;
}
