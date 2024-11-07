import { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import { I_SMTPRequest } from './interfaces/ISmtp';
import { getNextPublicEnv } from './env';
import enLanguage from '../locales/en.json';
import { BG, CN, DE, ES, FR, IS, IT, NL, PL, PT, RU, SA, US } from 'country-flag-icons/react/1x1';
import { ManualTimeReasons } from './interfaces/timer/IManualTimeReasons';
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
export const RECAPTCHA_SITE_KEY = getNextPublicEnv(
	'NEXT_PUBLIC_CAPTCHA_SITE_KEY',
	process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY
);
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;
const basePath = process.env.GAUZY_API_SERVER_URL ? process.env.GAUZY_API_SERVER_URL : 'https://api.ever.team';
export const GAUZY_API_SERVER_URL = basePath + '/api';

export const GAUZY_API_BASE_SERVER_URL = getNextPublicEnv(
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
);

// Invite
export const INVITE_CALLBACK_URL = process.env.INVITE_CALLBACK_URL || 'https://app.ever.team/auth/passcode';
export const INVITE_CALLBACK_PATH = '/auth/passcode';
export const VERIFY_EMAIL_CALLBACK_URL = process.env.VERIFY_EMAIL_CALLBACK_URL || 'https://app.ever.team/verify-email';
export const VERIFY_EMAIL_CALLBACK_PATH = '/verify-email';
export const GA_MEASUREMENT_ID = getNextPublicEnv(
	'NEXT_PUBLIC_GA_MEASUREMENT_ID',
	process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
);

// Chatwoot
export const CHATWOOT_API_KEY = getNextPublicEnv(
	'NEXT_PUBLIC_CHATWOOT_API_KEY',
	process.env.NEXT_PUBLIC_CHATWOOT_API_KEY
);

export const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || 'noreply@ever.team';
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = process.env.SMTP_PORT || '';
export const SMTP_SECURE = process.env.SMTP_SECURE || '';
export const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
export const DISABLE_AUTO_REFRESH = getNextPublicEnv('NEXT_PUBLIC_DISABLE_AUTO_REFRESH', {
	default: process.env.NEXT_PUBLIC_DISABLE_AUTO_REFRESH,
	map(value) {
		return value === 'true';
	}
});

export const APP_NAME = process.env.APP_NAME || 'Ever Teams';
export const APP_SIGNATURE = process.env.APP_SIGNATURE || 'Ever Teams';
export const APP_LOGO_URL = process.env.APP_LOGO_URL || 'https://app.ever.team/assets/ever-teams.png';
export const APP_LINK = process.env.APP_LINK || 'https://ever.team/';
export const APP_SLOGAN_TEXT = process.env.APP_SLOGAN_TEXT || 'Real-Time Clarity, Real-Time Reality™.';

export const COMPANY_NAME = process.env.COMPANY_NAME || 'Ever Co. LTD';
export const COMPANY_LINK = process.env.COMPANY_LINK || 'https://ever.co';

export const TERMS_LINK = process.env.TERMS_LINK || 'https://ever.team/tos';
export const PRIVACY_POLICY_LINK = process.env.PRIVACY_POLICY_LINK || 'https://ever.team/privacy';

export const MAIN_PICTURE = process.env.MAIN_PICTURE || '/assets/cover/auth-bg-cover.png';
export const MAIN_PICTURE_DARK = process.env.MAIN_PICTURE_DARK || '/assets/cover/auth-bg-cover-dark.png';

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
export const COOKIE_DOMAINS = getNextPublicEnv('NEXT_PUBLIC_COOKIE_DOMAINS', {
	default: process.env.NEXT_PUBLIC_COOKIE_DOMAINS || 'ever.team',
	map(value) {
		return value?.split(',').map((d) => d.trim()) || [];
	}
});

// MEET Constants
export const MEET_DOMAIN = getNextPublicEnv(
	'NEXT_PUBLIC_MEET_DOMAIN',
	process.env.NEXT_PUBLIC_MEET_DOMAIN || 'meet.ever.team'
);
export const MEET_JWT_APP_ID = process.env.MEET_JWT_APP_ID || 'ever_teams';
export const MEET_JWT_APP_SECRET = process.env.MEET_JWT_APP_SECRET;
export const MEET_JWT_TOKEN_COOKIE_NAME = 'meet-jwt-session';

// BOARD board
export const BOARD_APP_DOMAIN = getNextPublicEnv(
	'NEXT_PUBLIC_BOARD_APP_DOMAIN',
	process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN || 'https://board.ever.team'
);

export const BOARD_BACKEND_POST_URL = getNextPublicEnv(
	'NEXT_PUBLIC_BOARD_BACKEND_POST_URL',
	process.env.NEXT_PUBLIC_BOARD_BACKEND_POST_URL || 'https://jsonboard.ever.team/api/v2/post/'
);
export const BOARD_FIREBASE_CONFIG = getNextPublicEnv(
	'NEXT_PUBLIC_BOARD_FIREBASE_CONFIG',
	process.env.NEXT_PUBLIC_BOARD_FIREBASE_CONFIG
);

export const POSTHOG_KEY = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_KEY', process.env.NEXT_PUBLIC_POSTHOG_KEY);

export const POSTHOG_HOST = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_HOST', process.env.NEXT_PUBLIC_POSTHOG_HOST);

// Jitsu
export const jitsuConfiguration: () => JitsuOptions = () => ({
	host: getNextPublicEnv('NEXT_PUBLIC_JITSU_BROWSER_URL', process.env.NEXT_PUBLIC_JITSU_BROWSER_URL).value,
	writeKey: getNextPublicEnv('NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY', process.env.NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY)
		.value,
	// if enabled - events will be sent to the console but no data sent to Jitsu.
	// Strange this is not mentioned in the documentation https://github.com/jitsucom/jitsu/blob/35c4ecaff54d61a87853381cb17262b7bfbd4a6e/libs/jitsu-js/src/jitsu.ts#L40
	echoEvents: false,
	debug: false
});

// Github Integration
export const GITHUB_APP_NAME = getNextPublicEnv(
	'NEXT_PUBLIC_GITHUB_APP_NAME',
	process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'ever-github'
);

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

export const APPLICATION_DEFAULT_LANGUAGE = 'en';

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
export type Languages = typeof enLanguage;
export enum ActivityFilters {
	TASKS = 'Tasks',
	SCREENSHOOTS = 'Screenshots',
	APPS = 'Apps',
	VISITED_SITES = 'Visited Sites'
}

export enum KanbanTabs {
	TODAY = 'TODAY',
	YESTERDAY = 'YESTERDAY',
	TOMORROW = 'TOMORROW'
}

export enum IssuesView {
	CARDS = 'CARDS',
	TABLE = 'TABLE',
	BLOCKS = 'BLOCKS',
	KANBAN = 'KANBAN'
}

export const TaskStatus = {
	INPROGRESS: 'in-progress'
};

export const tasksStatusSvgCacheDuration = 1000 * 60 * 60;

export const languagesFlags = [
	{
		Flag: US,
		country: 'United Kingdom',
		code: 'en'
	},
	{
		Flag: CN,
		country: 'China',
		code: 'zh'
	},
	{
		Flag: ES,
		country: 'Spain',
		code: 'es'
	},
	{
		Flag: RU,
		country: 'Russia',
		code: 'ru'
	},
	{
		Flag: PT,
		country: 'Portugal',
		code: 'pt'
	},
	{
		Flag: IT,
		country: 'Italy',
		code: 'it'
	},
	{
		Flag: DE,
		country: 'Germany',
		code: 'de'
	},
	{
		Flag: BG,
		country: 'Bulgaria',
		code: 'bg'
	},
	{
		Flag: SA,
		country: 'Saudi Arabia',
		code: 'ar'
	},
	{
		Flag: NL,
		country: 'Netherlands',
		code: 'nl'
	},
	{
		Flag: FR,
		country: 'France',
		code: 'fr'
	},
	{
		Flag: PL,
		country: 'Poland',
		code: 'pl'
	},
	{
		Flag: IS,
		country: 'Israel',
		code: 'he'
	}
];

// Local storage keys
export const LAST_WORSPACE_AND_TEAM = 'last-workspace-and-team';
export const USER_SAW_OUTSTANDING_NOTIFICATION = 'user-saw-notif';
export const DAILY_PLAN_SUGGESTION_MODAL_DATE = 'daily-plan-suggestion-modal-date';
export const TASKS_ESTIMATE_HOURS_MODAL_DATE = 'tasks-estimate-hours-modal-date';
export const DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE = 'daily-plan-estimate-hours-modal';
export const DEFAULT_PLANNED_TASK_ID = 'default-planned-task-id';
export const LAST_OPTION__CREATE_DAILY_PLAN_MODAL = 'last-option--create-daily-plan-modal';
export const HAS_VISITED_OUTSTANDING_TASKS = 'has-visited-outstanding-tasks';
export const HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL = 'has-seen-daily-plan-suggestion-modal';

// OAuth provider's keys

export const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
export const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;

export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
export const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

export const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
export const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
export const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

export const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
export const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

export const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
export const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

// Add manual timer reason

export const manualTimeReasons: ManualTimeReasons[] = [
	'LOST_ELECTRICITY',
	'LOST_INTERNET',
	'FORGOT_TO_START_TIMER',
	'ERROR',
	'UNPLANNED_WORK',
	'TESTED_TIMER'
];

export const statusOptions = [
	{ value: 'Approved', label: 'Approved' },
	{ value: 'Pending', label: 'Pending' },
	{ value: 'Rejected', label: 'Rejected' }
];
