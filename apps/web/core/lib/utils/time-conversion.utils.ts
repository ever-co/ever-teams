/**
 * Time conversion utilities for working with different time units
 */

/**
 * Convert seconds to milliseconds
 * 
 * @example
 * secondsToMs(5) // 5000
 * secondsToMs(1.5) // 1500
 * 
 * @param seconds Time in seconds
 * @returns Time in milliseconds
 */
export function secondsToMs(seconds: number): number {
	return seconds * 1000;
}

/**
 * Convert milliseconds to seconds
 * 
 * @example
 * msToSeconds(5000) // 5
 * msToSeconds(1500) // 1.5
 * 
 * @param ms Time in milliseconds
 * @returns Time in seconds
 */
export function msToSeconds(ms: number): number {
	return ms / 1000;
}

/**
 * Convert minutes to seconds
 * 
 * @example
 * minutesToSeconds(5) // 300
 * minutesToSeconds(1.5) // 90
 * 
 * @param minutes Time in minutes
 * @returns Time in seconds
 */
export function minutesToSeconds(minutes: number): number {
	return minutes * 60;
}

/**
 * Convert seconds to minutes
 * 
 * @example
 * secondsToMinutes(300) // 5
 * secondsToMinutes(90) // 1.5
 * 
 * @param seconds Time in seconds
 * @returns Time in minutes
 */
export function secondsToMinutes(seconds: number): number {
	return seconds / 60;
}

/**
 * Convert hours to minutes
 * 
 * @example
 * hoursToMinutes(2) // 120
 * hoursToMinutes(1.5) // 90
 * 
 * @param hours Time in hours
 * @returns Time in minutes
 */
export function hoursToMinutes(hours: number): number {
	return hours * 60;
}

/**
 * Convert minutes to hours
 * 
 * @example
 * minutesToHours(120) // 2
 * minutesToHours(90) // 1.5
 * 
 * @param minutes Time in minutes
 * @returns Time in hours
 */
export function minutesToHours(minutes: number): number {
	return minutes / 60;
}

/**
 * Convert hours to seconds
 * 
 * @example
 * hoursToSeconds(1) // 3600
 * hoursToSeconds(0.5) // 1800
 * 
 * @param hours Time in hours
 * @returns Time in seconds
 */
export function hoursToSeconds(hours: number): number {
	return hours * 3600;
}

/**
 * Convert seconds to hours
 * 
 * @example
 * secondsToHours(3600) // 1
 * secondsToHours(1800) // 0.5
 * 
 * @param seconds Time in seconds
 * @returns Time in hours
 */
export function secondsToHours(seconds: number): number {
	return seconds / 3600;
}

/**
 * Convert days to hours
 * 
 * @example
 * daysToHours(2) // 48
 * daysToHours(0.5) // 12
 * 
 * @param days Time in days
 * @returns Time in hours
 */
export function daysToHours(days: number): number {
	return days * 24;
}

/**
 * Convert hours to days
 * 
 * @example
 * hoursToDays(48) // 2
 * hoursToDays(12) // 0.5
 * 
 * @param hours Time in hours
 * @returns Time in days
 */
export function hoursToDays(hours: number): number {
	return hours / 24;
}

/**
 * Format seconds to HH:MM:SS
 * 
 * @example
 * formatSecondsToTime(3661) // '01:01:01'
 * formatSecondsToTime(125) // '00:02:05'
 * formatSecondsToTime(0) // '00:00:00'
 * 
 * @param seconds Total seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatSecondsToTime(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	
	return [hrs, mins, secs]
		.map(val => val.toString().padStart(2, '0'))
		.join(':');
}

/**
 * Format milliseconds to HH:MM:SS
 * 
 * @example
 * formatMsToTime(3661000) // '01:01:01'
 * formatMsToTime(125000) // '00:02:05'
 * 
 * @param ms Total milliseconds
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatMsToTime(ms: number): string {
	return formatSecondsToTime(msToSeconds(ms));
}

/**
 * Parse time string (HH:MM:SS or MM:SS) to seconds
 * 
 * @example
 * parseTimeToSeconds('01:30:45') // 5445
 * parseTimeToSeconds('05:30') // 330
 * parseTimeToSeconds('invalid') // 0
 * 
 * @param time Time string to parse
 * @returns Total seconds
 */
export function parseTimeToSeconds(time: string): number {
	const parts = time.split(':').map(p => parseInt(p, 10));
	
	if (parts.some(isNaN)) return 0;
	
	if (parts.length === 3) {
		const [hrs, mins, secs] = parts;
		return hrs * 3600 + mins * 60 + secs;
	} else if (parts.length === 2) {
		const [mins, secs] = parts;
		return mins * 60 + secs;
	}
	
	return 0;
}
