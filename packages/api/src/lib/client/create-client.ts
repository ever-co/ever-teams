import { createIdentity } from './identity';
import { createMembers, MembersResource } from './members';
import { createProjects, ProjectsResource } from './projects';
import { createTasks, TasksResource } from './tasks';
import { createTimeEntries, TimeEntriesResource } from './time-entries';
import { createTimer, TimerResource } from './timer';
import { createTotals, TotalsResource } from './totals';
import { createTransport } from './transport';
import { EverTeamsClientOptions } from './types';

export type { EverTeamsDate } from './dates';
export type { EverTeamsMember, EverTeamsMemberUser, MembersResource } from './members';
export type { EverTeamsProject, ProjectsResource } from './projects';
export type { EverTeamsTask, TasksListParams, TasksResource } from './tasks';
export type { EverTeamsTimeEntry, TimeEntriesListParams, TimeEntriesResource } from './time-entries';
export type { EverTeamsTimeLog, EverTeamsTimerStatus, TimerResource, TimerStartOptions } from './timer';
export type { TimerListener, TimerWatchOptions } from './timer-watch';
export type { EverTeamsTotal, TotalsResource } from './totals';

export interface EverTeamsClient {
	readonly timer: TimerResource;
	readonly timeEntries: TimeEntriesResource;
	readonly projects: ProjectsResource;
	readonly tasks: TasksResource;
	readonly members: MembersResource;
	readonly totals: TotalsResource;
}

/**
 * A client of an Ever Teams API with its own address, token and fetch: two clients never share them. Its methods
 * answer the API's data and throw an `EverTeamsError` (or one of its subclasses) that says what to do next.
 */
export function createClient(options: EverTeamsClientOptions): EverTeamsClient {
	const transport = createTransport(options);
	const identity = createIdentity(transport, options);
	return {
		timer: createTimer(transport, identity),
		timeEntries: createTimeEntries(transport, identity),
		projects: createProjects(transport, identity),
		tasks: createTasks(transport, identity),
		members: createMembers(transport, identity),
		totals: createTotals(transport, identity)
	};
}
