import { I_SMTPRequest } from './interfaces/ISmtp';

export const API_BASE_URL = '/api';
export const DEFAULT_APP_PATH = '/';
export const DEFAULT_MAIN_PATH = '/main';
export const PROTECTED_APP_URL_PATHS = ['/main', '/profile'];

export const TOKEN_COOKIE_NAME = 'auth-token';
export const REFRESH_TOKEN_COOKIE_NAME = 'auth-refresh-token';
export const ACTIVE_TEAM_COOKIE_NAME = 'auth-active-team';
export const ACTIVE_TASK_COOKIE_NAME = 'auth-active-task';
export const TENANT_ID_COOKIE_NAME = 'auth-tenant-id';
export const ORGANIZATION_ID_COOKIE_NAME = 'auth-organization-id';

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;

export const GAUZY_API_SERVER_URL = process.env.GAUZY_API_SERVER_URL;
export const INVITE_CALLBACK_URL = process.env.INVITE_CALLBACK_URL;

export const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || '';
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = process.env.SMTP_PORT || '';
export const SMTP_SECURE = process.env.SMTP_SECURE || '';
export const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

export const smtpConfiguration: () => I_SMTPRequest = () => ({
	fromAddress: SMTP_FROM_ADDRESS,
	host: SMTP_HOST,
	port: parseInt(SMTP_PORT, 10) || 0,
	secure: SMTP_SECURE === 'true' ? true : false,
	username: SMTP_USERNAME,
	password: SMTP_PASSWORD,
});
