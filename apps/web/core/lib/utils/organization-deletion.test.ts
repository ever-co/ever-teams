import {
	canDeleteOrganization,
	countsFailureOf,
	deleteOrganizationAndLand,
	deletionErrorKeyOf,
	isRunGoingOn,
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
		expect(organizationDeletionBlock(1, false)).toBe('lastOrganization');
	});

	it('lets an organization go while the workspace holds another one, a member of it or not', () => {
		expect(organizationDeletionBlock(2, false)).toBeNull();
	});
});

describe('organizationDeletionBlock, the person’s timer', () => {
	it('holds the delete while their timer runs or starts, which Gauzy would leave running in the deleted organization', () => {
		expect(organizationDeletionBlock(3, true)).toBe('timerRunning');
	});

	it('holds it before the workspace’s organizations are read, as the timer is known at once', () => {
		expect(organizationDeletionBlock(null, true)).toBe('timerRunning');
		expect(organizationDeletionBlock(null, false)).toBeNull();
	});

	it('says first that the last organization stays, which stopping the timer would not change', () => {
		expect(organizationDeletionBlock(1, true)).toBe('lastOrganization');
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
			isRunGoingOn: jest.fn(async () => false),
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

	it('sends the person to sign in, never back into the deleted organization, when the session cannot be renewed', async () => {
		const { steps, calls } = stepsOf({ renewSession: jest.fn(async () => Promise.reject(new Error('offline'))) });

		await deleteOrganizationAndLand(labs, steps);

		expect(calls).toEqual(['delete', 'picker']);
	});

	it('sends the person to sign in when the organization to land in cannot be opened', async () => {
		const { steps, calls } = stepsOf({
			openOrganization: jest.fn(async () => Promise.reject(new Error('The organization switch was refused')))
		});

		await deleteOrganizationAndLand(labs, steps);

		expect(calls).toEqual(['delete', 'renew', 'picker']);
	});
});

describe('deleteOrganizationAndLand, a run of the person going on', () => {
	const steps = () => ({
		isRunGoingOn: jest.fn(async () => true),
		softDelete: jest.fn(async () => undefined),
		renewSession: jest.fn(async () => undefined),
		openOrganization: jest.fn(async () => undefined),
		openWorkspacePicker: jest.fn(async () => undefined)
	});

	it('sends no delete while a timer or a break of the person runs, read right before it, and says to stop it', async () => {
		const run = steps();

		const refusal = await deleteOrganizationAndLand(labs, run).catch((error: unknown) => error);

		expect(run.softDelete).not.toHaveBeenCalled();
		expect(run.openWorkspacePicker).not.toHaveBeenCalled();
		expect(deletionErrorKeyOf(refusal)).toBe('settings.workspace.deletion.TIMER_RUNNING');
	});

	it('sends no delete when the run cannot be read, as one may still go on', async () => {
		const run = { ...steps(), isRunGoingOn: jest.fn(async () => Promise.reject(new Error('offline'))) };

		await expect(deleteOrganizationAndLand(labs, run)).rejects.toThrow('offline');

		expect(run.softDelete).not.toHaveBeenCalled();
	});
});

describe('isRunGoingOn', () => {
	function readsOf(status: object | null, lastLog: object | null = null) {
		return {
			readStatus: jest.fn(async () => status),
			readLastLog: jest.fn(async () => lastLog)
		};
	}

	it('finds a running break, which Gauzy answers as a stopped timer with the break still running', async () => {
		const reads = readsOf({ running: false, lastLog: { isRunning: true, logType: 'BREAK' } });

		await expect(isRunGoingOn(reads)).resolves.toBe(true);
	});

	it('finds work started before midnight, which only the last log of any day shows', async () => {
		const reads = readsOf({ running: false, lastLog: null }, { isRunning: true });

		await expect(isRunGoingOn(reads)).resolves.toBe(true);
	});

	it('finds the timer running from the day’s status alone', async () => {
		const reads = readsOf({ running: true });

		await expect(isRunGoingOn(reads)).resolves.toBe(true);
		expect(reads.readLastLog).not.toHaveBeenCalled();
	});

	it('finds none when the day’s status and the last log are both stopped', async () => {
		const reads = readsOf({ running: false, lastLog: { isRunning: false } }, { isRunning: false });

		await expect(isRunGoingOn(reads)).resolves.toBe(false);
	});
});

describe('organizationDeletionStatusOf', () => {
	const settled = {
		isFetching: false,
		isError: false,
		error: null,
		isSuccess: true,
		isMenuFetching: false,
		isMenuError: false,
		isMenuSuccess: true
	};

	it('is ready once the counts and the person’s organizations are read', () => {
		expect(organizationDeletionStatusOf(settled)).toBe('ready');
	});

	it('is loading while the counts are read again, so counts from an earlier opening never let the delete run', () => {
		expect(organizationDeletionStatusOf({ ...settled, isFetching: true })).toBe('loading');
	});

	it('is loading while the person’s organizations are read again, which decide where they land', () => {
		expect(organizationDeletionStatusOf({ ...settled, isMenuFetching: true })).toBe('loading');
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
