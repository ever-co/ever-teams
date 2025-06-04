import { IEmployee } from '../organization/employee';

export interface ITimeLimitReport {
	date: string;
	employees: {
		employee: IEmployee;
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
	employee: IEmployee;
	reports: {
		date: string;
		duration: number;
		durationPercentage: number;
		limit: number;
	}[];
}
