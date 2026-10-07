import { Text, ThemeToggler } from '@/core/components';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { APP_LINK, APP_NAME, CHATWOOT_API_KEY, COMPANY_LINK, COMPANY_NAME } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BuildVersion } from './build-version';

export function Footer({ className }: IClassName) {
	const t = useTranslations();

	const [showChatwoot, setShowChatwoot] = useState(false);
	useEffect(() => {
		const websiteToken = CHATWOOT_API_KEY.value;
		if (websiteToken) {
			setShowChatwoot(true);
		}
	}, []);

	return (
		<footer
			className={clsxm(
				'flex flex-col gap-7 justify-around items-center px-3 py-4 w-full md:gap-2 xs:flex-row',
				className
			)}
		>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
				{APP_NAME && APP_LINK ? <Text.Link href={APP_LINK}>{APP_NAME}</Text.Link> : <span>{APP_NAME}</span>}{' '}
				{t('layout.footer.BY')}{' '}
				{COMPANY_NAME && COMPANY_LINK ? (
					<Text.Link href={COMPANY_LINK}>{COMPANY_NAME}</Text.Link>
				) : (
					<span>{COMPANY_NAME}</span>
				)}{' '}
				{t('layout.footer.RIGHTS_RESERVED')} · <BuildVersion />
			</p>
			<div className="flex gap-3 items-center" style={{ marginRight: showChatwoot ? '66px' : 0 }}>
				<LanguageDropDownWithFlags deferLoading btnClassName="bg-light--theme-dark dark:bg-[#1D222A]" />
				<ThemeToggler />
			</div>
		</footer>
	);
}
