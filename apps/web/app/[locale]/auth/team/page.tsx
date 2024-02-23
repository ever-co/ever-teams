import { AuthTeam } from './component';

export async function generateStaticParams() {
	return [{ locale: 'en' }];
}

export default function Page() {
	console.log('FFFFFFFF.........');

	return <AuthTeam />;
}
