import { ITeamsSession } from '@ever-teams/toolkit-types';
import moment from 'moment-timezone';

export const timeZones: string[] = moment.tz.names().map((tz) => tz.replace(/_/g, ' '));

export const timeZonesWithOffset: string[] = [
	'America/Anchorage (UTC -09:00)',
	'America/Los_Angeles (UTC -08:00)',
	'America/Denver (UTC -07:00)',
	'America/Phoenix (UTC -07:00)',
	'America/Chicago (UTC -06:00)',
	'America/Mexico_City (UTC -06:00)',
	'America/New_York (UTC -05:00)',
	'America/Toronto (UTC -04:00)',
	'America/Argentina/Buenos_Aires (UTC -03:00)',
	'America/Sao_Paulo (UTC -03:00)',
	'Europe/London (UTC +00:00)',
	'Africa/Abidjan (UTC +00:00)',
	'Africa/Dakar (UTC +00:00)',
	'Europe/Amsterdam (UTC +01:00)',
	'Europe/Brussels (UTC +01:00)',
	'Europe/Madrid (UTC +01:00)',
	'Europe/Paris (UTC +01:00)',
	'Africa/Lagos (UTC +01:00)',
	'Africa/Cairo (UTC +02:00)',
	'Africa/Johannesburg (UTC +02:00)',
	'Africa/Kigali (UTC +02:00)',
	'Europe/Moscow (UTC +03:00)',
	'Africa/Nairobi (UTC +03:00)',
	'Asia/Dubai (UTC +04:00)',
	'Asia/Kolkata (UTC +05:30)',
	'Asia/Bangkok (UTC +07:00)',
	'Asia/Kuala_Lumpur (UTC +08:00)',
	'Asia/Manila (UTC +08:00)',
	'Asia/Shanghai (UTC +08:00)',
	'Asia/Singapore (UTC +08:00)',
	'Asia/Seoul (UTC +09:00)',
	'Asia/Tokyo (UTC +09:00)',
	'Australia/Sydney (UTC +10:00)',
	'Pacific/Auckland (UTC +12:00)'
];

/**
 * Utility function to get the user's timezone with fallback priority
 * 1. User's timezone from user.timeZone if valid
 * 2. Browser's detected timezone
 * 3. UTC as final fallback
 */
export const getUserTimezone = (userTimezone?: string): string => {
	// First priority: Use user.timezone if it exists and is valid
	if (userTimezone) {
		// Extract timezone name from format like "America/New_York (UTC -05:00)"
		const timezoneMatch = userTimezone.match(/^([^(]+)/);
		const extractedTimezone = timezoneMatch ? timezoneMatch[1].trim() : userTimezone;

		// Validate if the timezone is recognized by moment-timezone
		if (moment.tz.zone(extractedTimezone)) {
			return extractedTimezone;
		}
	}

	// Second priority: Browser's detected timezone
	try {
		const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (moment.tz.zone(browserTimezone)) {
			return browserTimezone;
		}
	} catch (error) {
		console.warn('Failed to detect browser timezone:', error);
	}

	// Fallback: UTC
	return 'UTC';
};

/**
 * Converts a UTC date string to the specified timezone
 * Returns the original date if conversion fails
 */
export const convertUtcToTimezone = (utcDateString: string, timezone: string): string => {
	try {
		if (!utcDateString || !timezone) {
			return utcDateString;
		}

		// Parse the UTC date and convert to target timezone
		const convertedDate = moment.utc(utcDateString).tz(timezone);

		// Return in ISO format to maintain consistency
		return convertedDate.toISOString();
	} catch (error) {
		console.warn(`Failed to convert date ${utcDateString} to timezone ${timezone}:`, error);
		return utcDateString;
	}
};

/**
 * Converts all date fields in a session from UTC to the specified timezone
 */
export const convertSessionDatesToTimezone = (session: ITeamsSession, timezone: string): ITeamsSession => {
	try {
		// Convert payload timestamps if they exist
		const convertedPayloads =
			session.session.payloads?.map((payload) => ({
				...payload,
				timestamp: convertUtcToTimezone(payload.timestamp, timezone)
			})) || [];

		return {
			...session,
			session: {
				...session.session,
				createdAt: convertUtcToTimezone(session.session.createdAt, timezone),
				updatedAt: convertUtcToTimezone(session.session.updatedAt, timezone),
				startTime: convertUtcToTimezone(session.session.startTime, timezone),
				lastActivity: convertUtcToTimezone(session.session.lastActivity, timezone),
				payloads: convertedPayloads
			}
		};
	} catch (error) {
		console.warn('Failed to convert session dates to timezone:', error);
		return session;
	}
};
