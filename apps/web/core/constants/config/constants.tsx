import { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import { I_SMTPRequest } from '@/core/types/interfaces/auth/custom-smtp';
import { getNextPublicEnv, getServerRuntimeConfig } from '@/env-config';
import enLanguage from '@/locales/en.json';
import { BG, CN, DE, ES, FR, IS, IT, NL, PL, PT, RU, SA, US } from 'country-flag-icons/react/1x1';
import { EManualTimeReasons } from '@/core/types/generics/enums/timer';

export const BREAKPOINTS = {
	MOBILE: 768
};
type RoleName =
	| 'SUPER_ADMIN'
	| 'ADMIN'
	| 'DATA_ENTRY'
	| 'EMPLOYEE'
	| 'CANDIDATE'
	| 'MANAGER'
	| 'VIEWER'
	| 'INTERVIEWER';

interface Role {
	isActive: boolean;
	isArchived: boolean;
	name: RoleName;
	isSystem: boolean;
}
type PermissionMap = {
	[K in RoleName]?: RoleName[];
};
export const ROLES: Role[] = [
	{
		isActive: true,
		isArchived: false,
		name: 'SUPER_ADMIN',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'ADMIN',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'DATA_ENTRY',
		isSystem: false
	},
	{
		isActive: true,
		isArchived: false,
		name: 'EMPLOYEE',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'CANDIDATE',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'MANAGER',
		isSystem: false
	},
	{
		isActive: true,
		isArchived: false,
		name: 'VIEWER',
		isSystem: true
	},
	{
		isActive: true,
		isArchived: false,
		name: 'INTERVIEWER',
		isSystem: false
	}
];
export const PERMISSION_ROLES: PermissionMap = {
	MANAGER: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
	DATA_ENTRY: ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY', 'MANAGER'],
	EMPLOYEE: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'MANAGER'],
	CANDIDATE: ['SUPER_ADMIN', 'ADMIN', 'CANDIDATE'],
	INTERVIEWER: ['SUPER_ADMIN', 'ADMIN', 'INTERVIEWER'],
	VIEWER: ['SUPER_ADMIN', 'ADMIN', 'VIEWER']
};
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

export const IS_DESKTOP_APP = process.env.IS_DESKTOP_APP === 'true';

// Recaptcha
export const RECAPTCHA_SITE_KEY = getNextPublicEnv(
	'NEXT_PUBLIC_CAPTCHA_SITE_KEY',
	process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY
);
export const RECAPTCHA_SECRET_KEY = process.env.CAPTCHA_SECRET_KEY;
export const CAPTCHA_TYPE = process.env.NEXT_PUBLIC_CAPTCHA_TYPE;
let basePath = process.env.GAUZY_API_SERVER_URL ? process.env.GAUZY_API_SERVER_URL : 'https://api.ever.team';
if (IS_DESKTOP_APP) {
	const serverRuntimeConfig = getServerRuntimeConfig();
	basePath = serverRuntimeConfig?.GAUZY_API_SERVER_URL || basePath;
}

export const GAUZY_API_SERVER_URL = basePath + '/api';

export const GAUZY_API_BASE_SERVER_URL = getNextPublicEnv(
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL
);

export const ACTIVE_LOCAL_LOG_SYSTEM = getNextPublicEnv(
	'NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM',
	process.env.NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM
) || { value: process.env.ACTIVE_LOCAL_LOG_SYSTEM || true };
export const LOG_FOLDER_MAX_SIZE = getNextPublicEnv(
	'NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE',
	process.env.NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE
) || { value: process.env.LOG_FOLDER_MAX_SIZE || 10 };

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
export const LAST_WORKSPACE_AND_TEAM = 'last-workspace-and-team';
export const USER_SAW_OUTSTANDING_NOTIFICATION = 'user-saw-notif';
export const DAILY_PLAN_SUGGESTION_MODAL_DATE = 'daily-plan-suggestion-modal-date';
export const TASKS_ESTIMATE_HOURS_MODAL_DATE = 'tasks-estimate-hours-modal-date';
export const DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE = 'daily-plan-estimate-hours-modal';
export const DEFAULT_PLANNED_TASK_ID = 'default-planned-task-id';
export const LAST_OPTION__CREATE_DAILY_PLAN_MODAL = 'last-option--create-daily-plan-modal';
export const HAS_VISITED_OUTSTANDING_TASKS = 'has-visited-outstanding-tasks';
export const HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL = 'has-seen-daily-plan-suggestion-modal';
export const LAST_SELECTED_PROJECTS_VIEW = 'last-selected-projects-view';
export const PROJECTS_TABLE_VIEW_LAST_SORTING = 'projects-table-view-last-sorting';

