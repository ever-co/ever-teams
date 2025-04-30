/* eslint-disable no-mixed-spaces-and-tabs */
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
	messages: (await import(`../../locales/${locale}.json`)).default
}));
