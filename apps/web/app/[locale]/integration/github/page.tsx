import { GitHubPage } from './component';

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}

export default function Page() {
	return <GitHubPage />;
}
