import {
	apiKnowsPlaceholders,
	canManagePlaceholders,
	importMembersAddedOf,
	importPlaceholderCandidatesOf,
	isPlaceholderEmployee,
	placeholderEmailOf,
	placeholderFailureOf,
	placeholderFormProblemOf,
	placeholderMemberInputOf
} from './member-placeholder';
import { withImportMembersAdded } from './time-import-access';
import { draftRowsOf, type TimeImportContext } from './time-import-rows';
import type { TimeImportSheetRow } from './time-import-sheet';

function gauzyRefusal(status: number, message: string) {
	return { response: { status, data: { statusCode: status, message } } };
}

describe('member-placeholder', () => {
	describe('who may add, claim and merge', () => {
		it('needs the permission Gauzy asks for: ORG_EMPLOYEES_EDIT', () => {
			expect(canManagePlaceholders(['ORG_EMPLOYEES_EDIT'])).toBe(true);
			expect(canManagePlaceholders(['ORG_EMPLOYEES_VIEW', 'ORG_TEAM_EDIT'])).toBe(false);
			expect(canManagePlaceholders([])).toBe(false);
		});
	});

	describe('reading a member', () => {
		it('is a member without an account only when Gauzy says so', () => {
			expect(isPlaceholderEmployee({ isPlaceholder: true })).toBe(true);
			expect(isPlaceholderEmployee({ isPlaceholder: false })).toBe(false);
			expect(isPlaceholderEmployee({})).toBe(false);
			expect(isPlaceholderEmployee(null)).toBe(false);
		});

		it('knows the API has members without an account when one of the members carries the field', () => {
			expect(apiKnowsPlaceholders([{ isPlaceholder: false }, {}])).toBe(true);
			expect(apiKnowsPlaceholders([{}, null])).toBe(false);
			expect(apiKnowsPlaceholders([])).toBe(false);
		});

		it('reads the email given at creation, trimmed, or none', () => {
			expect(placeholderEmailOf({ isPlaceholder: true, placeholderEmail: ' amina@acme.com ' })).toBe(
				'amina@acme.com'
			);
			expect(placeholderEmailOf({ isPlaceholder: true, placeholderEmail: null })).toBe('');
			expect(placeholderEmailOf({ isPlaceholder: false, placeholderEmail: 'kept@acme.com' })).toBe('');
		});
	});

	describe('the Add without an account form', () => {
		it('needs a first name', () => {
			expect(placeholderFormProblemOf({ firstName: '  ', lastName: 'Diallo', email: '' })).toBe('nameRequired');
		});

		it('takes no email, or a valid one', () => {
			expect(placeholderFormProblemOf({ firstName: 'Amina', lastName: '', email: '' })).toBeNull();
			expect(placeholderFormProblemOf({ firstName: 'Amina', lastName: '', email: 'amina@acme.com' })).toBeNull();
			expect(placeholderFormProblemOf({ firstName: 'Amina', lastName: '', email: 'amina@' })).toBe(
				'emailInvalid'
			);
		});

		it('sends trimmed names, a lowercase email, and leaves out what is empty', () => {
			expect(
				placeholderMemberInputOf({ firstName: ' Amina ', lastName: ' ', email: ' Amina@Acme.com ' })
			).toEqual({ firstName: 'Amina', email: 'amina@acme.com' });
			expect(placeholderMemberInputOf({ firstName: 'Amina', lastName: 'Diallo', email: '' })).toEqual({
				firstName: 'Amina',
				lastName: 'Diallo'
			});
		});
	});

	describe('why Gauzy refused', () => {
		it('names an email a member already has, on a creation', () => {
			const failure = placeholderFailureOf(
				gauzyRefusal(409, 'A member of the organization already has this email.'),
				'create'
			);
			expect(failure).toEqual({ key: 'settings.members.placeholder.errors.EMAIL_TAKEN' });
		});

		it('sends a claim of an email with an account to the merge', () => {
			const hasAccount = gauzyRefusal(
				409,
				"This email already has an account: merge the member without an account into that person's member instead."
			);
			const isMember = gauzyRefusal(
				409,
				'A member of the organization already has this email: merge the member without an account into theirs.'
			);
			expect(placeholderFailureOf(hasAccount, 'claim')).toEqual({
				key: 'settings.members.placeholder.errors.CLAIM_HAS_ACCOUNT'
			});
			expect(placeholderFailureOf(isMember, 'claim')).toEqual({
				key: 'settings.members.placeholder.errors.CLAIM_HAS_ACCOUNT'
			});
		});

		it('names the year of two time off balances that stop a merge', () => {
			const collision = gauzyRefusal(
				409,
				'Both members have a time off balance with the same policyId, year ' +
					'(policyId 6c1f2c0e-1b9d-4a39-9d1e-1f4b5d3c2a10, year 2026). Settle it on one of them before merging: ' +
					"the member without an account's one would otherwise be deleted, with its history."
			);
			expect(placeholderFailureOf(collision, 'merge')).toEqual({
				key: 'settings.members.placeholder.errors.MERGE_TIME_OFF',
				values: { years: '2026' }
			});
		});

		it('names every year when several balances collide, and none when the answer names none', () => {
			const twoYears = gauzyRefusal(
				409,
				'Both members have a time off balance with the same policyId, year (policyId a, year 2025; policyId b, ' +
					'year 2026). Settle it on one of them before merging.'
			);
			const noYear = gauzyRefusal(409, 'Both members have a time off balance with the same policy.');
			expect(placeholderFailureOf(twoYears, 'merge')).toEqual({
				key: 'settings.members.placeholder.errors.MERGE_TIME_OFF',
				values: { years: '2025, 2026' }
			});
			expect(placeholderFailureOf(noYear, 'merge')).toEqual({
				key: 'settings.members.placeholder.errors.MERGE_TIME_OFF_ANY'
			});
		});

		it('falls back to the reason of the status, never the server text', () => {
			expect(placeholderFailureOf(gauzyRefusal(403, 'Forbidden resource'), 'merge')).toEqual({
				key: 'toasts.REASONS.PERMISSION'
			});
			expect(placeholderFailureOf(gauzyRefusal(409, 'Something else'), 'create')).toEqual({
				key: 'toasts.REASONS.CONFLICT'
			});
		});
	});

	describe('people of an import that nobody in the team is', () => {
		const row = (number: number, memberEmail: string, code: string) => ({
			row: number,
			cells: { memberEmail },
			problems: [{ code }]
		});

		it('offers one member per unknown email or name, counting their rows', () => {
			const candidates = importPlaceholderCandidatesOf([
				row(2, 'amina.diallo@acme.com', 'memberUnknown'),
				row(3, 'Amina.Diallo@acme.com ', 'memberUnknown'),
				row(4, 'Paul Martin', 'memberNameUnknown'),
				row(5, 'ana@acme.com', 'projectUnknown'),
				{ row: 6, cells: { memberEmail: 'ready@acme.com' }, problems: [] }
			]);
			expect(candidates).toEqual([
				{
					key: 'amina.diallo@acme.com',
					member: { firstName: 'amina.diallo', email: 'amina.diallo@acme.com' },
					rowCount: 2
				},
				{ key: 'paul martin', member: { firstName: 'Paul', lastName: 'Martin' }, rowCount: 1 }
			]);
		});

		it('keeps a long name whole after the first word', () => {
			const [candidate] = importPlaceholderCandidatesOf([row(2, ' María  de la Cruz ', 'memberNameUnknown')]);
			expect(candidate.member).toEqual({ firstName: 'María', lastName: 'de la Cruz' });
		});

		it('offers no name longer than Gauzy keeps: the member would be named otherwise than the file', () => {
			const longFirst = `${'A'.repeat(101)} Martin`;
			const longLast = `Paul ${'B'.repeat(101)}`;

			expect(
				importPlaceholderCandidatesOf([
					row(2, longFirst, 'memberNameUnknown'),
					row(3, longLast, 'memberNameUnknown')
				])
			).toEqual([]);
		});

		it('offers nobody when every row names a known member', () => {
			expect(importPlaceholderCandidatesOf([row(2, 'x@acme.com', 'memberNotAllowed')])).toEqual([]);
		});

		it('offers nobody Gauzy would refuse or cut, since their rows could never name them', () => {
			const longWord = 'a'.repeat(101);
			const candidates = importPlaceholderCandidatesOf([
				row(2, `${longWord} Martin`, 'memberNameUnknown'),
				row(3, `Paul ${'b '.repeat(60)}`, 'memberNameUnknown'),
				row(4, 'ana@', 'memberUnknown'),
				row(5, 'Lena Weber', 'memberNameUnknown')
			]);
			expect(candidates.map((candidate) => candidate.key)).toEqual(['lena weber']);
		});

		it('counts a name once however its accents are encoded', () => {
			const composed = 'José Diaz';
			const decomposed = 'José Diaz';
			const candidates = importPlaceholderCandidatesOf([
				row(2, composed, 'memberNameUnknown'),
				row(3, decomposed, 'memberNameUnknown')
			]);
			expect(candidates).toHaveLength(1);
			expect(candidates[0].rowCount).toBe(2);
		});
	});

	describe('a row of the import once its member is added', () => {
		const context: TimeImportContext = {
			now: new Date(2026, 10, 5, 18, 0),
			allowsFutureDates: false,
			requiresProject: false,
			teamHasDefaultProject: false,
			viewerEmployeeId: 'employee-viewer',
			viewerEmail: 'viewer@acme.com',
			canImportForOthers: true,
			matchesEveryTeamTask: false,
			members: [{ employeeId: 'employee-viewer', email: 'viewer@acme.com', name: 'Viewer' }],
			projects: [],
			tasks: []
		};
		const sheetRow = (memberEmail: string): TimeImportSheetRow => ({
			row: 2,
			cells: {
				date: '2026-11-03',
				startTime: '09:00',
				endDate: '',
				endTime: '10:00',
				duration: '',
				project: '',
				task: '',
				notes: '',
				billable: '',
				memberEmail,
				labels: ''
			},
			extraCellCount: 0
		});
		const memberCodesOf = (cell: string, members: TimeImportContext['members']) => {
			const [drafted] = draftRowsOf([sheetRow(cell)], { ...context, members: [...context.members, ...members] });
			return drafted.problems.map((problem) => problem.code).filter((code) => code.startsWith('member'));
		};

		it('names the member added for it, whatever spaces the file put in the name', () => {
			const cell = ' María  de la Cruz ';
			expect(memberCodesOf(cell, [])).toEqual(['memberNameUnknown']);
			const candidates = importPlaceholderCandidatesOf([
				{ cells: { memberEmail: cell }, problems: [{ code: 'memberNameUnknown' }] }
			]);
			const { added } = importMembersAddedOf(candidates, [{ employee: { id: 'employee-maria' }, created: true }]);

			// Before the team reads the member back, then as the team lists it
			expect(memberCodesOf(cell, withImportMembersAdded(context, added).members)).toEqual([]);
			expect(
				memberCodesOf(cell, [{ employeeId: 'employee-maria', email: '', name: 'María de la Cruz' }])
			).toEqual([]);
		});
	});

	describe('the members an import added', () => {
		const candidates = [
			{ key: 'amina@acme.com', member: { firstName: 'amina', email: 'amina@acme.com' }, rowCount: 2 },
			{ key: 'paul martin', member: { firstName: 'Paul', lastName: 'Martin' }, rowCount: 1 },
			{ key: 'ana@acme.com', member: { firstName: 'ana', email: 'ana@acme.com' }, rowCount: 1 }
		];

		it('reads each answer with the row it stands for, and keeps the ones created for the file', () => {
			const outcome = importMembersAddedOf(candidates, [
				{ employee: { id: 'employee-amina' }, created: true },
				{ employee: { id: 'employee-paul' }, created: true },
				{ employee: { id: 'employee-ana' }, created: false }
			]);

			expect(outcome.added).toEqual([
				{ employeeId: 'employee-amina', email: 'amina@acme.com', name: 'amina' },
				{ employeeId: 'employee-paul', email: '', name: 'Paul Martin' }
			]);
			// Ana already belongs to the organization but not to this team: nothing was created for her
			expect(outcome.notInTeamKeys).toEqual(['ana@acme.com']);
		});

		it('skips an answer Gauzy left out', () => {
			const outcome = importMembersAddedOf(candidates, [{ employee: { id: 'employee-amina' }, created: true }]);
			expect(outcome.added).toHaveLength(1);
			expect(outcome.notInTeamKeys).toEqual([]);
		});
	});
});
