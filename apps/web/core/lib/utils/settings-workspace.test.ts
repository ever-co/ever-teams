import {
	AUTOMATIC_FORMAT,
	DATE_FORMAT_CHOICES,
	NUMBER_FORMAT_CHOICES,
	canEditWorkspace,
	canRenameWorkspace,
	dateFormatChoiceOf,
	dateFormatSampleOf,
	isRenameRefused,
	isWorkspaceNameValid,
	numberFormatChoiceOf,
	numberFormatSampleOf,
	organizationAfterSave,
	workspaceOfTenant,
	workspacesAfterRename
} from './settings-workspace';
import type { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import type { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';

function workspaceOf(tenantId: string, name: string): TWorkspace {
	return {
		user: {
			id: `user-of-${tenantId}`,
			email: 'ada@ever.co',
			name: 'Ada',
			lastTeamId: null,
			tenant: { id: tenantId, name, logo: 'https://example.com/logo.png' }
		},
		token: `token-of-${tenantId}`,
		current_teams: []
	};
}

describe('who may change the workspace settings', () => {
	it('lets the holders of the organization edit permission change the currency and the formats', () => {
		expect(canEditWorkspace(['ALL_ORG_VIEW', 'ALL_ORG_EDIT'])).toBe(true);
		expect(canEditWorkspace(['ALL_ORG_VIEW', 'ORG_TASK_SETTING'])).toBe(false);
		expect(canEditWorkspace([])).toBe(false);
	});

	it('lets only a super admin who may edit the organization rename the workspace', () => {
		expect(canRenameWorkspace('SUPER_ADMIN', ['ALL_ORG_EDIT'])).toBe(true);
		expect(canRenameWorkspace('ADMIN', ['ALL_ORG_EDIT'])).toBe(false);
		expect(canRenameWorkspace('SUPER_ADMIN', [])).toBe(false);
		expect(canRenameWorkspace('EMPLOYEE', [])).toBe(false);
		expect(canRenameWorkspace(undefined, ['ALL_ORG_EDIT'])).toBe(false);
	});
});

describe('the workspace name', () => {
	it('takes 1 to 60 characters once trimmed, as the creation does', () => {
		expect(isWorkspaceNameValid('Studio')).toBe(true);
		expect(isWorkspaceNameValid(` ${'x'.repeat(60)} `)).toBe(true);
		expect(isWorkspaceNameValid('')).toBe(false);
		expect(isWorkspaceNameValid('   ')).toBe(false);
		expect(isWorkspaceNameValid('x'.repeat(61))).toBe(false);
	});

	it('is refused when the API answers no, and only unfinished when it fails or does not answer', () => {
		expect(isRenameRefused({ statusCode: 403 })).toBe(true);
		expect(isRenameRefused({ statusCode: 409 })).toBe(true);
		expect(isRenameRefused({ response: { status: 401 } })).toBe(true);
		expect(isRenameRefused({ statusCode: 500 })).toBe(false);
		expect(isRenameRefused({ statusCode: 504 })).toBe(false);
		expect(isRenameRefused(new Error('Network Error'))).toBe(false);
		expect(isRenameRefused(undefined)).toBe(false);
	});
});

describe('the organization kept after a save', () => {
	const pageCopy = {
		id: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
		name: 'Acme',
		isDefault: true,
		profile_link: 'acme',
		totalEmployees: 3,
		banner: null,
		currency: 'USD',
		dateFormat: null
	} as TOrganization;

	it('is the one the API stored, which also holds what another admin changed', () => {
		const apiAnswer = { ...pageCopy, currency: 'EUR', dateFormat: 'DD/MM/YYYY', registrationDate: '2026-01-05' };

		const kept = organizationAfterSave(pageCopy, { dateFormat: 'DD/MM/YYYY' }, apiAnswer);

		expect(kept.currency).toBe('EUR');
		expect(kept.dateFormat).toBe('DD/MM/YYYY');
		expect(kept.registrationDate).toEqual(new Date('2026-01-05'));
	});

	it('keeps what the page knows of a field the answer leaves out', () => {
		const answerWithoutCurrencyOrDateFormat = {
			id: pageCopy.id,
			name: pageCopy.name,
			isDefault: pageCopy.isDefault,
			profile_link: pageCopy.profile_link,
			totalEmployees: pageCopy.totalEmployees,
			banner: pageCopy.banner
		};

		const kept = organizationAfterSave(pageCopy, { dateFormat: 'DD/MM/YYYY' }, answerWithoutCurrencyOrDateFormat);

		expect(kept.currency).toBe('USD');
		expect(kept.dateFormat).toBe('DD/MM/YYYY');
	});

	it("is the page's copy with the change when the answer does not read as an organization", () => {
		const change = { dateFormat: 'DD/MM/YYYY' };

		expect(organizationAfterSave(pageCopy, change, {})).toEqual({ ...pageCopy, dateFormat: 'DD/MM/YYYY' });
		expect(organizationAfterSave(pageCopy, change, undefined)).toEqual({ ...pageCopy, dateFormat: 'DD/MM/YYYY' });
		expect(organizationAfterSave(pageCopy, change, { id: 'not-an-organization' })).toEqual({
			...pageCopy,
			dateFormat: 'DD/MM/YYYY'
		});
	});
});

describe('the workspace of the session', () => {
	const workspaces = [workspaceOf('tenant-a', 'Acme'), workspaceOf('tenant-b', 'Studio')];

	it("finds the workspace of the session's tenant, and none without a tenant or a match", () => {
		expect(workspaceOfTenant(workspaces, 'tenant-b')?.user.tenant.name).toBe('Studio');
		expect(workspaceOfTenant(workspaces, 'tenant-c')).toBeNull();
		expect(workspaceOfTenant(workspaces, '')).toBeNull();
		expect(workspaceOfTenant(workspaces, null)).toBeNull();
	});

	it('renames that workspace alone, and keeps everything else about it', () => {
		const renamed = workspacesAfterRename(workspaces, 'tenant-a', 'Acme Labs');

		expect(renamed[0]).toEqual(workspaceOf('tenant-a', 'Acme Labs'));
		expect(renamed[1]).toBe(workspaces[1]);
		expect(workspaces[0].user.tenant.name).toBe('Acme');
	});
});

describe('the format choices of the settings page', () => {
	it('offers Automatic first, then every format', () => {
		expect(DATE_FORMAT_CHOICES).toEqual([
			AUTOMATIC_FORMAT,
			'MM/DD/YYYY',
			'DD/MM/YYYY',
			'DD-MM-YYYY',
			'DD.MM.YYYY',
			'YYYY-MM-DD'
		]);
		expect(NUMBER_FORMAT_CHOICES).toEqual([AUTOMATIC_FORMAT, '1,234.56', '1.234,56', '1 234,56', "1'234.56"]);
	});

	it('shows Automatic for an organization without a format, or with one this app does not write', () => {
		expect(dateFormatChoiceOf(null)).toBe(AUTOMATIC_FORMAT);
		expect(dateFormatChoiceOf('LL')).toBe(AUTOMATIC_FORMAT);
		expect(dateFormatChoiceOf('DD/MM/YYYY')).toBe('DD/MM/YYYY');
		expect(numberFormatChoiceOf(undefined)).toBe(AUTOMATIC_FORMAT);
		expect(numberFormatChoiceOf('BGN')).toBe(AUTOMATIC_FORMAT);
		expect(numberFormatChoiceOf('1 234,56')).toBe('1 234,56');
	});

	it('shows each date format on a day that cannot be read as a month', () => {
		expect(dateFormatSampleOf('MM/DD/YYYY', 2026)).toBe('12/31/2026');
		expect(dateFormatSampleOf('DD/MM/YYYY', 2026)).toBe('31/12/2026');
		expect(dateFormatSampleOf('DD-MM-YYYY', 2026)).toBe('31-12-2026');
		expect(dateFormatSampleOf('DD.MM.YYYY', 2026)).toBe('31.12.2026');
		expect(dateFormatSampleOf('YYYY-MM-DD', 2026)).toBe('2026-12-31');
	});

	it('shows each number format on an amount with thousands and cents', () => {
		expect(numberFormatSampleOf('1,234.56')).toBe('1,234.56');
		expect(numberFormatSampleOf('1.234,56')).toBe('1.234,56');
		expect(numberFormatSampleOf('1 234,56')).toBe('1\u00A0234,56');
		expect(numberFormatSampleOf("1'234.56")).toBe('1\u2019234.56');
	});
});
