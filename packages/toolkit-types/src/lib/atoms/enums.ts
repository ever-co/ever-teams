export enum TimerSource {
	'MOBILE' = 'MOBILE',
	'BROWSER' = 'BROWSER',
	'DESKTOP' = 'DESKTOP',
	'BROWSER_EXTENSION' = 'BROWSER_EXTENSION',
	'HUBSTAFF' = 'HUBSTAFF',
	'UPWORK' = 'UPWORK',
	'TEAMS' = 'TEAMS',
	'CLOC' = 'CLOC',
	// A timer embedded in another product through this kit. APIs that predate it refuse it (see the timer requests).
	'EMBED' = 'EMBED'
}

export enum LogType {
	TRACKED = 'TRACKED',
	MANUAL = 'MANUAL',
	IDLE = 'IDLE',
	RESUMED = 'RESUMED'
}
