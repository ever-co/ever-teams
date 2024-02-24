import { APPLICATION_DEFAULT_LANGUAGE } from '@app/constants';
import { MeetPageComponent } from './component';

export default function Page() {
	return <MeetPageComponent />;
}

export async function generateStaticParams() {
	return [{ locale: APPLICATION_DEFAULT_LANGUAGE }];
}
