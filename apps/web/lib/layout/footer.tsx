import { CHATWOOT_API_KEY } from '@app/constants';
import { IClassName } from '@app/interfaces';
import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';
import { Text, ThemeToggler } from 'lib/components';
import { LanguageDropDownWithFlags } from 'lib/settings/language-dropdown-flags';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';

export function Footer({ className }: IClassName) {
	const appName = process.env.APP_NAME;
	const appLink = process.env.APP_LINK || 'https://ever.team';
	const companyName = process.env.COMPANY_NAME;
	const companyLink = process.env.COMPANY_LINK || 'https://ever.co';
	const t = useTranslations();

	const [showChatwoot, setShowChatwoot] = useState(false);
	const fullWidth = useRecoilValue(fullWidthState);
	useEffect(() => {
		const websiteToken = CHATWOOT_API_KEY.value;
		if (websiteToken) {
			setShowChatwoot(true);
		}
	}, []);

	return (
		<footer className={clsxm('flex flex-col xs:flex-row justify-around items-center w-full py-6 px-3', className)}>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
				<Text.Link href={appLink}>{appName}</Text.Link> {t('layout.footer.BY')}{' '}
				<Text.Link href={companyLink}>{companyName}</Text.Link> {t('layout.footer.RIGHTS_RESERVED')}
			</p>
			<div className="flex" style={{ marginRight: fullWidth && showChatwoot ? '66px' : 0 }}>
				<LanguageDropDownWithFlags />
				<ThemeToggler />
			</div>
		</footer>
	);
}
