import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import PermissionPage from './component';

export default function Page() {
	return <PermissionPage />;
}

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE }];
}
