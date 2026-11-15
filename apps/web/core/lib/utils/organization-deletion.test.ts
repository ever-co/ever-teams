import {
	canDeleteOrganization,
	countsFailureOf,
	deleteOrganizationAndLand,
	deletionErrorKeyOf,
	organizationDeletionBlock,
	organizationDeletionStatusOf,
	organizationToLandInAfterDeletion,
	trackedHoursOf
} from '@/core/lib/utils/organization-deletion';

const studio = { id: 'org-studio', name: 'Studio' };
const labs = { id: 'org-labs', name: 'Labs' };
const trial = { id: 'org-trial', name: 'Trial' };

function apiError(status: number, data: Record<string, unknown>) {
	return Object.assign(new Error(String(data.message ?? status)), { response: { status, data } });
}

describe('canDeleteOrganization', () => {
	it('lets a role holding ALL_ORG_EDIT delete, as Gauzy guards DELETE /organization/:id', () => {
		expect(canDeleteOrganization(['ORG_TASK_EDIT', 'ALL_ORG_EDIT'])).toBe(true);
	});

	it('refuses every other role', () => {
		expect(canDeleteOrganization(['ALL_ORG_VIEW', 'ORG_TEAM_EDIT'])).toBe(false);
		expect(canDeleteOrganization([])).toBe(false);
	});
});

describe('organizationDeletionBlock', () => {
	it('blocks the last organization of the workspace, which only an account deletion removes', () => {
		expect(organizationDeletionBlock(1)).toBe('lastOrganization');
	});

	it('lets an organization go while the workspace holds another one, a member of it or not', () => {
		expect(organizationDeletionBlock(2)).toBeNull();
	});
});

describe('organizationToLandInAfterDeletion', () => {
	it('lands in another organization of the person, the first one by name', () => {
		expect(organizationToLandInAfterDeletion([trial, studio, labs], trial.id)).toEqual(labs);
	});

	it('answers null when the person has none left, so they go to the workspace picker', () => {
		expect(organizationToLandInAfterDeletion([trial], trial.id)).toBeNull();
	});
});

describe('countsFailureOf', () => {
	it('reads a 404 naming the route as an API without the counts, whose soft delete must not be offered', () => {
		const error = apiError(404, { statusCode: 404, message: 'Cannot GET /api/organization/org-trial/counts' });
		expect(countsFailureOf(error)).toBe('unsupported');
	});

	it('reads any other failure as one a new try may fix', () => {
		expect(countsFailureOf(apiError(404, { statusCode: 404, message: 'The record was not found' }))).toBe('failed');
		expect(countsFailureOf(apiError(500, { statusCode: 500, message: 'Internal server error' }))).toBe('failed');
		expect(countsFailureOf(new TypeError('Failed to fetch'))).toBe('failed');
	});
});

describe('deletionErrorKeyOf', () => {
	it("says why Gauzy refused the workspace's last organization", () => {
		const error = apiError(409, { statusCode: 409, code: 'ORGANIZATION_LAST_OF_WORKSPACE', message: 'last' });
		expect(deletionErrorKeyOf(error)).toBe('settings.workspace.deletion.LAST_ORGANIZATION_REFUSED');
	});

	it('falls back to the reason any other failure gets', () => {
		expect(deletionErrorKeyOf(apiError(403, { statusCode: 403, message: 'Forbidden resource' }))).not.toBe(
			'settings.workspace.deletion.LAST_ORGANIZATION_REFUSED'
		);
	});
});

describe('trackedHoursOf', () => {
	it('turns seconds into hours with one decimal', () => {
		expect(trackedHoursOf(1_728_350)).toBe(480.1);
		expect(trackedHoursOf(5400)).toBe(1.5);
		expect(trackedHoursOf(0)).toBe(0);
	});
});

describe('deleteOrganizationAndLand', () => {
	function stepsOf(overrides: Partial<Parameters<typeof deleteOrganizationAndLand>[1]> = {}) {
		const calls: string[] = [];
		const steps = {
			softDelete: jest.fn(async () => {
				calls.push('delete');
			}),
			renewSession: jest.fn(async () => {
				calls.push('renew');
			}),
			openOrganization: jest.fn(async (organizationId: string) => {
				calls.push(`open ${organizationId}`);
			}),
			openWorkspacePicker: jest.fn(async () => {
				calls.push('picker');
			}),
			restartApp: jest.fn(() => {
				calls.push('restart');
			}),
			...overrides
		};
		return { steps, calls };
	}

	it('deletes, renews the session its token no longer opens, then opens the organization to land in', async () => {
		const { steps, calls } = stepsOf();

		await deleteOrganizationAndLand(labs, steps);

		expect(calls).toEqual(['delete', 'renew', `open ${labs.id}`]);
	});

	it('sends the person to the workspace picker when they have no organization left', async () => {
		const { steps, calls } = stepsOf();

		await deleteOrganizationAndLand(null, steps);

		expect(calls).toEqual(['delete', 'picker']);
	});

	it('changes nothing else when the delete fails, and lets the caller say why', async () => {
		const refusal = new Error('refused');
		const { steps, calls } = stepsOf({ softDelete: jest.fn(async () => Promise.reject(refusal)) });

		await expect(deleteOrganizationAndLand(labs, steps)).rejects.toBe(refusal);

		expect(calls).toEqual([]);
	});

	it('restarts the app once the organization is gone, when opening the next one fails', async () => {
		const { steps, calls } = stepsOf({ renewSession: jest.fn(async () => Promise.reject(new Error('offline'))) });

		await deleteOrganizationAndLand(labs, steps);

		expect(calls).toEqual(['delete', 'restart']);
	});
});

describe('organizationDeletionStatusOf', () => {
	const settled = {
		isFetching: false,
		isError: false,
		error: null,
		isSuccess: true,
		isMenuError: false,
		isMenuSuccess: true
	};

	it('is ready once the counts and the person’s organizations are read', () => {
		expect(organizationDeletionStatusOf(settled)).toBe('ready');
	});

	it('is loading while the counts are read again, so counts from an earlier opening never let the delete run', () => {
		expect(organizationDeletionStatusOf({ ...settled, isFetching: true })).toBe('loading');
	});

	it('is loading until both reads answered', () => {
		expect(organizationDeletionStatusOf({ ...settled, isSuccess: false })).toBe('loading');
		expect(organizationDeletionStatusOf({ ...settled, isMenuSuccess: false })).toBe('loading');
	});

	it('tells an API without the counts from a failure a new try may fix', () => {
		const missingRoute = { response: { status: 404, data: { message: 'Cannot GET /api/organization/x/counts' } } };
		expect(organizationDeletionStatusOf({ ...settled, isSuccess: false, isError: true, error: missingRoute })).toBe(
			'unsupported'
		);
		expect(
			organizationDeletionStatusOf({ ...settled, isSuccess: false, isError: true, error: new Error('offline') })
		).toBe('failed');
		expect(organizationDeletionStatusOf({ ...settled, isMenuError: true, isMenuSuccess: false })).toBe('failed');
	});
});
