import { localTimeZone, todayRange, weekRange } from './dates';
import { Identity } from './identity';
import { Transport } from './transport';

export interface EverTeamsTotal {
	/** The tracked time, in seconds. */
	duration: number;
	/** The average activity level over that time, in percent, as the API counts it. */
	activity: number;
}

export interface TotalsResource {
	/** The member's tracked time today, from GET /timesheet/statistics/counts. */
	today(): Promise<EverTeamsTotal>;
	/** The member's tracked time this week (Monday to Sunday), from the same route. */
	week(): Promise<EverTeamsTotal>;
}

// What GET /timesheet/statistics/counts answers (Gauzy's ICountsStatistics).
interface CountsAnswer {
	employeesCount: number;
	projectsCount: number;
	todayActivities: number;
	todayDuration: number;
	weekActivities: number;
	weekDuration: number;
}

export function createTotals(transport: Transport, identity: Identity): TotalsResource {
	async function counts(): Promise<CountsAnswer> {
		const { tenantId, organizationId, employeeId } = await identity.member();
		const now = new Date();
		const today = todayRange(now);
		const week = weekRange(now);
		const query = {
			tenantId,
			organizationId,
			todayStart: today.start.toISOString(),
			todayEnd: today.end.toISOString(),
			startDate: week.start.toISOString(),
			endDate: week.end.toISOString(),
			timeZone: localTimeZone(),
			employeeIds: [employeeId]
		};
		return transport.request<CountsAnswer>({
			method: 'GET',
			path: '/timesheet/statistics/counts',
			query,
			tenantId,
			organizationId
		});
	}

	async function today(): Promise<EverTeamsTotal> {
		const answer = await counts();
		return { duration: answer.todayDuration, activity: answer.todayActivities };
	}

	async function week(): Promise<EverTeamsTotal> {
		const answer = await counts();
		return { duration: answer.weekDuration, activity: answer.weekActivities };
	}

	return { today, week };
}
