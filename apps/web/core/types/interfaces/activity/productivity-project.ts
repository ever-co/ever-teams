import { IEmployee } from '../organization/employee';
import { IOrganizationTeamEmployee } from '../team/organization-team-employee';
import { IActivityItem } from './activity-report';

export interface ActivityData {
	employee: IOrganizationTeamEmployee & { fullName: string; user: { imageUrl?: string | null } };
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
	employee: IEmployee;
	activity: IActivityItem;
}

export interface ProgressBarProps {
	percentage: number;
	className?: string;
}

// Interface for the daily report data structure
export interface DailyReportData {
	dates: DateGroup[];
}

// Interface for the date group structure
export interface DateGroup {
	date: string;
	employees: Array<{
		employee: IEmployee;
		activity: IActivityItem | IActivityItem[];
	}>;
}
