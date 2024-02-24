import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import MeetPage from './component';

export default function Page() {
	return <MeetPage />;
}

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE }];
}
