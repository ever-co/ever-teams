import { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import { I_SMTPRequest } from './interfaces/ISmtp';

export const API_BASE_URL = '/api';
export const DEFAULT_APP_PATH = '/auth/passcode';
export const DEFAULT_MAIN_PATH = '/';
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
export const ACTIVE_TEAM_COOKIE_NAME = 'auth-active-team';
export const ACTIVE_TASK_COOKIE_NAME = 'auth-active-task';
export const ACTIVE_USER_TASK_COOKIE_NAME = 'auth-user-active-task';
export const ACTIVE_USER_ID_COOKIE_NAME = 'auth-user-id';
export const TENANT_ID_COOKIE_NAME = 'auth-tenant-id';
export const ORGANIZATION_ID_COOKIE_NAME = 'auth-organization-id';
export const ACTIVE_LANGUAGE_COOKIE_NAME = 'auth-active-language';
export const ACTIVE_TIMEZONE_COOKIE_NAME = 'auth-timezone';
export const NO_TEAM_POPUP_SHOW_COOKIE_NAME = 'no-team-popup-show';
export const ACTIVE_PROJECT_COOKIE_NAME = 'auth-active-project';

// Recaptcha
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;

export const GAUZY_API_SERVER_URL = process.env.GAUZY_API_SERVER_URL || 'https://api.gauzy.co/api';

export const INVITE_CALLBACK_URL = process.env.INVITE_CALLBACK_URL || 'https://app.ever.team/auth/passcode';
export const INVITE_CALLBACK_PATH = '/auth/passcode';
export const VERIFY_EMAIL_CALLBACK_URL = process.env.VERIFY_EMAIL_CALLBACK_URL || 'https://app.ever.team/verify-email';
export const VERIFY_EMAIL_CALLBACK_PATH = '/verify-email';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || 'noreply@ever.team';
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = process.env.SMTP_PORT || '';
export const SMTP_SECURE = process.env.SMTP_SECURE || '';
export const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
export const DISABLE_AUTO_REFRESH = process.env.NEXT_PUBLIC_DISABLE_AUTO_REFRESH === 'true';

export const APP_NAME = process.env.APP_NAME || 'Ever Teams';
export const APP_SIGNATURE = process.env.APP_SIGNATURE || 'Ever Teams';
export const APP_LOGO_URL = process.env.APP_LOGO_URL || 'https://app.ever.team/assets/ever-teams.png';
export const APP_LINK = process.env.APP_LINK || 'https://ever.team/';

export const CHARACTER_LIMIT_TO_SHOW = 20;

export const smtpConfiguration: () => I_SMTPRequest = () => ({
	fromAddress: SMTP_FROM_ADDRESS,
	host: SMTP_HOST,
	port: parseInt(SMTP_PORT, 10) || 0,
	secure: SMTP_SECURE === 'true' ? true : false,
	username: SMTP_USERNAME,
	password: SMTP_PASSWORD
});

// Cookies
export const COOKIE_DOMAINS = (process.env.NEXT_PUBLIC_COOKIE_DOMAINS || 'ever.team').split(',').map((d) => d.trim());

// MEET Constants
export const MEET_DOMAIN = process.env.NEXT_PUBLIC_MEET_DOMAIN || 'meet.ever.team';
export const MEET_JWT_APP_ID = process.env.MEET_JWT_APP_ID || 'ever_teams';
export const MEET_JWT_APP_SECRET = process.env.MEET_JWT_APP_SECRET;
export const MEET_JWT_TOKEN_COOKIE_NAME = 'meet-jwt-session';

// BOARD board
export const BOARD_APP_DOMAIN = process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN || 'https://board.ever.team';
export const BOARD_BACKEND_POST_URL =
	process.env.NEXT_PUBLIC_BOARD_BACKEND_POST_URL || 'https://jsonboard.ever.team/api/v2/post/';
export const BOARD_FIREBASE_CONFIG = process.env.NEXT_PUBLIC_BOARD_FIREBASE_CONFIG;

// Jitsu
export const jitsuConfiguration: () => JitsuOptions = () => ({
	host: process.env.NEXT_PUBLIC_JITSU_BROWSER_URL || '',
	writeKey: process.env.NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY || '',
	// if enabled - events will be sent to the console but no data sent to Jitsu.
	// Strange this is not mentioned in the documentation https://github.com/jitsucom/jitsu/blob/35c4ecaff54d61a87853381cb17262b7bfbd4a6e/libs/jitsu-js/src/jitsu.ts#L40
	echoEvents: false,
	debug: false
});

// Github Integration
export const GITHUB_APP_NAME = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'ever-github';

// Application Languages
export const APPLICATION_LANGUAGES = [
	'English',
	'French',
	'Arabic',
	'Bulgaria',
	'Chinese',
	'Dutch',
	'German',
	'Hebrew',
	'Portuguese',
	'Russian',
	'Spanish'
];
export const APPLICATION_LANGUAGES_CODE = [
	'en',
	'fr',
	'ar',
	'bg',
	'zh',
	'nl',
	'de',
	'he',
	'it',
	'pl',
	'pt',
	'ru',
	'es'
];

export enum IssuesView {
	CARDS = 'CARDS',
	TABLE = 'TABLE',
	BLOCKS = 'BLOCKS'
}
