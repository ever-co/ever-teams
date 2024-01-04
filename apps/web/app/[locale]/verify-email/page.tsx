'use client';

import { useEmailVerifyToken } from '@app/hooks';
import { MyAppProps } from '@app/interfaces/AppProps';
import { BackdropLoader } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { useTranslations } from 'next-intl';
import { AppProps } from 'next/app';

const VerifyEmail = ({ pageProps }: AppProps<MyAppProps>) => {
	const { loading } = useEmailVerifyToken();
	const t = useTranslations();

	return (
		<JitsuRoot pageProps={pageProps}>
			<MainLayout>
				<BackdropLoader show={loading} title={t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')} />
			</MainLayout>
		</JitsuRoot>
	);
};

export default VerifyEmail;
