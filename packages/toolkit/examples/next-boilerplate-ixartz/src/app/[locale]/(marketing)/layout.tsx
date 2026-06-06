import { DemoBanner } from '@/components/DemoBanner';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BaseTemplate } from '@/templates/BaseTemplate';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function Layout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
	const { locale } = await props.params;
	setRequestLocale(locale);
	const t = await getTranslations({
		locale,
		namespace: 'RootLayout'
	});

	return (
		<>
			<DemoBanner />
			<BaseTemplate
				leftNav={
					<>
						<li>
							<Link href="/" className="border-none  hover:text-gray-900 dark:hover:text-gray-300">
								{t('home_link')}
							</Link>
						</li>
						<li>
							<Link href="/about/" className="border-none  hover:text-gray-900 dark:hover:text-gray-300">
								{t('about_link')}
							</Link>
						</li>
						<li>
							<Link
								href="/counter/"
								className="border-none  hover:text-gray-900 dark:hover:text-gray-300"
							>
								{t('counter_link')}
							</Link>
						</li>
						<li>
							<Link
								href="/portfolio/"
								className="border-none  hover:text-gray-900 dark:hover:text-gray-300"
							>
								{t('portfolio_link')}
							</Link>
						</li>
						<li>
							<Link href="/teams/" className="border-none  hover:text-gray-900 dark:hover:text-gray-300">
								{t('teams_showcase_link')}
							</Link>
						</li>
						<li>
							<a
								className="border-none  hover:text-gray-900 dark:hover:text-gray-300"
								href="https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/examples/next-boilerplate-ixartz"
								target="_blank"
							>
								GitHub
							</a>
						</li>
					</>
				}
				rightNav={
					<>
						<li>
							<Link
								href="/sign-in/"
								className="border-none  hover:text-gray-900 dark:hover:text-gray-300"
							>
								{t('sign_in_link')}
							</Link>
						</li>

						<li>
							<Link
								href="/sign-up/"
								className="border-none  hover:text-gray-900 dark:hover:text-gray-300"
							>
								{t('sign_up_link')}
							</Link>
						</li>

						<li>
							<LocaleSwitcher />
						</li>
					</>
				}
			>
				<div className="py-5 text-xl [&_p]:my-6">{props.children}</div>
			</BaseTemplate>
		</>
	);
}
