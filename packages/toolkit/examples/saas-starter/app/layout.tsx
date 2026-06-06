import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { UserProvider } from '@/lib/auth';
import { getUser } from '@/lib/db/queries';
import { getUserLocale } from '@/lib/i18n/locale';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import ClientLayout from '@/components/layout/client-layout';
import './globals.css';
import { ReactElement, ReactNode } from 'react';

const manrope = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Teams | SaaS Starter',
	description: 'Get started quickly with Teams, Next.js, Postgres, and Stripe.'
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
	const userPromise = getUser();
	const locale = await getUserLocale();
	const messages = await getMessages();

	return (
		<html
			suppressHydrationWarning
			lang={locale}
			className={`bg-white dark:bg-gray-900 text-black dark:text-white ${manrope.className}`}
		>
			<body
				suppressHydrationWarning
				className="min-h-[100dvh] max-w-[2000px] mx-auto bg-gray-100 dark:bg-gray-900 text-black dark:text-white"
			>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<UserProvider userPromise={userPromise}>
						<ClientLayout lang={locale}>
							<>{children}</>
						</ClientLayout>
					</UserProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
