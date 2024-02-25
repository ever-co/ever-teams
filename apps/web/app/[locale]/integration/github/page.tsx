import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import GitHubPage from './component';

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE }];
}

export default function Page() {
	return <GitHubPage />;
}
