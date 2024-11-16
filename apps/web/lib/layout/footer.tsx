import { useAtomValue } from 'jotai';
import { Text, ThemeToggler } from 'lib/components';
import { LanguageDropDownWithFlags } from 'lib/settings/language-dropdown-flags';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { APP_LINK, APP_NAME, CHATWOOT_API_KEY, COMPANY_LINK, COMPANY_NAME } from '@app/constants';
import { IClassName } from '@app/interfaces';
import { fullWidthState } from '@app/stores/fullWidth';
import { clsxm } from '@app/utils';

export function Footer({ className }: IClassName) {
	const t = useTranslations();

	const [showChatwoot, setShowChatwoot] = useState(false);
	const fullWidth = useAtomValue(fullWidthState);
	useEffect(() => {
		const websiteToken = CHATWOOT_API_KEY.value;
		if (websiteToken) {
			setShowChatwoot(true);
		}
	}, []);

	return (
		<footer
			className={clsxm(
				'flex flex-col gap-7 md:gap-2 xs:flex-row justify-around items-center w-full py-6 px-3',
				className
			)}
		>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
				<Text.Link href={APP_LINK}>{APP_NAME}</Text.Link> {t('layout.footer.BY')}{' '}
				<Text.Link href={COMPANY_LINK!}>{COMPANY_NAME}</Text.Link> {t('layout.footer.RIGHTS_RESERVED')}
			</p>
			<div className="flex items-center" style={{ marginRight: fullWidth && showChatwoot ? '66px' : 0 }}>
				<LanguageDropDownWithFlags />
				<ThemeToggler />
			</div>
		</footer>
	);
}
