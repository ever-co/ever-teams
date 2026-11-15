import { isEmail } from 'class-validator';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import type { IEmployeePlaceholderMemberInput } from '@/core/types/interfaces/organization/employee-placeholder';

/**
 * Members without an account (ever-co/ever-gauzy#11913): kept for time and reports only, added by the people Gauzy
 * lets add members to the organization, and later claimed by the person or merged into a member with an account.
 */

/** What Gauzy asks for to add, claim and merge a member without an account. */
export const PLACEHOLDER_PERMISSION = 'ORG_EMPLOYEES_EDIT';

/** Gauzy's limits on a member's name: longer names are refused. */
const NAME_MAX_LENGTH = 100;

export function canManagePlaceholders(permissions: ReadonlyArray<string>): boolean {
	return permissions.includes(PLACEHOLDER_PERMISSION);
}

export interface PlaceholderFields {
	isPlaceholder?: boolean | null;
	placeholderEmail?: string | null;
}

export function isPlaceholderEmployee(employee: PlaceholderFields | null | undefined): boolean {
	return employee?.isPlaceholder === true;
}

/**
 * An API that has members without an account sends `isPlaceholder` on every member it reads; an older one never
 * does. The screens offer these actions only against an API that has them.
 */
export function apiKnowsPlaceholders(employees: ReadonlyArray<PlaceholderFields | null | undefined>): boolean {
	return employees.some((employee) => typeof employee?.isPlaceholder === 'boolean');
}

/** The email given when the member without an account was created, or none. */
export function placeholderEmailOf(employee: PlaceholderFields | null | undefined): string {
	if (!isPlaceholderEmployee(employee)) {
		return '';
	}
	const email = employee?.placeholderEmail ?? '';
	return email.trim();
}

export interface PlaceholderForm {
	firstName: string;
	lastName: string;
	email: string;
}

export type PlaceholderFormProblem = 'nameRequired' | 'emailInvalid';

export function placeholderFormProblemOf(form: PlaceholderForm): PlaceholderFormProblem | null {
	if (!form.firstName.trim()) {
		return 'nameRequired';
	}
	const email = form.email.trim();
	const hasInvalidEmail = email !== '' && !isEmail(email);
	if (hasInvalidEmail) {
		return 'emailInvalid';
	}
	return null;
}

/** Trimmed names, a lowercase email; an empty last name or email is left out. */
export function placeholderMemberInputOf(form: PlaceholderForm): IEmployeePlaceholderMemberInput {
	const member: IEmployeePlaceholderMemberInput = { firstName: form.firstName.trim() };
	const lastName = form.lastName.trim();
	if (lastName) {
		member.lastName = lastName;
	}
	const email = form.email.trim().toLowerCase();
	if (email) {
		member.email = email;
	}
	return member;
}

export type PlaceholderAction = 'create' | 'claim' | 'merge';

