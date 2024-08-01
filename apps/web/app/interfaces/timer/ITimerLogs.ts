export interface ITimerLogsDailyReportRequest {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	startDate: Date;
	endDate: Date;
}

export interface ITimerLogsDailyReport {
	activity: number;
	date: string; // '2024-07-19'
	sum: number; // in seconds
}
