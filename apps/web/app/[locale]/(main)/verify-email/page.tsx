'use client';

import { useEmailVerifyToken } from '@/core/hooks';
import { BackdropLoader } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

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
