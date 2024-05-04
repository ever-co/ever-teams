'use client';

import NotFound from '@components/pages/404';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';

const NotFoundPage = () => {
	const t = useTranslations();

	return (
		<AuthLayout title={t('pages.page404.HEADING_TITLE')} isAuthPage={false}>
			<NotFound />
		</AuthLayout>
	);
};

export default NotFoundPage;
