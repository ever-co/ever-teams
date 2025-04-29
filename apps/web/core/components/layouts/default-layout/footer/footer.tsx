import { APP_LINK, APP_NAME, COMPANY_LINK, COMPANY_NAME, PRIVACY_POLICY_LINK, TERMS_LINK } from '@app/constants';
import ToggleThemeContainer from '../toggleThemeBtns';
import { useTranslations } from 'next-intl';

const Footer = () => {
	const t = useTranslations();
	return (
		<footer className="flex flex-col items-center justify-between py-2 text-sm font-light text-center md:flex-row lg:text-base sm:text-start x-container-fluid">
			<div className="flex flex-col space-x-1 text-center text-light sm:flex-row md:flex-start sm:items-center md:flex-row">
				<div className="flex items-center justify-between space-x-1 sm:justify-start sm:space-x-2">
					<span className="px-1">{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}</span>
					<a href={APP_LINK} target="_blank" className="text-primary dark:text-gray-300" rel="noreferrer">
						{APP_NAME}
					</a>
					<div>by</div>
					<a href={COMPANY_LINK} target="_blank" className="text-primary dark:text-gray-300" rel="noreferrer">
						{COMPANY_NAME}
					</a>{' '}
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
				<div className="flex justify-center w-full space-x-4 text-center">
					<a href={TERMS_LINK} target="_blank" className="text-primary dark:text-gray-300" rel="noreferrer">
						{t('layout.footer.TERMS')}
					</a>
					<a
						href={PRIVACY_POLICY_LINK}
						target="_blank"
						className="text-primary dark:text-gray-300"
						rel="noreferrer"
					>
						{t('layout.footer.PRIVACY_POLICY')}
					</a>
				</div>
				<div className="flex px-4 space-x-2 xs:hidden md:flex">
					<ToggleThemeContainer />
				</div>
			</div>
		</footer>
	);
};

export default Footer;
