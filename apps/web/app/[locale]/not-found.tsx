'use client';

import NotFound from '@/core/components/pages/404';
// By path: the default-layout barrel would add the whole app shell to this boundary, which every page loads.
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
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