// OAuth provider's keys

export const AUTH_SECRET = process.env.AUTH_SECRET;

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

export const developmentAuthSecret = 'DEFAULT_VALUE_OF_SECRET_FOR_DEVELOPMENT';
export const isDevelopment = process.env.NODE_ENV === 'development';

// Add manual timer reason

export const manualTimeReasons: EManualTimeReasons[] = [
	EManualTimeReasons.LOST_ELECTRICITY,
	EManualTimeReasons.LOST_INTERNET,
	EManualTimeReasons.FORGOT_TO_START_TIMER,
	EManualTimeReasons.ERROR,
	EManualTimeReasons.UNPLANNED_WORK,
	EManualTimeReasons.TESTED_TIMER
];

export const statusOptions = [
	{ value: 'Approved', label: 'Approved' },
	{ value: 'Pending', label: 'Pending' },
	{ value: 'Rejected', label: 'Rejected' }
];

export const DEFAULT_WORK_HOURS_PER_DAY = 8;

export const DEFAULT_CURRENCIES = {
	AFN: 'Afghan Afghani',
	AFA: 'Afghan Afghani (1927\u20132002)',
	ALL: 'Albanian Lek',
	ALK: 'Albanian Lek (1946\u20131965)',
	DZD: 'Algerian Dinar',
	ADP: 'Andorran Peseta',
	AOA: 'Angolan Kwanza',
	AOK: 'Angolan Kwanza (1977\u20131991)',
	AON: 'Angolan New Kwanza (1990\u20132000)',
	AOR: 'Angolan Readjusted Kwanza (1995\u20131999)',
	ARA: 'Argentine Austral',
	ARS: 'Argentine Peso',
	ARM: 'Argentine Peso (1881\u20131970)',
	ARP: 'Argentine Peso (1983\u20131985)',
	ARL: 'Argentine Peso Ley (1970\u20131983)',
	AMD: 'Armenian Dram',
	AWG: 'Aruban Florin',
	AUD: 'Australian Dollar',
	ATS: 'Austrian Schilling',
	AZN: 'Azerbaijani Manat',
	AZM: 'Azerbaijani Manat (1993\u20132006)',
	BSD: 'Bahamian Dollar',
	BHD: 'Bahraini Dinar',
	BDT: 'Bangladeshi Taka',
	BBD: 'Barbadian Dollar',
	BYN: 'Belarusian Ruble',
	BYB: 'Belarusian Ruble (1994\u20131999)',
	BYR: 'Belarusian Ruble (2000\u20132016)',
	BEF: 'Belgian Franc',
	BEC: 'Belgian Franc (convertible)',
	BEL: 'Belgian Franc (financial)',
	BZD: 'Belize Dollar',
	BMD: 'Bermudan Dollar',
	BTN: 'Bhutanese Ngultrum',
	BOB: 'Bolivian Boliviano',
	BOL: 'Bolivian Boliviano (1863\u20131963)',
	BOV: 'Bolivian Mvdol',
	BOP: 'Bolivian Peso',
	BAM: 'Bosnia-Herzegovina Convertible Mark',
	BAD: 'Bosnia-Herzegovina Dinar (1992\u20131994)',
	BAN: 'Bosnia-Herzegovina New Dinar (1994\u20131997)',
	BWP: 'Botswanan Pula',
	BRC: 'Brazilian Cruzado (1986\u20131989)',
	BRZ: 'Brazilian Cruzeiro (1942\u20131967)',
	BRE: 'Brazilian Cruzeiro (1990\u20131993)',
	BRR: 'Brazilian Cruzeiro (1993\u20131994)',
	BRN: 'Brazilian New Cruzado (1989\u20131990)',
	BRB: 'Brazilian New Cruzeiro (1967\u20131986)',
	BRL: 'Brazilian Real',
	GBP: 'British Pound',
	BND: 'Brunei Dollar',
	BGL: 'Bulgarian Hard Lev',
	BGN: 'Bulgarian Lev',
	BGO: 'Bulgarian Lev (1879\u20131952)',
	BGM: 'Bulgarian Socialist Lev',
	BUK: 'Burmese Kyat',
	BIF: 'Burundian Franc',
	XPF: 'CFP Franc',
	KHR: 'Cambodian Riel',
	CAD: 'Canadian Dollar',
	CVE: 'Cape Verdean Escudo',
	KYD: 'Cayman Islands Dollar',
	XAF: 'Central African CFA Franc',
	CLE: 'Chilean Escudo',
	CLP: 'Chilean Peso',
	CLF: 'Chilean Unit of Account (UF)',
	CNX: 'Chinese People\u2019s Bank Dollar',
	CNY: 'Chinese Yuan',
	COP: 'Colombian Peso',
	COU: 'Colombian Real Value Unit',
	KMF: 'Comorian Franc',
	CDF: 'Congolese Franc',
	CRC: 'Costa Rican Col\u00f3n',
	HRD: 'Croatian Dinar',
	HRK: 'Croatian Kuna',
	CUC: 'Cuban Convertible Peso',
	CUP: 'Cuban Peso',
	CYP: 'Cypriot Pound',
	CZK: 'Czech Koruna',
	CSK: 'Czechoslovak Hard Koruna',
	DKK: 'Danish Krone',
	DJF: 'Djiboutian Franc',
	DOP: 'Dominican Peso',
	NLG: 'Dutch Guilder',
	XCD: 'East Caribbean Dollar',
	DDM: 'East German Mark',
	ECS: 'Ecuadorian Sucre',
	ECV: 'Ecuadorian Unit of Constant Value',
	EGP: 'Egyptian Pound',
	GQE: 'Equatorial Guinean Ekwele',
	ERN: 'Eritrean Nakfa',
	EEK: 'Estonian Kroon',
	ETB: 'Ethiopian Birr',
	EUR: 'Euro',
	XEU: 'European Currency Unit',
	FKP: 'Falkland Islands Pound',
	FJD: 'Fijian Dollar',
	FIM: 'Finnish Markka',
	FRF: 'French Franc',
	XFO: 'French Gold Franc',
	XFU: 'French UIC-Franc',
	GMD: 'Gambian Dalasi',
	GEK: 'Georgian Kupon Larit',
	GEL: 'Georgian Lari',
	DEM: 'German Mark',
	GHS: 'Ghanaian Cedi',
	GHC: 'Ghanaian Cedi (1979\u20132007)',
	GIP: 'Gibraltar Pound',
	GRD: 'Greek Drachma',
	GTQ: 'Guatemalan Quetzal',
	GWP: 'Guinea-Bissau Peso',
	GNF: 'Guinean Franc',
	GNS: 'Guinean Syli',
	GYD: 'Guyanaese Dollar',
	HTG: 'Haitian Gourde',
	HNL: 'Honduran Lempira',
	HKD: 'Hong Kong Dollar',
	HUF: 'Hungarian Forint',
	ISK: 'Icelandic Kr\u00f3na',
	ISJ: 'Icelandic Kr\u00f3na (1918\u20131981)',
	INR: 'Indian Rupee',
	IDR: 'Indonesian Rupiah',
	IRR: 'Iranian Rial',
	IQD: 'Iraqi Dinar',
	IEP: 'Irish Pound',
	ILS: 'Israeli New Shekel',
	ILP: 'Israeli Pound',
	ILR: 'Israeli Shekel (1980\u20131985)',
	ITL: 'Italian Lira',
	JMD: 'Jamaican Dollar',
	JPY: 'Japanese Yen',
	JOD: 'Jordanian Dinar',
	KZT: 'Kazakhstani Tenge',
	KES: 'Kenyan Shilling',
	KWD: 'Kuwaiti Dinar',
	KGS: 'Kyrgystani Som',
	LAK: 'Laotian Kip',
	LVL: 'Latvian Lats',
	LVR: 'Latvian Ruble',
	LBP: 'Lebanese Pound',
	LSL: 'Lesotho Loti',
	LRD: 'Liberian Dollar',
	LYD: 'Libyan Dinar',
	LTL: 'Lithuanian Litas',
	LTT: 'Lithuanian Talonas',
	LUL: 'Luxembourg Financial Franc',
	LUC: 'Luxembourgian Convertible Franc',
	LUF: 'Luxembourgian Franc',
	MOP: 'Macanese Pataca',
	MKD: 'Macedonian Denar',
	MKN: 'Macedonian Denar (1992\u20131993)',
	MGA: 'Malagasy Ariary',
	MGF: 'Malagasy Franc',
	MWK: 'Malawian Kwacha',
	MYR: 'Malaysian Ringgit',
	MVR: 'Maldivian Rufiyaa',
	MVP: 'Maldivian Rupee (1947\u20131981)',
	MLF: 'Malian Franc',
	MTL: 'Maltese Lira',
	MTP: 'Maltese Pound',
	MRO: 'Mauritanian Ouguiya',
	MUR: 'Mauritian Rupee',
	MXV: 'Mexican Investment Unit',
	MXN: 'Mexican Peso',
	MXP: 'Mexican Silver Peso (1861\u20131992)',
	MDC: 'Moldovan Cupon',
	MDL: 'Moldovan Leu',
	MCF: 'Monegasque Franc',
	MNT: 'Mongolian Tugrik',
	MAD: 'Moroccan Dirham',
	MAF: 'Moroccan Franc',
	MZE: 'Mozambican Escudo',
	MZN: 'Mozambican Metical',
	MZM: 'Mozambican Metical (1980\u20132006)',
	MMK: 'Myanmar Kyat',
	NAD: 'Namibian Dollar',
	NPR: 'Nepalese Rupee',
	ANG: 'Netherlands Antillean Guilder',
	TWD: 'New Taiwan Dollar',
	NZD: 'New Zealand Dollar',
	NIO: 'Nicaraguan C\u00f3rdoba',
	NIC: 'Nicaraguan C\u00f3rdoba (1988\u20131991)',
	NGN: 'Nigerian Naira',
	KPW: 'North Korean Won',
	NOK: 'Norwegian Krone',
	OMR: 'Omani Rial',
	PKR: 'Pakistani Rupee',
	PAB: 'Panamanian Balboa',
	PGK: 'Papua New Guinean Kina',
	PYG: 'Paraguayan Guarani',
	PEI: 'Peruvian Inti',
	PEN: 'Peruvian Sol',
	PES: 'Peruvian Sol (1863\u20131965)',
	PHP: 'Philippine Peso',
	PLN: 'Polish Zloty',
	PLZ: 'Polish Zloty (1950\u20131995)',
	PTE: 'Portuguese Escudo',
	GWE: 'Portuguese Guinea Escudo',
	QAR: 'Qatari Rial',
	XRE: 'RINET Funds',
	RHD: 'Rhodesian Dollar',
	RON: 'Romanian Leu',
	ROL: 'Romanian Leu (1952\u20132006)',
	RUB: 'Russian Ruble',
	RUR: 'Russian Ruble (1991\u20131998)',
	RWF: 'Rwandan Franc',
	SVC: 'Salvadoran Col\u00f3n',
	WST: 'Samoan Tala',
	SAR: 'Saudi Riyal',
	RSD: 'Serbian Dinar',
	CSD: 'Serbian Dinar (2002\u20132006)',
	SCR: 'Seychellois Rupee',
	SLL: 'Sierra Leonean Leone',
	SGD: 'Singapore Dollar',
	SKK: 'Slovak Koruna',
	SIT: 'Slovenian Tolar',
	SBD: 'Solomon Islands Dollar',
	SOS: 'Somali Shilling',
	ZAR: 'South African Rand',
	ZAL: 'South African Rand (financial)',
	KRH: 'South Korean Hwan (1953\u20131962)',
	KRW: 'South Korean Won',
	KRO: 'South Korean Won (1945\u20131953)',
	SSP: 'South Sudanese Pound',
	SUR: 'Soviet Rouble',
	ESP: 'Spanish Peseta',
	ESA: 'Spanish Peseta (A account)',
	ESB: 'Spanish Peseta (convertible account)',
	LKR: 'Sri Lankan Rupee',
	SHP: 'St. Helena Pound',
	SDD: 'Sudanese Dinar (1992\u20132007)',
	SDG: 'Sudanese Pound',
	SDP: 'Sudanese Pound (1957\u20131998)',
	SRD: 'Surinamese Dollar',
	SRG: 'Surinamese Guilder',
	SZL: 'Swazi Lilangeni',
	SEK: 'Swedish Krona',
	CHF: 'Swiss Franc',
	SYP: 'Syrian Pound',
	STD: 'S\u00e3o Tom\u00e9 & Pr\u00edncipe Dobra',
	TJR: 'Tajikistani Ruble',
	TJS: 'Tajikistani Somoni',
	TZS: 'Tanzanian Shilling',
	THB: 'Thai Baht',
	TPE: 'Timorese Escudo',
	TOP: 'Tongan Pa\u02bbanga',
	TTD: 'Trinidad & Tobago Dollar',
	TND: 'Tunisian Dinar',
	TRY: 'Turkish Lira',
	TRL: 'Turkish Lira (1922\u20132005)',
	TMT: 'Turkmenistani Manat',
	TMM: 'Turkmenistani Manat (1993\u20132009)',
	USD: 'US Dollar',
	USN: 'US Dollar (Next day)',
	USS: 'US Dollar (Same day)',
	UGX: 'Ugandan Shilling',
	UGS: 'Ugandan Shilling (1966\u20131987)',
	UAH: 'Ukrainian Hryvnia',
	UAK: 'Ukrainian Karbovanets',
	AED: 'United Arab Emirates Dirham',
	UYU: 'Uruguayan Peso',
	UYP: 'Uruguayan Peso (1975\u20131993)',
	UYI: 'Uruguayan Peso (Indexed Units)',
	UZS: 'Uzbekistani Som',
	VUV: 'Vanuatu Vatu',
	VEF: 'Venezuelan Bol\u00edvar',
	VEB: 'Venezuelan Bol\u00edvar (1871\u20132008)',
	VND: 'Vietnamese Dong',
	VNN: 'Vietnamese Dong (1978\u20131985)',
	CHE: 'WIR Euro',
	CHW: 'WIR Franc',
	XOF: 'West African CFA Franc',
	YDD: 'Yemeni Dinar',
	YER: 'Yemeni Rial',
	YUN: 'Yugoslavian Convertible Dinar (1990\u20131992)',
	YUD: 'Yugoslavian Hard Dinar (1966\u20131990)',
	YUM: 'Yugoslavian New Dinar (1994\u20132002)',
	YUR: 'Yugoslavian Reformed Dinar (1992\u20131993)',
	ZRN: 'Zairean New Zaire (1993\u20131998)',
	ZRZ: 'Zairean Zaire (1971\u20131993)',
	ZMW: 'Zambian Kwacha',
	ZMK: 'Zambian Kwacha (1968\u20132012)',
	ZWD: 'Zimbabwean Dollar (1980\u20132008)',
	ZWR: 'Zimbabwean Dollar (2008)',
	ZWL: 'Zimbabwean Dollar (2009)'
};

export const FILE_CACHE_MAX_AGE_SEC = 31536000;

export const FILE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export const LOCAL_STORAGE_THEME = 'excalidraw-theme';

export const TIMESHEET_RELATIONS = [
	'project',
	'task',
	'organizationContact',
	'employee.user',
	'task.taskStatus',
	'timesheet'
] as const;
export const PATH_WITH_MORE_THAN_ONE_TIMER = ['/', '/profile'];

export const TIMER_STATUS_CONSTANTS = {
	PAUSE: 'pause',
	TEAMS_SOURCE: 'TEAMS',
	HOURS_THRESHOLD: 24
} as const;
