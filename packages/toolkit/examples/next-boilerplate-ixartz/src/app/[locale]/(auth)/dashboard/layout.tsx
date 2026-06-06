import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import LogoutButton from '@/components/LogoutButton';
import { BaseTemplate } from '@/templates/BaseTemplate';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export default async function DashboardLayout(props: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	setRequestLocale(locale);

	const t = await getTranslations({
		locale,
		namespace: 'DashboardLayout'
	});

	return (
		<BaseTemplate
			leftNav={
				<>
					<li>
						<Link href="/dashboard/" className="border-none hover:text-gray-400 dark:hover:text-gray-300">
							{t('dashboard_link')}
						</Link>
					</li>
					<li>
						<Link
							href="/dashboard/teams/"
							className="border-none hover:text-gray-400 dark:hover:text-gray-300"
						>
							{t('teams_showcase_link')}
						</Link>
					</li>
					<li>
						<Link
							href="/dashboard/user-profile/"
							className="border-none hover:text-gray-400 dark:hover:text-gray-300"
						>
							{t('user_profile_link')}
						</Link>
					</li>
				</>
			}
			rightNav={
				<>
					<li>
						<LogoutButton label={t('sign_out')} />
					</li>

					<li>
						<LocaleSwitcher />
					</li>
				</>
			}
		>
			{props.children}
		</BaseTemplate>
	);
}
