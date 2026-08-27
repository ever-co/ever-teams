export function getMyWorkNavigation(userId?: string, username?: string) {
	return {
		timeAndActivity: '/reports/time-and-activity',
		workDiary: userId
			? `/reports/timesheet/${userId}?name=${encodeURIComponent(username || '')}`
			: '/reports/timesheet'
	};
}
