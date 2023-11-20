"use client"
import NotFound from '@components/pages/404';
import { AuthLayout } from 'lib/layout';
import { useTranslation } from 'react-i18next';


const NotFoundPage =  () => {
	
	const { t } = useTranslation();

	return (
	
		<AuthLayout 
			title={t('pages.page404.HEADING_TITLE')} 
			isAuthPage={false}
			>
			<NotFound />
		</AuthLayout>
	);
};

export default NotFoundPage;
