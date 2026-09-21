import { routing } from '@/libs/i18nNavigation';
import { enUS, frFR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';
import { readRuntimeEnv } from '@/libs/runtime-env';

// Prevent prerendering of auth pages at build time (Clerk requires runtime env vars)
export const dynamic = 'force-dynamic';

export default async function AuthLayout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);
	let clerkLocale = enUS;
	let signInUrl = '/sign-in';
	let signUpUrl = '/sign-up';
	let dashboardUrl = '/dashboard';
	let afterSignOutUrl = '/';

	if (locale === 'fr') {
		clerkLocale = frFR;
	}

	if (locale !== routing.defaultLocale) {
		signInUrl = `/${locale}${signInUrl}`;
		signUpUrl = `/${locale}${signUpUrl}`;
		dashboardUrl = `/${locale}${dashboardUrl}`;
		afterSignOutUrl = `/${locale}${afterSignOutUrl}`;
	}

	// Read per request from the container env: Clerk's own bundle reads the build-time literal, so the
	// key has to be handed to <ClerkProvider> explicitly for `docker run -e ...` to work.
	const publishableKey =
		readRuntimeEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
	if (!publishableKey) {
		return <main>{props.children}</main>;
	}

	return (
		<ClerkProvider
			publishableKey={publishableKey}
			localization={clerkLocale}
			signInUrl={signInUrl}
			signUpUrl={signUpUrl}
			signInFallbackRedirectUrl={dashboardUrl}
			signUpFallbackRedirectUrl={dashboardUrl}
			afterSignOutUrl={afterSignOutUrl}
		>
			<main>{props.children}</main>
		</ClerkProvider>
	);
}
