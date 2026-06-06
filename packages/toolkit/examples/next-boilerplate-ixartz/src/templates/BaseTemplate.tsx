'use client';

import { AppConfig } from '@/utils/AppConfig';
import { useTranslations } from 'next-intl';
import { ToggleThemeContainer } from '@ever-teams/atoms';

export const BaseTemplate = (props: {
	leftNav: React.ReactNode;
	rightNav?: React.ReactNode;
	children: React.ReactNode;
}) => {
	const t = useTranslations('BaseTemplate');

	return (
		<div className="w-full px-1 antialiased">
			<div className="mx-auto max-w-screen-lg">
				<header className="border-b border-gray-300 dark:border-gray-700">
					<div className="flex justify-between pt-18">
						<div className="pb-8 ">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{AppConfig.name}</h1>
							<h2 className="text-xl text-gray-500 dark:text-gray-400">{t('description')}</h2>
						</div>
						<div className="p-3 ">
							<ToggleThemeContainer />
						</div>
					</div>

					<div className="flex justify-between">
						<nav>
							<ul className="flex flex-wrap gap-x-5 text-xl text-gray-500 dark:text-gray-400 ">
								{props.leftNav}
							</ul>
						</nav>

						<nav>
							<ul className="flex flex-wrap gap-x-5 text-xl  text-gray-500 dark:text-gray-400">
								{props.rightNav}
							</ul>
						</nav>
					</div>
				</header>

				<main>{props.children}</main>

				<footer className="border-t border-gray-300 dark:border-gray-700 py-8 text-center text-sm">
					{`© Copyright ${new Date().getFullYear()} ${AppConfig.name}. `}
					{t.rich('made_with', {
						author: () => (
							<div>
								<a
									href="https://creativedesignsguru.com"
									className="text-blue-700 hover:border-b-2 hover:border-blue-700"
								>
									CreativeDesignsGuru
								</a>{' '}
								and{' '}
								<a
									href="https://ever.tech"
									className="text-blue-700 hover:border-b-2 hover:border-blue-700"
								>
									Ever Co.
								</a>
							</div>
						)
					})}
					{/*
					 * PLEASE READ THIS SECTION
					 * I'm an indie maker with limited resources and funds, I'll really appreciate if you could have a link to my website.
					 * The link doesn't need to appear on every pages, one link on one page is enough.
					 * For example, in the `About` page. Thank you for your support, it'll mean a lot to me.
					 */}
				</footer>
			</div>
		</div>
	);
};
