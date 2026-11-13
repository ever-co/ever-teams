import { isEmail } from 'class-validator';
import { clientIdOf, compareWithUnsetLast, realDateOf } from './project-list';

export const CLIENT_CONTACT_TYPE = 'CLIENT';

/** The permissions the API asks for on each write of a client, any one of them being enough. */
export const CLIENT_CREATE_PERMISSIONS = ['ORG_CONTACT_ADD', 'ORG_CONTACT_EDIT'] as const;
export const CLIENT_EDIT_PERMISSIONS = ['ORG_CONTACT_EDIT'] as const;
export const CLIENT_ARCHIVE_PERMISSIONS = ['ORG_CONTACT_DELETE', 'ORG_CONTACT_EDIT'] as const;
/** The permission the API asks for to list the clients. */
export const CLIENT_VIEW_PERMISSIONS = ['ORG_CONTACT_VIEW'] as const;

export const CLIENT_NAME_MAX_LENGTH = 255;
export const CLIENT_PHONE_MAX_LENGTH = 50;
export const CLIENT_NOTES_MAX_LENGTH = 2000;
export const CLIENT_TERMS_MAX_DAYS = 365;

export const CLIENTS_PATH = '/clients';

export type ClientScope = 'active' | 'archived';

export interface ClientLike {
	id: string;
	name: string;
	primaryEmail?: string | null;
	primaryPhone?: string | null;
	notes?: string | null;
	contactId?: string | null;
	deletedAt?: string | null;
	createdAt?: string | null;
	/** Days a new invoice of the client is given before it is due; absent or null, the workspace's terms apply. */
	paymentTermsDays?: number | null;
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

/**
 * Whether the role may read the clients at all: the API refuses the list to a role without it, which the page says
 * in plain words instead of blaming the connection.
 */
export function canViewClients(permissions: readonly string[]) {
	return holdsAnyPermission(permissions, CLIENT_VIEW_PERMISSIONS);
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

type ProjectOfClient = Parameters<typeof clientIdOf>[0];

/**
 * How many of the given projects each client has; a client without a project is absent from the map. A project's
 * client is read as the projects filter reads it, so a count and the list its link opens hold the same projects.
 */
export function projectCountByClient(projects: ProjectOfClient[]) {
	const counts = new Map<string, number>();
	for (const project of projects) {
		const clientId = clientIdOf(project);
		if (!clientId) {
			continue;
		}
		const current = counts.get(clientId) ?? 0;
		counts.set(clientId, current + 1);
	}
	return counts;
}

/**
 * What is known of a list read from the API. Nothing is concluded from a list that did not arrive: a name is told
 * new, and a number of projects is written, only against a list that was read.
 */
export type ListReadState = 'loading' | 'failed' | 'ready';

export function listReadStateOf(isLoaded: boolean, hasFailed: boolean): ListReadState {
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
	/** Null asks for the workspace's terms; absent leaves the saved terms as they are. */
	paymentTermsDays?: number | null;
}

export type ClientDraftErrorKey = 'name' | 'primaryEmail' | 'paymentTermsDays';

export type ClientDraftError = 'nameRequired' | 'emailInvalid' | 'termsInvalid';

export type ClientDraftErrors = Partial<Record<ClientDraftErrorKey, ClientDraftError>>;

export function emptyClientDraft(name = ''): ClientDraft {
	return { name, primaryEmail: '', primaryPhone: '', notes: '' };
}

export function draftFromClient(client: ClientLike): ClientDraft {
	const draft: ClientDraft = {
		name: client.name,
		primaryEmail: client.primaryEmail ?? '',
		primaryPhone: client.primaryPhone ?? '',
		notes: client.notes ?? ''
	};
	const savedTermsDays = client.paymentTermsDays;
	if (typeof savedTermsDays === 'number') {
		draft.paymentTermsDays = savedTermsDays;
	}
	return draft;
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
	/** Sent only when it says something: set on a new client, changed on a saved one, where null clears it. */
	paymentTermsDays?: number | null;
}

function baseClientRequest(draft: ClientDraft, scope: ClientRequestScope): ClientRequest {
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

export function buildClientRequest(draft: ClientDraft, scope: ClientRequestScope): ClientRequest {
	const request = baseClientRequest(draft, scope);
	const termsDays = draft.paymentTermsDays;
	const hasOwnTerms = typeof termsDays === 'number';
	if (hasOwnTerms) {
		request.paymentTermsDays = termsDays;
	}
	return request;
}

function changedTermsDaysOf(draftDays: number | null | undefined, savedDays: number | null | undefined) {
	if (draftDays === undefined) {
		return undefined;
	}
	const saved = savedDays ?? null;
	const isUnchanged = draftDays === saved;
	if (isUnchanged) {
		return undefined;
	}
	return draftDays;
}

/**
 * An update without the client's contact details makes the API create empty ones and link them in place of the
 * stored ones (address, website), so the stored details are named and stay linked.
 */
export function buildClientUpdateRequest(
	draft: ClientDraft,
	scope: ClientRequestScope,
	client: Pick<ClientLike, 'contactId' | 'paymentTermsDays'>
): ClientRequest {
	const request = baseClientRequest(draft, scope);
	if (client.contactId) {
		request.contact = { id: client.contactId };
	}
	const changedTermsDays = changedTermsDaysOf(draft.paymentTermsDays, client.paymentTermsDays);
	if (changedTermsDays !== undefined) {
		request.paymentTermsDays = changedTermsDays;
	}
	return request;
}

export function clientPagePathOf(clientId: string) {
	return `${CLIENTS_PATH}/${encodeURIComponent(clientId)}`;
}

export function clientProjectsPathOf(clientId: string) {
	return `/projects?clients=${encodeURIComponent(clientId)}`;
}

/** The projects of one client among the given ones, read as the projects filter reads a project's client. */
export function projectsOfClient<T extends ProjectOfClient>(projects: ReadonlyArray<T>, clientId: string) {
	return projects.filter((project) => clientIdOf(project) === clientId);
}

export function clientCreatedDateOf(client: Pick<ClientLike, 'createdAt'>) {
	return realDateOf(client.createdAt);
}

export function clientArchivedDateOf(client: Pick<ClientLike, 'deletedAt'>) {
	return realDateOf(client.deletedAt);
}

export type ClientOrder = 'name' | 'newest' | 'projects';

export const CLIENT_ORDERS: ReadonlyArray<ClientOrder> = ['name', 'newest', 'projects'];

const CLIENT_ORDER_SET: ReadonlySet<string> = new Set<string>(CLIENT_ORDERS);

export function isClientOrder(value: unknown): value is ClientOrder {
	if (typeof value !== 'string') {
		return false;
	}
	return CLIENT_ORDER_SET.has(value);
}

function createdTimeOf(client: Pick<ClientLike, 'createdAt'>) {
	const created = clientCreatedDateOf(client);
	if (!created) {
		return null;
	}
	return created.getTime();
}

function compareNewestFirst(first: ClientLike, second: ClientLike) {
	const firstTime = createdTimeOf(first);
	const secondTime = createdTimeOf(second);
	return compareWithUnsetLast(firstTime, secondTime, true);
}

function compareMostProjectsFirst(projectCounts: ReadonlyMap<string, number>) {
	return (first: ClientLike, second: ClientLike) => {
		const firstCount = projectCounts.get(first.id) ?? 0;
		const secondCount = projectCounts.get(second.id) ?? 0;
		return secondCount - firstCount;
	};
}

/**
 * The clients in the asked order. Name keeps the API's own order, which sorts by name; Newest puts the latest added
 * first and Most projects the client with the most projects first. Ties keep the name order.
 */
export function sortClients<T extends ClientLike>(
	clients: T[],
	order: ClientOrder,
	projectCounts: ReadonlyMap<string, number>
): T[] {
	if (order === 'name') {
		return clients;
	}
	const sorted = [...clients];
	if (order === 'newest') {
		sorted.sort(compareNewestFirst);
		return sorted;
	}
	sorted.sort(compareMostProjectsFirst(projectCounts));
	return sorted;
}

export interface ClientNeighbours {
	previousId: string | null;
	nextId: string | null;
	/** Where the client stands in the list, from 1; 0 when it is not in it. */
	position: number;
	total: number;
}

export function clientNeighboursOf(
	clients: ReadonlyArray<Pick<ClientLike, 'id'>>,
	clientId: string | null | undefined
): ClientNeighbours {
	const total = clients.length;
	const index = clients.findIndex((client) => client.id === clientId);
	if (index < 0) {
		return { previousId: null, nextId: null, position: 0, total };
	}
	const previous = clients[index - 1];
	const next = clients[index + 1];
	return {
		previousId: previous?.id ?? null,
		nextId: next?.id ?? null,
		position: index + 1,
		total
	};
}

export type PaymentTermsChoice = 'workspace' | 'receipt' | '15' | '30' | '60' | 'custom';

export const PAYMENT_TERMS_CHOICES: ReadonlyArray<PaymentTermsChoice> = [
	'workspace',
	'receipt',
	'15',
	'30',
	'60',
	'custom'
];

const PRESET_TERMS_DAYS: ReadonlyArray<readonly [PaymentTermsChoice, number]> = [
	['receipt', 0],
	['15', 15],
	['30', 30],
	['60', 60]
];

export interface PaymentTermsInput {
	choice: PaymentTermsChoice;
	customDays: string;
}

function presetChoiceOf(days: number): PaymentTermsChoice | null {
	const preset = PRESET_TERMS_DAYS.find(([, presetDays]) => presetDays === days);
	if (!preset) {
		return null;
	}
	return preset[0];
}

/** The choice that stands for saved terms: a preset when one matches, Custom with the days written in otherwise. */
export function paymentTermsInputOf(days: number | null | undefined): PaymentTermsInput {
	if (typeof days !== 'number') {
		return { choice: 'workspace', customDays: '' };
	}
	const preset = presetChoiceOf(days);
	if (preset) {
		return { choice: preset, customDays: '' };
	}
	return { choice: 'custom', customDays: String(days) };
}

const WHOLE_DAYS_PATTERN = /^\d{1,3}$/;

/** Whole days from 0 to 365, written with digits only; null for anything else. */
export function customTermsDaysOf(text: string): number | null {
	const trimmed = text.trim();
	const isWholeNumber = WHOLE_DAYS_PATTERN.test(trimmed);
	if (!isWholeNumber) {
		return null;
	}
	const days = Number(trimmed);
	if (days > CLIENT_TERMS_MAX_DAYS) {
		return null;
	}
	return days;
}

/** The days a choice stands for; null asks for the workspace's terms. */
export function paymentTermsDaysOf(input: PaymentTermsInput): number | null {
	if (input.choice === 'workspace') {
		return null;
	}
	if (input.choice === 'custom') {
		return customTermsDaysOf(input.customDays);
	}
	const preset = PRESET_TERMS_DAYS.find(([choice]) => choice === input.choice);
	return preset?.[1] ?? null;
}

export function validatePaymentTerms(input: PaymentTermsInput): ClientDraftErrors {
	const isCustom = input.choice === 'custom';
	const customDays = customTermsDaysOf(input.customDays);
	const isUnreadable = isCustom && customDays === null;
	if (isUnreadable) {
		return { paymentTermsDays: 'termsInvalid' };
	}
	return {};
}

export function draftWithPaymentTerms(draft: ClientDraft, input: PaymentTermsInput): ClientDraft {
	const paymentTermsDays = paymentTermsDaysOf(input);
	return { ...draft, paymentTermsDays };
}
