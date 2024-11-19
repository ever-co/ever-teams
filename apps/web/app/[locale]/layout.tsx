/* eslint-disable no-mixed-spaces-and-tabs */
'use client';
import 'react-loading-skeleton/dist/skeleton.css';
import '../../styles/globals.css';

import clsx from 'clsx';
import { Provider } from 'jotai';
import { AppState } from 'lib/app/init-state';
import NextAuthSessionProvider from 'lib/layout/next-auth-provider';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { Poppins } from 'next/font/google';
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

import { useCheckAPI } from '@app/hooks/useCheckAPI';
import GlobalSkeleton from '@components/ui/global-skeleton';
import { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';

import { PHProvider } from './integration/posthog/provider';

const locales = ['en', 'de', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es', 'fr'];
interface Props {
	params: { locale: string };

	pageProps: {
		jitsuConf?: JitsuOptions;
		jitsuHost?: string;
		envs: Record<string, string>;
		user?: any;
	};
}

const poppins = Poppins({
	subsets: ['latin'],
	weight: '500',
	variable: '--font-poppins',
	display: 'swap'
});

const PostHogPageView = dynamic(() => import('./integration/posthog/page-view'), {
	ssr: false
});

// export function generateStaticParams() {
// 	return locales.map((locale: any) => ({ locale }));
// }

// export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
// 	const t = await getTranslations({ locale, namespace: 'LocaleLayout' });

// 	return {
// 		title: t('title')
// 	};
// }

const LocaleLayout = ({ children, params: { locale }, pageProps }: PropsWithChildren<Props>) => {
	// Validate that the incoming `locale` parameter is valid
	if (!locales.includes(locale as string)) notFound();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isApiWork, loading } = useCheckAPI();
	// Enable static rendering
	// unstable_setRequestLocale(locale);
	const formatTitle = (url: string) => {
		// Separate the URL into pathname and query parts
		const [pathname, queryString] = url.split('?');

		// Ignore language codes or any initial two-letter or specific codes like 'ru', 'ur'
		const segments = pathname
			.split('/')
			.filter((seg) => seg && seg.length > 2)
			.map((seg) => {
				// Replace dashes with spaces in the segment if it looks like a UUID or has digits (likely an ID)
				if (seg.includes('-') || /\d/.test(seg)) {
					return ''; // Exclude IDs from title
				}
				return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase(); // Capitalize non-ID segments
			})
			.filter((seg: string) => seg); // Remove empty strings resulting from ID exclusion

		// Process query parameters, specifically looking for 'name'
		let namePart = '';
		if (queryString) {
			const params = new URLSearchParams(queryString);
			if (params?.get('name')) {
				const name = params.get('name') ?? '';
				const nameValue = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
				namePart = nameValue;
			}
		}

		// Combine the pathname segments with the name part, if present
		const title = [...segments, namePart].filter((part) => part).join(' | ');

		return title;
	};

	const name = searchParams?.get('name');

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const messages = require(`../../locales/${locale}.json`);

	useEffect(() => {
		if (!isApiWork && !loading) router.push(`/maintenance`);
		else if (isApiWork && pathname?.split('/').reverse()[0] === 'maintenance') router.replace('/');
	}, [isApiWork, loading, router, pathname]);
	return (
		<html lang={locale} className={poppins.variable}>
			<head>
				<title>{formatTitle(`${pathname}${name ? `?name=${name}` : ''}`) || 'Home'}</title>
			</head>
			{/* <head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
				{GA_MEASUREMENT_ID.value && (
					<>
						<script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID.value}`} async />
						<script async id="google-analytic-script">
							{` window.dataLayer = window.dataLayer || [];
					  function gtag(){dataLayer.push(arguments);}
					  gtag('js', new Date());
					  gtag('config', '${GA_MEASUREMENT_ID.value}');`}
						</script>
					</>
				)}
			</head> */}
			<NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
				<PHProvider>
					<body
						className={clsx(
							'flex h-full flex-col overflow-x-hidden min-w-fit w-full dark:!bg-[#191A20] !bg-gray-100'
						)}
					>
						<PostHogPageView />

						<NextAuthSessionProvider>
							<Provider>
								<ThemeProvider
									attribute="class"
									defaultTheme="system"
									enableSystem
									disableTransitionOnChange
								>
									{loading && !pathname?.startsWith('/auth') ? (
										<GlobalSkeleton />
									) : (
										<>
											<AppState />
											<JitsuRoot pageProps={pageProps}>{children}</JitsuRoot>
										</>
									)}
								</ThemeProvider>
							</Provider>
						</NextAuthSessionProvider>
					</body>
				</PHProvider>
			</NextIntlClientProvider>
		</html>
	);
};

export default LocaleLayout;
