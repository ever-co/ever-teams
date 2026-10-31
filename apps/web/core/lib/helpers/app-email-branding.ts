import {
	APP_LINK,
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	COMPANY_LINK,
	COMPANY_NAME
} from '@/core/constants/config/constants';
import type { IEverIdEmailBranding } from '@/core/types/interfaces/auth/ever-id';

/** An absolute https link, or nothing (the API takes https links only). */
export function httpsLink(value: string | undefined): string | undefined {
	try {
		const url = new URL(value ?? '');
		return url.protocol === 'https:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

/**
 * This app's branding for the e-mails Gauzy sends on its behalf (`appName`, `appLogo`, `appSignature`, `appLink`,
 * `companyName`, `companyLink`): blank values and links that are not https are left out. Read at runtime, so a
 * rebranded Docker image brands its e-mails too. The Ever ID sign-in (server) and the account deletion request
 * (browser) both send it.
 */
export function appEmailBranding(): IEverIdEmailBranding {
	const branding: IEverIdEmailBranding = {
		appName: APP_NAME,
		appSignature: APP_SIGNATURE,
		companyName: COMPANY_NAME,
		appLogo: httpsLink(APP_LOGO_URL),
		appLink: httpsLink(APP_LINK),
		companyLink: httpsLink(COMPANY_LINK)
	};
	return Object.fromEntries(
		Object.entries(branding).filter(([, value]) => typeof value === 'string' && value.trim())
	) as IEverIdEmailBranding;
}
