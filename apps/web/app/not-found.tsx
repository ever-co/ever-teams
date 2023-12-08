'use client';
import NotFound from '@components/pages/404';
import { AuthLayout } from 'lib/layout';

const NotFoundPage = () => {
	// TODO:
	// Fix localisation issue
	return (
		<AuthLayout title={'Page not found !'} isAuthPage={false}>
			<NotFound />
		</AuthLayout>
	);
};

export default NotFoundPage;
