import { TEmployee, TOrganizationProject, TOrganizationTeam } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export interface ITimeLimitReport {
	date: string;
	employees: {
		employee: TEmployee;
		duration: number;
		durationPercentage: number;
		limit: number;
	}[];
}

export interface IGetTimeLimitReport {
	organizationId: string;
	tenantId: string;
	startDate?: string;
	endDate?: string;
	employeeIds?: string[];
	groupBy?: string;
	timeZone?: string;
	duration?: string;
}

// Grouped time limits data

export interface ITimeLimitReportByEmployee {
	employee: TEmployee;
	reports: {
		date: string;
		duration: number;
		durationPercentage: number;
		limit: number;
	}[];
}

export interface FilterState {
	teams: TOrganizationTeam[];
	members: TEmployee[];
	projects: TOrganizationProject[];
	tasks: TTask[];
}
