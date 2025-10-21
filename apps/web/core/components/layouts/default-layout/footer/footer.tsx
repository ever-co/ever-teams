import {
	APP_LINK,
	APP_NAME,
	COMPANY_LINK,
	COMPANY_NAME,
	PRIVACY_POLICY_LINK,
	TERMS_LINK
} from '@/core/constants/config/constants';
import ToggleThemeContainer from '../toggle-theme-btns';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const Footer = () => {
	const t = useTranslations();
	return (
		<footer className="flex flex-col justify-between items-center py-2 text-sm font-light text-center md:flex-row lg:text-base sm:text-start x-container-fluid">
			<div className="flex flex-col space-x-1 text-center text-light sm:flex-row md:flex-start sm:items-center md:flex-row">
				<div className="flex justify-between items-center space-x-1 sm:justify-start sm:space-x-2">
					<span className="px-1">{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}</span>
					{APP_NAME && APP_LINK ? (
						<a href={APP_LINK} target="_blank" className="text-primary dark:text-gray-300" rel="noreferrer">
							{APP_NAME}
						</a>
					) : (
						<span className="text-primary dark:text-gray-300">{APP_NAME}</span>
					)}
					<div>by</div>
					{COMPANY_NAME && COMPANY_LINK ? (
						<Link
							href={COMPANY_LINK}
							target="_blank"
							className="text-primary dark:text-gray-300"
							rel="noreferrer"
						>
							{COMPANY_NAME}
						</Link>
					) : (
						<span className="text-primary dark:text-gray-300">{COMPANY_NAME}</span>
					)}{' '}
					<div className="hidden space-x-2 xs:flex sm:hidden">
						<ToggleThemeContainer />
					</div>
				</div>
				<div>{t('layout.footer.RIGHTS_RESERVED')}</div>
				<div className="hidden space-x-2 sm:flex md:hidden">
					<ToggleThemeContainer />
				</div>
			</div>

			<div className="flex flex-col items-center xs:flex-row sm:flex-col md:flex-row">
				<div className="flex justify-center space-x-4 w-full text-center">
					{TERMS_LINK ? (
						<Link
							href={TERMS_LINK}
							target="_blank"
							className="text-primary dark:text-gray-300"
							rel="noreferrer"
						>
							{t('layout.footer.TERMS')}
						</Link>
					) : (
						<span className="text-gray-400">{t('layout.footer.TERMS')}</span>
					)}
					{PRIVACY_POLICY_LINK ? (
						<Link
							href={PRIVACY_POLICY_LINK}
							target="_blank"
							className="text-primary dark:text-gray-300"
							rel="noreferrer"
						>
							{t('layout.footer.PRIVACY_POLICY')}
						</Link>
					) : (
						<span className="text-gray-400">{t('layout.footer.PRIVACY_POLICY')}</span>
					)}
				</div>
				<div className="flex px-4 space-x-2 xs:hidden md:flex">
					<ToggleThemeContainer />
				</div>
			</div>
		</footer>
	);
};

export default Footer;
