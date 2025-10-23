export interface ConfigBaseProps {
	persistNavigation: 'always' | 'dev' | 'prod' | 'never';
	catchErrors: 'always' | 'dev' | 'prod' | 'never';
	exitRoutes: string[];
	branding: {
		appName: string;
		companyName: string;
		copyrightText: string;
		appLogo: string;
		appLink: string;
		appEmailConfirmationUrl: string;
	};
}

export type PersistNavigationConfig = ConfigBaseProps['persistNavigation'];

const BaseConfig: ConfigBaseProps = {
	// This feature is particularly useful in development mode, but
	// can be used in production as well if you prefer.
	persistNavigation: 'dev',

	/**
	 * Only enable if we're catching errors in the right environment
	 */
	catchErrors: 'always',

	/**
	 * This is a list of all the route names that will exit the app if the back button
	 * is pressed while in that screen. Only affects Android.
	 */
	exitRoutes: ['Welcome'],

	/**
	 * Branding configuration - can be overridden by environment variables
	 */
	branding: {
		appName: process.env.APP_NAME || 'Ever Teams',
		companyName: process.env.COMPANY_NAME || 'Ever Co. LTD',
		copyrightText: `© 2022-Present, ${process.env.APP_NAME || 'Ever Teams'} by ${process.env.COMPANY_NAME || 'Ever Co. LTD'}. All rights reserved.`,
		appLogo: process.env.APP_LOGO_URL || 'https://ever.team/assets/ever-teams.png',
		appLink: process.env.APP_WEBSITE_URL || 'https://ever.team/',
		appEmailConfirmationUrl: process.env.APP_EMAIL_CONFIRMATION_URL || 'https://app.gauzy.co/#/auth/confirm-email'
	}
};

export default BaseConfig;
