import { IActivityItem } from '@/core/types/interfaces/activity/IActivityReport';

export interface Employee {
	id: string;
	fullName: string;
	user?: {
		imageUrl?: string;
	};
}

export interface ActivityData {
	employee: Employee;
	activity: IActivityItem;
}

export interface ProjectGroupData {
	activities: ActivityData[];
	totalDuration: number;
	members: Set<string>;
}

export interface ProjectGroups {
	[projectName: string]: {
		[date: string]: ProjectGroupData;
	};
}

export interface DateSummaryRowProps {
	date: string;
	activities: ActivityData[];
}

export interface ProjectHeaderRowProps {
	projectName: string;
}

export interface DateHeaderRowProps {
	date: string;
	activities: ActivityData[];
}

export interface ActivityRowProps {
	employee: Employee;
	activity: IActivityItem;
}

export interface ProgressBarProps {
	percentage: number;
	className?: string;
}

export interface EmployeeWithProjects {
	employee: Employee;
	projects: string[];
}

// Interface for the daily report data structure
export interface DailyReportData {
	dates: DateGroup[];
}

// Interface for the date group structure
export interface DateGroup {
	date: string;
	employees: Array<{
		employee: Employee;
		activity: IActivityItem | IActivityItem[];
	}>;
}
