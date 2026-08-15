import { getNextPublicEnv } from './env';

export const PROTECTED_APP_URL_PATHS: RegExp[] = [
	/^\/$/,
	/^(\/profile(\/)?)(.*)$/,
	/^(\/settings(\/)?)(.*)$/,
	/^(\/task(\/)?)(.*)$/,
	/^(\/meet(\/)?)(.*)$/,
	/^(\/board(\/)?)(.*)$/
];

// Cookies
export const TOKEN_COOKIE_NAME = 'auth-token';
export const REFRESH_TOKEN_COOKIE_NAME = 'auth-refresh-token';

export const COOKIE_DOMAINS = getNextPublicEnv('NEXT_PUBLIC_API_URL_PREFIX', {
	default: 'ever.team',
	map(value) {
		return value?.split(',').map((d) => d.trim()) || [];
	}
});

export enum TimeFormat {
	DEFAULT = 'default',
	COMPACT = 'compact',
	HOURS_MINUTES = 'hours_minutes',
	WORDS = 'words',
	MINIMAL = 'minimal'
}

export interface TimeFormatProps {
	format?: TimeFormat;
}
