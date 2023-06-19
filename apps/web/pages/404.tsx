import NotFound from '@components/pages/404';
import { MainLayout } from 'lib/layout';

function NotFoundPage() {
	return (
		<MainLayout notFound={true}>
			<NotFound />
		</MainLayout>
	);
}

export default NotFoundPage;
