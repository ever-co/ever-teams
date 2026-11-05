'use client';

import { Provider as JotaiProvider } from 'jotai';
import NextAuthSessionProvider from '@/core/components/layouts/default-layout/next-auth-provider';
import { JitsuRoot } from '@/core/components/collaborate/jitsu-root';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useCheckAPI } from '@/core/hooks/common/use-check-api';
import { useRuntimeEnvHtmlProps } from '@/core/components/providers/runtime-env-provider';

import { isPostHogConfigured } from './(main)/integration/posthog/posthog-config';
import { APP_FAVICON_URL, IS_DEV_MODE } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { MutationErrorToaster } from '@/core/components/common/mutation-error-toaster';
import { DevErrorToaster } from '@/core/components/common/dev-error-toaster';
// import { cn } from '@ever-teams/ui';

interface Props {
	children: React.ReactNode;
	locale: string;
	messages: Messages;
}

// The UI face is the system stack (`--font-sans` in styles/globals.css, shared with Ever Works);
// no webfont is loaded any more.

// posthog-js is fetched only by deployments that configure a key, after the page is interactive
const PostHogAnalytics = dynamic(() => import('./(main)/integration/posthog/analytics'), {
	ssr: false
});

// Every route below used to be client rendered because OfflineWrapper (ssr: false) wrapped it here. OfflineWrapper
// moved to the (main) layout so the auth routes stop compiling the Timer of its offline screen. This boundary keeps
// the rendering of every route unchanged.
const ClientOnly = dynamic(() => Promise.resolve(({ children }: { children: React.ReactNode }) => <>{children}</>), {
	ssr: false
});

const LocaleLayoutComponent = (props: Props) => {
	const { children, locale, messages } = props;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isApiWork, loading } = useCheckAPI();
	// Publishes this request's runtime env on <html>, before any bundle module is evaluated.
	const runtimeEnvHtmlProps = useRuntimeEnvHtmlProps();

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
	const hasAnalytics = isPostHogConfigured();

	useEffect(() => {
		if (!isApiWork && !loading) router.push(`/maintenance`);
		else if (isApiWork && pathname?.split('/').reverse()[0] === 'maintenance') router.replace('/');
	}, [isApiWork, loading, router, pathname]);

	return (
		<html
			lang={locale}
			className="font-sans"
			data-scroll-behavior="smooth"
			suppressHydrationWarning
			{...runtimeEnvHtmlProps}
		>
			<head>
				{/* Runtime APP_FAVICON_URL (default /favicon.ico), so a reused image can carry its own icon. */}
				<link rel="icon" href={APP_FAVICON_URL} />
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
				<body className={cn('flex h-full flex-col overflow-x-clip w-full bg-background antialiased')}>
					{hasAnalytics && <PostHogAnalytics />}

					<NextAuthSessionProvider>
						<JotaiProvider>
							<ThemeProvider
								attribute="class"
								defaultTheme="system"
								enableSystem
								disableTransitionOnChange
							>
								<ClientOnly>
									<JitsuRoot>{children}</JitsuRoot>
									<MutationErrorToaster />
									{IS_DEV_MODE && <DevErrorToaster />}
								</ClientOnly>
							</ThemeProvider>
						</JotaiProvider>
					</NextAuthSessionProvider>
				</body>
			</NextIntlClientProvider>
		</html>
	);
};

export default LocaleLayoutComponent;
