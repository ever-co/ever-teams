import { changesByEntryOf, deletedEntryOf, historyChangesOf } from '@/core/lib/utils/time-log-history';
import { PRIVATE_PROJECTS_KEY } from '@/core/lib/utils/project-visibility';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimeLogHistoryRow } from '@/core/types/interfaces/timer/time-log/time-log-history';
import { changedEntriesOf, manualRankingsOf } from './manual-time-edits';
import { deletedEntriesOf } from './manual-time-edits-history';

/**
 * CORE-27 (ever-co/ever-teams#5370): the Manual time edits report reads time entries, which ever-co/ever-gauzy#12035
 * answers with a hidden project as `{ id, projectHidden: true }`. That time is a private project's, never "No project",
 * and every hidden project ranks as one.
 */

const PAUL = 'paul';
const CLIENT_X = 'project-client-x-redesign';
const AUDIT = 'project-internal-audit';
const MEMBERS = new Map([[PAUL, { employeeId: PAUL, name: 'Paul', imageUrl: null }]]);

function log(id: string, project: Record<string, unknown> | null, seconds: number): ITimeLog {
	return {
		id,
		employeeId: PAUL,
		projectId: (project?.id as string) ?? null,
		project,
		startedAt: new Date('2026-11-10T09:00:00.000Z'),
		stoppedAt: new Date(new Date('2026-11-10T09:00:00.000Z').getTime() + seconds * 1000),
		editedAt: new Date('2026-11-10T15:00:00.000Z'),
		duration: seconds,
		version: '1'
	} as unknown as ITimeLog;
}

function entriesOf(logs: ITimeLog[]) {
	return changedEntriesOf({ addedLogs: [], editedLogs: logs, members: MEMBERS, unnamedLabel: 'Unnamed' });
}

describe('the Manual time edits of a reader who is not on some private projects', () => {
	const entries = entriesOf([
		log('log-1', { id: CLIENT_X, projectHidden: true }, 3600),
		log('log-2', { id: AUDIT, projectHidden: true }, 1800),
		log('log-3', null, 600),
		log('log-4', { id: 'project-website', name: 'Website' }, 1200)
	]);

	it('marks the entries of a hidden project, under the one key every private project shares', () => {
		const hidden = entries.filter((entry) => entry.isProjectHidden);

		expect(hidden.map((entry) => entry.key).sort()).toEqual(['log-1', 'log-2']);
		for (const entry of hidden) {
			expect(entry).toMatchObject({ projectValue: PRIVATE_PROJECTS_KEY, projectName: null });
		}
		expect(entries.find((entry) => entry.key === 'log-4')).not.toHaveProperty('isProjectHidden');
	});

	it('ranks every hidden project as one, apart from the time without a project', () => {
		const { projects } = manualRankingsOf(entries);
		const privateProjects = projects.find((row) => row.key === PRIVATE_PROJECTS_KEY);

		expect(privateProjects?.item).toMatchObject({ isProjectHidden: true, seconds: 5400, count: 2 });
		expect(projects.map((row) => row.key)).not.toContain(CLIENT_X);
		expect(projects.find((row) => row.key === 'project-website')?.item).not.toHaveProperty('isProjectHidden');
	});

	it('lists a deleted entry of a hidden project as a private project, never by its id', () => {
		const deletion: ITimeLogHistoryRow = {
			id: 'row-gone',
			entityId: 'entry-gone',
			action: 'Deleted',
			createdAt: '2026-11-11T12:00:00.000Z',
			updatedFields: ['startedAt', 'stoppedAt', 'employeeId', 'projectId'],
			previousValues: [
				{ startedAt: '2026-11-11T09:00:00.000Z' },
				{ stoppedAt: '2026-11-11T10:00:00.000Z' },
				{ employeeId: PAUL },
				{ projectId: CLIENT_X }
			],
			updatedValues: [],
			previousEntities: [{ projectId: { id: CLIENT_X, projectHidden: true } }],
			updatedEntities: [],
			data: { employeeId: PAUL },
			employeeId: 'manager',
			createdByUserId: 'manager-user'
		} as unknown as ITimeLogHistoryRow;
		const changes = historyChangesOf([deletion]);
		const deleted = changes.map(deletedEntryOf).filter((item) => item !== null);

		const [entry] = deletedEntriesOf({
			deleted,
			byEntry: changesByEntryOf(changes),
			members: MEMBERS,
			unnamedLabel: 'Unnamed'
		});

		expect(entry).toMatchObject({ projectValue: PRIVATE_PROJECTS_KEY, projectName: null, isProjectHidden: true });
	});
});