/** A sentence of the app, with its values: Gauzy's own text is never shown. */
export interface PlaceholderFailure {
	key: string;
	values?: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Gauzy's message: under an Axios error's `response.data`, or the error's own (`ApiErrorService` keeps it). */
function refusalMessageOf(error: unknown): string {
	if (!isRecord(error)) {
		return '';
	}
	const response = error.response;
	if (isRecord(response) && isRecord(response.data) && typeof response.data.message === 'string') {
		return response.data.message;
	}
	if (typeof error.message === 'string') {
		return error.message;
	}
	return '';
}

const EMAIL_TAKEN = /already has this email/i;

const HAS_ACCOUNT = /already has an account|merge the member without an account/i;

const TIME_OFF_BALANCE = /time off balance/i;

const YEAR = /\byear (\d{4})\b/g;

function yearsOf(message: string): string[] {
	const years: string[] = [];
	for (const match of message.matchAll(YEAR)) {
		const year = match[1];
		if (!years.includes(year)) {
			years.push(year);
		}
	}
	return years;
}

function conflictOf(message: string, action: PlaceholderAction): PlaceholderFailure | null {
	if (action === 'claim' && HAS_ACCOUNT.test(message)) {
		return { key: 'settings.members.placeholder.errors.CLAIM_HAS_ACCOUNT' };
	}
	if (action === 'create' && EMAIL_TAKEN.test(message)) {
		return { key: 'settings.members.placeholder.errors.EMAIL_TAKEN' };
	}
	if (action === 'merge' && TIME_OFF_BALANCE.test(message)) {
		const years = yearsOf(message);
		if (years.length === 0) {
			return { key: 'settings.members.placeholder.errors.MERGE_TIME_OFF_ANY' };
		}
		return { key: 'settings.members.placeholder.errors.MERGE_TIME_OFF', values: { years: years.join(', ') } };
	}
	return null;
}

/**
 * Why Gauzy refused an action on a member without an account. Its 409 answers say what to do next (merge instead
 * of claiming, settle a time off balance before merging); they are read here into the app's own sentences, and
 * every other refusal reads as its status does elsewhere.
 */
export function placeholderFailureOf(error: unknown, action: PlaceholderAction): PlaceholderFailure {
	if (errorStatusOf(error) === 409) {
		const conflict = conflictOf(refusalMessageOf(error), action);
		if (conflict) {
			return conflict;
		}
	}
	return { key: errorReasonKeyOf(error) };
}

/** A row of the time import, as much of it as the offer reads. */
interface ImportedRow {
	cells: { memberEmail: string };
	problems: ReadonlyArray<{ code: string }>;
}

export interface ImportPlaceholderCandidate {
	/** The email or the name, lowercased: two rows naming the same person count once. */
	key: string;
	member: IEmployeePlaceholderMemberInput;
	rowCount: number;
}

const UNKNOWN_MEMBER_CODES = new Set(['memberUnknown', 'memberNameUnknown']);

function namesUnknownMember(row: ImportedRow): boolean {
	return row.problems.some((problem) => UNKNOWN_MEMBER_CODES.has(problem.code));
}

function clipped(text: string): string {
	return text.slice(0, NAME_MAX_LENGTH);
}

/**
 * The member a cell names. An email gives no name: the part before the "@" stands for it until someone renames the
 * member (the file then finds them by email). A name is split at its first space, the rest kept whole as the last
 * name. A name longer than Gauzy keeps is not offered: the member would be named otherwise than the file, and its
 * rows would stay unknown.
 */
function memberOfCell(cell: string): IEmployeePlaceholderMemberInput | null {
	const text = cell.trim();
	if (text.includes('@')) {
		const email = text.toLowerCase();
		const [localPart] = email.split('@');
		return { firstName: clipped(localPart || email), email };
	}
	const words = text.split(/\s+/);
	const [firstName, ...rest] = words;
	const lastName = rest.join(' ');
	const isTooLong = firstName.length > NAME_MAX_LENGTH || lastName.length > NAME_MAX_LENGTH;
	if (isTooLong) {
		return null;
	}
	const member: IEmployeePlaceholderMemberInput = { firstName };
	if (lastName) {
		member.lastName = lastName;
	}
	return member;
}

/** A member the import can name, as the time import reads the team's members. */
export interface ImportMemberAdded {
	employeeId: string;
	email: string;
	name: string;
}

export interface ImportMembersAdded {
	/** The members created for the file, named the way the file names them. */
	added: ImportMemberAdded[];
	/** Emails a member of the organization outside this team already has: Gauzy created nobody for them. */
	notInTeamKeys: string[];
}

/** Gauzy's answer to a bulk creation, read row by row against the candidates it was asked for, in the same order. */
export function importMembersAddedOf(
	candidates: ReadonlyArray<ImportPlaceholderCandidate>,
	items: ReadonlyArray<{ employee: { id: string }; created: boolean }>
): ImportMembersAdded {
	const added: ImportMemberAdded[] = [];
	const notInTeamKeys: string[] = [];
	candidates.forEach((candidate, index) => {
		const item = items[index];
		if (!item?.employee?.id) {
			return;
		}
		if (!item.created) {
			notInTeamKeys.push(candidate.key);
			return;
		}
		const { firstName, lastName, email } = candidate.member;
		const name = [firstName, lastName].filter(Boolean).join(' ');
		added.push({ employeeId: item.employee.id, email: email ?? '', name });
	});
	return { added, notInTeamKeys };
}

/** The people a file names that nobody in the team is, once each, in the order of the file. */
export function importPlaceholderCandidatesOf(rows: ReadonlyArray<ImportedRow>): ImportPlaceholderCandidate[] {
	const candidates = new Map<string, ImportPlaceholderCandidate>();
	for (const row of rows) {
		if (!namesUnknownMember(row)) {
			continue;
		}
		const cell = row.cells.memberEmail.trim().replace(/\s+/g, ' ');
		if (!cell) {
			continue;
		}
		const key = cell.toLowerCase();
		const known = candidates.get(key);
		if (known) {
			known.rowCount += 1;
			continue;
		}
		const member = memberOfCell(cell);
		if (!member) {
			continue;
		}
		candidates.set(key, { key, member, rowCount: 1 });
	}
	return [...candidates.values()];
}
