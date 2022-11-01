export const API_BASE_URL = "/api";
export const DEFAULT_APP_PATH = "/";
export const DEFAULT_MAIN_PATH = "/main";
export const PROTECTED_APP_URL_PATHS = ["/main"];

export const TOKEN_COOKIE_NAME = "auth-token";
export const REFRESH_TOKEN_COOKIE_NAME = "auth-refresh-token";
export const ACTIVE_TEAM_COOKIE_NAME = "auth-active-team";
export const TENANT_ID_COOKIE_NAME = "auth-tenant-id";
export const ORGANIZATION_ID_COOKIE_NAME = "auth-organization-id";

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;

export const GAUZY_API_SERVER_URL = process.env.GAUZY_API_SERVER_URL;
