import { Text, ThemeToggler } from '@/core/components';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { APP_LINK, APP_NAME, CHATWOOT_API_KEY, COMPANY_LINK, COMPANY_NAME } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BuildVersion } from './build-version';

function AppNameLink() {
	const hasLink = Boolean(APP_NAME) && Boolean(APP_LINK);
	if (hasLink) {
		return <Text.Link href={APP_LINK}>{APP_NAME}</Text.Link>;
	}
	return <span>{APP_NAME}</span>;
}

function CompanyNameLink() {
	const hasLink = Boolean(COMPANY_NAME) && Boolean(COMPANY_LINK);
	if (hasLink) {
		return <Text.Link href={COMPANY_LINK}>{COMPANY_NAME}</Text.Link>;
	}
	return <span>{COMPANY_NAME}</span>;
}

export function Footer({ className }: IClassName) {
	const t = useTranslations();

	const [showChatwoot, setShowChatwoot] = useState(false);
	useEffect(() => {
		const websiteToken = CHATWOOT_API_KEY.value;
		if (websiteToken) {
			setShowChatwoot(true);
		}
	}, []);

	const controlsStyle = { marginRight: showChatwoot ? '66px' : 0 };

	return (
		<footer
			className={clsxm(
				'flex w-full flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row md:px-6',
				className
			)}
		>
			<p className="text-center text-xs leading-5 text-muted-foreground sm:text-left">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })} <AppNameLink />{' '}
				{t('layout.footer.BY')} <CompanyNameLink /> {t('layout.footer.RIGHTS_RESERVED')} · <BuildVersion />
			</p>
			<div className="flex shrink-0 items-center gap-2" style={controlsStyle}>
				<LanguageDropDownWithFlags deferLoading btnClassName="bg-foreground/5" />
				<ThemeToggler />
			</div>
		</footer>
	);
}
