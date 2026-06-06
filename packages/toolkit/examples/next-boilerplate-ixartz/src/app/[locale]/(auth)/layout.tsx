import { routing } from '@/libs/i18nNavigation';
import { enUS, frFR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';

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

	if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
		return <main>{props.children}</main>;
	}

	return (
		<ClerkProvider
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
