import { useEmailVerifyToken } from '@app/hooks';
import { BackdropLoader } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useTranslation } from 'next-i18next';

export default function VerifyEmail() {
	const { loading } = useEmailVerifyToken();
	const { t } = useTranslation();

	return (
		<MainLayout>
			<BackdropLoader show={loading} title={t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')} />
		</MainLayout>
	);
}
