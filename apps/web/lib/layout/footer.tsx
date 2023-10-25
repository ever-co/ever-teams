import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text, ThemeToggler } from 'lib/components';
import { LangSwitcher } from 'lib/components/LangSwitcher';
import { useTranslation } from 'react-i18next';

export function Footer({ className }: IClassName) {
	const { t } = useTranslation();

	return (
		<footer className={clsxm('flex flex-col xs:flex-row justify-around items-center w-full py-6 px-3', className)}>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
				<Text.Link href="https://ever.team">{t('TITLE')}</Text.Link> {t('layout.footer.BY')}{' '}
				<Text.Link href="https://ever.co/">{t('layout.footer.COPY_RIGHT4')}</Text.Link>{' '}
				{t('layout.footer.RIGHTS_RESERVERD')}
			</p>

			<div className="">
				<ThemeToggler />
			</div>
			<LangSwitcher />
		</footer>
	);
}
