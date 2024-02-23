import { PermissionPage } from './component';

export default function Page() {
	return <PermissionPage />;
}

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}
