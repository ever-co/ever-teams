import { useEmailVerifyToken } from '@app/hooks';
import { BackdropLoader } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { GetStaticProps, GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export default function VerifyEmail() {
	const { loading } = useEmailVerifyToken();
	const { t } = useTranslation();

	return (
		<MainLayout>
			<BackdropLoader show={loading} title={t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')} />
		</MainLayout>
	);
}

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
	const { locale } = context;
	const translationProps = await serverSideTranslations(locale ?? 'en', ['default']);
	return {
		props: {
			...translationProps
		}
	};
};
