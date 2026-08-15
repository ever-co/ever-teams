import TeamsShowcase from '@/components/teams-components/showcase';
import { getTranslations } from 'next-intl/server';

type IIndexProps = {
	params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: IIndexProps) {
	const { locale } = await props.params;
	const t = await getTranslations({
		locale,
		namespace: 'Teams'
	});

	return {
		title: t('meta_title'),
		description: t('meta_description')
	};
}

const Page = () => {
	return <TeamsShowcase />;
};

export default Page;
