export interface IActivityStat {
	duration: string;
	durationPercentage: number;
	sessions: string;
	title: string;
}

export type IActivitiesStats = IActivityStat[];
