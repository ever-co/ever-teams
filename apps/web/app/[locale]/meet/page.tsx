import { MeetPageComponent } from './component';

export default function Page() {
	return <MeetPageComponent />;
}

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}
