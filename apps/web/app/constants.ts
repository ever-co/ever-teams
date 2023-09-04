import { I_SMTPRequest } from './interfaces/ISmtp';

export const API_BASE_URL = '/api';
export const DEFAULT_APP_PATH = '/auth/team';
export const DEFAULT_MAIN_PATH = '/';
export const PROTECTED_APP_URL_PATHS: RegExp[] = [
	/^\/$/,
	/^(\/profile(\/)?)(.*)$/,
	/^(\/settings(\/)?)(.*)$/,
	/^(\/task(\/)?)(.*)$/,
	/^(\/call(\/)?)(.*)$/,
	/^(\/whiteboard(\/)?)(.*)$/,
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

// Recaptcha
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;

export const GAUZY_API_SERVER_URL = process.env.GAUZY_API_SERVER_URL;
export const INVITE_CALLBACK_URL = process.env.INVITE_CALLBACK_URL;
export const INVITE_CALLBACK_PATH = '/auth/passcode';
export const VERIFY_EMAIL_CALLBACK_URL = process.env.VERIFY_EMAIL_CALLBACK_URL;
export const VERIFY_EMAIL_CALLBACK_PATH = '/verify-email';

export const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || '';
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = process.env.SMTP_PORT || '';
export const SMTP_SECURE = process.env.SMTP_SECURE || '';
export const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
export const DISABLE_AUTO_REFRESH =
	process.env.NEXT_PUBLIC_DISABLE_AUTO_REFRESH === 'true';

export const APP_NAME = process.env.APP_NAME || 'Ever Teams';
export const APP_SIGNATURE = process.env.APP_SIGNATURE || 'Ever Teams';
export const APP_LOGO_URL =
	process.env.APP_LOGO_URL || 'https://app.ever.team/assets/gauzy-team.png';
export const APP_LINK = process.env.APP_LINK || 'https://ever.team/';

export const CHARACTER_LIMIT_TO_SHOW = 20;
export const smtpConfiguration: () => I_SMTPRequest = () => ({
	fromAddress: SMTP_FROM_ADDRESS,
	host: SMTP_HOST,
	port: parseInt(SMTP_PORT, 10) || 0,
	secure: SMTP_SECURE === 'true' ? true : false,
	username: SMTP_USERNAME,
	password: SMTP_PASSWORD,
});

// JITSI Constants
export const JITSI_DOMAIN =
	process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
export const JITSI_JWT_APP_ID = process.env.JITSI_JWT_APP_ID;
export const JITSI_JWT_APP_SECRET = process.env.JITSI_JWT_APP_SECRET;
export const JITSI_JWT_TOKEN_COOKIE_NAME = 'jitsi-jwt-session';
