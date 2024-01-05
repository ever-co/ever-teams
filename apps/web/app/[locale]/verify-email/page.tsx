'use client';

import { useEmailVerifyToken } from '@app/hooks';
import { BackdropLoader } from 'lib/components';
import { MainLayout } from 'lib/layout';

import { useTranslations } from 'next-intl';

const VerifyEmail = () => {
	const { loading } = useEmailVerifyToken();
	const t = useTranslations();

	return (
		<MainLayout>
			<BackdropLoader show={loading} title={t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')} />
		</MainLayout>
	);
};

export default VerifyEmail;
