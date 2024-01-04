'use client';

import { useEmailVerifyToken } from '@app/hooks';
import { MyAppProps } from '@app/interfaces/AppProps';
import { BackdropLoader } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { useTranslations } from 'next-intl';
import type { AppProps } from 'next/app';

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
