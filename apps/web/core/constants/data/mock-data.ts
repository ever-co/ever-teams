export const chartData = [
	{
		date: 'Mon',
		tracked: 4000,
		manual: 2400,
		idle: 2400
	},
	{
		date: 'Tue',
		tracked: 3000,
		manual: 1398,
		idle: 2210
	},
	{
		date: 'Wed',
		tracked: 2000,
		manual: 9800,
		idle: 2290
	},
	{
		date: 'Thu',
		tracked: 2780,
		manual: 3908,
		idle: 2000
	},
	{
		date: 'Fri',
		tracked: 1890,
		manual: 4800,
		idle: 2181
	},
	{
		date: 'Sat',
		tracked: 2390,
		manual: 3800,
		idle: 2500
	},
	{
		date: 'Sun',
		tracked: 3490,
		manual: 4300,
		idle: 2100
	}
];

export const members = [
	{
		name: 'Elanor Pena',
		avatar: '/avatars/01.png',
		trackedTime: '8h 12m',
		manualTime: '1h 5m',
		idleTime: '45m',
		unknownActivity: '15m',
		activityLevel: '85%'
	},
	{
		name: 'Devon Lane',
		avatar: '/avatars/02.png',
		trackedTime: '7h 30m',
		manualTime: '2h 15m',
		idleTime: '30m',
		unknownActivity: '10m',
		activityLevel: '45%'
	},
	{
		name: 'Brooklyn Simmons',
		avatar: '/avatars/03.png',
		trackedTime: '6h 45m',
		manualTime: '1h 30m',
		idleTime: '1h',
		unknownActivity: '20m',
		activityLevel: '15%'
	}
];

/**
 * Default colors for task labels when no color is provided
 */
export const DEFAULT_LABEL_COLORS = [
	'#3B82F6', // Blue
	'#10B981', // Green
	'#F59E0B', // Yellow
	'#EF4444', // Red
	'#8B5CF6', // Purple
	'#06B6D4', // Cyan
	'#F97316', // Orange
	'#84CC16', // Lime
	'#EC4899', // Pink
	'#6B7280' // Gray (fallback)
];

export const DEFAULT_USER_IMAGE_URL = '/default-user-avatar.svg';
