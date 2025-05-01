import { IActivityReportGroupByDate } from '@/core/types/interfaces/activity/IActivityReport';
import { ProjectGroups, DateGroup, DailyReportData } from './types';

export const formatDuration = (seconds: number | string): string => {
	let totalSeconds: number;

	if (typeof seconds === 'string') {
		totalSeconds = parseInt(seconds);
	} else {
		totalSeconds = seconds;
	}

	if (isNaN(totalSeconds) || totalSeconds < 0) {
		console.warn('Invalid time value:', seconds);
		return '00:00:00';
	}

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainingSeconds = totalSeconds % 60;

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const groupActivitiesByProjectAndDate = (data: IActivityReportGroupByDate[]): ProjectGroups => {
	const reportData: DailyReportData[] = data as any;

	if (!Array.isArray(reportData)) {
		console.warn('reportData must be an array');
		return {} as ProjectGroups;
	}

	const projectGroups: ProjectGroups = {};

	reportData.forEach((dayData) => {
		if (!dayData.dates || !Array.isArray(dayData.dates)) {
			console.warn('Invalid data structure for dayData:', dayData);
			return;
		}

		dayData.dates.forEach((dateGroup: DateGroup) => {
			if (!dateGroup?.date || !Array.isArray(dateGroup.employees)) {
				console.warn('Invalid date group structure:', dateGroup);
				return;
			}

			const date = new Date(dateGroup.date).toISOString().split('T')[0];

			dateGroup.employees.forEach((employeeData) => {
				if (!employeeData?.employee || !employeeData.activity) {
					return;
				}

				const activities = Array.isArray(employeeData.activity)
					? employeeData.activity
					: [employeeData.activity];

				activities.forEach((activity) => {
					if (!activity) return;

					const projectName = activity.project?.name || 'No Project';

					if (!projectGroups[projectName]) {
						projectGroups[projectName] = {};
					}

					if (!projectGroups[projectName][date]) {
						projectGroups[projectName][date] = {
							activities: [],
							totalDuration: 0,
							members: new Set<string>()
						};
					}

					const dateGroup = projectGroups[projectName][date];
					const employee = employeeData.employee;

					if (!employee?.id) {
						console.warn('Invalid employee data:', employee);
						return;
					}

					const duration =
						typeof activity.duration === 'number' ? activity.duration : parseInt(activity.duration || '0');

					if (isNaN(duration)) {
						console.warn('Invalid duration value:', activity.duration);
						return;
					}

					dateGroup.activities.push({
						employee: {
							id: employee.id,
							fullName: employee.fullName || 'Unknown',
							user: {
								imageUrl: employee.user?.imageUrl
							}
						},
						activity: {
							...activity,
							duration
						}
					});

					dateGroup.totalDuration += duration;
					dateGroup.members.add(employee.id);
				});
			});
		});
	});

	return projectGroups;
};
