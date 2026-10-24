import { notFound } from 'next/navigation';
import { APPLICATION_LANGUAGES_CODE as LOCALES } from '@/core/constants/config/constants';
import LocaleLayoutComponent from './layout-component';

interface Props {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}

// export function generateStaticParams() {
// 	return locales.map((locale: any) => ({ locale }));
// }

// export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
// 	const t = await getTranslations({ locale, namespace: 'LocaleLayout' });

// 	return {
// 		title: t('title')
// 	};
// }

const LocaleLayout = async (props: Props) => {
	const params = await props.params;
	const { locale } = params;
	const { children } = props;

	// Enable static rendering
	// unstable_setRequestLocale(locale);

	// Validate that the incoming `locale` parameter is valid.
	//
	// This only ever fires for a first path segment proxy.ts's matcher skips — one containing a dot,
	// e.g. /foo.bar — because next-intl rewrites every other unknown segment under the default locale.
	// Raised in this layout, it cannot be handled during SSR (React runs no error boundary in
	// the server renderer, and there is no loading.tsx here to give Fizz a Suspense boundary), so React
	// errors the shell and Next serves its own `<html id="__next_error__">` document and renders it on
	// the client: no app/layout.tsx, no runtime env attribute. The 404 status is correct and worth
	// keeping, so we do not render the 404 inline here; core/components/pages/404 leaves that document
	// with a full page load instead, so its build-time-default constants never reach the app.
	if (!LOCALES.includes(locale as string)) {
		notFound();
	}

	// Imported on the server, so the browser receives this locale's messages alone, in the RSC payload.
	// A require() of this path in a client component puts all 13 locale files in one chunk that every
	// route downloads.
	const messages = (await import(`@/locales/${locale}.json`)).default;
	return (
		<LocaleLayoutComponent locale={locale} messages={messages}>
			{children}
		</LocaleLayoutComponent>
	);
};

export default LocaleLayout;
