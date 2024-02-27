import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import MainPage from './page-component';

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE }];
}

export default function Page() {
	return <MainPage />;
}
