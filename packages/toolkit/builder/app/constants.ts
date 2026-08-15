export const APP_NAME = process.env.APP_NAME || 'Ever Teams';

export const CONFIG = {
	API_KEY_STORAGE_KEY: 'builder_api_key',
	BUILDER_MODEL_NAME: 'page',
	MIN_API_KEY_LENGTH: 10
} as const;

export const BUILDER_CONFIG = {
	DEFAULT_META: {
		title: 'Teams Builder',
		description: 'Create custom timers with Teams Builder'
	},
	LOADING_DELAY: 500
} as const;

export const STORAGE_KEYS = {
	PLASMIC_API_KEY: 'plasmic_api_key',
	PLASMIC_PROJECT_ID: 'plasmic_project_id',
	PLASMIC_EXPIRY: 'plasmic_credentials_expiry'
} as const;

export const STORAGE_DURATION = 30 * 24 * 60 * 60 * 1000;

export const TENANT = {
	ID: 'demo-tenant',
	ORG_ID: 'demo-org'
} as const;
