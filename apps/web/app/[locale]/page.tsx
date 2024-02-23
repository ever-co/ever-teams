import { MainPageComponent } from './page-component';

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}

export default function Page() {
	return <MainPageComponent />;
}
